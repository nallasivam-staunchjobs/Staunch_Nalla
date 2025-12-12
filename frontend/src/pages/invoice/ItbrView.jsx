import React, { useState, useEffect } from 'react';
import 'react-toastify/dist/ReactToastify.css';
import { toast, ToastContainer } from 'react-toastify';
// DatePicker import removed - using native date input
import { revenueService } from '../NewDtr/services/api';
import EditRevenueForm from '../RevvenueUpdate/EditRevenueForm';
import Loading from '../../components/Loading';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLocationDropdowns } from '../../hooks/useLocationDropdowns';
import { apiRequest } from '../../api/apiConfig';
import {
    ChevronLeft,
    ChevronRight,
    MailCheck,
    X as CloseIcon,
    FileText,
    Edit,
    Trash,
    Loader2,
} from 'lucide-react';

function ItbrView() {
    // Get URL parameters
    const [searchParams] = useSearchParams();
    const planId = searchParams.get('plan');
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    const dateParam = searchParams.get('date') || today.toISOString().split('T')[0];

    const [sources, setSources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [branchEventsCurrentPage, setBranchEventsCurrentPage] = useState(1);

    // Filter states
    const [filters, setFilters] = useState(() => {
        const initFilters = {
            fromDate: firstDayOfMonth,
            toDate: lastDayOfMonth,
            state: '',
            city: '',
            selectedPlan: planId || '',
            selectedBranch: '',
            // selectedBranchId is no longer needed
            selectedTeam: '',
            selectedTeamId: null,
            selectedEmployee: '',
            selectedClient: ''
        };
        return initFilters;
    });

    const [appliedFilters, setAppliedFilters] = useState({
        fromDate: firstDayOfMonth,
        toDate: lastDayOfMonth,
        state: '',
        city: '',
        selectedPlan: planId || '',
        selectedBranch: '',
        // selectedBranchId is no longer needed
        selectedTeam: '',
        selectedTeamId: null,
        selectedEmployee: '',
        selectedClient: ''
    });

    // Location dropdowns hook
    const {
        locationData,
        loading: locationLoading,
        error: locationError,
        getCitiesByState,
        getStatesByCountry
    } = useLocationDropdowns();

    // Get filtered state and city options
    const stateOptions = locationData.states || [];
    const cityOptions = filters.state
        ? getCitiesByState(filters.state)
        : [];

    // Loading states for dropdowns
    const [loadingDropdowns, setLoadingDropdowns] = useState({
        clients: false,
        executives: false,
        branches: false,
        teams: false
    });

    // Dropdown options
    const [dropdownOptions, setDropdownOptions] = useState({
        plans: [],
        employees: [],
        clients: [],
        branches: [],
        teams: [],
        executives: [],
        user_level: null,
        filtering_applied: false
    });

    const [newSource, setNewSource] = useState('');
    const [newSourceStatus, setNewSourceStatus] = useState('Active');
    const [showAddModal, setShowAddModal] = useState(false);
    const [sourceToDelete, setSourceToDelete] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [currentPage, setCurrentPage] = useState(1); // Backend page number
    const [entriesPerPage, setEntriesPerPage] = useState(50); // Backend page_size (default 50)
    const [totalCount, setTotalCount] = useState(0); // Total results from backend
    const [totalRevenue, setTotalRevenue] = useState(0); // Total revenue from backend (Joined only)
    const [claimedCount, setClaimedCount] = useState(0);
    const [pendingCount, setPendingCount] = useState(0);
    const [processCount, setProcessCount] = useState(0);
    const [joinedCount, setJoinedCount] = useState(0);
    const [abscondCount, setAbscondCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [headerFilter, setHeaderFilter] = useState(null);
    const [statusChangeModal, setStatusChangeModal] = useState({
        show: false,
        id: null,
        newStatus: '',
        sourceName: '',
    });
    const [editConfirmationModal, setEditConfirmationModal] = useState({
        show: false,
        id: null,
        currentName: '',
    });
    const [fromDate, setFromDate] = useState(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1);
    });
    const [toDate, setToDate] = useState(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth() + 1, 0);
    });
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState(null);

    // Fetch branches from masters API
    const fetchBranches = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/masters/branches/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch branches');
            }

            const data = await response.json();
            return data.results || data; // Handle both paginated and direct array responses
        } catch (error) {
            console.error('Error fetching branches:', error);
            throw error;
        }
    };

    // Fetch clients from vendors API (authenticated, robust to response formats)
    const fetchClients = async () => {
        setLoadingDropdowns(prev => ({ ...prev, clients: true }));
        try {
            // Use shared apiRequest helper so auth headers are consistent (Token auth)
            // Hitting /vendors/vendors/ so final URL is http://localhost:8000/api/vendors/vendors/
            const response = await apiRequest('/vendors/vendors/');

            // Normalize different response shapes
            let vendors = response;
            if (response && typeof response === 'object' && !Array.isArray(response)) {
                vendors = response.results || response.data || response.vendors || [];
            }

            if (!Array.isArray(vendors)) {
                console.error('Unexpected vendors response format:', vendors);
                return [];
            }

            const clientOptions = vendors
                .filter(vendor => {
                    if (!vendor) return false;
                    // Filter for active vendors - check multiple possible field names
                    return (
                        vendor.status === 'Active' ||
                        vendor.status === 'active' ||
                        vendor.isActive === true ||
                        vendor.isActive === 'true' ||
                        !Object.prototype.hasOwnProperty.call(vendor, 'status') // Include if status doesn't exist
                    );
                })
                .filter(vendor => {
                    // Check for company name in multiple possible field names
                    const companyName =
                        vendor.companyName ||
                        vendor.vendor_name ||
                        vendor.company_name ||
                        vendor.name;
                    return companyName && companyName.toString().trim() !== '';
                })
                .map(vendor => {
                    const companyName = (
                        vendor.companyName ||
                        vendor.vendor_name ||
                        vendor.company_name ||
                        vendor.name ||
                        ''
                    )
                        .toString()
                        .trim();
                    return {
                        id: vendor.id || companyName,
                        value: companyName,
                        label: companyName,
                    };
                })
                .sort((a, b) => a.label.localeCompare(b.label));

            return clientOptions;
        } catch (error) {
            console.error('Error fetching clients:', error);
            toast.error('Failed to load client options');
            return [];
        } finally {
            setLoadingDropdowns(prev => ({ ...prev, clients: false }));
        }
    };

    // Fetch executive options from employee service (authenticated)
    const fetchExecutiveOptions = async () => {
        setLoadingDropdowns(prev => ({ ...prev, executives: true }));
        try {
            const response = await apiRequest('/empreg/employees/');

            // Handle different response formats (same as other reports)
            let allEmployees = response;
            if (response && typeof response === 'object' && !Array.isArray(response)) {
                allEmployees = response.results || response.data || response.employees || [];
            }

            if (Array.isArray(allEmployees) && allEmployees.length > 0) {
                // Filter for active employees only
                const activeEmployees = allEmployees.filter(employee => {
                    const isActiveByDelState = employee.del_state === 0 || employee.del_state === '0';
                    const isActiveByStatus = employee.status === 'Active' || employee.status === 'active';
                    const isInactive = employee.status === 'Inactive' || employee.status === 'inactive';
                    const shouldInclude = (isActiveByDelState || isActiveByStatus) && !isInactive;
                    return shouldInclude;
                });

                const executiveOptions = activeEmployees
                    .filter(employee => employee.firstName && employee.firstName.trim() !== '') // Must have a name
                    .map((employee, index) => {
                        const firstName = (employee.firstName || '').toString().trim();
                        const lastName = (employee.lastName || '').toString().trim();
                        const fullName = `${firstName} ${lastName}`.trim() || firstName;
                        const code = employee.employeeCode || employee.id;
                        const branchName = (employee.branch || employee.branch_name || '').toString().trim();
                        return {
                            // Use code/id as value for API filtering
                            value: code,
                            // Show full name (first + last) in the dropdown
                            label: fullName || code,
                            code: code,
                            branch: branchName,
                            uniqueKey: `${fullName || code}-${code || index}`
                        };
                    })
                    .sort((a, b) => a.label.localeCompare(b.label));

                return executiveOptions;
            }

            return [];
        } catch (error) {
            console.error('Error fetching executives:', error);
            toast.error('Failed to load executive options');
            return [];
        } finally {
            setLoadingDropdowns(prev => ({ ...prev, executives: false }));
        }
    };

    // Load dropdown options
    useEffect(() => {
        const loadDropdownOptions = async () => {
            try {
                // Load branches, clients, and executives in parallel
                const [branches, clients, executives] = await Promise.all([
                    fetchBranches(),
                    fetchClients(),
                    fetchExecutiveOptions()
                ]);

                // Process and set branches
                setDropdownOptions(prev => ({
                    ...prev,
                    branches: branches.map(branch => ({
                        id: branch.id,
                        value: branch.branch_name || branch.name || branch.value,
                        label: branch.branch_name || branch.name || branch.value,
                        branch_code: branch.branch_code || branch.code || ''
                    })),
                    // Set executives
                    executives: Array.isArray(executives) ? executives : [],

                    // Set clients (already processed in fetchClients)
                    clients: Array.isArray(clients) ? clients : []
                }));

            } catch (error) {
                console.error('Error loading dropdown options:', error);
                toast.error('Failed to load dropdown data');
            }
        };

        loadDropdownOptions();
    }, []);

    // Load revenue data from API
    useEffect(() => {
        loadRevenueData();
    }, [appliedFilters, currentPage, entriesPerPage]); // Re-run when filters or pagination change

    const loadRevenueData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Build query params from appliedFilters
            const params = {};
            if (appliedFilters.fromDate) params.from_date = appliedFilters.fromDate;
            if (appliedFilters.toDate) params.to_date = appliedFilters.toDate;
            if (appliedFilters.selectedBranch) params.branch_name = appliedFilters.selectedBranch;
            if (appliedFilters.selectedTeamId) params.team_id = appliedFilters.selectedTeamId;
            if (appliedFilters.selectedEmployee) params.employee = appliedFilters.selectedEmployee;
            if (appliedFilters.selectedClient) params.client = appliedFilters.selectedClient;
            if (appliedFilters.state) params.state = appliedFilters.state;
            if (appliedFilters.city) params.city = appliedFilters.city;

            // Backend-driven pagination parameters
            params.page = currentPage;
            params.page_size = entriesPerPage;

            const apiResponse = await revenueService.getAll(params);

            // Read total count from paginated response
            const total =
                typeof apiResponse?.count === 'number'
                    ? apiResponse.count
                    : Array.isArray(apiResponse)
                        ? apiResponse.length
                        : 0;
            setTotalCount(total);

            // Read aggregate counts from backend if present
            if (apiResponse && typeof apiResponse === 'object' && !Array.isArray(apiResponse)) {
                setClaimedCount(apiResponse.claimed_count ?? 0);
                setPendingCount(apiResponse.pending_count ?? 0);
                setProcessCount(apiResponse.processing_count ?? 0);
                setJoinedCount(apiResponse.joined_count ?? 0);
                setAbscondCount(apiResponse.abscond_count ?? 0);
                setTotalRevenue(apiResponse.total_revenue ?? 0);
            } else {
                // Fallback: compute from current page only (old behaviour)
                const pageArray = Array.isArray(apiResponse) ? apiResponse : apiResponse?.results || [];
                const pageClaimed = pageArray.filter(item => (item.revenue_status || '').toLowerCase() === 'claimed').length;
                const pagePending = pageArray.filter(item => (item.revenue_status || '').toLowerCase() === 'pending').length;
                const pageProcessing = pageArray.filter(item => {
                    const s = (item.revenue_status || '').toLowerCase();
                    return s === 'processing' || s === 'process';
                }).length;
                const pageJoined = pageArray.filter(item => (item.profile_status || '').toLowerCase() === 'joined').length;
                const pageAbscond = pageArray.filter(item => (item.profile_status || '').toLowerCase() === 'abscond').length;
                setClaimedCount(pageClaimed);
                setPendingCount(pagePending);
                setProcessCount(pageProcessing);
                setJoinedCount(pageJoined);
                setAbscondCount(pageAbscond);
                // No backend aggregate, fall back to computing total revenue from page (Joined only)
                const pageTotalRevenue = pageArray.reduce((total, item) => {
                    const profileStatus = (item.profile_status || '').toLowerCase();
                    if (profileStatus !== 'joined') {
                        return total;
                    }
                    const value = parseFloat(item.revenue || 0) || 0;
                    return total + value;
                }, 0);
                setTotalRevenue(pageTotalRevenue);
            }

            // Normalize API response for paginated or non-paginated shapes
            const dataArray = Array.isArray(apiResponse)
                ? apiResponse
                : apiResponse?.results || apiResponse?.data || [];

            if (!Array.isArray(dataArray)) {
                console.error('Unexpected revenue API response shape:', apiResponse);
                throw new Error('Invalid revenue data format');
            }

            // Transform API data to match component structure
            const transformedData = dataArray.map(item => {
                // Get the latest client job or use first one if available
                const clientJob = item.client_jobs?.[0] || {};
                const clientName = item.client_name || clientJob.client_name || 'N/A';
                // Check both item.profile_status (from API) and clientJob.profilestatus (from related model)
                const profileStatus = item.profile_status || clientJob.profilestatus || '—';
                const currentExecutive = clientJob.current_executive_name || 'N/A';

                // If profile status is Abscond, show '-' for revenue status
                const revenueStatus = item.revenue_status || 'Pending';

                return {
                    id: item.id,
                    candidateName: item.candidate_name || item.candidate?.candidate_name || 'N/A',
                    displayExecutiveName: item.display_executive_name || item.executive_name || currentExecutive || 'N/A',
                    client: clientName,
                    location: item.location || item.candidate_city || item.candidate?.city || 'N/A',
                    profileStatus: profileStatus,
                    // Format revenue with Indian number format and currency symbol
                    revenue: `₹${(Number(item.revenue) || 0).toLocaleString('en-IN')}`,
                    revenueStatus: revenueStatus,
                    joiningDate: item.joining_date || new Date().toISOString().split('T')[0],
                    itbrDate: item.itbr_date || new Date().toISOString().split('T')[0],
                    erdDate: item.erd_date || new Date().toISOString().split('T')[0],
                    auditDate: item.updated_at || item.created_at || null,
                    status: 'Active', // Default status
                    // Additional fields from the response
                    candidate_city: item.candidate_city || item.candidate?.city || 'N/A',
                    // Store original API data for updates
                    originalData: item,
                    // Store client job data
                    clientJob: clientJob
                };
            });

            console.log('Revenue data loaded:', transformedData);
            setSources(transformedData);
        } catch (err) {
            console.error('Error loading revenue data:', err);
            setError('Failed to load revenue data');
            showToast('Failed to load revenue data', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Listen for revenue updates from edit windows and refresh data smoothly
    useEffect(() => {
        const handleMessage = (event) => {
            if (event.origin !== window.location.origin) return;
            const data = event.data;
            if (data && data.type === 'REVENUE_UPDATED') {
                loadRevenueData();
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [appliedFilters, currentPage, entriesPerPage]);

    const showToast = (message, type = 'success') => {
        toast[type](message);
    };

    // Filter handlers
    const handleInputChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleHeaderFilterClick = (value) => {
        setHeaderFilter(prev => (prev === value ? null : value));
    };

    const handleBranchChange = (value) => {
        // Update the branch name in filters for API calls
        setFilters(prev => ({
            ...prev,
            selectedBranch: value,
            selectedBranchId: null, // No longer needed as we're using name
            selectedTeam: '',
            selectedTeamId: null,
            selectedEmployee: ''
        }));
    };

    const handleTeamChange = (value) => {
        const t = (dropdownOptions.teams || []).find(tm => {
            const tname = (tm.name || tm.label || tm.value || '').toString().trim().toLowerCase();
            return tname === String(value || '').trim().toLowerCase();
        });
        const teamId = t?.id ?? null;
        setFilters(prev => ({
            ...prev,
            selectedTeam: value,
            selectedTeamId: teamId,
            selectedEmployee: ''
        }));
    };

    const handleStateChange = (value) => {
        setFilters(prev => ({
            ...prev,
            state: value,
            city: '' // Clear city when state changes
        }));
        const cities = getCitiesByState(value);
        setDropdownOptions(prev => ({ ...prev, cities }));
    };

    const handleCityChange = (value) => {
        setFilters(prev => ({
            ...prev,
            city: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmed = newSource.trim();
        if (!trimmed) return;

        const isDuplicate = sources.some(
            (item) => item.candidateName.toLowerCase() === trimmed.toLowerCase()
        );
        if (isDuplicate) {
            showToast('A candidate with the same name already exists!', 'error');
            return;
        }

        const newEntry = {
            id: Math.max(...sources.map(s => s.id), 0) + 1,
            candidateName: trimmed,
            displayExecutiveName: "New Employee",
            client: "New Client",
            location: "New Location",
            revenue: "₹0",
            revenueStatus: "Pending",
            joiningDate: new Date().toISOString().split('T')[0],
            itbrDate: new Date().toISOString().split('T')[0],
            erdDate: new Date().toISOString().split('T')[0],
            status: newSourceStatus,
        };

        setSources([newEntry, ...sources]);
        setNewSource('');
        setNewSourceStatus('Active');
        setShowAddModal(false);
        showToast(`${newEntry.candidateName} added successfully!`);
    };

    const handleDelete = (id) => {
        setSourceToDelete(id);
        setShowDeleteModal(true);
    };

    const handleGenerateInvoice = (candidate) => {
        // Open invoice form in new tab
        const invoiceUrl = `/invoice?candidateData=${encodeURIComponent(JSON.stringify(candidate))}`;
        window.open(invoiceUrl, '_blank');
    };

    const navigate = useNavigate();

    const handleEditRevenue = (candidate) => {
        const candidateId = candidate.originalData?.candidate || candidate.id;
        window.open(`/edit-revenue/${candidateId}`, '_blank');
    };

    // Toggle filters visibility
    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };

    // Generate filter options
    const branchOptions = (dropdownOptions.branches || []).map(branch => ({
        id: branch.id,
        value: branch.value || branch.label || branch.name,
        label: branch.label || branch.name || branch.value
    }));

    const teamOptions = (dropdownOptions.teams || []).map(team => ({
        id: team.id,
        value: team.value || team.label || team.name,
        label: team.label || team.name || team.value
    }));

    // Employee options come from the executives list loaded via fetchExecutiveOptions
    // When a branch is selected, only show employees belonging to that branch.
    const employeeOptions = (dropdownOptions.executives || [])
        .filter(emp => {
            const selectedBranch = (filters.selectedBranch || '').toString().trim().toLowerCase();
            if (!selectedBranch) {
                // No branch filter: show all employees
                return true;
            }

            const empBranch = (emp.branch || '').toString().trim().toLowerCase();

            if (!empBranch) {
                // Employee has no branch: only show when no specific branch is selected
                return false;
            }

            return empBranch === selectedBranch;
        })
        .map(emp => ({
            id: emp.code || emp.id || emp.value,
            value: emp.value || emp.code || emp.id,
            label: emp.label || emp.value || emp.code || emp.id
        }));

    // Client options are now managed in loadDropdownOptions

    // State and city options are now managed by useLocationDropdowns hook

    const handleCloseEditModal = (shouldRefresh = false) => {
        setShowEditModal(false);
        setSelectedCandidate(null);
        // Only refresh data if explicitly told to (e.g., after successful update)
        if (shouldRefresh) {
            loadRevenueData();
        }
    };

    const confirmDelete = async () => {
        if (!sourceToDelete) return;

        try {
            await revenueService.deleteRevenue(sourceToDelete);
            setSources((prevSources) => prevSources.filter((item) => item.id !== sourceToDelete));
            showToast('Entry deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting revenue:', error);
            showToast('Failed to delete entry', 'error');
        } finally {
            setShowDeleteModal(false);
            setSourceToDelete(null);
        }
    };

    const handleDoubleClick = (id, currentName) => {
        setEditConfirmationModal({
            show: true,
            id,
            currentName,
        });
    };

    const startEditing = () => {
        setEditingId(editConfirmationModal.id);
        setEditValue(editConfirmationModal.currentName);
        setEditConfirmationModal({
            show: false,
            id: null,
            currentName: '',
        });
    };

    const handleSaveEdit = (id) => {
        const updatedName = editValue.trim();
        if (!updatedName) return;

        const isDuplicate = sources.some(
            (item) =>
                item.id !== id && item.displayExecutiveName.toLowerCase() === updatedName.toLowerCase()
        );
        if (isDuplicate) {
            showToast('Another employee with the same name already exists!', 'error');
            return;
        }

        setSources(
            sources.map((item) =>
                item.id === id
                    ? { ...item, displayExecutiveName: updatedName }
                    : item
            )
        );
        showToast(`${updatedName} updated successfully!`);
        setEditingId(null);
        setEditValue('');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditValue('');
    };

    const showStatusChangeConfirmation = (id) => {
        const source = sources.find((item) => item.id === id);
        setStatusChangeModal({
            show: true,
            id,
            newStatus: source.status === 'Active' ? 'Deactive' : 'Active',
            sourceName: source.candidateName,
        });
    };

    const confirmStatusChange = () => {
        const { id, newStatus } = statusChangeModal;
        const source = sources.find((item) => item.id === id);
        if (!source) return;

        setSources(
            sources.map((item) =>
                item.id === id
                    ? { ...item, status: newStatus }
                    : item
            )
        );

        setStatusChangeModal({ show: false, id: null, newStatus: '', sourceName: '' });
        showToast(`${source.candidateName} status changed to ${newStatus}`, 'success');
    };

    const formatDateForInput = (date) => {
        if (!date) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const filteredSources = sources.filter((item) => {
        return item.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.displayExecutiveName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.location?.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Format total revenue with Indian number format
    const formatRevenue = (amount) => {
        return `₹${amount.toLocaleString('en-IN')}`;
    };

    // Total pages come from backend totalCount and current page size
    const totalPages = totalCount > 0 ? Math.ceil(totalCount / entriesPerPage) : 1;
    // Backend already paginates; apply only client-side search on current page
    let paginatedSources = filteredSources;

    if (headerFilter === 'Claimed' || headerFilter === 'Pending' || headerFilter === 'Processing') {
        paginatedSources = paginatedSources.filter((item) => {
            const normalizedRevenueStatus = item.revenueStatus === 'Process' ? 'Processing' : item.revenueStatus;
            return normalizedRevenueStatus === headerFilter;
        });
    } else if (headerFilter === 'Joined' || headerFilter === 'Abscond') {
        paginatedSources = paginatedSources.filter((item) => item.profileStatus === headerFilter);
    }

    // Shared pagination summary values for current page
    const startIndex =
        totalCount === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1;
    const endIndex =
        totalCount === 0 ? 0 : (currentPage - 1) * entriesPerPage + paginatedSources.length;

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // Show loading state (matching DataBank-style loader)
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">
                        Loading ITBR data...
                    </p>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">Error Loading Data</h3>
                    <p className="text-gray-500 mb-6">{error}</p>
                    <button
                        onClick={loadRevenueData}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="text-black">
            <div className="bg-white p-[15px] rounded-[10px] shadow-sm flex justify-between mb-4">
                <h1 className="text-lg font-bold">ITBR Management</h1>
                <div>
                    <span className='text-xs sm:text-sm font-medium'>
                        Total Revenue: <span className="text-blue-600 font-bold">{formatRevenue(totalRevenue)}</span>
                    </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                    <span
                        className={`text-xs sm:text-sm font-medium cursor-pointer ${headerFilter === 'Claimed' ? 'font-bold underline' : ''}`}
                        onClick={() => handleHeaderFilterClick('Claimed')}
                    >
                        Claimed: <span className="text-green-600">{claimedCount}</span>
                    </span>
                    <span
                        className={`text-xs sm:text-sm font-medium cursor-pointer ${headerFilter === 'Processing' ? 'font-bold underline' : ''}`}
                        onClick={() => handleHeaderFilterClick('Processing')}
                    >
                        Processing : <span className="text-orange-600">{processCount}</span>
                    </span>
                    <span
                        className={`text-xs sm:text-sm font-medium cursor-pointer ${headerFilter === 'Pending' ? 'font-bold underline' : ''}`}
                        onClick={() => handleHeaderFilterClick('Pending')}
                    >
                        Pending: <span className="text-red-600">{pendingCount}</span>
                    </span>
                    <span
                        className={`text-xs sm:text-sm font-medium cursor-pointer ${headerFilter === 'Joined' ? 'font-bold underline' : ''}`}
                        onClick={() => handleHeaderFilterClick('Joined')}
                    >
                        Joined: <span className="text-green-600">{joinedCount}</span>
                    </span>
                    <span
                        className={`text-xs sm:text-sm font-medium cursor-pointer ${headerFilter === 'Abscond' ? 'font-bold underline' : ''}`}
                        onClick={() => handleHeaderFilterClick('Abscond')}
                    >
                        Abscond: <span className="text-red-600">{abscondCount}</span>
                    </span>
                </div>
            </div>

            <ToastContainer
                position="top-center"
                autoClose={2000}
                hideProgressBar={false}
                closeOnClick
                pauseOnHover
                draggable
                toastClassName="text-sm px-2 w-[300px] sm:w-[350px]"
            />
            <div className="bg-white mt-2 px-3 py-2 mb-2">
                <div
                    className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-10 gap-4  transition-all duration-300 ease-in-out 
            ${showFilters ? "block" : "hidden sm:grid"}`}
                >
                    {/* From Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                        <div className="relative">
                            <input
                                type="date"
                                value={fromDate ? formatDateForInput(fromDate) : ''}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    // Update local date state used for client-side filtering
                                    setFromDate(value ? new Date(value) : null);
                                    // Update filter state so Apply button sends correct dates
                                    setFilters(prev => ({
                                        ...prev,
                                        fromDate: value || ''
                                    }));
                                    setCurrentPage(1);
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* To Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                        <div className="relative">
                            <input
                                type="date"
                                value={toDate ? formatDateForInput(toDate) : ''}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    // Update local date state used for client-side filtering
                                    setToDate(value ? new Date(value) : null);
                                    // Update filter state so Apply button sends correct dates
                                    setFilters(prev => ({
                                        ...prev,
                                        toDate: value || ''
                                    }));
                                    setCurrentPage(1);
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"

                            />
                        </div>
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

                    {/* Employee */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
                        <select
                            value={filters.selectedEmployee || ''}
                            onChange={(e) => handleInputChange('selectedEmployee', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            disabled={loadingDropdowns.executives}
                        >
                            <option value="">
                                {loadingDropdowns.executives ? 'Loading employees...' : 'All Employees'}
                            </option>
                            {employeeOptions.map(emp => (
                                <option key={emp.id} value={emp.value}>{emp.label}</option>
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
                            disabled={loadingDropdowns.clients}
                        >
                            <option value="">
                                {loadingDropdowns.clients ? 'Loading clients...' : 'All Clients'}
                            </option>
                            {dropdownOptions.clients.map(client => (
                                <option key={client.id} value={client.value}>
                                    {client.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* State */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            State
                            {locationLoading && (
                                <Loader2 className="w-3 h-3 ml-1 inline-block animate-spin" />
                            )}
                        </label>
                        <select
                            value={filters.state}
                            onChange={(e) => handleStateChange(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            disabled={locationLoading}
                        >
                            <option value="">All States</option>
                            {stateOptions.map(state => (
                                <option key={state.id || state.value} value={state.value}>
                                    {state.label}
                                </option>
                            ))}
                        </select>
                        {locationError && (
                            <p className="mt-1 text-xs text-red-500">Error loading states</p>
                        )}
                    </div>

                    {/* City */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            City
                            {locationLoading && filters.state && (
                                <Loader2 className="w-3 h-3 ml-1 inline-block animate-spin" />
                            )}
                        </label>
                        <select
                            value={filters.city}
                            onChange={(e) => handleCityChange(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            disabled={!filters.state || locationLoading}
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
                        {locationError && (
                            <p className="mt-1 text-xs text-red-500">Error loading cities</p>
                        )}
                    </div>

                    {/* Apply Filters Button */}
                    <div className="flex items-end">
                        <button
                            onClick={() => {
                                setAppliedFilters({
                                    ...filters,
                                    // If user cleared the dates, do not fall back to today's date.
                                    // Leave them empty so backend receives no from_date/to_date params
                                    fromDate: filters.fromDate || '',
                                    toDate: filters.toDate || ''
                                });
                                setBranchEventsCurrentPage(1); // Legacy pagination state
                                setCurrentPage(1); // Reset backend page to first page
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
                                // Reset to full current month range (same as initial UI dates)
                                const today = new Date();
                                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                                const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

                                const resetFilters = {
                                    fromDate: formatDateForInput(startOfMonth),
                                    toDate: formatDateForInput(endOfMonth),
                                    state: '',
                                    city: '',
                                    selectedPlan: planId || '',
                                    selectedBranch: '',
                                    selectedTeam: '',
                                    selectedTeamId: null,
                                    selectedEmployee: '',
                                    selectedClient: ''
                                };

                                // Reset both filter state (used for API) and local date state (used for UI & client-side filtering)
                                setFilters(resetFilters);
                                setAppliedFilters(resetFilters);
                                setFromDate(startOfMonth);
                                setToDate(endOfMonth);
                                setBranchEventsCurrentPage(1);
                                setCurrentPage(1); // Reset backend page
                            }}
                            className="w-full px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-xs"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            <div
                className="bg-white rounded shadow px-2 py-2 flex flex-col"
                style={paginatedSources.length > 5 ? { height: 'calc(100vh - 200px)' } : {}}
            >
                <div className="flex flex-col sm:flex-row justify-between mb-2 items-start sm:items-center px-2 gap-2">
                    {/* Left: page size selector */}
                    <div className="text-gray-600 text-xs">
                        Show{' '}
                        <select
                            value={entriesPerPage}
                            onChange={(e) => {
                                setEntriesPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="mx-2 border border-gray-300 rounded focus:outline-0 px-2 py-1"
                        >
                            {[10, 25, 50, 100].map((num) => (
                                <option key={num} value={num}>
                                    {num}
                                </option>
                            ))}
                        </select>{' '}
                        entries
                    </div>

                    {/* Center: pagination summary */}
                    {totalCount > 0 && (
                        <div className="text-xs text-gray-500 text-center flex-1">
                            <p>
                                Showing{' '}
                                <span className="font-medium">{startIndex}</span>{' '}
                                to{' '}
                                <span className="font-medium text-gray-700">{endIndex}</span>{' '}
                                of{' '}
                                <span className="font-medium">{totalCount}</span>{' '}
                                results
                            </p>
                        </div>
                    )}

                    {/* Right: search box (and potential extra controls) */}
                    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full sm:w-auto">
                        {/* <div className="flex gap-2 items-center">
                            <label className="text-xs text-gray-600 font-medium">From:</label>
                            <div className="relative w-full">
                                <input
                                    type="date"
                                    value={fromDate ? formatDateForInput(fromDate) : ''}
                                    onChange={(e) => {
                                        setFromDate(e.target.value ? new Date(e.target.value) : null);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs text-black focus:outline-0 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 items-center">
                            <label className="text-xs text-gray-600 font-medium">To:</label>
                            <div className="relative w-full">
                                <input
                                    type="date"
                                    value={toDate ? formatDateForInput(toDate) : ''}
                                    onChange={(e) => {
                                        setToDate(e.target.value ? new Date(e.target.value) : null);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs text-black focus:outline-0 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                                />
                            </div>
                        </div> */}

                        <input
                            type="text"
                            placeholder="Search entries..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="border border-gray-300 rounded px-2 sm:px-3 py-1 text-xs sm:text-sm text-black placeholder:text-gray-500 focus:outline-0 w-full sm:w-auto"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto flex-1">
                    <div className="min-w-full h-full overflow-y-auto scrollbar-desktop">
                        <table className="w-full text-sm sm:text-sm text-left border border-gray-200">
                            <thead className="bg-white text-xs uppercase text-black border-b border-gray-200 sticky top-0">
                                <tr>
                                    <th className="px-2 py-2 text-start w-[3%]">S.No</th>
                                    <th className="px-2 py-2 text-start w-[15%]">Candidate Name</th>
                                    <th className="px-2 py-2 text-start w-[15%]">Employee Name</th>
                                    <th className="px-2 py-2 text-center w-[15%]">Client Name</th>
                                    <th className="px-2 py-2 text-center w-[15%]">Location</th>
                                    <th className="px-2 py-2 text-center w-[9%]">Profile Status</th>
                                    <th className="px-2 py-2 text-center w-[9%]">Revenue</th>
                                    <th className="px-2 py-2 text-center w-[9%]">Revenue Status</th>
                                    <th className="px-2 py-2 text-center w-[9%]">Joining Date</th>
                                    <th className="px-2 py-2 text-center w-[9%]">ITBR Date</th>
                                    <th className="px-2 py-2 text-center w-[9%]">ERD Date</th>
                                    <th className="px-2 py-2 text-center w-[10%]">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedSources.length === 0 ? (
                                    <tr>
                                        <td colSpan="11" className="text-center py-4 text-gray-500">
                                            <p className="text-md font-medium">
                                                No entries found
                                            </p>
                                            <p className="text-xs">
                                                Try adjusting your search or filter criteria.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedSources.map((item, index) => (
                                        <tr
                                            key={item.id}
                                            className="text-black border-b border-gray-200 hover:bg-gray-50"
                                        >
                                            <td className="px-2 py-1.5">
                                                {(currentPage - 1) * entriesPerPage + index + 1}
                                            </td>
                                            <td className="px-2 py-1.5 text-xs">
                                                {item.candidateName}
                                            </td>
                                            <td className="px-2 py-1.5 text-xs">
                                                {item.displayExecutiveName || 'N/A'}
                                            </td>
                                            <td className="px-4 py-2 text-center text-xs">
                                                {item.client}
                                            </td>
                                            <td className="px-2 py-1.5 text-center text-xs">
                                                {item.location || 'N/A'}
                                            </td>
                                            <td className="px-2 py-1.5 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.profileStatus === 'Joined'
                                                    ? 'bg-green-100 text-green-800'
                                                    : item.profileStatus === 'Abscond'
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {item.profileStatus}
                                                </span>
                                            </td>
                                            <td className="px-2 py-1.5 text-center text-xs font-medium">
                                                {item.revenue}
                                            </td>
                                            <td className="px-2 py-1.5 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.revenueStatus === 'Claimed'
                                                    ? 'bg-green-100 text-green-800'
                                                    : item.revenueStatus === 'Pending'
                                                        ? 'bg-red-100 text-red-800'
                                                        : (item.revenueStatus === 'Processing' || item.revenueStatus === 'Process')
                                                            ? 'bg-orange-100 text-orange-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {item.revenueStatus === 'Process' ? 'Processing' : item.revenueStatus}
                                                </span>
                                            </td>
                                            <td className="px-2 sm:px-4 py-1.5 text-center text-xs">
                                                {formatDate(item.joiningDate)}
                                            </td>
                                            <td className="px-2 sm:px-4 py-1.5 text-center text-xs">
                                                {formatDate(item.itbrDate)}
                                            </td>
                                            <td className="px-2 sm:px-4 py-1.5 text-center text-xs">
                                                {formatDate(item.erdDate)}
                                            </td>
                                            <td className="px-2 sm:px-4 py-1.5 text-end">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={() => handleEditRevenue(item)}
                                                        className="p-1 rounded-full transition-all duration-300 hover:bg-green-100/50 hover:scale-110 group"
                                                        title="Edit Revenue"
                                                    >
                                                        <Edit className="w-4 h-4 text-green-600 transition-all duration-300 group-hover:text-green-700 group-hover:scale-110" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-1 rounded-full transition-all duration-300 hover:bg-red-100/50 hover:scale-110 group"
                                                        title="Delete Revenue"
                                                    >
                                                        <Trash className="w-4 h-4 text-red-600 transition-all duration-300 group-hover:text-red-700 group-hover:scale-110" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleSendInvoice(item.id)}
                                                        className="p-1 rounded-full transition-all duration-300 hover:bg-blue-100/50 hover:scale-110 group"
                                                        title="Send Email"
                                                    >
                                                        <MailCheck className="w-4 h-4 text-blue-600 transition-all duration-300 group-hover:text-blue-700 group-hover:scale-110" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleGenerateInvoice(item)}
                                                        className="p-1 rounded-full transition-all duration-300 hover:bg-blue-100/50 hover:scale-110 group"
                                                        title="Generate Invoice"
                                                    >
                                                        <FileText className="w-4 h-4 text-blue-600 transition-all duration-300 group-hover:text-blue-700 group-hover:scale-110" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {totalCount > 0 && (
                    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-2 py-2 sm:px-4 sm:py-3">
                        <div className="flex flex-1 justify-between sm:hidden">
                            <button
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <div className="text-xs text-gray-500 mx-2 my-auto">
                                Page {currentPage} of {totalPages}
                            </div>
                            <button
                                onClick={() =>
                                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                                }
                                disabled={currentPage === totalPages}
                                className="relative inline-flex items-center rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>

                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs text-gray-500">
                                    Showing{' '}
                                    <span className="font-medium">{startIndex}</span>{' '}
                                    to{' '}
                                    <span className="font-medium text-gray-700">{endIndex}</span>{' '}
                                    of{' '}
                                    <span className="font-medium">{totalCount}</span>{' '}
                                    results
                                </p>
                            </div>
                            <div>
                                <nav className="isolate inline-flex -space-x-px rounded-md shadow-xs">
                                    <button
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center rounded-l-md px-1.5 py-1.5 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                    >
                                        <span className="sr-only">First</span>
                                        <ChevronLeft className="size-3 sm:size-4" />
                                        <ChevronLeft className="size-3 sm:size-4 -ml-1 sm:-ml-2" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center px-1.5  text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                    >
                                        <span className="sr-only">Previous</span>
                                        <ChevronLeft className="size-3 sm:size-4" />
                                    </button>

                                    {(() => {
                                        const pages = [];
                                        const siblings = 1;

                                        const showLeftEllipsis = currentPage > siblings + 2;
                                        const showRightEllipsis =
                                            currentPage < totalPages - (siblings + 1);

                                        const startPage = Math.max(2, currentPage - siblings);
                                        const endPage = Math.min(
                                            totalPages - 1,
                                            currentPage + siblings
                                        );

                                        pages.push(
                                            <button
                                                key={1}
                                                onClick={() => setCurrentPage(1)}
                                                className={`relative inline-flex items-center px-2.5  text-xs sm:text-sm font-semibold ${currentPage === 1
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
                                                    className="relative inline-flex items-center px-2.5  text-xs sm:text-sm font-semibold text-gray-700 ring-1 ring-gray-300 ring-inset"
                                                >
                                                    ...
                                                </span>
                                            );
                                        }

                                        for (let i = startPage; i <= endPage; i++) {
                                            pages.push(
                                                <button
                                                    key={i}
                                                    onClick={() => setCurrentPage(i)}
                                                    className={`relative inline-flex items-center px-2.5  text-xs sm:text-sm font-semibold ${i === currentPage
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
                                                    className="relative inline-flex items-center px-2.5  text-xs sm:text-sm font-semibold text-gray-700 ring-1 ring-gray-300 ring-inset"
                                                >
                                                    ...
                                                </span>
                                            );
                                        }

                                        if (totalPages > 1) {
                                            pages.push(
                                                <button
                                                    key={totalPages}
                                                    onClick={() => setCurrentPage(totalPages)}
                                                    className={`relative inline-flex items-center px-2.5  text-xs sm:text-sm font-semibold ${currentPage === totalPages
                                                        ? 'z-10 bg-blue-600 text-white focus-visible:outline-blue-600'
                                                        : 'text-gray-900 ring-1 ring-gray-300 ring-inset hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {totalPages}
                                                </button>
                                            );
                                        }

                                        return pages;
                                    })()}

                                    <button
                                        onClick={() =>
                                            setCurrentPage(Math.min(totalPages, currentPage + 1))
                                        }
                                        disabled={currentPage === totalPages}
                                        className="relative inline-flex items-center px-1.5  text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                    >
                                        <span className="sr-only">Next</span>
                                        <ChevronRight className="size-3 sm:size-4" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage === totalPages}
                                        className="relative inline-flex items-center rounded-r-md px-1.5  text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                    >
                                        <span className="sr-only">Last</span>
                                        <ChevronRight className="size-3 sm:size-4" />
                                        <ChevronRight className="size-3 sm:size-4 -ml-1 sm:-ml-2" />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showDeleteModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 sm:p-4">
                    <div className="bg-white text-black rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-md mx-auto">
                        <h2 className="text-lg font-bold mb-4">Confirm Delete</h2>
                        <p className="mb-6 text-sm sm:text-base">
                            Are you sure you want to delete{' '}
                            <span className="font-bold ms-1">
                                {sources.find((item) => item.id === sourceToDelete)?.candidateName ||
                                    'this Revenue'}
                            </span>
                            ?
                        </p>
                        <div className="flex justify-end gap-2 sm:gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setSourceToDelete(null);
                                }}
                                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded bg-gray-300 hover:bg-gray-400 text-sm sm:text-base"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDelete}
                                className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded bg-red-600 text-white hover:bg-red-700 text-sm sm:text-base"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Revenue Modal - Removed in favor of full page */}

        </div>
    );
}

export default ItbrView;