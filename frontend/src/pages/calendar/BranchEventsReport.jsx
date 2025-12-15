import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar, X, Eye, ArrowLeft, Edit3, Plus, Building, Filter, ChevronUp, ChevronDown, MapPin, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import EventFormModal from './components/EventFormModal';
import { calendarAPI, mapDropdownData, getCallStatCount, getAuthHeaders } from './utils/calendarUtils';

const BranchEventsReport = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get URL parameters and determine view type from URL path
  const currentPath = window.location.pathname;
  let viewType = searchParams.get('view') || 'month';
  
  // Since we removed the specific paths, just use query parameter
  
  const branchId = searchParams.get('branch');
  const planId = searchParams.get('plan');
  const dateParam = searchParams.get('date'); // Get date parameter from URL
  
  // State management
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [branchFilters, setBranchFilters] = useState({
    fromDate: dateParam || '', // Set from date if date parameter provided
    toDate: dateParam || '',   // Set to date if date parameter provided
    selectedPlan: planId || '',
    selectedTeam: '',
    selectedEmployee: '',
    selectedClient: '',
    selectedCity: ''
  });
  
  // Applied filters state
  const [appliedFilters, setAppliedFilters] = useState({
    fromDate: dateParam || '',
    toDate: dateParam || '',
    selectedPlan: planId || '',
    selectedTeam: '',
    selectedEmployee: '',
    selectedClient: '',
    selectedCity: ''
  });
  const [dropdownOptions, setDropdownOptions] = useState({
    plans: ['P1', 'P2', 'P3', 'P4', 'P5'],
    employees: [],
    clients: [],
    states: [],
    cities: [],
    positions: [],
    sources: [],
    branches: [],
    user_level: null,
    filtering_applied: false
  });
  const [branchEventsCurrentPage, setBranchEventsCurrentPage] = useState(1);
  const [branchEventsPerPage, setBranchEventsPerPage] = useState(10);
  const [branchEventsSearchTerm, setBranchEventsSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);



  // Load events based on view type
  useEffect(() => {
    loadEvents();
  }, [viewType, branchId, planId, dateParam]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const params = {};
      
      if (branchId) params.branch_id = branchId;
      if (planId) params.plan_id = planId;
      if (dateParam) params.date = dateParam;
      
      let data;
      switch (viewType) {
        case 'month':
          data = await calendarAPI.getMonthView(params);
          break;
        case 'week':
          data = await calendarAPI.getWeekView(params);
          break;
        case 'day':
          data = await calendarAPI.getDayView(params);
          break;
        default:
          data = await calendarAPI.getMonthView(params);
      }
      
      // Process events to calculate counts from comma-separated ID strings
      const processedEvents = (data.results || []).map((event) => {
        return {
          ...event,
          callsOnPlan: getCallStatCount(event.tb_calls_onplan),
          callsOnOthers: getCallStatCount(event.tb_calls_onothers),
          profilesOnPlan: getCallStatCount(event.tb_calls_profiles),
          profilesOnOthers: getCallStatCount(event.tb_calls_profilesothers)
        };
      });
      
      setEvents(processedEvents);
      
    } catch (error) {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // Load dropdown options
  useEffect(() => {
    loadDropdownOptions();
  }, []);

  const loadDropdownOptions = async () => {
    try {
      const data = await calendarAPI.getDropdownOptions();
      const mapped = mapDropdownData(data);
      setDropdownOptions(mapped);
    } catch (error) {
      // Error loading dropdown options
    }
  };

  // Filter events based on current filters and search term
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Normalize event date to YYYY-MM-DD for reliable comparison
      const eventDate = event?.tb_call_startdate
        ? String(event.tb_call_startdate).split('T')[0]
        : '';

      // Apply date range filters (compare YYYY-MM-DD strings) - use appliedFilters
      if (appliedFilters.fromDate && eventDate && eventDate < appliedFilters.fromDate) return false;
      if (appliedFilters.toDate && eventDate && eventDate > appliedFilters.toDate) return false;

      // Other filters - use appliedFilters instead of branchFilters
      if (appliedFilters.selectedPlan && event.tb_call_plan_data !== appliedFilters.selectedPlan) return false;
      if (appliedFilters.selectedEmployee && event.employee_name !== appliedFilters.selectedEmployee) return false;
      if (appliedFilters.selectedClient && event.client_name !== appliedFilters.selectedClient) return false;
      if (appliedFilters.selectedCity && event.city_name !== appliedFilters.selectedCity) return false;
      
      // Search filter
      if (branchEventsSearchTerm) {
        const searchLower = branchEventsSearchTerm.trim().toLowerCase();
        if (!searchLower) return true; // If search is empty, don't filter out
        
        // Define all possible searchable fields with fallbacks
        const searchableFields = [
          event.tb_call_plan_data || '',
          event.employee_name || '',
          event.client_name || '',
          event.branch || '',
          event.state_name || '',
          event.city_name || '',
          event.source_name || '',
          event.tb_call_description || '',
          event.tb_call_plan || '',
          event.employeeName || '',
          event.clientName || '',
          event.branch_name || ''
        ];
        
        // Check if any field contains the search term (case-insensitive)
        const matchesSearch = searchableFields.some(field => 
          String(field).toLowerCase().includes(searchLower)
        );
        
        if (!matchesSearch) return false;
      }
      
      return true;
    });
  }, [events, appliedFilters, branchEventsSearchTerm]);

  const branchEventsStartIndex = (branchEventsCurrentPage - 1) * branchEventsPerPage;
  const branchEventsEndIndex = Math.min(branchEventsStartIndex + branchEventsPerPage, filteredEvents.length);
  const paginatedBranchEvents = filteredEvents.slice(
    branchEventsStartIndex,
    branchEventsStartIndex + branchEventsPerPage
  );
  const branchEventsTotalPages = Math.ceil(filteredEvents.length / branchEventsPerPage);

  // Group events by branch
  const planOptions = useMemo(() => {
    const plans = [...new Set(events.map(event => event.tb_call_plan_data || event.plan_name || event.plan).filter(Boolean))];
    return plans.map(p => ({ value: p, label: p }));
  }, [events]);

  const branchOptions = useMemo(() => {
    const branches = [...new Set(events.map(event => event.branch || event.branch_name).filter(Boolean))];
    return branches.map(b => ({ id: b, value: b, label: b }));
  }, [events]);

  const employeeOptions = useMemo(() => {
    const employees = [...new Set(events.map(event => event.employee_name || event.employeeName).filter(Boolean))];
    return employees.map(emp => ({ id: emp, value: emp, label: emp }));
  }, [events]);

  const clientOptions = useMemo(() => {
    const clients = [...new Set(events.map(event => event.client_name || event.clientName).filter(Boolean))];
    return clients.map(client => ({ id: client, value: client, label: client }));
  }, [events]);

  const stateOptions = useMemo(() => {
    // Get unique state names from dropdown options
    const dropdownStates = (dropdownOptions.states || []).map(state => 
      state.state || state.label || state.value || state.name
    ).filter(Boolean);
    
    // Get unique state names from events
    const eventStates = events.map(event => 
      event.state || event.state_name
    ).filter(Boolean);
    
    // Combine and deduplicate
    const allStates = [...new Set([...dropdownStates, ...eventStates])];
    return allStates.map(state => ({ id: state, value: state, label: state }));
  }, [dropdownOptions.states, events]);

  const cityOptions = useMemo(() => {
    // Get unique city names from dropdown options
    const dropdownCities = (dropdownOptions.cities || []).map(city => 
      city.city || city.label || city.value || city.name
    ).filter(Boolean);
    
    // Get unique city names from events
    const eventCities = events.map(event => 
      event.city
    ).filter(Boolean);
    
    // Combine and deduplicate
    const allCities = [...new Set([...dropdownCities, ...eventCities])];
    return allCities.map(city => ({ id: city, value: city, label: city }));
  }, [dropdownOptions.cities, events]);

  const sourceOptions = useMemo(() => {
    // Get unique source names from dropdown options
    const dropdownSources = (dropdownOptions.sources || []).map(source => 
      source.name || source.source_name || source.label || source.value
    ).filter(Boolean);
    
    // Get unique source names from events
    const eventSources = events.map(event => 
      event.source || event.source_name
    ).filter(Boolean);
    
    // Combine and deduplicate
    const allSources = [...new Set([...dropdownSources, ...eventSources])];
    return allSources.map(source => ({ id: source, value: source, label: source }));
  }, [dropdownOptions.sources, events]);

  const positionOptions = useMemo(() => dropdownOptions.positions, [dropdownOptions.positions]);

  const dropdownOptionsForModal = useMemo(() => ({
    plans: dropdownOptions.plans,
    employees: dropdownOptions.employees,
    clients: dropdownOptions.clients,
    states: stateOptions,
    cities: cityOptions,
    positions: positionOptions,
    sources: sourceOptions,
    branches: dropdownOptions.branches,
    user_level: dropdownOptions.user_level,
    filtering_applied: dropdownOptions.filtering_applied
  }), [dropdownOptions, stateOptions, cityOptions, positionOptions, sourceOptions]);

  const getRowId = (e) => e?.id ?? e?.tb_call_id ?? e?.tb_call_details_id ?? e?.call_id;

  // Resolve names for display from IDs or fallback fields
  const getCityName = (evt) => {
    const raw = evt.city || evt.city_name || evt.cityName;
    const id = evt.cityId || evt.city_id || evt.tb_call_city_id || (raw && !isNaN(raw) ? raw : null);

    if (id && cityOptions?.length) {
      const match = cityOptions.find(c => String(c.city_id || c.id) === String(id));
      if (match) {
        return match.city || match.city_name || match.name || match.value || match.label || raw || 'N/A';
      }
    }

    if (raw && !isNaN(raw)) {
      return cityOptions?.find(c => String(c.city_id || c.id) === String(raw))?.city || `City/${raw}`;
    }

    if (raw && !/^unknown$/i.test(String(raw).trim()) && String(raw).trim().toUpperCase() !== 'N/A') {
      return raw;
    }

    return 'N/A';
  };

  const getStateName = (evt) => {
    const id = evt.stateId || evt.state_id || evt.tb_call_state_id;

    if (id && stateOptions?.length) {
      const match = stateOptions.find(s => String((s.state_id ?? s.id ?? s.value ?? s.stateid)) === String(id));
      if (match && (match.label || match.state || match.name)) {
        return match.label || match.state || match.name;
      }
    }

    const direct = evt.state || evt.state_name || evt.stateName;
    if (direct && !/^unknown state$/i.test(String(direct).trim()) && String(direct).trim().toUpperCase() !== 'N/A') {
      return direct;
    }

    return 'N/A';
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setShowEditModal(true);
  };

  const handleModalSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      const targetId = getRowId(editingEvent);
      if (!targetId) throw new Error('No event ID found to update');

      const toTime = (() => {
        const [hh, mm] = String(formData.time || '00:00').split(':');
        const endHour = (parseInt(hh || 0) + 1) % 24;
        return `${String(endHour).padStart(2, '0')}:${mm || '00'}`;
      })();

      const payload = {
        tb_call_plan_data: (formData.plan && formData.plan.trim()) || 'P1',
        tb_call_description: (formData.remarks && formData.remarks.trim()) || 'Updated event',
        tb_call_startdate: `${formData.date}T${formData.time}:00`,
        tb_call_todate: `${formData.date}T${toTime}:00`,
        tb_call_channel: formData.position || 'General Position',
        tb_call_emp_id: formData.employeeId ? parseInt(formData.employeeId) : null,
        tb_call_client_id: formData.clientId ? parseInt(formData.clientId) : null,
        tb_call_state_id: formData.stateId ? String(formData.stateId) : null,
        tb_call_city_id: formData.cityId ? String(formData.cityId) : null,
        tb_call_source_id: formData.sourceId ? String(formData.sourceId) : null,
      };

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/call-details/${targetId}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Update failed: ${res.status} ${res.statusText} ${JSON.stringify(err)}`);
      }

      setEvents(prev => prev.map(ev => {
        const rid = getRowId(ev);
        if (String(rid) !== String(targetId)) return ev;
        return {
          ...ev,
          tb_call_plan_data: formData.plan || ev.tb_call_plan_data,
          employee_name: formData.employeeName || ev.employee_name,
          tb_call_emp_id: formData.employeeId || ev.tb_call_emp_id,
          client_name: formData.clientName || ev.client_name,
          tb_call_client_id: formData.clientId || ev.tb_call_client_id,
          state_name: formData.state || ev.state_name,
          tb_call_state_id: formData.stateId || ev.tb_call_state_id,
          city_name: formData.city || ev.city_name,
          tb_call_city_id: formData.cityId || ev.tb_call_city_id,
          tb_call_channel: formData.position || ev.tb_call_channel,
          source_name: formData.source || ev.source_name,
          tb_call_source_id: formData.sourceId || ev.tb_call_source_id,
          tb_call_startdate: `${formData.date}T${formData.time}:00`,
          tb_call_todate: `${formData.date}T${toTime}:00`,
          tb_call_description: formData.remarks || ev.tb_call_description
        };
      }));

      setShowEditModal(false);
      setEditingEvent(null);
    } catch (error) {
      // Error saving event
    } finally {
      setIsSubmitting(false);
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

    const title = `${getStatsTypeDisplayName(statsType)} - ${event?.employee_name || 'Event'}`;
    
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
      // Fallback: show error message to user
      alert('Unable to open candidate report. Please try again.');
    }
  };

  // Handle stats click to directly open candidate table in new tab
  const handleStatsClick = (event, statsType) => {
    // Extract candidate IDs based on stats type
    let ids = [];
    switch (statsType) {
      case 'callsOnPlan':
        ids = event.tb_calls_onplan ? event.tb_calls_onplan.split(',').filter(id => id.trim() !== '' && id.trim() !== '0') : [];
        break;
      case 'callsOnOthers':
        ids = event.tb_calls_onothers ? event.tb_calls_onothers.split(',').filter(id => id.trim() !== '' && id.trim() !== '0') : [];
        break;
      case 'profilesOnPlan':
        ids = event.tb_calls_profiles ? event.tb_calls_profiles.split(',').filter(id => id.trim() !== '' && id.trim() !== '0') : [];
        break;
      case 'profilesOnOthers':
        ids = event.tb_calls_profilesothers ? event.tb_calls_profilesothers.split(',').filter(id => id.trim() !== '' && id.trim() !== '0') : [];
        break;
      default:
        ids = [];
    }

    // Directly open candidate table in new tab if there are candidate IDs
    if (ids.length > 0) {
      openCandidateTableInNewTab(statsType, event, ids);
    }
  };

  const getPlanColor = (planName) => {
    switch (planName) {
      case 'P1': return 'bg-blue-500';
      case 'P2': return 'bg-green-500';
      case 'P3': return 'bg-purple-500';
      case 'P4': return 'bg-orange-500';
      case 'P5': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };

  const getViewTitle = () => {
    switch (viewType) {
      case 'month': return 'Monthly Events Report';
      case 'week': return 'Weekly Events Report';
      case 'day': return 'Daily Events Report';
      default: return 'Events Report';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-sm flex items-center justify-center bg-blue-600`}>
                  <Building className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-md font-semibold text-gray-900">
                    {getViewTitle()}
                  </h1>
                  <p className="text-xs text-gray-600">
                    {(viewType === 'month' ? 
                      (dateParam ? new Date(dateParam).toLocaleString('en-US', { month: 'long', year: 'numeric' }) : 
                       branchFilters.fromDate ? new Date(branchFilters.fromDate).toLocaleString('en-US', { month: 'long', year: 'numeric' }) : 
                       new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })) : 
                      viewType.charAt(0).toUpperCase() + viewType.slice(1))}
                    {` • ${filteredEvents.length} total events`}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Intentionally left empty to match PlanEventsReport layout without actions */}
            </div>
          </div>
        </div>
      </div>

     
      {/* Filter Dropdowns */}
      <div className="bg-white mt-2 px-3 py-2">
        {/* Toggle button for mobile */}
        <div className="flex justify-between items-center sm:hidden">
          <button
            onClick={() => setShowFilters(prev => !prev)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
          >
            <Filter size={16} />
            Filters
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Filters grid */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-10 gap-4  transition-all duration-300 ease-in-out 
            ${showFilters ? "block" : "hidden sm:grid"}`}
        >
          {/* From Date */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={branchFilters.fromDate || ''}
              onChange={(e) => setBranchFilters(prev => ({ ...prev, fromDate: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={branchFilters.toDate || ''}
              onChange={(e) => setBranchFilters(prev => ({ ...prev, toDate: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Plan */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Plan</label>
            <select
              value={branchFilters.selectedPlan || ''}
              onChange={(e) => setBranchFilters(prev => ({ ...prev, selectedPlan: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Plans</option>
              {planOptions.map(plan => (
                <option key={plan.value} value={plan.value}>{plan.value}</option>
              ))}
            </select>
          </div>

          {/* Employee */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Employee</label>
            <select
              value={branchFilters.selectedEmployee || ''}
              onChange={(e) => setBranchFilters(prev => ({ ...prev, selectedEmployee: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Employees</option>
              {employeeOptions.map(emp => (
                <option key={emp.id} value={emp.value}>{emp.value}</option>
              ))}
            </select>
          </div>

          {/* Client */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Client</label>
            <select
              value={branchFilters.selectedClient || ''}
              onChange={(e) => setBranchFilters(prev => ({ ...prev, selectedClient: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Clients</option>
              {clientOptions.map(client => (
                <option key={client.id} value={client.value}>{client.value}</option>
              ))}
            </select>
          </div>

          {/* City */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">City</label>
            <select
              value={branchFilters.selectedCity || ''}
              onChange={(e) => setBranchFilters(prev => ({ ...prev, selectedCity: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Cities</option>
              {cityOptions.map(city => (
                <option key={city.id} value={city.value}>{city.value}</option>
              ))}
            </select>
          </div>

          {/* Apply Filters Button */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setAppliedFilters(branchFilters);
                setBranchEventsCurrentPage(1); // Reset to first page
              }}
              className="w-full px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
            >
              Apply 
            </button>
          </div>

          {/* Clear Filters Button */}
          <div className="flex items-end">
            <button
              onClick={() => {
                const resetFilters = {
                  fromDate: '',
                  toDate: '',
                  selectedPlan: planId || '',
                  selectedTeam: '',
                  selectedEmployee: '',
                  selectedClient: '',
                  selectedCity: ''
                };
                setBranchFilters(resetFilters);
                setAppliedFilters(resetFilters);
                setBranchEventsCurrentPage(1);
              }}
              className="w-full px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-xs"
            >
              Clear 
            </button>
          </div>
        </div>
      </div>

      {/* Table Controls */}
      <div className="bg-white mt-2 px-3 py-2 border border-gray-200 border-b-0 rounded-t-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center space-x-2">
            <label className="text-xs font-medium text-gray-700">Show:</label>
            <select
              value={branchEventsPerPage}
              onChange={(e) => setBranchEventsPerPage(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
            >
              {[10, 25, 50, 100].map(size => (
                <option key={size} value={size}>{`${size} entries`}</option>
              ))}
            </select>
          </div>

          <div className="text-xs text-gray-600">
            Showing {filteredEvents.length ? `${branchEventsStartIndex + 1}-${branchEventsEndIndex}` : '0-0'} of {filteredEvents.length} entries
          </div>

          <div className="flex items-center">
            <input
              type="text"
              value={branchEventsSearchTerm}
              onChange={(e) => setBranchEventsSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full md:w-64 px-3 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Events Content */}
      <div className="mt-0">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-md">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-600">Try adjusting your filters or date range.</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto scrollbar-desktop max-h-[calc(100vh-300px)]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white sticky top-0 z-10 border">
                <tr>
                  <th className="px-1.5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Call Plan</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Call Others</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Profile Plan</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Profile Others</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedBranchEvents.map((event, index) => (
                  <tr key={event.id || index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-1 py-1 text-center text-sm text-gray-500">{branchEventsStartIndex + index + 1}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getPlanColor(event.tb_call_plan_data)}`} />
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">
                            {event.tb_call_plan_data || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {event.tb_call_startdate ? event.tb_call_startdate.split('T')[0].split('-').reverse().join('/') : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-1">
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">
                          {event.employee_name || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {event.branch || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-1">
                      <div>
                        <div className="font-semibold text-gray-900 text-xs">
                          {event.client_name || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span>{`${getCityName(event)}${(getStateName(event) && getStateName(event) !== 'N/A') ? `, ${getStateName(event)}` : ''}`}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-1">
                      <div className="text-xs text-gray-900">
                        {event.source_name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <div 
                        className="font-bold text-blue-600 text-sm cursor-pointer hover:bg-blue-50 rounded px-2 py-1 transition-colors"
                        onClick={() => handleStatsClick(event, 'callsOnPlan')}
                        title="Click to view candidates"
                      >
                        {event.callsOnPlan || 0}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <div 
                        className="font-bold text-green-600 text-sm cursor-pointer hover:bg-green-50 rounded px-2 py-1 transition-colors"
                        onClick={() => handleStatsClick(event, 'callsOnOthers')}
                        title="Click to view candidates"
                      >
                        {event.callsOnOthers || 0}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <div 
                        className="font-bold text-purple-600 text-sm cursor-pointer hover:bg-purple-50 rounded px-2 py-1 transition-colors"
                        onClick={() => handleStatsClick(event, 'profilesOnPlan')}
                        title="Click to view candidates"
                      >
                        {event.profilesOnPlan || 0}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <div 
                        className="font-bold text-orange-600 text-sm cursor-pointer hover:bg-orange-50 rounded px-2 py-1 transition-colors"
                        onClick={() => handleStatsClick(event, 'profilesOnOthers')}
                        title="Click to view candidates"
                      >
                        {event.profilesOnOthers || 0}
                      </div>
                    </td>
                    <td className="px-4 py-1">
                      <div className="text-xs text-gray-600 max-w-xs truncate">
                        {event.tb_call_description || 'No remarks'}
                      </div>
                    </td>
                    <td className="px-4 py-1 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditEvent(event);
                        }}
                        className="p-1 hover:bg-blue-100 rounded-md transition-colors duration-200 text-blue-600"
                        title="Edit Event"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      <EventFormModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingEvent(null); }}
        editingEvent={editingEvent}
        onSubmit={handleModalSubmit}
        dropdownOptions={dropdownOptionsForModal}
        isSubmitting={isSubmitting}
        existingEvents={events}
      />

      </div>

      {/* Advanced Pagination */}
      {branchEventsTotalPages > 1 && (
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between px-2 py-1 bg-white mt-2 border-t border-gray-200 ">
          <div>
            <p className="text-xs text-gray-700">
              Showing{' '}
              <span className="font-medium">
                {(branchEventsCurrentPage - 1) * branchEventsPerPage + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium">
                {Math.min(branchEventsCurrentPage * branchEventsPerPage, filteredEvents.length)}
              </span>{' '}
              of{' '}
              <span className="font-medium">{filteredEvents.length}</span> results
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              {/* First Page Button */}
              <button
                onClick={() => setBranchEventsCurrentPage(1)}
                disabled={branchEventsCurrentPage === 1}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">First</span>
                <ChevronLeft className="h-3 w-3" />
                <ChevronLeft className="h-3 w-3 -ml-1" />
              </button>
              
              {/* Previous Button */}
              <button
                onClick={() => setBranchEventsCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={branchEventsCurrentPage === 1}
                className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Previous</span>
                <ChevronLeft className="h-3 w-3" />
              </button>

              {/* Page Numbers */}
              {(() => {
                const pages = [];
                const totalPages = branchEventsTotalPages;
                const current = branchEventsCurrentPage;
                
                // Always show first page
                if (totalPages > 0) {
                  pages.push(
                    <button
                      key={1}
                      onClick={() => setBranchEventsCurrentPage(1)}
                      className={`relative inline-flex items-center px-3 py-2 text-xs font-semibold ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                        current === 1
                          ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                          : 'text-gray-900'
                      }`}
                    >
                      1
                    </button>
                  );
                }

                // Show ellipsis if needed
                if (current > 4) {
                  pages.push(
                    <span key="ellipsis1" className="relative inline-flex items-center px-3 py-2 text-xs font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                      ...
                    </span>
                  );
                }

                // Show pages around current page
                const start = Math.max(2, current - 1);
                const end = Math.min(totalPages - 1, current + 1);
                
                for (let i = start; i <= end; i++) {
                  if (i !== 1 && i !== totalPages) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => setBranchEventsCurrentPage(i)}
                        className={`relative inline-flex items-center px-3 py-2 text-xs font-semibold ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                          current === i
                            ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                            : 'text-gray-900'
                        }`}
                      >
                        {i}
                      </button>
                    );
                  }
                }

                // Show ellipsis if needed
                if (current < totalPages - 3) {
                  pages.push(
                    <span key="ellipsis2" className="relative inline-flex items-center px-3 py-2 text-xs font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                      ...
                    </span>
                  );
                }

                // Always show last page (if more than 1 page)
                if (totalPages > 1) {
                  pages.push(
                    <button
                      key={totalPages}
                      onClick={() => setBranchEventsCurrentPage(totalPages)}
                      className={`relative inline-flex items-center px-3 py-2 text-xs font-semibold ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                        current === totalPages
                          ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                          : 'text-gray-900'
                      }`}
                    >
                      {totalPages}
                    </button>
                  );
                }

                return pages;
              })()}

              {/* Next Button */}
              <button
                onClick={() => setBranchEventsCurrentPage(prev => Math.min(prev + 1, branchEventsTotalPages))}
                disabled={branchEventsCurrentPage === branchEventsTotalPages}
                className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Next</span>
                <ChevronRight className="h-3 w-3" />
              </button>
              
              {/* Last Page Button */}
              <button
                onClick={() => setBranchEventsCurrentPage(branchEventsTotalPages)}
                disabled={branchEventsCurrentPage === branchEventsTotalPages}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Last</span>
                <ChevronRight className="h-3 w-3" />
                <ChevronRight className="h-3 w-3 -ml-1" />
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchEventsReport;
