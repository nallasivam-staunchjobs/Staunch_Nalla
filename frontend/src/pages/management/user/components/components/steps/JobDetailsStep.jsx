import React, { useState, useEffect, useMemo, useCallback } from 'react';
import FormField from '../FormField';
import { Building2, Laptop2, RefreshCcw } from 'lucide-react';
import { validateStep } from '../../utils/validation';
import { toast } from 'react-toastify';

const JobDetailsStep = ({ formData, updateFormData, errors, setErrors }) => {
  const [touchedFields, setTouchedFields] = useState({});
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState('');
  const [positionOptions, setPositionOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [mastersLoading, setMastersLoading] = useState(false);
  const [workModeOptions, setWorkModeOptions] = useState([]);

  // Load Position, Department, and Work Mode options from Masters
  useEffect(() => {
    const fetchMasters = async () => {
      try {
        setMastersLoading(true);
        const base = import.meta.env.VITE_API_BASE_URL;

        const [posRes, depRes, wmRes] = await Promise.all([
          fetch(`${base}/masters/designations/`),
          fetch(`${base}/masters/departments/`),
          fetch(`${base}/masters/workmodes/`),
        ]);

        if (!posRes.ok) throw new Error(`Designations fetch failed: ${posRes.status}`);
        if (!depRes.ok) throw new Error(`Departments fetch failed: ${depRes.status}`);
        if (!wmRes.ok) throw new Error(`Work Modes fetch failed: ${wmRes.status}`);

        const [posData, depData, wmData] = await Promise.all([posRes.json(), depRes.json(), wmRes.json()]);

        const toOptions = (arr) =>
          (Array.isArray(arr) ? arr : [])
            .filter((i) => !i.status || i.status === 'Active')
            .map((i) => ({ value: i.name, label: i.name }));

        setPositionOptions(toOptions(posData));
        setDepartmentOptions(toOptions(depData));
        setWorkModeOptions(toOptions(wmData));
      } catch (err) {
        console.error('Error loading masters:', err);
        toast.error('Failed to load Masters data');
      } finally {
        setMastersLoading(false);
      }
    };

    fetchMasters();
  }, []);

  // Set default joining date to today if not already set
  useEffect(() => {
    if (!formData.joiningDate) {
      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      updateFormData({ joiningDate: today });
    }
  }, []); // Run only once when component mounts

  // Work modes loaded from API above

  

  // Level constants with labels
  const levels = [
    { value: 'L1', label: 'L1 - Employee' },
    { value: 'L2', label: 'L2 - Team Lead' },
    { value: 'L3', label: 'L3 - Branch Manager' },
    { value: 'L4', label: 'L4 - Regional Manager' },
    { value: 'L5', label: 'L5 - CEO' },
  ];

  // Hierarchy definition - who can report to whom
  const hierarchy = {
    'L1': ['L2', 'L3', 'L4', 'L5'],
    'L2': ['L3', 'L4', 'L5'],
    'L3': ['L4', 'L5'],
    'L4': ['L5'],
    'L5': []
  };

  // Fetch employees for reporting managers list
  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        console.warn('No authentication token found');
        toast.error('Authentication token not found. Please log in again.');
        return;
      }

      const url = `${import.meta.env.VITE_API_BASE_URL}/empreg/employees/`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, ${errorText}`);
      }

      const data = await response.json();
      const employeesData = data.results || data;
      const employeesList = Array.isArray(employeesData) ? employeesData : [];

      setEmployees(employeesList);
    } catch (err) {
      console.error('Error loading employees:', err);
      toast.error('Failed to load employees. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // When the step is revisited, ensure selectedLevel mirrors existing form data
  useEffect(() => {
    if (formData?.level) {
      setSelectedLevel(formData.level);
    }
  }, [formData?.level]);

  // Reporting managers useMemo - clean and simple
  const reportingManagers = useMemo(() => {
    if (!selectedLevel) return [];

    // Get allowed reporting levels for selected level
    const allowedLevels = hierarchy[selectedLevel] || [];

    // If no allowed levels (e.g., CEO), return empty array
    if (allowedLevels.length === 0) {
      return [];
    }

    // Filter employees by allowed levels, active status, and format for dropdown
    return employees
      .filter(emp => {
        if (!emp.firstName || !emp.level || !emp.employeeCode) return false;
        // Exclude inactive employees from dropdown
        if (emp.status === 'Inactive') return false;
        return allowedLevels.includes(emp.level);
      })
      .sort((a, b) => a.firstName.localeCompare(b.firstName))
      .map(emp => {
        const levelLabel = levels.find(l => l.value === emp.level)?.label || emp.level;
        return {
          value: emp.employeeCode, // Use employeeCode instead of ID
          label: `${emp.firstName} (${levelLabel})`,
          level: emp.level,
          ...emp
        };
      });
  }, [employees, selectedLevel]);

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouchedFields((prev) => ({ ...prev, [name]: true }));
    validateField(name);
  };

  const validateField = (fieldName) => {
    const stepErrors = validateStep(5, {
      ...formData,
      // Include any dependent fields if needed
    });

    setErrors((prev) => ({
      ...prev,
      [fieldName]: stepErrors[fieldName] || undefined,
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });

    if (errors[name] && touchedFields[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleRadioChange = (e) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
    validateField(name); // Immediately validate radio selections
  };

  // Custom Radio Tile Component with error state
  const RadioTile = ({
    name,
    value,
    currentValue,
    onChange,
    option,
    error,
    className = '',
  }) => {
    const isActive = currentValue === value;
    const hasError = !!error;

    let selectedColor =
      'border-gray-300 hover:border-gray-400 hover:bg-gray-100 text-gray-800';
    let errorClass = '';

    if (hasError) {
      errorClass = 'border-red-500';
    }

    if (isActive) {
      selectedColor = 'border-blue-500 bg-blue-500 text-white';
    }

    return (
      <label
        className={`relative flex flex-col items-center w-10 h-10 justify-center border-2 rounded-full cursor-pointer transition-all ${className} ${selectedColor} ${errorClass} shadow-md`}
      >
        <input
          type="radio"
          name={name}
          value={value}
          checked={isActive}
          onChange={onChange}
          className="absolute opacity-0 w-0 h-0"
        />
        <span>{option.icon}</span>
        <span className="text-[6px] tracking-wide mb-2">{option.label}</span>
      </label>
    );
  };


  return (
    <div className="space-y-3">
      <div className=" pb-2">
        <h3 className="text-lg font-semibold text-gray-900">Job Details</h3>

      </div>



      <div className="space-y-3">
        {/* First Row - Basic Job Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          <FormField
            label="Position"
            type="select"
            name="position"
            value={formData.position || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            options={[
              { value: '', label: 'Select Position', isDisabled: false },
              ...positionOptions,
            ]}
            required={true}
            error={errors.position}
          />

          <FormField
            label="Department"
            type="select"
            name="department"
            value={formData.department || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            options={[
              { value: '', label: 'Select Department', isDisabled: false },
              ...departmentOptions,
            ]}
            required={true}
            error={errors.department}
          />

          <FormField
            label="CTC (Annual)"
            type="number"
            name="ctc"
            value={formData.ctc || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="1500000"
            min="0"
            required={true}
            error={errors.ctc}
          />
        {/* </div>

       
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3"> */}
          <FormField
            label="Joining Date"
            type="date"
            name="joiningDate"
            value={formData.joiningDate || new Date().toISOString().split('T')[0]}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.joiningDate}
            required={true}
            disableFuture={true}
          />

          <div className="space-y-1">
            <FormField
              label="Level"
              type="select"
              name="level"
              value={formData.level || ''}
              onChange={(e) => {
                const newLevel = e.target.value;
                setSelectedLevel(newLevel);
                updateFormData({
                  level: newLevel,
                  reportingManager: '' // Clear reporting manager when level changes
                });
              }}
              onBlur={handleBlur}
              options={levels}
              placeholder="Select Level"
              error={errors.level}
              required
              className="w-full"
            />
          </div>

          <div className="space-y-1">
            <FormField
              label="Reporting Manager"
              type="select"
              name="reportingManager"
              value={formData.reportingManager || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              options={loading ? [] : reportingManagers}
              placeholder={
                loading
                  ? 'Loading employees...'
                  : (reportingManagers.length > 0
                    ? 'Select Reporting Manager'
                    : 'No managers available')
              }
              error={errors.reportingManager}
              required={formData.level && formData.level !== 'L5'}
              disabled={loading || reportingManagers.length === 0 || formData.level === 'L5'}
              className="w-full"
            />
          </div>

          <FormField
            label="Work Mode"
            type="select"
            name="workMode"
            value={formData.workMode || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            options={[
              { value: '', label: 'Select Work Mode', isDisabled: false },
              ...workModeOptions,
            ]}
            placeholder="Select Work Mode"
            error={errors.workMode}
            required
          />



          <FormField
            label="Reference Contact Name"
            type="text"
            name="referenceContactName"
            value={formData.referenceContactName || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Reference name"
            error={errors.referenceContactName}
          />

          <FormField
            label="Reference Contact Phone"
            type="tel"
            name="referenceContactPhone"
            value={formData.referenceContactPhone || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="+91 98765 43210"
            error={errors.referenceContactPhone}
          />



        </div>
      </div>


      {/* Work Mode */}
      {/* <div className="space-y-1">
          <FormField
            label="Work Mode"
            type="select"
            name="workMode"
            value={formData.workMode || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            options={workModeOptions}
            placeholder="Select Work Mode"
            error={errors.workMode}
            required
          /> */}



      {/* Branch */}
      {/* <div className="space-y-1">
          <FormField
            label="Branch"
            type="select"
            name="branch"
            value={formData.branch || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            options={branchOptions}
            placeholder="Select Branch"
            error={errors.branch}
            required
          />
        </div> */}

      {/* Level */}
      {/* <div className="space-y-1">
          <FormField
            label="Level"
            type="select"
            name="level"
            value={formData.level || ''}
            onChange={(e) => {
              const newLevel = e.target.value;
              console.log('Level changed to:', newLevel);
              setSelectedLevel(newLevel);
              updateFormData({ 
                level: newLevel,
                reportingManager: '' // Clear reporting manager when level changes
              });
            }}
            onBlur={handleBlur}
            options={levels}
            placeholder="Select Level"
            error={errors.level}
            required
          />
        </div>
      */}

      {/* {formData.level !== 'L5' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">     
          <div className="space-y-1">
            <FormField
              label="Reporting Manager"
              type="select"
              name="reportingManager"
              value={formData.reportingManager || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              options={loading ? [] : reportingManagers}
              placeholder={loading ? 'Loading employees...' : (reportingManagers.length > 0 ? 'Select Reporting Manager' : 'No managers available')}
              error={errors.reportingManager}
              required
              disabled={loading || reportingManagers.length === 0}
            />
          </div>
        </div>
      )} */}


      {formData.ctc && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Monthly CTC:</strong> ₹
            {Math.round(formData.ctc / 12).toLocaleString('en-IN')}
          </p>
        </div>
      )}
    </div>
  );
};

export default JobDetailsStep;
