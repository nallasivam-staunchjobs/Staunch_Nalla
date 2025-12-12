import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Save, X } from 'lucide-react';
import { CustomDropdown } from '../../../components/UIComponents';
import { API_URL } from '../../../api/config';

const EventFormModal = ({ 
  isOpen, 
  onClose, 
  editingEvent = null, 
  onSubmit,
  dropdownOptions = {},
  isSubmitting = false,
  existingEvents = [] // Add existing events to check for duplicates
}) => {
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
    date: new Date().toISOString().split('T')[0], // Default to current date
    time: '',
    remarks: ''
  });
  const [errors, setErrors] = useState({});

  // ALL DROPDOWN OPTIONS PROCESSING - FULLY DYNAMIC FROM BACKEND
  const stateOptions = useMemo(() => {
    
    const processedStates = (dropdownOptions.states || []).map(stateItem => {
      // Handle backend response format - SAME AS EMPLOYEES
      if (typeof stateItem === 'object' && stateItem !== null) {
        // Backend sends objects like: {value: 37, label: "Tamil Nadu", id: 37, stateid: 37, state: "Tamil Nadu"}
        const stateOption = {
          value: stateItem.value || stateItem.id || stateItem.stateid,  // Use ID as value (like employees)
          label: stateItem.label || stateItem.state || stateItem.name,  // Use name as label
          id: stateItem.id || stateItem.stateid || stateItem.value,     // ID field
          state_id: stateItem.id || stateItem.stateid || stateItem.value, // ID for backend
          stateid: stateItem.stateid || stateItem.id,
          state: stateItem.state || stateItem.label || stateItem.name
        };
        return stateOption;
      }
      
      // Handle string format (fallback case - backend State query failed)
      
      // For string format, we can't get the proper ID without hardcoding
      // The backend should be fixed to send proper state objects
      return { 
        value: stateItem,     // Use name as value (will cause validation error)
        label: stateItem,     // Use name as label
        id: stateItem,        // Use name as ID (will cause validation error)
        state_id: stateItem   // Use name as state_id (will cause validation error)
      };
    });

    // DEDUPLICATE STATES BY NAME, KEEPING THE ONE WITH PROPER DATABASE ID
    const seenStates = new Map();
    const uniqueStates = [];
    
    processedStates.forEach(state => {
      // Use label/state name for dedup key; convert to string safely
      const stateNameKey = (state.label || state.state || state.value || '')
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '');
      
      if (!seenStates.has(stateNameKey)) {
        seenStates.set(stateNameKey, state);
        uniqueStates.push(state);
      } else {
        // If we already have this state, keep the one with higher ID (proper database ID)
        const existing = seenStates.get(stateNameKey);
        const currentId = parseInt(state.id) || 0;
        const existingId = parseInt(existing.id) || 0;
        
        if (currentId > existingId && currentId > 10) {
          // Replace with the one that has higher ID (likely the proper database ID like 37, 41, etc.)
          const existingIndex = uniqueStates.findIndex(s => (
            (s.label || s.state || s.value || '')
              .toString()
              .toLowerCase()
              .trim()
              .replace(/\s+/g, '')
          ) === stateNameKey);
          if (existingIndex !== -1) {
            uniqueStates[existingIndex] = state;
            seenStates.set(stateNameKey, state);
          }
        }
      }
    });
    return uniqueStates;
  }, [dropdownOptions.states]);

  // State for backend-fetched available plans
  const [backendPlanOptions, setBackendPlanOptions] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Fetch available plans from backend when employee and date change
  useEffect(() => {
    const fetchAvailablePlans = async () => {
      if ((!formData.employeeName && !formData.employeeId) || !formData.date) {
        // If no employee or date selected, show all plans
        const allPlans = (dropdownOptions.plans || []).map(plan => ({
          value: plan,
          label: plan
        }));
        setBackendPlanOptions(allPlans);
        return;
      }

      setLoadingPlans(true);
      try {
        const token = localStorage.getItem('token');
        const editingEventId = editingEvent?.tb_call_details_id || editingEvent?.id || '';
        
        // Build URL parameters - prefer employee_id over employee_name
        const params = new URLSearchParams({
          date: formData.date,
          editing_event_id: editingEventId
        });
        
        if (formData.employeeId) {
          params.append('employee_id', formData.employeeId);
        }
        if (formData.employeeName) {
          params.append('employee_name', formData.employeeName);
        }
        
        const response = await fetch(
          `${API_URL}/call-details/available-plans/?${params.toString()}`,
          {
            headers: {
              'Authorization': `Token ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setBackendPlanOptions(data.available_plans);
            console.log(`Available plans for ${formData.employeeName} on ${formData.date}:`, data.available_plans);
          } else {
            console.error('Failed to fetch available plans:', data.error);
            // Fallback to all plans
            const allPlans = (dropdownOptions.plans || []).map(plan => ({
              value: plan,
              label: plan
            }));
            setBackendPlanOptions(allPlans);
          }
        } else {
          console.error('Failed to fetch available plans:', response.status);
          // Fallback to all plans
          const allPlans = (dropdownOptions.plans || []).map(plan => ({
            value: plan,
            label: plan
          }));
          setBackendPlanOptions(allPlans);
        }
      } catch (error) {
        console.error('Error fetching available plans:', error);
        // Fallback to all plans
        const allPlans = (dropdownOptions.plans || []).map(plan => ({
          value: plan,
          label: plan
        }));
        setBackendPlanOptions(allPlans);
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchAvailablePlans();
  }, [formData.employeeName, formData.employeeId, formData.date, editingEvent]);

  const planOptions = backendPlanOptions;

  const employeeOptions = useMemo(() => {
    return (dropdownOptions.employees || []).map(emp => {
      const display = emp.label || emp.fullName || emp.name || emp.employee_name || '';
      return {
        value: display,
        label: display,
        id: emp.id || emp.employee_id
      };
    });
  }, [dropdownOptions.employees]);

  const clientOptions = useMemo(() => {
    return (dropdownOptions.clients || []).map(client => {
      const display = client.label || client.vendor_name || client.name || client.client_name || '';
      return {
        value: display,
        label: display,
        id: client.id || client.client_id
      };
    });
  }, [dropdownOptions.clients]);

  const positionOptions = useMemo(() => {
    return dropdownOptions.positions || [];
  }, [dropdownOptions.positions]);

  const sourceOptions = useMemo(() => {
    return (dropdownOptions.sources || []).map(source => ({
      value: typeof source === 'string' ? source : source.name,
      label: typeof source === 'string' ? source : source.name,
      id: typeof source === 'string' ? source : source.id
    }));
  }, [dropdownOptions.sources]);

  // CITY OPTIONS PROCESSING - FULLY DYNAMIC FROM BACKEND
  const cityOptions = useMemo(() => {
    if (!dropdownOptions.cities || dropdownOptions.cities.length === 0) {
      return [];
    }
    
    const processedCities = (dropdownOptions.cities || []).map(cityItem => {
      // Handle backend response format directly
      if (typeof cityItem === 'object' && cityItem !== null) {
        const cityOption = {
          // Use backend response structure as-is
          value: cityItem.value || cityItem.city || cityItem.label,
          label: cityItem.label || (cityItem.state ? `${cityItem.city}, ${cityItem.state}` : cityItem.city),
          id: cityItem.id || cityItem.city_id,
          city_id: cityItem.city_id || cityItem.id,
          city: cityItem.city || cityItem.value,
          state: cityItem.state,
          state_id: cityItem.state_id || cityItem.state_ids
        };
        return cityOption;
      }
      // Fallback for string format
      return { value: cityItem, label: cityItem, id: cityItem, city: cityItem };
    });
    
    return processedCities;
  }, [dropdownOptions.cities]);

  // FILTERED CITIES BASED ON SELECTED STATE
  const filteredCityOptions = useMemo(() => {
    if (!formData.state) {
      return cityOptions;
    }
    
    const filtered = cityOptions.filter(city => {
      const cityState = city.state?.trim();
      const selectedState = formData.state?.trim();
      
      // Exact match first
      if (cityState === selectedState) {
        return true;
      }
      
      // Normalized comparison (remove spaces, case insensitive)
      const normalizedCityState = cityState?.replace(/\s+/g, '').toLowerCase();
      const normalizedSelectedState = selectedState?.replace(/\s+/g, '').toLowerCase();
      
      return normalizedCityState === normalizedSelectedState;
    });
    
    return filtered;
  }, [cityOptions, formData.state]);

  // DYNAMIC STATE ID RESOLVER - NO HARDCODED MAPPINGS
  const resolveStateId = (eventData) => {
    // Try direct state ID fields first
    let stateId = eventData.stateId || eventData.state_id || eventData.tb_call_state_id;
    
    // If we have a numeric state ID and it's valid, use it
    if (stateId && !isNaN(stateId) && parseInt(stateId) >= 10) {
      return String(stateId);
    }
    
    // If options aren't ready yet, bail without error; we'll retry later
    if (!stateOptions || stateOptions.length === 0) {
      return '';
    }
    
    // If state ID is a name, try to find it in stateOptions dynamically
    const stateName = stateId || eventData.state || eventData.state_name;
    if (stateName && isNaN(stateName)) {
      
      // Strong normalization: lower, replace &->and, remove punctuation, collapse spaces
      const norm = (s) => String(s || '')
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[\W_]+/g, ' ') // remove punctuation/underscores
        .replace(/\s+/g, ' ')
        .trim();
      const target = norm(stateName);
      // Exact normalized match
      const matchingState = stateOptions.find(state =>
        norm(state.label) === target ||
        norm(state.state) === target
      );
      
      if (matchingState && matchingState.value) {
        return String(matchingState.value);
      }

      // Fuzzy fallback: includes either way, prefer longest label
      const candidates = stateOptions
        .map(s => ({ s, key: norm(s.label || s.state) }))
        .filter(x => x.key && (target.includes(x.key) || x.key.includes(target)));
      if (candidates.length > 0) {
        candidates.sort((a, b) => b.key.length - a.key.length);
        const best = candidates[0].s;
        if (best && best.value) {
          return String(best.value);
        }
      }
    }
    
    return ''; // Do not pick arbitrary state
  };

  // COMPREHENSIVE FORM DATA HANDLER - ALL CONDITIONAL LOGIC HERE
  useEffect(() => {
    if (editingEvent) {
      // EDIT MODE - Handle all possible data formats and field name variations
      const processedFormData = {
        // Plan - multiple possible field names
        plan: editingEvent.plan_name || editingEvent.plan || editingEvent.tb_call_plan_data || '',
        
        // Employee - handle all variations
        employeeName: editingEvent.employeeName || editingEvent.employee_name || editingEvent.emp_name || '',
        employeeId: editingEvent.employeeId || editingEvent.employee_id || editingEvent.tb_call_emp_id || '',
        
        // Client - handle all variations  
        clientName: editingEvent.clientName || editingEvent.client_name || editingEvent.vendor_name || '',
        clientId: editingEvent.clientId || editingEvent.client_id || editingEvent.tb_call_client_id || '',
        
        // State - set raw values; resolution happens after options load
        state: editingEvent.state || editingEvent.state_name || '',
        stateId: editingEvent.stateId || editingEvent.state_id || editingEvent.tb_call_state_id || '',
        
        // City - handle all variations
        city: editingEvent.city || editingEvent.city_name || '',
        cityId: editingEvent.cityId || editingEvent.city_id || editingEvent.tb_call_city_id || '',
        
        // Position/Channel
        position: editingEvent.position || editingEvent.tb_call_channel || '',
        
        // Source
        source: editingEvent.source || editingEvent.source_name || '',
        sourceId: editingEvent.sourceId || editingEvent.source_id || editingEvent.tb_call_source_id || '',
        
        // Branch
        branch: editingEvent.branch || editingEvent.branch_name || '',
        branchId: editingEvent.branchId || editingEvent.branch_id || '',
        
        // Date/Time - handle different formats
        date: editingEvent.date || editingEvent.start_date || editingEvent.tb_call_startdate?.split('T')[0] || '',
        time: editingEvent.time || editingEvent.start_time || editingEvent.tb_call_startdate?.split('T')[1]?.substring(0,5) || '',
        
        // Description/Remarks
        remarks: editingEvent.remarks || editingEvent.description || editingEvent.tb_call_description || ''
      };
      
      setFormData(processedFormData);
    } else {
      // ADD MODE - Clean slate with current date as default
      const emptyFormData = {
        plan: '', employeeName: '', employeeId: '', clientName: '', clientId: '', 
        state: '', stateId: '', city: '', cityId: '', position: '', source: '', 
        sourceId: '', branch: '', branchId: '', date: new Date().toISOString().split('T')[0], time: '', remarks: ''
      };
      
      setFormData(emptyFormData);
    }
    setErrors({});
  }, [editingEvent]);

  // Reset form when modal opens for new event
  useEffect(() => {
    if (isOpen && !editingEvent) {
      // Ensure form is reset for new events
      const emptyFormData = {
        plan: '', employeeName: '', employeeId: '', clientName: '', clientId: '', 
        state: '', stateId: '', city: '', cityId: '', position: '', source: '', 
        sourceId: '', branch: '', branchId: '', date: new Date().toISOString().split('T')[0], time: '', remarks: ''
      };
      setFormData(emptyFormData);
      setErrors({});
      // Reset plan options to all available plans
      const allPlans = (dropdownOptions.plans || []).map(plan => ({
        value: plan,
        label: plan
      }));
      setBackendPlanOptions(allPlans);
    }
  }, [isOpen, editingEvent]);

  useEffect(() => {
    if (editingEvent && stateOptions && stateOptions.length > 0) {
      const currentStateId = formData.stateId;
      const resolved = resolveStateId({
        stateId: currentStateId,
        state: formData.state,
        state_name: formData.state
      });
      if (resolved && String(resolved) !== String(currentStateId)) {
        setFormData(prev => ({ ...prev, stateId: String(resolved) }));
      }
    }
  }, [stateOptions, editingEvent]);

  useEffect(() => {
    if (editingEvent && !formData.cityId && formData.city && cityOptions && cityOptions.length > 0) {
      const match = cityOptions.find(c => {
        const byName = String(c.city || c.value).trim().toLowerCase() === String(formData.city).trim().toLowerCase();
        const byState = !formData.stateId || !c.state_id || String(c.state_id) === String(formData.stateId);
        return byName && byState;
      });
      if (match && (match.city_id || match.id)) {
        setFormData(prev => ({ ...prev, cityId: String(match.city_id || match.id) }));
      } else {
        // Fallback: find by city name ignoring state and auto-correct state/stateId
        const byNameOnly = cityOptions.find(c => String(c.city || c.value).trim().toLowerCase() === String(formData.city).trim().toLowerCase());
        if (byNameOnly) {
          const newStateId = byNameOnly.state_id;
          // Resolve state label from stateOptions
          const stateOpt = stateOptions.find(s => String(s.state_id) === String(newStateId));
          const newStateLabel = stateOpt?.label || byNameOnly.state;
          setFormData(prev => ({
            ...prev,
            state: newStateLabel || prev.state,
            stateId: newStateId ? String(newStateId) : prev.stateId,
            city: String(byNameOnly.city || byNameOnly.value),
            cityId: String(byNameOnly.city_id || byNameOnly.id || '')
          }));
        }
      }
    }
  }, [cityOptions, formData.city, formData.stateId, editingEvent]);

  // If we have a cityId but city name is missing/mismatched, derive city and align state
  useEffect(() => {
    if (editingEvent && formData.cityId && cityOptions && cityOptions.length > 0) {
      const byId = cityOptions.find(c => String(c.city_id || c.id) === String(formData.cityId));
      if (byId) {
        const cityName = String(byId.city || byId.value);
        const cityStateId = byId.state_id;
        const stateOpt = stateOptions.find(s => String(s.state_id) === String(cityStateId));
        const stateLabel = stateOpt?.label || byId.state;

        const missingCityName = !formData.city || String(formData.city).trim().toLowerCase() !== cityName.trim().toLowerCase();
        const mismatchedState = cityStateId && String(formData.stateId) !== String(cityStateId);

        if (missingCityName || mismatchedState) {
          setFormData(prev => ({
            ...prev,
            city: cityName,
            state: stateLabel || prev.state,
            stateId: cityStateId ? String(cityStateId) : prev.stateId
          }));
        }
      }
    }
  }, [cityOptions, stateOptions, formData.cityId, editingEvent]);

  const handleInputChange = (field, value, selectedOption = null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Handle related ID fields for dropdowns
    if (selectedOption) {
      if (field === 'employeeName') {
        setFormData(prev => ({ ...prev, employeeId: selectedOption.id || '' }));
      } else if (field === 'clientName') {
        setFormData(prev => ({ ...prev, clientId: selectedOption.id || '' }));
      } else if (field === 'stateId') {
        // When state changes, set stateId and clear city selection
        let stateId = selectedOption.value || selectedOption.id || selectedOption.stateid;
        
        // Dynamic state ID resolution - find from available state options  
        if (!stateId || isNaN(stateId) || stateId < 10) {
          const stateName = selectedOption.value || selectedOption.label;
          
          // Find the state in stateOptions that matches the selected state name
          const matchingState = stateOptions.find(state => 
            (state.label || '').toLowerCase().trim() === stateName.toLowerCase().trim() ||
            (state.state || '').toLowerCase().trim() === stateName.toLowerCase().trim()
          );
          
          if (matchingState) {
            // Use the backend-provided state ID
            stateId = matchingState.value || matchingState.id || matchingState.stateid;
          } else {
            // No hardcoded fallback - let backend handle validation
            stateId = ''; // Let validation handle this
          }
        }
        
        setFormData(prev => ({ 
          ...prev, 
          state: selectedOption.value || selectedOption.label, // Store state name for display
          stateId: String(stateId || ''), // Store numeric ID for backend
          city: '', // Clear city when state changes
          cityId: '' // Clear city ID when state changes
        }));
      } else if (field === 'city') {
        const cityId = selectedOption.city_id || selectedOption.id;
        const cityStateId = selectedOption.state_id;
        
        // Verify city belongs to selected state
        if (cityStateId && formData.stateId && String(cityStateId) !== String(formData.stateId)) {
          // City doesn't belong to selected state - validation will handle this
          return;
        }
        
        setFormData(prev => ({ 
          ...prev, 
          city: selectedOption.value || selectedOption.label,
          cityId: String(cityId || '')
        }));
      } else if (field === 'source') {
        setFormData(prev => ({ ...prev, sourceId: String(selectedOption.id || selectedOption.source_id || '') }));
      } else if (field === 'branch') {
        setFormData(prev => ({ ...prev, branchId: selectedOption.id || '' }));
      }
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.plan) newErrors.plan = 'Plan is required';
    if (!formData.employeeName) newErrors.employeeName = 'Employee name is required';
    if (!formData.clientName) newErrors.clientName = 'Client name is required';
    if (!formData.state) newErrors.state = 'State is required';
    if (!formData.city) newErrors.city = 'City is required';
    if (!formData.position) newErrors.position = 'Position is required';
    if (!formData.source) newErrors.source = 'Source is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.time) newErrors.time = 'Time is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[EventFormModal] Submit clicked, editingEvent:', editingEvent);
    console.log('[EventFormModal] Form data:', formData);
    
    if (!validateForm()) {
      console.log('[EventFormModal] Validation failed:', errors);
      return;
    }
    
    console.log('[EventFormModal] Validation passed, calling onSubmit');
    console.log('[EventFormModal] onSubmit function:', onSubmit);
    console.log('[EventFormModal] Calling onSubmit now...');
    
    try {
      onSubmit(formData);
      console.log('[EventFormModal] onSubmit called successfully');
    } catch (error) {
      console.error('[EventFormModal] Error calling onSubmit:', error);
    }
  };

  if (!isOpen) return null;

  // Dynamic city filtering based on selected state
  const getCurrentCities = () => {
    if (!formData.state || !dropdownOptions.cities) {
      return [];
    }

    let excludedCount = 0;
    const filteredCities = dropdownOptions.cities
      .filter(city => {
        if (typeof city === 'string') return true;
        
        // Try multiple matching strategies:
        // 1. Match by state_id (numeric)
        const cityStateId = String(city.state_id || '');
        const selectedStateId = String(formData.stateId || '');
        const idMatch = cityStateId === selectedStateId;
        
        // 2. Match by state name (string)
        const cityStateName = (city.state || '').toLowerCase().trim();
        const selectedStateName = (formData.state || '').toLowerCase().trim();
        const nameMatch = cityStateName === selectedStateName;
        
        // 3. Match by partial name (for cases like "Tamil Nadu" vs "TamilNadu")
        const partialMatch = cityStateName.replace(/\s+/g, '') === selectedStateName.replace(/\s+/g, '');
        
        const isMatch = idMatch || nameMatch || partialMatch;
        
        // Only log first 3 excluded cities to avoid console spam
        if (!isMatch) {
          excludedCount++;
        }
        
        return isMatch;
      })
      .map(city => {
        if (typeof city === 'string') {
          return { 
            value: city, 
            label: city, 
            id: city,
            city_id: city,
            state_id: null
          };
        }
        
        const cityName = city.city_name || city.name || city.city || '';
        const stateName = city.state || formData.state || '';
        
        return {
          value: cityName,
          label: stateName ? `${cityName}, ${stateName}` : cityName, // Format: "Chennai, Tamil Nadu"
          id: String(city.city_id || city.id || ''),
          city_id: city.city_id || city.id,
          state_id: city.state_id,
          city: cityName,
          state: stateName
        };
      });

    return filteredCities;
  };


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[50] p-2 ">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm sm:max-w-lg lg:max-w-2xl max-h-[90vh] overflow-hidden border border-gray-200">
        <div className="px-3 py-1 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
                <Plus className="w-3 h-3 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {editingEvent ? 'Edit Event' : 'New Event'}
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="px-2 sm:px-4 lg:px-3 py-2 sm:py-3 lg:py-4 max-h-[calc(90vh-160px)] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-2 lg:space-y-4">
            {/* Basic Info Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Employee Name
                  {dropdownOptions.user_level && (
                    <span className="ml-2 text-xs text-blue-600 font-medium">
                      ({dropdownOptions.user_level.toUpperCase()} - {employeeOptions.length} available)
                    </span>
                  )}
                </label>
                <CustomDropdown
                  value={formData.employeeName}
                  onChange={(selected) => handleInputChange('employeeName', selected ? selected.value : '', selected)}
                  options={employeeOptions}
                  placeholder={
                    dropdownOptions.user_level === 'l1' ? "Only you can be assigned" :
                    dropdownOptions.user_level === 'l2' ? "Select from your team" :
                    dropdownOptions.user_level === 'l3' ? "Select from your branch" :
                    "Select employee"
                  }
                  isSearchable={true}
                  isClearable={true}
                />
                {errors.employeeName && <p className="text-red-500 text-sm mt-1">{errors.employeeName}</p>}
                {dropdownOptions.filtering_applied && (
                  <p className="text-xs text-gray-500 mt-1">
                    🔒 Role-based filtering: Showing employees you can assign events to
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Plan *</label>
                <CustomDropdown
                  value={formData.plan}
                  onChange={(selected) => handleInputChange('plan', selected ? selected.value : '')}
                  options={planOptions}
                  placeholder={
                    loadingPlans ? "Loading available plans..." :
                    (!formData.employeeName && !formData.employeeId) ? "Select employee first" :
                    !formData.date ? "Select date first" :
                    planOptions.length === 0 ? "No plans available (all assigned)" :
                    "Select plan"
                  }
                  isSearchable={true}
                  isClearable={true}
                  isDisabled={loadingPlans || (!formData.employeeName && !formData.employeeId) || !formData.date}
                />
                {errors.plan && <p className="text-red-500 text-sm mt-1">{errors.plan}</p>}
              </div>

              
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Client Name</label>
                <CustomDropdown
                  value={formData.clientName}
                  onChange={(selected) => handleInputChange('clientName', selected ? selected.value : '', selected)}
                  options={clientOptions}
                  placeholder="Select client"
                  isSearchable={true}
                  isClearable={true}
                />
                {errors.clientName && <p className="text-red-500 text-sm mt-1">{errors.clientName}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Position</label>
                <CustomDropdown
                  value={formData.position}
                  onChange={(selected) => handleInputChange('position', selected ? selected.value : '')}
                  options={positionOptions}
                  placeholder="Select position"
                  isSearchable={true}
                  isClearable={true}
                />
                {errors.position && <p className="text-red-500 text-sm mt-1">{errors.position}</p>}
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">State</label>
                <CustomDropdown
                  value={(function(){
                    const byId = stateOptions.find(s => String(s.state_id) === String(formData.stateId));
                    if (byId) return byId.value;
                    if (formData.state) {
                      const byLabel = stateOptions.find(s => s.label === formData.state || s.state === formData.state);
                      if (byLabel) return byLabel.value;
                    }
                    return '';
                  })()}
                  onChange={(selected) => {
                    // Use value field (should be ID when backend works correctly, like employees)
                    const stateId = selected ? String(selected.value) : '';
                    const stateName = selected ? selected.label : '';
                    
                    // Set both state name (for display) and state ID (for backend)
                    setFormData(prev => ({
                      ...prev,
                      state: stateName,
                      stateId: stateId,
                      city: '', // Clear city when state changes
                      cityId: ''
                    }));
                  }}
                  options={stateOptions}
                  placeholder="Select state"
                  isSearchable={true}
                  isClearable={true}
                />
                {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">City</label>
                <CustomDropdown
                  value={(function(){
                    if (formData.cityId) {
                      const byId = filteredCityOptions.find(c => String(c.city_id || c.id) === String(formData.cityId));
                      if (byId) return byId.value; // city name string
                    }
                    return formData.city;
                  })()}
                  onChange={(selected) => handleInputChange('city', selected ? selected.value : '', selected)}
                  options={filteredCityOptions}
                  placeholder="Select city"
                  isSearchable={true}
                  isClearable={true}
                  isDisabled={!formData.state}
                />
                {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Source</label>
                <CustomDropdown
                  value={formData.source}
                  onChange={(selected) => handleInputChange('source', selected ? selected.value : '', selected)}
                  options={sourceOptions}
                  placeholder="Select source"
                  isSearchable={true}
                  isClearable={true}
                />
                {errors.source && <p className="text-red-500 text-sm mt-1">{errors.source}</p>}
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={`w-full px-2 py-1 border text-sm border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${errors.date ? 'border-red-300' : ''}`}
                />
                {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Time</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleInputChange('time', e.target.value)}
                  className={`w-full px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${errors.time ? 'border-red-300' : ''}`}
                />
                {errors.time && <p className="text-red-500 text-sm mt-1">{errors.time}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => handleInputChange('remarks', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Enter remarks..."
                />
                {errors.remarks && <p className="text-red-500 text-sm mt-1">{errors.remarks}</p>}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-1">
              <button
                type="button"
                onClick={onClose}
                className="px-2 py-1 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{editingEvent ? 'Update' : 'Save'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EventFormModal;
