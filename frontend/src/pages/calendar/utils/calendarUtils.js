// Shared utilities for calendar components

// Authentication headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Token ${token}`,
    'Content-Type': 'application/json'
  };
};

// API base URL
export const getApiBaseUrl = () => import.meta.env.VITE_API_BASE_URL;

// Common API calls
export const calendarAPI = {
  // Load dropdown options
  async getDropdownOptions() {
    try {
      const response = await fetch(`${getApiBaseUrl()}/call-details/dropdown-data/`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch dropdown options');
      const result = await response.json();
      return result.success ? result.data : result;
    } catch (error) {
      console.error('Error loading dropdown options:', error);
      throw error;
    }
  },

  // Calendar view APIs
  async getMonthView(params = {}) {
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) urlParams.append(key, value);
    });
    
    const url = `${getApiBaseUrl()}/call-details/month_view/${urlParams.toString() ? `?${urlParams}` : ''}`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    
    if (!response.ok) throw new Error('Failed to fetch month events');
    return await response.json();
  },

  async getWeekView(params = {}) {
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) urlParams.append(key, value);
    });
    
    const url = `${getApiBaseUrl()}/call-details/week_view/${urlParams.toString() ? `?${urlParams}` : ''}`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    
    if (!response.ok) throw new Error('Failed to fetch week events');
    return await response.json();
  },

  async getDayView(params = {}) {
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) urlParams.append(key, value);
    });
    
    const url = `${getApiBaseUrl()}/call-details/day_view/${urlParams.toString() ? `?${urlParams}` : ''}`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    
    if (!response.ok) throw new Error('Failed to fetch day events');
    return await response.json();
  },

  // CRUD operations
  async createEvent(eventData) {
    const response = await fetch(`${getApiBaseUrl()}/call-details/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(eventData)
    });
    
    if (!response.ok) throw new Error('Failed to create event');
    return await response.json();
  },

  async updateEvent(eventId, eventData) {
    const response = await fetch(`${getApiBaseUrl()}/call-details/${eventId}/`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(eventData)
    });
    
    if (!response.ok) throw new Error('Failed to update event');
    return await response.json();
  },

  async deleteEvent(eventId) {
    const response = await fetch(`${getApiBaseUrl()}/call-details/${eventId}/`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) throw new Error('Failed to delete event');
    return response.status === 204 ? {} : await response.json();
  },

  // Clientwise aggregated report
  async getClientwiseReport(params = {}) {
    const urlParams = new URLSearchParams();
    // Only include supported params
    if (params.start_date) urlParams.append('start_date', params.start_date);
    if (params.end_date) urlParams.append('end_date', params.end_date);
    if (params.client) urlParams.append('client', params.client);
    if (params.state) urlParams.append('state', params.state);
    if (params.city) urlParams.append('city', params.city);
    // New: optional branch/team/executive filters
    if (params.branch) urlParams.append('branch', params.branch);
    if (params.team_id) urlParams.append('team_id', params.team_id);
    if (params.team) urlParams.append('team', params.team);
    if (params.executive) urlParams.append('executive', params.executive);

    const url = `${getApiBaseUrl()}/candidates/clientwise-report/${urlParams.toString() ? `?${urlParams}` : ''}`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch clientwise report');
    return await response.json();
  },

  // Employeewise aggregated report
  async getEmployeewiseReport(params = {}) {
    const urlParams = new URLSearchParams();
    if (params.start_date) urlParams.append('start_date', params.start_date);
    if (params.end_date) urlParams.append('end_date', params.end_date);
    if (params.client) urlParams.append('client', params.client);
    if (params.state) urlParams.append('state', params.state);
    if (params.city) urlParams.append('city', params.city);
    if (params.executive) urlParams.append('executive', params.executive);
    // New: optional branch/team filters (match clientwise behavior)
    if (params.branch) urlParams.append('branch', params.branch);
    if (params.team_id) urlParams.append('team_id', params.team_id);
    if (params.team) urlParams.append('team', params.team);

    const url = `${getApiBaseUrl()}/candidates/employeewise-report/${urlParams.toString() ? `?${urlParams}` : ''}`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch employeewise report');
    return await response.json();
  }
};

// Utility function to count comma-separated values
export const getCallStatCount = (statString) => {
  if (!statString || statString === null || statString === undefined) {
    return 0;
  }

  const strValue = statString.toString().trim();
  
  if (strValue === '' || strValue === '0') {
    return 0;
  }

  if (!isNaN(statString) && typeof statString === 'number') {
    return statString;
  }

  if (!strValue.includes(',') && !isNaN(strValue) && parseInt(strValue) < 1000) {
    return parseInt(strValue);
  }
  
  const ids = strValue.split(',').filter(id => {
    const trimmedId = id.trim();
    return trimmedId !== '' && trimmedId !== '0' && trimmedId !== 'null';
  });
  
  return ids.length;
};

// Common dropdown data mapping
export const mapDropdownData = (data) => ({
  plans: ['P1', 'P2', 'P3', 'P4', 'P5'],
  employees: (data.employees || []).map(emp => ({
    value: emp.fullName || emp.name || emp.label || emp.employee_name || emp.id,
    label: emp.fullName || emp.name || emp.label || emp.employee_name || 'Unknown Employee',
    id: emp.id || emp.employee_id || emp.value,
    employeeCode: emp.employeeCode || emp.emp_code || emp.empcode
  })),
  clients: (data.clients || data.vendors || []).map(client => ({
    value: client.vendor_name || client.name || client.label || client.client_name || client.id,
    label: client.vendor_name || client.name || client.label || client.client_name || 'Unknown Client',
    id: client.id || client.client_id || client.value,
    ...client
  })),
  states: (data.states || []).map(state => ({
    value: state.value ?? state.id ?? state.stateid,
    label: state.label ?? state.state ?? state.name,
    id: state.id ?? state.stateid ?? state.value,
    state_id: state.id ?? state.stateid ?? state.value,
    state: state.state ?? state.label ?? state.name
  })),
  cities: (data.cities || []).map(city => ({
    value: city.city || city.value,
    label: city.label || (city.state ? `${city.city}, ${city.state}` : city.city),
    name: city.city || city.value || 'Unknown City',
    city: city.city || city.value,
    id: city.id || city.city_id,
    city_id: city.city_id || city.id,
    state: city.state,
    state_id: city.state_id || city.state_ids
  })),
  positions: (data.channels || data.positions || []).map((pos, index) => {
    if (typeof pos === 'string') return { value: pos, label: pos, id: pos };
    const positionName = pos.label || pos.designation || pos.name || pos.value || `Position ${index + 1}`;
    const positionId = pos.id || pos.value || positionName;
    return { value: positionName, label: positionName, id: positionId };
  }),
  sources: (data.sources || []).map(source => ({
    value: source.id || source.value || source.name,
    label: source.name || source.source_name || source.label || 'Source',
    id: source.id || source.value || source.name,
    name: source.name || source.source_name || source.label
  })),
  branches: (data.branches || []).map(branch => ({
    value: branch.name || branch.branch_name || branch.value || branch.id,
    label: branch.name || branch.branch_name || branch.label || 'Branch',
    id: branch.id || branch.value || branch.name,
    ...branch
  })),
  user_level: data.user_level || null,
  filtering_applied: Boolean(data.filtering_applied)
});

// Date utilities
export const toISODate = (d) => {
  try {
    const dt = (d instanceof Date) ? d : new Date(d);
    if (isNaN(dt.getTime())) return new Date().toISOString().slice(0, 10);
    return dt.toISOString().slice(0, 10);
  } catch { 
    return new Date().toISOString().slice(0, 10); 
  }
};

// Plan color utilities
export const getPlanColor = (planName) => {
  switch (planName) {
    case 'P1': return 'bg-blue-500';
    case 'P2': return 'bg-green-500';
    case 'P3': return 'bg-purple-500';
    case 'P4': return 'bg-orange-500';
    case 'P5': return 'bg-pink-500';
    default: return 'bg-gray-500';
  }
};

export const getPlanColorClasses = (plan) => {
  const colorMap = {
    P1: { bg: 'bg-blue-100', text: 'text-blue-700', hover: 'hover:bg-blue-200' },
    P2: { bg: 'bg-green-100', text: 'text-green-700', hover: 'hover:bg-green-200' },
    P3: { bg: 'bg-purple-100', text: 'text-purple-700', hover: 'hover:bg-purple-200' },
    P4: { bg: 'bg-orange-100', text: 'text-orange-700', hover: 'hover:bg-orange-200' },
    P5: { bg: 'bg-pink-100', text: 'text-pink-700', hover: 'hover:bg-pink-200' }
  };

  const colors = colorMap[plan] || colorMap.P1;
  return `${colors.bg} ${colors.text} ${colors.hover}`;
};

// Utility function to transform backend data to frontend format
export const transformCallDetailsToEvent = (callDetail) => {
  return {
    id: callDetail.id,
    plan: callDetail.call_plan_data || callDetail.tb_call_plan_data || callDetail.call_plan_info?.tb_call_plan_data || 'N/A',
    employeeName: callDetail.employeeName || callDetail.employee_name || 'Unknown Employee',
    clientName: callDetail.clientName || callDetail.client_name || 'Unknown Client',
    state: callDetail.state_name || 'N/A', // Only use state_name, not the ID
    city: callDetail.city_name || 'N/A', // Only use city_name, not the ID
    position: callDetail.tb_call_channel || 'N/A',
    source: callDetail.sourceName || callDetail.source_name || 'N/A',
    branch: callDetail.branch_name || callDetail.branch || 'Unknown Branch',
    date: callDetail.tb_call_startdate ? callDetail.tb_call_startdate.split('T')[0] : '',
    time: callDetail.tb_call_startdate ? callDetail.tb_call_startdate.split('T')[1]?.substring(0, 5) : '',
    duration: callDetail.call_duration || 60,
    remarks: callDetail.tb_call_description || '',
    status: callDetail.is_active ? 'scheduled' : 'completed',
    priority: 'medium', // Default priority, can be enhanced later
    meetingType: 'In-Person', // Default meeting type, can be enhanced later
    created_at: callDetail.tb_call_add_date || new Date().toISOString(),
    plan_date: callDetail.tb_call_startdate ? callDetail.tb_call_startdate.split('T')[0] : 'N/A',
    add_date: callDetail.tb_call_add_date ? new Date(callDetail.tb_call_add_date).toLocaleDateString() : 'N/A',
    // Include all IDs needed for editing
    employeeId: callDetail.tb_call_emp_id || '',
    clientId: callDetail.tb_call_client_id || '',
    stateId: callDetail.tb_call_state_id || '', // Keep as string from backend
    cityId: callDetail.tb_call_city_id || '',
    sourceId: callDetail.tb_call_source_id || '',
    channelId: callDetail.tb_call_channel_id || '',
    branchId: callDetail.tb_call_branch_id || '',
    // Call statistics counts - use backend-provided counts if available, otherwise calculate
    callsOnPlan: callDetail.tb_calls_onplan_count !== undefined ? callDetail.tb_calls_onplan_count : getCallStatCount(callDetail.tb_calls_onplan),
    callsOnOthers: callDetail.tb_calls_onothers_count !== undefined ? callDetail.tb_calls_onothers_count : getCallStatCount(callDetail.tb_calls_onothers),
    profilesOnPlan: callDetail.tb_calls_profiles_count !== undefined ? callDetail.tb_calls_profiles_count : getCallStatCount(callDetail.tb_calls_profiles),
    profilesOnOthers: callDetail.tb_calls_profilesothers_count !== undefined ? callDetail.tb_calls_profilesothers_count : getCallStatCount(callDetail.tb_calls_profilesothers),
    // Raw data for debugging
    tb_calls_onplan: callDetail.tb_calls_onplan || '',
    tb_calls_onothers: callDetail.tb_calls_onothers || '',
    tb_calls_profiles: callDetail.tb_calls_profiles || '',
    tb_calls_profilesothers: callDetail.tb_calls_profilesothers || ''
  };
};
