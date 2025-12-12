import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Download,
  Filter,
  Search,
  Users,
  TrendingUp,
  Clock,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserCheck,
  FileText,
  Eye,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  MessageSquare,
  X
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { Link } from 'react-router-dom';
// Import modals
import FeedbackModal from '../../NewDtr/components/FeedbackModal';
import { vendorAPI } from '../../../api/vendorService';
import { candidates, clientJobs as clientJobsAPI } from '../../../api/api';
import { apiRequest } from '../../../api/apiConfig';
import Loading from '../../../components/Loading';
import { useLocationDropdowns } from '../../../hooks/useLocationDropdowns';
import CandidateTable from '../../calendar/components/CandidateTable';

const IFPSReport = () => {

  // Get current date in YYYY-MM-DD format
  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Use location dropdowns hook (same as DataBank)
  const { 
    locationData, 
    loading: locationLoading, 
    error: locationError,
    getCitiesByState,
    getStatesByCountry 
  } = useLocationDropdowns();

  // State management
  const [filters, setFilters] = useState({
    fromDate: getCurrentDate(),
    toDate: getCurrentDate(),
    client: '',
    status: '',
    state: '',
    city: '',
    selectedBranch: '',
    selectedTL: '',
    selectedExecutive: '',
    selectedEmployee: '',
    filterMode: 'self_only' // BM filter mode
  });

  const [appliedFilters, setAppliedFilters] = useState({
    fromDate: getCurrentDate(),
    toDate: getCurrentDate(),
    client: '',
    status: '',
    state: '',
    city: '',
    selectedBranch: '',
    selectedTL: '',
    selectedExecutive: '',
    selectedEmployee: '',
    filterMode: 'self_only' // BM filter mode
  });

  // Separate search state for real-time filtering
  const [searchTerm, setSearchTerm] = useState('');

  // User and employee data - moved here to fix hoisting issue
  const [currentUser, setCurrentUser] = useState({ role: 'L1' });
  const [employeeOptions, setEmployeeOptions] = useState([]);

  // BM-specific state
  const [branchEmployees, setBranchEmployees] = useState([]);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [loadingBranchData, setLoadingBranchData] = useState(false);
  const [remarkOptions, setRemarkOptions] = useState([]);
  const [candidatesData, setCandidatesData] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // State and city options from useLocationDropdowns hook
  const stateOptions = locationData.states || [];
  const cityOptions = filters.state 
    ? getCitiesByState(filters.state)
    : locationData.cities || [];

  // Modal states (ViewModal now uses AppContext)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const [sortConfig, setSortConfig] = useState({
    key: 'dateOfEntry',
    direction: 'desc'
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Mobile Filter States
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const MODAL_CLOSE_DELAY = 300;

  const openMobileFilters = () => {
    setShowMobileFilters(true);
    requestAnimationFrame(() => setIsMobileFiltersOpen(true));
  };

  const closeMobileFilters = () => {
    setIsMobileFiltersOpen(false);
    setTimeout(() => setShowMobileFilters(false), MODAL_CLOSE_DELAY);
  };

  // Team hierarchy data
  const teamHierarchy = {
    'Mumbai Branch': {
      teamLeaders: {
        TL1: {
          name: 'Priya Sharma',
          executives: ['Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson', 'Emma Thompson']
        },
        TL2: {
          name: 'Amit Patel',
          executives: ['Frank Miller', 'Grace Lee', 'Henry Brown', 'Ivy Chen', 'Jack Taylor']
        }
      }
    },
    'Delhi Branch': {
      teamLeaders: {
        TL3: {
          name: 'Vikram Singh',
          executives: ['Kate Wilson', 'Liam Davis', 'Maya Patel', 'Noah Kumar', 'Olivia Singh']
        },
        TL4: {
          name: 'Kavya Nair',
          executives: ['Paul Johnson', 'Quinn Lee', 'Ruby Chen', 'Sam Brown', 'Tina Miller']
        }
      }
    }
  };

  // Client options (fetched from backend)
  const [clientOptions, setClientOptions] = useState([]); // [{id, vendor_name, ...}]

  useEffect(() => {
    let isMounted = true;
    // Fetch full vendors list to get id and vendor_name
    vendorAPI.get('/vendors/')
      .then(res => {
        if (isMounted && Array.isArray(res.data)) {
          setClientOptions(res.data);
        }
      })
      .catch(err => {
        console.error('Failed to load vendors', err);
      });

    // Fetch dynamic remarks for Status filter
    apiRequest('/candidates/remarks/')
      .then(res => {
        const apiRemarks = Array.isArray(res) ? res : [];
        const extraRemarks = ["Call Answered", "Call Not Answered"];
        const merged = Array.from(new Set([...apiRemarks, ...extraRemarks]));
        if (isMounted) setRemarkOptions(merged);
      })
      .catch(err => console.error('Failed to load remarks', err));

    // Location data is now handled by useLocationDropdowns hook

    // Initial fetch of user data and candidates
    fetchUserData();

    // Always fetch today's candidates by default for all users
    const today = getCurrentDate();
    fetchCandidates(today, today);

    return () => { isMounted = false; };
  }, []);

  // Applied filters are already initialized with current date
  // No need for additional useEffect to set them

  // Fetch branch employees when user role is detected as BM
  useEffect(() => {
    if (currentUser.role === 'L3' || currentUser.role === 'bm') {
      fetchBranchEmployees();
    }
  }, [currentUser.role]);

  // Fetch current user data and employee options for L2 users
  const fetchUserData = async () => {
    try {
      // Get user data from localStorage (set during login)
      const token = localStorage.getItem('token');
      const username = localStorage.getItem('username');
      const firstName = localStorage.getItem('firstName');
      const employeeCode = localStorage.getItem('employeeCode');
      const role = localStorage.getItem('userRole') || 'L1';

      setCurrentUser({
        role: role,
        employeeCode: employeeCode,
        name: firstName || username || 'User'
      });

      // Fetch all employees for dropdown (regardless of role)
      try {
        const employeesResponse = await apiRequest('/empreg/employees/');

        // Handle different response formats
        let allEmployees = employeesResponse;
        if (employeesResponse && typeof employeesResponse === 'object' && !Array.isArray(employeesResponse)) {
          allEmployees = employeesResponse.results || employeesResponse.data || employeesResponse.employees || [];
        }

        if (Array.isArray(allEmployees) && allEmployees.length > 0) {
          // Filter for active employees: del_state = 0, status = 'Active', exclude CEOs, and clean names
          const activeEmployees = allEmployees
            .filter(emp => emp.del_state === 0 || emp.del_state === '0' || emp.del_state == null)
            .filter(emp => {
              // Filter by status = 'Active' (case insensitive)
              const status = emp.status || '';
              return status.toLowerCase() === 'active';
            })
            .filter(emp => {
              // Exclude employees with position = 'CEO' (case insensitive)
              const position = emp.position || emp.designation || '';
              return position.toLowerCase() !== 'ceo';
            })
            .map(emp => ({
              ...emp,
              // Remove emojis and clean the firstName
              firstName: emp.firstName ? emp.firstName.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim() : emp.firstName
            }));

          // If user is L2/tl (Team Leader), filter employees reporting to them
          if (role === 'L2' || role === 'tl') {
            const reportingEmployees = activeEmployees.filter(emp => {
              // Handle both reportingManager and reportingManager_id field names
              const reportingManagerField = emp.reportingManager || emp.reportingManager_id;
              const matches = reportingManagerField === employeeCode ||
                             reportingManagerField === firstName ||
                             reportingManagerField === username;
              
              return matches;
            });

            if (reportingEmployees.length > 0) {
              setEmployeeOptions(reportingEmployees);
            } else {
              // If no reporting employees, show all active employees for now
              setEmployeeOptions(activeEmployees);
            }
          } else {
            // For other roles, show all active employees
            setEmployeeOptions(activeEmployees);
          }
        } else {
          // Fallback mock data
          const mockEmployees = [
            { employeeCode: 'EMP001', firstName: 'John', lastName: 'Doe' },
            { employeeCode: 'EMP002', firstName: 'Jane', lastName: 'Smith' },
            { employeeCode: 'AD102', firstName: 'Admin', lastName: 'User' }
          ];
          setEmployeeOptions(mockEmployees);
        }
      } catch (empError) {
        console.error('Failed to fetch employees from /empreg/employees/:', empError);

        // Try alternative approach using axios directly
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(`${API_URL}/empreg/employees/`, {
            headers: {
              'Authorization': `Token ${token}`,
              'Content-Type': 'application/json'
            }
          });

          let allEmployees = response.data;
          if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
            allEmployees = response.data.results || response.data.data || response.data.employees || [];
          }

          if (Array.isArray(allEmployees) && allEmployees.length > 0) {
            // Filter for active employees: del_state = 0, status = 'Active', exclude CEOs, and clean names
            const activeEmployees = allEmployees
              .filter(emp => emp.del_state === 0 || emp.del_state === '0' || emp.del_state == null)
              .filter(emp => {
                // Filter by status = 'Active' (case insensitive)
                const status = emp.status || '';
                return status.toLowerCase() === 'active';
              })
              .filter(emp => {
                // Exclude employees with position = 'CEO' (case insensitive)
                const position = emp.position || emp.designation || '';
                return position.toLowerCase() !== 'ceo';
              })
              .map(emp => ({
                ...emp,
                // Remove emojis and clean the firstName
                firstName: emp.firstName ? emp.firstName.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]/g, '').trim() : emp.firstName
              }));

            // If user is L2/tl (Team Leader), filter employees reporting to them
            if (role === 'L2' || role === 'tl') {
              const reportingEmployees = activeEmployees.filter(emp => {
                // Handle both reportingManager and reportingManager_id field names
                const reportingManagerField = emp.reportingManager || emp.reportingManager_id;
                const matches = reportingManagerField === employeeCode ||
                               reportingManagerField === firstName ||
                               reportingManagerField === username;
                
                return matches;
              });


              if (reportingEmployees.length > 0) {
                setEmployeeOptions(reportingEmployees);
              } else {
                // If no reporting employees, show all active employees for now
                setEmployeeOptions(activeEmployees);
              }
            } else {
              // For other roles, show all active employees
              setEmployeeOptions(activeEmployees);
            }
          } else {
            throw new Error('No employees found in axios response');
          }
        } catch (axiosError) {
          console.error('Axios employee fetch also failed:', axiosError);
          // Set mock data if both methods fail
          const mockEmployees = [
            { employeeCode: 'EMP001', firstName: 'John', lastName: 'Doe' },
            { employeeCode: 'EMP002', firstName: 'Jane', lastName: 'Smith' },
            { employeeCode: 'AD102', firstName: 'Admin', lastName: 'User' },
            { employeeCode: 'CBE0003', firstName: 'Varun', lastName: 'Kumar' },
            { employeeCode: 'EMP20254337', firstName: 'Nallasivam', lastName: 'S' }
          ];
          setEmployeeOptions(mockEmployees);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      // Keep default values on error
    }
  };

  // Fetch branch employees for BM users
  const fetchBranchEmployees = async () => {
    if (currentUser.role !== 'L3' && currentUser.role !== 'bm') {
      return; // Only fetch for BM users
    }

    setLoadingBranchData(true);
    try {
      const response = await apiRequest('/candidates/branch-employees/');

      if (response && response.all_employees) {
        // Filter for active employees: del_state = 0, status = 'Active', exclude CEOs, same branch, and clean names
        const currentBMBranch = response.branch; // Get the BM's branch from API response
        const activeBranchEmployees = response.all_employees
          .filter(emp => emp.del_state === 0 || emp.del_state === '0' || emp.del_state == null)
          .filter(emp => {
            // Filter by status = 'Active' (case insensitive)
            const status = emp.status || '';
            return status.toLowerCase() === 'active';
          })
          .filter(emp => {
            // Exclude employees with position = 'CEO' (case insensitive)
            const position = emp.position || emp.designation || '';
            return position.toLowerCase() !== 'ceo';
          })
          .filter(emp => {
            // Filter by same branch as the logged-in BM
            const empBranch = emp.branch || '';
            return empBranch === currentBMBranch;
          })
          .map(emp => ({
            ...emp,
            // Remove emojis and clean the firstName
            firstName: emp.firstName ? emp.firstName.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim() : emp.firstName
          }));

        // Filter for active team leaders: del_state = 0, status = 'Active', exclude CEOs, same branch, and clean names
        const activeTeamLeaders = (response.team_leaders || [])
          .filter(tl => tl.del_state === 0 || tl.del_state === '0' || tl.del_state == null)
          .filter(tl => {
            // Filter by status = 'Active' (case insensitive)
            const status = tl.status || '';
            return status.toLowerCase() === 'active';
          })
          .filter(tl => {
            // Exclude team leaders with position = 'CEO' (case insensitive)
            const position = tl.position || tl.designation || '';
            return position.toLowerCase() !== 'ceo';
          })
          .filter(tl => {
            // Filter by same branch as the logged-in BM
            const tlBranch = tl.branch || '';
            return tlBranch === currentBMBranch;
          })
          .map(tl => ({
            ...tl,
            // Remove emojis and clean the firstName
            firstName: tl.firstName ? tl.firstName.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]/g, '').trim() : tl.firstName
          }));

        setBranchEmployees(activeBranchEmployees);
        setTeamLeaders(activeTeamLeaders);
      }
    } catch (error) {
      console.error('Failed to fetch branch employees:', error);
      toast.error('Failed to load branch employees');
    } finally {
      setLoadingBranchData(false);
    }
  };

  // Fetch candidates from backend
  // T-DTR: Filters by ClientJob UPDATED_AT date (when feedback was last updated)
  const fetchCandidates = async (fromDate = null, toDate = null, filterParams = null) => {
    setLoadingCandidates(true);

    try {
      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);

      // Add BM filter parameters if provided
      if (filterParams) {
        if (filterParams.selectedEmployee) params.append('selectedEmployee', filterParams.selectedEmployee);
        if (filterParams.selectedTL) params.append('selectedTL', filterParams.selectedTL);
        if (filterParams.filterMode) params.append('filterMode', filterParams.filterMode);
      }

      // Add pagination for better performance
      params.append('page_size', '2000'); // Reasonable page size
      params.append('page', '1'); // First page

      // Fetch candidates with optimized params
      
      const response = await apiRequest(`/candidates/my-candidates-dtr/?${params.toString()}`);

      // Process API response

      // Handle different response formats
      let candidatesArray = response;
      if (response && typeof response === 'object' && !Array.isArray(response)) {
        // If response is paginated or wrapped in an object
        candidatesArray = response.results || response.data || response.candidates || [];
        // Extracted candidates from response object
      }

      // Ensure we have an array
      if (!Array.isArray(candidatesArray)) {
        console.error("❌ DEBUG: Response is not an array:", candidatesArray);
        candidatesArray = [];
      }

      // Transform backend data to match CandidateTable expectations
      const transformedData = candidatesArray.map(candidate => {
        // Get the most recent client job for client_name, designation, and remarks
        const mostRecentJob = candidate.client_jobs && candidate.client_jobs.length > 0
          ? candidate.client_jobs[0] // Already sorted by updated_at desc in backend
          : null;

        // Create standardized client job object for CandidateTable
        const standardizedClientJob = mostRecentJob ? {
          id: mostRecentJob.id,
          client_name: mostRecentJob.client_name || '',
          clientName: mostRecentJob.client_name || '',
          designation: mostRecentJob.designation || '',
          current_ctc: mostRecentJob.current_ctc || null,
          currentCtc: mostRecentJob.current_ctc || null,
          expected_ctc: mostRecentJob.expected_ctc || null,
          expectedCtc: mostRecentJob.expected_ctc || null,
          remarks: mostRecentJob.remarks || '',
          next_follow_up_date: mostRecentJob.next_follow_up_date || null,
          nextFollowUpDate: mostRecentJob.next_follow_up_date || null,
          expected_joining_date: mostRecentJob.expected_joining_date || null,
          expectedJoiningDate: mostRecentJob.expected_joining_date || null,
          interview_fixed_date: mostRecentJob.interview_fixed_date || null,
          interviewFixedDate: mostRecentJob.interview_fixed_date || null,
          created_at: mostRecentJob.created_at || null,
          updated_at: mostRecentJob.updated_at || null
        } : null;

        return {
          // Core IDs
          id: candidate.id,
          candidateId: candidate.id,
          candidate_id: candidate.id,
          
          // Profile info
          profileNumber: candidate.profile_number || '',
          profile_number: candidate.profile_number || '',
          
          // Executive info
          executiveName: candidate.executive_name || '',
          executive_name: candidate.executive_name || '',
          executive_display: candidate.executive_display || '',
          
          // Candidate info
          candidateName: candidate.candidate_name || '',
          candidate_name: candidate.candidate_name || '',
          
          // Contact info
          email: candidate.email || '',
          mobile1: candidate.mobile1 || '',
          mobile2: candidate.mobile2 || '',
          contactNumber1: candidate.mobile1 || '',
          contactNumber2: candidate.mobile2 || '',
          phone_number: candidate.mobile1 || '',
          phoneNumber: candidate.mobile1 || '',
          
          // Location info
          location: `${candidate.city || ''}, ${candidate.state || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || '-',
          city: candidate.city || '',
          state: candidate.state || '',
          cityState: `${candidate.city || ''}, ${candidate.state || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || '-',
          pincode: candidate.pincode || '',
          
          // Education & Experience
          education: candidate.education || '',
          experience: candidate.experience || '',
          
          // Source
          source: candidate.source || '',
          source_name: candidate.source || '',
          sourceName: candidate.source || '',
          
          // Client job info (direct access for compatibility)
          clientName: standardizedClientJob?.client_name || '',
          client_name: standardizedClientJob?.client_name || '',
          designation: standardizedClientJob?.designation || '',
          remarks: standardizedClientJob?.remarks || '',
          current_ctc: standardizedClientJob?.current_ctc || null,
          currentCTC: standardizedClientJob?.currentCtc || null,
          expected_ctc: standardizedClientJob?.expected_ctc || null,
          expectedCTC: standardizedClientJob?.expectedCtc || null,
          next_follow_up_date: standardizedClientJob?.next_follow_up_date || null,
          nextFollowUpDate: standardizedClientJob?.nextFollowUpDate || null,
          
          // Client job object for CandidateTable
          selectedClientJob: standardizedClientJob,
          clientJob: standardizedClientJob,
          
          // All client jobs
          client_jobs: candidate.client_jobs || [],
          clientJobs: candidate.client_jobs || [],
          feedbackHistory: candidate.client_jobs || [],
          
          // Dates - T-DTR uses ClientJob.updated_at for dateOfEntry (when feedback was last updated)
          dateOfEntry: standardizedClientJob?.updated_at
            ? standardizedClientJob.updated_at.split('T')[0]
            : (candidate.created_at ? candidate.created_at.split('T')[0] : ''),
          created_at: candidate.created_at || '',
          updated_at: candidate.updated_at || '',
          candidateCreatedDate: candidate.created_at || '',
          feedbackUpdatedDate: standardizedClientJob?.updated_at || '',
          
          // Other fields
          gender: candidate.gender || '',
          dob: candidate.dob || null,
          country: candidate.country || null,
          communication: candidate.communication || '',
          updated_by: candidate.updated_by || ''
        };
      });

      console.log('✅ T-DTR: Transformed candidates data:', transformedData.length, 'records');
      if (transformedData.length > 0) {
        console.log('📋 T-DTR Sample candidate:', transformedData[0]);
        console.log('🔍 T-DTR dateOfEntry (should be ClientJob.updated_at):', transformedData[0].dateOfEntry);
        console.log('🔍 T-DTR feedbackUpdatedDate:', transformedData[0].feedbackUpdatedDate);
        console.log('🔍 T-DTR candidate created_at:', transformedData[0].created_at);
      }
      
      setCandidatesData(transformedData);
    } catch (error) {
      console.error('❌ Failed to fetch candidates:', error);
      toast.error('Failed to load candidates');
      setCandidatesData([]);
    } finally {
      setLoadingCandidates(false);
      setInitialLoading(false); // Set initial loading to false after first fetch
    }
  };

  // Filter and search logic
  const getFilteredData = () => {
    // For TL users, always apply filtering (even with empty selectedEmployee)
    const isTL = currentUser.role === 'L2' || currentUser.role === 'tl';

    // Check for submitted filters (excluding selectedEmployee for TL users)
    const hasSubmittedFilters = appliedFilters.fromDate || appliedFilters.toDate ||
      appliedFilters.client || appliedFilters.status ||
      appliedFilters.state || appliedFilters.city || appliedFilters.selectedBranch ||
      appliedFilters.selectedTL || appliedFilters.selectedExecutive ||
      (!isTL && appliedFilters.selectedEmployee); // Only include selectedEmployee for non-TL users

    // For TL users, always filter; for others, only filter if hasSubmittedFilters
    const shouldApplyFiltering = isTL || hasSubmittedFilters;

    let filteredBySubmittedFilters = candidatesData;

    // Apply filtering based on user role and submitted filters

    if (shouldApplyFiltering) {
      filteredBySubmittedFilters = candidatesData.filter(item => {
        // Skip date filtering - backend already filters by date
        const matchesDateRange = true;

        // For client filter, we need to match vendor ID to vendor name
        const matchesClient = !appliedFilters.client || (() => {
          if (!appliedFilters.client) return true;
          const selectedVendor = clientOptions.find(v => v.id.toString() === appliedFilters.client.toString());
          return selectedVendor && item.clientName === selectedVendor.vendor_name;
        })();

        const matchesStatus = !appliedFilters.status ||
          (item.remarks && item.remarks.toLowerCase().includes(appliedFilters.status.toLowerCase()));
        const matchesState = !appliedFilters.state ||
          (item.location && item.location.toLowerCase().includes(appliedFilters.state.toLowerCase()));
        const matchesCity = !appliedFilters.city ||
          (item.location && item.location.toLowerCase().includes(appliedFilters.city.toLowerCase()));
        const matchesBranch = !appliedFilters.selectedBranch || item.executiveName === appliedFilters.selectedBranch;
        const matchesTL = !appliedFilters.selectedTL || item.executiveName === appliedFilters.selectedTL;
        const matchesExecutive = !appliedFilters.selectedExecutive || item.executiveName === appliedFilters.selectedExecutive;

        // Employee filter for L2 users - filter by executive_name field
        const matchesEmployee = (() => {
          // For TL (L2) users, implement specific filtering logic
          if (currentUser.role === 'L2' || currentUser.role === 'tl') {
            if (!appliedFilters.selectedEmployee) {
              // Empty selection: show candidates created by TL and all employees reporting to them
              const employeeCodes = employeeOptions.map(emp => emp.employeeCode);
              const matches = item.executiveName === currentUser.employeeCode || employeeCodes.includes(item.executiveName);
              return matches;
            } else if (appliedFilters.selectedEmployee === 'all') {
              // "All Employees": show candidates created by TL and all employees under them
              const employeeCodes = employeeOptions.map(emp => emp.employeeCode);
              const matches = item.executiveName === currentUser.employeeCode || employeeCodes.includes(item.executiveName);
              return matches;
            } else {
              // Specific employee: show candidates created only by that employee
              const matches = item.executiveName === appliedFilters.selectedEmployee;
              return matches;
            }
          } else {
            // For non-TL users, keep original logic
            return !appliedFilters.selectedEmployee || item.executiveName === appliedFilters.selectedEmployee;
          }
        })();

        const result = matchesDateRange && matchesClient && matchesStatus && matchesState && matchesCity &&
          matchesBranch && matchesTL && matchesExecutive && matchesEmployee;

        return result;
      });
    }

    // Then apply real-time search filter
    if (searchTerm) {
      return filteredBySubmittedFilters.filter(item =>
        item.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.profileNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.executiveName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filteredBySubmittedFilters;
  };

  const filteredData = getFilteredData();

  // Sorting logic
  const getSortedData = () => {
    const sorted = [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const sortedData = getSortedData();

  // Debug logs
  console.log('🔍 Debug - candidatesData length:', candidatesData.length);
  console.log('🔍 Debug - filteredData length:', filteredData.length);
  console.log('🔍 Debug - sortedData length:', sortedData.length);

  // Pagination logic
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);

  // Statistics calculations
  const stats = {
    totalEntries: filteredData.length,
    callAnswered: filteredData.filter(item => item.remarks === 'Call Answered').length,
    interested: filteredData.filter(item => item.remarks === 'Interested').length,
    selected: filteredData.filter(item => item.remarks === 'Selected').length
  };

  // Handle sorting
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Handle pagination
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle page size change
  const handlePageSizeChange = (newSize) => {
    setItemsPerPage(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Handle submit filters
  const handleSubmitFilters = () => {
    setAppliedFilters({ ...filters });
    setCurrentPage(1); // Reset to first page when applying filters
    closeMobileFilters(); // Close mobile filters if open

    // Prepare BM filter parameters if user is BM
    let filterParams = null;
    if (currentUser.role === 'L3' || currentUser.role === 'bm') {
      filterParams = {
        selectedEmployee: filters.selectedEmployee,
        selectedTL: filters.selectedTL,
        filterMode: filters.filterMode
      };
    }

    // For TL users with employee filtering, we need to fetch broader data and filter on frontend
    // This ensures we get all necessary candidates for the selected employee(s)
    if (!filters.fromDate && !filters.toDate) {
      // No date filters: fetch all candidates
      fetchCandidates(null, null, filterParams);
    } else {
      // With date filters: fetch candidates within date range
      fetchCandidates(filters.fromDate, filters.toDate, filterParams);
    }

    toast.success('Filters applied successfully!');
  };

  // Handle state change - clear city when state changes
  const handleStateChange = (value) => {
    setFilters(prev => ({ ...prev, state: value }));
    // Clear city when state changes
    if (filters.city) {
      setFilters(prev => ({ ...prev, city: '' }));
    }
  };

  // Handle clear filters
  const handleClearFilters = () => {
    // Reset ALL filters to current date (not empty values)
    const today = getCurrentDate();
    const clearedFilters = {
      fromDate: today,
      toDate: today,
      client: '',
      status: '',
      state: '',
      city: '',
      selectedBranch: '',
      selectedTL: '',
      selectedExecutive: '',
      selectedEmployee: '',
      filterMode: 'self_only' // Reset to default BM filter mode
    };

    setFilters(clearedFilters);
    setAppliedFilters(clearedFilters);
    closeMobileFilters(); // Close mobile filters if open
    setCurrentPage(1); // Reset to first page

    // Fetch today's data
    const filterParams = (currentUser.role === 'L3' || currentUser.role === 'bm') ? {
      selectedEmployee: '',
      selectedTL: '',
      filterMode: 'self_only'
    } : null;

    fetchCandidates(today, today, filterParams);
    toast.success('Filters cleared! Showing today\'s data.');
  };

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Call Answered':
      case 'Interested':
      case 'Selected':
        return 'bg-green-100 text-green-800';
      case 'Interview Fixed':
        return 'bg-blue-100 text-blue-800';
      case 'Call Not Answered':
      case 'No Show':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get candidate ID for ViewCandidate navigation
  const getCandidateId = (candidate) => {
    return candidate.candidateId || candidate.id;
  };

  // Handle feedback modal (triggered by candidate name click) - Use NewDtr FeedbackModal
  const handleFeedbackCandidate = (candidate) => {
    // Transform DailyReports candidate data to NewDtr FeedbackModal format
    // Important: Filter feedback data for specific client job only
    const transformedCandidate = {
      // Use the actual candidate ID from DailyReports data
      id: candidate.id,  // This should be the actual candidate ID (191452 from your logs)
      candidateId: candidate.id,  // FeedbackModal uses this to fetch client jobs
      name: candidate.candidateName,
      phone: candidate.mobile1,
      email: candidate.email,
      profileNumber: candidate.profileNumber,
      executiveName: candidate.executiveName,
      // Provide client info for filtering - FeedbackModal will filter by client name
      selectedClientJob: candidate.clientName ? {
        client_name: candidate.clientName.trim(), // Clean client name for filtering
        designation: candidate.designation || '',
        candidate_id: candidate.id  // Use the actual candidate ID
      } : null,
      // Add client filter hint for FeedbackModal
      filterByClient: candidate.clientName ? candidate.clientName.trim() : null,
      // Add additional context that might be needed
      city: candidate.location,
      state: candidate.state || '',
      source: candidate.source || '',
      // Add backend data structure that FeedbackModal might expect
      backendData: {
        executive_name: candidate.executiveName,
        id: candidate.id,
        candidate_id: candidate.id
      },
      // Force fresh data fetch by clearing any cache keys
      _forceRefresh: Date.now()
    };

    setSelectedCandidate(transformedCandidate);
    setShowFeedbackModal(true);
  };

  // Close modals (ViewModal now handled by AppContext)

  const closeFeedbackModal = () => {
    setShowFeedbackModal(false);
    setSelectedCandidate(null);
  };

  // Show loading state on initial load
  if (initialLoading) {
    return null;
  }

  return (
    <div className="space-y-1">
      {/* Toast Notifications */}
      <Toaster position="top-center" />
      
      {/* ================================================ */}
      {/* FILTER LAYOUT STRUCTURE BY VIEWPORT SIZE:       */}
      {/* ------------------------------------------------ */}
      {/* 1. DESKTOP (1024px+): Grid layout filters       */}
      {/*    - lg: 4 columns, xl: 6 columns               */}
      {/* 2. TABLET (768px-1023px): Bottom sheet modal    */}
      {/* 3. MOBILE (<768px): Bottom sheet modal          */}
      {/* ================================================ */}

      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-2 py-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-md font-bold text-gray-900">IF/PS Report</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* ============================================= */}
              {/* MOBILE/TABLET FILTER TRIGGER BUTTON           */}
              {/* Visible on mobile and tablets (< 1024px)      */}
              {/* ============================================= */}
              <button
                onClick={() => {
                  if (!showMobileFilters) {
                    openMobileFilters();
                  } else {
                    closeMobileFilters();
                  }
                }}
                className="lg:hidden p-1.5 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors duration-200"
                title="Toggle Filters"
              >
                <Filter className="w-3 h-3 text-blue-600" />
              </button>
              <div className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                {currentUser.role.toUpperCase()} Panel
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================= */}
      {/* DESKTOP FILTERS - Large screens (1024px+)     */}
      {/* ============================================= */}
      <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-2">
          {/* Desktop Grid Layout - Responsive columns based on screen size */}
          {/* lg (1024px-1280px): 4 columns */}
          {/* xl (1280px+): 6 columns */}
          <div className="lg:grid lg:grid-cols-4 xl:grid-cols-8 gap-2">
            {/* Date Range Filters */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <Calendar className="w-3 h-3 inline mr-1" />
                From Date
              </label>
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => setFilters(prev => ({ ...prev, fromDate: e.target.value }))}
                onFocus={(e) => { try { e.target.showPicker && e.target.showPicker(); } catch(err) {} }}
                className="w-full h-[25px] px-2 py-0.5 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <Calendar className="w-3 h-3 inline mr-1" />
                To Date
              </label>
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) => setFilters(prev => ({ ...prev, toDate: e.target.value }))}
                onFocus={(e) => { try { e.target.showPicker && e.target.showPicker(); } catch(err) {} }}
                className="w-full h-[30px] px-2 py-0.5 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>

            {/* Client Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Client Name</label>
              <select
                value={filters.client}
                onChange={(e) => {
                  const vendorId = e.target.value;
                  setFilters(prev => ({ ...prev, client: vendorId }));
                }}
                className="w-full h-[30px] px-2 py-0.5 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                <option value="">All Clients</option>
                {clientOptions.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>{vendor.vendor_name}</option>
                ))}
              </select>
            </div>

            {/* State Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
              <select
                value={filters.state}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full h-[30px] px-2 py-0.5 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                disabled={locationLoading}
              >
                <option value="">
                  {locationLoading ? 'Loading states...' : 'All States'}
                </option>
                {stateOptions.map(state => (
                  <option key={state.uniqueKey || state.id || state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
            </div>

            {/* City Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
              <select
                value={filters.city}
                onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
                className="w-full h-[30px] px-2 py-0.5 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                disabled={locationLoading || !filters.state}
              >
                <option value="">
                  {locationLoading ? 'Loading cities...' : !filters.state ? 'Select State First' : 'All Cities'}
                </option>
                {cityOptions.map(city => (
                  <option key={city.uniqueKey || city.id || city.value} value={city.value}>
                    {city.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full h-[30px] px-2 py-0.5 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                <option value="">All Statuses</option>
                {remarkOptions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Employees Filter - Only for L2 (Team Leaders) */}
            {(currentUser.role === 'L2' || currentUser.role === 'tl') && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Employees</label>
                <select
                  value={filters.selectedEmployee}
                  onChange={(e) => setFilters(prev => ({ ...prev, selectedEmployee: e.target.value }))}
                  className="w-full h-[30px] px-2 py-0.5 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  <option value=""> Select Employee </option>
                  <option value="all">All Employees</option>
                  {employeeOptions.map((employee) => (
                    <option key={employee.employeeCode} value={employee.employeeCode}>
                      {employee.employeeCode} - {employee.firstName || employee.executiveName || 'Unknown'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* BM Filter Mode - Only for L3 (Branch Managers) */}
            {(currentUser.role === 'L3' || currentUser.role === 'bm') && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Filter Mode</label>
                <select
                  value={filters.filterMode}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    filterMode: e.target.value,
                    selectedEmployee: '',
                    selectedTL: ''
                  }))}
                  className="w-full h-[30px] px-2 py-0.5 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="self_only">BM Only</option>
                  <option value="all_branch">All Branch</option>
                  <option value="tl_only">TL Only</option>
                  <option value="tl_with_team">TL + Team</option>
                </select>
              </div>
            )}

            {/* Team Leader Filter - Only for BM when TL modes are selected */}
            {(currentUser.role === 'L3' || currentUser.role === 'bm') &&
              (filters.filterMode === 'tl_only' || filters.filterMode === 'tl_with_team') && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Team Leader {teamLeaders.length > 0 && teamLeaders[0].branch && `(${teamLeaders[0].branch})`}
                  </label>
                  <select
                    value={filters.selectedTL}
                    onChange={(e) => setFilters(prev => ({ ...prev, selectedTL: e.target.value }))}
                    className="w-full h-[30px] px-2 py-0.5 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    disabled={loadingBranchData}
                  >
                    <option value="">Select Team Leader </option>
                    {teamLeaders.map((tl) => (
                      <option key={tl.employeeCode} value={tl.employeeCode}>
                        {tl.firstName} {tl.lastName} ({tl.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

            {/* Employee Filter - Only for BM when self_only mode */}
            {(currentUser.role === 'L3' || currentUser.role === 'bm') &&
              filters.filterMode === 'self_only' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Employee {branchEmployees.length > 0 && branchEmployees[0].branch && `(${branchEmployees[0].branch})`}
                  </label>
                  <select
                    value={filters.selectedEmployee}
                    onChange={(e) => setFilters(prev => ({ ...prev, selectedEmployee: e.target.value }))}
                    className="w-full h-[30px] px-2 py-0.5 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    disabled={loadingBranchData}
                  >
                    <option value="">Select Employee </option>
                    {branchEmployees.map((emp) => (
                      <option key={emp.employeeCode} value={emp.employeeCode}>
                        {emp.firstName} {emp.lastName} ({emp.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

            {/* Action Buttons */}
            <div className="flex items-end gap-2">
              <button
                onClick={handleSubmitFilters}
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-1 shadow-md hover:shadow-lg"
              >
                <Search className="w-3 h-3" />
                <span className="text-xs">Submit</span>
              </button>

              <button
                onClick={handleClearFilters}
                className="px-2 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center space-x-1 shadow-md hover:shadow-lg"
              >
                <Filter className="w-3 h-3" />
                <span className="text-xs">Clear</span>
              </button>
            </div>
          </div>

          {/* Deprecated section removed - was causing duplicate DOM elements and performance issues */}
        </div>
      </div>

      {/* Statistics Cards */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Total Entries</p>
              <p className="text-lg font-bold text-gray-900">{stats.totalEntries}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-full">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Call Answered</p>
              <p className="text-lg font-bold text-green-600">{stats.callAnswered}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-full">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Interested</p>
              <p className="text-lg font-bold text-orange-600">{stats.interested}</p>
            </div>
            <div className="p-2 bg-orange-100 rounded-full">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Selected</p>
              <p className="text-lg font-bold text-purple-600">{stats.selected}</p>
            </div>
            <div className="p-2 bg-purple-100 rounded-full">
              <CheckCircle className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div> */}

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Candidate Table Component - handles its own search and pagination */}
          {loadingCandidates ? (
            <div className="flex items-center justify-center py-12 bg-white rounded-sm border border-gray-200">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading candidates...</span>
            </div>
          ) : (
            <CandidateTable
              candidates={sortedData}
              fetchMode="direct"
              entriesPerPage={itemsPerPage}
              onViewFeedback={handleFeedbackCandidate}
              showActions={true}
              title="Daily Reports"
              emptyMessage={
                appliedFilters.fromDate === appliedFilters.toDate && appliedFilters.fromDate === getCurrentDate()
                  ? `No candidates found for today (${new Date().toLocaleDateString('en-IN')})`
                  : 'No candidates found. Try adjusting your filters or search terms.'
              }
            />
          )}
        </div>

      {/* Feedback Modal - Using NewDtr FeedbackModal with Cache Bypass */}
      {showFeedbackModal && selectedCandidate && (
        <FeedbackModal
          key={`feedback-${selectedCandidate.id}-${selectedCandidate._forceRefresh}`}
          isOpen={showFeedbackModal}
          onClose={closeFeedbackModal}
          candidate={{
            ...selectedCandidate,
            // Keep original candidateId for API calls, but add cache bypass flags
            candidateId: selectedCandidate.candidateId,
            id: selectedCandidate.id,
            // Add flags to force cache bypass without breaking API calls
            _fromDailyReports: true,
            _bypassCache: true,
            _cacheKey: `${selectedCandidate.candidateId}-${selectedCandidate._forceRefresh}`, // Custom cache key
            // Add flag to disable strict feedback filtering
            _showAllFeedback: true
          }}
          clientJobId={null}
        />
      )}

      {/* ============================================= */}
      {/* MOBILE & TABLET FILTERS - Small/Medium screens */}
      {/* Phone: 0-767px (sm breakpoint)                 */}
      {/* Tablet: 768px-1023px (md breakpoint)           */}
      {/* Uses bottom sheet modal pattern                */}
      {/* ============================================= */}
      {showMobileFilters && (
        <div
          className={`lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex flex-col transition-opacity duration-300 ${isMobileFiltersOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={closeMobileFilters}
        >
          <div className="relative mt-auto px-1">
            {/* Visual Stack Effect - Creates depth perception */}
            <div
              className={`pointer-events-none absolute inset-x-0 bottom-2 mx-2 rounded-t-2xl bg-white shadow-lg transform transition-all duration-300 ease-out ${isMobileFiltersOpen ? 'translate-y-0 scale-95 opacity-70' : 'translate-y-full scale-95 opacity-0'}`}
            ></div>
            <div
              className={`pointer-events-none absolute inset-x-0 bottom-4 mx-4 rounded-t-2xl bg-white shadow-md transform transition-all duration-300 delay-75 ease-out ${isMobileFiltersOpen ? 'translate-y-0 scale-90 opacity-50' : 'translate-y-full scale-90 opacity-0'}`}
            ></div>

            {/* Main Bottom Sheet Container */}
            <div
              className={`relative bg-white rounded-t-2xl shadow-xl transform transition-all duration-300 ease-out ${isMobileFiltersOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Bottom Sheet Header - Mobile/Tablet */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-2xl flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Filters
                </h3>
                <button
                  onClick={closeMobileFilters}
                  className="p-2 hover:bg-blue-700 rounded-full transition-colors duration-200"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Bottom Sheet Content - Scrollable Filter Options */}
              <div className="p-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                  {/* ===== DATE RANGE FILTERS ===== */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        From Date
                      </label>
                      <input
                        type="date"
                        value={filters.fromDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, fromDate: e.target.value }))}
                        onFocus={(e) => { try { e.target.showPicker && e.target.showPicker(); } catch(err) {} }}
                        className="w-full h-[30px] px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        To Date
                      </label>
                      <input
                        type="date"
                        value={filters.toDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, toDate: e.target.value }))}
                        onFocus={(e) => { try { e.target.showPicker && e.target.showPicker(); } catch(err) {} }}
                        className="w-full h-[30px] px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* ===== CLIENT FILTER ===== */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Users className="w-4 h-4 inline mr-1" />
                      Client
                    </label>
                    <select
                      value={filters.client}
                      onChange={(e) => setFilters(prev => ({ ...prev, client: e.target.value }))}
                      className="w-full h-[30px] px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Clients</option>
                      {clientOptions.map(client => (
                        <option key={client.id} value={client.vendor_name}>
                          {client.vendor_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ===== STATUS FILTER ===== */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full h-[30px] px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Status</option>
                      {remarkOptions.map(remark => (
                        <option key={remark} value={remark}>
                          {remark}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ===== STATE FILTER ===== */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State
                    </label>
                    <select
                      value={filters.state}
                      onChange={(e) => handleStateChange(e.target.value)}
                      className="w-full h-[30px] px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      disabled={locationLoading}
                    >
                      <option value="">
                        {locationLoading ? 'Loading states...' : 'All States'}
                      </option>
                      {stateOptions.map(state => (
                        <option key={state.uniqueKey || state.id || state.value} value={state.value}>
                          {state.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ===== CITY FILTER ===== */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <select
                      value={filters.city}
                      onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full h-[30px] px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      disabled={locationLoading || !filters.state}
                    >
                      <option value="">
                        {locationLoading ? 'Loading cities...' : !filters.state ? 'Select State First' : 'All Cities'}
                      </option>
                      {cityOptions.map(city => (
                        <option key={city.uniqueKey || city.id || city.value} value={city.value}>
                          {city.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ===== ROLE-BASED FILTERS (BM ONLY) ===== */}
                  {(currentUser.role === 'L3' || currentUser.role === 'bm') && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Team Leader
                        </label>
                        <select
                          value={filters.selectedTL}
                          onChange={(e) => setFilters(prev => ({ ...prev, selectedTL: e.target.value, selectedExecutive: '', selectedEmployee: '' }))}
                          className="w-full h-[30px] px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">All Team Leaders</option>
                          {teamLeaders.map(tl => (
                            <option key={tl.employeeCode} value={tl.employeeCode}>
                              {tl.firstName} {tl.lastName} ({tl.employeeCode})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Employee
                        </label>
                        <select
                          value={filters.selectedEmployee}
                          onChange={(e) => setFilters(prev => ({ ...prev, selectedEmployee: e.target.value }))}
                          className="w-full h-[30px] px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">All Employees</option>
                          {branchEmployees.map(emp => (
                            <option key={emp.employeeCode} value={emp.employeeCode}>
                              {emp.firstName} {emp.lastName} ({emp.employeeCode})
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Bottom Sheet Footer - Action Buttons */}
              <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <div className="flex space-x-3">
                  <button
                    onClick={handleSubmitFilters}
                    className="flex-1 px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    <Search className="w-4 h-4" />
                    <span>Apply Filters</span>
                  </button>
                  <button
                    onClick={handleClearFilters}
                    className="flex-1 px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
                  >
                    <Filter className="w-4 h-4" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IFPSReport;