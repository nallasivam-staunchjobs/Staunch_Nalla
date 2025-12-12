import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar, X, Eye, ArrowLeft, Edit3, Plus, MapPin, Share2, Filter, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import EventFormModal from './components/EventFormModal';
import CandidateStatsModal from './components/CandidateStatsModal';
import { calendarAPI, mapDropdownData, toISODate, getPlanColor, getAuthHeaders } from './utils/calendarUtils';
import Loading from '../../components/Loading';

const PlanEventsReport = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get URL parameters
  const plan = searchParams.get('plan');
  const branch = searchParams.get('branch');
  const dateDisplay = searchParams.get('dateDisplay');
  const reportKey = searchParams.get('reportKey');
  
  // Parse events data
  const [selectedPlanEvents, setSelectedPlanEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [planEventFilters, setPlanEventFilters] = useState({
    plan: '',
    team: '',
    employeeName: '',
    client: '',
    city: ''
  });

  // Pagination & search state
  const [planEventsCurrentPage, setPlanEventsCurrentPage] = useState(1);
  const [planEventsPerPage, setPlanEventsPerPage] = useState(10);
  const [planEventsSearchTerm, setPlanEventsSearchTerm] = useState('');

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Plan modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Candidate Stats Modal state
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedStatsType, setSelectedStatsType] = useState('');
  const [selectedEventData, setSelectedEventData] = useState(null);
  const [candidateIds, setCandidateIds] = useState([]);

  // Dropdown options for EventFormModal (states, cities, positions, etc.)
  const [dropdownOptions, setDropdownOptions] = useState({
    plans: ['P1', 'P2', 'P3', 'P4', 'P5'],
    employees: [],
    clients: [],
    states: [],
    cities: [],
    positions: [],
    sources: [],
    branches: []
  });


  // Helper functions for data resolution
  const getCityName = (evt) => {
    const raw = evt.city;
    const id = evt.cityId || evt.city_id || evt.tb_call_city_id || (raw && !isNaN(raw) ? raw : null);
    if (id && dropdownOptions?.cities?.length) {
      const match = dropdownOptions.cities.find(c => String(c.city_id || c.id) === String(id));
      if (match) {
        return match.city || match.value || match.label || raw || 'N/A';
      }
    }
    // If non-numeric city string exists, use it
    if (raw && isNaN(raw)) return raw;
    return 'N/A';
  };

  const getStateName = (evt) => {
    const id = evt.stateId || evt.state_id || evt.tb_call_state_id;
    if (id && dropdownOptions?.states?.length) {
      const match = dropdownOptions.states.find(s => String((s.state_id ?? s.id ?? s.value)) === String(id));
      if (match && (match.label || match.state)) {
        return match.label || match.state;
      }
    }
    const direct = evt.state || evt.state_name;
    if (direct && direct !== 'Unknown State') return direct;
    return 'N/A';
  };

  const getSourceName = (evt) => {
    const direct = evt.source || evt.source_name || evt.sourceName;
    if (direct) return direct;
    const id = evt.sourceId || evt.source_id || evt.tb_call_source_id;
    if (id && dropdownOptions?.sources?.length) {
      const match = dropdownOptions.sources.find(s => String(s.id) === String(id) || String(s.value) === String(id));
      if (match) {
        return match.name || match.label || 'N/A';
      }
    }
    return 'N/A';
  };


  // Decide which date to use for the report fetch
  const computeReportDate = () => {
    const urlDate = searchParams.get('date');
    if (urlDate) return urlDate;
    // Try parsing the display string
    if (dateDisplay) return toISODate(dateDisplay);
    // Fallback to today
    return toISODate(new Date());
  };

  // Load plan events from API using month_view
  const loadPlanEvents = async () => {
    // REMOVED CACHE: Always fetch fresh data from API to show updated counts
    setLoading(true);
    try {
      const params = {};
      if (branch) params.branch_id = branch;
      
      const reportDate = computeReportDate();
      if (reportDate) params.date = reportDate;
      
      console.log('[PlanEventsReport] Fetching fresh data from API...', params);
      const result = await calendarAPI.getMonthView(params);
      let eventsData = result.success ? result.results : (result.results || []);
      
      // Filter by plan if specified
      if (plan && Array.isArray(eventsData)) {
        eventsData = eventsData.filter(event => 
          event.tb_call_plan_data === plan || event.plan === plan
        );
      }
      
      // Calculate counts from comma-separated strings and extract plan_date
      eventsData = eventsData.map(event => ({
        ...event,
        callsOnPlan: event.tb_calls_onplan 
          ? event.tb_calls_onplan.split(',').filter(id => id.trim() !== '' && id.trim() !== '0').length 
          : 0,
        callsOnOthers: event.tb_calls_onothers 
          ? event.tb_calls_onothers.split(',').filter(id => id.trim() !== '' && id.trim() !== '0').length 
          : 0,
        profilesOnPlan: event.tb_calls_profiles 
          ? event.tb_calls_profiles.split(',').filter(id => id.trim() !== '' && id.trim() !== '0').length 
          : 0,
        profilesOnOthers: event.tb_calls_profilesothers 
          ? event.tb_calls_profilesothers.split(',').filter(id => id.trim() !== '' && id.trim() !== '0').length 
          : 0,
        plan_date: event.tb_call_startdate 
          ? String(event.tb_call_startdate).split('T')[0] 
          : (event.plan_date || reportDate),
        remarks: event.tb_call_description || event.remarks || ''
      }));
      
      console.log('[PlanEventsReport] Loaded events:', eventsData.length);
      setSelectedPlanEvents(Array.isArray(eventsData) ? eventsData : []);
    } catch (error) {
      console.error('Error loading plan events:', error);
      setSelectedPlanEvents([]);
    } finally {
      setLoading(false);
    }
  };


  // Load dropdown options once for this report page
  useEffect(() => {
    const loadDropdownOptions = async () => {
      try {
        const data = await calendarAPI.getDropdownOptions();
        const mapped = mapDropdownData(data);
        setDropdownOptions(mapped);
      } catch (e) {
        // keep defaults; EventFormModal handles empty gracefully
      }
    };
    loadDropdownOptions();
  }, []);



  // Load plan events when component mounts or parameters change
  useEffect(() => {
    loadPlanEvents();
  }, [plan, branch, dateDisplay]);

  // SessionStorage check is now handled in loadPlanEvents() for better performance

  // Per-ID hydration intentionally disabled per request; rely on passed snapshot and optimistic updates

  // Filter options
  const planOptions = useMemo(() => {
    const livePlans = (dropdownOptions.plans || []).map(p => ({
      value: typeof p === 'string' ? p : p.value,
      label: typeof p === 'string' ? p : (p.label || p.value)
    }));
    if (livePlans.length) return livePlans;
    const plans = [...new Set(selectedPlanEvents.map(event => event.plan_name || plan).filter(Boolean))];
    return plans.map(p => ({ value: p, label: p }));
  }, [dropdownOptions.plans, selectedPlanEvents, plan]);

  const branchOptions = useMemo(() => {
    const liveBranches = (dropdownOptions.branches || []).map(branch => {
      const branchName = branch.label ?? branch.name ?? branch.branch_name ?? `Branch ${branch.id}`;
      return {
        id: branch.id ?? branch.value,
        value: branchName,
        label: branchName
      };
    });
    if (liveBranches.length) return liveBranches;
    const branches = [...new Set(selectedPlanEvents.map(event => event.branch || event.branch_name).filter(Boolean))];
    return branches.map(b => ({ id: b, value: b, label: b }));
  }, [dropdownOptions.branches, selectedPlanEvents]);

  const employeeOptions = useMemo(() => {
    const liveEmployees = (dropdownOptions.employees || []).map(emp => {
      const employeeName = emp.label ?? emp.fullName ?? emp.firstName ?? emp.employee_name ?? `Employee ${emp.id}`;
      return {
        id: emp.id ?? emp.value,
        value: employeeName,
        label: employeeName
      };
    });
    if (liveEmployees.length) return liveEmployees;
    const employees = [...new Set(selectedPlanEvents.map(event => event.employeeName || event.employee_name).filter(Boolean))];
    return employees.map(emp => ({ id: emp, value: emp, label: emp }));
  }, [dropdownOptions.employees, selectedPlanEvents]);

  const clientOptions = useMemo(() => {
    const liveClients = (dropdownOptions.clients || []).map(client => {
      const clientName = client.label ?? client.vendor_name ?? client.client_name ?? client.name ?? `Client ${client.id}`;
      return {
        id: client.id ?? client.value,
        value: clientName,
        label: clientName
      };
    });
    if (liveClients.length) return liveClients;
    const clients = [...new Set(selectedPlanEvents.map(event => event.clientName || event.client_name).filter(Boolean))];
    return clients.map(client => ({ id: client, value: client, label: client }));
  }, [dropdownOptions.clients, selectedPlanEvents]);

  const cityOptions = useMemo(() => {
    // Get unique city names from dropdown options
    const dropdownCities = (dropdownOptions.cities || []).map(city => 
      city.city || city.label || city.value || city.name
    ).filter(Boolean);
    
    // Get unique city names from events
    const eventCities = selectedPlanEvents.map(event => 
      event.city || getCityName(event)
    ).filter(Boolean);
    
    // Combine and deduplicate
    const allCities = [...new Set([...dropdownCities, ...eventCities])];
    return allCities.map(city => ({ id: city, value: city, label: city }));
  }, [dropdownOptions.cities, selectedPlanEvents]);

  const stateOptions = useMemo(() => {
    // Get unique state names from dropdown options
    const dropdownStates = (dropdownOptions.states || []).map(state => 
      state.state || state.label || state.value || state.name
    ).filter(Boolean);
    
    // Get unique state names from events
    const eventStates = selectedPlanEvents.map(event => 
      event.state || event.state_name || getStateName(event)
    ).filter(Boolean);
    
    // Combine and deduplicate
    const allStates = [...new Set([...dropdownStates, ...eventStates])];
    return allStates.map(state => ({ id: state, value: state, label: state }));
  }, [dropdownOptions.states, selectedPlanEvents]);

  // Filtered events with enhanced search
  const filteredPlanEvents = useMemo(() => {
    const term = (planEventsSearchTerm || '').trim().toLowerCase();
    if (!term) {
      // If no search term, just apply the regular filters
      return selectedPlanEvents.filter(event => {
        const matchesPlan = !planEventFilters.plan || 
          (event.plan_name || event.tb_call_plan_data || plan) === planEventFilters.plan;
        const matchesTeam = !planEventFilters.team || 
          (event.branch || event.branch_name) === planEventFilters.team;
        const matchesEmployee = !planEventFilters.employeeName || 
          (event.employeeName || event.employee_name) === planEventFilters.employeeName;
        const matchesClient = !planEventFilters.client || 
          (event.clientName || event.client_name) === planEventFilters.client;
        const matchesCity = !planEventFilters.city || 
          (event.city === planEventFilters.city || getCityName(event) === planEventFilters.city);
        
        return matchesPlan && matchesTeam && matchesEmployee && matchesClient && matchesCity;
      });
    }

    // If there's a search term, perform the search across all relevant fields
    return selectedPlanEvents.filter(event => {
      // First check if it matches the regular filters
      const matchesPlan = !planEventFilters.plan || 
        (event.plan_name || event.tb_call_plan_data || plan) === planEventFilters.plan;
      const matchesTeam = !planEventFilters.team || 
        (event.branch || event.branch_name) === planEventFilters.team;
      const matchesEmployee = !planEventFilters.employeeName || 
        (event.employeeName || event.employee_name) === planEventFilters.employeeName;
      const matchesClient = !planEventFilters.client || 
        (event.clientName || event.client_name) === planEventFilters.client;
      const matchesCity = !planEventFilters.city || 
        (event.city === planEventFilters.city || getCityName(event) === planEventFilters.city);

      // If any of the main filters don't match, skip the search check
      if (!(matchesPlan && matchesTeam && matchesEmployee && matchesClient && matchesCity)) {
        return false;
      }

      // Define all possible searchable fields with fallbacks
      const searchableFields = [
        event.plan_name,
        event.tb_call_plan_data,
        event.plan,
        event.employee_name,
        event.employeeName,
        event.client_name,
        event.clientName,
        getCityName(event),
        getStateName(event),
        getSourceName(event),
        event.city,
        event.state,
        event.state_name,
        event.branch,
        event.branch_name,
        event.source,
        event.source_name,
        event.remarks,
        event.tb_call_description,
        event.tb_call_plan,
        event.tb_call_plan_data,
        event.employee_first_name,
        event.employee_last_name,
        event.client_company,
        event.client_contact_person
      ];

      // Check if any field contains the search term (case-insensitive)
      return searchableFields.some(field => 
        field && String(field).toLowerCase().includes(term)
      );
    });
  }, [selectedPlanEvents, planEventFilters, planEventsSearchTerm, plan]);

  // Pagination
  const planEventsStartIndex = (planEventsCurrentPage - 1) * planEventsPerPage;
  const paginatedPlanEvents = filteredPlanEvents.slice(
    planEventsStartIndex,
    planEventsStartIndex + planEventsPerPage
  );
  const planEventsTotalPages = Math.ceil(filteredPlanEvents.length / planEventsPerPage);
  const planEventsEndIndex = Math.min(planEventsStartIndex + planEventsPerPage, filteredPlanEvents.length);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredPlanEvents.length / planEventsPerPage) || 1);
    if (planEventsCurrentPage > maxPage) {
      setPlanEventsCurrentPage(maxPage);
    }
  }, [filteredPlanEvents.length, planEventsPerPage, planEventsCurrentPage]);

  const resetPlanEventFilters = () => {
    setPlanEventFilters({
      plan: '',
      team: '',
      employeeName: '',
      client: '',
      city: ''
    });
    setPlanEventsCurrentPage(1);
  };

  const handlePlanEventsPageSizeChange = (value) => {
    setPlanEventsPerPage(value);
    setPlanEventsCurrentPage(1);
  };

  const handlePlanEventsSearchChange = (value) => {
    setPlanEventsSearchTerm(value);
    setPlanEventsCurrentPage(1);
  };

  const handlePlanEventsPageChange = (page) => {
    if (!Number.isFinite(page)) return;
    const safePage = Math.min(Math.max(page, 1), planEventsTotalPages || 1);
    setPlanEventsCurrentPage(safePage);
  };

  const handleEventClick = (event) => {
    // Handle event click if needed
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setShowEditModal(true);
  };

  const handleModalSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      const targetId = editingEvent?.id ?? editingEvent?.tb_call_id ?? editingEvent?.tb_call_details_id ?? editingEvent?.call_id;
      if (!targetId) throw new Error('No event ID found to update');

      // Prepare payload for backend
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

      // Call backend
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/call-details/${targetId}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Update failed: ${res.status} ${res.statusText} ${JSON.stringify(err)}`);
      }

      // Optimistically update local table data
      const getRowId = (e) => e?.id ?? e?.tb_call_id ?? e?.tb_call_details_id ?? e?.call_id;
      setSelectedPlanEvents(prev => prev.map(ev => getRowId(ev) === String(targetId) || getRowId(ev) === targetId ? {
        ...ev,
        plan: formData.plan || ev.plan,
        plan_name: formData.plan || ev.plan_name,
        tb_call_plan_data: formData.plan || ev.tb_call_plan_data,
        plan_date: formData.date || ev.plan_date,
        employeeName: formData.employeeName || ev.employeeName,
        employeeId: formData.employeeId || ev.employeeId,
        clientName: formData.clientName || ev.clientName,
        clientId: formData.clientId || ev.clientId,
        state: formData.state || ev.state,
        stateId: formData.stateId || ev.stateId,
        tb_call_state_id: formData.stateId || ev.tb_call_state_id,
        city: formData.city || ev.city,
        cityId: formData.cityId || ev.cityId,
        tb_call_city_id: formData.cityId || ev.tb_call_city_id,
        branch: formData.branch || ev.branch,
        branch_name: formData.branch || ev.branch_name,
        tb_call_channel: formData.position || ev.tb_call_channel,
        source: formData.source || ev.source,
        sourceId: formData.sourceId || ev.sourceId,
        tb_call_source_id: formData.sourceId || ev.tb_call_source_id,
        tb_call_startdate: `${formData.date}T${formData.time}:00`,
        tb_call_todate: `${formData.date}T${toTime}:00`,
        tb_call_description: formData.remarks || ev.tb_call_description,
        remarks: formData.remarks || ev.remarks
      } : ev));


      setShowEditModal(false);
      setEditingEvent(null);
    } catch (error) {
      // Error saving event
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddModalSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      const toTime = (() => {
        const [hh, mm] = String(formData.time || '00:00').split(':');
        const endHour = (parseInt(hh || 0) + 1) % 24;
        return `${String(endHour).padStart(2, '0')}:${mm || '00'}`;
      })();

      const payload = {
        tb_call_plan_data: (formData.plan && formData.plan.trim()) || 'P1',
        tb_call_description: (formData.remarks && formData.remarks.trim()) || 'New event',
        tb_call_startdate: `${formData.date}T${formData.time || '09:00'}:00`,
        tb_call_todate: `${formData.date}T${toTime}:00`,
        tb_call_channel: formData.position || 'General Position',
        employee_name: formData.employeeName || '',
        tb_call_emp_id: formData.employeeId ? parseInt(formData.employeeId) : null,
        client_name: formData.clientName || '',
        tb_call_client_id: formData.clientId ? parseInt(formData.clientId) : null,
        state_name: formData.state || '',
        tb_call_state_id: formData.stateId ? String(formData.stateId) : null,
        city_name: formData.city || '',
        tb_call_city_id: formData.cityId ? String(formData.cityId) : null,
        source_name: formData.source || '',
        tb_call_source_id: formData.sourceId ? String(formData.sourceId) : null,
        branch: formData.branch || '',
        tb_call_branch_id: formData.branchId ? String(formData.branchId) : null,
      };

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}/call-details/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Create failed: ${res.status} ${res.statusText} ${JSON.stringify(err)}`);
      }

      const newEvent = await res.json();
      
      // Normalize the new event data to match existing event structure
      const normalizedEvent = {
        ...newEvent,
        plan_name: newEvent.tb_call_plan_data || newEvent.plan_name,
        employeeName: newEvent.employee_name || newEvent.employeeName,
        clientName: newEvent.client_name || newEvent.clientName,
        city: newEvent.city_name || newEvent.city,
        state: newEvent.state_name || newEvent.state,
        branch: newEvent.branch || newEvent.branch_name,
        source: newEvent.source_name || newEvent.source
      };
      
      // Add the normalized event to the list
      setSelectedPlanEvents(prev => [normalizedEvent, ...prev]);
      
      setShowAddModal(false);
      console.log('Event created successfully:', newEvent);
    } catch (error) {
      console.error('Error adding event:', error);
      // You might want to show an error message to the user here
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

    const title = `${getStatsTypeDisplayName(statsType)} - ${event?.employeeName || event?.employee_name || 'Event'}`;
    
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


  // Stable way to get an event's identifier across different payload shapes
  const getRowId = (e) => e?.id ?? e?.tb_call_id ?? e?.tb_call_details_id ?? e?.call_id;

  // Merge a fresh server payload into an existing row
  const mergeServerEvent = (row, s) => ({
    ...row,
    id: row.id || s.id || s.tb_call_id || s.tb_call_details_id || row.id,
    plan: s.tb_call_plan_data ?? row.plan,
    tb_call_plan_data: s.tb_call_plan_data ?? row.tb_call_plan_data,
    plan_date: (s.tb_call_startdate ? String(s.tb_call_startdate).split('T')[0] : row.plan_date),
    employeeId: s.tb_call_emp_id ?? row.employeeId,
    clientId: s.tb_call_client_id ?? row.clientId,
    stateId: (s.tb_call_state_id != null ? String(s.tb_call_state_id) : row.stateId),
    tb_call_state_id: (s.tb_call_state_id != null ? String(s.tb_call_state_id) : row.tb_call_state_id),
    cityId: (s.tb_call_city_id != null ? String(s.tb_call_city_id) : row.cityId),
    tb_call_city_id: (s.tb_call_city_id != null ? String(s.tb_call_city_id) : row.tb_call_city_id),
    sourceId: (s.tb_call_source_id != null ? String(s.tb_call_source_id) : row.sourceId),
    tb_call_source_id: (s.tb_call_source_id != null ? String(s.tb_call_source_id) : row.tb_call_source_id),
    tb_call_channel: s.tb_call_channel ?? row.tb_call_channel,
    tb_call_startdate: s.tb_call_startdate ?? row.tb_call_startdate,
    tb_call_todate: s.tb_call_todate ?? row.tb_call_todate,
    tb_call_description: s.tb_call_description ?? row.tb_call_description,
    remarks: s.tb_call_description ?? row.remarks,
    branch: s.branch || s.branch_name || row.branch,
    branch_name: s.branch_name || s.branch || row.branch_name
  });

  // Resolve employee code for an event using dropdown employees as source of truth
  const getEmployeeCode = (evt) => {
    const direct = evt.employeeCode || evt.emp_code || evt.empcode;
    if (direct) return direct;
    const empId = evt.employeeId || evt.employee_id || evt.tb_call_emp_id;
    if (empId && dropdownOptions?.employees?.length) {
      const match = dropdownOptions.employees.find(e => String(e.id) === String(empId) || String(e.value) === String(empId));
      if (match) {
        return match.employeeCode || match.emp_code || match.empcode || null;
      }
    }
    // Friendly fallback: Emp/00056 style if only ID exists
    return empId ? `Emp/${String(empId).padStart(5, '0')}` : 'N/A';
  };



  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Invalid Report Request</h2>
          <p className="text-gray-600 mb-6">No plan information provided for this report.</p>
          <button
            onClick={() => navigate('/events')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }


  if (loading) {
    return null;
  }

  if (!selectedPlanEvents.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Plan Events Found</h2>
          <p className="text-gray-600 mb-6">No events found for the selected plan and date.</p>
          <button
            onClick={() => navigate('/events')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white ">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${getPlanColor(plan)}`}>
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-md font-semibold text-gray-900">
                    {plan} Events Report - {branch}
                  </h1>
                  <p className="text-xs text-gray-600">
                    {dateDisplay} • {filteredPlanEvents.length} total events
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white mt-2 px-3 py-2">
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

        <div
          className={`${showFilters ? "grid" : "hidden"} sm:grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3 transition-all duration-300 ease-in-out`}
        >
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Plan</label>
            <select
              value={planEventFilters.plan}
              onChange={(e) => setPlanEventFilters(prev => ({ ...prev, plan: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Plans</option>
              {planOptions.map(planOption => (
                <option key={planOption.value} value={planOption.value}>{planOption.value}</option>
              ))}
            </select>
          </div>

          {/* <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Team</label>
            <select
              value={planEventFilters.team}
              onChange={(e) => setPlanEventFilters(prev => ({ ...prev, team: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Teams</option>
              {branchOptions.map(branchOption => (
                <option key={branchOption.id} value={branchOption.value}>{branchOption.value}</option>
              ))}
            </select>
          </div> */}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Employee</label>
            <select
              value={planEventFilters.employeeName}
              onChange={(e) => setPlanEventFilters(prev => ({ ...prev, employeeName: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Employees</option>
              {employeeOptions.map(emp => (
                <option key={emp.id} value={emp.value}>{emp.value}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Client</label>
            <select
              value={planEventFilters.client}
              onChange={(e) => setPlanEventFilters(prev => ({ ...prev, client: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Clients</option>
              {clientOptions.map(client => (
                <option key={client.id} value={client.value}>{client.value}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">City</label>
            <select
              value={planEventFilters.city}
              onChange={(e) => setPlanEventFilters(prev => ({ ...prev, city: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Cities</option>
              {cityOptions.map(city => (
                <option key={city.id} value={city.value}>{city.value}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={resetPlanEventFilters}
              className="px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-xs"
            >
              Clear Filters
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
              value={planEventsPerPage}
              onChange={(e) => handlePlanEventsPageSizeChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
            >
              {[10, 25, 50, 100].map(size => (
                <option key={size} value={size}>{`${size} entries`}</option>
              ))}
            </select>
          </div>

          <div className="text-xs text-gray-600">
            Showing {filteredPlanEvents.length ? `${planEventsStartIndex + 1}-${planEventsEndIndex}` : '0-0'} of {filteredPlanEvents.length} entries
          </div>

          <div className="flex items-center">
            <input
              type="text"
              value={planEventsSearchTerm}
              onChange={(e) => handlePlanEventsSearchChange(e.target.value)}
              placeholder="Search..."
              className="w-full md:w-64 px-3 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto overflow-y-auto scrollbar-desktop max-h-[calc(100vh-300px)]">
        <table className="min-w-full divide-y divide-gray-200">
          {/* Table Header */}
          <thead className="bg-white sticky top-0 z-10 border">
            <tr>
              <th className="px-1.5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                S.No
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Call Plan
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Call Others
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Profile Plan
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Profile Others
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Remarks
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          {/* Table Body */}
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedPlanEvents.map((event, index) => (
              <tr
                key={event.id || index}
                className="hover:bg-gray-50 transition-colors"
                onClick={() => handleEventClick(event)}
              >
                {/* S.No */}
                <td className="px-1 py-1 text-center text-sm text-gray-500">
                  {(planEventsCurrentPage - 1) * planEventsPerPage + index + 1}
                </td>
                {/* Plan */}
                <td className="px-2 py-1">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getPlanColor(event.plan || event.tb_call_plan_data || plan)}`} />
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">
                        {event.plan || event.plan_name || event.tb_call_plan_data || plan}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {event.plan_date && event.plan_date !== 'N/A'
                          ? new Date(event.plan_date).toLocaleDateString('en-GB')
                          : 'N/A'
                        }
                      </div>
                    </div>
                  </div>
                </td>
                {/* Employee */}
                <td className="px-4 py-1">
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">
                      {event.employeeName || event.employee_name || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {`${getEmployeeCode(event)} • ${event.branch || event.branch_name || 'N/A'}`}
                    </div>
                  </div>
                </td>
                {/* Client */}
                <td className="px-4 py-1">
                  <div>
                    <div className="font-semibold text-gray-900 text-xs">
                      {event.clientName || event.client_name || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span>{`${getCityName(event)}${(getStateName(event) && getStateName(event) !== 'N/A') ? `, ${getStateName(event)}` : ''}`}</span>
                    </div>
                  </div>
                </td>
                {/* Source */}
                <td className="px-4 py-1">
                  <div className="text-xs text-gray-900">
                    {getSourceName(event)}
                  </div>
                </td>
                {/* Call Plan */}
                <td className="px-2 py-1 text-center">
                  <div 
                    className="font-bold text-blue-600 text-sm cursor-pointer hover:bg-blue-50 rounded px-2 py-1 transition-colors"
                    onClick={() => handleStatsClick(event, 'callsOnPlan')}
                    title="Click to view candidates"
                  >
                    {event.callsOnPlan || 0}
                  </div>
                </td>
                {/* Call Others */}
                <td className="px-2 py-1 text-center">
                  <div 
                    className="font-bold text-green-600 text-sm cursor-pointer hover:bg-green-50 rounded px-2 py-1 transition-colors"
                    onClick={() => handleStatsClick(event, 'callsOnOthers')}
                    title="Click to view candidates"
                  >
                    {event.callsOnOthers || 0}
                  </div>
                </td>
                {/* Profile Plan */}
                <td className="px-2 py-1 text-center">
                  <div 
                    className="font-bold text-purple-600 text-sm cursor-pointer hover:bg-purple-50 rounded px-2 py-1 transition-colors"
                    onClick={() => handleStatsClick(event, 'profilesOnPlan')}
                    title="Click to view candidates"
                  >
                    {event.profilesOnPlan || 0}
                  </div>
                </td>
                {/* Profile Others */}
                <td className="px-2 py-1 text-center">
                  <div 
                    className="font-bold text-orange-600 text-sm cursor-pointer hover:bg-orange-50 rounded px-2 py-1 transition-colors"
                    onClick={() => handleStatsClick(event, 'profilesOnOthers')}
                    title="Click to view candidates"
                  >
                    {event.profilesOnOthers || 0}
                  </div>
                </td>
                {/* Remarks */}
                <td className="px-4 py-1">
                  <div className="text-xs text-gray-600 max-w-xs truncate">
                    {event.remarks || 'No remarks'}
                  </div>
                </td>
                {/* Actions */}
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

      {/* Pagination */}
      {planEventsTotalPages > 1 && (
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between px-2 py-1 bg-white mt-2 border-t border-gray-200 ">
          <div>
            <p className="text-xs  text-gray-700">
              Showing{' '}
              <span className="font-medium">
                {(planEventsCurrentPage - 1) * planEventsPerPage + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium">
                {Math.min(planEventsCurrentPage * planEventsPerPage, filteredPlanEvents.length)}
              </span>{' '}
              of <span className="font-medium">{filteredPlanEvents.length}</span>{' '}
              results
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-xs">
              <button
                onClick={() => handlePlanEventsPageChange(1)}
                disabled={planEventsCurrentPage === 1}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span className="sr-only">First</span>
                <ChevronLeft className="size-4" />
                <ChevronLeft className="size-4 -ml-2" />
              </button>
              <button
                onClick={() => handlePlanEventsPageChange(Math.max(1, planEventsCurrentPage - 1))}
                disabled={planEventsCurrentPage === 1}
                className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span className="sr-only">Previous</span>
                <ChevronLeft className="size-4" />
              </button>

              {(() => {
                const pages = [];
                const siblings = 1;
                const showLeftEllipsis = planEventsCurrentPage > siblings + 2;
                const showRightEllipsis =
                  planEventsCurrentPage < planEventsTotalPages - (siblings + 1);
                const startPage = Math.max(2, planEventsCurrentPage - siblings);
                const endPage = Math.min(
                  planEventsTotalPages - 1,
                  planEventsCurrentPage + siblings
                );

                pages.push(
                  <button
                    key={1}
                    onClick={() => handlePlanEventsPageChange(1)}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${planEventsCurrentPage === 1
                      ? 'z-10 bg-blue-600 text-white focus-visible:outline-blue-600'
                      : 'text-gray-900 ring-1 ring-gray-300 ring-inset hover:bg-gray-50'
                      }`}
                  >
                    1
                  </button>
                );

                if (showLeftEllipsis) {
                  pages.push(
                    <span
                      key="left-ellipsis"
                      className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-300 ring-inset"
                    >
                      ...
                    </span>
                  );
                }

                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <button
                      key={i}
                      onClick={() => handlePlanEventsPageChange(i)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${i === planEventsCurrentPage
                        ? 'z-10 bg-blue-600 text-white focus-visible:outline-blue-600'
                        : 'text-gray-900 ring-1 ring-gray-300 ring-inset hover:bg-gray-50'
                        }`}
                    >
                      {i}
                    </button>
                  );
                }

                if (showRightEllipsis) {
                  pages.push(
                    <span
                      key="right-ellipsis"
                      className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-300 ring-inset"
                    >
                      ...
                    </span>
                  );
                }

                if (planEventsTotalPages > 1) {
                  pages.push(
                    <button
                      key={planEventsTotalPages}
                      onClick={() => handlePlanEventsPageChange(planEventsTotalPages)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${planEventsCurrentPage === planEventsTotalPages
                        ? 'z-10 bg-blue-600 text-white focus-visible:outline-blue-600'
                        : 'text-gray-900 ring-1 ring-gray-300 ring-inset hover:bg-gray-50'
                        }`}
                    >
                      {planEventsTotalPages}
                    </button>
                  );
                }

                return pages;
              })()}

              <button
                onClick={() =>
                  handlePlanEventsPageChange(Math.min(planEventsTotalPages, planEventsCurrentPage + 1))
                }
                disabled={planEventsCurrentPage === planEventsTotalPages}
                className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span className="sr-only">Next</span>
                <ChevronRight className="size-4" />
              </button>
              <button
                onClick={() => handlePlanEventsPageChange(planEventsTotalPages)}
                disabled={planEventsCurrentPage === planEventsTotalPages}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span className="sr-only">Last</span>
                <ChevronRight className="size-4" />
                <ChevronRight className="size-4 -ml-2" />
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <EventFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingEvent(null);
        }}
        editingEvent={editingEvent}
        onSubmit={handleModalSubmit}
        dropdownOptions={dropdownOptions}
        isSubmitting={isSubmitting}
        existingEvents={selectedPlanEvents}
      />

      {/* Add Plan Modal */}
      <EventFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        editingEvent={null}
        onSubmit={handleAddModalSubmit}
        dropdownOptions={dropdownOptions}
        isSubmitting={isSubmitting}
        existingEvents={selectedPlanEvents}
      />

      {/* Candidate Stats Modal */}
      <CandidateStatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        statsType={selectedStatsType}
        eventData={selectedEventData}
        candidateIds={candidateIds}
      />

    </div>
  );
};

export default PlanEventsReport;
