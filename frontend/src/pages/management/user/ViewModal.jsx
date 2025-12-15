import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import debounce from 'lodash.debounce';
import API, { updateEmployee } from '../../../api/api';
import { employeeService } from '../../../api/employeeService';

import { 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Briefcase, 
  GraduationCap, 
  FileText, 
  Eye, 
  Upload, 
  ClipboardList, 
  Edit2, 
  Save, 
  XCircle, 
  CreditCard 
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatDate, formatCurrency, calculateAge } from './utils/helpers';

const ViewModal = ({ isOpen, employee, onClose, onUpdate, onRefresh }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [editedEmployee, setEditedEmployee] = useState({ ...employee });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [lastSavedField, setLastSavedField] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(null);
  const [fileProgress, setFileProgress] = useState(0);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [selectedLevel, setSelectedLevel] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [reportingManagerInfo, setReportingManagerInfo] = useState(null);
  const [branchOptions, setBranchOptions] = useState([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const [managerOptions, setManagerOptions] = useState([]);
  const [isLoadingManagers, setIsLoadingManagers] = useState(true);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [positionOptions, setPositionOptions] = useState([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(true);
  const [workModeOptions, setWorkModeOptions] = useState([]);
  const [isLoadingWorkModes, setIsLoadingWorkModes] = useState(true);
  const [genderOptions, setGenderOptions] = useState([]);
  const [isLoadingGenders, setIsLoadingGenders] = useState(true);
  const [maritalStatusOptions, setMaritalStatusOptions] = useState([]);
  const [isLoadingMaritalStatus, setIsLoadingMaritalStatus] = useState(true);
  const [bloodGroupOptions, setBloodGroupOptions] = useState([]);
  const [isLoadingBloodGroups, setIsLoadingBloodGroups] = useState(true);
  const [masterDataLoaded, setMasterDataLoaded] = useState(false);
  const debounceTimeoutRef = useRef(null);

  // Skill data states
  const [skillData, setSkillData] = useState([]);
  const [isLoadingSkills, setIsLoadingSkills] = useState(true);
  const [skillError, setSkillError] = useState(null);

  // Experience options state
  const [experienceOptions, setExperienceOptions] = useState([]);
  const [isLoadingExperience, setIsLoadingExperience] = useState(true);

  // Degree options state
  const [degreeOptions, setDegreeOptions] = useState([]);
  const [isLoadingDegree, setIsLoadingDegree] = useState(true);

  // Colors for the pie chart
  const COLORS = ['#4ade80', '#60a5fa', '#facc15', '#f87171', '#8884d8', '#82ca9d'];

  // Sample skill data
  const sampleData = [
    { name: 'Technical Skills', value: 45 },
    { name: 'Soft Skills', value: 25 },
    { name: 'Management', value: 20 },
    { name: 'Training', value: 10 },
  ];

  // Load skill data on component mount
  useEffect(() => {
    if (isOpen && employee) {
      setEditedEmployee({ ...employee });
      setErrors({});
      setIsLoading(true);
      
      // Fetch reporting manager info if exists
      if (employee.reportingManager) {
        fetchReportingManagerInfo(employee.reportingManager);
      }
      
      // Simulate loading time
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }
  }, [isOpen, employee]);

  // Load skill data on component mount
  useEffect(() => {
    if (employee?.id) {
      setIsLoadingSkills(true);

      // Simulate API call with timeout
      const timer = setTimeout(() => {
        try {
          setSkillData(sampleData);
          setSkillError(null);
        } catch (error) {
          console.error('Error setting skill data:', error);
          setSkillError('Failed to load skill data');
        } finally {
          setIsLoadingSkills(false);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [employee?.id]);

  // Load all master data once when component mounts
  useEffect(() => {
    // Prevent duplicate API calls
    if (masterDataLoaded) return;

    const fetchExperienceOptions = async () => {
      try {
        setIsLoadingExperience(true);
        const base = import.meta.env.VITE_API_BASE_URL;
        const response = await fetch(`${base}/masters/experience/`);
        
        if (!response.ok) {
          throw new Error(`Experience fetch failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Parse years from masters experience name into numeric string values
        const parseYearsValue = (name) => {
          const str = String(name || '');
          const match = str.match(/\d+/);
          if (match) return String(parseInt(match[0], 10));
          if (/fresh/i.test(str)) return '0';
          return '0';
        };

        const options = (Array.isArray(data) ? data : [])
          .filter((item) => !item.status || item.status === 'Active')
          .map((item) => ({ 
            value: parseYearsValue(item.name), 
            label: item.name 
          }));
        
        setExperienceOptions(options);
      } catch (error) {
        console.error('Error loading experience options:', error);
        // Fallback options
        setExperienceOptions([
          { value: '0', label: 'Fresher' },
          { value: '1', label: '1 Year' },
          { value: '2', label: '2 Years' },
          { value: '3', label: '3 Years' },
          { value: '4', label: '4 Years' },
          { value: '5', label: '5+ Years' }
        ]);
      } finally {
        setIsLoadingExperience(false);
      }
    };

    const fetchBranchOptions = async () => {
      try {
        setIsLoadingBranches(true);
        const base = import.meta.env.VITE_API_BASE_URL;
        const response = await fetch(`${base}/masters/branches/`);
        
        if (!response.ok) {
          throw new Error(`Branch fetch failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        const options = (Array.isArray(data) ? data : [])
          .filter((item) => !item.status || item.status === 'Active')
          .map((item) => ({ 
            value: String(item.id), // Use ID as value
            label: item.name        // Use name as label
          }));
        
        setBranchOptions(options);
      } catch (error) {
        console.error('Error loading branch options:', error);
        // Fallback options
        setBranchOptions([
          { value: '1', label: 'CBE' },
          { value: '2', label: 'MDU' },
        ]);
      } finally {
        setIsLoadingBranches(false);
      }
    };

    // Fetch manager options (simplified - now using reportingManagers useMemo)
    const fetchManagerOptions = async () => {
      try {
        setIsLoadingManagers(true);

        // Just load employees - the filtering is handled by reportingManagers useMemo
        const response = await employeeService.getAll();

        // Handle both response.data and direct response formats
        const employeesData = Array.isArray(response?.data) ? response.data :
                             Array.isArray(response) ? response : [];

        setEmployees(employeesData);

        console.log('Manager options loaded, filtering handled by reportingManagers useMemo');
      } catch (error) {
        console.error('Error loading manager options:', error);
        setEmployees([]);
      } finally {
        setIsLoadingManagers(false);
      }
    };

    // Fetch department options
    const fetchDepartmentOptions = async () => {
      try {
        setIsLoadingDepartments(true);
        const base = import.meta.env.VITE_API_BASE_URL;
        const response = await fetch(`${base}/masters/departments/`);
        
        if (!response.ok) {
          throw new Error(`Department fetch failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        const options = (Array.isArray(data) ? data : [])
          .filter((item) => !item.status || item.status === 'Active')
          .map((item) => ({ 
            value: item.name,
            label: item.name
          }));
        
        setDepartmentOptions(options);
      } catch (error) {
        console.error('Error loading department options:', error);
        setDepartmentOptions([]);
      } finally {
        setIsLoadingDepartments(false);
      }
    };

    // Fetch position options
    const fetchPositionOptions = async () => {
      try {
        setIsLoadingPositions(true);
        const base = import.meta.env.VITE_API_BASE_URL;
        const response = await fetch(`${base}/masters/positions/`);
        
        if (!response.ok) {
          throw new Error(`Position fetch failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        const options = (Array.isArray(data) ? data : [])
          .filter((item) => !item.status || item.status === 'Active')
          .map((item) => ({ 
            value: item.name,
            label: item.name
          }));
        
        setPositionOptions(options);
      } catch (error) {
        console.error('Error loading position options:', error);
        setPositionOptions([]);
      } finally {
        setIsLoadingPositions(false);
      }
    };

    // Helper function to try multiple endpoint variations
    const tryMultipleEndpoints = async (endpointVariations, dataType) => {
      const base = import.meta.env.VITE_API_BASE_URL;
      
      for (const endpoint of endpointVariations) {
        try {
          console.log(`Trying ${dataType} endpoint: ${base}${endpoint}`);
          const response = await fetch(`${base}${endpoint}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ ${dataType} endpoint found: ${endpoint}`);
            return data;
          }
        } catch (error) {
          console.log(`❌ ${dataType} endpoint failed: ${endpoint}`, error.message);
        }
      }
      
      throw new Error(`All ${dataType} endpoints failed`);
    };

    // Fetch work mode options from masters API
    const fetchWorkModeOptions = async () => {
      try {
        setIsLoadingWorkModes(true);
        const base = import.meta.env.VITE_API_BASE_URL;
        const response = await fetch(`${base}/masters/workmodes/`);
        
        if (!response.ok) {
          throw new Error(`Work mode fetch failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        const options = (Array.isArray(data) ? data : [])
          .filter((item) => !item.status || item.status === 'Active')
          .map((item) => ({ 
            value: item.name, 
            label: item.name 
          }));
        
        setWorkModeOptions(options);
      } catch (error) {
        console.error('Error loading work mode options:', error);
        setWorkModeOptions([]);
      } finally {
        setIsLoadingWorkModes(false);
      }
    };

    // Fetch gender options from masters API
    const fetchGenderOptions = async () => {
      try {
        setIsLoadingGenders(true);
        const base = import.meta.env.VITE_API_BASE_URL;
        const response = await fetch(`${base}/masters/genders/`);
        
        if (!response.ok) {
          throw new Error(`Gender fetch failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        const options = (Array.isArray(data) ? data : [])
          .filter((item) => !item.status || item.status === 'Active')
          .map((item) => ({ 
            value: item.name, 
            label: item.name 
          }));
        
        setGenderOptions(options);
      } catch (error) {
        console.error('Error loading gender options:', error);
        setGenderOptions([]);
      } finally {
        setIsLoadingGenders(false);
      }
    };

    // Fetch marital status options from masters API
    const fetchMaritalStatusOptions = async () => {
      try {
        setIsLoadingMaritalStatus(true);
        const base = import.meta.env.VITE_API_BASE_URL;
        const response = await fetch(`${base}/masters/maritalstatuses/`);
        
        if (!response.ok) {
          throw new Error(`Marital status fetch failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        const options = (Array.isArray(data) ? data : [])
          .filter((item) => !item.status || item.status === 'Active')
          .map((item) => ({ 
            value: item.name, 
            label: item.name 
          }));
        
        setMaritalStatusOptions(options);
      } catch (error) {
        console.error('Error loading marital status options:', error);
        setMaritalStatusOptions([]);
      } finally {
        setIsLoadingMaritalStatus(false);
      }
    };

    // Fetch blood group options from masters API
    const fetchBloodGroupOptions = async () => {
      try {
        setIsLoadingBloodGroups(true);
        const base = import.meta.env.VITE_API_BASE_URL;
        const response = await fetch(`${base}/masters/bloodgroups/`);
        
        if (!response.ok) {
          throw new Error(`Blood group fetch failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        const options = (Array.isArray(data) ? data : [])
          .filter((item) => !item.status || item.status === 'Active')
          .map((item) => ({ 
            value: item.name, 
            label: item.name 
          }));
        
        setBloodGroupOptions(options);
      } catch (error) {
        console.error('Error loading blood group options:', error);
        setBloodGroupOptions([]);
      } finally {
        setIsLoadingBloodGroups(false);
      }
    };

    // Consolidated degree options fetch function
    const fetchDegreeOptions = async () => {
      try {
        setIsLoadingDegree(true);
        const base = import.meta.env.VITE_API_BASE_URL;
        const response = await fetch(`${base}/masters/educations/`);
        
        if (!response.ok) {
          throw new Error(`Education fetch failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        const options = (Array.isArray(data) ? data : [])
          .filter((item) => !item.status || item.status === 'Active')
          .map((item) => ({ 
            value: item.name, 
            label: item.name 
          }));
        
        setDegreeOptions(options);
      } catch (error) {
        console.error('Error loading degree options:', error);
        // Fallback options
        setDegreeOptions([
          { value: 'Bachelor\'s Degree', label: 'Bachelor\'s Degree' },
          { value: 'Master\'s Degree', label: 'Master\'s Degree' },
          { value: 'PhD', label: 'PhD' },
          { value: 'Diploma', label: 'Diploma' },
          { value: 'Certificate', label: 'Certificate' },
          { value: 'High School', label: 'High School' }
        ]);
      } finally {
        setIsLoadingDegree(false);
      }
    };

    // Fetch all master data in parallel
    const fetchAllMasterData = async () => {
      try {
        await Promise.all([
          fetchExperienceOptions(),
          fetchBranchOptions(),
          fetchManagerOptions(),
          fetchDepartmentOptions(),
          fetchPositionOptions(),
          fetchDegreeOptions(),
          fetchWorkModeOptions(),
          fetchGenderOptions(),
          fetchMaritalStatusOptions(),
          fetchBloodGroupOptions()
        ]);
        console.log('All master data loaded successfully');
      } catch (error) {
        console.error('Error loading master data:', error);
      } finally {
        setMasterDataLoaded(true);
      }
    };

    fetchAllMasterData();
  }, [masterDataLoaded]);

  // Remove the duplicate useEffect for degree options
  // useEffect(() => {
  //   const fetchDegreeOptions = async () => {
  //     // ... (moved above)
  //   };
  //   fetchDegreeOptions();
  // }, []);

  // Initialize with employee data
  useEffect(() => {
    if (employee) {
      console.log('Initializing editedEmployee with:', { 
        degree: employee.degree, 
        yearsOfExperience: employee.yearsOfExperience 
      });
      setEditedEmployee({ ...employee });
      setIsLoading(false);
    }
  }, [employee]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Email validation regex
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Level options for dropdown
  const levelOptions = [
    { value: 'L1', label: 'L1 - Employee' },
    { value: 'L2', label: 'L2 - Team Lead' },
    { value: 'L3', label: 'L3 - Branch Manager' },
    { value: 'L4', label: 'L4 - Regional Manager' },
    { value: 'L5', label: 'L5 - CEO' },
  ];

  // Level mappings removed - we now store L1, L2, L3, L4, L5 directly in database

  // Separate mapping for display names
  const levelDisplayNames = {
    'L1': 'Employee',
    'L2': 'Team Lead',
    'L3': 'Branch Manager',
    'L4': 'Regional Manager',
    'L5': 'CEO'
  };

  // Format level display - simplified for L1, L2, L3, L4, L5 format
  const formatLevelDisplay = (level) => {
    if (!level) return '-';
    console.log('formatLevelDisplay input:', level); // Debug log
    
    // Database now stores L1, L2, L3, L4, L5 directly
    if (['L1', 'L2', 'L3', 'L4', 'L5'].includes(level)) {
      const levelName = levelDisplayNames[level];
      const result = `${levelName} (${level})`;
      console.log('formatLevelDisplay result:', result); // Debug log
      return result;
    }
    
    // Fallback for unknown values
    const result = level.charAt(0).toUpperCase() + level.slice(1);
    console.log('formatLevelDisplay result:', result); // Debug log
    return result;
  };

  // Helper function to get the correct document URL for both local and server environments
  const getDocumentUrl = (documentPath) => {
    if (!documentPath) return null;
    
    // If it's already a full URL (starts with http), return as is
    if (documentPath.startsWith('http://') || documentPath.startsWith('https://')) {
      return documentPath;
    }
    
    // If it's a relative path, prepend the API base URL
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
    
    // Remove leading slash if present to avoid double slashes
    const cleanPath = documentPath.startsWith('/') ? documentPath.slice(1) : documentPath;
    
    return `${baseUrl}/${cleanPath}`;
  };

  // Get branch name from branch ID
  const getBranchName = (branchId) => {
    if (!branchId || !branchOptions.length) return branchId || '-';
    const branch = branchOptions.find(option => option.value === String(branchId));
    return branch ? branch.label : branchId;
  };

  // Load employees for reporting manager dropdown
  const loadEmployees = useCallback(async () => {
    try {
      setLoadingEmployees(true);
      const response = await employeeService.getAll();

      // Handle both response.data and direct response formats
      const employeesData = Array.isArray(response?.data) ? response.data :
                           Array.isArray(response) ? response : [];

      console.log('Loaded employees:', employeesData.length);
      console.log('Sample employee data:', employeesData.slice(0, 2));
      
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  // Load employees when component mounts
  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // Update selectedLevel when employee data changes
  useEffect(() => {
    if (employee?.level) {
      // Database now stores L1, L2, L3, L4, L5 directly
      if (['L1', 'L2', 'L3', 'L4', 'L5'].includes(employee.level)) {
        setSelectedLevel(employee.level);
      } else {
        setSelectedLevel('L1'); // Default fallback
      }
    }
  }, [employee?.level]);

  // Get allowed reporting levels based on selected level (like JobDetailsStep.jsx)
  const getAllowedReportingLevels = (level) => {
    const levelHierarchy = {
      'L1': ['L2', 'L3', 'L4', 'L5'],
      'L2': ['L3', 'L4', 'L5'],
      'L3': ['L4', 'L5'],
      'L4': ['L5'],
      'L5': []
    };
    return levelHierarchy[level] || [];
  };

  // Format and filter employees for reporting manager dropdown (simplified like JobDetailsStep.jsx)
  const reportingManagers = useMemo(() => {
    if (!selectedLevel) return [];

    // Get allowed reporting levels for selected level
    const allowedLevels = getAllowedReportingLevels(selectedLevel);

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
        const levelLabel = levelOptions.find(l => l.value === emp.level)?.label || emp.level;
        return {
          value: emp.employeeCode, // Use employeeCode instead of ID (like JobDetailsStep)
          label: `${emp.firstName} (${levelLabel})`,
          level: emp.level,
          ...emp
        };
      });
  }, [employees, selectedLevel]);

  // Get manager display name from manager employeeCode (updated to use new structure)
  const getManagerDisplayName = (employeeCode) => {
    if (!employeeCode) return '-';

    console.log('getManagerDisplayName called with:', employeeCode);
    console.log('Employees array length:', employees.length);
    console.log('Reporting managers array length:', reportingManagers.length);

    // Try to find manager in filtered options first
    const manager = reportingManagers.find(option => option.value === employeeCode);

    if (manager) {
      console.log('Found manager in filtered list:', manager.label);
      return manager.label;
    }

    // If not found in filtered options, try the full employee list
    const fullManager = employees.find(emp => emp.employeeCode === employeeCode);
    if (fullManager) {
      console.log('Found manager in full employee list:', fullManager);
      
      // Database now stores L1, L2, L3, L4, L5 directly
      const levelLabel = levelOptions.find(l => l.value === fullManager.level)?.label || fullManager.level;
      const displayName = `${fullManager.firstName} (${levelLabel})`;
      console.log('Generated display name:', displayName);
      return displayName;
    }

    // If still loading, show loading state
    if (loadingEmployees) {
      console.log('Still loading employees...');
      return 'Loading...';
    }

    // Final fallback: show employeeCode with note that employee might not exist
    console.log('Manager not found anywhere, using fallback');
    return `Employee Code: ${employeeCode} (Not Found)`;
  };

  // Handle level change - update selectedLevel and clear reporting manager
  const handleLevelChange = (newLevel) => {
    console.log('Level changed to:', newLevel);
    setSelectedLevel(newLevel);

    // Clear reporting manager when level changes (like JobDetailsStep.jsx)
    setEditedEmployee(prev => ({
      ...prev,
      reportingManager: '',
      level: newLevel
    }));
  };

  // Fetch reporting manager info
  const fetchReportingManagerInfo = async (employeeCode) => {
    console.log('fetchReportingManagerInfo called with employeeCode:', employeeCode);
    if (!employeeCode) {
      console.log('No employeeCode provided, setting reportingManagerInfo to null');
      setReportingManagerInfo(null);
      return;
    }

    try {
      console.log('About to call employeeService.getByEmployeeCode with:', employeeCode);
      const response = await employeeService.getByEmployeeCode(employeeCode);
      console.log('employeeService.getByEmployeeCode response:', response);
      
      // Handle both response.data and direct response formats
      const manager = response?.data || response;
      
      if (manager && manager.id) {
        console.log('Manager data exists, processing...');
        
        // Debug log to see what data we have for this employee
        console.log(`Employee ${employeeCode} data:`, {
          id: manager.id,
          firstName: manager.firstName,
          lastName: manager.lastName,
          employeeCode: manager.employeeCode,
          level: manager.level
        });
        
        // Get the level code and level name for display - simplified for L1, L2, L3, L4, L5 format
        let managerLevelCode, managerLevelName;
        if (['L1', 'L2', 'L3', 'L4', 'L5'].includes(manager.level)) {
          managerLevelCode = manager.level; // e.g., "L3"
          managerLevelName = levelDisplayNames[manager.level] || manager.level; // e.g., "Branch Manager"
        } else {
          managerLevelCode = manager.level || 'Unknown';
          managerLevelName = manager.level || 'Unknown';
        }
        
        // Build display name with available data
        const firstName = manager.firstName || '';
        const lastName = manager.lastName || '';
        const employeeCode = manager.employeeCode || '';
        
        // Display only first name (simplified format)
        let displayName = firstName || employeeCode || `Employee Code ${employeeCode}`;
        
        const managerInfo = {
          firstName: firstName || 'Unknown',
          level: managerLevelCode,
          display: `${displayName} (${managerLevelName})`
        };
        console.log('Setting reportingManagerInfo to:', managerInfo);
        setReportingManagerInfo(managerInfo);
      } else {
        console.log('No data in response or response is null/undefined');
        console.log('Response structure:', response);
        setReportingManagerInfo({
          firstName: 'Unknown',
          level: 'Unknown',
          display: `Employee Code: ${employeeCode} (No Data)`
        });
      }
    } catch (error) {
      console.error(`Error fetching reporting manager info for Code ${employeeCode}:`, error);
      
      // Set a fallback info indicating the employee was not found
      setReportingManagerInfo({
        firstName: 'Unknown',
        level: 'Unknown',
        display: `Employee Code: ${employeeCode} (Not Found)`
      });
    }
  };

  // Validate field
  const validateField = (fieldName, value) => {
    const newErrors = { ...errors };

    if (fieldName === "firstName" && !value) {
      newErrors.firstName = "First name is required";
    } else if (fieldName === "lastName" && !value) {
      newErrors.lastName = "Last name is required";
    } else if (fieldName === "phone1" && !value) {
      newErrors.phone1 = "Primary phone is required";
    } else if ((fieldName === "personalEmail" || fieldName === "officialEmail") && value && !validateEmail(value)) {
      newErrors[fieldName] = "Enter a valid email address";
    } else {
      delete newErrors[fieldName];
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate file before upload
  const validateFile = (file, fieldName) => {
    // Common file size limit (5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    if (file.size > MAX_FILE_SIZE) {
      console.error(`File size should be less than 5MB`);
      return false;
    }

    // File type validation based on field
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    switch (fieldName) {
      case 'profilePhoto':
        if (!fileType.startsWith('image/')) {
          console.error('Please upload an image file (JPEG, PNG, etc.)');
          return false;
        }
        break;

      case 'aadhaarFront':
      case 'aadhaarBack':
      case 'panFiles':
        const idDocExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
        const idDocExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
        if (!idDocExtensions.includes(idDocExtension)) {
          console.error('Please upload a valid ID document (PDF, JPG, PNG)');
          return false;
        }
        break;

      case 'offerLetterFiles':
      case 'relievingLetterFiles':
      case 'payslipFiles':
        const docExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
        const docExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
        if (!docExtensions.includes(docExtension)) {
          console.error('Please upload a valid document (PDF, JPG, PNG, DOC, DOCX)');
          return false;
        }
        break;
    }

    return true;
  };

  // Handle file upload - Direct API call like EducationExperienceStep
  const handleFileUpload = async (fieldName, file) => {
    if (!file) return null;

    // Validate file before upload
    if (!validateFile(file, fieldName)) {
      return null;
    }

    try {
      setUploadingFile(fieldName);
      setFileProgress(0);

      // Create FormData directly like in EducationExperienceStep
      const formData = new FormData();
      formData.append(fieldName, file);

      // Make direct API call to employee update endpoint
      const response = await API.put(`/empreg/employees/${employee.id}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const updateResult = response.data;

      // Update the UI with the new file URL
      const fileUrl = updateResult[fieldName];
      if (fileUrl) {
        // Update both editedEmployee and the original employee prop reference
        setEditedEmployee(prev => ({
          ...prev,
          [fieldName]: fileUrl
        }));

        // Also update the employee prop by modifying it directly (for immediate UI update)
        if (employee) {
          employee[fieldName] = fileUrl;
        }

        // Show success message with file name
        const fileName = file.name.length > 20
          ? file.name.substring(0, 17) + '...'
          : file.name;

        console.log(`File "${fileName}" uploaded successfully`);
        console.log(`Updated ${fieldName} with URL:`, fileUrl);

        // Force a re-render by updating the state
        setTimeout(() => {
          setEditedEmployee(prev => ({
            ...prev,
            [fieldName]: fileUrl,
            // Add a timestamp to force re-render
            _lastUpdated: Date.now()
          }));
        }, 100);

        // Update parent component with direct data instead of going through employeeService
        if (onUpdate && typeof onUpdate === 'function') {
          try {
            // Create a simple update object that won't trigger employeeService transformations
            const simpleUpdate = {
              id: employee.id,
              [fieldName]: fileUrl
            };
            
            // Try to update parent, but don't let errors stop the file upload success
            await onUpdate(employee.id, simpleUpdate);
          } catch (error) {
            console.log('Parent update failed, but file upload was successful:', error.message);
            // File upload succeeded, so this is not a critical error
          }
        }

        // Refresh the employee list in the parent table (for LIFO ordering)
        if (onRefresh && typeof onRefresh === 'function') {
          try {
            await onRefresh();
            console.log('Employee list refreshed after file upload');
          } catch (error) {
            console.log('Employee list refresh failed after file upload:', error.message);
            // This is not critical since the file upload was successful
          }
        }

        return fileUrl;
      }

      throw new Error('Failed to get file URL from server');

    } catch (error) {
      console.error('Error uploading file:', error);
      console.error(error.response?.data || error.message || 'Failed to upload file');
      return null;
    } finally {
      setUploadingFile(null);
      setFileProgress(0);
    }
  };

  // Handle file change
  const handleFileChange = async (e, fieldName) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      // All current document fields are single file uploads
      await handleFileUpload(fieldName, files[0]);
    } catch (error) {
      // File upload errors are already handled in handleFileUpload
      console.log('File upload completed with some errors, but file may have been saved');
    }

    // Reset the file input to allow re-uploading the same file
    e.target.value = '';
  };

  // Handle file delete
  const handleFileDelete = async (fieldName) => {
    // Get the file name for the confirmation message
    let fileName = '';
    switch (fieldName) {
      case 'profilePhoto':
        fileName = 'profile photo';
        break;
      case 'aadhaarFront':
        fileName = 'Aadhaar front';
        break;
      case 'aadhaarBack':
        fileName = 'Aadhaar back';
        break;
      case 'panFiles':
        fileName = 'PAN card';
        break;
      case 'offerLetterFiles':
        fileName = 'offer letter';
        break;
      case 'relievingLetterFiles':
        fileName = 'relieving letter';
        break;
      case 'payslipFiles':
        fileName = 'payslip';
        break;
      default:
        fileName = 'file';
    }

    if (!window.confirm(`Are you sure you want to delete this ${fileName}? This action cannot be undone.`)) {
      return;
    }

    try {
      // Create FormData with null value to delete the file reference
      const formData = new FormData();
      formData.append(fieldName, ''); // Empty string to clear the field

      // Make direct API call to employee update endpoint
      const response = await API.put(`/empreg/employees/${employee.id}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data;

      // Update both editedEmployee and the original employee prop reference
      setEditedEmployee(prev => ({
        ...prev,
        [fieldName]: null
      }));

      // Also update the employee prop by modifying it directly (for immediate UI update)
      if (employee) {
        employee[fieldName] = null;
      }

      console.log(`${fileName.charAt(0).toUpperCase() + fileName.slice(1)} deleted successfully`);

      // Force a re-render by updating the state
      setTimeout(() => {
        setEditedEmployee(prev => ({
          ...prev,
          [fieldName]: null,
          // Add a timestamp to force re-render
          _lastUpdated: Date.now()
        }));
      }, 100);

      // Update parent component with direct data instead of going through employeeService
      if (onUpdate && typeof onUpdate === 'function') {
        try {
          // Create a simple update object that won't trigger employeeService transformations
          const simpleUpdate = {
            id: employee.id,
            [fieldName]: null
          };
          
          // Try to update parent, but don't let errors stop the file delete success
          await onUpdate(employee.id, simpleUpdate);
        } catch (error) {
          console.log('Parent update failed, but file delete was successful:', error.message);
          // File delete succeeded, so this is not a critical error
        }
      }

      return data;
    } catch (error) {
      console.error('Error deleting file:', error);
      console.error(error.response?.data || error.message || 'Failed to delete file');
      throw error;
    }
  };

  // Save function for form fields with debounce protection
  const saveField = useCallback(async (fieldName, fieldValue) => {
    console.log('saveField called with:', { fieldName, fieldValue });

    if (!employee?.id) {
      console.error('No employee ID found');
      console.error('No employee selected');
      return false;
    }

    // Prevent duplicate saves for the same field and value
    const saveKey = `${fieldName}_${fieldValue}`;
    if (isSaving || lastSavedField === saveKey) {
      console.log('Skipping duplicate save for:', saveKey);
      return false;
    }

    // Convert empty strings to null for database
    if (fieldValue === '') {
      fieldValue = null;
    }

    // Handle numeric fields
    const numericFields = ['ctc', 'yearsOfExperience'];
    if (numericFields.includes(fieldName) && fieldValue !== null) {
      // Convert to number and handle empty strings
      fieldValue = fieldValue === '' ? null : Number(fieldValue);

      // Validate number is not negative
      if (fieldValue !== null && isNaN(fieldValue)) {
        console.error(`Please enter a valid number for ${fieldName}`);
        return false;
      }
    }

    // Trim whitespace for string fields
    if (typeof fieldValue === 'string' && !fieldName.toLowerCase().includes('password')) {
      fieldValue = fieldValue.trim();
    }

    // Skip if value hasn't changed from original
    const originalValue = employee[fieldName];
    console.log('Original value:', originalValue);

    // Special handling for numeric fields to compare numbers properly
    if (numericFields.includes(fieldName)) {
      if (Number(fieldValue) === Number(originalValue)) {
        console.log('Value unchanged, skipping save');
        return false;
      }
    } else if (fieldValue === originalValue || (fieldValue === '' && (originalValue === null || originalValue === undefined))) {
      console.log('Value unchanged, skipping save');
      return false;
    }

    // For address fields, bypass validation or use a more permissive validation
    const isAddressField = fieldName === 'permanentAddress' || fieldName === 'currentAddress';
    const isTextAreaField = fieldName === 'experienceDetails';

    if (!isAddressField && !isTextAreaField && !validateField(fieldName, fieldValue)) {
      console.log('Validation failed for field:', fieldName);
      return false;
    } else if (isAddressField || isTextAreaField) {
      console.log('Skipping validation for field:', fieldName);
    }

    // Create a simple object with the field to update
    const updateData = {
      [fieldName]: fieldValue
    };

    console.log('Saving field:', fieldName, 'with value:', fieldValue, 'type:', typeof fieldValue);
    console.log('Update data:', updateData);

    try {
      setIsSaving(true);

      // Make the API call directly
      const response = await employeeService.update(employee.id, updateData);
      console.log('Direct API response:', response);

      if (response) {
        // Update the local state with the response from the server
        setEditedEmployee(prev => ({
          ...prev,
          ...response,
          [fieldName]: fieldValue // Ensure our field is set to the value we sent
        }));

        setLastSavedField(saveKey);

        // Clear the lastSavedField after a short delay to allow new saves
        setTimeout(() => {
          setLastSavedField(null);
        }, 1000);

        // Show a success message
        const fieldLabel = fieldName
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase())
          .trim();

        console.log(`${fieldLabel} updated successfully`);

        // Notify parent with the response data (no additional API call needed)
        if (onUpdate && typeof onUpdate === 'function') {
          try {
            await onUpdate(employee.id, response); // Pass response instead of updateData
          } catch (error) {
            console.log('Parent update notification failed:', error.message);
            // This is not critical since we already updated successfully
          }
        }

        // Refresh the employee list in the parent table (for LIFO ordering)
        if (onRefresh && typeof onRefresh === 'function') {
          try {
            await onRefresh();
            console.log('Employee list refreshed successfully');
          } catch (error) {
            console.log('Employee list refresh failed:', error.message);
            // This is not critical since the field was updated successfully
          }
        }

        // Reset the active field after a short delay
        setTimeout(() => {
          setActiveField(null);
        }, 500);

        return true;
      }
    } catch (error) {
      console.error('Error saving field:', error);

      // Extract error message from different possible response formats
      let errorMessage = 'Failed to update field';

      if (error.response) {
        // Handle HTTP errors
        console.error('Error response data:', error.response.data);

        // Try to get a meaningful error message from the response
        if (error.response.data) {
          // Handle Django REST framework validation errors
          if (typeof error.response.data === 'object') {
            // Get the first error message from the response
            const errorKey = Object.keys(error.response.data)[0];
            const errorDetail = error.response.data[errorKey];

            if (Array.isArray(errorDetail)) {
              errorMessage = errorDetail[0];
            } else if (typeof errorDetail === 'string') {
              errorMessage = errorDetail;
            } else if (errorDetail && typeof errorDetail === 'object') {
              errorMessage = Object.values(errorDetail)[0]?.[0] || errorMessage;
            }
          } else if (typeof error.response.data === 'string') {
            errorMessage = error.response.data;
          }
        }

        // Handle specific status codes
        if (error.response.status === 400) {
          errorMessage = errorMessage || 'Invalid data provided';
        } else if (error.response.status === 401) {
          errorMessage = 'Session expired. Please log in again.';
        } else if (error.response.status === 403) {
          errorMessage = 'You do not have permission to perform this action';
        } else if (error.response.status === 404) {
          errorMessage = 'Employee not found';
        } else if (error.response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        // Something happened in setting up the request
        console.error('Error setting up request:', error.message);
        errorMessage = error.message || 'Failed to process request';
      }

      // Show error message to user
      console.error(`Failed to update ${fieldName}: ${errorMessage}`);

      // Revert to the original value in the UI
      setEditedEmployee(prev => ({
        ...prev,
        [fieldName]: employee[fieldName] // Use the original value from props
      }));

      return false;
    } finally {
      setIsSaving(false);
    }
  }, [employee?.id, onUpdate, employee]);

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value, files, type } = e.target;
    const updatedValue = type === "file" ? files[0] : value;

    // Only update local state, don't save yet
    setEditedEmployee(prev => ({
      ...prev,
      [name]: updatedValue
    }));
  };

  // Handle manual save (e.g., on blur or enter key)
  const handleFieldSave = useCallback((fieldNameOrEvent, value) => {
    // Handle both direct calls and event-based calls
    let fieldName = fieldNameOrEvent;
    let fieldValue = value;

    // If first argument is an event, extract the field name and value
    if (fieldNameOrEvent && typeof fieldNameOrEvent === 'object' && fieldNameOrEvent.target) {
      const target = fieldNameOrEvent.target;
      fieldName = target.name || target.getAttribute('name');
      fieldValue = target.value !== undefined ? target.value : target.getAttribute('value');
    }

    // Validate field name
    if (!fieldName || typeof fieldName !== 'string') {
      console.error('Invalid field name:', fieldName);
      return;
    }

    // Clear any pending debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    // Save the field if saveField is a function and we have a valid value
    if (typeof saveField === 'function') {
      // Only save if the value is defined and not null
      if (fieldValue !== undefined && fieldValue !== null) {
        saveField(fieldName, fieldValue);
      } else {
        console.error('Invalid value for field', fieldName, ':', fieldValue);
      }
    } else {
      console.error('saveField is not a function');
    }
  }, [saveField]);

  // Handle field edit
  const handleFieldEdit = useCallback((fieldName) => {
    setActiveField(fieldName);
    setLastSavedField(null);

    // Ensure the field is scrolled into view
    setTimeout(() => {
      const element = document.querySelector(`[name="${fieldName}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 10);
  }, []);

  // Loading state is now handled in the employee effect

  if (!employee || !employee.id) return null;
  // Component sub-components
  const SectionHeader = React.memo(({ title, icon }) => (
    <div className="flex items-center gap-1.5 mb-2 pb-1 border-b border-gray-100">
      <div className="text-blue-600">{icon}</div>
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
    </div>
  ));

  const InfoPro = React.memo(({ value, fieldName, className = '', type = 'text', isUsername = false, activeField, onFieldEdit, onFieldSave, isSaving, isReadOnly: propIsReadOnly = false }) => {
    const isReadOnly = fieldName === 'employeeCode' || propIsReadOnly;
    const isActive = activeField === fieldName;
    const inputRef = React.useRef(null);
    const [localValue, setLocalValue] = React.useState(value || '');
    const cursorPosition = React.useRef({ start: 0, end: 0 });
    const Tag = isUsername ? 'div' : 'h2';
    const prevIsActive = React.useRef(false);

    // Sync local value when value changes from props
    React.useEffect(() => {
      if (value !== localValue && !isActive) {
        setLocalValue(value || '');
      }
    }, [value, isActive, localValue]);

    // Track cursor position
    const handleSelect = React.useCallback((e) => {
      if (inputRef.current && e.target) {
        cursorPosition.current = {
          start: e.target.selectionStart || 0,
          end: e.target.selectionEnd || 0
        };
      }
    }, []);

    // Handle input changes
    const handleChange = React.useCallback((e) => {
      const newValue = e.target.value;
      const cursorPos = e.target.selectionStart || 0;

      // Update local value
      setLocalValue(newValue);

      // Store cursor position for restoration
      cursorPosition.current = {
        start: cursorPos,
        end: cursorPos
      };
    }, []);

    // Handle blur
    const handleBlur = React.useCallback((e) => {
      // Only save if the value has changed
      if (value !== localValue) {
        onFieldSave(fieldName, localValue);
      } else {
        // If no changes, just exit edit mode
        onFieldSave(fieldName, null, true);
      }
    }, [value, localValue, fieldName, onFieldSave]);

    // Handle key down
    const handleKeyDown = React.useCallback((e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (value !== localValue) {
          onFieldSave(fieldName, localValue);
        } else {
          onFieldSave(fieldName, null, true);
        }
      } else if (e.key === 'Escape') {
        setLocalValue(value || '');
        onFieldSave(fieldName, null, true);
      }
    }, [value, localValue, fieldName, onFieldSave]);

    // Focus and cursor management
    React.useEffect(() => {
      if (!isActive || !inputRef.current) {
        prevIsActive.current = isActive;
        return;
      }

      const input = inputRef.current;
      const wasActive = prevIsActive.current;

      // Small delay to ensure the input is rendered
      const timeoutId = setTimeout(() => {
        if (!input) return;

        try {
          // Focus the input if it's not already focused
          if (document.activeElement !== input) {
            input.focus();
          }

          // Set cursor position
          if (!wasActive) {
            // For new focus, move cursor to the end
            const length = input.value.length;
            input.setSelectionRange(length, length);
          } else {
            // For existing focus, restore cursor position
            const { start, end } = cursorPosition.current;
            const length = input.value.length;
            
            if (typeof start === 'number' && typeof end === 'number') {
              const safeStart = Math.min(Math.max(0, start), length);
              const safeEnd = Math.min(Math.max(0, end), length);
              input.setSelectionRange(safeStart, safeEnd);
            }
          }
        } catch (error) {
          console.warn('Cursor positioning error:', error);
          // Fallback: just focus and move to end
          try {
            input.focus();
            const length = input.value.length;
            input.setSelectionRange(length, length);
          } catch (fallbackError) {
            console.warn('Fallback cursor positioning failed:', fallbackError);
          }
        }
      }, 0);

      prevIsActive.current = isActive;

      return () => {
        clearTimeout(timeoutId);
      };
    }, [isActive, localValue]);

    return (
      <Tag
        className={`${className} relative`}
        onClick={() => !isActive && !isReadOnly && onFieldEdit(fieldName)}
      >
        {isActive ? (
          <div className="relative">
            <input
              ref={inputRef}
              type={type}
              name={fieldName}
              value={localValue}
              onChange={handleChange}
              onSelect={handleSelect}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onKeyUp={handleSelect}
              onMouseUp={handleSelect}
              className={`w-full ${isUsername ? 'text-base' : 'text-xl font-bold'} border border-gray-300 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-text bg-white`}
              style={{ 
                minWidth: '100px',
                textAlign: 'center'
              }}
              autoComplete="off"
            />
            {isSaving && activeField === fieldName && (
              <div className="absolute right-0 top-0 text-xs text-gray-500 animate-pulse">
                Saving...
              </div>
            )}
          </div>
        ) : (
          <span
            className={`${isReadOnly ? 'cursor-default' : 'cursor-pointer hover:bg-gray-100'} p-1 rounded block ${isUsername ? 'text-base' : 'text-xl font-bold'}`}
            onClick={() => !isReadOnly && onFieldEdit(fieldName)}
          >
            {fieldName === 'ctc' && value ? formatCurrency(value) : value || '-'}
            {errors[fieldName] && (
              <span className="absolute left-0 -bottom-5 text-xs text-red-500">
                {errors[fieldName]}
              </span>
            )}
          </span>
        )}
      </Tag>
    );
  });

  const InfoRow = React.memo(({ label, value, fieldName, className = '', isReadOnly: propIsReadOnly = false, isControlled = true, onSave, isSaving = false, errors = {} }) => {
    // Define variables at the top
    const isReadOnly = fieldName === 'employeeCode' || propIsReadOnly;
    const isActive = activeField === fieldName;
    const inputRef = React.useRef(null);
    const [localValue, setLocalValue] = React.useState(value || '');
    const cursorPosition = React.useRef({ start: 0, end: 0 });
    const isMounted = React.useRef(false);

    // Determine input type based on field name
    const getInputType = () => {
      if (fieldName.includes('email')) return 'email';
      if (fieldName.includes('phone')) return 'tel';
      if (fieldName === 'ctc' || fieldName === 'salary') return 'number';
      return 'text';
    };

    const inputType = getInputType();

    // Sync local value when value changes from props
    React.useEffect(() => {
      setLocalValue(value || '');
    }, [value]);

    // Save cursor position
    const saveCursorPosition = (target) => {
      if (target && inputRef.current) {
        cursorPosition.current = {
          start: target.selectionStart,
          end: target.selectionEnd
        };
      }
    };

    // Track cursor position
    const handleSelect = (e) => {
      // Use requestAnimationFrame to ensure we get the latest selection
      requestAnimationFrame(() => {
        if (e.target === document.activeElement) {
          saveCursorPosition(e.target);
        }
      });
    };

    // Handle field edit
    const handleFieldEdit = (field) => {
      setActiveField(field);
    };

    // Handle input changes
    const handleChange = (e) => {
      const newValue = e.target.value;
      setLocalValue(newValue);

      // Save cursor position after state update
      requestAnimationFrame(() => {
        if (inputRef.current) {
          saveCursorPosition(inputRef.current);
        }
      });

      setActiveField(fieldName);
    };

    // Handle blur event
    const handleBlur = (e) => {
      const newValue = e.target.value.trim();
      
      // Check if we already saved on Enter key press
      const savedOnEnter = e.target.dataset.savedOnEnter === 'true';
      
      // If the value has changed and we're not already saving and didn't save on Enter
      if (newValue !== value && !isSaving && !savedOnEnter) {
        // Call the parent's save function if it exists
        if (typeof onSave === 'function') {
          onSave(fieldName, newValue);
        }
      }
      
      // Clean up the dataset flag
      delete e.target.dataset.savedOnEnter;
      
      // Reset active field
      setActiveField(null);
    };

    // Enhanced handleBlur with email validation
    const enhancedHandleBlur = (e) => {
      handleBlur(e);
      if (fieldName.includes('email') && e.target.value) {
        validateField(fieldName, e.target.value);
      }
    };

    // Unified key down handler
    const handleKeyDown = (e) => {
      // Save cursor position for all key presses
      saveCursorPosition(e.target);

      // Handle Enter key press
      if (e.key === 'Enter') {
        e.preventDefault();
        const newValue = e.target.value.trim();

        // For email fields, blur will trigger save
        if (fieldName.includes('email')) {
          e.target.blur();
        }
        // For other fields, save directly and prevent blur from saving again
        else if (newValue !== value && !isSaving && typeof onSave === 'function') {
          onSave(fieldName, newValue);
          setActiveField(null);
          // Mark that we've already saved to prevent blur from saving again
          e.target.dataset.savedOnEnter = 'true';
        }
      }
      // Handle Escape key
      else if (e.key === 'Escape') {
        setLocalValue(value || '');
        setActiveField(null);
      }
    };

    // Focus and cursor management
    React.useEffect(() => {
      if (isActive && inputRef.current && !isReadOnly) {
        const input = inputRef.current;

        // Focus the input and restore cursor position
        const focusInput = () => {
          if (document.activeElement !== input) {
            input.focus();

            // Skip cursor position restoration for number inputs
            if (inputType === 'number') {
              return;
            }

            // Set cursor position after a small delay to ensure the input is focused
            setTimeout(() => {
              const length = input.value.length;

              // Always position cursor at the end of text when entering edit mode
              if (input.setSelectionRange) {
                input.setSelectionRange(length, length);
              }
            }, 10);
          }
        };

        // Focus the input
        focusInput();

        // Set up a mutation observer to handle cases where the input might be re-rendered
        const observer = new MutationObserver(() => {
          if (document.activeElement !== input && input.offsetParent !== null) {
            focusInput();
          }
        });

        // Start observing the input's parent for changes
        if (input.parentNode) {
          observer.observe(input.parentNode, { childList: true, subtree: true });
        }

        return () => {
          observer.disconnect();
        };
      }
    }, [isActive, isReadOnly, localValue]);

    return (
      <div
        className={`flex justify-between py-1 text-xs ${className} relative`}
        onClick={() => !isActive && !isReadOnly && handleFieldEdit(fieldName)}
      >
        <span className="text-gray-600 font-medium w-2/5">{label}:</span>
        {isActive && !isReadOnly ? (
          <div className="w-3/5">
            <input
              ref={inputRef}
              type={inputType}
              name={fieldName}
              value={localValue}
              onChange={handleChange}
              onSelect={handleSelect}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onKeyUp={handleSelect}
              onMouseUp={handleSelect}
              className={`w-full text-left border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-text ${errors[fieldName] ? 'border-red-500' : ''}`}
            />
            {isSaving && activeField === fieldName && (
              <div className="absolute right-0 top-0 text-xs text-gray-500 animate-pulse">
                Saving...
              </div>
            )}
          </div>
        ) : (
          <span className={`text-gray-900 w-3/5 text-right ${isReadOnly ? 'cursor-default' : 'cursor-pointer hover:bg-gray-100'} px-1 py-0.5 rounded`}>
            {fieldName === 'ctc' && value ? formatCurrency(value) : value || '-'}
            {errors[fieldName] && (
              <span className="absolute right-0 -bottom-4 text-xs text-red-500">
                {errors[fieldName]}
              </span>
            )}
          </span>
        )}
      </div>
    );
  });

  const SelectRow = React.memo(({ label, value, fieldName, options, displayValue, isLoading = false }) => {
    const isActive = activeField === fieldName;
    const selectRef = React.useRef(null);

    const handleBlur = (e) => {
      // Only save if the value has changed
      if (editedEmployee[fieldName] !== value) {
        // Convert to number for yearsOfExperience field
        const saveValue = fieldName === 'yearsOfExperience' 
          ? (editedEmployee[fieldName] === '' ? null : Number(editedEmployee[fieldName]))
          : editedEmployee[fieldName];
        handleFieldSave(fieldName, saveValue);
      }
      setActiveField(null);
    };

    const handleChange = (e) => {
      const newValue = e.target.value;
      // Update local state immediately for better UX
      setEditedEmployee(prev => ({
        ...prev,
        [fieldName]: newValue
      }));
      // Save immediately on change for select elements
      // Convert to number for yearsOfExperience field
      const saveValue = fieldName === 'yearsOfExperience' 
        ? (newValue === '' ? null : Number(newValue))
        : newValue;
      handleFieldSave(fieldName, saveValue);
      // Set active field to null to prevent blur from saving again
      setActiveField(null);
    };

    React.useEffect(() => {
      // Focus the select when it becomes active
      if (isActive && selectRef.current) {
        selectRef.current.focus();
      }
    }, [isActive]);

    return (
      <div
        className="flex justify-between py-1 text-xs relative"
        onClick={() => !isActive && handleFieldEdit(fieldName)}
      >
        <span className="text-gray-600 font-medium w-2/5">{label}:</span>
        {isActive ? (
          <div className="w-3/5">
            <select
              ref={selectRef}
              name={fieldName}
              value={editedEmployee[fieldName] || value || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              autoFocus
              className="w-full text-left border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select an option</option>
              {options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {isSaving && activeField === fieldName && (
              <div className="absolute right-0 top-0 text-xs text-gray-500 animate-pulse">
                Saving...
              </div>
            )}
          </div>
        ) : (
          <span className="text-gray-900 w-3/5 text-right cursor-text hover:bg-gray-100 px-1 py-0.5 rounded">
            {isLoading ? (
              <span className="text-gray-400">Loading...</span>
            ) : displayValue ? (
              displayValue
            ) : (() => {
              // Debug logging for dropdown fields
              if (fieldName === 'yearsOfExperience' || fieldName === 'degree') {
                console.log(`SelectRow Debug [${fieldName}]:`, { 
                  fieldName, 
                  value, 
                  valueType: typeof value, 
                  options: options.slice(0, 3), // Show first 3 options
                  optionsCount: options.length 
                });
              }
              const matchedOption = options.find(opt => opt.value === value);
              const calculatedDisplayValue = matchedOption?.label || value || '-';
              
              // Additional debug for unmatched values
              if (!matchedOption && value && (fieldName === 'yearsOfExperience' || fieldName === 'degree')) {
                console.warn(`No match found for ${fieldName}:`, { value, availableOptions: options.map(opt => opt.value) });
              }
              
              return calculatedDisplayValue;
            })()}
          </span>
        )}
      </div>
    );
  });

  const DateRow = React.memo(({ label, value, fieldName }) => {
    const isActive = activeField === fieldName;
    const inputRef = React.useRef(null);
    const [dateValue, setDateValue] = React.useState('');

    // Format date for display and input
    const formatDateForInput = (dateString) => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      } catch (e) {
        return '';
      }
    };

    // Initialize date value
    React.useEffect(() => {
      setDateValue(formatDateForInput(editedEmployee[fieldName] || value));
    }, [editedEmployee[fieldName], value, fieldName]);

    const handleChange = (e) => {
      const newValue = e.target.value;
      setDateValue(newValue);
      // Update the editedEmployee state
      setEditedEmployee(prev => ({
        ...prev,
        [fieldName]: newValue
      }));
    };

    const handleBlur = () => {
      // Only save if the value has changed
      if (dateValue !== formatDateForInput(value)) {
        handleFieldSave(fieldName, dateValue);
      }
      setActiveField(null);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.target.blur();
      }
    };

    React.useEffect(() => {
      // Focus the input when it becomes active
      if (isActive && inputRef.current) {
        inputRef.current.focus();
      }
    }, [isActive]);

    return (
      <div
        className="flex justify-between py-1 text-xs relative"
        onClick={() => !isActive && handleFieldEdit(fieldName)}
      >
        <span className="text-gray-600 font-medium w-2/5">{label}:</span>
        {isActive ? (
          <div className="w-3/5">
            <input
              ref={inputRef}
              type="date"
              name={fieldName}
              value={dateValue}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-full text-right border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {isSaving && activeField === fieldName && (
              <div className="absolute right-0 top-0 text-xs text-gray-500 animate-pulse">
                Saving...
              </div>
            )}
          </div>
        ) : (
          <span className="text-gray-900 w-3/5 text-right cursor-text hover:bg-gray-100 px-1 py-0.5 rounded">
            {value || '-'}
          </span>
        )}
      </div>
    );
  });

  const DocumentRow = ({ label, url, icon, fieldName }) => {
    const isActive = activeField === fieldName;

    return (
      <div
        className="flex justify-between items-center py-1 text-xs relative"
        onClick={() => !isActive && handleFieldEdit(fieldName)}
      >
        <span className="text-gray-600 font-medium">{label}:</span>
        {isActive ? (
          <div ref={inputRef} className="flex flex-col items-end">
            <input
              type="file"
              name={fieldName}
              onChange={handleInputChange}
              onBlur={handleFieldSave}
              className="text-xs"
            />
            {isSaving && activeField === fieldName && (
              <div className="absolute right-0 top-0 text-xs text-gray-500 animate-pulse">
                Saving...
              </div>
            )}
          </div>
        ) : (
          editedEmployee[`${fieldName}Url`] ? (
            <a
              href={getDocumentUrl(editedEmployee[`${fieldName}Url`])}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              {icon && React.cloneElement(icon, { className: 'w-3 h-3' })}
              View
            </a>
          ) : (
            <span className="text-gray-400 cursor-text hover:bg-gray-100 px-1 py-0.5 rounded">
              Not Available
            </span>
          )
        )}
      </div>
    );
  };

  const TextAreaRow = React.memo(({
    label,
    value = '',
    fieldName,
    isActive = false,
    onEdit = () => { },
    onSave = () => { },
    setActiveField = () => { },
    isSaving = false,
    setEditedEmployee = () => { }
  }) => {
    const [text, setText] = React.useState(value);
    const textareaRef = React.useRef(null);
    const initialValueRef = React.useRef(value);

    // Update local state when value prop changes or component mounts
    React.useEffect(() => {
      if (value !== text) {
        setText(value);
        initialValueRef.current = value;
      }
    }, [value]);

    // Handle focus and cursor position when field becomes active
    React.useEffect(() => {
      if (isActive && textareaRef.current) {
        const timer = setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            // Move cursor to end of text
            const length = textareaRef.current.value.length;
            textareaRef.current.setSelectionRange(length, length);
          }
        }, 10);
        return () => clearTimeout(timer);
      }
    }, [isActive]);

    const handleChange = (e) => {
      const newValue = e.target.value;
      setText(newValue);
    };

    const handleBlur = () => {
      if (text !== initialValueRef.current) {
        onSave(fieldName, text);
      }
      setActiveField(null);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.target.blur();
      }
    };

    if (isActive) {
      return (
        <div className="mt-2 pt-2 border-t border-gray-100 relative">
          <label className="text-xs text-gray-600 font-medium block mb-1">
            {label}:
          </label>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            rows="3"
            disabled={isSaving}
          />
          {isSaving && (
            <div className="absolute right-2 bottom-2 text-xs text-gray-500">
              Saving...
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        className="mt-2 pt-2 border-t border-gray-100"
        onClick={() => onEdit(fieldName)}
      >
        <p className="text-xs text-gray-600 font-medium mb-1">{label}:</p>
        <p className="text-xs text-gray-800 break-words cursor-text hover:bg-gray-100 px-2 py-1 rounded">
          {value || <span className="text-gray-400">Click to edit</span>}
        </p>
      </div>
    );
  });

  const SkeletonInfoRow = () => (
    <div className="flex justify-between items-center py-1">
      <div className="h-4 w-24 bg-gray-200 rounded" />
      <div className="h-4 w-40 bg-gray-200 rounded" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-8xl max-h-[100vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-1 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          {isLoading ? (
            <div className="flex items-center gap-3 animate-pulse">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <div className="w-5 h-5 bg-blue-300 rounded"></div>
              </div>
              <div className="space-y-1">
                <div className="h-4 bg-gray-300 rounded w-40"></div>
                <div className="h-3 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 leading-4">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-md font-bold text-gray-900">Edit Employee</h2>
               
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-blue-100 hover:bg-white/50 transition-colors"
          >
            <X className="w-5 h-5 text-blue-500" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-2 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Profile Card */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-b from-blue-50 to-white rounded-lg border border-gray-200 p-4 h-full">
                {isLoading ? (
                  <div className="text-center mb-4 animate-pulse">
                    <div className="w-20 h-20 rounded-full bg-gray-200 mx-auto mb-3" />
                    <div className="h-4 w-32 bg-gray-300 rounded mx-auto mb-2" />
                    <div className="h-3 w-20 bg-gray-200 rounded mx-auto mb-3" />
                    <div className="flex flex-wrap gap-2 justify-center mb-4">
                      <div className="h-5 w-20 bg-blue-200 rounded-full" />
                      <div className="h-5 w-20 bg-green-200 rounded-full" />
                    </div>
                    <div className="space-y-3">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-3 bg-gray-200 rounded mx-auto" style={{ width: `${Math.random() * 100 + 100}px` }} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    {employee.profilePhoto ? (
                      <img
                        src={employee.profilePhoto}
                        alt="Profile"
                        className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg mx-auto mb-3"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center border-4 border-white shadow-lg mx-auto mb-3">
                        <User className="w-10 h-10 text-blue-600" />
                      </div>
                    )}
                    <div className="flex justify-center items-center">
                      <InfoPro
                        value={employee.firstName}
                        fieldName="firstName"
                        className='text-xl text-gray-950 font-bold'
                        activeField={activeField}
                        onFieldEdit={handleFieldEdit}
                        onFieldSave={(fieldName, value, isCancel) => {
                          if (isCancel) {
                            setActiveField(null);
                          } else {
                            saveField(fieldName, value);
                          }
                        }}
                        isSaving={isSaving}
                      />
                      <InfoPro
                        value={employee.lastName}
                        fieldName="lastName"
                        className='text-xl text-gray-950 font-bold'
                        activeField={activeField}
                        onFieldEdit={handleFieldEdit}
                        onFieldSave={(fieldName, value, isCancel) => {
                          if (isCancel) {
                            setActiveField(null);
                          } else {
                            saveField(fieldName, value);
                          }
                        }}
                        isSaving={isSaving}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1 justify-center mb-3">
                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
                        {employee.department}
                      </span>
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                        {employee.position}
                      </span>
                    </div>

                    <div className="space-y-2 text-left">
                      <InfoRow label="Employee ID" value={employee.employeeCode} fieldName="employeeCode" isReadOnly />
                      <SelectRow
                        label="Branch Name"
                        value={employee.branch}
                        displayValue={getBranchName(employee.branch)}
                        fieldName="branch"
                        options={branchOptions}
                        isLoading={isLoadingBranches}
                      />
                      <SelectRow
                        label="Work Mode"
                        value={employee.workMode}
                        fieldName="workMode"
                        options={workModeOptions}
                        isLoading={isLoadingWorkModes}
                      />
                      <SelectRow
                        label="Status"
                        value={editedEmployee.status || "Active"}
                        fieldName="status"
                        options={[
                          { value: "Active", label: "Active" },
                          { value: "Inactive", label: "Inactive" }
                        ]}
                        isLoading={false}
                      />
                      <DateRow
                        label="Date of Birth"
                        value={
                          employee.dateOfBirth
                            ? `${formatDate(employee.dateOfBirth)} (${calculateAge(employee.dateOfBirth)} yrs)`
                            : '-'
                        }
                        fieldName="dateOfBirth"
                      />
                      <SelectRow
                        label="Gender"
                        value={employee.gender}
                        fieldName="gender"
                        options={genderOptions}
                        isLoading={isLoadingGenders}
                      />
                      <SelectRow
                        label="Marital Status"
                        value={employee.maritalStatus}
                        fieldName="maritalStatus"
                        options={maritalStatusOptions}
                        isLoading={isLoadingMaritalStatus}
                      />
                      <SelectRow
                        label="Blood Group"
                        value={employee.bloodGroup}
                        fieldName="bloodGroup"
                        options={bloodGroupOptions}
                        isLoading={isLoadingBloodGroups}
                      />
                      <TextAreaRow
                        label="Permanent Address"
                        value={editedEmployee.permanentAddress}
                        fieldName="permanentAddress"
                        isActive={activeField === 'permanentAddress'}
                        onEdit={handleFieldEdit}
                        onSave={saveField}
                        setActiveField={setActiveField}
                        isSaving={isSaving && activeField === 'permanentAddress'}
                        inputRef={inputRef}
                        setEditedEmployee={setEditedEmployee}
                      />
                      <TextAreaRow
                        label="Current Address"
                        value={editedEmployee.currentAddress}
                        fieldName="currentAddress"
                        isActive={activeField === 'currentAddress'}
                        onEdit={handleFieldEdit}
                        onSave={saveField}
                        setActiveField={setActiveField}
                        isSaving={isSaving && activeField === 'currentAddress'}
                        inputRef={inputRef}
                        setEditedEmployee={setEditedEmployee}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Left Column */}
                <div className="space-y-1">
                  {/* Contact Info */}
                  {isLoading ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-3 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-32 mb-3" />
                      <div className="space-y-2">
                        {[...Array(6)].map((_, i) => (
                          <SkeletonInfoRow key={i} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border border-gray-200 p-3">
                      <SectionHeader
                        title="Contact Information"
                        icon={<Phone className="w-4 h-4" />}
                      />
                      <div className="space-y-1">
                        <InfoRow
                          label="Phone 1"
                          value={employee.phone1}
                          fieldName="phone1"
                          onSave={saveField}
                          onEdit={handleFieldEdit}
                          isActive={activeField === 'phone1'}
                          setActiveField={setActiveField}
                          isSaving={isSaving && activeField === 'phone1'}
                        />
                        <InfoRow
                          label="Phone 2"
                          value={employee.phone2}
                          fieldName="phone2"
                          onSave={saveField}
                          onEdit={handleFieldEdit}
                          isActive={activeField === 'phone2'}
                          setActiveField={setActiveField}
                          isSaving={isSaving && activeField === 'phone2'}
                        />
                        <InfoRow
                          label="Personal Email"
                          value={employee.personalEmail}
                          fieldName="personalEmail"
                          onSave={saveField}
                          onEdit={handleFieldEdit}
                          isActive={activeField === 'personalEmail'}
                          setActiveField={setActiveField}
                          isSaving={isSaving && activeField === 'personalEmail'}
                        />
                        <InfoRow
                          label="Official Email"
                          value={employee.officialEmail}
                          fieldName="officialEmail"
                          onSave={saveField}
                          onEdit={handleFieldEdit}
                          isActive={activeField === 'officialEmail'}
                          setActiveField={setActiveField}
                          isSaving={isSaving && activeField === 'officialEmail'}
                        />
                        <InfoRow
                          label="Emergency Contact Name"
                          value={employee.emergencyContact1Name || '-'}
                          fieldName="emergencyContact1Name"
                          onSave={saveField}
                          onEdit={handleFieldEdit}
                          isActive={activeField === 'emergencyContact1Name'}
                          setActiveField={setActiveField}
                          isSaving={isSaving && activeField === 'emergencyContact1Name'}
                        />
                        <InfoRow
                          label="Emergency Contact Phone"
                          value={employee.emergencyContact1Phone}
                          fieldName="emergencyContact1Phone"
                          onSave={saveField}
                          onEdit={handleFieldEdit}
                          isActive={activeField === 'emergencyContact1Phone'}
                          setActiveField={setActiveField}
                          isSaving={isSaving && activeField === 'emergencyContact1Phone'}
                        />
                        {/* <InfoRow
                          label="Emergency Contact 2"
                          value={
                            employee.emergencyContact2Name
                              ? `${employee.emergencyContact2Name} (${employee.emergencyContact2Phone})`
                              : '-'
                          }
                          fieldName="emergencyContact2Name"
                        /> */}
                        {/* <InfoRow
                          label="Emergency Contact 2 Phone"
                          value={employee.emergencyContact2Phone}
                          fieldName="emergencyContact2Phone"
                          onSave={saveField}
                          onEdit={handleFieldEdit}
                          isActive={activeField === 'emergencyContact2Phone'}
                          setActiveField={setActiveField}
                          isSaving={isSaving && activeField === 'emergencyContact2Phone'}
                        /> */}
                      </div>
                    </div>
                  )}

                  {/* Professional Info */}
                  {isLoading ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-3 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-32 mb-3" />
                      <div className="space-y-2">
                        {[...Array(6)].map((_, i) => (
                          <SkeletonInfoRow key={i} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border border-gray-200 p-3">
                      <SectionHeader
                        title="Professional Information"
                        icon={<Briefcase className="w-4 h-4" />}
                      />
                      <div className="space-y-1">
                        <SelectRow
                          label="Department"
                          value={employee.department}
                          fieldName="department"
                          options={departmentOptions}
                          isLoading={isLoadingDepartments}
                        />
                        <SelectRow
                          label="Position"
                          value={employee.position}
                          fieldName="position"
                          options={positionOptions}
                          isLoading={isLoadingPositions}
                        />
                        <SelectRow
                          label="Level"
                          value={employee.level}
                          displayValue={formatLevelDisplay(employee.level)}
                          fieldName="level"
                          options={levelOptions}
                          isLoading={false}
                          onValueChange={handleLevelChange}
                        />
                        <SelectRow
                          label="Reporting Manager"
                          value={employee.reportingManager}
                          displayValue={getManagerDisplayName(employee.reportingManager)}
                          fieldName="reportingManager"
                          options={loadingEmployees ? [] : reportingManagers}
                          isLoading={loadingEmployees}
                          placeholder={
                            loadingEmployees
                              ? 'Loading employees...'
                              : (reportingManagers.length > 0
                                ? 'Select Reporting Manager'
                                : 'No managers available')
                          }
                          disabled={loadingEmployees || reportingManagers.length === 0 || selectedLevel === 'L5'}
                        />
                        <DateRow
                          label="Joining Date"
                          value={formatDate(employee.joiningDate)}
                          fieldName="joiningDate"
                          onSave={saveField}
                          onEdit={handleFieldEdit}
                          isActive={activeField === 'joiningDate'}
                          setActiveField={setActiveField}
                          isSaving={isSaving && activeField === 'joiningDate'}
                        />
                        <InfoRow
                          label="Reference Contact Name"
                          value={employee.referenceContactName || '-'}
                          fieldName="referenceContactName"
                          onSave={saveField}
                          onEdit={handleFieldEdit}
                          isActive={activeField === 'referenceContactName'}
                          setActiveField={setActiveField}
                          isSaving={isSaving && activeField === 'referenceContactName'}
                        />
                        <InfoRow
                          label="Reference Contact Phone"
                          value={employee.referenceContactPhone || '-'}
                          fieldName="referenceContactPhone"
                          onSave={saveField}
                          onEdit={handleFieldEdit}
                          isActive={activeField === 'referenceContactPhone'}
                          setActiveField={setActiveField}
                          isSaving={isSaving && activeField === 'referenceContactPhone'}
                        />
                        <InfoRow
                          label="CTC"
                          value={employee.ctc}
                          fieldName="ctc"
                          type="number"
                          onSave={saveField}
                          onEdit={handleFieldEdit}
                          isActive={activeField === 'ctc'}
                          setActiveField={setActiveField}
                          isSaving={isSaving && activeField === 'ctc'}
                        />
                        <InfoRow
                          label="Salary"
                          value={
                            employee.ctc ? (
                              <span className="text-green-600 font-semibold">
                                {formatCurrency(Math.round(employee.ctc / 12)).toLocaleString('en-IN')}
                              </span>
                            ) : (
                              '-'
                            )
                          }
                          fieldName="salary"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* center Column */}
                <div className="space-y-1">
                  {/* Education & Experience */}
                  {isLoading ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-3 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-40 mb-3" />
                      <div className="space-y-2">
                        {[...Array(4)].map((_, i) => (
                          <SkeletonInfoRow key={i} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border border-gray-200 p-3">
                      <SectionHeader
                        title="Education & Experience"
                        icon={<GraduationCap className="w-4 h-4" />}
                      />
                      <div className="space-y-1">
                        <SelectRow
                          label="Highest Degree"
                          value={employee.degree || ''}
                          fieldName="degree"
                          options={degreeOptions}
                        />
                        <InfoRow
                          label="Specialization"
                          value={employee.specialization || ''}
                          fieldName="specialization"
                          onSave={saveField}
                          onEdit={handleFieldEdit}
                          isActive={activeField === 'specialization'}
                          setActiveField={setActiveField}
                          isSaving={isSaving && activeField === 'specialization'}
                        />
                        <SelectRow
                          label="Experience (Years)"
                          value={employee.yearsOfExperience === 0 || employee.yearsOfExperience === '0' ? '0' : String(employee.yearsOfExperience || '')}
                          fieldName="yearsOfExperience"
                          options={[
                            { value: '0', label: 'Fresher' },
                            ...experienceOptions.filter(opt => opt.value !== '0') // Remove duplicate Fresher from API
                          ]}
                        />
                        <InfoRow
                          label="Aadhaar Number"
                          value={employee.aadhaarNumber || 'Not specified'}
                          fieldName="aadhaarNumber"
                          onSave={saveField}
                          onEdit={handleFieldEdit}
                          isActive={activeField === 'aadhaarNumber'}
                          setActiveField={setActiveField}
                          isSaving={isSaving && activeField === 'aadhaarNumber'}
                        />

                        <InfoRow
                          label="PAN Card Number"
                          value={employee.panNumber || 'Not specified'}
                          fieldName="panNumber"
                          onSave={saveField}
                          onEdit={handleFieldEdit}
                          isActive={activeField === 'panNumber'}
                          setActiveField={setActiveField}
                          isSaving={isSaving && activeField === 'panNumber'}
                        />
                        {/* Experience-based fields - Only show for experienced employees */}
                        {Number(employee.yearsOfExperience) > 0 && (
                          <>
                            <InfoRow
                              label="Last Company"
                              value={employee.lastCompany || ''}
                              fieldName="lastCompany"
                              onSave={saveField}
                              onEdit={handleFieldEdit}
                              isActive={activeField === 'lastCompany'}
                              setActiveField={setActiveField}
                              isSaving={isSaving && activeField === 'lastCompany'}
                            />
                          </>
                        )}
                      </div>
                      {/* Experience Details - Only show for experienced employees */}
                      {Number(employee.yearsOfExperience) > 0 && (
                        <TextAreaRow
                          label="Experience Details"
                          value={employee.experienceDetails || ''}
                          fieldName="experienceDetails"
                          onSave={saveField}
                          onEdit={handleFieldEdit}
                          isActive={activeField === 'experienceDetails'}
                          setActiveField={setActiveField}
                          isSaving={isSaving && activeField === 'experienceDetails'}
                        />
                      )}
                    </div>
                  )}

                  {/* Documents */}
                  {isLoading ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-3 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-40 mb-3" />
                      <div className="space-y-2">
                        {[...Array(4)].map((_, i) => (
                          <SkeletonInfoRow key={i} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border border-gray-200 p-3">
                      <SectionHeader
                        title="Documents"
                        icon={<FileText className="w-4 h-4" />}
                      />
                      <div className="space-y-2">
                        <div className="flex items-center justify-between py-1">
                          <span className="text-xs font-semibold text-gray-600">Profile Photo</span>
                          <div className="flex items-center gap-2">
                            {uploadingFile === 'profilePhoto' ? (
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className="bg-blue-600 h-1.5 rounded-full"
                                    style={{ width: `${fileProgress}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-500">{fileProgress}%</span>
                              </div>
                            ) : editedEmployee.profilePhoto ? (
                              <div className="flex items-center gap-2">
                                <a
                                  href={getDocumentUrl(editedEmployee.profilePhoto)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                                  title="View profile photo"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </a>
                                <label
                                  className="text-green-600 hover:text-green-800 text-xs flex items-center gap-1 cursor-pointer"
                                  title="Replace profile photo (JPG, PNG, GIF, max 5MB)"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/gif"
                                    className="hidden"
                                    onChange={(e) => handleFileChange(e, 'profilePhoto')}
                                  />
                                </label>
                              </div>
                            ) : (
                              <label
                                className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1 cursor-pointer"
                                title="Upload profile photo (JPG, PNG, GIF, max 5MB)"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/gif"
                                  className="hidden"
                                  onChange={(e) => handleFileChange(e, 'profilePhoto')}
                                />
                              </label>
                            )}
                          </div>
                        </div>



                        {/* Aadhaar Front - Always visible */}
                        <div className="flex items-center justify-between py-1">
                          <span className="text-xs font-semibold text-gray-600">Aadhaar Front</span>
                          <div className="flex items-center gap-2">
                            {uploadingFile === 'aadhaarFront' ? (
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className="bg-blue-600 h-1.5 rounded-full"
                                    style={{ width: `${fileProgress}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-500">{fileProgress}%</span>
                              </div>
                            ) : editedEmployee.aadhaarFront ? (
                              <div className="flex items-center gap-2">
                                <a
                                  href={getDocumentUrl(editedEmployee.aadhaarFront)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                                  title="View Aadhaar front"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </a>
                                <label
                                  className="text-green-600 hover:text-green-800 text-xs flex items-center gap-1 cursor-pointer"
                                  title="Replace Aadhaar front (PDF, JPG, PNG, max 5MB)"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="hidden"
                                    onChange={(e) => handleFileChange(e, 'aadhaarFront')}
                                  />
                                </label>
                              </div>
                            ) : (
                              <label
                                className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1 cursor-pointer"
                                title="Upload Aadhaar front (PDF, JPG, PNG, max 5MB)"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  className="hidden"
                                  onChange={(e) => handleFileChange(e, 'aadhaarFront')}
                                />
                              </label>
                            )}
                          </div>
                        </div>

                        {/* Aadhaar Back - Always visible */}
                        <div className="flex items-center justify-between py-1">
                          <span className="text-xs font-semibold text-gray-600">Aadhaar Back</span>
                          <div className="flex items-center gap-2">
                            {uploadingFile === 'aadhaarBack' ? (
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className="bg-blue-600 h-1.5 rounded-full"
                                    style={{ width: `${fileProgress}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-500">{fileProgress}%</span>
                              </div>
                            ) : editedEmployee.aadhaarBack ? (
                              <div className="flex items-center gap-2">
                                <a
                                  href={getDocumentUrl(editedEmployee.aadhaarBack)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                                  title="View Aadhaar back"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </a>
                                <label
                                  className="text-green-600 hover:text-green-800 text-xs flex items-center gap-1 cursor-pointer"
                                  title="Replace Aadhaar back (PDF, JPG, PNG, max 5MB)"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="hidden"
                                    onChange={(e) => handleFileChange(e, 'aadhaarBack')}
                                  />
                                </label>
                              </div>
                            ) : (
                              <label
                                className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1 cursor-pointer"
                                title="Upload Aadhaar back (PDF, JPG, PNG, max 5MB)"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  className="hidden"
                                  onChange={(e) => handleFileChange(e, 'aadhaarBack')}
                                />
                              </label>
                            )}
                          </div>
                        </div>



                        {/* PAN Card Files - Always visible */}
                        <div className="flex items-center justify-between py-1">
                          <span className="text-xs font-semibold text-gray-600">PAN Card Files</span>
                          <div className="flex items-center gap-2">
                            {uploadingFile === 'panFiles' ? (
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className="bg-blue-600 h-1.5 rounded-full"
                                    style={{ width: `${fileProgress}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-500">{fileProgress}%</span>
                              </div>
                            ) : editedEmployee.panFiles ? (
                              <div className="flex items-center gap-2">
                                <a
                                  href={getDocumentUrl(editedEmployee.panFiles)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                                  title="View PAN card"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </a>
                                <label
                                  className="text-green-600 hover:text-green-800 text-xs flex items-center gap-1 cursor-pointer"
                                  title="Replace PAN card (PDF, JPG, PNG, max 5MB)"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="hidden"
                                    onChange={(e) => handleFileChange(e, 'panFiles')}
                                  />
                                </label>
                              </div>
                            ) : (
                              <label
                                className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1 cursor-pointer"
                                title="Upload PAN card (PDF, JPG, PNG, max 5MB)"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  className="hidden"
                                  onChange={(e) => handleFileChange(e, 'panFiles')}
                                />
                              </label>
                            )}
                          </div>
                        </div>

                        {/* Experience-based documents - Only show for experienced employees */}
                        {Number(editedEmployee.yearsOfExperience) > 0 && (
                          <>
                            <div className="flex items-center justify-between py-1">
                              <span className="text-xs font-semibold text-gray-600">Offer Letter Files</span>
                          <div className="flex items-center gap-2">
                            {uploadingFile === 'offerLetterFiles' ? (
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className="bg-blue-600 h-1.5 rounded-full"
                                    style={{ width: `${fileProgress}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-500">{fileProgress}%</span>
                              </div>
                            ) : editedEmployee.offerLetterFiles ? (
                              <div className="flex items-center gap-2">
                                <a
                                  href={getDocumentUrl(editedEmployee.offerLetterFiles)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                                  title="View offer letter"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </a>
                                <label
                                  className="text-green-600 hover:text-green-800 text-xs flex items-center gap-1 cursor-pointer"
                                  title="Replace offer letter (PDF, JPG, PNG, DOC, DOCX, max 5MB)"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    className="hidden"
                                    onChange={(e) => handleFileChange(e, 'offerLetterFiles')}
                                  />
                                </label>
                              </div>
                            ) : (
                              <label
                                className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1 cursor-pointer"
                                title="Upload offer letter (PDF, JPG, PNG, DOC, DOCX, max 5MB)"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                  className="hidden"
                                  onChange={(e) => handleFileChange(e, 'offerLetterFiles')}
                                />
                              </label>
                            )}
                          </div>
                        </div>

                            <div className="flex items-center justify-between py-1">
                              <span className="text-xs font-semibold text-gray-600">Relieving Letter Files</span>
                          <div className="flex items-center gap-2">
                            {uploadingFile === 'relievingLetterFiles' ? (
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className="bg-blue-600 h-1.5 rounded-full"
                                    style={{ width: `${fileProgress}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-500">{fileProgress}%</span>
                              </div>
                            ) : editedEmployee.relievingLetterFiles ? (
                              <div className="flex items-center gap-2">
                                <a
                                  href={getDocumentUrl(editedEmployee.relievingLetterFiles)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                                  title="View relieving letter"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </a>
                                <label
                                  className="text-green-600 hover:text-green-800 text-xs flex items-center gap-1 cursor-pointer"
                                  title="Replace relieving letter (PDF, JPG, PNG, DOC, DOCX, max 5MB)"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    className="hidden"
                                    onChange={(e) => handleFileChange(e, 'relievingLetterFiles')}
                                  />
                                </label>
                              </div>
                            ) : (
                              <label
                                className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1 cursor-pointer"
                                title="Upload relieving letter (PDF, JPG, PNG, DOC, DOCX, max 5MB)"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                  className="hidden"
                                  onChange={(e) => handleFileChange(e, 'relievingLetterFiles')}
                                />
                              </label>
                            )}
                          </div>
                        </div>

                            <div className="flex items-center justify-between py-1">
                              <span className="text-xs font-semibold text-gray-600">Payslip Files</span>
                          <div className="flex items-center gap-2">
                            {uploadingFile === 'payslipFiles' ? (
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className="bg-blue-600 h-1.5 rounded-full"
                                    style={{ width: `${fileProgress}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-500">{fileProgress}%</span>
                              </div>
                            ) : editedEmployee.payslipFiles ? (
                              <div className="flex items-center gap-2">
                                <a
                                  href={getDocumentUrl(editedEmployee.payslipFiles)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                                  title="View payslip"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </a>
                                <label
                                  className="text-green-600 hover:text-green-800 text-xs flex items-center gap-1 cursor-pointer"
                                  title="Replace payslip (PDF, JPG, PNG, DOC, DOCX, max 5MB)"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    className="hidden"
                                    onChange={(e) => handleFileChange(e, 'payslipFiles')}
                                  />
                                </label>
                              </div>
                            ) : (
                              <label
                                className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1 cursor-pointer"
                                title="Upload payslip (PDF, JPG, PNG, DOC, DOCX, max 5MB)"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                  className="hidden"
                                  onChange={(e) => handleFileChange(e, 'payslipFiles')}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bank Details - Below Documents (All Employees) */}
                  <div className="xl:hidden">
                    {/* Show for all employees on screens smaller than XL */}
                    <div className="bg-white rounded-lg border border-gray-200 p-3">
                      <SectionHeader
                        title="Bank Details"
                        icon={<CreditCard className="w-4 h-4" />}
                      />
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-600 font-medium">Bank Name:</span>
                          {activeField === 'bankName' ? (
                            <input
                              type="text"
                              value={editedEmployee.bankName || ''}
                              onChange={(e) => setEditedEmployee(prev => ({ ...prev, bankName: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleFieldSave('bankName', editedEmployee.bankName);
                                } else if (e.key === 'Escape') {
                                  setActiveField(null);
                                }
                              }}
                              className="text-xs px-2 py-1 border rounded w-32 text-right"
                              autoFocus
                            />
                          ) : (
                            <span 
                              className="text-gray-900 cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded text-xs"
                              onClick={() => handleFieldEdit('bankName')}
                            >
                              {editedEmployee.bankName || 'Not provided'}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-600 font-medium">Account Holder Name:</span>
                          {activeField === 'accountHolderName' ? (
                            <input
                              type="text"
                              value={editedEmployee.accountHolderName || ''}
                              onChange={(e) => setEditedEmployee(prev => ({ ...prev, accountHolderName: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleFieldSave('accountHolderName', editedEmployee.accountHolderName);
                                } else if (e.key === 'Escape') {
                                  setActiveField(null);
                                }
                              }}
                              className="text-xs px-2 py-1 border rounded w-32 text-right"
                              autoFocus
                            />
                          ) : (
                            <span 
                              className="text-gray-900 cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded text-xs"
                              onClick={() => handleFieldEdit('accountHolderName')}
                            >
                              {editedEmployee.accountHolderName || 'Not provided'}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-600 font-medium">Account Number:</span>
                          {activeField === 'accountNumber' ? (
                            <input
                              type="text"
                              value={editedEmployee.accountNumber || ''}
                              onChange={(e) => setEditedEmployee(prev => ({ ...prev, accountNumber: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleFieldSave('accountNumber', editedEmployee.accountNumber);
                                } else if (e.key === 'Escape') {
                                  setActiveField(null);
                                }
                              }}
                              className="text-xs px-2 py-1 border rounded w-32 text-right"
                              autoFocus
                            />
                          ) : (
                            <span 
                              className="text-gray-900 cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded text-xs"
                              onClick={() => handleFieldEdit('accountNumber')}
                            >
                              {editedEmployee.accountNumber || 'Not provided'}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-600 font-medium">IFSC Code:</span>
                          {activeField === 'ifscCode' ? (
                            <input
                              type="text"
                              value={editedEmployee.ifscCode || ''}
                              onChange={(e) => setEditedEmployee(prev => ({ ...prev, ifscCode: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleFieldSave('ifscCode', editedEmployee.ifscCode);
                                } else if (e.key === 'Escape') {
                                  setActiveField(null);
                                }
                              }}
                              className="text-xs px-2 py-1 border rounded w-32 text-right"
                              autoFocus
                            />
                          ) : (
                            <span 
                              className="text-gray-900 cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded text-xs"
                              onClick={() => handleFieldEdit('ifscCode')}
                            >
                              {editedEmployee.ifscCode || 'Not provided'}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-600 font-medium">UPI Number:</span>
                          {activeField === 'upiNumber' ? (
                            <input
                              type="text"
                              value={editedEmployee.upiNumber || ''}
                              onChange={(e) => setEditedEmployee(prev => ({ ...prev, upiNumber: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleFieldSave('upiNumber', editedEmployee.upiNumber);
                                } else if (e.key === 'Escape') {
                                  setActiveField(null);
                                }
                              }}
                              className="text-xs px-2 py-1 border rounded w-32 text-right"
                              autoFocus
                            />
                          ) : (
                            <span 
                              className="text-gray-900 cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded text-xs"
                              onClick={() => handleFieldEdit('upiNumber')}
                            >
                              {editedEmployee.upiNumber || 'Not provided'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bank Details - For Freshers on XL+ screens: Below Documents */}
                  {Number(editedEmployee.yearsOfExperience) === 0 && (
                    <div className="hidden xl:block bg-white rounded-lg border border-gray-200 p-3">
                      <SectionHeader
                        title="Bank Details"
                        icon={<CreditCard className="w-4 h-4" />}
                      />
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-600 font-medium">Bank Name:</span>
                          {activeField === 'bankName' ? (
                            <input
                              type="text"
                              value={editedEmployee.bankName || ''}
                              onChange={(e) => setEditedEmployee(prev => ({ ...prev, bankName: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleFieldSave('bankName', editedEmployee.bankName);
                                } else if (e.key === 'Escape') {
                                  setActiveField(null);
                                }
                              }}
                              className="text-xs px-2 py-1 border rounded w-32 text-right"
                              autoFocus
                            />
                          ) : (
                            <span 
                              className="text-gray-900 cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded text-xs"
                              onClick={() => handleFieldEdit('bankName')}
                            >
                              {editedEmployee.bankName || 'Not provided'}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-600 font-medium">Account Holder Name:</span>
                          {activeField === 'accountHolderName' ? (
                            <input
                              type="text"
                              value={editedEmployee.accountHolderName || ''}
                              onChange={(e) => setEditedEmployee(prev => ({ ...prev, accountHolderName: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleFieldSave('accountHolderName', editedEmployee.accountHolderName);
                                } else if (e.key === 'Escape') {
                                  setActiveField(null);
                                }
                              }}
                              className="text-xs px-2 py-1 border rounded w-32 text-right"
                              autoFocus
                            />
                          ) : (
                            <span 
                              className="text-gray-900 cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded text-xs"
                              onClick={() => handleFieldEdit('accountHolderName')}
                            >
                              {editedEmployee.accountHolderName || 'Not provided'}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-600 font-medium">Account Number:</span>
                          {activeField === 'accountNumber' ? (
                            <input
                              type="text"
                              value={editedEmployee.accountNumber || ''}
                              onChange={(e) => setEditedEmployee(prev => ({ ...prev, accountNumber: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleFieldSave('accountNumber', editedEmployee.accountNumber);
                                } else if (e.key === 'Escape') {
                                  setActiveField(null);
                                }
                              }}
                              className="text-xs px-2 py-1 border rounded w-32 text-right"
                              autoFocus
                            />
                          ) : (
                            <span 
                              className="text-gray-900 cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded text-xs"
                              onClick={() => handleFieldEdit('accountNumber')}
                            >
                              {editedEmployee.accountNumber || 'Not provided'}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-600 font-medium">IFSC Code:</span>
                          {activeField === 'ifscCode' ? (
                            <input
                              type="text"
                              value={editedEmployee.ifscCode || ''}
                              onChange={(e) => setEditedEmployee(prev => ({ ...prev, ifscCode: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleFieldSave('ifscCode', editedEmployee.ifscCode);
                                } else if (e.key === 'Escape') {
                                  setActiveField(null);
                                }
                              }}
                              className="text-xs px-2 py-1 border rounded w-32 text-right"
                              autoFocus
                            />
                          ) : (
                            <span 
                              className="text-gray-900 cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded text-xs"
                              onClick={() => handleFieldEdit('ifscCode')}
                            >
                              {editedEmployee.ifscCode || 'Not provided'}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-600 font-medium">UPI Number:</span>
                          {activeField === 'upiNumber' ? (
                            <input
                              type="text"
                              value={editedEmployee.upiNumber || ''}
                              onChange={(e) => setEditedEmployee(prev => ({ ...prev, upiNumber: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleFieldSave('upiNumber', editedEmployee.upiNumber);
                                } else if (e.key === 'Escape') {
                                  setActiveField(null);
                                }
                              }}
                              className="text-xs px-2 py-1 border rounded w-32 text-right"
                              autoFocus
                            />
                          ) : (
                            <span 
                              className="text-gray-900 cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded text-xs"
                              onClick={() => handleFieldEdit('upiNumber')}
                            >
                              {editedEmployee.upiNumber || 'Not provided'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Right Column */}
                <div className="space-y-1">
                  {/* Bank Details - For Experienced: Above Remarks (XL+ screens only) */}
                  {Number(editedEmployee.yearsOfExperience) > 0 && (
                    <div className="hidden xl:block bg-white rounded-lg border border-gray-200 p-3">
                      <SectionHeader
                        title="Bank Details"
                        icon={<CreditCard className="w-4 h-4" />}
                      />
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-600 font-medium">Bank Name:</span>
                          {activeField === 'bankName' ? (
                            <input
                              type="text"
                              value={editedEmployee.bankName || ''}
                              onChange={(e) => setEditedEmployee(prev => ({ ...prev, bankName: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleFieldSave('bankName', editedEmployee.bankName);
                                } else if (e.key === 'Escape') {
                                  setActiveField(null);
                                }
                              }}
                              className="text-xs px-2 py-1 border rounded w-32 text-right"
                              autoFocus
                            />
                          ) : (
                            <span 
                              className="text-gray-900 cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded text-xs"
                              onClick={() => handleFieldEdit('bankName')}
                            >
                              {editedEmployee.bankName || 'Not provided'}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-600 font-medium">Account Holder Name:</span>
                          {activeField === 'accountHolderName' ? (
                            <input
                              type="text"
                              value={editedEmployee.accountHolderName || ''}
                              onChange={(e) => setEditedEmployee(prev => ({ ...prev, accountHolderName: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleFieldSave('accountHolderName', editedEmployee.accountHolderName);
                                } else if (e.key === 'Escape') {
                                  setActiveField(null);
                                }
                              }}
                              className="text-xs px-2 py-1 border rounded w-32 text-right"
                              autoFocus
                            />
                          ) : (
                            <span 
                              className="text-gray-900 cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded text-xs"
                              onClick={() => handleFieldEdit('accountHolderName')}
                            >
                              {editedEmployee.accountHolderName || 'Not provided'}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-600 font-medium">Account Number:</span>
                          {activeField === 'accountNumber' ? (
                            <input
                              type="text"
                              value={editedEmployee.accountNumber || ''}
                              onChange={(e) => setEditedEmployee(prev => ({ ...prev, accountNumber: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleFieldSave('accountNumber', editedEmployee.accountNumber);
                                } else if (e.key === 'Escape') {
                                  setActiveField(null);
                                }
                              }}
                              className="text-xs px-2 py-1 border rounded w-32 text-right"
                              autoFocus
                            />
                          ) : (
                            <span 
                              className="text-gray-900 cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded text-xs"
                              onClick={() => handleFieldEdit('accountNumber')}
                            >
                              {editedEmployee.accountNumber || 'Not provided'}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-600 font-medium">IFSC Code:</span>
                          {activeField === 'ifscCode' ? (
                            <input
                              type="text"
                              value={editedEmployee.ifscCode || ''}
                              onChange={(e) => setEditedEmployee(prev => ({ ...prev, ifscCode: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleFieldSave('ifscCode', editedEmployee.ifscCode);
                                } else if (e.key === 'Escape') {
                                  setActiveField(null);
                                }
                              }}
                              className="text-xs px-2 py-1 border rounded w-32 text-right"
                              autoFocus
                            />
                          ) : (
                            <span 
                              className="text-gray-900 cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded text-xs"
                              onClick={() => handleFieldEdit('ifscCode')}
                            >
                              {editedEmployee.ifscCode || 'Not provided'}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-600 font-medium">UPI Number:</span>
                          {activeField === 'upiNumber' ? (
                            <input
                              type="text"
                              value={editedEmployee.upiNumber || ''}
                              onChange={(e) => setEditedEmployee(prev => ({ ...prev, upiNumber: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleFieldSave('upiNumber', editedEmployee.upiNumber);
                                } else if (e.key === 'Escape') {
                                  setActiveField(null);
                                }
                              }}
                              className="text-xs px-2 py-1 border rounded w-32 text-right"
                              autoFocus
                            />
                          ) : (
                            <span 
                              className="text-gray-900 cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded text-xs"
                              onClick={() => handleFieldEdit('upiNumber')}
                            >
                              {editedEmployee.upiNumber || 'Not provided'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Remarks */}
                  {isLoading ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-3 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-32 mb-3" />
                      <div className="bg-gray-100 border border-gray-100 rounded-lg p-2">
                        <div className="h-3 bg-gray-200 rounded mb-2 w-full" />
                        <div className="h-3 bg-gray-200 rounded mb-2 w-11/12" />
                        <div className="h-3 bg-gray-200 rounded w-3/4" />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border border-gray-200 p-3">
                      <SectionHeader
                        title="Remarks"
                        icon={<ClipboardList className="w-4 h-4" />}
                      />
                      <TextAreaRow
                        label="Remarks"
                        value={employee.remarks || ''}
                        fieldName="remarks"
                        isActive={activeField === 'remarks'}
                        onEdit={handleFieldEdit}
                        onSave={handleFieldSave}
                        setActiveField={setActiveField}
                        isSaving={isSaving && activeField === 'remarks'}
                        setEditedEmployee={setEditedEmployee}
                      />
                    </div>
                  )}

                  {/* Stats Summary */}
                  <div className="bg-white rounded-lg border border-gray-200 p-2">
                    <SectionHeader title="Employee Stats" icon={<ClipboardList className="w-4 h-4" />} />
                    <div className="space-y-2 text-xs font-semibold text-gray-700">
                      <div className="flex justify-between">
                        <span>Total Projects:</span>
                        <span className="text-xs ">{employee.totalProjects ?? 8}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Experience:</span>
                        <span className="text-xs">{employee.yearsOfExperience} yrs</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Leaves Taken:</span>
                        <span className=" text-xs">{employee.leavesTaken ?? 5}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className={`text-xs ${employee.isActive ? 'text-green-600' : 'text-green-600'}`}>
                          {employee.isActive ? 'Active' : 'Active'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pie Chart Section */}
                  {/* <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <SectionHeader title="Skill Distribution" icon={<PieChart className="w-4 h-4" />} />
                    {isLoadingSkills ? (
                      <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                      </div>
                    ) : skillError ? (
                      <div className="text-center text-red-500 py-8">
                        {skillError}
                      </div>
                    ) : skillData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={skillData}
                            dataKey="value"
                            nameKey="name"
                            outerRadius={70}
                            fill="#8884d8"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {skillData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name, props) => [
                            `${name}: ${value}%`,
                            'Proficiency'
                          ]} />
                          <Legend verticalAlign="bottom" />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        No skill data available
                      </div>
                    )}
                  </div> */}
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        {/* <div className="flex justify-end py-2 px-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            Close
          </button>
        </div> */}
      </div>
    </div>
  );
};

ViewModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  employee: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired
};

export default ViewModal;