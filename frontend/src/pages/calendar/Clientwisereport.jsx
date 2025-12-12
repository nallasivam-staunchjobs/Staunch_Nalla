import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar, X, Eye, ArrowLeft, Edit3, Plus, Building, Filter, ChevronUp, ChevronDown, MapPin, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import EventFormModal from './components/EventFormModal';
import { calendarAPI, mapDropdownData, getCallStatCount, getAuthHeaders } from './utils/calendarUtils';
import { useLocationDropdowns } from '../../hooks/useLocationDropdowns';
import { candidates } from '../../api/api';

const ClientwiseReport = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { locationData, getCitiesByState, getStatesByCountry } = useLocationDropdowns();

  // Get URL parameters and determine view type from URL path
  const currentPath = window.location.pathname;
  let viewType = searchParams.get('view') || 'month';

  // Since we removed the specific paths, just use query parameter

  const branchId = searchParams.get('branch');
  const planId = searchParams.get('plan'); ``
  const dateParam = searchParams.get('date'); // Get date parameter from URL
  const __today = new Date();
  const todayISO = `${__today.getFullYear()}-${String(__today.getMonth() + 1).padStart(2, '0')}-${String(__today.getDate()).padStart(2, '0')}`;
  const defaultDate = dateParam || todayISO;

  // State management
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    fromDate: defaultDate,
    toDate: defaultDate,
    state: '',
    city: '',
    selectedPlan: planId || '',
    selectedBranch: '',
    selectedBranchId: null,
    selectedTeam: '',
    selectedTeamId: null,
    selectedEmployee: '',
    selectedClient: ''
  });

  // Applied filters state
  const [appliedFilters, setAppliedFilters] = useState({
    fromDate: defaultDate,
    toDate: defaultDate,
    state: '',
    city: '',
    selectedPlan: planId || '',
    selectedBranch: '',
    selectedBranchId: null,
    selectedTeam: '',
    selectedTeamId: null,
    selectedEmployee: '',
    selectedClient: ''
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
    teams: [],
    user_level: null,
    filtering_applied: false
  });
  const [branchEventsCurrentPage, setBranchEventsCurrentPage] = useState(1);
  const [branchEventsPerPage, setBranchEventsPerPage] = useState(10);
  const [branchEventsSearchTerm, setBranchEventsSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeReport, setActiveReport] = useState('client'); // 'client' or 'employee'
  const [showJobRowsModal, setShowJobRowsModal] = useState(false);
  const [jobRows, setJobRows] = useState([]);
  const [jobRowsTitle, setJobRowsTitle] = useState('');

  const [clientStatusCounts, setClientStatusCounts] = useState({
    attended: 0,
    attendedActive: 0,
    attendedInactive: 0,
    selected: 0,
    rejected: 0,
    profileSubmitted: 0,
    profileSubmittedActive: 0,
    profileSubmittedInactive: 0,
    inProcess: 0,
    nextRound: 0,
    feedbackPending: 0,
    noShows: 0,
    others: 0
  });

  const [employeeStatusCounts, setEmployeeStatusCounts] = useState({
    attended: 0,
    attendedActive: 0,
    attendedInactive: 0,
    selected: 0,
    rejected: 0,
    profileSubmitted: 0,
    profileSubmittedActive: 0,
    profileSubmittedInactive: 0,
    inProcess: 0,
    nextRound: 0,
    feedbackPending: 0,
    noShows: 0,
    others: 0
  });

  // Rows returned by backend aggregated clientwise report
  // null = not yet loaded or error (use fallback from events/vendors)
  // []   = loaded successfully but no matching rows for current filters
  const [clientReportRows, setClientReportRows] = useState(null);
  // Rows returned by backend aggregated employeewise report
  const [employeeReportRows, setEmployeeReportRows] = useState([]);

  // Helper to get current counts based on active report
  const currentStatusCounts = activeReport === 'client' ? clientStatusCounts : employeeStatusCounts;



  // Generic input change handler
  const handleInputChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Handle ROW split click: open backend job-rows URL in a new tab (no modal)
  const handleRowSplitClick = async (row, statsType, status) => {
    try {
      const fromDate = appliedFilters.fromDate || '';
      const toDate = appliedFilters.toDate || '';
      const selectedState = appliedFilters.state || filters.state || '';
      const selectedCity = appliedFilters.city || filters.city || '';
      const isEmployeeView = activeReport === 'employee';

      const filtersForApi = {
        from_date: fromDate,
        to_date: toDate,
        transfer_status: status,
        date_field: 'updated_at',
      };

      if (statsType === 'profileSubmitted') {
        filtersForApi.profile_submission = 1;
      } else if (statsType === 'attended') {
        filtersForApi.attend = 1;
      } else {
        return;
      }

      // Context filters
      if (row?.client_name) filtersForApi.client = row.client_name;
      if (isEmployeeView) {
        const exec = row?.employee_code || row?.employee_name;
        if (exec) filtersForApi.executive = exec;
        // Owner scope: previous for Transfer, current for Ongoing
        filtersForApi.owner_by = (String(status).toLowerCase() === 'inactive') ? 'previous' : 'current';
      }
      if (selectedState) filtersForApi.state = selectedState;
      if (selectedCity) filtersForApi.city = selectedCity;

      // Build URL and open a new tab to backend endpoint (raw JSON/table if server renders)
      const params = new URLSearchParams();
      Object.keys(filtersForApi).forEach((k) => {
        const v = filtersForApi[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') params.append(k, v);
      });
      if (!params.has('all')) params.append('all', 'true');
      const url = `/job-rows-report?${params.toString()}`;
      window.open(url, '_blank');
    } catch (err) {
      console.error('Error fetching row split candidates', err);
    }
  };

  // Handle header split click for Active/Inactive under a header stat (e.g., Profile Submitted)
  const handleHeaderSplitClick = async (statsType, status) => {
    try {
      const fromDate = appliedFilters.fromDate || '';
      const toDate = appliedFilters.toDate || '';
      const selectedClient = appliedFilters.selectedClient || filters.selectedClient || '';
      const selectedState = appliedFilters.state || filters.state || '';
      const selectedCity = appliedFilters.city || filters.city || '';
      const isEmployeeView = activeReport === 'employee';

      const filtersForApi = {
        from_date: fromDate,
        to_date: toDate,
        transfer_status: status, // 'Active' | 'Inactive'
      };

      if (statsType === 'profileSubmitted') {
        filtersForApi.profile_submission = 1;
      } else if (statsType === 'attended') {
        filtersForApi.attend = 1;
      } else {
        return;
      }

      if (selectedClient) filtersForApi.client = selectedClient;
      if (isEmployeeView) {
        // In Employee view header, we want owner scope only, across all employees
        filtersForApi.owner_by = (String(status).toLowerCase() === 'inactive') ? 'previous' : 'current';
      }
      if (selectedState) filtersForApi.state = selectedState;
      if (selectedCity) filtersForApi.city = selectedCity;

      // Route to job-rows-report for both profileSubmitted and attended (consistent UX)
      const params = new URLSearchParams();
      Object.keys(filtersForApi).forEach((k) => {
        const v = filtersForApi[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') params.append(k, v);
      });
      if (!params.has('all')) params.append('all', 'true');
      const url = `/job-rows-report?${params.toString()}`;
      window.open(url, '_blank');
    } catch (err) {
      console.error('Error fetching header split candidates', err);
    }
  };

  // Reset dependent filters when branch changes
  const handleBranchChange = (value) => {
    const brs = dropdownOptions.branches || [];
    const norm = (s) => String(s || '').trim().toLowerCase();
    const v = norm(value);
    if (!v) {
      setFilters(prev => ({ ...prev, selectedBranch: '', selectedBranchId: null, selectedTeam: '', selectedTeamId: null, selectedEmployee: '' }));
      return;
    }
    const matched = brs.find(b => {
      const arr = [b?.label, b?.name, b?.branch_name, b?.value, b?.code, b?.branchcode, b?.branch_code].map(norm);
      return arr.some(x => x && x === v);
    });
    const branchId = matched?.id ?? matched?.value ?? null;
    setFilters(prev => ({ ...prev, selectedBranch: value, selectedBranchId: branchId, selectedTeam: '', selectedTeamId: null, selectedEmployee: '' }));
  };

  const handleTeamChange = (value) => {
    // value is team name from teamOptions; find its id
    const t = (dropdownOptions.teams || []).find(tm => {
      const tname = (tm.name || tm.label || tm.value || '').toString().trim().toLowerCase();
      return tname === String(value || '').trim().toLowerCase();
    });
    const teamId = t?.id ?? null;
    setFilters(prev => ({ ...prev, selectedTeam: value, selectedTeamId: teamId, selectedEmployee: '' }));
  };


  // Handle header total click for a status across current filters
  const handleHeaderStatsClick = async (statsType) => {
    try {
      const fromDate = appliedFilters.fromDate || '';
      const toDate = appliedFilters.toDate || '';
      const selectedClient = appliedFilters.selectedClient || filters.selectedClient || '';
      const selectedState = appliedFilters.state || filters.state || '';
      const selectedCity = appliedFilters.city || filters.city || '';

      if (statsType === 'profileSubmitted') {
        const filtersForApi = {
          from_date: fromDate,
          to_date: toDate,
          profile_submission: 1,
        };
        if (selectedClient) filtersForApi.client = selectedClient;
        if (selectedState) filtersForApi.state = selectedState;
        if (selectedCity) filtersForApi.city = selectedCity;

        const list = await candidates.getAllCandidatesProgressive(filtersForApi);
        const candidateIds = (Array.isArray(list) ? list : []).map(c => c.id).filter(Boolean);
        const ctx = { employee_name: selectedClient || 'All Clients', client_name: selectedClient || 'All Clients' };
        openCandidateTableInNewTab(statsType, ctx, candidateIds);
        return;
      }

      if (statsType === 'attended') {
        const filtersForApi = {
          from_date: fromDate,
          to_date: toDate,
          attend: 1,
        };
        if (selectedClient) filtersForApi.client = selectedClient;
        if (selectedState) filtersForApi.state = selectedState;
        if (selectedCity) filtersForApi.city = selectedCity;

        const list = await candidates.getAllCandidatesProgressive(filtersForApi);
        const candidateIds = (Array.isArray(list) ? list : []).map(c => c.id).filter(Boolean);
        const ctx = { employee_name: selectedClient || 'All Clients', client_name: selectedClient || 'All Clients' };
        openCandidateTableInNewTab(statsType, ctx, candidateIds);
        return;
      }

      if (statsType === 'selected') {
        const filtersForApi = {
          from_date: fromDate,
          to_date: toDate,
          remark: 'Selected',
          include_history: 0,
        };
        if (selectedClient) filtersForApi.client = selectedClient;
        if (selectedState) filtersForApi.state = selectedState;
        if (selectedCity) filtersForApi.city = selectedCity;

        const list = await candidates.getAllCandidatesProgressive(filtersForApi);
        const candidateIds = (Array.isArray(list) ? list : []).map(c => c.id).filter(Boolean);
        const ctx = { employee_name: selectedClient || 'All Clients', client_name: selectedClient || 'All Clients' };
        openCandidateTableInNewTab(statsType, ctx, candidateIds);
        return;
      }

      if (statsType === 'rejected') {
        const filtersForApi = {
          from_date: fromDate,
          to_date: toDate,
          remark: 'Rejected',
          include_history: 0,
        };
        if (selectedClient) filtersForApi.client = selectedClient;
        if (selectedState) filtersForApi.state = selectedState;
        if (selectedCity) filtersForApi.city = selectedCity;

        const list = await candidates.getAllCandidatesProgressive(filtersForApi);
        const candidateIds = (Array.isArray(list) ? list : []).map(c => c.id).filter(Boolean);
        const ctx = { employee_name: selectedClient || 'All Clients', client_name: selectedClient || 'All Clients' };
        openCandidateTableInNewTab(statsType, ctx, candidateIds);
        return;
      }

      if (statsType === 'feedbackPending') {
        const filtersForApi = {
          from_date: fromDate,
          to_date: toDate,
          remark: 'Feedback Pending',
          include_history: 0,
        };
        if (selectedClient) filtersForApi.client = selectedClient;
        if (selectedState) filtersForApi.state = selectedState;
        if (selectedCity) filtersForApi.city = selectedCity;

        const list = await candidates.getAllCandidatesProgressive(filtersForApi);
        const candidateIds = (Array.isArray(list) ? list : []).map(c => c.id).filter(Boolean);
        const ctx = { employee_name: selectedClient || 'All Clients', client_name: selectedClient || 'All Clients' };
        openCandidateTableInNewTab(statsType, ctx, candidateIds);
        return;
      }

      if (statsType === 'nextRound') {
        const filtersForApi = {
          from_date: fromDate,
          to_date: toDate,
          remark: 'Next Round',
          include_history: 0,
        };
        if (selectedClient) filtersForApi.client = selectedClient;
        if (selectedState) filtersForApi.state = selectedState;
        if (selectedCity) filtersForApi.city = selectedCity;

        const list = await candidates.getAllCandidatesProgressive(filtersForApi);
        const candidateIds = (Array.isArray(list) ? list : []).map(c => c.id).filter(Boolean);
        const ctx = { employee_name: selectedClient || 'All Clients', client_name: selectedClient || 'All Clients' };
        openCandidateTableInNewTab(statsType, ctx, candidateIds);
        return;
      }

      if (statsType === 'inProcess') {
        const filtersForApi = {
          from_date: fromDate,
          to_date: toDate,
          remark: 'In Process',
          include_history: 0,
        };
        if (selectedClient) filtersForApi.client = selectedClient;
        if (selectedState) filtersForApi.state = selectedState;
        if (selectedCity) filtersForApi.city = selectedCity;

        const list = await candidates.getAllCandidatesProgressive(filtersForApi);
        const candidateIds = (Array.isArray(list) ? list : []).map(c => c.id).filter(Boolean);
        const ctx = { employee_name: selectedClient || 'All Clients', client_name: selectedClient || 'All Clients' };
        openCandidateTableInNewTab(statsType, ctx, candidateIds);
        return;
      }

      if (statsType === 'noShow') {
        const filtersForApi = {
          from_date: fromDate,
          to_date: toDate,
          remark: 'No Show',
          include_history: 0,
        };
        if (selectedClient) filtersForApi.client = selectedClient;
        if (selectedState) filtersForApi.state = selectedState;
        if (selectedCity) filtersForApi.city = selectedCity;

        const list = await candidates.getAllCandidatesProgressive(filtersForApi);
        const candidateIds = (Array.isArray(list) ? list : []).map(c => c.id).filter(Boolean);
        const ctx = { employee_name: selectedClient || 'All Clients', client_name: selectedClient || 'All Clients' };
        openCandidateTableInNewTab(statsType, ctx, candidateIds);
        return;
      }

      if (statsType === 'others') {
        const excludeRemarks = [
          'Selected', 'Rejected', 'Feedback Pending',
          'Next Round', 'In Process', 'No Show'
        ];
        const filtersForApi = {
          from_date: fromDate,
          to_date: toDate,
          exclude_remarks: excludeRemarks.join(','),
        };
        if (selectedClient) filtersForApi.client = selectedClient;
        if (selectedState) filtersForApi.state = selectedState;
        if (selectedCity) filtersForApi.city = selectedCity;

        const list = await candidates.getAllCandidatesProgressive(filtersForApi);
        const candidateIds = (Array.isArray(list) ? list : []).map(c => c.id).filter(Boolean);
        const ctx = { employee_name: selectedClient || 'All Clients', client_name: selectedClient || 'All Clients' };
        openCandidateTableInNewTab(statsType, ctx, candidateIds);
        return;
      }
    } catch (err) {
      console.error('Error fetching header candidates', err);
    }
  };

  // Load backend aggregated clientwise report (maps snake_case -> camelCase used by table)
  const loadClientwiseReport = async () => {
    try {
      const params = {};
      // Prefer applied filters, fallback to current filters
      const from = appliedFilters.fromDate || filters.fromDate;
      const to = appliedFilters.toDate || filters.toDate;
      if (from && to) {
        params.start_date = from;
        params.end_date = to;
      }
      if (appliedFilters.selectedClient || filters.selectedClient) {
        params.client = appliedFilters.selectedClient || filters.selectedClient;
      }
      if (appliedFilters.state || filters.state) {
        params.state = appliedFilters.state || filters.state;
      }
      if (appliedFilters.city || filters.city) {
        params.city = appliedFilters.city || filters.city;
      }

      // New: add branch/team/executive filters for Client tab
      if (appliedFilters.selectedBranchId) {
        params.branch = appliedFilters.selectedBranchId;
      } else if (appliedFilters.selectedBranch) {
        params.branch = appliedFilters.selectedBranch;
      }
      if (appliedFilters.selectedTeamId) {
        params.team_id = appliedFilters.selectedTeamId;
      } else if (appliedFilters.selectedTeam) {
        params.team = appliedFilters.selectedTeam;
      }
      if (appliedFilters.selectedEmployee || filters.selectedEmployee) {
        const sel = appliedFilters.selectedEmployee || filters.selectedEmployee;
        const list = Array.isArray(dropdownOptions.employees) ? dropdownOptions.employees : [];
        const found = list.find(e => {
          const v = String(e.value || '').trim().toLowerCase();
          const l = String(e.label || '').trim().toLowerCase();
          const c = String(e.employeeCode || '').trim().toLowerCase();
          const s = String(sel || '').trim().toLowerCase();
          return v === s || l === s || (c && c === s);
        });
        if (found && found.employeeCode) {
          params.executive = found.employeeCode;
        }
      }

      const data = await calendarAPI.getClientwiseReport(params);
      const rows = (Array.isArray(data) ? data : []).map(r => ({
        id: r.client_name,
        client_name: r.client_name,
        profileSubmitted: r.profile_submitted || 0,
        profileSubmittedActive: r.profile_submitted_active || 0,
        profileSubmittedInactive: r.profile_submitted_inactive || 0,
        attended: r.attended_count || 0,
        attendedActive: r.attended_active || 0,
        attendedInactive: r.attended_inactive || 0,
        selected: r.selected || 0,
        rejected: r.rejected || 0,
        feedbackPending: r.feedback_pending || 0,
        nextRound: r.next_round || 0,
        inProcess: r.in_process || 0,
        noShows: r.no_show || 0,
        others: r.others || 0
      }));
      setClientReportRows(rows);
    } catch (error) {
      console.error('Error loading clientwise report:', error);
      // On error, fall back to client list/events grouping logic
      setClientReportRows(null);
    }
  };

  // Load backend aggregated employeewise report
  const loadEmployeewiseReport = async () => {
    try {
      const params = {};
      const from = appliedFilters.fromDate || filters.fromDate;
      const to = appliedFilters.toDate || filters.toDate;
      if (from && to) {
        params.start_date = from;
        params.end_date = to;
      }
      // Branch/Team filters (same mapping as clientwise) - use appliedFilters
      if (appliedFilters.selectedBranchId) {
        params.branch = appliedFilters.selectedBranchId;
      } else if (appliedFilters.selectedBranch) {
        params.branch = appliedFilters.selectedBranch;
      }
      if (appliedFilters.selectedTeamId) {
        params.team_id = appliedFilters.selectedTeamId;
      } else if (appliedFilters.selectedTeam) {
        params.team = appliedFilters.selectedTeam;
      }
      if (appliedFilters.selectedClient || filters.selectedClient) {
        params.client = appliedFilters.selectedClient || filters.selectedClient;
      }
      if (appliedFilters.state || filters.state) {
        params.state = appliedFilters.state || filters.state;
      }
      if (appliedFilters.city || filters.city) {
        params.city = appliedFilters.city || filters.city;
      }
      if (appliedFilters.selectedEmployee || filters.selectedEmployee) {
        const sel = appliedFilters.selectedEmployee || filters.selectedEmployee;
        const list = Array.isArray(dropdownOptions.employees) ? dropdownOptions.employees : [];
        const found = list.find(e => {
          const v = String(e.value || '').trim().toLowerCase();
          const l = String(e.label || '').trim().toLowerCase();
          const c = String(e.employeeCode || '').trim().toLowerCase();
          const s = String(sel || '').trim().toLowerCase();
          return v === s || l === s || (c && c === s);
        });
        if (found && found.employeeCode) {
          params.executive = found.employeeCode;
        }
      }

      const data = await calendarAPI.getEmployeewiseReport(params);
      const rows = (Array.isArray(data) ? data : []).map(r => ({
        id: r.employee_code || r.employee_name,
        employee_code: r.employee_code,
        employee_name: r.employee_name,
        clients: Array.isArray(r.clients) ? r.clients : [],
        profileSubmitted: r.profile_submitted || r.profile_submission_count || 0,
        profileSubmittedActive: r.profile_submitted_active || 0,
        profileSubmittedInactive: r.profile_submitted_inactive || 0,
        attended: r.attended_count || 0,
        attendedActive: r.attended_active || 0,
        attendedInactive: r.attended_inactive || 0,
        selected: r.selected || 0,
        rejected: r.rejected || 0,
        feedbackPending: r.feedback_pending || 0,
        nextRound: r.next_round || 0,
        inProcess: r.in_process || 0,
        noShows: r.no_show || 0,
        others: r.others || 0
      }));
      setEmployeeReportRows(rows);
    } catch (error) {
      console.error('Error loading employeewise report:', error);
      setEmployeeReportRows([]);
    }
  };

  // Auto-load backend report whenever filters are applied in Client tab
  useEffect(() => {
    if (activeReport === 'client') {
      loadClientwiseReport();
    }
  }, [activeReport, appliedFilters]);

  // Auto-load backend report whenever filters are applied in Employee tab
  useEffect(() => {
    if (activeReport === 'employee') {
      loadEmployeewiseReport();
    }
  }, [activeReport, appliedFilters]);

  // State change handler that resets city when state changes
  const handleStateChange = (value) => {
    setFilters(prev => ({ ...prev, state: value, city: '' }));
  };

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
      const [data, vendorsRes, teamsRes, branchesRes, employeesRes] = await Promise.all([
        calendarAPI.getDropdownOptions(),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/vendors/vendors/`, { headers: getAuthHeaders() }),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/masters/teams/`, { headers: getAuthHeaders() }),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/masters/branches/`, { headers: getAuthHeaders() }),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/empreg/employees/`, { headers: getAuthHeaders() })
      ]);

      const mapped = mapDropdownData(data);

      let vendorOptions = [];
      if (vendorsRes && vendorsRes.ok) {
        const vendors = await vendorsRes.json();
        vendorOptions = Array.isArray(vendors) ? vendors.map(v => ({
          id: v.id,
          value: v.vendor_name,
          label: v.vendor_name,
          ...v
        })) : [];
      }

      let teams = [];
      if (teamsRes && teamsRes.ok) {
        const tjson = await teamsRes.json();
        teams = Array.isArray(tjson) ? tjson : (Array.isArray(tjson?.results) ? tjson.results : []);
      }

      let branches = [];
      if (branchesRes && branchesRes.ok) {
        const bjson = await branchesRes.json();
        branches = Array.isArray(bjson) ? bjson : (Array.isArray(bjson?.results) ? bjson.results : []);
      }

      let employees = [];
      if (employeesRes && employeesRes.ok) {
        const ejson = await employeesRes.json();
        const elist = Array.isArray(ejson) ? ejson : (Array.isArray(ejson?.results) ? ejson.results : []);
        employees = elist
          .filter(emp => {
            const status = String(emp.status || emp.Status || '').toLowerCase();
            const level = String(emp.level || '').toUpperCase();
            return status === 'active' && (level === 'L1' || level === 'L2' || level === 'L3');
          })
          .map(emp => {
            const full = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
            const name = full || emp.name || emp.employee_name || emp.employeeCode || 'Employee';
            const employeeCode = emp.employeeCode || emp.emp_code || emp.empcode || emp.employee_code || '';

            // Derive branch info from various shapes
            let branchId = null, branchCode = null, branchName = null;
            const b = emp?.branch;
            if (b && typeof b === 'object') {
              branchId = b.id ?? b.pk ?? null;
              branchCode = (b.code ?? b.branchcode ?? b.branch_code ?? null);
              branchName = (b.name ?? b.branch_name ?? null);
            } else if (typeof b === 'number') {
              branchId = b;
            } else if (typeof b === 'string') {
              branchName = b;
            }
            if (branchId == null) branchId = emp?.branch_id ?? null;
            if (branchCode == null) branchCode = emp?.branch_code ?? emp?.branchCode ?? null;
            if (branchName == null) branchName = emp?.branch_name ?? emp?.branchName ?? null;

            return {
              id: emp.id,
              value: name,
              label: name,
              status: emp.status || emp.Status || '',
              level: emp.level || '',
              branchId,
              branchCode,
              branchName,
              employeeCode
            };
          });
      }

      const merged = {
        ...mapped,
        clients: vendorOptions.length ? vendorOptions : (mapped.clients || []),
        teams,
        branches: branches.length ? branches : (mapped.branches || []),
        employees: employees.length ? employees : (mapped.employees || [])
      };

      setDropdownOptions(merged);

      // Initialize with some mock data if needed
      if (!merged.states || merged.states.length === 0) {
        setDropdownOptions(prev => ({
          ...prev,
          states: [
            { id: 1, state: 'Karnataka', value: 'Karnataka' },
            { id: 2, state: 'Maharashtra', value: 'Maharashtra' },
            { id: 3, state: 'Tamil Nadu', value: 'Tamil Nadu' }
          ],
          cities: [
            { id: 1, city: 'Bangalore', state_id: 1, value: 'Bangalore' },
            { id: 2, city: 'Mysore', state_id: 1, value: 'Mysore' },
            { id: 3, city: 'Mumbai', state_id: 2, value: 'Mumbai' },
            { id: 4, city: 'Pune', state_id: 2, value: 'Pune' },
            { id: 5, city: 'Chennai', state_id: 3, value: 'Chennai' },
            { id: 6, city: 'Coimbatore', state_id: 3, value: 'Coimbatore' }
          ]
        }));
      }
    } catch (error) {
      console.error('Error loading dropdown options:', error);
      // Set default options in case of error
      setDropdownOptions(prev => ({
        ...prev,
        states: [
          { id: 1, state: 'Karnataka', value: 'Karnataka' },
          { id: 2, state: 'Maharashtra', value: 'Maharashtra' }
        ],
        cities: [
          { id: 1, city: 'Bangalore', state_id: 1, value: 'Bangalore' },
          { id: 2, city: 'Mysore', state_id: 1, value: 'Mysore' },
          { id: 3, city: 'Mumbai', state_id: 2, value: 'Mumbai' },
          { id: 4, city: 'Pune', state_id: 2, value: 'Pune' }
        ]
      }));
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
      if (appliedFilters.selectedBranch && (event.branch || event.branch_name) !== appliedFilters.selectedBranch) return false;
      if (appliedFilters.state && event.state_name !== appliedFilters.state) return false;
      if (appliedFilters.city && event.city_name !== appliedFilters.city) return false;

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

  // Calculate counts for each status
  const statusCounts = useMemo(() => {
    return filteredEvents.reduce((acc, event) => {
      acc.selected = (acc.selected || 0) + (event.selected || 0);
      acc.inProcess = (acc.inProcess || 0) + (event.inProcess || 0);
      acc.nextRound = (acc.nextRound || 0) + (event.nextRound || 0);
      acc.feedbackPending = (acc.feedbackPending || 0) + (event.feedbackPending || 0);
      acc.noShows = (acc.noShows || 0) + (event.noShows || 0);
      acc.rejected = (acc.rejected || 0) + (event.rejected || 0);
      return acc;
    }, {});
  }, [filteredEvents]);

  // Build client list rows (unique clients) when viewing Client report
  const tableRows = useMemo(() => {
    if (activeReport === 'employee') return employeeReportRows;

    // If backend rows are available (including empty array), use them directly.
    // This allows the UI to show "no data" when API returns 0 rows for filters.
    if (Array.isArray(clientReportRows)) return clientReportRows;

    // Fallback: build from filtered events (client grouping)
    const vendorList = (dropdownOptions.clients || [])
      .map(v => ({ id: v.id ?? v.value, name: v.vendor_name ?? v.label ?? v.name ?? v.value }))
      .filter(v => v.name);
    const nameSet = new Set(vendorList.map(v => v.name));
    filteredEvents.forEach(e => {
      const n = e.client_name || e.clientName;
      if (n) nameSet.add(n);
    });
    const names = Array.from(nameSet);
    const sumFor = (arr, key) => arr.reduce((acc, it) => acc + (Number(it?.[key]) || 0), 0);

    return names.map((name) => {
      const matches = filteredEvents.filter(e => (e.client_name || e.clientName) === name);
      const loc = matches.find(e => e.city || e.city_name || e.state || e.state_name) || {};
      return {
        id: vendorList.find(v => v.name === name)?.id || name,
        client_name: name,
        city: loc.city,
        city_name: loc.city_name,
        state: loc.state,
        state_name: loc.state_name,
        profileSubmitted: sumFor(matches, 'profileSubmitted'),
        profileSubmittedActive: 0,
        profileSubmittedInactive: 0,
        attended: sumFor(matches, 'attended'),
        selected: sumFor(matches, 'selected'),
        rejected: sumFor(matches, 'rejected'),
        feedbackPending: sumFor(matches, 'feedbackPending'),
        nextRound: sumFor(matches, 'nextRound'),
        inProcess: sumFor(matches, 'inProcess'),
        noShows: sumFor(matches, 'noShows') || sumFor(matches, 'noShow')
      };
    });
  }, [activeReport, filteredEvents, dropdownOptions.clients, clientReportRows, employeeReportRows]);

  // Apply table search on aggregated rows for both Client and Employee reports
  const displayRows = useMemo(() => {
    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const q = norm(branchEventsSearchTerm || '');
    if (!q) return tableRows;
    if (activeReport === 'client') {
      return tableRows.filter(r => norm(r.client_name).includes(q));
    }
    // employee view: match employee name/code or any client in their list
    return tableRows.filter(r => {
      const base = norm(`${r.employee_name || ''}${r.employee_code || ''}`);
      if (base.includes(q)) return true;
      if (Array.isArray(r.clients)) {
        return r.clients.some(c => norm(c).includes(q));
      }
      return false;
    });
  }, [tableRows, branchEventsSearchTerm, activeReport]);

  // Update header totals for Client tab based on the visible table rows
  useEffect(() => {
    if (activeReport !== 'client') return;
    const sums = displayRows.reduce((acc, r) => ({
      profileSubmitted: acc.profileSubmitted + (r.profileSubmitted || 0),
      profileSubmittedActive: acc.profileSubmittedActive + (r.profileSubmittedActive || 0),
      profileSubmittedInactive: acc.profileSubmittedInactive + (r.profileSubmittedInactive || 0),
      attended: acc.attended + (r.attended || 0),
      attendedActive: acc.attendedActive + (r.attendedActive || 0),
      attendedInactive: acc.attendedInactive + (r.attendedInactive || 0),
      selected: acc.selected + (r.selected || 0),
      rejected: acc.rejected + (r.rejected || 0),
      feedbackPending: acc.feedbackPending + (r.feedbackPending || 0),
      nextRound: acc.nextRound + (r.nextRound || 0),
      inProcess: acc.inProcess + (r.inProcess || 0),
      noShows: acc.noShows + (r.noShows || 0),
      others: acc.others + (r.others || 0)
    }), { profileSubmitted: 0, profileSubmittedActive: 0, profileSubmittedInactive: 0, attended: 0, attendedActive: 0, attendedInactive: 0, selected: 0, rejected: 0, feedbackPending: 0, nextRound: 0, inProcess: 0, noShows: 0, others: 0 });

    setClientStatusCounts(sums);
  }, [activeReport, displayRows]);

  // Update header totals for Employee tab based on the loaded employee rows
  useEffect(() => {
    if (activeReport !== 'employee') return;
    const sums = displayRows.reduce((acc, r) => ({
      profileSubmitted: acc.profileSubmitted + (r.profileSubmitted || 0),
      profileSubmittedActive: acc.profileSubmittedActive + (r.profileSubmittedActive || 0),
      profileSubmittedInactive: acc.profileSubmittedInactive + (r.profileSubmittedInactive || 0),
      attended: acc.attended + (r.attended || 0),
      attendedActive: acc.attendedActive + (r.attendedActive || 0),
      attendedInactive: acc.attendedInactive + (r.attendedInactive || 0),
      selected: acc.selected + (r.selected || 0),
      rejected: acc.rejected + (r.rejected || 0),
      feedbackPending: acc.feedbackPending + (r.feedbackPending || 0),
      nextRound: acc.nextRound + (r.nextRound || 0),
      inProcess: acc.inProcess + (r.inProcess || 0),
      noShows: acc.noShows + (r.noShows || 0),
      others: acc.others + (r.others || 0)
    }), { profileSubmitted: 0, profileSubmittedActive: 0, profileSubmittedInactive: 0, attended: 0, attendedActive: 0, attendedInactive: 0, selected: 0, rejected: 0, feedbackPending: 0, nextRound: 0, inProcess: 0, noShows: 0, others: 0 });

    setEmployeeStatusCounts(sums);
  }, [activeReport, displayRows]);

  const branchEventsStartIndex = (branchEventsCurrentPage - 1) * branchEventsPerPage;
  const branchEventsEndIndex = Math.min(branchEventsStartIndex + branchEventsPerPage, displayRows.length);
  const paginatedBranchEvents = useMemo(() => {
    const startIndex = (branchEventsCurrentPage - 1) * branchEventsPerPage;
    return displayRows.slice(startIndex, startIndex + branchEventsPerPage);
  }, [displayRows, branchEventsCurrentPage, branchEventsPerPage]);
  const branchEventsTotalPages = Math.ceil(displayRows.length / branchEventsPerPage);

  // Group events by branch
  const planOptions = useMemo(() => {
    const plans = [...new Set(events.map(event => event.tb_call_plan_data || event.plan_name || event.plan).filter(Boolean))];
    return plans.map(p => ({ value: p, label: p }));
  }, [events]);

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
    const branches = [...new Set(events.map(event => event.branch || event.branch_name).filter(Boolean))];
    return branches.map(b => ({ id: b, value: b, label: b }));
  }, [dropdownOptions.branches, events]);

  // Teams filtered by selected branch
  const teamOptions = useMemo(() => {
    const teamsRaw = (dropdownOptions.teams || []);
    const selectedBranchStr = (filters.selectedBranch || '').toString().trim().toLowerCase();

    // Resolve selected branch id using dropdownOptions.branches
    const brs = dropdownOptions.branches || [];
    const selBranchObj = brs.find(b => [b?.label, b?.name, b?.branch_name, b?.value, b?.code, b?.branchcode, b?.branch_code]
      .map(v => String(v || '').trim().toLowerCase())
      .includes(selectedBranchStr));
    const selBranchId = (filters.selectedBranchId != null)
      ? filters.selectedBranchId
      : (selBranchObj?.id ?? selBranchObj?.value ?? null);
    const selNameLower = [selBranchObj?.name, selBranchObj?.branch_name, selBranchObj?.label, selBranchObj?.value]
      .map(v => (v != null ? String(v).trim().toLowerCase() : undefined))
      .find(Boolean);
    const selCodeLower = [selBranchObj?.code, selBranchObj?.branchcode, selBranchObj?.branch_code]
      .map(v => (v != null ? String(v).trim().toLowerCase() : undefined))
      .find(Boolean);

    const mappedTeams = teamsRaw.map(t => {
      const b = t?.branch;
      let branchId = null, branchCode = null, branchName = null;
      if (b && typeof b === 'object') {
        branchId = b.id ?? b.pk ?? null;
        branchCode = b.code ?? b.branchcode ?? b.branch_code ?? null;
        branchName = b.name ?? b.branch_name ?? null;
      } else if (typeof b === 'number') {
        branchId = b;
      } else if (typeof b === 'string') {
        if (/^\d+$/.test(b)) {
          branchId = Number(b);
        } else {
          // Could be a branch name like 'MADURAI' or a code like 'MDU'
          branchName = b;
          branchCode = b;
        }
      }
      if (branchId == null) branchId = t?.branch_id ?? null;
      if (branchCode == null) branchCode = t?.branch_code ?? t?.branchCode ?? null;
      if (branchName == null) branchName = t?.branch_name ?? t?.branchName ?? null;
      return {
        id: t.id,
        value: t.name,
        label: t.name,
        branchId,
        branchCode: branchCode ? String(branchCode).trim().toLowerCase() : undefined,
        branchName: branchName ? String(branchName).trim().toLowerCase() : undefined,
      };
    });

    if (!filters.selectedBranch) {
      return mappedTeams.map(t => ({ id: t.id, value: t.value, label: t.label }));
    }

    const selLower = selectedBranchStr;
    const filtered = mappedTeams.filter(t => {
      const matchId = (selBranchId != null && t.branchId != null && String(t.branchId) === String(selBranchId));
      const matchName = (t.branchName && ((selNameLower && t.branchName === selNameLower) || t.branchName === selLower));
      const matchCode = (t.branchCode && ((selCodeLower && t.branchCode === selCodeLower) || t.branchCode === selLower));
      return matchId || matchName || matchCode;
    });
    return filtered.map(t => ({ id: t.id, value: t.value, label: t.label }));
  }, [dropdownOptions.teams, dropdownOptions.branches, filters.selectedBranch]);

  const employeeOptions = useMemo(() => {
    const list = Array.isArray(dropdownOptions.employees) ? dropdownOptions.employees : [];
    // Keep only Active L1/L2/L3
    let filtered = list.filter(e => {
      const status = String(e.status || '').toLowerCase();
      const level = String(e.level || '').toUpperCase();
      return status === 'active' && (level === 'L1' || level === 'L2' || level === 'L3');
    });

    // If a Team is selected, further restrict to that team's employee IDs
    if (filters.selectedTeamId) {
      const team = (dropdownOptions.teams || []).find(t => String(t.id) === String(filters.selectedTeamId));
      const ids = team && Array.isArray(team.employees) ? new Set(team.employees.map(String)) : null;
      if (ids) {
        filtered = filtered.filter(emp => ids.has(String(emp.id)));
      }
    } else if (filters.selectedBranchId || filters.selectedBranch) {
      // Branch-only restriction when no team is selected
      const brs = dropdownOptions.branches || [];
      const selectedLower = String(filters.selectedBranch || '').trim().toLowerCase();
      const selObj = brs.find(b => [b?.label, b?.name, b?.branch_name, b?.value, b?.code, b?.branchcode, b?.branch_code]
        .map(v => String(v || '').trim().toLowerCase())
        .includes(selectedLower));

      const selId = (filters.selectedBranchId != null) ? filters.selectedBranchId : (selObj?.id ?? selObj?.value ?? null);
      const selName = [selObj?.name, selObj?.branch_name, selObj?.label, selObj?.value]
        .map(v => (v != null ? String(v).trim().toLowerCase() : undefined))
        .find(Boolean);
      const selCode = [selObj?.code, selObj?.branchcode, selObj?.branch_code]
        .map(v => (v != null ? String(v).trim().toLowerCase() : undefined))
        .find(Boolean);

      filtered = filtered.filter(emp => {
        const eName = emp.branchName ? String(emp.branchName).trim().toLowerCase() : undefined;
        const eCode = emp.branchCode ? String(emp.branchCode).trim().toLowerCase() : undefined;
        const matchId = (selId != null && emp.branchId != null && String(emp.branchId) === String(selId));
        const matchName = (selName && eName && eName === selName);
        const matchCode = (selCode && eCode && eCode === selCode);
        return matchId || matchName || matchCode;
      });
    }

    return filtered.map(emp => ({ id: emp.id || emp.value, value: emp.value || emp.label, label: emp.label || emp.value }));
  }, [dropdownOptions.employees, dropdownOptions.teams, dropdownOptions.branches, filters.selectedTeamId, filters.selectedBranchId, filters.selectedBranch]);

  const clientOptions = useMemo(() => {
    const liveClients = (dropdownOptions.clients || []).map(client => {
      const clientName = client.vendor_name ?? client.label ?? client.name ?? client.value ?? `Client ${client.id}`;
      return { id: client.id ?? client.value, value: clientName, label: clientName };
    });
    if (liveClients.length) return liveClients;
    const clients = [...new Set(events.map(event => event.client_name || event.clientName).filter(Boolean))];
    return clients.map(client => ({ id: client, value: client, label: client }));
  }, [dropdownOptions.clients, events]);

  const stateOptions = useMemo(() => {
    // Prefer hook-provided states (Masters) just like DataBank.jsx
    const hookStates = locationData.states || [];
    if (hookStates.length) return hookStates;

    // Fallback to existing dropdown/events-derived states
    const dropdownStates = (dropdownOptions.states || []).map(state =>
      state.state || state.label || state.value || state.name
    ).filter(Boolean);
    const eventStates = events.map(event => event.state || event.state_name).filter(Boolean);
    const allStates = [...new Set([...dropdownStates, ...eventStates])];
    return allStates.map(state => ({ id: state, value: state, label: state }));
  }, [locationData.states, dropdownOptions.states, events]);

  const cityOptions = useMemo(() => {
    // Prefer hook-provided cities filtered by selected state
    const hookCities = filters.state ? getCitiesByState(filters.state) : (locationData.cities || []);
    if (hookCities && hookCities.length) return hookCities;

    // Robust fallback using Masters state id/name when hook filter returns empty
    if (filters.state && (locationData.cities?.length || 0) > 0) {
      const selectedState = (locationData.states || []).find(s =>
        [s?.value, s?.label, s?.state]
          .map(v => String(v || '').trim().toLowerCase())
          .includes(String(filters.state || '').trim().toLowerCase())
      );
      if (selectedState) {
        const byId = locationData.cities.filter(c => String(c.state_id) === String(selectedState.id));
        if (byId.length) return byId;
        const byName = locationData.cities.filter(c => String(c.state || '').trim().toLowerCase() === String(filters.state || '').trim().toLowerCase());
        if (byName.length) return byName;
      }
    }

    // Fallback to existing dropdown/events-derived cities
    const dropdownCities = (dropdownOptions.cities || []).map(city =>
      city.city || city.label || city.value || city.name
    ).filter(Boolean);
    const eventCities = events.map(event => event.city || event.city_name).filter(Boolean);
    const allCities = [...new Set([...dropdownCities, ...eventCities])];
    return allCities.map(city => ({ id: city, value: city, label: city }));
  }, [locationData.cities, locationData.states, filters.state, getCitiesByState, dropdownOptions.cities, events]);

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
        case 'profileSubmitted':
          return 'Profile Submitted';
        case 'attended':
          return 'Attended';
        case 'selected':
          return 'Selected';
        case 'rejected':
          return 'Rejected';
        case 'feedbackPending':
          return 'Feedback Pending';
        case 'nextRound':
          return 'Next Round';
        case 'inProcess':
          return 'In Process';
        case 'noShow':
          return 'No Show';
        case 'others':
          return 'Others';
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

  // Handle stats click to directly open candidate table in new tab with filters
  const handleStatsClick = async (event, statsType) => {
    try {
      const isEmployeeView = activeReport === 'employee';
      const clientName = isEmployeeView ? undefined : event.client_name;
      const executive = isEmployeeView ? (event.employee_code || event.employee_name) : undefined;

      // Date filters
      const fromDate = appliedFilters.fromDate || '';
      const toDate = appliedFilters.toDate || '';

      // Special case: 'Attended' is derived from ClientJob.attend=1, not a remark
      if (statsType === 'attended') {
        const filtersForApi = {
          ...(clientName ? { client: clientName } : {}),
          ...(executive ? { executive } : {}),
          from_date: fromDate,
          to_date: toDate,
          attend: 1,
        };

        // Use progressive loader that accepts arbitrary filters
        const list = await candidates.getAllCandidatesProgressive(filtersForApi);
        const candidateIds = (Array.isArray(list) ? list : []).map(c => c.id).filter(Boolean);
        openCandidateTableInNewTab(statsType, event, candidateIds);
        return;
      }

      // Special case: 'Others' = exclude only six known remarks (ignore attend/profile_submission)
      if (statsType === 'others') {
        const excludeRemarks = [
          'Selected', 'Rejected', 'Feedback Pending',
          'Next Round', 'In Process', 'No Show'
        ];
        const filtersForApi = {
          ...(clientName ? { client: clientName } : {}),
          ...(executive ? { executive } : {}),
          from_date: fromDate,
          to_date: toDate,
          exclude_remarks: excludeRemarks.join(','),
        };
        const list = await candidates.getAllCandidatesProgressive(filtersForApi);
        const candidateIds = (Array.isArray(list) ? list : []).map(c => c.id).filter(Boolean);
        openCandidateTableInNewTab(statsType, event, candidateIds);
        return;
      }

      // Map UI statType to ClientJob.remarks
      const remarkMap = {
        profileSubmitted: 'Profile Submitted',
        interviewFixed: 'Interview Fixed',
        selected: 'Selected',
        rejected: 'Rejected',
        feedbackPending: 'Feedback Pending',
        nextRound: 'Next Round',
        inProcess: 'In Process',
        noShow: 'No Show',
      };

      // Special case: 'Profile Submitted' derives from profile_submission=1, not remarks
      if (statsType === 'profileSubmitted') {
        const filtersForApi = {
          ...(clientName ? { client: clientName } : {}),
          ...(executive ? { executive } : {}),
          from_date: fromDate,
          to_date: toDate,
          profile_submission: 1,
        };
        const list = await candidates.getAllCandidatesProgressive(filtersForApi);
        const candidateIds = (Array.isArray(list) ? list : []).map(c => c.id).filter(Boolean);
        openCandidateTableInNewTab(statsType, event, candidateIds);
        return;
      }

      const remark = remarkMap[statsType];
      if (!remark) return;

      // Use existing API wrapper to fetch final candidates from ClientJob
      const filtersForApi = {
        ...(clientName ? { client: clientName } : {}),
        ...(executive ? { executive } : {}),
        remark: remark,
        from_date: fromDate,
        to_date: toDate,
      };

      // For final status drilldowns (Selected/Rejected/Feedback Pending/Next Round/In Process/No Show), use only current remarks
      if (statsType === 'selected' || statsType === 'rejected' || statsType === 'feedbackPending' || statsType === 'nextRound' || statsType === 'inProcess' || statsType === 'noShow') {
        filtersForApi.include_history = 0;
      }

      const res = await candidates.getAllCandidatesForRemark(remark, filtersForApi);
      const arr = (res && (res.results || res.data)) || [];
      const candidateIds = arr.map((c) => c.id).filter(Boolean);

      openCandidateTableInNewTab(statsType, event, candidateIds);
    } catch (err) {
      console.error('Error fetching candidates', err);
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





  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white">
        <div className="px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-4">
                <div className={`w-8 h-8 rounded-sm flex items-center justify-center bg-blue-600`}>
                  <Building className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex space-x-4 border-b border-gray-200">
                    <button
                      onClick={() => setActiveReport('client')}
                      className={`px-4 py-2 text-sm font-medium ${activeReport === 'client'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      Clientwise Report
                    </button>
                    <button
                      onClick={() => setActiveReport('employee')}
                      className={`px-4 py-2 text-sm font-medium ${activeReport === 'employee'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      Employee Wise Report
                    </button>
                  </div>

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
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={filters.fromDate || ''}
              onChange={(e) => handleInputChange('fromDate', e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={filters.toDate || ''}
              onChange={(e) => handleInputChange('toDate', e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Branch */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
            <select
              value={filters.selectedBranch || ''}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Branches</option>
              {branchOptions.map(branch => (
                <option key={branch.id} value={branch.value}>{branch.label}</option>
              ))}
            </select>
          </div>

          {/* Team */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Team</label>
            <select
              value={filters.selectedTeam || ''}
              onChange={(e) => handleTeamChange(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Teams</option>
              {teamOptions.map(team => (
                <option key={team.id} value={team.value}>{team.label}</option>
              ))}
            </select>
          </div>

          {/* Employee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
            <select
              value={filters.selectedEmployee || ''}
              onChange={(e) => handleInputChange('selectedEmployee', e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Employees</option>
              {employeeOptions.map(emp => (
                <option key={emp.id} value={emp.value}>{emp.value}</option>
              ))}
            </select>
          </div>

          {/* Client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
            <select
              value={filters.selectedClient || ''}
              onChange={(e) => handleInputChange('selectedClient', e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Clients</option>
              {clientOptions.map(client => (
                <option key={client.id} value={client.value}>{client.value}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State
            </label>
            <select
              value={filters.state}
              onChange={(e) => handleStateChange(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            >
              <option value="">All States</option>
              {stateOptions.map(state => (
                <option key={state.id || state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </select>
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City
            </label>
            <select
              value={filters.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              disabled={!filters.state}
            >
              <option value="">
                {!filters.state ? 'Select State First' : 'All Cities'}
              </option>
              {cityOptions.map(city => (
                <option
                  key={city.uniqueKey || city.id || city.city_id || city.value}
                  value={city.value}
                >
                  {city.label || city.city || city.value}
                </option>
              ))}
            </select>
          </div>

          {/* Apply Filters Button */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setAppliedFilters({
                  ...filters,
                  fromDate: filters.fromDate || dateParam || '',
                  toDate: filters.toDate || dateParam || ''
                });
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
                  fromDate: dateParam || '',
                  toDate: dateParam || '',
                  state: '',
                  city: '',
                  selectedPlan: planId || '',
                  selectedBranch: '',
                  selectedBranchId: null,
                  selectedTeam: '',
                  selectedTeamId: null,
                  selectedEmployee: '',
                  selectedClient: ''
                };
                setFilters(resetFilters);
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
            Showing {displayRows.length ? `${branchEventsStartIndex + 1}-${branchEventsEndIndex}` : '0-0'} of {displayRows.length} entries
          </div>

          <div className="flex items-center">
            <input
              type="text"
              value={branchEventsSearchTerm}
              onChange={(e) => { setBranchEventsSearchTerm(e.target.value); setBranchEventsCurrentPage(1); }}
              placeholder="Search..."
              className="w-full md:w-64 px-3 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Events Content */}
      <div className="mt-0">
        <div className="overflow-x-auto overflow-y-auto scrollbar-desktop max-h-[calc(100vh-300px)]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white sticky top-0 z-10 border border-gray-200">
              <tr>
                <th className="px-1.5 py-3 text-center text-sm font-medium uppercase tracking-wider">S.No</th>
                <th className="px-3 py-3 text-left text-sm font-medium uppercase tracking-wider">
                  {activeReport === 'client' ? 'Client' : 'Employee'}
                </th>
                {activeReport === 'employee' && (
                  <th className="px-3 py-3 text-left text-sm font-medium uppercase tracking-wider">Client</th>
                )}
                {/* <th className="px-3 py-3 text-left text-sm font-medium uppercase tracking-wider">Employee</th> */}
                <th className="px-3 py-3 text-center text-sm font-medium uppercase tracking-wider whitespace-nowrap">
                  <div className="flex flex-col items-center">
                    <span>PROFILE SUBMITTED</span>
                    <span
                      className="text-sm font-normal text-blue-600 rounded px-1"
                    >
                      ({currentStatusCounts.profileSubmitted || 0})
                    </span>
                    <div className="mt-1 flex items-center gap-1 text-[11px]">
                      <span
                        className="px-2 py-0.5 rounded bg-green-100 text-green-700"
                      >
                        Ongoing {currentStatusCounts.profileSubmittedActive || 0}
                      </span>
                      <span className="text-gray-400">/</span>
                      <span
                        className="px-2 py-0.5 rounded bg-red-100 text-red-700"
                      >
                        {currentStatusCounts.profileSubmittedInactive || 0} Transfer
                      </span>
                    </div>
                  </div>
                </th>
                <th className="px-3 py-3 text-center text-sm font-medium uppercase tracking-wider whitespace-nowrap">
                  <div className="flex flex-col items-center">
                    <span>ATTENDED</span>
                    <span
                      className="text-sm font-normal text-green-600 rounded px-1"
                    >
                      ({currentStatusCounts.attended || 0})
                    </span>
                    <div className="mt-1 flex items-center gap-1 text-[11px]">
                      <span
                        className="px-2 py-0.5 rounded bg-green-100 text-green-700"
                      >
                        Ongoing {currentStatusCounts.attendedActive || 0}
                      </span>
                      <span className="text-gray-400">/</span>
                      <span
                        className="px-2 py-0.5 rounded bg-red-100 text-red-700"
                      >
                        {currentStatusCounts.attendedInactive || 0} Transfer
                      </span>
                    </div>
                  </div>
                </th>
                <th className="px-3 py-3 text-center text-sm font-medium uppercase tracking-wider whitespace-nowrap">
                  <div className="flex flex-col items-center">
                    <span>SELECTED</span>
                    <span
                      className="text-sm font-normal text-blue-600 rounded px-1"
                    >
                      ({currentStatusCounts.selected || 0})
                    </span>
                  </div>
                </th>
                <th className="px-3 py-3 text-center text-sm font-medium uppercase tracking-wider whitespace-nowrap">
                  <div className="flex flex-col items-center">
                    <span>REJECTED</span>
                    <span
                      className="text-sm font-normal text-blue-600 rounded px-1"
                    >
                      ({currentStatusCounts.rejected || 0})
                    </span>
                  </div>
                </th>
                <th className="px-3 py-3 text-center text-sm font-medium uppercase tracking-wider whitespace-nowrap">
                  <div className="flex flex-col items-center">
                    <span>FEEDBACK PENDING</span>
                    <span
                      className="text-sm font-normal text-red-600 rounded px-1"
                    >
                      ({currentStatusCounts.feedbackPending || 0})
                    </span>
                  </div>
                </th>
                <th className="px-3 py-3 text-center text-sm font-medium uppercase tracking-wider whitespace-nowrap">
                  <div className="flex flex-col items-center">
                    <span>NEXT ROUND</span>
                    <span
                      className="text-sm font-normal text-amber-600 rounded px-1"
                    >
                      ({currentStatusCounts.nextRound || 0})
                    </span>
                  </div>
                </th>
                <th className="px-3 py-3 text-center text-sm font-medium uppercase tracking-wider whitespace-nowrap">
                  <div className="flex flex-col items-center">
                    <span>IN PROCESS</span>
                    <span
                      className="text-sm font-normal text-purple-600 rounded px-1"
                    >
                      ({currentStatusCounts.inProcess || 0})
                    </span>
                  </div>
                </th>
                <th className="px-3 py-3 text-center text-sm font-medium uppercase tracking-wider whitespace-nowrap">
                  <div className="flex flex-col items-center">
                    <span>NO SHOW</span>
                    <span
                      className="text-sm font-normal text-red-600 rounded px-1"
                    >
                      ({currentStatusCounts.noShows || 0})
                    </span>
                  </div>
                </th>
                <th className="px-3 py-3 text-center text-sm font-medium uppercase tracking-wider whitespace-nowrap">
                  <div className="flex flex-col items-center">
                    <span>OTHERS</span>
                    <span
                      className="text-sm font-normal text-slate-700 rounded px-1"
                    >
                      ({currentStatusCounts.others || 0})
                    </span>
                  </div>
                </th>

              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedBranchEvents.map((event, index) => (
                <tr key={event.id || index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-1 py-1 text-center text-sm text-gray-500">
                    {branchEventsStartIndex + index + 1}
                  </td>
                  <td className="px-3 py-2">
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">
                        {activeReport === 'client' ? (event.client_name || 'N/A') : (event.employee_name || event.employee_code || 'N/A')}
                      </div>
                    </div>
                  </td>
                  {activeReport === 'employee' && (
                    <td className="px-3 py-2 align-top">
                      {Array.isArray(event.clients) && event.clients.length ? (
                        <div className="text-xs text-gray-700 truncate" title={event.clients.join(', ')}>
                          {event.clients.join(', ')}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  )}

                  {/* <td className="px-4 py-1">
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">
                          {event.employee_name || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {event.branch || 'N/A'}
                        </div>
                      </div>
                    </td> */}
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <span
                        className={`px-1.5 py-0.5 rounded bg-green-100 text-green-700 ${((event.profileSubmittedActive || 0) > 0 ? 'cursor-pointer hover:opacity-80' : 'opacity-60 cursor-default')}`}
                        title={((event.profileSubmittedActive || 0) > 0) ? 'View Active Profile Submitted candidates' : undefined}
                        onClick={((event.profileSubmittedActive || 0) > 0) ? () => handleRowSplitClick(event, 'profileSubmitted', 'Active') : undefined}
                      >
                        {event.profileSubmittedActive || 0}
                      </span>
                      {/* <span className="text-gray-400">/</span> */}
                      <span
                        className={`px-1.5 py-0.5 rounded bg-red-100 text-red-700 ${((event.profileSubmittedInactive || 0) > 0 ? 'cursor-pointer hover:opacity-80' : 'opacity-60 cursor-default')}`}
                        title={((event.profileSubmittedInactive || 0) > 0) ? 'View Inactive Profile Submitted candidates' : undefined}
                        onClick={((event.profileSubmittedInactive || 0) > 0) ? () => handleRowSplitClick(event, 'profileSubmitted', 'Inactive') : undefined}
                      >
                        {event.profileSubmittedInactive || 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {/* <div 
                        className="font-bold text-green-600 text-sm cursor-pointer hover:bg-green-50 rounded px-2 py-1 transition-colors"
                        onClick={() => handleStatsClick(event, 'attended')}
                        title="Attended Candidates"
                      >
                        {event.attended || 0}
                      </div> */}
                    <div className="flex items-center justify-center gap-3">
                      <span
                        className={`px-1.5 py-0.5 rounded bg-green-100 text-green-700 ${((event.attendedActive || 0) > 0 ? 'cursor-pointer hover:opacity-80' : 'opacity-60 cursor-default')}`}
                        title={((event.attendedActive || 0) > 0) ? 'View Active Attended candidates' : undefined}
                        onClick={((event.attendedActive || 0) > 0) ? () => handleRowSplitClick(event, 'attended', 'Active') : undefined}
                      >
                        {event.attendedActive || 0}
                      </span>
                      {/* <span className="text-gray-400">/</span> */}
                      <span
                        className={`px-1.5 py-0.5 rounded bg-red-100 text-red-700 ${((event.attendedInactive || 0) > 0 ? 'cursor-pointer hover:opacity-80' : 'opacity-60 cursor-default')}`}
                        title={((event.attendedInactive || 0) > 0) ? 'View Inactive Attended candidates' : undefined}
                        onClick={((event.attendedInactive || 0) > 0) ? () => handleRowSplitClick(event, 'attended', 'Inactive') : undefined}
                      >
                        {event.attendedInactive || 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div
                      className="font-bold text-blue-600 text-sm cursor-pointer hover:bg-blue-50 rounded px-2 py-1 transition-colors"
                      onClick={() => handleStatsClick(event, 'selected')}
                      title="Selected Candidates"
                    >
                      {event.selected || 0}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div
                      className="font-bold text-blue-600 text-sm cursor-pointer hover:bg-blue-50 rounded px-2 py-1 transition-colors"
                      onClick={() => handleStatsClick(event, 'rejected')}
                      title="Rejected Candidates"
                    >
                      {event.rejected || 0}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div
                      className="font-bold text-red-600 text-sm cursor-pointer hover:bg-red-50 rounded px-2 py-1 transition-colors"
                      onClick={() => handleStatsClick(event, 'feedbackPending')}
                      title="Feedback Pending"
                    >
                      {event.feedbackPending || 0}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div
                      className="font-bold text-amber-600 text-sm cursor-pointer hover:bg-amber-50 rounded px-2 py-1 transition-colors"
                      onClick={() => handleStatsClick(event, 'nextRound')}
                      title="Next Round Candidates"
                    >
                      {event.nextRound || 0}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div
                      className="font-bold text-purple-600 text-sm cursor-pointer hover:bg-purple-50 rounded px-2 py-1 transition-colors"
                      onClick={() => handleStatsClick(event, 'inProcess')}
                      title="In Process Candidates"
                    >
                      {event.inProcess || 0}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div
                      className="font-bold text-red-600 text-sm cursor-pointer hover:bg-red-50 rounded px-2 py-1 transition-colors"
                      onClick={() => handleStatsClick(event, 'noShow')}
                      title="No Show Candidates"
                    >
                      {event.noShows || 0}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div
                      className="font-bold text-slate-700 text-sm cursor-pointer hover:bg-slate-50 rounded px-2 py-1 transition-colors"
                      onClick={() => handleStatsClick(event, 'others')}
                      title="Other Remarks Candidates"
                    >
                      {event.others || 0}
                    </div>
                  </td>

                </tr>
              ))}
              {paginatedBranchEvents.length === 0 && (
                <tr>
                  <td
                    colSpan={activeReport === 'client' ? 11 : 12}
                    className="px-3 py-6 text-center text-sm text-gray-500"
                  >
                    No data found for the selected filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <EventFormModal
          isOpen={showEditModal}
          onClose={() => { setShowEditModal(false); setEditingEvent(null); }}
          editingEvent={editingEvent}
          onSubmit={handleModalSubmit}
          dropdownOptions={dropdownOptionsForModal}
          isSubmitting={isSubmitting}
          existingEvents={events}
        />

        {showJobRowsModal && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded shadow-lg w-[95vw] max-w-5xl max-h-[80vh] overflow-auto">
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <h3 className="font-semibold text-sm">{jobRowsTitle || 'Job Rows'}</h3>
                <button className="text-xs px-2 py-1 bg-gray-100 rounded" onClick={() => setShowJobRowsModal(false)}>Close</button>
              </div>
              <div className="p-3">
                <table className="min-w-full text-xs border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1 border">S.No</th>
                      <th className="px-2 py-1 border">Candidate</th>
                      <th className="px-2 py-1 border">Client</th>
                      <th className="px-2 py-1 border">Designation</th>
                      <th className="px-2 py-1 border">Transfer Status</th>
                      <th className="px-2 py-1 border">Profile Submitted</th>
                      <th className="px-2 py-1 border">Submission Date</th>
                      <th className="px-2 py-1 border">Remarks</th>
                      <th className="px-2 py-1 border">Updated On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(jobRows || []).map((r, idx) => (
                      <tr key={r.job_id || idx} className="hover:bg-gray-50">
                        <td className="px-2 py-1 border">{idx + 1}</td>
                        <td className="px-2 py-1 border">{r.candidate_name || '-'}</td>
                        <td className="px-2 py-1 border">{r.client_name || '-'}</td>
                        <td className="px-2 py-1 border">{r.designation || '-'}</td>
                        <td className="px-2 py-1 border">{r.transfer_status || '-'}</td>
                        <td className="px-2 py-1 border">{r.profile_submission === 1 ? 'Yes' : 'No'}</td>
                        <td className="px-2 py-1 border">{r.profile_submission_date || '-'}</td>
                        <td className="px-2 py-1 border">{r.remarks || '-'}</td>
                        <td className="px-2 py-1 border">{r.updated_at ? new Date(r.updated_at).toLocaleString('en-IN') : '-'}</td>
                      </tr>
                    ))}
                    {(!jobRows || jobRows.length === 0) && (
                      <tr>
                        <td className="px-2 py-4 text-center border" colSpan={9}>No rows found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

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
                      className={`relative inline-flex items-center px-3 py-2 text-xs font-semibold ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${current === 1
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
                        className={`relative inline-flex items-center px-3 py-2 text-xs font-semibold ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${current === i
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
                      className={`relative inline-flex items-center px-3 py-2 text-xs font-semibold ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${current === totalPages
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

export default ClientwiseReport;
