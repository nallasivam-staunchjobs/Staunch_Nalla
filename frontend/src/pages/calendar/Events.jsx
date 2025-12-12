import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CustomDropdown } from '../../components/UIComponents';
import CandidateStatsModal from './components/CandidateStatsModal';
import EventFormModal from './components/EventFormModal';
import { calendarAPI, getAuthHeaders, getCallStatCount, transformCallDetailsToEvent, getPlanColorClasses } from './utils/calendarUtils';
import {
  Calendar,
  Save,
  X,
  Clock,
  Users,
  MapPin,
  Building,
  Building2,
  User,
  FileText,
  Target,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Plus,
  Edit3,
  Trash2,
  Copy,
  Search,
  Filter,
  Database,
  ExternalLink,
  Eye,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Loading from '../../components/Loading';



// API Utility Functions
const apiUtils = {
  // Base fetch with common error handling
  async fetchWithErrorHandling(url, options = {}) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Build URL with query parameters
  buildUrl(baseUrl, params = {}) {
    const url = new URL(baseUrl, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.append(key, value);
      }
    });
    return url.toString();
  },

  // Get authentication headers
  getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Token ${localStorage.getItem('token') || ''}`,
    };
  }
};

// UI Utility Functions
const uiUtils = {
  // Get plan color classes
  getPlanColorClasses(plan) {
    const colorMap = {
      P1: { bg: 'bg-blue-100', text: 'text-blue-700', hover: 'hover:bg-blue-200' },
      P2: { bg: 'bg-green-100', text: 'text-green-700', hover: 'hover:bg-green-200' },
      P3: { bg: 'bg-purple-100', text: 'text-purple-700', hover: 'hover:bg-purple-200' },
      P4: { bg: 'bg-orange-100', text: 'text-orange-700', hover: 'hover:bg-orange-200' },
      P5: { bg: 'bg-pink-100', text: 'text-pink-700', hover: 'hover:bg-pink-200' }
    };

    const colors = colorMap[plan] || colorMap.P1;
    return `${colors.bg} ${colors.text} ${colors.hover}`;
  },

  // Get branch color classes dynamically based on branch data
  getBranchColorClasses(branchName, branchOptions = []) {
    // Define available colors for branches
    const availableColors = [
      'blue', 'green', 'purple', 'orange', 'pink', 'indigo',
      'teal', 'cyan', 'emerald', 'lime', 'amber', 'red'
    ];

    // Find the branch in branchOptions to get its ID or index
    const branch = branchOptions.find(b =>
      b.name === branchName ||
      b.label === branchName ||
      b.value === branchName ||
      b.branch_name === branchName
    );

    if (branch) {
      // Use branch ID to determine color (consistent across sessions)
      const colorIndex = (branch.id || branch.branch_id || 0) % availableColors.length;
      return availableColors[colorIndex];
    }

    // Fallback: Generate color based on branch name hash (for consistency)
    let hash = 0;
    for (let i = 0; i < branchName.length; i++) {
      const char = branchName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    const colorIndex = Math.abs(hash) % availableColors.length;
    return availableColors[colorIndex];
  },

  // Common button classes
  getButtonClasses(variant = 'primary') {
    const variants = {
      primary: 'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium',
      secondary: 'px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium',
      success: 'px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 font-medium',
      danger: 'px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-medium'
    };
    return variants[variant] || variants.primary;
  }
};



// Note: transformCallPlanToEvent function removed as it was unused

// Calendar Plan API functions (based on calender_plan.php logic)
const calendarPlanAPI = {
  // Get filtered plans (equivalent to PHP filtering logic)
  getFilteredPlans: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.planId) params.append('plan_id', filters.planId);
      if (filters.vendorId) params.append('vendor_id', filters.vendorId);
      if (filters.employeeId) params.append('employee_id', filters.employeeId);
      if (filters.teamId) params.append('team_id', filters.teamId);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/call-details/?${params.toString()}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch filtered plans');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Get all plans (equivalent to SELECT * FROM tb_call_plan)
  getAllPlans: async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/call-details/`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch all plans');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Get plans by employee (equivalent to WHERE tb_call_emp_id='$txtempnames')
  getPlansByEmployee: async (employeeId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/call-details/?employee_id=${employeeId}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch plans by employee');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Get plans by vendor (equivalent to WHERE tb_call_vendor_id='$txtvendors')
  getPlansByVendor: async (vendorId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/call-details/?vendor_id=${vendorId}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch plans by vendor');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Get plans by employee and vendor (equivalent to WHERE tb_call_emp_id AND tb_call_vendor_id)
  getPlansByEmployeeAndVendor: async (employeeId, vendorId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/call-details/?employee_id=${employeeId}&vendor_id=${vendorId}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch plans by employee and vendor');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  // Get dropdown options for filters
  getFilterOptions: async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/call-details/dropdown-data/`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch filter options');
      const result = await response.json();

      // Handle both success/error response formats
      if (result.error) {
        throw new Error(result.error);
      }

      const data = result.success ? result.data : result;

      // Transform to expected format
      return {
        success: true,
        plans: data.call_plans?.map(plan => ({
          id: plan.id,
          name: plan.plan_data || `P${plan.id}`
        })) || [
            { id: 1, name: 'P1' },
            { id: 2, name: 'P2' },
            { id: 3, name: 'P3' },
            { id: 4, name: 'P4' },
            { id: 5, name: 'P5' }
          ],
        vendors: data.vendors?.map(vendor => ({
          id: vendor.id,
          name: vendor.vendor_name || 'Unknown Vendor'
        })) || [],
        employees: data.employees?.map(emp => ({
          id: emp.id,
          name: emp.fullName || emp.firstName || 'Unknown Employee',
          designation: emp.designation || 'Employee'
        })) || [],
        teams: [
          { id: 1, name: 'Recruitment Team A' },
          { id: 2, name: 'Recruitment Team B' },
          { id: 3, name: 'Client Relations Team' },
          { id: 4, name: 'Business Development Team' }
        ]
      };
    } catch (error) {
      // Return fallback data
      return {
        success: false,
        error: error.message,
        plans: [
          { id: 1, name: 'P1' },
          { id: 2, name: 'P2' },
          { id: 3, name: 'P3' },
          { id: 4, name: 'P4' },
          { id: 5, name: 'P5' }
        ],
        vendors: [],
        employees: [],
        teams: [
          { id: 1, name: 'Recruitment Team A' },
          { id: 2, name: 'Recruitment Team B' }
        ]
      };
    }
  }
};



// Real API functions
const eventsAPI = {
  // Get all events (call details) with optional branch filtering
  getEvents: async (branchId = null) => {
    const params = branchId ? { branch_id: branchId } : {};
    const url = apiUtils.buildUrl(`${import.meta.env.VITE_API_BASE_URL}/call-details/`, params);
    const data = await apiUtils.fetchWithErrorHandling(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    // Handle both array and object with results
    const results = Array.isArray(data) ? data : (data.results || []);
    const transformedResults = results.map(transformCallDetailsToEvent);
    return { data: { results: transformedResults } };
  },

  // Get events by date range with optional branch filtering
  getEventsByDateRange: async (startDate, endDate, branchId = null) => {
    const params = { start_date: startDate, end_date: endDate };
    if (branchId) params.branch_id = branchId;
    const url = apiUtils.buildUrl(`${import.meta.env.VITE_API_BASE_URL}/call-details/`, params);
    const data = await apiUtils.fetchWithErrorHandling(url);
    const results = Array.isArray(data) ? data : (data.results || []);
    const transformedResults = results.map(transformCallDetailsToEvent);
    return { data: { results: transformedResults } };
  },

  // Static plan mapping for P1-P5
  getPlanIdByName: (planName) => {
    const planMapping = {
      'P1': 1,
      'P2': 2,
      'P3': 3,
      'P4': 4,
      'P5': 5
    };
    return planMapping[planName] || 1; // Return plan ID or default to 1
  },

  // Create new event (call detail)
  createEvent: async (eventData) => {
    try {
      // Get the correct plan ID from static mapping
      const planId = eventsAPI.getPlanIdByName(eventData.plan);

      // Ensure all required fields have valid values
      const callDetailData = {
        tb_call_plan_id: planId, // Use dynamic plan ID
        tb_call_plan_data: (eventData.plan && eventData.plan.trim()) || 'P1', // Required field
        tb_call_emp_id: parseInt(eventData.employeeId) || 1, // Default employee ID
        tb_call_client_id: parseInt(eventData.clientId) || 1, // Default client ID
        tb_call_state_id: String(eventData.stateId), // Use the exact stateId from EventFormModal
        tb_call_city_id: eventData.cityId ? String(eventData.cityId) : '1', // Convert to string for CharField
        tb_call_channel: eventData.position || 'General Position', // Required field
        tb_call_channel_id: 1,
        tb_call_source_id: eventData.sourceId ? String(eventData.sourceId) : '1',
        tb_call_description: (eventData.remarks && eventData.remarks.trim()) || 'Event created from calendar', // Required field
        branch_id: parseInt(eventData.branchId) || null, // Include branch information
        tb_call_startdate: `${eventData.date}T${eventData.time}:00`,
        tb_call_todate: (() => {
          // Add 1 hour to end time to satisfy backend validation (start < end)
          const [hours, minutes] = eventData.time.split(':');
          const endHour = (parseInt(hours) + 1) % 24;
          const endTime = `${endHour.toString().padStart(2, '0')}:${minutes}`;
          return `${eventData.date}T${endTime}:00`;
        })(),
        tb_call_status: 1
      };

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/call-details/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(callDetailData)
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Extract field-specific errors for user display
        let errorMessage = 'Failed to create event: ';
        if (errorData && typeof errorData === 'object') {
          const errors = [];
          for (const [field, messages] of Object.entries(errorData)) {
            if (Array.isArray(messages)) {
              errors.push(`${field}: ${messages.join(', ')}`);
            }
          }
          if (errors.length > 0) {
            errorMessage += errors.join('; ');
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return { data: transformCallDetailsToEvent(data) };
    } catch (error) {
      throw error;
    }
  },

  // Update event
  updateEvent: async (id, eventData) => {
    try {
      console.log('[eventsAPI.updateEvent] Called with ID:', id, 'eventData:', eventData);
      
      const callDetailData = {
        tb_call_plan_data: (eventData.plan && eventData.plan.trim()) || 'P1',
        tb_call_description: (eventData.remarks && eventData.remarks.trim()) || 'Updated event',
        tb_call_startdate: `${eventData.date}T${eventData.time}:00`,
        tb_call_todate: (() => {
          // Add 1 hour to end time to satisfy backend validation (start < end)
          const [hours, minutes] = eventData.time.split(':');
          const endHour = (parseInt(hours) + 1) % 24;
          const endTime = `${endHour.toString().padStart(2, '0')}:${minutes}`;
          return `${eventData.date}T${endTime}:00`;
        })(),
        tb_call_channel: eventData.position || 'General Position',
        // Add all the missing fields for proper integration
        tb_call_emp_id: eventData.employeeId ? parseInt(eventData.employeeId) : null,
        tb_call_client_id: eventData.clientId ? parseInt(eventData.clientId) : null,
        tb_call_state_id: String(eventData.stateId), // Use the exact stateId from EventFormModal
        tb_call_city_id: eventData.cityId ? String(eventData.cityId) : null,
        tb_call_source_id: eventData.sourceId ? String(eventData.sourceId) : null,
        tb_call_channel_id: eventData.channelId ? parseInt(eventData.channelId) : null
      };

      console.log('[eventsAPI.updateEvent] Sending data:', callDetailData);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/call-details/${id}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(callDetailData)
      });

      console.log('[eventsAPI.updateEvent] Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[eventsAPI.updateEvent] Error response:', errorData);
        throw new Error('Failed to update event');
      }
      const data = await response.json();
      console.log('[eventsAPI.updateEvent] Success response:', data);
      return { data: transformCallDetailsToEvent(data) };
    } catch (error) {
      console.error('[eventsAPI.updateEvent] Exception:', error);
      throw error;
    }
  },

  // Delete event
  deleteEvent: async (id) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/call-details/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to delete event');
      return { data: { message: 'Event deleted successfully' } };
    } catch (error) {
      throw error;
    }
  },

  // Duplicate event
  duplicateEvent: async (id) => {
    try {
      // First get the original event
      const getResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/call-details/${id}/`);
      if (!getResponse.ok) throw new Error('Failed to fetch original event');
      const originalData = await getResponse.json();

      // Create a duplicate
      const duplicateData = {
        ...originalData,
        tb_call_add_date: undefined, // Let backend set new timestamp
        id: undefined // Let backend assign new ID
      };

      const createResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/call-details/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(duplicateData)
      });

      if (!createResponse.ok) throw new Error('Failed to duplicate event');
      const data = await createResponse.json();
      return { data: transformCallDetailsToEvent(data) };
    } catch (error) {
      throw error;
    }
  },

  // Get today's events
  getTodayEvents: async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/call-details/?start_date=${today}&end_date=${today}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch today events');
      const data = await response.json();
      const results = Array.isArray(data) ? data : (data.results || []);
      const transformedResults = results.map(transformCallDetailsToEvent);
      return { data: { results: transformedResults } };
    } catch (error) {
      throw error;
    }
  },


  // Get this month's events using new backend endpoint with branch filtering
  getThisMonthEvents: async (date = null, branchId = null) => {
    try {
      let url = `${import.meta.env.VITE_API_BASE_URL}/call-details/month_view/`;
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (branchId) params.append('branch_id', branchId);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch month events');
      const data = await response.json();

      if (data.success) {
        // Handle both paginated and non-paginated responses
        const results = data.results || data.data || [];
        const transformedResults = results.map(transformCallDetailsToEvent);
        return {
          data: { results: transformedResults },
          viewInfo: {
            view_type: data.view_type,
            start_date: data.start_date,
            end_date: data.end_date,
            month_name: data.month_name,
            count: data.pagination?.count || data.count || results.length
          }
        };
      } else {
        throw new Error('Failed to fetch month events');
      }
    } catch (error) {
      // Fallback to old method
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const startDate = monthStart.toISOString().split('T')[0];
      const endDate = monthEnd.toISOString().split('T')[0];

      return await eventsAPI.getEventsByDateRange(startDate, endDate, branchId);
    }
  },

  // Get this week's events using new backend endpoint with branch filtering
  getThisWeekEvents: async (date = null, branchId = null) => {
    try {
      let url = `${import.meta.env.VITE_API_BASE_URL}/call-details/week_view/`;
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (branchId) params.append('branch_id', branchId);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch week events');
      const data = await response.json();

      if (data.success) {
        // Handle both paginated and non-paginated responses
        const results = data.results || data.data || [];
        const transformedResults = results.map(transformCallDetailsToEvent);
        return {
          data: { results: transformedResults },
          viewInfo: {
            view_type: data.view_type,
            start_date: data.start_date,
            end_date: data.end_date,
            week_start: data.week_start,
            week_end: data.week_end,
            count: data.pagination?.count || data.count || results.length
          }
        };
      } else {
        throw new Error('Failed to fetch week events');
      }
    } catch (error) {
      // Fallback to old method
      const today = new Date();
      const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
      const weekEnd = new Date(today.setDate(today.getDate() - today.getDay() + 6));

      const startDate = weekStart.toISOString().split('T')[0];
      const endDate = weekEnd.toISOString().split('T')[0];

      return await eventsAPI.getEventsByDateRange(startDate, endDate, branchId);
    }
  },

  // Get day events using new backend endpoint with branch filtering
  getDayEvents: async (date = null, branchId = null) => {
    try {
      let url = `${import.meta.env.VITE_API_BASE_URL}/call-details/day_view/`;
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (branchId) params.append('branch_id', branchId);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch day events');
      const data = await response.json();

      if (data.success) {
        // Handle both paginated and non-paginated responses
        const results = data.results || data.data || [];
        const transformedResults = results.map(transformCallDetailsToEvent);
        return {
          data: { results: transformedResults },
          viewInfo: {
            view_type: data.view_type,
            date: data.date,
            day_name: data.day_name,
            count: data.pagination?.count || data.count || results.length
          }
        };
      } else {
        throw new Error('Failed to fetch day events');
      }
    } catch (error) {
      // Fallback to old method
      const targetDate = date || new Date().toISOString().split('T')[0];
      return await eventsAPI.getEventsForDate(targetDate);
    }
  },

  // Get calendar navigation data
  getCalendarNavigation: async (date = null, view = 'month') => {
    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      params.append('view', view);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/call-details/calendar_navigation/?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch calendar navigation');
      const data = await response.json();

      if (data.success) {
        return data;
      } else {
        throw new Error('Failed to fetch calendar navigation');
      }
    } catch (error) {
      throw error;
    }
  },

  // Get events for specific date
  getEventsForDate: async (date) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/call-details/?start_date=${date}&end_date=${date}`);
      if (!response.ok) throw new Error('Failed to fetch events for date');
      const data = await response.json();
      const results = Array.isArray(data) ? data : (data.results || []);
      const transformedResults = results.map(transformCallDetailsToEvent);
      return { data: { results: transformedResults } };
    } catch (error) {
      throw error;
    }
  },

  // Search events
  searchEvents: async (query) => {
    try {
      // Since backend doesn't have search endpoint, we'll get all and filter
      const allEvents = await eventsAPI.getEvents();
      const searchResults = allEvents.data.results.filter(event =>
        event.clientName.toLowerCase().includes(query.toLowerCase()) ||
        event.employeeName.toLowerCase().includes(query.toLowerCase()) ||
        event.remarks.toLowerCase().includes(query.toLowerCase())
      );
      return { data: { results: searchResults } };
    } catch (error) {
      throw error;
    }
  },

  // Get cities filtered by state ID - similar to working states API
  getCitiesByState: async (stateId) => {
    try {
      const authHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      const url = `${import.meta.env.VITE_API_BASE_URL}/candidate/cities/?state_id=${stateId}`;
      
      const response = await fetch(url, { headers: authHeaders });
      
      if (!response.ok) {
        throw new Error(`Cities API failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Transform to match expected format
      const cities = (result.results || result || []).map(city => ({
        value: city.city,
        label: `${city.city}, ${city.state}`,
        id: city.id,
        city_id: city.id,
        city: city.city,
        state: city.state,
        state_id: city.state_ids
      }));
      return { data: cities };
      
    } catch (error) {
      return { data: [] };
    }
  },

  // Get comprehensive dropdown data from new integrated endpoints
  getEventDropdownOptions: async () => {
    try {
      // Add cache-busting parameter to force fresh data
      const cacheBuster = Date.now();
      const url = `${import.meta.env.VITE_API_BASE_URL}/call-details/dropdown-data/?t=${cacheBuster}`;
      
      const response = await fetch(url, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch dropdown options');
      const result = await response.json();

      // Handle both success/error response formats
      if (result.error) {
        throw new Error(result.error);
      }

      const data = result.success ? result.data : result;


      // Transform backend data to frontend format with safe fallbacks
      return {
        data: {
          employees: data.employees?.map(emp => ({
            value: emp.id,
            label: emp.fullName || emp.firstName || 'Unknown Employee',
            name: emp.fullName || emp.firstName || 'Unknown Employee',
            ...emp
          })) || [],
          clients: data.vendors?.map(vendor => ({
            value: vendor.id,
            label: vendor.vendor_name || 'Unknown Client',
            name: vendor.vendor_name || 'Unknown Client',
            ...vendor
          })) || [],
          vendors: data.vendors?.map(vendor => ({
            value: vendor.id,
            label: vendor.vendor_name || 'Unknown Vendor',
            name: vendor.vendor_name || 'Unknown Vendor',
            ...vendor
          })) || [],
          cities: data.cities?.map(city => ({
            value: city.city || city.value,
            label: city.label || (city.state ? `${city.city}, ${city.state}` : city.city),
            name: city.city || 'Unknown City',
            city: city.city || city.value,
            id: city.id || city.city_id,
            city_id: city.city_id || city.id,
            state: city.state,
            state_id: city.state_id || city.state_ids
          })) || [],
          sources: data.sources?.map(source => ({
            value: source.id,
            label: source.source_name || source.name || 'Unknown Source',
            name: source.source_name || source.name || 'Unknown Source',
            ...source
          })) || [],
          branches: data.branches?.map(branch => ({
            value: branch.id,
            label: branch.branch_name || branch.name || 'Unknown Branch',
            name: branch.branch_name || branch.name || 'Unknown Branch',
            ...branch
          })) || [],
          call_plans: data.call_plans?.map(plan => ({
            value: plan.id,
            label: plan.plan_data || 'Unknown Plan',
            name: plan.plan_data || 'Unknown Plan',
            ...plan
          })) || [],
          channels: data.channels || [],
          positions: (data.channels || []).map((pos, index) => {
            if (typeof pos === 'string') {
              return { value: pos, label: pos, id: pos };
            }
            
            // Handle different possible field names from backend
            // Backend sends: { value: id, label: name, id: id, designation: name }
            const positionName = pos.label || pos.designation || pos.name || pos.position_name || `Position ${index + 1}`;
            const positionId = pos.id || pos.value || pos.position_id || index + 1;
            
            return {
              value: positionName,
              label: positionName,
              id: positionId
            };
          }),
          status_options: data.status_options || [
            { value: 1, label: 'Active' },
            { value: 2, label: 'Completed' },
            { value: 3, label: 'Cancelled' }
          ],
          // Static plans for backward compatibility
          plans: ['P1', 'P2', 'P3', 'P4', 'P5'],
          // Use backend states directly so they carry numeric IDs
          states: (data.states || []).map(state => ({
            value: state.value ?? state.id ?? state.stateid,
            label: state.label ?? state.state ?? state.name,
            id: state.id ?? state.stateid ?? state.value,
            state_id: state.id ?? state.stateid ?? state.value,
            state: state.state ?? state.label ?? state.name
          }))
        },
        counts: result.counts || {}
      };
    } catch (error) {
      // Fallback to individual endpoints if comprehensive endpoint fails
      return await eventsAPI.getIndividualDropdownOptions();
    }
  },

  // Fallback method to get dropdown options from individual endpoints
  getIndividualDropdownOptions: async () => {
    try {
      // Try to get data from existing working endpoints
      const results = await Promise.allSettled([
        fetch(`${import.meta.env.VITE_API_BASE_URL}/empreg/employees/`, { headers: getAuthHeaders() }).then(async r => {
          return r.ok ? r.json() : { results: [] };
        }),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/vendor/vendors/`, { headers: getAuthHeaders() }).then(async r => {
          return r.ok ? r.json() : { results: [] };
        }),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/candidate/cities/`, { headers: getAuthHeaders() }).then(async r => {
          return r.ok ? r.json() : { cities: [] };
        }),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/masters/states/`, { headers: getAuthHeaders() }).then(async r => {
          return r.ok ? r.json() : { results: [] };
        }),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/masters/sources/`, { headers: getAuthHeaders() }).then(async r => {
          return r.ok ? r.json() : [];
        }),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/call-details/branches/`, { headers: getAuthHeaders() }).then(async r => {
          return r.ok ? r.json() : { branches: [] };
        })
      ]);

      const [employeesRes, vendorsRes, citiesRes, statesRes, sourcesRes, branchesRes] = results.map(result =>
        result.status === 'fulfilled' ? result.value : {}
      );

      return {
        data: {
          employees: (employeesRes.results || []).map(emp => ({
            value: emp.id,
            label: emp.firstName || 'Unknown Employee',
            name: emp.firstName || 'Unknown Employee',
            fullName: emp.firstName || 'Unknown Employee',
            ...emp
          })),
          clients: (vendorsRes.results || []).map(vendor => ({
            value: vendor.id,
            label: vendor.vendor_name || 'Unknown Client',
            name: vendor.vendor_name || 'Unknown Client',
            vendor_name: vendor.vendor_name || 'Unknown Client',
            ...vendor
          })),
          vendors: (vendorsRes.results || []).map(vendor => ({
            value: vendor.id,
            label: vendor.vendor_name || 'Unknown Vendor',
            name: vendor.vendor_name || 'Unknown Vendor',
            vendor_name: vendor.vendor_name || 'Unknown Vendor',
            ...vendor
          })),
          cities: (() => {
            // Handle multiple possible response shapes from the cities endpoint:
            // - Plain array
            // - { cities: [...] }
            // - { results: [...] } (DRF pagination)
            const dbCities = Array.isArray(citiesRes)
              ? citiesRes
              : (citiesRes.cities || citiesRes.results || []);
            
            
            return dbCities.map((city, index) => ({
              value: city.city || city.value || `city_${index}`,
              label: city.label || (city.state ? `${city.city}, ${city.state}` : city.city),
              name: city.city || 'Unknown City',
              city: city.city || city.value,
              state: city.state,
              id: city.id ?? city.city_id ?? (index + 1),
              state_id: city.state_id ?? city.stateId ?? null
            }));
          })(),
          sources: (Array.isArray(sourcesRes) ? sourcesRes : []).map(source => {
            return {
              id: source.id,
              name: source.name,
              status: source.status,
              created_at: source.created_at
            };
          }),
          branches: (branchesRes.branches || []).map(branch => ({
            value: branch.id,
            label: branch.name || branch.branch_name || 'Unknown Branch',
            name: branch.name || branch.branch_name || 'Unknown Branch',
            branch_name: branch.name || branch.branch_name || 'Unknown Branch',
            ...branch
          })),
          // No positions field - using channels for Masters Position data
          plans: ['P1', 'P2', 'P3', 'P4', 'P5'],
          // Use only states from tbl_state table
          states: (() => {
            const dbStates = Array.isArray(statesRes)
              ? statesRes
              : (statesRes.results || []);
            
            
            // Return state objects with both ID and name for tb_call_state_id mapping
            return dbStates.map(state => ({
              value: state.state_id || state.id,
              label: state.state,
              name: state.state,
              state_id: state.state_id || state.id,
              state: state.state
            })).filter(state => state.state);
          })(),
          channels: [
            { value: 'Banca', label: 'Banca' },
            { value: 'Agency', label: 'Agency' },
            { value: 'Direct', label: 'Direct' },
            { value: 'Online', label: 'Online' },
            { value: 'Referral', label: 'Referral' }
          ],
          status_options: [
            { value: 0, label: 'Inactive' },
            { value: 1, label: 'Active' },
            { value: 2, label: 'Completed' },
            { value: 3, label: 'Cancelled' }
          ]
        }
      };
    } catch (error) {
      // Final fallback to static options
      return {
        data: {
          employees: [],
          clients: [],
          vendors: [],
          states: [],
          cities: [],
          sources: [],
          branches: [],
          plans: ['P1', 'P2', 'P3', 'P4', 'P5'],
          channels: [
            { value: 'Banca', label: 'Banca' },
            { value: 'Agency', label: 'Agency' },
            { value: 'Direct', label: 'Direct' }
          ],
          status_options: [
            { value: 1, label: 'Active' },
            { value: 2, label: 'Completed' }
          ]
        }
      };
    }
  }
};

const Events = () => {
  // Get user authentication data from Redux
  const { employeeCode } = useSelector((state) => state.auth);
  
  // Handle URL parameters for edit functionality
  const [searchParams] = useSearchParams();

  // User profile state for branch information
  const [userProfile, setUserProfile] = useState(null);
  const [userBranch, setUserBranch] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [formData, setFormData] = useState({
    plan: '',
    employeeName: '',
    employeeId: '',
    clientName: '',
    clientId: '',
    state: '',
    stateId: '',
    city: '',
    cityId: '',
    position: '',
    source: '',
    sourceId: '',
    branch: '',
    branchId: '',
    date: '',
    time: '',
    remarks: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dropdownOptions, setDropdownOptions] = useState({
    employees: [],
    clients: [],
    vendors: [],
    cities: [],
    states: [],
    sources: [],
    branches: []
  });
  const [filteredCities, setFilteredCities] = useState([]); 
  const [, setSelectedEvent] = useState(null);
  const [, setShowEventDetails] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [calendarView, setCalendarView] = useState('day');
  const [activeFilters, setActiveFilters] = useState({
    plans: ['P1', 'P2', 'P3', 'P4', 'P5'],
    employees: [],
    clients: [],
    branches: [] // Will be set based on user's branch or all branches for admin
  });
  const [draggedEvent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEvent, setEditingEvent] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);

  // Modal state for candidate stats
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedStatsType, setSelectedStatsType] = useState('');
  const [selectedEventData, setSelectedEventData] = useState(null);
  const [candidateIds, setCandidateIds] = useState([]);
  const [branchFilters, setBranchFilters] = useState({
    plans: ['P1', 'P2', 'P3', 'P4', 'P5'],
    employees: [],
    clients: [],
    dateRange: 'today' // 'today', 'week', 'month', 'custom'
  });
  const [selectedBranchFilter, setSelectedBranchFilter] = useState(null);
  const [showOverview, setShowOverview] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [showClients, setShowClients] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showPlanScheduler, setShowPlanScheduler] = useState(false);



  // Calendar Plan Scheduler states (based on PHP logic)
  const [planFilters, setPlanFilters] = useState({
    planId: '',
    vendorId: '',
    employeeId: '',
    teamId: ''
  });
  const [filteredPlans, setFilteredPlans] = useState([]);
  const [planFilterOptions, setPlanFilterOptions] = useState({
    plans: [],
    vendors: [],
    employees: [],
    teams: []
  });
  const [planLoading, setPlanLoading] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [selectedPlanView, setSelectedPlanView] = useState('calendar'); // 'calendar', 'table', 'timeline'
  const [, setCurrentViewInfo] = useState(null); // Store view metadata from backend
  const [navigationData, setNavigationData] = useState(null); // Store navigation data from backend
  const [savedEvents, setSavedEvents] = useState([]); // Store all events

  // Static plan options - P1 to P5
  const planOptions = [
    { value: 'P1', label: 'P1 - Plan 1' },
    { value: 'P2', label: 'P2 - Plan 2' },
    { value: 'P3', label: 'P3 - Plan 3' },
    { value: 'P4', label: 'P4 - Plan 4' },
    { value: 'P5', label: 'P5 - Plan 5' }
  ];

  // Dynamic employee options from API - Memoized to prevent unnecessary recalculations
  const employeeOptions = useMemo(() => {
    return dropdownOptions.employees.length > 0 ?
      dropdownOptions.employees.map(emp => ({
        value: emp.label || emp.fullName || emp.name,
        label: emp.label || emp.fullName || emp.name,
        id: emp.id,
        fullName: emp.fullName || emp.name,
        designation: emp.designation,
        email: emp.email,
        phone: emp.phone
      })) : [];
  }, [dropdownOptions.employees]);

  // Dynamic client options from API - Memoized to prevent unnecessary recalculations
  const clientOptions = useMemo(() => {
    return dropdownOptions.clients.length > 0 ?
      dropdownOptions.clients.map(client => ({
        value: client.label || client.vendor_name || client.name,
        label: client.label || client.vendor_name || client.name,
        id: client.id,
        vendor_name: client.vendor_name || client.name,
        contact_person: client.contact_person,
        email: client.email,
        contact_no1: client.contact_no1
      })) : [];
  }, [dropdownOptions.clients]);


  // REMOVED: State processing moved to EventFormModal for single source of truth

  // REMOVED: City processing moved to EventFormModal for single source of truth

  // Dynamic position options from channels API - Memoized to prevent unnecessary recalculations
  const positionOptions = useMemo(() => {
    return dropdownOptions.channels?.length > 0 ?
      dropdownOptions.channels.map(channel => ({
        value: channel.value,
        label: channel.label
      })) : [];
  }, [dropdownOptions.channels]);

  // Dynamic source options from masters/sources API - Memoized to prevent unnecessary recalculations
  const sourceOptions = useMemo(() => {
    return dropdownOptions.sources.length > 0 ?
      dropdownOptions.sources.map(source => ({
        value: source.id,
        label: source.name,
        id: source.id,
        name: source.name,
        status: source.status,
        created_at: source.created_at
      })) : [
        // No fallback - sources should come from masters/sources API
        // If this shows, check if masters/sources API is working
      ];
  }, [dropdownOptions.sources]);

  // Dynamic branch options from API - Memoized to prevent unnecessary recalculations
  const branchOptions = useMemo(() => {
    return dropdownOptions.branches.length > 0 ?
      dropdownOptions.branches.map(branch => ({
        value: branch.label || branch.branch_name || branch.name,
        label: branch.label || branch.branch_name || branch.name,
        id: branch.id,
        branch_name: branch.branch_name || branch.name,
        branch_code: branch.branch_code || branch.branchcode,
        city: branch.city,
        state: branch.state,
        is_active: branch.is_active
      })) : [
        // No fallback - branches should come from call-details/branches API with role-based filtering
        // If this shows, check if call-details/branches API is working
      ];
  }, [dropdownOptions.branches]);

  // Note: getFilteredBranchOptions function removed as it was unused

  // Categories/Plans configuration
  const categories = [
    { id: 'P1', name: 'Plan-1', color: 'bg-blue-500', lightColor: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-blue-400' },
    { id: 'P2', name: 'Plan-2', color: 'bg-green-500', lightColor: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-green-400' },
    { id: 'P3', name: 'Plan-3', color: 'bg-purple-500', lightColor: 'bg-purple-50', textColor: 'text-purple-700', borderColor: 'border-purple-400' },
    { id: 'P4', name: 'Plan-4', color: 'bg-orange-500', lightColor: 'bg-orange-50', textColor: 'text-orange-700', borderColor: 'border-orange-400' },
    { id: 'P5', name: 'Plan-5', color: 'bg-pink-500', lightColor: 'bg-pink-50', textColor: 'text-pink-700', borderColor: 'border-pink-400' },

  ];

  // Fetch user profile and set up branch-based filtering
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (employeeCode) {
          // Use the new backend endpoint for user profile
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/call-details/user-profile/`, {
            method: 'GET',
            headers: getAuthHeaders()
          });
          if (!response.ok) throw new Error('Failed to fetch user profile');

          const result = await response.json();
          if (!result.success) throw new Error(result.error || 'Failed to fetch user profile');

          const profile = result.data;
          setUserProfile(profile);

          // Use the isAdmin flag from backend
          setIsAdmin(profile.isAdmin);

          // Set user's branch information based on role
          if (profile.canSeeAllBranches) {
            // CEO and RM: No specific branch, can access all
            setUserBranch(null);
          } else if (profile.branch) {
            // Other roles: Set specific branch
            setUserBranch({
              id: profile.branch,
              name: profile.branchName || profile.branch
            });

            // Set default branch in form data and active filters
            setFormData(prev => ({
              ...prev,
              branch: profile.branchName || profile.branch,
              branchId: profile.branch
            }));

            setActiveFilters(prev => ({
              ...prev,
              branches: [profile.branchName || profile.branch]
            }));
            
          } else {
            // No branch assigned
            setUserBranch(null);
          }
        }
      } catch (error) {
        toast.error('Failed to load user profile');
      }
    };

    fetchUserProfile();
  }, [employeeCode]);

  // Cache for events data to avoid redundant API calls
  const eventCache = useRef({});
  const getCacheKey = (view, date, branchId) => `${view}_${date}_${branchId || 'all'}`;

  // Load events and dropdown options from backend API
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const shouldApplyBranchFilter = false;
        const branchId = shouldApplyBranchFilter ? userBranch.id : null;

        // Run all API calls in parallel using Promise.allSettled
        const [optionsResult, planOptionsResult, eventsResult, plansResult] = await Promise.allSettled([
          // 1. Load dropdown options
          eventsAPI.getEventDropdownOptions().catch(() => 
            eventsAPI.getIndividualDropdownOptions().catch(() => ({
              data: {
                employees: [], clients: [], cities: [], sources: [],
                branches: [], states: [], plans: ['P1', 'P2', 'P3', 'P4', 'P5']
              }
            }))
          ),
          
          // 2. Load plan filter options
          calendarPlanAPI.getFilterOptions().catch(() => ({
            plans: [
              { id: 1, name: 'P1' }, { id: 2, name: 'P2' },
              { id: 3, name: 'P3' }, { id: 4, name: 'P4' }, { id: 5, name: 'P5' }
            ],
            vendors: [], employees: [], teams: []
          })),
          
          // 3. Load events based on view
          (async () => {
            const cacheKey = getCacheKey(calendarView, new Date().toISOString().split('T')[0], branchId);
            if (eventCache.current[cacheKey]) {
              return eventCache.current[cacheKey];
            }
            
            let response;
            switch (calendarView) {
              case 'month': response = await eventsAPI.getThisMonthEvents(null, branchId); break;
              case 'week': response = await eventsAPI.getThisWeekEvents(null, branchId); break;
              case 'day': response = await eventsAPI.getDayEvents(null, branchId); break;
              default: response = await eventsAPI.getDayEvents(null, branchId);
            }
            eventCache.current[cacheKey] = response;
            return response;
          })().catch(() => ({ data: { results: [] } })),
          
          // 4. Load initial filtered plans
          calendarPlanAPI.getAllPlans().catch(() => ({ results: [] }))
        ]);

        // Process results from Promise.allSettled
        if (optionsResult.status === 'fulfilled') {
          setDropdownOptions(optionsResult.value.data || optionsResult.value);
        } else {
          setDropdownOptions({
            employees: [], clients: [], cities: [], sources: [],
            branches: [], states: [], plans: ['P1', 'P2', 'P3', 'P4', 'P5']
          });
        }

        if (planOptionsResult.status === 'fulfilled') {
          setPlanFilterOptions(planOptionsResult.value);
        }

        if (eventsResult.status === 'fulfilled') {
          const events = eventsResult.value.data?.results || [];
          setSavedEvents(events);
        } else {
          setSavedEvents([]);
        }

        if (plansResult.status === 'fulfilled') {
          setFilteredPlans(plansResult.value.results || plansResult.value || []);
        } else {
          setFilteredPlans([]);
        }

      } catch (error) {
        toast.error('Some data failed to load. Using fallback options.');
        setSavedEvents([]);
        setDropdownOptions({
          employees: [], clients: [], cities: [], sources: [],
          branches: [], states: [], plans: ['P1', 'P2', 'P3', 'P4', 'P5']
        });
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [userBranch, isAdmin]); // Reload when user branch or admin status changes

  // Handle edit parameters from URL
  useEffect(() => {
    const editMode = searchParams.get('edit');
    const eventData = searchParams.get('eventData');
    
    if (editMode === 'true' && eventData) {
      try {
        const parsedEventData = JSON.parse(decodeURIComponent(eventData));
        
        // Set the editing event and form data
        setEditingEvent(parsedEventData);
        setFormData({
          plan: parsedEventData.plan_name || parsedEventData.plan || '',
          employeeName: parsedEventData.employeeName || parsedEventData.employee_name || '',
          employeeId: parsedEventData.employeeId || parsedEventData.employee_id || '',
          clientName: parsedEventData.clientName || parsedEventData.client_name || '',
          clientId: parsedEventData.clientId || parsedEventData.client_id || '',
          state: parsedEventData.state || '',
          stateId: parsedEventData.stateId || parsedEventData.state_id || '',
          city: parsedEventData.city || '',
          cityId: parsedEventData.cityId || parsedEventData.city_id || '',
          position: parsedEventData.position || '',
          source: parsedEventData.source || '',
          sourceId: parsedEventData.sourceId || parsedEventData.source_id || '',
          date: parsedEventData.date || '',
          time: parsedEventData.time || '',
          remarks: parsedEventData.remarks || ''
        });
        
        // Open the event form modal
        setShowEventForm(true);
        
        // Clear the URL parameters to clean up the URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
      } catch (error) {
        // Error parsing event data from URL
      }
    }
  }, [searchParams]);

  // Ensure month view loads month data when calendar view changes to month
  useEffect(() => {
    if (calendarView === 'month') {
      loadEventsForCurrentView('month', currentDate);
    }
  }, [calendarView]);

  // Handle plan filter changes (based on PHP filtering logic)
  const handlePlanFilterChange = async (filterType, value) => {
    const newFilters = { ...planFilters, [filterType]: value };
    setPlanFilters(newFilters);

    setPlanLoading(true);
    try {
      let plansResponse;

      // Apply filtering logic similar to PHP conditions
      if (!newFilters.planId && !newFilters.vendorId && !newFilters.employeeId && !newFilters.teamId) {
        // All filters empty - get all plans (equivalent to SELECT * FROM tb_call_plan)
        plansResponse = await calendarPlanAPI.getAllPlans();
      } else if (newFilters.employeeId && newFilters.vendorId) {
        // Both employee and vendor selected
        plansResponse = await calendarPlanAPI.getPlansByEmployeeAndVendor(newFilters.employeeId, newFilters.vendorId);
      } else if (newFilters.employeeId) {
        // Only employee selected
        plansResponse = await calendarPlanAPI.getPlansByEmployee(newFilters.employeeId);
      } else if (newFilters.vendorId) {
        // Only vendor selected
        plansResponse = await calendarPlanAPI.getPlansByVendor(newFilters.vendorId);
      } else {
        // Other combinations - use general filtered API
        plansResponse = await calendarPlanAPI.getFilteredPlans(newFilters);
      }

      setFilteredPlans(plansResponse.results || plansResponse || []);
      toast.success(`Found ${(plansResponse.results || plansResponse || []).length} plans`);
    } catch (error) {
      toast.error('Failed to filter plans');
      setFilteredPlans([]);
    } finally {
      setPlanLoading(false);
    }
  };

  // Clear all plan filters
  const clearPlanFilters = () => {
    setPlanFilters({
      planId: '',
      vendorId: '',
      employeeId: '',
      teamId: ''
    });
    handlePlanFilterChange('planId', '');
  };

  // Handle input changes for main Events component (EventFormModal has its own handleInputChange)
  const handleInputChange = async (field, value, selectedOption = null) => {
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Handle ID fields for dropdown selections
    if (selectedOption) {
      if (field === 'employeeName' && selectedOption.id) {
        setFormData(prev => ({
          ...prev,
          employeeId: selectedOption.id
        }));
      } else if (field === 'clientName' && selectedOption.id) {
        setFormData(prev => ({
          ...prev,
          clientId: selectedOption.id
        }));
      } else if (field === 'source' && selectedOption.id) {
        setFormData(prev => ({
          ...prev,
          sourceId: String(selectedOption.id || selectedOption.source_id || '')
        }));
      } else if (field === 'branch' && selectedOption.id) {
        setFormData(prev => ({
          ...prev,
          branchId: selectedOption.id
        }));
      } else if (field === 'state' && selectedOption) {
        // Handle state selection - store both name and ID and fetch cities
        const stateId = selectedOption.state_id || selectedOption.id;
        
        setFormData(prev => ({
          ...prev,
          state: selectedOption.value,
          stateId: String(stateId || ''), // Ensure string format
          city: '', // Clear city when state changes
          cityId: '' // Clear city ID when state changes
        }));
        
        // Fetch cities for the selected state
        if (stateId) {
          try {
            const citiesResponse = await eventsAPI.getCitiesByState(stateId);
            setFilteredCities(citiesResponse.data || []);
          } catch (error) {
            setFilteredCities([]);
          }
        } else {
          setFilteredCities([]);
        }
      } else if (field === 'city' && selectedOption) {
        // Handle city selection - store both name and ID with validation
        const cityId = selectedOption.city_id || selectedOption.id;
        const cityStateId = selectedOption.state_id;
        
        // Verify city belongs to selected state
        if (cityStateId && formData.stateId && String(cityStateId) !== String(formData.stateId)) {
          return; // Prevent setting mismatched city
        }
        
        setFormData(prev => ({
          ...prev,
          city: selectedOption.value,
          cityId: String(cityId || '')
        }));
        
      }
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    // Clear city when state changes (already handled above for state selection)
    if (field === 'state' && !selectedOption) {
      setFormData(prev => ({
        ...prev,
        city: '',
        cityId: ''
      }));
    }
  };

  const handleSave = async (formDataFromModal) => {
    // This function is called by EventFormModal after its own validation
    console.log('='.repeat(80));
    console.log('[Events] handleSave called with:', formDataFromModal);
    console.log('[Events] editingEvent:', editingEvent);
    console.log('[Events] isSubmitting before:', isSubmitting);
    console.log('='.repeat(80));

    setIsSubmitting(true);

    try {
      if (editingEvent) {
        // Update existing event
        console.log('[Events] Updating event with ID:', editingEvent.id);
        const response = await eventsAPI.updateEvent(editingEvent.id, formDataFromModal);
        console.log('[Events] Update response:', response);
        const updatedEvent = response.data;
        setSavedEvents(prev => prev.map(event =>
          event.id === editingEvent.id ? updatedEvent : event
        ));
        
        // Clear cache to force fresh data fetch on next load
        eventCache.current = {};
        console.log('[Events] Cache cleared after event update');
        
        toast.success('Event updated successfully!');
        setEditingEvent(null);
      } else {
        // Create new event
        console.log('[Events] Creating new event');
        const response = await eventsAPI.createEvent(formDataFromModal);
        console.log('[Events] Create response:', response);
        const newEvent = response.data;
        setSavedEvents(prev => [...prev, newEvent]);
        
        // Clear cache to force fresh data fetch on next load
        eventCache.current = {};
        console.log('[Events] Cache cleared after event creation');
        
        toast.success('Event scheduled successfully!');
      }

      setShowEventForm(false);

      // Reset form
      setFormData({
        plan: '',
        employeeName: '',
        employeeId: '',
        clientName: '',
        clientId: '',
        state: '',
        stateId: '',
        city: '',
        cityId: '',
        position: '',
        source: '',
        sourceId: '',
        branch: '',
        branchId: '',
        date: '',
        time: '',
        remarks: ''
      });

    } catch (error) {
      console.error('[Events] Error in handleSave:', error);
      toast.error(error.message || 'Failed to save event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enhanced event filtering with search
  const getFilteredEvents = () => {
	if (!savedEvents || !Array.isArray(savedEvents)) {
      return [];
    }
    
    let filtered = savedEvents.filter(event => {
      // Safe field access with fallbacks
      const eventPlan = event.plan || '';
      const eventEmployeeName = event.employeeName || event.employee_name || '';
      const eventClientName = event.clientName || event.client_name || '';
      const eventBranch = event.branch || '';

      return activeFilters.plans.includes(eventPlan) &&
        (activeFilters.employees.length === 0 || activeFilters.employees.includes(eventEmployeeName)) &&
        (activeFilters.clients.length === 0 || activeFilters.clients.includes(eventClientName)) &&
        (activeFilters.branches.length === 0 || activeFilters.branches.includes(eventBranch));
    });

    if (searchQuery) {
      filtered = filtered.filter(event => {
        // Safe field access for search
        const clientName = event.clientName || event.client_name || '';
        const employeeName = event.employeeName || event.employee_name || '';
        const remarks = event.remarks || '';
        const city = event.city || '';

        return clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          remarks.toLowerCase().includes(searchQuery.toLowerCase()) ||
          city.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    return filtered;
  };

  const toggleFilter = (type, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter(item => item !== value)
        : [...prev[type], value]
    }));
  };

  // Calendar helper functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEventsForDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // Try multiple date formats to match events - avoid timezone issues
    const possibleDateFormats = [
      dateStr, // YYYY-MM-DD
      `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`, // Ensure padding (duplicate but safe)
    ].filter((format, index, array) => array.indexOf(format) === index); // Remove duplicates
    
    // Get all events that match any of the possible date formats
    const allEventsForDate = savedEvents.filter(event => {
      if (!event.date) return false;
      // Only use exact matches, no startsWith to avoid false matches
      return possibleDateFormats.some(format => event.date === format);
    });
    
    // Apply filters but be more lenient for month view
    const filteredEventsForDate = allEventsForDate.filter(event => {
      // For month view, show all events regardless of most filters
      // Only apply essential filters
      if (activeFilters.plans.length > 0 && !activeFilters.plans.includes(event.plan)) {
        return false;
      }
      if (activeFilters.employees.length > 0 && !activeFilters.employees.includes(event.employeeName)) {
        return false;
      }
      if (searchQuery && !event.clientName?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
    
    
    
    return filteredEventsForDate;
  };

  const getTodayEventsFiltered = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    return getFilteredEvents().filter(event => event.date === todayStr);
  };

  const getThisWeekEventsFiltered = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return getFilteredEvents().filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= startOfWeek && eventDate <= endOfWeek;
    });
  };

  const getThisMonthEventsFiltered = () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    return getFilteredEvents().filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= startOfMonth && eventDate <= endOfMonth;
    });
  };



  // Context-aware navigation based on calendar view with backend data loading
  const navigateCalendar = async (direction) => {
    let newDate;

    if (navigationData) {
      // Use backend navigation data for accurate date calculation
      const targetDateString = direction > 0 ? navigationData.next_date : navigationData.prev_date;
      newDate = new Date(targetDateString);
    } else {
      // Fallback to client-side calculation
      newDate = new Date(currentDate);

      if (calendarView === 'month') {
        newDate.setMonth(currentDate.getMonth() + direction);
      } else if (calendarView === 'week') {
        newDate.setDate(currentDate.getDate() + (direction * 7));
      } else if (calendarView === 'day') {
        newDate.setDate(currentDate.getDate() + direction);
      }
    }

    setCurrentDate(newDate);

    // Load events for the new date
    await loadEventsForCurrentView(calendarView, newDate);
  };

  // Note: navigateMonth function removed as it was unused

  // Handle view switching with proper date context and load new data
  const handleViewChange = async (newView) => {
    let dateToUse = currentDate;
    
    // Reset to current date only for week view
    if (newView === 'week') {
      const newCurrentDate = new Date();
      setCurrentDate(newCurrentDate);
      dateToUse = newCurrentDate; // Use the new date immediately
    } else if (newView === 'day') {
      // For day view, if current date has no events, try to find a date with events
      const eventsForCurrentDate = getEventsForDate(currentDate);
      if (eventsForCurrentDate.length === 0 && savedEvents.length > 0) {
        // Find the first date that has events
        const firstEventDate = new Date(savedEvents[0].date || savedEvents[0].tb_call_startdate);
        setCurrentDate(firstEventDate);
        dateToUse = firstEventDate;
      }
      // Otherwise, keep the existing currentDate
    }

    setCalendarView(newView);

    // Load events for the new view with the correct date
    await loadEventsForCurrentView(newView, dateToUse);
  };

  // Load events based on current view and date with branch filtering
  const loadEventsForCurrentView = async (view = calendarView, date = currentDate) => {
    const dateString = date.toISOString().split('T')[0];
    const shouldApplyBranchFilter = false;
    const branchId = shouldApplyBranchFilter ? userBranch.id : null;
    const cacheKey = getCacheKey(view, dateString, branchId);

    // Check cache first - show cached data immediately
    if (eventCache.current[cacheKey]) {
      const cachedResponse = eventCache.current[cacheKey];
      setSavedEvents(cachedResponse.data.results);
      setCurrentViewInfo(cachedResponse.viewInfo);
      
      // Fetch fresh data in background without blocking UI
      (async () => {
        try {
          let eventsResponse;
          switch (view) {
            case 'month': eventsResponse = await eventsAPI.getThisMonthEvents(dateString, branchId); break;
            case 'week': eventsResponse = await eventsAPI.getThisWeekEvents(dateString, branchId); break;
            case 'day': eventsResponse = await eventsAPI.getDayEvents(dateString, branchId); break;
            default: eventsResponse = await eventsAPI.getThisMonthEvents(dateString, branchId);
          }
          
          // Update cache and state with fresh data
          eventCache.current[cacheKey] = eventsResponse;
          setSavedEvents(eventsResponse.data.results);
          setCurrentViewInfo(eventsResponse.viewInfo);
          
          // Load navigation data in background
          const navData = await eventsAPI.getCalendarNavigation(dateString, view);
          setNavigationData(navData);
        } catch (error) {
          // Silent fail for background refresh
        }
      })();
      
      return; // Exit early with cached data
    }

    // No cache - show loading and fetch data
    setLoading(true);
    try {
      let eventsResponse;
      switch (view) {
        case 'month': eventsResponse = await eventsAPI.getThisMonthEvents(dateString, branchId); break;
        case 'week': eventsResponse = await eventsAPI.getThisWeekEvents(dateString, branchId); break;
        case 'day': eventsResponse = await eventsAPI.getDayEvents(dateString, branchId); break;
        default: eventsResponse = await eventsAPI.getThisMonthEvents(dateString, branchId);
      }

      // Cache the response
      eventCache.current[cacheKey] = eventsResponse;
      
      const events = eventsResponse.data.results;
      setSavedEvents(events);
      setCurrentViewInfo(eventsResponse.viewInfo);

      // Load navigation data
      const navData = await eventsAPI.getCalendarNavigation(dateString, view);
      setNavigationData(navData);

    } catch (error) {
      toast.error(`Failed to load ${view} view`);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };


  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, newDate, newTime) => {
    e.preventDefault();
    if (draggedEvent) {
      const updatedEvents = savedEvents.map(event =>
        event.id === draggedEvent.id
          ? { ...event, date: newDate, time: newTime }
          : event
      );
      setSavedEvents(updatedEvents);
      toast.success('Event moved successfully!');
    }
  };

  // Event management functions
  const handleEditEvent = (event) => {
    setEditingEvent(event);
    
    const formDataForEdit = {
      plan: event.plan || 'P1',
      employeeName: event.employeeName || event.employee_name || '',
      employeeId: event.employeeId || event.tb_call_emp_id || '',
      clientName: event.clientName || event.client_name || '',
      clientId: event.clientId || event.tb_call_client_id || '',
      state: event.state || event.state_name || '',
      stateId: event.stateId || event.tb_call_state_id || '',
      city: event.city || event.city_name || '',
      cityId: event.cityId || event.tb_call_city_id || '',
      position: event.position || event.tb_call_channel || '',
      source: event.source || event.source_name || '',
      sourceId: event.sourceId || event.tb_call_source_id || '',
      branch: event.branch || event.branch_name || '',
      branchId: event.branchId || event.tb_call_branch_id || '',
      channelId: event.channelId || event.tb_call_channel_id || '',
      date: event.date || new Date().toISOString().split('T')[0],
      time: event.time || '09:00',
      remarks: event.remarks || event.tb_call_description || ''
    };
    
    setFormData(formDataForEdit);
    setShowEventForm(true);
  };

  const handleDeleteEvent = async (eventId) => {
    if (!eventId) return;
    
    try {
      await eventsAPI.deleteEvent(eventId);
      setSavedEvents(prev => prev.filter(event => event.id !== eventId));
      
      // Clear cache to force fresh data fetch on next load
      eventCache.current = {};
      console.log('[Events] Cache cleared after event deletion');
      
      toast.success('Event deleted successfully!');
      setShowConfirmDelete(null);
    } catch (error) {
      toast.error('Failed to delete event. Please try again.');
    } finally {
      setShowEventDetails(false);
    }
  };

  const handleDuplicateEvent = async (event) => {
    try {
      const response = await eventsAPI.duplicateEvent(event.id);
      const duplicatedEvent = response.data;
      setSavedEvents(prev => [...prev, duplicatedEvent]);
      toast.success('Event duplicated successfully!');
    } catch (error) {
      toast.error('Failed to duplicate event. Please try again.');
    }
  };

  // Function to open candidate table in new tab
  const openCandidateTableInNewTab = (statsType, event, candidateIds) => {
    // Get stats type display name
    const getStatsTypeDisplayName = (type) => {
      switch (type) {
        case 'callsOnPlan':
          return 'Calls On Plan';
        case 'callsOnOthers':
          return 'Calls On Others';
        case 'profilesOnPlan':
          return 'Profiles On Plan';
        case 'profilesOnOthers':
          return 'Profiles On Others';
        default:
          return 'Candidates';
      }
    };

    const title = `${getStatsTypeDisplayName(statsType)} - ${event?.employeeName || 'Event'}`;
    
    const reportData = {
      candidates: [], // Will be fetched by IDs in the report
      candidateIds: candidateIds,
      title: title,
      statsType: statsType,
      eventData: event,
      timestamp: Date.now()
    };
    
    try {
      // Generate a unique key for this report session
      const reportKey = `candidate_table_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(reportKey, JSON.stringify(reportData));
      
      // Clean up old report data (older than 1 hour) to prevent storage bloat
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('candidate_table_report_')) {
          try {
            const data = JSON.parse(sessionStorage.getItem(key));
            if (data.timestamp && (Date.now() - data.timestamp) > 3600000) { // 1 hour
              sessionStorage.removeItem(key);
            }
          } catch (e) {
            // Remove corrupted entries
            sessionStorage.removeItem(key);
          }
        }
      });
      
      // Pass only the key and basic info through URL
      const params = new URLSearchParams({
        title: title,
        statsType: statsType,
        reportKey: reportKey
      });
      
      const url = `/candidate-table-report?${params.toString()}`;
      window.open(url, '_blank');
      
    } catch (error) {
      toast.error('Unable to open candidate report. Please try again.');
    }
  };

  // Handle stats card clicks to show candidate table modal
  const handleStatsCardClick = (statsType, event) => {
    let ids = [];

    // Helper function to safely parse candidate IDs
    const parseIds = (idString) => {
      if (!idString || idString === null || idString === undefined ||
        idString.toString().trim() === '' || idString.toString().trim() === '0') {
        return [];
      }
      
      const strValue = idString.toString().trim();
      
      // Check if it's a single number without commas (like "4" or "2")
      // This indicates the data is corrupted (storing count instead of IDs)
      if (!strValue.includes(',') && !isNaN(strValue) && parseInt(strValue) < 100) {
        return [];
      }
      
      return strValue.split(',')
        .map(id => id.trim())
        .filter(id => id !== '' && id !== '0' && id !== 'null');
    };

    // Extract candidate IDs based on stats type
    let rawData = '';
    switch (statsType) {
      case 'callsOnPlan':
        rawData = event?.tb_calls_onplan;
        ids = parseIds(rawData);
        break;
      case 'callsOnOthers':
        rawData = event?.tb_calls_onothers;
        ids = parseIds(rawData);
        break;
      case 'profilesOnPlan':
        rawData = event?.tb_calls_profiles;
        ids = parseIds(rawData);
        break;
      case 'profilesOnOthers':
        rawData = event?.tb_calls_profilesothers;
        ids = parseIds(rawData);
        break;
      default:
        ids = [];
    }


    // Check if database has corrupted data (count instead of IDs)
    const hasCorruptedData = rawData && !isNaN(rawData) && parseInt(rawData) < 100 && !rawData.toString().includes(',');

    // Directly open candidate table in new tab if there are candidate IDs
    if (ids.length > 0) {
      openCandidateTableInNewTab(statsType, event, ids);
    } else if (hasCorruptedData) {
      // Show error - database has count instead of IDs
      const statsLabel = statsType.replace(/([A-Z])/g, ' $1').toLowerCase();
      toast.error(
        `Database error: Field contains count (${rawData}) instead of candidate IDs. Please update the database to store comma-separated candidate IDs.`,
        { duration: 5000 }
      );
    } else {
      const statsLabel = statsType.replace(/([A-Z])/g, ' $1').toLowerCase();
      toast(`No candidates found for ${statsLabel}`, { icon: 'ℹ️' });
    }
  };

  // Quick event creation by clicking on time slots
  const handleTimeSlotClick = (date, time) => {
    setFormData({
      plan: '',
      employeeName: '',
      employeeId: '',
      clientName: '',
      clientId: '',
      state: '',
      stateId: '',
      city: '',
      cityId: '',
      position: '',
      source: '',
      sourceId: '',
      branch: '',
      branchId: '',
      date: date,
      time: time,
      remarks: ''
    });
    setEditingEvent(null);
    setShowEventForm(true);
  };

  // Handle clicking on plan count boxes in week view
  const handlePlanClick = (date, branch, plan) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const planEvents = getFilteredEvents().filter(event =>
      event.date === dateStr &&
      event.branch === branch &&
      event.plan === plan
    );

    if (planEvents.length > 0) {
      const planInfo = {
        date: dateStr,
        branch: branch,
        plan: plan,
        dateDisplay: date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric'
        })
      };

      // Store events data in sessionStorage to avoid URL length limits
      const reportData = {
        plan: planInfo.plan,
        branch: planInfo.branch,
        dateDisplay: planInfo.dateDisplay,
        events: planEvents,
        timestamp: Date.now() // Add timestamp for cache busting
      };
      
      try {
        // REMOVED CACHE: Pass parameters directly through URL for fresh data
        const params = new URLSearchParams({
          plan: planInfo.plan,
          branch: planInfo.branch,
          dateDisplay: planInfo.dateDisplay,
          date: planInfo.date || toISODate(new Date())
        });
        
        const url = `/plan-events-report?${params.toString()}`;
        window.open(url, '_blank');
        
      } catch (error) {
        // Fallback: show error message to user
        toast.error('Unable to open report. Please try again.');
      }
    }
  };


  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Debug: Log current month being rendered
    const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const eventsInCurrentMonth = savedEvents.filter(e => e.date && e.date.startsWith(currentMonthStr));

    // Get plan counts for each day and branch - enhanced with better plan detection
    const getDayPlanCounts = (date) => {
      const dayEvents = getEventsForDate(date);
      const counts = {};
      
      // Debug: Log events for specific dates to track the issue
      const dateStr = date.toISOString().split('T')[0];

      // Initialize counts for accessible branches based on user permissions
      let accessibleBranches = [];
      
      if (userProfile?.canSeeAllBranches || isAdmin) {
        // Admin users (CEO, RM, L4, L5) can see all branches
        accessibleBranches = branchOptions.map(b => b.value || b.label || b.name || b.branch_name).filter(Boolean);
      } else {
        // Regular users can only see their own branch
        const userBranchName = userProfile?.branch || userProfile?.branchName || userBranch?.name;
        if (userBranchName) {
          accessibleBranches = [userBranchName];
        } else {
          // Fallback: if no user branch found, show all (for debugging)
          accessibleBranches = branchOptions.map(b => b.value || b.label || b.name || b.branch_name).filter(Boolean);
        }
      }
      
      // Also add any branches that appear in the day's events
      dayEvents.forEach(event => {
        if (event.branch && !accessibleBranches.includes(event.branch)) {
          accessibleBranches.push(event.branch);
        }
      });



      accessibleBranches.forEach(branch => {
        counts[branch] = { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0, total: 0 };
      });
      

      dayEvents.forEach(event => {
        
        if (event.branch) {
          // Initialize branch if not already present (for events from branches not in accessibleBranches)
          if (!counts[event.branch]) {
            counts[event.branch] = { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0, total: 0 };
          }
          
          // Ensure plan is properly set, default to P1 if missing
          const plan = event.plan || event.tb_call_plan || 'P1';
          
          // Validate plan is one of P1-P5
          if (['P1', 'P2', 'P3', 'P4', 'P5'].includes(plan)) {
            counts[event.branch][plan] = (counts[event.branch][plan] || 0) + 1;
            counts[event.branch].total += 1;
          } else {
            // Default to P1 for invalid plans
            counts[event.branch]['P1'] = (counts[event.branch]['P1'] || 0) + 1;
            counts[event.branch].total += 1;
          }
        }
      });

      return counts;
    };

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="border-r border-b border-gray-200 p-3 bg-gray-50 min-h-[120px]"></div>
      );
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const planCounts = getDayPlanCounts(date);
      
      const dateStr = date.toISOString().split('T')[0];
      
      const isToday = date.toDateString() === new Date().toDateString();
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      days.push(
        <div
          key={day}
          className={`border-r border-b border-gray-200 p-3 cursor-pointer transition-all duration-200 flex flex-col min-h-[120px] group ${isToday ? 'bg-blue-50 border-l-4 border-l-blue-600' : 
            isWeekend ? 'bg-gray-50 text-gray-400' : 'hover:bg-blue-50'
            }`}
          onDragOver={handleDragOver}
          onDrop={(e) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            handleDrop(e, dateStr, '09:00');
          }}
          onClick={() => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            handleTimeSlotClick(dateStr, '09:00');
          }}
        >
          {/* Date number at top */}
          <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-600 bg-blue-100 w-7 h-7 rounded-full flex items-center justify-center' :
            isWeekend ? 'text-gray-400' : 'text-gray-900'
            }`}>
            {day}
          </div>
          
          {/* Branch indicators centered - show only branches with events */}
          <div className="flex flex-col items-center justify-center flex-1" key={`${dateStr}-${Object.values(planCounts).reduce((sum, counts) => sum + counts.total, 0)}`}>
            {/* Branch buttons - show based on user permissions and filter out zero counts */}
            {Object.entries(planCounts)
              .filter(([branch, branchCounts]) => branchCounts.total > 0) // Only show branches with events
              .map(([branch, branchCounts]) => {
                const eventCount = branchCounts.total;
                
                
                // Get branch code from branchOptions with better mapping
                const branchOption = branchOptions.find(b => 
                  b.branch_name === branch || b.label === branch || b.value === branch || b.name === branch
                );
                
                // Custom branch code mapping for common branches
                const branchCodeMap = {
                  'COIMBATORE': 'CBE',
                  'CHENNAI': 'CHEN',
                  'MADURAI': 'MDU',
                  'BANGALORE': 'BLR',
                  'HYDERABAD': 'HYD',
                  'Unknown Branch': 'UNK',
                  'null': 'UNK',
                  '': 'UNK'
                };
                
                const branchCode = branchOption?.branch_code || 
                                 branchCodeMap[branch] || 
                                 branch.substring(0, 3).toUpperCase();
                
                

                return (
                  <button
                    key={`${branch}-${eventCount}-${dateStr}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      
                      // Navigate to the new BranchEventsReport component
                      const params = new URLSearchParams();
                      params.set('view', 'month');
                      params.set('branch', branch);
                      // Fix timezone bug - use local date format instead of UTC
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      const dateString = `${year}-${month}-${day}`;
                      
                      
                      params.set('date', dateString);
                      
                      // Open in new tab
                      window.open(`/branch-events-report?${params.toString()}`, '_blank');
                      
                    }}
                    className={(() => {
                      const branchColor = uiUtils.getBranchColorClasses(branch, branchOptions);
                      return `px-1 py-0.5 rounded text-xs font-medium transition-all duration-200 shadow-sm border bg-${branchColor}-100 hover:bg-${branchColor}-200 text-${branchColor}-700 border-${branchColor}-300 opacity-100 text-center`;
                    })()}
                    title={`${branch}: ${eventCount} events (P1:${branchCounts.P1}, P2:${branchCounts.P2}, P3:${branchCounts.P3}, P4:${branchCounts.P4}, P5:${branchCounts.P5})`}
                  >
                    <div className="text-xs font-bold">
                      {(() => {
                        const displayText = `${branchCode}(${eventCount})`;
                        return displayText;
                      })()}
                    </div>
                  </button>
                );
              })}
            </div>
        </div>
      );
    }

    return (
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
        {/* Week Days Header */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          {dayNames.map((dayName, index) => (
            <div key={dayName} className="p-2 text-center text-sm font-semibold text-gray-700 border-r border-gray-200 last:border-r-0">
              <div className="hidden md:block">{dayName}</div>
              <div className="md:hidden">{dayName.slice(0, 3)}</div>
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 flex-1 overflow-y-auto scrollbar-hide">
          {days}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }

    // Get plan counts for each day and branch - dynamic based on user permissions
    const getDayPlanCounts = (date) => {
      const dayEvents = getEventsForDate(date);
      const counts = {};

      // Initialize counts for accessible branches
      const accessibleBranches = (userProfile?.canSeeAllBranches || isAdmin)
        ? branchOptions.map(b => b.value || b.label || b.name)
        : userBranch ? [userBranch.name] : [];

      accessibleBranches.forEach(branch => {
        counts[branch] = { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0, total: 0 };
      });

      dayEvents.forEach(event => {
        if (event.branch && counts[event.branch]) {
          counts[event.branch][event.plan] = (counts[event.branch][event.plan] || 0) + 1;
          counts[event.branch].total += 1;
        }
      });

      return counts;
    };

    return (
      <div className="flex flex-col h-full">

        {/* Week Calendar Grid */}
        <div className="flex-1 overflow-auto bg-white">
          {/* Desktop View - 7 columns */}
          <div className="hidden lg:grid lg:grid-cols-7 min-h-full">
            {weekDays.map((day, dayIndex) => {
              const isToday = day.toDateString() === new Date().toDateString();
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const planCounts = getDayPlanCounts(day);

              return (
                <div key={dayIndex} className="border-r border-gray-200 last:border-r-0 min-h-full">
                  {/* Day Header */}
                  <div className={`p-2 lg:p-3 border-b border-gray-200 flex flex-col lg:flex-row lg:justify-between lg:items-center ${isToday ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200' :
                    isWeekend ? 'bg-gray-50' : 'bg-white'
                    }`}>
                    <div className="flex items-center space-x-2">
                      <div className="text-xs lg:text-sm text-gray-600 font-medium">
                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className={`text-base lg:text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-800'
                        }`}>
                        {day.getDate()}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 lg:mt-0">
                      Total: {Object.values(planCounts).reduce((sum, branch) => sum + branch.total, 0)}
                    </div>
                  </div>

                  {/* Dynamic Branch Sections */}
                  <div className="grid grid-cols-1 gap-1 mt-1" key={`${day.toISOString().split('T')[0]}-${Object.values(planCounts).reduce((sum, counts) => sum + counts.total, 0)}`}>
                    {Object.entries(planCounts).map(([branchName, branchCounts]) => {
                      const branchColor = uiUtils.getBranchColorClasses(branchName, branchOptions);
                      
                      // Get branch code from branchOptions
                      const branchOption = branchOptions.find(b => 
                        b.branch_name === branchName || b.label === branchName || b.value === branchName
                      );
                      const branchCode = branchOption?.branch_code || branchName.substring(0, 3).toUpperCase();

                      // Get explicit color classes to ensure Tailwind includes them
                      const getBranchColorStyles = (color) => {
                        const colorMap = {
                          'orange': {
                            bg: 'bg-orange-50',
                            border: 'border-orange-200',
                            iconBg: 'bg-orange-600',
                            text: 'text-orange-800'
                          },
                          'blue': {
                            bg: 'bg-blue-50',
                            border: 'border-blue-200',
                            iconBg: 'bg-blue-600',
                            text: 'text-blue-800'
                          },
                          'green': {
                            bg: 'bg-green-50',
                            border: 'border-green-200',
                            iconBg: 'bg-green-600',
                            text: 'text-green-800'
                          },
                          'purple': {
                            bg: 'bg-purple-50',
                            border: 'border-purple-200',
                            iconBg: 'bg-purple-600',
                            text: 'text-purple-800'
                          },
                          'red': {
                            bg: 'bg-red-50',
                            border: 'border-red-200',
                            iconBg: 'bg-red-600',
                            text: 'text-red-800'
                          },
                          'yellow': {
                            bg: 'bg-yellow-50',
                            border: 'border-yellow-200',
                            iconBg: 'bg-yellow-600',
                            text: 'text-yellow-800'
                          },
                          'indigo': {
                            bg: 'bg-indigo-50',
                            border: 'border-indigo-200',
                            iconBg: 'bg-indigo-600',
                            text: 'text-indigo-800'
                          },
                          'pink': {
                            bg: 'bg-pink-50',
                            border: 'border-pink-200',
                            iconBg: 'bg-pink-600',
                            text: 'text-pink-800'
                          },
                          'gray': {
                            bg: 'bg-gray-50',
                            border: 'border-gray-200',
                            iconBg: 'bg-gray-600',
                            text: 'text-gray-800'
                          }
                        };
                        return colorMap[color] || colorMap['gray'];
                      };

                      const colorStyles = getBranchColorStyles(branchColor);

                      return (
                        <div key={branchName} className={`${colorStyles.bg} rounded-lg p-3 border ${colorStyles.border}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className={`w-6 h-6 ${colorStyles.iconBg} rounded-lg flex items-center justify-center`}>
                                <Building className="w-3 h-3 text-white" />
                              </div>
                              <span className={`text-xs font-bold ${colorStyles.text}`}>{branchCode}</span>
                            </div>

                          </div>

                          {/* Plan counts for this branch */}
                          <div className="grid grid-cols-5 gap-1 p-1">
                            {['P1', 'P2', 'P3', 'P4', 'P5'].map(plan => (
                              <button
                                key={plan}
                                onClick={() => handlePlanClick(day, branchName, plan)}
                                disabled={branchCounts[plan] === 0}
                                className={`text-center p-1 rounded text-xs font-medium transition-all duration-200 ${uiUtils.getPlanColorClasses(plan)} ${branchCounts[plan] === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}`}
                                title={branchCounts[plan] > 0 ? `Click to view ${branchCounts[plan]} ${plan} events` : `No ${plan} events`}
                              >
                                <div>{plan}</div>
                                <div className="font-bold">{branchCounts[plan]}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Quick Actions - Only show for current date */}
                    {isToday && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            const year = day.getFullYear();
                            const month = String(day.getMonth() + 1).padStart(2, '0');
                            const dayNum = String(day.getDate()).padStart(2, '0');
                            const dateStr = `${year}-${month}-${dayNum}`;
                            handleTimeSlotClick(dateStr, '09:00');
                          }}
                          className="flex-1 p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-medium transition-all duration-200"
                          title="Add Plan for Today"
                        >
                          <Plus className="w-3 h-3 mx-auto" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tablet View - 3-4 columns */}
          <div className="hidden md:grid lg:hidden md:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
            {weekDays.map((day, dayIndex) => {
              const isToday = day.toDateString() === new Date().toDateString();
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const planCounts = getDayPlanCounts(day);

              return (
                <div key={dayIndex} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  {/* Day Header */}
                  <div className={`p-3 border-b border-gray-200 rounded-t-lg ${isToday ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200' :
                    isWeekend ? 'bg-gray-50' : 'bg-white'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="text-sm text-gray-600 font-medium">
                          {day.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>
                          {day.getDate()}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Total: {Object.values(planCounts).reduce((sum, branch) => sum + branch.total, 0)}
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Branch Sections */}
                  <div className="p-3 space-y-3">
                    {Object.entries(planCounts).map(([branchName, branchCounts]) => {
                      const branchColor = uiUtils.getBranchColorClasses(branchName, branchOptions);
                      const branchOption = branchOptions.find(b => 
                        b.branch_name === branchName || b.label === branchName || b.value === branchName
                      );
                      const branchCode = branchOption?.branch_code || branchName.substring(0, 3).toUpperCase();

                      // Get explicit color classes to ensure Tailwind includes them
                      const getBranchColorStyles = (color) => {
                        const colorMap = {
                          'orange': {
                            bg: 'bg-orange-50',
                            border: 'border-orange-200',
                            iconBg: 'bg-orange-600',
                            text: 'text-orange-800'
                          },
                          'blue': {
                            bg: 'bg-blue-50',
                            border: 'border-blue-200',
                            iconBg: 'bg-blue-600',
                            text: 'text-blue-800'
                          },
                          'green': {
                            bg: 'bg-green-50',
                            border: 'border-green-200',
                            iconBg: 'bg-green-600',
                            text: 'text-green-800'
                          },
                          'purple': {
                            bg: 'bg-purple-50',
                            border: 'border-purple-200',
                            iconBg: 'bg-purple-600',
                            text: 'text-purple-800'
                          },
                          'red': {
                            bg: 'bg-red-50',
                            border: 'border-red-200',
                            iconBg: 'bg-red-600',
                            text: 'text-red-800'
                          },
                          'yellow': {
                            bg: 'bg-yellow-50',
                            border: 'border-yellow-200',
                            iconBg: 'bg-yellow-600',
                            text: 'text-yellow-800'
                          },
                          'indigo': {
                            bg: 'bg-indigo-50',
                            border: 'border-indigo-200',
                            iconBg: 'bg-indigo-600',
                            text: 'text-indigo-800'
                          },
                          'pink': {
                            bg: 'bg-pink-50',
                            border: 'border-pink-200',
                            iconBg: 'bg-pink-600',
                            text: 'text-pink-800'
                          },
                          'gray': {
                            bg: 'bg-gray-50',
                            border: 'border-gray-200',
                            iconBg: 'bg-gray-600',
                            text: 'text-gray-800'
                          }
                        };
                        return colorMap[color] || colorMap['gray'];
                      };

                      const colorStyles = getBranchColorStyles(branchColor);

                      return (
                        <div key={branchName} className={`${colorStyles.bg} rounded-lg p-2 border ${colorStyles.border}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className={`w-5 h-5 ${colorStyles.iconBg} rounded flex items-center justify-center`}>
                                <Building className="w-3 h-3 text-white" />
                              </div>
                              <span className={`text-xs font-bold ${colorStyles.text}`}>{branchCode}</span>
                            </div>
                          </div>

                          {/* Plan counts for this branch */}
                          <div className="grid grid-cols-5 gap-1">
                            {['P1', 'P2', 'P3', 'P4', 'P5'].map(plan => (
                              <button
                                key={plan}
                                onClick={() => handlePlanClick(day, branchName, plan)}
                                disabled={branchCounts[plan] === 0}
                                className={`text-center p-1 rounded text-xs font-medium transition-all duration-200 ${uiUtils.getPlanColorClasses(plan)} ${branchCounts[plan] === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}`}
                                title={branchCounts[plan] > 0 ? `Click to view ${branchCounts[plan]} ${plan} events` : `No ${plan} events`}
                              >
                                <div>{plan}</div>
                                <div className="font-bold">{branchCounts[plan]}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Quick Actions - Only show for current date */}
                    {isToday && (
                      <button
                        onClick={() => {
                          const year = day.getFullYear();
                          const month = String(day.getMonth() + 1).padStart(2, '0');
                          const dayNum = String(day.getDate()).padStart(2, '0');
                          const dateStr = `${year}-${month}-${dayNum}`;
                          handleTimeSlotClick(dateStr, '09:00');
                        }}
                        className="w-full p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-medium transition-all duration-200 flex items-center justify-center space-x-1"
                        title="Add Plan for Today"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Event</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile View - Single column, scrollable */}
          <div className="md:hidden space-y-4 p-4">
            {weekDays.map((day, dayIndex) => {
              const isToday = day.toDateString() === new Date().toDateString();
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const planCounts = getDayPlanCounts(day);

              return (
                <div key={dayIndex} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  {/* Day Header */}
                  <div className={`p-4 border-b border-gray-200 rounded-t-lg ${isToday ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200' :
                    isWeekend ? 'bg-gray-50' : 'bg-white'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-base text-gray-600 font-medium">
                          {day.toLocaleDateString('en-US', { weekday: 'long' })}
                        </div>
                        <div className={`text-xl font-bold ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>
                          {day.getDate()}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Total: {Object.values(planCounts).reduce((sum, branch) => sum + branch.total, 0)}
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Branch Sections */}
                  <div className="p-4 space-y-4">
                    {Object.entries(planCounts).map(([branchName, branchCounts]) => {
                      const branchColor = uiUtils.getBranchColorClasses(branchName, branchOptions);
                      const branchOption = branchOptions.find(b => 
                        b.branch_name === branchName || b.label === branchName || b.value === branchName
                      );
                      const branchCode = branchOption?.branch_code || branchName.substring(0, 3).toUpperCase();

                      // Get explicit color classes to ensure Tailwind includes them
                      const getBranchColorStyles = (color) => {
                        const colorMap = {
                          'orange': {
                            bg: 'bg-orange-50',
                            border: 'border-orange-200',
                            iconBg: 'bg-orange-600',
                            text: 'text-orange-800'
                          },
                          'blue': {
                            bg: 'bg-blue-50',
                            border: 'border-blue-200',
                            iconBg: 'bg-blue-600',
                            text: 'text-blue-800'
                          },
                          'green': {
                            bg: 'bg-green-50',
                            border: 'border-green-200',
                            iconBg: 'bg-green-600',
                            text: 'text-green-800'
                          },
                          'purple': {
                            bg: 'bg-purple-50',
                            border: 'border-purple-200',
                            iconBg: 'bg-purple-600',
                            text: 'text-purple-800'
                          },
                          'red': {
                            bg: 'bg-red-50',
                            border: 'border-red-200',
                            iconBg: 'bg-red-600',
                            text: 'text-red-800'
                          },
                          'yellow': {
                            bg: 'bg-yellow-50',
                            border: 'border-yellow-200',
                            iconBg: 'bg-yellow-600',
                            text: 'text-yellow-800'
                          },
                          'indigo': {
                            bg: 'bg-indigo-50',
                            border: 'border-indigo-200',
                            iconBg: 'bg-indigo-600',
                            text: 'text-indigo-800'
                          },
                          'pink': {
                            bg: 'bg-pink-50',
                            border: 'border-pink-200',
                            iconBg: 'bg-pink-600',
                            text: 'text-pink-800'
                          },
                          'gray': {
                            bg: 'bg-gray-50',
                            border: 'border-gray-200',
                            iconBg: 'bg-gray-600',
                            text: 'text-gray-800'
                          }
                        };
                        return colorMap[color] || colorMap['gray'];
                      };

                      const colorStyles = getBranchColorStyles(branchColor);

                      return (
                        <div key={branchName} className={`${colorStyles.bg} rounded-lg p-3 border ${colorStyles.border}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className={`w-6 h-6 ${colorStyles.iconBg} rounded-lg flex items-center justify-center`}>
                                <Building className="w-4 h-4 text-white" />
                              </div>
                              <span className={`text-sm font-bold ${colorStyles.text}`}>{branchName}</span>
                            </div>
                          </div>

                          {/* Plan counts for this branch */}
                          <div className="grid grid-cols-5 gap-2">
                            {['P1', 'P2', 'P3', 'P4', 'P5'].map(plan => (
                              <button
                                key={plan}
                                onClick={() => handlePlanClick(day, branchName, plan)}
                                disabled={branchCounts[plan] === 0}
                                className={`text-center p-2 rounded text-sm font-medium transition-all duration-200 ${uiUtils.getPlanColorClasses(plan)} ${branchCounts[plan] === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}`}
                                title={branchCounts[plan] > 0 ? `Click to view ${branchCounts[plan]} ${plan} events` : `No ${plan} events`}
                              >
                                <div>{plan}</div>
                                <div className="font-bold text-lg">{branchCounts[plan]}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Quick Actions - Only show for current date */}
                    {isToday && (
                      <button
                        onClick={() => {
                          const year = day.getFullYear();
                          const month = String(day.getMonth() + 1).padStart(2, '0');
                          const dayNum = String(day.getDate()).padStart(2, '0');
                          const dateStr = `${year}-${month}-${dayNum}`;
                          handleTimeSlotClick(dateStr, '09:00');
                        }}
                        className="w-full p-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                        title="Add Plan for Today"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add New Event</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate);

    // Get plan counts for the current day - dynamic based on user permissions
    const getDayPlanCounts = () => {
      const counts = {};

      // Initialize counts for accessible branches
      const accessibleBranches = (userProfile?.canSeeAllBranches || isAdmin)
        ? branchOptions.map(b => b.value || b.label || b.name)
        : userBranch ? [userBranch.name] : [];

      accessibleBranches.forEach(branch => {
        counts[branch] = { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0, total: 0 };
      });

      dayEvents.forEach(event => {
        if (event.branch && counts[event.branch]) {
          counts[event.branch][event.plan] = (counts[event.branch][event.plan] || 0) + 1;
          counts[event.branch].total += 1;
        }
      });

      return counts;
    };

    const planCounts = getDayPlanCounts();
    const isToday = currentDate.toDateString() === new Date().toDateString();

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-full">
        {/* Day Header */}
        <div className={`p-2 lg:p-4 border-b border-gray-200 flex justify-between items-center ${isToday ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200' : 'bg-gray-50'
          }`}>
          <div className="flex items-center space-x-2">
            <div className="text-xs lg:text-sm text-gray-600 font-medium">
              {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
            </div>
            <div className={`text-xl lg:text-md font-bold ${isToday ? 'text-blue-600' : 'text-gray-800'
              }`}>
              {currentDate.getDate()}
            </div>
            <div className="text-xs lg:text-sm text-gray-600">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Total Events: {Object.values(planCounts).reduce((sum, branch) => sum + branch.total, 0)}
          </div>
        </div>

        {/* Dynamic Branch Plan Counts */}
        <div className="p-2  space-y-2 lg:space-y-4 overflow-y-auto">
          {Object.entries(planCounts).map(([branchName, branchCounts]) => {
            const branchColor = uiUtils.getBranchColorClasses(branchName, branchOptions);
            
            // Get branch code from branchOptions
            const branchOption = branchOptions.find(b => 
              b.branch_name === branchName || b.label === branchName || b.value === branchName
            );
            const branchCode = branchOption?.branch_code || branchName.substring(0, 3).toUpperCase();

            return (
              <div key={branchName} className={`bg-${branchColor}-50 rounded-lg p-2  border border-${branchColor}-200`}>
                <div className="flex items-center justify-between mb-2 ">
                  <div className="flex items-center space-x-2 ">
                    <div className={`w-6 h-6 bg-${branchColor}-600 rounded-lg flex items-center justify-center`}>
                      <Building className="w-3 h-3 text-white" />
                    </div>
                    <span className={`text-sm lg:text-md font-bold text-${branchColor}-800`}>{branchCode}</span>
                  </div>
                  <span className={`text-xs lg:text-sm font-medium text-${branchColor}-600 bg-white px-2 lg:px-3 py-1 rounded-lg`}>
                    {branchCounts.total} Events
                  </span>
                </div>

                {/* Plan counts for this branch */}
                <div className="grid grid-cols-5 gap-1 lg:gap-2">
                  {['P1', 'P2', 'P3', 'P4', 'P5'].map(plan => (
                    <button
                      key={plan}
                      onClick={() => handlePlanClick(currentDate, branchName, plan)}
                      className={`flex items-center justify-between p-2 lg:p-3 rounded-lg text-xs lg:text-sm font-medium cursor-pointer transition-all duration-200 hover:shadow-md transform hover:scale-105 ${uiUtils.getPlanColorClasses(plan)} ${branchCounts[plan] === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={branchCounts[plan] === 0}
                      title={`Click to view ${plan} events for ${branchName} branch`}
                    >
                      <div className="text-xs font-bold">{plan}</div>
                      <div className="text-md font-medium">{branchCounts[plan]}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

        </div>
      </div>
    );
  };

  // Get filtered events for branch details
  const getBranchFilteredEvents = () => {
    let events = savedEvents;

    // Filter by date range
    if (branchFilters.dateRange === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      events = events.filter(event => event.date === todayStr);
    } else if (branchFilters.dateRange === 'week') {
      const today = new Date();
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
      events = events.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= startOfWeek && eventDate <= endOfWeek;
      });
    } else if (branchFilters.dateRange === 'month') {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      events = events.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= startOfMonth && eventDate <= endOfMonth;
      });
    }

    // Filter by custom date range (From Date and To Date)
    if (branchFilters.fromDate || branchFilters.toDate) {
      events = events.filter(event => {
        const eventDate = new Date(event.date);
        let isInRange = true;
        
        if (branchFilters.fromDate) {
          const fromDate = new Date(branchFilters.fromDate);
          isInRange = isInRange && eventDate >= fromDate;
        }
        
        if (branchFilters.toDate) {
          const toDate = new Date(branchFilters.toDate);
          isInRange = isInRange && eventDate <= toDate;
        }
        
        return isInRange;
      });
    }

    // Filter by selected branch (if any)
    if (selectedBranchFilter) {
      events = events.filter(event => event.branch === selectedBranchFilter);
    } else {
      // Show all branches when "All Branches" is selected
      // No branch filtering applied - show events from all branches
    }

    // Filter by dropdown selections
    if (branchFilters.selectedPlan) {
      events = events.filter(event => event.plan === branchFilters.selectedPlan);
    }

    if (branchFilters.selectedBranch) {
      events = events.filter(event => event.branch === branchFilters.selectedBranch);
    }

    if (branchFilters.selectedTeam) {
      events = events.filter(event => event.branch === branchFilters.selectedTeam);
    }

    if (branchFilters.selectedEmployee) {
      events = events.filter(event => (event.employeeName || event.employee_name || '') === branchFilters.selectedEmployee);
    }

    if (branchFilters.selectedClient) {
      events = events.filter(event => (event.clientName || event.client_name || '') === branchFilters.selectedClient);
    }

    if (branchFilters.selectedState) {
      events = events.filter(event => (event.state || event.state_name || '') === branchFilters.selectedState);
    }

    if (branchFilters.selectedCity) {
      events = events.filter(event => (event.city || event.city_name || '') === branchFilters.selectedCity);
    }

    // Filter by plans (existing functionality)
    events = events.filter(event => branchFilters.plans.includes(event.plan || ''));

    // Filter by employees (existing functionality)
    if (branchFilters.employees.length > 0) {
      events = events.filter(event => branchFilters.employees.includes(event.employeeName || event.employee_name || ''));
    }

    // Filter by clients (existing functionality)
    if (branchFilters.clients.length > 0) {
      events = events.filter(event => branchFilters.clients.includes(event.clientName || event.client_name || ''));
    }

    return events;
  };

  // Plan Scheduler Filter Panel (based on PHP calender_plan.php)
  const renderPlanSchedulerPanel = () => {
    if (!showPlanScheduler) return null;

    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Calendar Plan Scheduler</h2>
                  <p className="text-sm text-gray-600">Filter and view recruitment plans</p>
                </div>
              </div>
              <button
                onClick={() => setShowPlanScheduler(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Plan Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plan</label>
                <select
                  value={planFilters.planId}
                  onChange={(e) => handlePlanFilterChange('planId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Plans</option>
                  {planFilterOptions.plans.map(plan => (
                    <option key={plan.id} value={plan.id}>{plan.name}</option>
                  ))}
                </select>
              </div>

              {/* Vendor Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vendor/Client</label>
                <select
                  value={planFilters.vendorId}
                  onChange={(e) => handlePlanFilterChange('vendorId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Vendors</option>
                  {planFilterOptions.vendors.map(vendor => (
                    <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                  ))}
                </select>
              </div>

              {/* Employee Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
                <select
                  value={planFilters.employeeId}
                  onChange={(e) => handlePlanFilterChange('employeeId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Employees</option>
                  {planFilterOptions.employees.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} ({employee.designation})
                    </option>
                  ))}
                </select>
              </div>

              {/* Team Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Team</label>
                <select
                  value={planFilters.teamId}
                  onChange={(e) => handlePlanFilterChange('teamId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Teams</option>
                  {planFilterOptions.teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={clearPlanFilters}
                  className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Clear Filters
                </button>
                <div className="text-sm text-gray-600">
                  {planLoading ? 'Loading...' : `${filteredPlans.length} plans found`}
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedPlanView('calendar')}
                  className={`px-3 py-2 rounded-lg transition-colors ${selectedPlanView === 'calendar'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  Calendar
                </button>
                <button
                  onClick={() => setSelectedPlanView('table')}
                  className={`px-3 py-2 rounded-lg transition-colors ${selectedPlanView === 'table'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  Table
                </button>
                <button
                  onClick={() => setSelectedPlanView('timeline')}
                  className={`px-3 py-2 rounded-lg transition-colors ${selectedPlanView === 'timeline'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  Timeline
                </button>
              </div>
            </div>
          </div>

          {/* Plans Display */}
          <div className="flex-1 overflow-y-auto p-6">
            {planLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading plans...</p>
                </div>
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Plans Found</h3>
                <p className="text-gray-600">Try adjusting your filters to see more results.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedPlanView === 'table' && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">Plan</th>
                          <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">Employee</th>
                          <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">Vendor</th>
                          <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">Start Date</th>
                          <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">End Date</th>
                          <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPlans.map((plan, index) => (
                          <tr key={plan.id || index} className="hover:bg-gray-50">
                            <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                              {plan.tb_call_plan_data || plan.plan_name || 'N/A'}
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                              {plan.employee_name || 'N/A'}
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                              {plan.vendor_name || 'N/A'}
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                              {plan.tb_call_startdate ? new Date(plan.tb_call_startdate).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-sm text-gray-900">
                              {plan.tb_call_todate ? new Date(plan.tb_call_todate).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="border border-gray-200 px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${plan.tb_call_status === 1
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                                }`}>
                                {plan.tb_call_status === 1 ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {selectedPlanView === 'calendar' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPlans.map((plan, index) => (
                      <div key={plan.id || index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <h4 className="font-medium text-gray-900">
                              {plan.tb_call_plan_data || plan.plan_name || 'Plan'}
                            </h4>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${plan.tb_call_status === 1
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                            }`}>
                            {plan.tb_call_status === 1 ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4" />
                            <span>{plan.employee_name || 'N/A'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Building className="w-4 h-4" />
                            <span>{plan.vendor_name || 'N/A'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {plan.tb_call_startdate ? new Date(plan.tb_call_startdate).toLocaleDateString() : 'N/A'}
                              {plan.tb_call_todate && ` - ${new Date(plan.tb_call_todate).toLocaleDateString()}`}
                            </span>
                          </div>
                          {plan.tb_call_info && (
                            <div className="flex items-start space-x-2">
                              <FileText className="w-4 h-4 mt-0.5" />
                              <span className="text-xs">{plan.tb_call_info}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedPlanView === 'timeline' && (
                  <div className="space-y-4">
                    {filteredPlans.map((plan, index) => (
                      <div key={plan.id || index} className="flex items-start space-x-4 p-4 bg-white border border-gray-200 rounded-lg">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">
                              {plan.tb_call_plan_data || plan.plan_name || 'Plan'}
                            </h4>
                            <span className="text-sm text-gray-500">
                              {plan.tb_call_startdate ? new Date(plan.tb_call_startdate).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">{plan.employee_name || 'N/A'}</span> •
                            <span>{plan.vendor_name || 'N/A'}</span>
                          </div>
                          {plan.tb_call_info && (
                            <p className="text-sm text-gray-600">{plan.tb_call_info}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {filteredPlans.length} plans
              </div>
              <button
                onClick={() => setShowPlanScheduler(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Branch Details Center Modal Component
  const renderBranchDetailsPanel = () => {
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Toast Notifications */}
      <Toaster position="top-center" />
      
      <div className="flex flex-col lg:flex-row h-screen">
        {/* Left Sidebar - Hidden on mobile, collapsible on tablet */}
        <div className="hidden lg:flex lg:flex-col w-64 bg-white/80 backdrop-blur-md border-r border-white/20 shadow-lg flex-shrink-0">
          {/* Header */}
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                <Calendar className="w-3 h-3 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Event Calendar
                </h1>
                <p className="text-xs text-gray-600">Schedule and manage plans</p>
              </div>
            </div>
            <button
              onClick={() => setShowEventForm(!showEventForm)}
              className="w-full mt-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center space-x-1 shadow-lg"
            >
              <Plus className="w-3 h-3" />
              <span className="text-xs font-medium">Schedule Event</span>
            </button>
          </div>

          {/* Search Section */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-6 pr-6 py-1.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Overview Stats */}
          <div className="p-2 border-b border-gray-100">
            <div className="w-full flex items-center justify-between text-xs font-semibold text-gray-700 mb-1">
              <span>Overview</span>
            </div>
            <div className="space-y-1">
              <div className="w-full bg-gradient-to-r from-blue-50 to-blue-100 p-2 rounded-md border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
                      <Clock className="w-2 h-2 text-white" />
                    </div>
                    <span className="text-xs font-medium text-gray-700">Today</span>
                  </div>
                  <span className="text-sm font-bold text-blue-600">{getTodayEventsFiltered().length}</span>
                </div>
              </div>
              <div className="w-full bg-gradient-to-r from-green-50 to-green-100 p-2 rounded-md border border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 bg-green-600 rounded flex items-center justify-center">
                      <Calendar className="w-2 h-2 text-white" />
                    </div>
                    <span className="text-xs font-medium text-gray-700">Week</span>
                  </div>
                  <span className="text-sm font-bold text-green-600">{getThisWeekEventsFiltered().length}</span>
                </div>
              </div>
              <div className="w-full bg-gradient-to-r from-purple-50 to-purple-100 p-2 rounded-md border border-purple-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 bg-purple-600 rounded flex items-center justify-center">
                      <Calendar className="w-2 h-2 text-white" />
                    </div>
                    <span className="text-xs font-medium text-gray-700">Month</span>
                  </div>
                  <span className="text-sm font-bold text-purple-600">{getThisMonthEventsFiltered().length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Campaign Filters
          <div className="p-2">
            <button
              onClick={() => {
                setShowPlans(!showPlans);
                if (!showPlans) setShowOverview(false); // Close other section
              }}
              className="w-full flex items-center justify-between text-xs font-semibold text-gray-700 mb-1 hover:text-gray-900 transition-colors md:pointer-events-none"
            >
              <span>Plans</span>
              <ChevronRight className={`w-3 h-3 transition-transform duration-200 md:hidden ${showPlans ? 'rotate-90' : ''}`} />
            </button>
            <div className={`space-y-0.5 transition-all duration-150 overflow-hidden ${showPlans ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 lg:max-h-96 lg:opacity-100'}`}>
              {categories.map(category => {
                const isActive = activeFilters.plans.includes(category.id);
                const eventCount = savedEvents.filter(e => e.plan === category.id).length;

                return (
                  <button
                    key={category.id}
                    onClick={() => toggleFilter('plans', category.id)}
                    className={`w-full flex items-center justify-between p-1.5 rounded-md transition-all duration-200 ${isActive
                      ? `${category.lightColor} ${category.textColor} border ${category.borderColor}`
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                  >
                    <div className="flex items-center space-x-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${category.color}`}></div>
                      <span className="text-xs font-medium">{category.name}</span>
                    </div>
                    <span className={`text-xs px-1 py-0.5 rounded font-medium ${isActive ? 'bg-white/80 text-gray-700' : 'bg-gray-200 text-gray-600'
                      }`}>
                      {eventCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div> */}

          {/* Client Filters */}
          <div className="p-2 flex-shrink-0">
            <div className="w-full flex items-center justify-between text-xs font-semibold text-gray-700 mb-1">
              <span>Clients</span>
				<button 
                onClick={(e) => {
                  e.preventDefault();
                  window.open('/clientwise-report', '_blank');
                }}
                className="text-blue-500 hover:text-blue-700 transition-colors"
                title="View Client-wise Report"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-0.5 max-h-96 overflow-y-auto overflow-x-visible">
              {(() => {
                // Get unique clients from saved events with their counts
                const clientCounts = savedEvents.reduce((acc, event) => {
                  if (event.clientName) {
                    acc[event.clientName] = (acc[event.clientName] || 0) + 1;
                  }
                  return acc;
                }, {});

                // Sort clients by name
                const sortedClients = Object.entries(clientCounts).sort(([a], [b]) => a.localeCompare(b));

                return sortedClients.map(([clientName, eventCount]) => {
                  const handleClientClick = () => {
                    const url = `/clientwise-report?client=${encodeURIComponent(clientName)}`;
                    window.open(url, '_blank');
                  };
                  
                  return (
                    <div 
                      key={clientName}
                      onClick={handleClientClick}
                      className="w-full flex items-center justify-between p-1.5 rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center space-x-1 min-w-0 flex-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0"></div>
                        <span className="text-xs font-medium truncate" title={clientName}>
                          {clientName.length > 20 ? `${clientName.substring(0, 20)}...` : clientName}
                        </span>
                      </div>
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-gray-200 text-gray-600 flex-shrink-0">
                        {eventCount}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* Calendar Area */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-screen">
          {/* Mobile Header */}
          <div className="lg:hidden bg-white/90 backdrop-blur-sm border-b border-gray-200 p-2 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Calendar className="w-3 h-3 text-white" />
                </div>
                <h1 className="text-sm font-bold text-gray-900">Events</h1>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setShowEventForm(true)}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mobile Navigation and View Selector */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <button
                onClick={() => navigateCalendar(-1)}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200"
                title={`Previous ${calendarView}`}
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>

              <div className="flex-1 text-center">
                <h2 className="text-sm font-bold text-gray-900">
                  {calendarView === 'month' && currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  {calendarView === 'week' && (() => {
                    const startOfWeek = new Date(currentDate);
                    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
                    const endOfWeek = new Date(startOfWeek);
                    endOfWeek.setDate(startOfWeek.getDate() + 6);
                    return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                  })()}
                  {calendarView === 'day' && currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </h2>
              </div>

              <button
                onClick={() => navigateCalendar(1)}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200"
                title={`Next ${calendarView}`}
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Mobile View Selector */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {['month', 'week', 'day'].map((view) => (
                <button
                  key={view}
                  onClick={() => handleViewChange(view)}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all duration-200 ${calendarView === view
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Calendar Header */}
          <div className="hidden lg:block bg-white/90 backdrop-blur-sm border-b border-gray-200 p-2 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center justify-between sm:justify-start md:justify-start w-full md:w-auto space-x-2">
                <button
                  onClick={() => navigateCalendar(-1)}
                  className="p-1.5 sm:p-1 bg-gray-100 hover:bg-gray-200 rounded transition-all duration-200"
                  title={`Previous ${calendarView}`}
                >
                  <ChevronLeft className="w-4 h-4 sm:w-3 sm:h-3 text-gray-600" />
                </button>
                <h2 className="text-sm sm:text-xs font-bold text-gray-900 min-w-[120px] text-center">
                  {calendarView === 'month' && currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  {calendarView === 'week' && (() => {
                    const startOfWeek = new Date(currentDate);
                    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
                    const endOfWeek = new Date(startOfWeek);
                    endOfWeek.setDate(startOfWeek.getDate() + 6);
                    return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                  })()}
                  {calendarView === 'day' && currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </h2>
                <button
                  onClick={() => navigateCalendar(1)}
                  className="p-1.5 sm:p-1 bg-gray-100 hover:bg-gray-200 rounded transition-all duration-200"
                  title={`Next ${calendarView}`}
                >
                  <ChevronRight className="w-4 h-4 sm:w-3 sm:h-3 text-gray-600" />
                </button>
              </div>
              <div className="flex bg-gray-100 rounded p-0.5 w-full sm:w-auto">
                <button
                  onClick={() => handleViewChange('month')}
                  className={`flex-1 sm:flex-none px-2 sm:px-1.5 py-1 sm:py-0.5 text-xs font-medium rounded transition-all duration-200 ${calendarView === 'month'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Month
                </button>
                <button
                  onClick={() => handleViewChange('week')}
                  className={`flex-1 sm:flex-none px-2 sm:px-1.5 py-1 sm:py-0.5 text-xs font-medium rounded transition-all duration-200 ${calendarView === 'week'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Week
                </button>
                <button
                  onClick={() => handleViewChange('day')}
                  className={`flex-1 sm:flex-none px-2 sm:px-1.5 py-1 sm:py-0.5 text-xs font-medium rounded transition-all duration-200 ${calendarView === 'day'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Day
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full flex flex-col">
              {loading ? (
                null
              ) : (
                <>
                  {calendarView === 'month' && renderMonthView()}
                  {calendarView === 'week' && renderWeekView()}
                  {calendarView === 'day' && renderDayView()}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      


      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-200">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Delete Event</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-gray-700 mb-6">
                Are you sure you want to delete this event?
              </p>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowConfirmDelete(null)}
                  className={uiUtils.getButtonClasses('secondary')}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteEvent(showConfirmDelete)}
                  className={`${uiUtils.getButtonClasses('danger')} flex items-center space-x-2`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Form Modal */}
      <EventFormModal
        isOpen={showEventForm}
        onClose={() => setShowEventForm(false)}
        editingEvent={editingEvent}
        onSubmit={handleSave}
        dropdownOptions={dropdownOptions}
        isSubmitting={isSubmitting}
      />

      {/* Plan Scheduler Panel */}
      {renderPlanSchedulerPanel()}

      {/* Branch Details Panel */}
      {renderBranchDetailsPanel()}

      {/* Candidate Stats Modal */}
      <CandidateStatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        statsType={selectedStatsType}
        eventData={selectedEventData}
        candidateIds={candidateIds}
        title={`${selectedStatsType.replace(/([A-Z])/g, ' $1').toLowerCase()} - Candidates`}
      />

      {/* Diagnostic Modal */}
      {showDiagnostic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Candidate Data Diagnostic</h3>
              <button
                onClick={() => setShowDiagnostic(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="text-center py-8">
                <p className="text-gray-500">Diagnostic component removed</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;