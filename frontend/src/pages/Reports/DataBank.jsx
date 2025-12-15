/**
 * DataBank Component - HR CRM Reports Module
 * 
 * A comprehensive data analysis component for recruitment reports with:
 * - Advanced filtering (date, client, executive, state)
 * - Smart loading strategies based on dataset size
 * - Progressive loading for large datasets
 * - Detailed candidate view with pagination
 * - Mobile-responsive design with bottom sheet filters
 * - Performance monitoring and optimization
 * - Real-time data processing and transformation
 * 
 * @author HR CRM Team
 * @version 2.0.0
 * @since 2025
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { User } from 'lucide-react';
import {
    Database,
    Filter,
    Search,
    Calendar,
    Users,
    MapPin,
    Eye,
    X,
    ArrowLeft,
    UserCheck,
    AlertCircle,
    Phone,
    Mail,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { candidates, clientJobs as clientJobsAPI } from '../../api/api';
import { vendorAPI } from '../../api/vendorService';
import { apiRequest } from '../../api/apiConfig';
import CandidateDetailsModal from '../NewDtr/components/ViewModal';
import FeedbackModal from '../NewDtr/components/FeedbackModal';
import { useAppContext, useAppActions } from '../../context/AppContext';
import toast from 'react-hot-toast';
import { useLocationDropdowns } from '../../hooks/useLocationDropdowns';

// Constants
const ITEMS_PER_PAGE = 10;
const SUMMARY_ITEMS_PER_PAGE = 10;
const MODAL_CLOSE_DELAY = 300;

// No need for complex memoization - keep it simple like PlanEventsReport

const DataBank = () => {
    // Get URL parameters
    const { remark, fromDate, toDate } = useParams();
    const location = useLocation();
    const isDetailedView = location.pathname.includes('/details/');

    // Get current date in YYYY-MM-DD format
    const getCurrentDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    const { state } = useAppContext();
    const actions = useAppActions();

    // Use location dropdowns hook (same as FormStep1)
    const {
        locationData,
        loading: locationLoading,
        error: locationError,
        getCitiesByState,
        getStatesByCountry
    } = useLocationDropdowns();

    // Helper function to display values (like SearchView)
    const displayValue = (value) => {
        return value && value.trim() !== '' ? value : '-';
    };

    // Helper function to format CTC (like SearchView)
    const formatCTC = (ctc) => {
        if (!ctc || ctc === 0 || ctc === '0' || ctc === '0.00') return '-';
        // Handle both string and number values
        const numericCTC = typeof ctc === 'string' ? parseFloat(ctc) : ctc;
        if (isNaN(numericCTC) || numericCTC === 0) return '-';
        return `₹${numericCTC.toLocaleString('en-IN')}`;
    };

    // Phone helpers (aligned with CandidateTable)
    const maskPhoneNumber = (number) => {
        if (!number) return number;
        const s = String(number).replace(/\D/g, '');
        if (s.length < 6) return number;
        return s.replace(/(\d{2})\d+(\d{2})$/, (m, a, b) => `${a}${'x'.repeat(s.length - 4)}${b}`);
    };

    const hasValidOldJoiningDate = (mobileNumber, globalJoiningDates) => {
        const dates = globalJoiningDates && globalJoiningDates.get(mobileNumber);
        if (!mobileNumber || !dates || dates.length === 0) return false;
        try {
            const today = new Date();
            return dates.some(d => {
                if (!d || d === '0000-00-00') return false;
                const jd = new Date(d);
                const diff = Math.floor((today - jd) / (1000 * 60 * 60 * 24));
                return diff >= 100;
            });
        } catch {
            return false;
        }
    };

    const shouldMaskMobile = (candidaterevenue) => {
        try {
            const joiningDate = candidaterevenue?.[0]?.joining_date;
            if (!joiningDate || joiningDate === '0000-00-00') return false;
            const today = new Date();
            const joinDate = new Date(joiningDate);
            const daysDiff = Math.floor((today - joinDate) / (1000 * 60 * 60 * 24));
            return daysDiff < 100;
        } catch {
            return false;
        }
    };

    const isMobileNumberTaken = (mobileNumber, joinedMobiles) => {
        if (!mobileNumber || !joinedMobiles) return false;
        return joinedMobiles.has(mobileNumber);
    };

    const getDisplayMobileNumber = (phoneNumber, joinedMobiles, candidaterevenue, globalJoiningDates) => {
        if (!phoneNumber) return phoneNumber;
        const byDate = shouldMaskMobile(candidaterevenue);
        const hasOld = hasValidOldJoiningDate(phoneNumber, globalJoiningDates);
        const taken = isMobileNumberTaken(phoneNumber, joinedMobiles);
        let shouldMask;
        if (hasOld) {
            shouldMask = false;
        } else if (byDate) {
            shouldMask = true;
        } else if (taken) {
            shouldMask = true;
        } else {
            shouldMask = false;
        }
        if (shouldMask) return maskPhoneNumber(phoneNumber);
        return phoneNumber;
    };

    const getJoinedOrSelectedMobileNumbers = (results) => {
        const set = new Set();
        if (!Array.isArray(results)) return set;
        results.forEach(c => {
            const m1 = c.contactNumber1 || c.originalCandidate?.mobile1 || c.originalCandidate?.phone1 || c.phone || c.mobile1;
            const m2 = c.contactNumber2 || c.originalCandidate?.mobile2 || c.originalCandidate?.phone2 || c.phone2 || c.mobile2;
            const statusRaw = c.selectedClientJob?.profilestatus || c.selectedClientJob?.remarks || c.remarks || c.status || '';
            const status = String(statusRaw).toLowerCase();
            // Only Joined is special here
            if (status === 'joined') {
                if (m1 && typeof m1 === 'string' && m1.trim() && m1 !== '-' && m1.toLowerCase() !== 'null' && m1.toLowerCase() !== 'nil') set.add(m1);
                if (m2 && typeof m2 === 'string' && m2.trim() && m2 !== '-' && m2.toLowerCase() !== 'null' && m2.toLowerCase() !== 'nil') set.add(m2);
            }
        });
        return set;
    };

    const getGlobalJoiningDates = (results) => {
        const map = new Map();
        if (!Array.isArray(results)) return map;
        results.forEach(c => {
            const join = c?.candidaterevenue?.[0]?.joining_date || c?.backendData?.candidaterevenue?.[0]?.joining_date || c?.originalCandidate?.candidaterevenue?.[0]?.joining_date;
            const push = (num) => {
                if (!num) return;
                if (!map.has(num)) map.set(num, []);
                if (join && join !== '0000-00-00') map.get(num).push(join);
            };
            push(c.contactNumber1 || c.originalCandidate?.mobile1 || c.originalCandidate?.phone1 || c.phone || c.mobile1);
            push(c.contactNumber2 || c.originalCandidate?.mobile2 || c.originalCandidate?.phone2 || c.phone2 || c.mobile2);
        });
        return map;
    };

    const getPhoneHoverTitle = (phoneNumber, candidate, isMasked, joinedMobiles, globalJoiningDates, allResults) => {
        if (!phoneNumber) return 'No phone number available';
        let hoverTitle = 'Phone number';
        let profileStatus = candidate?.selectedClientJob?.profilestatus || candidate?.selectedClientJob?.remarks || candidate?.remarks || candidate?.status;
        const candidaterevenue = candidate?.candidaterevenue || candidate?.backendData?.candidaterevenue || candidate?.originalCandidate?.candidaterevenue;
        const joiningDate = candidaterevenue?.[0]?.joining_date;
        const displayName = candidate?.candidateName || candidate?.candidate_name || candidate?.name || 'Candidate';
        const clientName = candidate?.clientJob?.clientName || candidate?.selectedClientJob?.clientName || candidate?.client_name || candidate?.clientName || 'Unknown Client';
        const taken = isMobileNumberTaken(phoneNumber, joinedMobiles);
        const safe = Array.isArray(allResults) ? allResults : [];
        const hasAbscondGlobally = safe.some(c => (c.contactNumber1 === phoneNumber || c.contactNumber2 === phoneNumber || c.originalCandidate?.mobile1 === phoneNumber || c.originalCandidate?.mobile2 === phoneNumber) && (c.selectedClientJob?.profilestatus === 'Abscond' || String(c.selectedClientJob?.remarks).toLowerCase() === 'abscond' || String(c.remarks).toLowerCase() === 'abscond'));
        const isAbscond = String(profileStatus || '').toLowerCase() === 'abscond';
        if (isMasked || isAbscond || taken || hasAbscondGlobally) {
            if (String(profileStatus || '') === 'Joined' && joiningDate && joiningDate !== '0000-00-00') {
                const d = new Date(joiningDate).toLocaleDateString('en-IN');
                hoverTitle = isMasked ? `${displayName} joined on ${d} in ${clientName}, Don't contact them` : `${displayName} joined on ${d} in ${clientName}`;
            } else if (String(profileStatus || '') === 'Abscond' && joiningDate && joiningDate !== '0000-00-00') {
                const d = new Date(joiningDate).toLocaleDateString('en-IN');
                hoverTitle = `${displayName} joined on ${d} in ${clientName} but absconded`;
            } else if (taken || hasAbscondGlobally) {
                const joinedCandidate = safe.find(c => (c.contactNumber1 === phoneNumber || c.contactNumber2 === phoneNumber || c.originalCandidate?.mobile1 === phoneNumber || c.originalCandidate?.mobile2 === phoneNumber) && (c.selectedClientJob?.profilestatus === 'Joined' || String(c.selectedClientJob?.remarks).toLowerCase() === 'joined' || String(c.remarks).toLowerCase() === 'joined'));
                const abscondCandidate = safe.find(c => (c.contactNumber1 === phoneNumber || c.contactNumber2 === phoneNumber || c.originalCandidate?.mobile1 === phoneNumber || c.originalCandidate?.mobile2 === phoneNumber) && (c.selectedClientJob?.profilestatus === 'Abscond' || String(c.selectedClientJob?.remarks).toLowerCase() === 'abscond' || String(c.remarks).toLowerCase() === 'abscond'));
                if (joinedCandidate) {
                    const jr = joinedCandidate.candidaterevenue || joinedCandidate.backendData?.candidaterevenue || joinedCandidate.originalCandidate?.candidaterevenue;
                    const jd = jr?.[0]?.joining_date;
                    const jClient = joinedCandidate.clientJob?.clientName || joinedCandidate.selectedClientJob?.clientName || joinedCandidate.clientName || 'Unknown Client';
                    if (jd && jd !== '0000-00-00') {
                        const d = new Date(jd).toLocaleDateString('en-IN');
                        hoverTitle = `${displayName} joined on ${d} in ${jClient}, Don't contact them`;
                    } else {
                        hoverTitle = `${displayName} is joined elsewhere, Don't contact them`;
                    }
                } else if (abscondCandidate) {
                    const ar = abscondCandidate.candidaterevenue || abscondCandidate.backendData?.candidaterevenue || abscondCandidate.originalCandidate?.candidaterevenue;
                    const ad = ar?.[0]?.joining_date;
                    const aClient = abscondCandidate.clientJob?.clientName || abscondCandidate.selectedClientJob?.clientName || abscondCandidate.clientName || 'Unknown Client';
                    if (ad && ad !== '0000-00-00') {
                        const d = new Date(ad).toLocaleDateString('en-IN');
                        hoverTitle = `${displayName} joined on ${d} in ${aClient} but absconded`;
                    } else {
                        hoverTitle = `${displayName} absconded, Don't contact them`;
                    }
                } else {
                    hoverTitle = `${displayName} is joined elsewhere, Don't contact them`;
                }
            }
        }
        if (hoverTitle === 'Phone number') {
            const hasGlobalOld = hasValidOldJoiningDate(phoneNumber, globalJoiningDates);
            if (hasGlobalOld) hoverTitle = '100 days completed — full number visible';
        }
        return hoverTitle;
    };
    const { isViewModalOpen } = state;

    // Parse URL parameters for initial filters
    const getInitialFilters = () => {
        if (isDetailedView && fromDate && toDate) {
            const urlParams = new URLSearchParams(location.search);
            // Decode dates and convert 'all' placeholder back to empty string
            const decodedFromDate = decodeURIComponent(fromDate);
            const decodedToDate = decodeURIComponent(toDate);
            return {
                fromDate: decodedFromDate === 'all' ? '' : decodedFromDate,
                toDate: decodedToDate === 'all' ? '' : decodedToDate,
                client: decodeURIComponent(urlParams.get('client') || ''),
                executive: decodeURIComponent(urlParams.get('executive') || ''),
                state: decodeURIComponent(urlParams.get('state') || ''),
                city: decodeURIComponent(urlParams.get('city') || '')
            };
        }
        return {
            fromDate: getCurrentDate(),
            toDate: getCurrentDate(),
            client: '',
            executive: '',
            state: '',
            city: ''
        };
    };

    // Filter States - Initialize with URL parameters if in detailed view
    const initialFilters = getInitialFilters();

    const [filters, setFilters] = useState(initialFilters);

    const [appliedFilters, setAppliedFilters] = useState(initialFilters);


    const [detailedFilters, setDetailedFilters] = useState({
        fromDate: '',
        toDate: ''
    });

    const [hasAppliedFilters, setHasAppliedFilters] = useState(true); // Start as true to auto-load data

    // Dropdown Data States
    const [clientOptions, setClientOptions] = useState([]);
    const [executiveOptions, setExecutiveOptions] = useState([]);
    const [loadingDropdowns, setLoadingDropdowns] = useState({
        clients: false,
        executives: false
    });

    // State and city options from useLocationDropdowns hook
    const stateOptions = filters.country
        ? getStatesByCountry(filters.country)
        : locationData.states || [];

    const cityOptions = filters.state
        ? getCitiesByState(filters.state)
        : locationData.cities || [];

    // Search state for detailed view
    const [detailedSearchTerm, setDetailedSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    // Data States
    const [loading, setLoading] = useState(false);
    const [remarksData, setRemarksData] = useState([]);
    const [error, setError] = useState(null);

    // View States
    const [showDetailedView, setShowDetailedView] = useState(isDetailedView);
    const [selectedRemark, setSelectedRemark] = useState(remark ? decodeURIComponent(remark) : null);
    const [selectedRemarkData, setSelectedRemarkData] = useState([]);
    // Server-side pagination states for detailed view
    const [detailedPage, setDetailedPage] = useState(1);
    const [detailedPageSize, setDetailedPageSize] = useState(25);
    const [detailedTotalCount, setDetailedTotalCount] = useState(0);
    const [detailedHasNext, setDetailedHasNext] = useState(false);
    const [detailedHasPrev, setDetailedHasPrev] = useState(false);
    const [isDetailedLoading, setIsDetailedLoading] = useState(false);

    // WhatsApp popover state (like CandidateTable)
    const [openWhatsappFor, setOpenWhatsappFor] = useState(null);
    const [waMenuPos, setWaMenuPos] = useState({ x: 0, y: 0 });

    // Progressive Loading States
    const [hasPartialData, setHasPartialData] = useState(false);
    const [totalAvailableCount, setTotalAvailableCount] = useState(0);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);
    const [summaryCurrentPage, setSummaryCurrentPage] = useState(1);
    const [summaryItemsPerPage, setSummaryItemsPerPage] = useState(SUMMARY_ITEMS_PER_PAGE);

    // Mobile Filter States
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
    const [showMobileDetailedFilters, setShowMobileDetailedFilters] = useState(false);
    const [isMobileDetailedFiltersOpen, setIsMobileDetailedFiltersOpen] = useState(false);

    // ViewModal States (now using AppContext)
    // const [showViewModal, setShowViewModal] = useState(false);
    // const [selectedCandidate, setSelectedCandidate] = useState(null);

    // FeedbackModal States
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [selectedCandidateForFeedback, setSelectedCandidateForFeedback] = useState(null);


    const openMobileFilters = () => {
        setShowMobileFilters(true);
        requestAnimationFrame(() => setIsMobileFiltersOpen(true));
    };

    const closeMobileFilters = () => {
        setIsMobileFiltersOpen(false);
        setTimeout(() => setShowMobileFilters(false), MODAL_CLOSE_DELAY);
    };

    const openMobileDetailedFilters = () => {
        setShowMobileDetailedFilters(true);
        requestAnimationFrame(() => setIsMobileDetailedFiltersOpen(true));
    };

    const closeMobileDetailedFilters = () => {
        setIsMobileDetailedFiltersOpen(false);
        setTimeout(() => setShowMobileDetailedFilters(false), MODAL_CLOSE_DELAY);
    };



    // Fetch dropdown data on component mount
    useEffect(() => {
        const loadDropdownData = async () => {
            await Promise.all([
                fetchClientOptions(),
                fetchExecutiveOptions()
                // State and city options are now loaded by useLocationDropdowns hook
            ]);
        };

        loadDropdownData();
    }, []); // Empty dependency array - run once on mount

    // Auto-load data with current date filters immediately on component mount
    useEffect(() => {
        const autoLoadData = async () => {
            if (isDetailedView && remark && fromDate && toDate) {
                // Load detailed view data from URL parameters
                const urlParams = new URLSearchParams(location.search);
                const detailFilters = {
                    fromDate: decodeURIComponent(fromDate),
                    toDate: decodeURIComponent(toDate),
                    client: decodeURIComponent(urlParams.get('client') || ''),
                    executive: decodeURIComponent(urlParams.get('executive') || ''),
                    state: decodeURIComponent(urlParams.get('state') || ''),
                    city: decodeURIComponent(urlParams.get('city') || '')
                };

                setAppliedFilters(detailFilters);
                setFilters(detailFilters);

                // Load detailed data for the specific remark
                await loadDetailedDataForRemark(decodeURIComponent(remark), detailFilters);
            } else {
                // Normal summary view loading
                const currentDateFilters = {
                    fromDate: getCurrentDate(),
                    toDate: getCurrentDate(),
                    client: '',
                    executive: '',
                    state: '',
                    city: ''
                };

                // Set applied filters to current date
                setAppliedFilters(currentDateFilters);

                // Fetch data immediately
                await fetchData(currentDateFilters);
            }
        };

        autoLoadData();
    }, []); // Run once on mount



    /**
     * Fetch client options from vendor API
     */
    const fetchClientOptions = async () => {
        setLoadingDropdowns(prev => ({ ...prev, clients: true }));
        try {
            const response = await vendorAPI.get('/vendors/');
            const clientOptions = response.data
                .filter(vendor => {
                    // Filter for active vendors - check multiple possible field names
                    return (vendor.status === 'Active' || vendor.status === 'active' ||
                        vendor.isActive === true || vendor.isActive === 'true' ||
                        !vendor.hasOwnProperty('status')); // Include if status doesn't exist
                })
                .filter(vendor => {
                    // Check for company name in multiple possible field names
                    const companyName = vendor.companyName || vendor.vendor_name || vendor.company_name || vendor.name;
                    return companyName && companyName.trim() !== '';
                })
                .map(vendor => {
                    const companyName = vendor.companyName || vendor.vendor_name || vendor.company_name || vendor.name;
                    return {
                        value: companyName,
                        label: companyName
                    };
                })
                .sort((a, b) => a.label.localeCompare(b.label));

            setClientOptions(clientOptions);
        } catch (error) {
            toast.error('Failed to load client options');
        } finally {
            setLoadingDropdowns(prev => ({ ...prev, clients: false }));
        }
    };

    /**
     * Fetch executive options from employee service
     */
    const fetchExecutiveOptions = async () => {
        setLoadingDropdowns(prev => ({ ...prev, executives: true }));
        try {
            const response = await apiRequest('/empreg/employees/');

            // Handle different response formats (same as DailyReports)
            let allEmployees = response;
            if (response && typeof response === 'object' && !Array.isArray(response)) {
                allEmployees = response.results || response.data || response.employees || [];
            }

            if (Array.isArray(allEmployees) && allEmployees.length > 0) {
                // Debug: Check status distribution
                const statusCounts = {};
                allEmployees.forEach(emp => {
                    const status = emp.status || 'undefined';
                    statusCounts[status] = (statusCounts[status] || 0) + 1;
                });

                // Filter for active employees only
                const activeEmployees = allEmployees.filter(employee => {
                    // Filter for ONLY active employees - strict filtering
                    const isActiveByDelState = employee.del_state === 0 || employee.del_state === '0';
                    const isActiveByStatus = employee.status === 'Active' || employee.status === 'active';

                    // Explicitly exclude inactive employees
                    const isInactive = employee.status === 'Inactive' || employee.status === 'inactive';

                    // Must be explicitly active AND not inactive
                    const shouldInclude = (isActiveByDelState || isActiveByStatus) && !isInactive;

                    return shouldInclude;
                });

                const executiveOptions = activeEmployees
                    .filter(employee => employee.firstName && employee.firstName.trim() !== '') // Must have a name
                    .map((employee, index) => ({
                        value: employee.employeeCode || employee.id, // Send employee code instead of name
                        label: `${employee.firstName} (${employee.employeeCode || employee.id})`,
                        code: employee.employeeCode || employee.id,
                        uniqueKey: `${employee.firstName}-${employee.employeeCode || employee.id || index}`
                    }))
                    .sort((a, b) => a.label.localeCompare(b.label));

                setExecutiveOptions(executiveOptions);
            } else {
                setExecutiveOptions([]);
            }
        } catch (error) {
            setExecutiveOptions([]);
            toast.error('Failed to load executive options');
        } finally {
            setLoadingDropdowns(prev => ({ ...prev, executives: false }));
        }
    };

    /**
     * Handle state change - clear city when state changes
     */
    const handleStateChange = (value) => {
        handleInputChange('state', value);
        // Clear city when state changes
        if (filters.city) {
            handleInputChange('city', '');
        }
    };

    /**
     * Handle country change - clear state and city when country changes
     */
    const handleCountryChange = (value) => {
        handleInputChange('country', value);
        // Clear state and city when country changes
        if (filters.state) {
            handleInputChange('state', '');
        }
        if (filters.city) {
            handleInputChange('city', '');
        }
    };

    /**
     * Fetch remarks data from API with applied filters
     * @param {Object} filterParams - Filter parameters to apply
     */
    const fetchData = async (filterParams = {}) => {
        const fetchStartTime = performance.now();
        setLoading(true);
        setError(null);

        try {
            const apiStartTime = performance.now();

            // Use optimized endpoint with all filter parameters
            const remarksResponse = await candidates.getRemarksWithCounts({
                from_date: filterParams.fromDate,
                to_date: filterParams.toDate,
                client: filterParams.client,
                executive: filterParams.executive,
                state: filterParams.state,
                city: filterParams.city
            });

            const apiEndTime = performance.now();
            const apiDuration = apiEndTime - apiStartTime;

            const processStartTime = performance.now();

            // Extract remarks data from response
            const remarksData = remarksResponse.results || remarksResponse.data || remarksResponse;
            setRemarksData(remarksData);
        } catch (err) {
            setError(err.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Get ALL candidates for a specific remark using API call
     * @param {string} remark - The remark to filter by
     * @returns {Array} - Transformed candidate data
     */
    const getCandidatesForRemark = async (remark) => {
        const startTime = performance.now();
        try {

            const apiStartTime = performance.now();

            // Use the new API function that fetches ALL candidates for the remark
            const response = await candidates.getAllCandidatesForRemark(remark, {
                from_date: appliedFilters.fromDate,
                to_date: appliedFilters.toDate,
                executive: appliedFilters.executive,
                client: appliedFilters.client,
                state: appliedFilters.state,
                city: appliedFilters.city
            });

            const apiEndTime = performance.now();
            const apiDuration = apiEndTime - apiStartTime;

            const candidatesData = response.results || response.data || response;

            const transformStartTime = performance.now();

            // Transform the data to match expected format (using complete data from optimized API)
            const transformedCandidates = [];

            const transformStart = performance.now();

            candidatesData.forEach(candidate => {
                if (candidate.client_jobs && candidate.client_jobs.length > 0) {
                    candidate.client_jobs.forEach(job => {
                        // Only include client jobs that match the selected remark (case-insensitive)
                        if (job.remarks && job.remarks.toLowerCase() === remark.toLowerCase()) {
                            transformedCandidates.push({
                                id: `${candidate.id}-${job.client_name}-${transformedCandidates.length}`, // Unique key for React
                                candidateId: candidate.profile_number || `CND${candidate.id}`,
                                candidateName: candidate.candidate_name,
                                clientName: job.client_name,
                                dateOfEntry: job.updated_at ? job.updated_at.split('T')[0] : (candidate.updated_at ? candidate.updated_at.split('T')[0] : new Date().toISOString().split('T')[0]),
                                status: job.remarks,
                                location: candidate.city || 'Unknown',
                                branchName: 'Main Branch',
                                tlName: 'Team Leader',
                                executiveName: candidate.executive_display || job?.assign === 'assigned' && job?.assign_to ? job.assign_to : candidate.executive_name || 'N/A',
                                remarks: job.remarks,
                                entryDate: candidate.updated_at ? candidate.updated_at.split('T')[0] : new Date().toISOString().split('T')[0],
                                // Store original candidate data for ViewModal (complete data from optimized API)
                                originalCandidate: candidate,
                                originalClientJob: job
                            });
                        }
                    });
                }
            });

            return transformedCandidates;
        } catch (error) {
            return [];
        }
    };



    /**
     * Handle input changes for filters
     * @param {string} field - The field name to update
     * @param {string} value - The new value
     */
    const handleInputChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    /**
     * Apply filters and fetch data
     */
    const handleApplyFilters = async () => {
        // Trim whitespace from filter values to avoid issues
        const trimmedFilters = {
            ...filters,
            client: filters.client?.trim() || '',
            executive: filters.executive?.trim() || '',
            state: filters.state?.trim() || ''
        };

        setAppliedFilters(trimmedFilters);
        setHasAppliedFilters(true);
        setSummaryCurrentPage(1); // Reset pagination
        await fetchData(trimmedFilters);
        closeMobileFilters(); // Close mobile filters if open
    };

    /**
     * Clear all filters and reset data
     */
    const handleClearFilters = () => {
        const resetFilters = {
            fromDate: getCurrentDate(),
            toDate: getCurrentDate(),
            client: '',
            executive: '',
            state: '',
            city: ''
        };
        setFilters(resetFilters);
        setAppliedFilters(resetFilters);
        setHasAppliedFilters(false);
        setRemarksData([]);
        setSummaryCurrentPage(1);
        closeMobileFilters(); // Close mobile filters if open
    };

    /**
     * Handle count click to open detailed view in new tab
     * @param {Object} remarkItem - The remark item that was clicked
     */
    const handleCountClick = (remarkItem) => {

        // Encode the remark for URL safety
        const encodedRemark = encodeURIComponent(remarkItem.remarks);
        // Use 'all' as placeholder when dates are empty to maintain URL structure
        const encodedFromDate = encodeURIComponent(appliedFilters.fromDate || 'all');
        const encodedToDate = encodeURIComponent(appliedFilters.toDate || 'all');

        // Create URL with parameters
        const detailUrl = `/databank/details/${encodedRemark}/${encodedFromDate}/${encodedToDate}?client=${encodeURIComponent(appliedFilters.client || '')}&executive=${encodeURIComponent(appliedFilters.executive || '')}&state=${encodeURIComponent(appliedFilters.state || '')}&city=${encodeURIComponent(appliedFilters.city || '')}`;

        // Open in new tab
        window.open(detailUrl, '_blank');
    };


    /**
     * Load detailed data for a specific remark (used when accessing via URL)
     * @param {string} remarkName - The remark to load details for
     * @param {Object} filters - The filters to apply
     */
    const loadDetailedDataForRemark = async (remarkName, filters) => {
        try {
            setLoading(true);
            setSelectedRemark(remarkName);
            await fetchDetailedPage(remarkName, 1);
        } catch (error) {
            setError('Failed to load candidate details');
        } finally {
            setLoading(false);
        }
    };

    // Fetch one server-side page for detailed view and transform rows for the table
    const fetchDetailedPage = async (remarkName, page = 1, searchTerm = '', pageSize = null) => {
        setIsDetailedLoading(true);
        const currentPageSize = pageSize || detailedPageSize;

        try {
            const res = await candidates.getCandidatesForRemarkPaginated(remarkName, {
                from_date: appliedFilters.fromDate,
                to_date: appliedFilters.toDate,
                executive: appliedFilters.executive,
                client: appliedFilters.client,
                state: appliedFilters.state,
                city: appliedFilters.city,
                search: searchTerm // Add search parameter to backend request
            }, page, currentPageSize);

            const rawCandidates = res.results || [];
            const transformed = [];
            rawCandidates.forEach(candidate => {
                const jobs = Array.isArray(candidate.client_jobs) ? candidate.client_jobs : [];
                jobs.forEach(job => {
                    if (job.remarks && selectedRemark ? job.remarks.toLowerCase() === selectedRemark.toLowerCase() : job.remarks.toLowerCase() === remarkName.toLowerCase()) {
                        transformed.push({
                            id: `${candidate.id}-${job.client_name}-${transformed.length}`,
                            candidateId: candidate.profile_number || `CND${candidate.id}`,
                            candidateName: candidate.candidate_name,
                            clientName: job.client_name,
                            dateOfEntry: job.updated_at ? job.updated_at.split('T')[0] : (candidate.updated_at ? String(candidate.updated_at).split('T')[0] : new Date().toISOString().split('T')[0]),
                            status: job.remarks,
                            location: candidate.city || 'Unknown',
                            branchName: 'Main Branch',
                            tlName: 'Team Leader',
                            executiveName: candidate.executive_display || job?.assign === 'assigned' && job?.assign_to ? job.assign_to : candidate.executive_name || 'N/A',
                            remarks: job.remarks,
                            entryDate: candidate.updated_at ? String(candidate.updated_at).split('T')[0] : new Date().toISOString().split('T')[0],
                            originalCandidate: candidate,
                            originalClientJob: job
                        });
                    }
                });
            });

            setSelectedRemarkData(transformed);
            setDetailedPage(page);
            setCurrentPage(page);
            // Use the total count from backend response
            setDetailedTotalCount(res.count || transformed.length);
            setDetailedHasNext(!!res.next);
            setDetailedHasPrev(!!res.previous);
        } catch (err) {
            setError('Failed to fetch candidates');
        } finally {
            setIsDetailedLoading(false);
        }
    };

    /**
     * Handle back to summary view
     */
    const handleBackToSummary = () => {
        // Navigate back to main databank page
        window.location.href = '/databank';
    };

    /**
     * Load all remaining candidates for large datasets
     */
    const loadAllCandidates = async () => {
        if (!selectedRemark || isLoadingMore) return;

        const loadAllStart = performance.now();
        setIsLoadingMore(true);

        try {
            // Use the original function to get ALL candidates
            const allCandidates = await getCandidatesForRemark(selectedRemark);

            const loadAllEnd = performance.now();
            const loadAllDuration = loadAllEnd - loadAllStart;

            setSelectedRemarkData(allCandidates);
            setHasPartialData(false);
            setTotalAvailableCount(0);
            setCurrentPage(1); // Reset to first page

        } catch (error) {
            setError('Failed to load all candidates');
        } finally {
            setIsLoadingMore(false);
        }
    };

    // ========================================================================
    // PAGINATION HANDLERS
    // ========================================================================

    /**
     * Handle page change for summary table
     * @param {number} page - The page number to navigate to
     */
    const handleSummaryPageChange = (page) => {
        setSummaryCurrentPage(page);
    };

    /**
     * Handle page change for detailed view table
     * @param {number} page - The page number to navigate to
     */
    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    /**
     * Handle page size change for summary table
     * @param {number} newSize - The new page size
     */
    const handleSummaryPageSizeChange = (newSize) => {
        setSummaryItemsPerPage(newSize);
        setSummaryCurrentPage(1); // Reset to first page when changing page size
    };


    // ========================================================================
    // DATA PROCESSING & UTILITIES
    // ========================================================================

    // Use real data instead of dummy data
    const filteredData = remarksData;

    // Calculate pagination data for summary table using filtered data
    const summaryTotalPages = Math.ceil(filteredData.length / summaryItemsPerPage);
    const summaryStartIndex = (summaryCurrentPage - 1) * summaryItemsPerPage;
    const paginatedSummaryData = filteredData.slice(summaryStartIndex, summaryStartIndex + summaryItemsPerPage);

    // Calculate statistics for filtered data
    const totalRecords = filteredData.reduce((sum, item) => sum + (item.total_count || item.filtered_count || 0), 0);
    const remarksWithData = filteredData.filter(item => (item.total_count || item.filtered_count || 0) > 0).length;

    // ========================================================================
    // DETAILED VIEW FILTER HANDLERS
    // ========================================================================

    /**
     * Handle detailed view filter changes
     * @param {string} field - The field name to update
     * @param {string} value - The new value
     */
    const handleDetailedFilterChange = (field, value) => {
        setDetailedFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Apply only date filters on frontend for currently loaded data
    // Note: Search filtering is handled by the backend across ALL pages
    const getFilteredDetailedData = useCallback(() => {
        let filteredData = selectedRemarkData;

        // Apply date filters on frontend for currently loaded data
        if (detailedFilters.fromDate || detailedFilters.toDate) {
            filteredData = filteredData.filter(candidate => {
                const candidateDate = candidate.dateOfEntry;
                if (!candidateDate) return false;

                const fromDateMatch = !detailedFilters.fromDate || candidateDate >= detailedFilters.fromDate;
                const toDateMatch = !detailedFilters.toDate || candidateDate <= detailedFilters.toDate;

                return fromDateMatch && toDateMatch;
            });
        }

        // REMOVED: Frontend search filtering
        // Search is now handled entirely by the backend via the 'search' parameter
        // This allows search to work across ALL pages, not just the current page

        return filteredData;
    }, [selectedRemarkData, detailedFilters.fromDate, detailedFilters.toDate]);

    // Compute filtered detailed data with useMemo to prevent unnecessary re-renders
    const filteredDetailedData = useMemo(() => {
        return getFilteredDetailedData();
    }, [getFilteredDetailedData]);

    // Global cross-row sets for phone masking/hover
    const joinedMobiles = useMemo(() => getJoinedOrSelectedMobileNumbers(filteredDetailedData), [filteredDetailedData]);
    const globalJoiningDates = useMemo(() => getGlobalJoiningDates(filteredDetailedData), [filteredDetailedData]);

    // Close popover on outside click
    useEffect(() => {
        if (openWhatsappFor !== null) {
            const onClick = (e) => {
                const t = e.target;
                if (t && (t.closest && (t.closest('.wa-popover') || t.closest('.wa-button')))) {
                    return;
                }
                setOpenWhatsappFor(null);
            };
            document.addEventListener('click', onClick);
            return () => document.removeEventListener('click', onClick);
        }
    }, [openWhatsappFor]);

    // Use ref to track if this is the initial load
    const isInitialLoad = useRef(true);

    // Ref for search input to maintain focus
    const searchInputRef = useRef(null);

    // Simple search handler - updates immediately for frontend filtering
    const handleDetailedSearchChange = (e) => {
        const value = e.target.value;
        // Update the ref immediately (no re-render)
        if (searchInputRef.current) {
            searchInputRef.current.value = value;
        }
        // Then update state (will cause re-render but input value is already set)
        setDetailedSearchTerm(value);
    };

    // Debounce effect - updates debouncedSearchTerm after user stops typing (500ms)
    useEffect(() => {
        // Debounce all search terms to reduce API calls while typing
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(detailedSearchTerm);
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [detailedSearchTerm]);

    // Backend search effect - triggers only when debouncedSearchTerm changes
    useEffect(() => {
        // Skip on initial load (data is already loaded)
        if (isInitialLoad.current) {
            isInitialLoad.current = false;
            return;
        }

        if (!showDetailedView || !selectedRemark) return;

        // Trigger backend search for any search term (including empty to clear search)
        // Reset to page 1 when search term changes
        fetchDetailedPage(selectedRemark, 1, debouncedSearchTerm);
    }, [debouncedSearchTerm, showDetailedView, selectedRemark]);

    // ========================================================================
    // PAGINATION HANDLERS
    // ========================================================================
    const detailedStartIndex = (detailedPage - 1) * detailedPageSize;
    const detailedEndIndex = detailedStartIndex + selectedRemarkData.length;

    /**
     * Handle page size changes
     * @param {number} newSize - The new page size
     */
    const handlePageSizeChange = (newSize) => {
        setItemsPerPage(newSize);
        setCurrentPage(1); // Reset to first page when changing page size
    };

    /**
     * Handle detailed view page size changes
     * @param {number} newSize - The new page size
     */
    const handleDetailedPageSizeChange = (newSize) => {
        setDetailedPageSize(newSize);
        setDetailedPage(1); // Reset to first page when changing page size
        // Refetch data with new page size - pass newSize explicitly
        if (selectedRemark) {
            fetchDetailedPage(selectedRemark, 1, debouncedSearchTerm, newSize);
        }
    };

    /**
     * Clear detailed filters
     */
    const handleClearDetailedFilters = () => {
        setDetailedFilters({
            fromDate: '',
            toDate: ''
        });
        setCurrentPage(1);
    };

    /**
     * Get candidate ID for ViewCandidate navigation (same as DailyReports)
     * @param {Object} candidate - The candidate data
     * @returns {string|number} - The candidate ID
     */
    const getCandidateId = (candidate) => {
        // Try to get numeric ID from original candidate data
        if (candidate.originalCandidate?.id) {
            return candidate.originalCandidate.id;
        }

        // Try candidateId field
        if (candidate.candidateId) {
            // If it's a profile number like "PIN/099351", extract numeric ID if available
            if (typeof candidate.candidateId === 'string' && candidate.candidateId.includes('/')) {
                // Check if we have the numeric ID stored elsewhere
                if (candidate.id) {
                    return candidate.id;
                }
                // Otherwise use the profile number as-is
                return candidate.candidateId;
            }
            return candidate.candidateId;
        }

        // Fallback to id field
        return candidate.id;
    };

    /**
     * Handle view candidate details - Fetch complete candidate data like ViewModal does
     * @param {Object} candidate - The candidate data to view
     */
    const handleView = async (candidate) => {
        try {
            // Show loading toast
            toast.loading('Loading candidate details...', { id: 'candidate-loading' });

            // Extract candidate ID - try different formats
            let candidateId = candidate.candidateId;

            // If candidateId is in format like "PIN/0102519", extract the numeric part
            if (candidate.originalCandidate?.id) {
                candidateId = candidate.originalCandidate.id;
            } else if (candidateId && candidateId.includes('/')) {
                // Try to extract numeric ID from profile number format
                const numericMatch = candidateId.match(/\d+/);
                if (numericMatch) {
                    candidateId = numericMatch[0];
                }
            }

            // Fetch complete candidate data using the same API that ViewModal uses
            const [completeCandidate, clientJobs] = await Promise.all([
                candidates.getById(candidateId),
                clientJobsAPI.getByCandidate(candidateId)
            ]);

            if (!completeCandidate) {
                throw new Error('Candidate not found');
            }

            // Find the specific client job that matches the current DataBank entry
            let selectedClientJob = null;
            if (clientJobs && clientJobs.length > 0) {
                // Try to match by client name
                selectedClientJob = clientJobs.find(job =>
                    job.client_name === candidate.clientName ||
                    job.client_name?.toLowerCase() === candidate.clientName?.toLowerCase()
                );

                // If no match found, use the first client job
                if (!selectedClientJob) {
                    selectedClientJob = clientJobs[0];
                }
            }

            // Create the transformed candidate data with complete information
            const transformedCandidate = {
                ...completeCandidate,

                // Ensure required fields are present - USE NUMERIC ID for API calls
                candidateId: completeCandidate.id, // Use numeric ID for API calls
                id: completeCandidate.id, // Ensure numeric ID is preserved
                profile_number: completeCandidate.profile_number, // Keep profile number separate
                profileNumber: completeCandidate.profile_number, // ViewModal expects this field name
                candidate_name: completeCandidate.candidate_name || completeCandidate.name,
                candidateName: completeCandidate.candidate_name || completeCandidate.name,

                // Ensure all ViewModal required fields are present
                name: completeCandidate.candidate_name || completeCandidate.name, // ViewModal uses 'name'
                email: completeCandidate.email || 'Not Available',
                mobile1: completeCandidate.mobile1 || completeCandidate.phone1 || 'Not Available',
                mobile2: completeCandidate.mobile2 || completeCandidate.phone2 || '',
                city: completeCandidate.city || 'Not Available',
                state: completeCandidate.state || '',
                source: completeCandidate.source || 'DataBank',
                experience: completeCandidate.experience || '',
                education: completeCandidate.education || '',
                dob: completeCandidate.dob || completeCandidate.date_of_birth || '',
                gender: completeCandidate.gender || '',
                skills: completeCandidate.skills || [],
                languages: completeCandidate.languages || [],
                executive_name: completeCandidate.executive_display || completeCandidate.executive_name || candidate.executiveName,

                // Add client jobs data with proper structure
                client_jobs: clientJobs || [],

                // Add related data structure that ViewModal expects
                education_certificates: completeCandidate.education_certificates || [],
                experience_companies: completeCandidate.experience_companies || [],
                additional_info: completeCandidate.additional_info || [],
                previous_companies: completeCandidate.previous_companies || [],

                // Set the selected client job ID if available
                clientJobId: selectedClientJob?.id || null,
                selectedClientJob: selectedClientJob || null,

                // Add additional fields that FeedbackModal expects from ViewModal
                phone: completeCandidate.mobile1 || completeCandidate.phone1 || 'Not Available',
                executiveName: completeCandidate.executive_display || completeCandidate.executive_name || candidate.executiveName,

                // Add client job context for FeedbackModal filtering
                clientName: selectedClientJob?.client_name || candidate.clientName,

                // DataBank specific flags
                isFromDataBank: true,
                hasLimitedData: false, // We now have complete data

                // Add unique timestamp to force ViewModal refresh
                _refreshKey: Date.now(),
                _source: 'DataBank'
            };

            // Dismiss loading toast
            toast.dismiss('candidate-loading');

            // Clear any existing candidate data first to ensure fresh load
            actions.setSelectedCandidate(null);
            actions.setIsViewModalOpen(false);

            // Set selectedCandidate with a small delay to ensure ViewModal resets properly
            setTimeout(() => {
                actions.setSelectedCandidate(transformedCandidate);
                actions.setIsViewModalOpen(true);
            }, 100);

        } catch (error) {
            toast.dismiss('candidate-loading');
            toast.error('Failed to load candidate details. Please try again.');

            // Fallback to original limited data approach

            const fallbackCandidate = {
                id: candidate.originalCandidate?.id || candidateId, // Use numeric ID
                candidateId: candidate.originalCandidate?.id || candidateId, // Use numeric ID for API calls
                profile_number: candidate.candidateId, // Keep original profile number
                profileNumber: candidate.candidateId, // ViewModal expects this field name
                candidate_name: candidate.candidateName,
                candidateName: candidate.candidateName,
                name: candidate.candidateName, // ViewModal uses 'name'
                mobile1: 'Not Available',
                email: 'Not Available',
                mobile2: '',
                city: candidate.location || 'Not specified',
                state: '',
                source: 'DataBank',
                experience: '',
                education: '',
                dob: '',
                gender: '',
                skills: [],
                languages: [],
                executive_name: candidate.executiveName,

                // Add empty related data structures
                education_certificates: [],
                experience_companies: [],
                additional_info: [],
                previous_companies: [],
                client_jobs: [{
                    id: `${candidate.candidateId}-${candidate.clientName}`,
                    client_name: candidate.clientName,
                    remarks: candidate.remarks,
                    status: candidate.status
                }],
                isFromDataBank: true,
                hasLimitedData: true,

                // Add unique timestamp to force ViewModal refresh
                _refreshKey: Date.now(),
                _source: 'DataBank-Fallback'
            };

            // Clear any existing candidate data first
            actions.setSelectedCandidate(null);
            actions.setIsViewModalOpen(false);

            // Set fallback candidate with delay
            setTimeout(() => {
                actions.setSelectedCandidate(fallbackCandidate);
                actions.setIsViewModalOpen(true);
            }, 100);
        }
    };

    /**
     * Handle close ViewModal
     */
    const handleCloseViewModal = () => {
        actions.setSelectedCandidate(null);
        actions.setIsViewModalOpen(false);

        // Force refresh the detailed view data if we're in detailed view
        // This ensures any changes made in ViewModal are reflected
        if (showDetailedView && selectedRemark) {
            setTimeout(async () => {
                try {
                    const refreshedData = await getCandidatesForRemark(selectedRemark);
                    setSelectedRemarkData(refreshedData);
                } catch (error) {
                    // Error refreshing detailed view
                }
            }, 500); // Small delay to ensure ViewModal changes are saved
        }
    };

    /**
     * Handle feedback modal (triggered by candidate name click)
     * @param {Object} candidate - The candidate data to open feedback for
     */
    const handleFeedbackCandidate = async (candidate) => {
        try {
            // Extract candidate ID - try different formats (same logic as handleView)
            let candidateId = candidate.candidateId;

            if (candidate.originalCandidate?.id) {
                candidateId = candidate.originalCandidate.id;
            } else if (candidateId && candidateId.includes('/')) {
                const numericMatch = candidateId.match(/\d+/);
                if (numericMatch) {
                    candidateId = numericMatch[0];
                }
            }

            // Get the client job ID for proper feedback filtering
            let clientJobId = null;
            if (candidate.originalClientJob?.id) {
                clientJobId = candidate.originalClientJob.id;
            }

            // Transform DataBank candidate data to FeedbackModal format (same as SearchView)
            const transformedCandidate = {
                // Core candidate info
                id: candidateId,
                candidateId: candidateId,
                name: candidate.candidateName,
                candidateName: candidate.candidateName,

                // Contact info from original data
                phone: candidate.originalCandidate?.mobile1 || candidate.originalCandidate?.phone1 || candidate.originalCandidate?.phone || 'Not Available',
                mobile1: candidate.originalCandidate?.mobile1 || candidate.originalCandidate?.phone1 || candidate.originalCandidate?.phone || 'Not Available',
                contactNumber1: candidate.originalCandidate?.mobile1 || candidate.originalCandidate?.phone1 || candidate.originalCandidate?.phone || 'Not Available', // FeedbackModal expects this field
                email: candidate.originalCandidate?.email || candidate.originalCandidate?.email_id || 'Not Available',

                // Profile and location info
                profileNumber: candidate.originalCandidate?.profile_number || candidate.candidateId,
                profile_number: candidate.originalCandidate?.profile_number || candidate.candidateId,
                city: candidate.originalCandidate?.city || candidate.location || 'Not Available',
                location: candidate.originalCandidate?.city || candidate.location || 'Not Available',

                // Executive info
                executiveName: candidate.originalCandidate?.executive_display || candidate.originalCandidate?.executive_name || candidate.executiveName,
                executive_name: candidate.originalCandidate?.executive_display || candidate.originalCandidate?.executive_name || candidate.executiveName,

                // Client job info for filtering - CRITICAL for FeedbackModal
                clientJobId: clientJobId,
                selectedClientJob: candidate.originalClientJob ? {
                    id: candidate.originalClientJob.id,
                    client_name: candidate.originalClientJob.client_name || candidate.clientName,
                    designation: candidate.originalClientJob.designation || '',
                    candidate_id: candidateId,
                    remarks: candidate.originalClientJob.remarks || candidate.remarks
                } : null,

                // Client filter hint for FeedbackModal
                filterByClient: candidate.clientName ? candidate.clientName.trim() : null,
                clientName: candidate.clientName,

                // Additional fields that FeedbackModal might need
                source: candidate.originalCandidate?.source || 'DataBank',
                state: candidate.originalCandidate?.state || '',

                // Backend data structure that FeedbackModal expects
                backendData: candidate.originalCandidate || {
                    id: candidateId,
                    candidate_name: candidate.candidateName,
                    executive_name: candidate.executiveName,
                    city: candidate.location
                },

                // Cache bypass for fresh data
                _forceRefresh: Date.now(),
                _source: 'DataBank',
                _clientJobId: clientJobId // Explicit client job ID for debugging
            };

            setSelectedCandidateForFeedback(transformedCandidate);
            setShowFeedbackModal(true);

        } catch (error) {
            toast.error('Failed to open feedback modal');
        }
    };

    /**
     * Handle close feedback modal
     */
    const handleCloseFeedbackModal = () => {
        setShowFeedbackModal(false);
        setSelectedCandidateForFeedback(null);
    };

    // Listen for candidate updates from ViewModal
    useEffect(() => {
        const handleCandidateUpdate = (event) => {
            // If we're showing detailed view and a candidate was updated, refresh the data
            if (showDetailedView && selectedRemarkData.length > 0) {

                // Find and update the specific candidate in the current data
                const updatedData = selectedRemarkData.map(candidate => {
                    if (candidate.candidateId === event.detail.candidateId ||
                        candidate.originalCandidate?.id === event.detail.id) {
                        return {
                            ...candidate,
                            // Update relevant fields that might have changed
                            remarks: event.detail.updatedData?.remarks || event.detail.remarks || candidate.remarks,
                            status: event.detail.updatedData?.status || event.detail.status || candidate.status,
                            executiveName: event.detail.updatedData?.executive_display || event.detail.updatedData?.executive_name || event.detail.executive_name || candidate.executiveName,
                            // Mark as updated
                            _lastUpdated: Date.now()
                        };
                    }
                    return candidate;
                });

                setSelectedRemarkData(updatedData);
            }

            // Also check if we need to refresh the main summary data
            // If a candidate's status/remarks changed, it might affect the summary counts
            if (event.detail.updatedData?.remarks !== event.detail.originalData?.remarks) {
                // Optionally refresh summary data if remarks changed significantly
                // This ensures the summary counts are accurate
                setTimeout(() => {
                    fetchData(appliedFilters);
                }, 1000); // Small delay to avoid too frequent refreshes
            }
        };

        // Add event listener for candidate updates (for data refresh only)
        window.addEventListener('candidateUpdated', handleCandidateUpdate);

        // Cleanup
        return () => {
            window.removeEventListener('candidateUpdated', handleCandidateUpdate);
        };
    }, [showDetailedView, selectedRemarkData]);
    


    /**
     * Detailed view component for showing candidate details
     * @returns {JSX.Element} The detailed view component
     */
    const DetailedView = useMemo(() => (
        <div className="min-h-screen space-y-1">
            {/* Header with Back Button */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-2 py-1 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={handleBackToSummary}
                                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                            >
                                <ArrowLeft className="w-4 h-4 text-gray-600" />
                            </button>
                            <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                                <UserCheck className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h1 className="text-md font-bold text-gray-900">
                                    {selectedRemark} - Detailed View
                                </h1>

                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            {/* Load All Button for Partial Data */}
                            {hasPartialData && (
                                <button
                                    onClick={loadAllCandidates}
                                    disabled={isLoadingMore}
                                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                                    title={`Load all ${totalAvailableCount} candidates`}
                                >
                                    {isLoadingMore ? (
                                        <>
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                            <span>Loading...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Load All ({totalAvailableCount})</span>
                                        </>
                                    )}
                                </button>
                            )}

                            {/* Mobile Filter Toggle for Detailed View */}
                            <button
                                onClick={() => {
                                    if (!showMobileDetailedFilters) {
                                        openMobileDetailedFilters();
                                    } else {
                                        closeMobileDetailedFilters();
                                    }
                                }}
                                className="md:hidden p-1.5 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors duration-200"
                                title="Toggle Filters"
                            >
                                <Filter className="w-3 h-3 text-blue-600" />
                            </button>
                            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                Total: {detailedTotalCount}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Date Filter Section for Detailed View - Desktop only */}
            {/* <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-2">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                From Date
                            </label>
                            <input
                                type="date"
                                value={detailedFilters.fromDate}
                                onChange={(e) => handleDetailedFilterChange('fromDate', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                To Date
                            </label>
                            <input
                                type="date"
                                value={detailedFilters.toDate}
                                onChange={(e) => handleDetailedFilterChange('toDate', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                            />
                        </div>

                        <div className="flex items-end">
                            <div className="text-xs text-gray-600">
                                {detailedFilters.fromDate || detailedFilters.toDate ? (
                                    <span className="text-blue-600 font-medium">
                                        Filtered: {filteredDetailedData.length} of {selectedRemarkData.length}
                                    </span>
                                ) : (
                                    <span>All entries: {selectedRemarkData.length}</span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={handleClearDetailedFilters}
                                disabled={!detailedFilters.fromDate && !detailedFilters.toDate}
                                className="w-full px-2 py-1 text-xs bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-all duration-200 flex items-center justify-center space-x-1 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <X className="w-3 h-3" />
                                <span className="font-medium">Clear</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div> */}

            {/* Detailed Candidates Table */}
            <div
                className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col"
                style={filteredDetailedData.length > 5 ? { height: 'calc(100vh - 120px)' } : {}}
            >
                {/* Sticky Header - Page Size Selector */}
                <div className="px-3 py-2 border-b border-gray-100 bg-white sticky top-0 z-10">
                    <div className="flex items-center justify-between gap-4">

                        {/* Left - Page Size Selector */}
                        <div className="flex items-center space-x-2">
                            <label className="text-xs font-medium text-gray-700">Show:</label>
                            <select
                                value={detailedPageSize}
                                onChange={(e) => handleDetailedPageSizeChange(Number(e.target.value))}
                                className="px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                            >
                                <option value={10}>10 entries</option>
                                <option value={25}>25 entries</option>
                                <option value={50}>50 entries</option>
                            </select>
                        </div>

                        {/* Center - Showing Info */}
                        <div className="text-xs text-gray-700 font-medium">
                            {selectedRemarkData.length === 0 ? (
                                'No entries found'
                            ) : (
                                `Showing ${detailedStartIndex + 1}-${detailedEndIndex} of ${detailedTotalCount} entries`
                            )}
                        </div>

                        {/* Right - Search Box */}
                        <div className="flex items-center space-x-2">
                            <div className="relative">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    defaultValue={detailedSearchTerm}
                                    onChange={handleDetailedSearchChange}
                                    placeholder="Search..."
                                    autoComplete="off"
                                    className="pl-9 pr-3 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs w-48"
                                />
                            </div>
                        </div>

                    </div>
                </div>

                {/* Scrollable Table Body */}
                <div className="flex-1 overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
                            <tr>
                                {/* Desktop Headers - Hidden in mobile */}
                                <th className="hidden md:table-cell px-1.5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    S.No
                                </th>
                                <th className="hidden md:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Executive Info
                                </th>
                                <th className="hidden md:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Candidate Info
                                </th>
                                <th className="hidden md:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Personal Info
                                </th>
                                <th className="hidden md:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Job Info
                                </th>
                                <th className="hidden md:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Remarks
                                </th>
                                <th className="hidden md:table-cell px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Action
                                </th>

                                {/* Mobile Headers - Only show in mobile */}
                                <th className="md:hidden px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    S.No
                                </th>
                                <th className="md:hidden px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Executive Name
                                </th>
                                <th className="md:hidden px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Candidate Details
                                </th>
                                <th className="md:hidden px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {/* Loading Spinner Overlay */}
                            {isDetailedLoading && (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12">
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                                            <p className="text-sm text-gray-600">Loading candidates...</p>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {/* Data Rows */}
                            {!isDetailedLoading && filteredDetailedData.map((candidate, index) => (
                                <tr key={candidate.id} className="hover:bg-blue-50 transition-colors duration-200">
                                    {/* Desktop Row Data - Hidden in mobile */}
                                    <td className="hidden md:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-900 border-gray-200">
                                        <div className="flex items-center space-x-2">
                                            <span>{detailedStartIndex + index + 1}</span>
                                        </div>
                                    </td>
                                    {/* Executive Info - Desktop only */}
                                    <td className="hidden md:table-cell px-2 py-1">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                <div className="rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shadow-md border-2 border-gray-200">
                                                    <User className="w-6 h-6" />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {(() => {
                                                        // Try to get executive_display from backend (contains actual employee name)
                                                        const executiveDisplay = candidate.originalCandidate?.executive_display;
                                                        if (executiveDisplay && executiveDisplay !== 'N/A' && executiveDisplay !== '-') {
                                                            return displayValue(executiveDisplay);
                                                        }

                                                        // Fallback: Get executive name from available data
                                                        const executiveName = candidate.originalCandidate?.executive_display || candidate.originalCandidate?.executive_name || candidate.executiveName;
                                                        return displayValue(executiveName || '-');
                                                    })()}
                                                </div>
                                                {/* Created Date from candidate table */}
                                                <div className="text-xs text-gray-500">
                                                    <span className="font-medium">Created:</span> {(() => {
                                                        const createdDate = candidate.originalCandidate?.created_at ||
                                                            candidate.originalCandidate?.candidateCreatedDate ||
                                                            candidate.entryDate;
                                                        return createdDate ? new Date(createdDate).toLocaleDateString('en-IN') : "-";
                                                    })()}
                                                </div>
                                                {/* Updated Date from client jobs table */}
                                                <div className="text-xs">
                                                    <span className="font-medium text-gray-500">Updated:</span> {(() => {
                                                        // Get updated_at directly from the client job record
                                                        const clientJob = candidate.originalClientJob;
                                                        const updatedDate = clientJob?.updated_at;

                                                        // Get the latest call status from feedback
                                                        const feedback = clientJob?.feedback || '';
                                                        let callStatus = '';

                                                        // Parse the feedback to get the latest call status
                                                        if (feedback) {
                                                            const feedbackEntries = feedback.split(';;;;;;;');
                                                            if (feedbackEntries.length > 0) {
                                                                const latestEntry = feedbackEntries[feedbackEntries.length - 1];
                                                                const callStatusMatch = latestEntry.match(/CallStatus-([^:]+)/);
                                                                if (callStatusMatch) {
                                                                    callStatus = callStatusMatch[1].trim();
                                                                }
                                                            }
                                                        }

                                                        // Determine color based on call status
                                                        const dateColor = callStatus === 'call answered'
                                                            ? 'text-green-600 font-semibold'
                                                            : callStatus === 'call not answered'
                                                                ? 'text-red-600 font-semibold'
                                                                : 'text-gray-500';

                                                        return (
                                                            <span className={dateColor}>
                                                                {updatedDate ? new Date(updatedDate).toLocaleDateString('en-IN') : "-"}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    {/* Candidate Info - Desktop only */}
                                    <td className="hidden md:table-cell px-4 py-1">
                                        <div className="space-y-1 text-xs text-gray-700">
                                            <div
                                                className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer hover:underline"
                                                onClick={() => handleFeedbackCandidate(candidate)}
                                                title="Click to add feedback"
                                            >
                                                {displayValue(candidate.candidateName)}
                                            </div>
                                            <div className="flex items-center gap-1 relative">
                                                {(() => {
                                                    const id = candidate.candidateId || candidate.id;
                                                    const open = openWhatsappFor === id;
                                                    return (
                                                        <button
                                                            className="wa-button inline-flex items-center justify-center w-5 h-5 mr-1 rounded hover:bg-gray-100"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (open) {
                                                                    setOpenWhatsappFor(null);
                                                                    return;
                                                                }
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                setWaMenuPos({ x: rect.left, y: rect.bottom });
                                                                setOpenWhatsappFor(id);
                                                            }}
                                                            title={(() => {
                                                                const phone1 = candidate.contactNumber1 || candidate.originalCandidate?.mobile1 || candidate.originalCandidate?.phone1 || candidate.phone || candidate.mobile1;
                                                                const cr = candidate.candidaterevenue || candidate.backendData?.candidaterevenue || candidate.originalCandidate?.candidaterevenue;
                                                                const d1 = getDisplayMobileNumber(phone1, joinedMobiles, cr, globalJoiningDates);
                                                                const m1 = String(d1 || '').includes('x');
                                                                return getPhoneHoverTitle(phone1, candidate, m1, joinedMobiles, globalJoiningDates, filteredDetailedData);
                                                            })()}
                                                        >
                                                            <Phone className="w-3.5 h-3.5 text-gray-500" />
                                                        </button>
                                                    );
                                                })()}
                                                {(() => {
                                                    const phone1 = candidate.contactNumber1 || candidate.originalCandidate?.mobile1 || candidate.originalCandidate?.phone1 || candidate.phone || candidate.mobile1;
                                                    const cr = candidate.candidaterevenue || candidate.backendData?.candidaterevenue || candidate.originalCandidate?.candidaterevenue;
                                                    const displayPhone1 = getDisplayMobileNumber(phone1, joinedMobiles, cr, globalJoiningDates);
                                                    const p1 = String(phone1 || '').trim();
                                                    const isValid1 = p1 && p1 !== '-' && p1.toLowerCase() !== 'null' && p1.toLowerCase() !== 'nill' && p1.toLowerCase() !== 'nil';
                                                    const isMasked1 = String(displayPhone1 || '').includes('x');
                                                    const hover1 = getPhoneHoverTitle(phone1, candidate, isMasked1, joinedMobiles, globalJoiningDates, filteredDetailedData);
                                                    return isValid1 ? (
                                                        <span className={`${isMasked1 ? 'text-gray-400' : ''}`} title={hover1}>{displayValue(displayPhone1)}</span>
                                                    ) : (
                                                        <span className="text-black" title={hover1}>{displayValue(displayPhone1)}</span>
                                                    );
                                                })()}
                                                {(() => {
                                                    const phone2 = candidate.contactNumber2 || candidate.originalCandidate?.mobile2 || candidate.originalCandidate?.phone2 || candidate.phone2 || candidate.mobile2;
                                                    const cr = candidate.candidaterevenue || candidate.backendData?.candidaterevenue || candidate.originalCandidate?.candidaterevenue;
                                                    const displayPhone2 = getDisplayMobileNumber(phone2, joinedMobiles, cr, globalJoiningDates);
                                                    const p2 = String(phone2 || '').trim();
                                                    const isValid2 = p2 && p2 !== '-' && p2.toLowerCase() !== 'null' && p2.toLowerCase() !== 'nill' && p2.toLowerCase() !== 'nil';
                                                    const isMasked2 = String(displayPhone2 || '').includes('x');
                                                    const hover2 = getPhoneHoverTitle(phone2, candidate, isMasked2, joinedMobiles, globalJoiningDates, filteredDetailedData);
                                                    return isValid2 ? (
                                                        <>
                                                            <span className="text-gray-400"> / </span>
                                                            <span className={`${isMasked2 ? 'text-gray-400' : ''}`} title={hover2}>{displayValue(displayPhone2)}</span>
                                                        </>
                                                    ) : null;
                                                })()}
                                                {(() => {
                                                    const id = candidate.candidateId || candidate.id;
                                                    const phone1 = candidate.contactNumber1 || candidate.originalCandidate?.mobile1 || candidate.originalCandidate?.phone1 || candidate.phone || candidate.mobile1;
                                                    const phone2 = candidate.contactNumber2 || candidate.originalCandidate?.mobile2 || candidate.originalCandidate?.phone2 || candidate.phone2 || candidate.mobile2;
                                                    const cr = candidate.candidaterevenue || candidate.backendData?.candidaterevenue || candidate.originalCandidate?.candidaterevenue;
                                                    const d1 = getDisplayMobileNumber(phone1, joinedMobiles, cr, globalJoiningDates);
                                                    const d2 = getDisplayMobileNumber(phone2, joinedMobiles, cr, globalJoiningDates);
                                                    const v1 = (String(phone1 || '').trim() || '').toLowerCase();
                                                    const v2 = (String(phone2 || '').trim() || '').toLowerCase();
                                                    const valid1 = v1 && v1 !== '-' && v1 !== 'null' && v1 !== 'nill' && v1 !== 'nil';
                                                    const valid2 = v2 && v2 !== '-' && v2 !== 'null' && v2 !== 'nill' && v2 !== 'nil';
                                                    const m1 = String(d1 || '').includes('x');
                                                    const m2 = String(d2 || '').includes('x');
                                                    const open = openWhatsappFor === id;
                                                    if (!open) return null;
                                                    return (
                                                        <div className="wa-popover fixed z-[9999] bg-white border border-gray-200 rounded shadow-md py-1 text-xs" style={{ left: waMenuPos.x, top: waMenuPos.y }}>
                                                            {valid1 ? (
                                                                <div
                                                                    className={`${m1 ? 'text-gray-400 cursor-not-allowed px-3 py-1' : 'px-3 py-1 hover:bg-gray-50 cursor-pointer text-green-600'}`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (m1) { toast.error('Cannot open WhatsApp for masked number'); return; }
                                                                        const num = String(phone1 || '').replace(/\D/g, '');
                                                                        if (!num) { toast.error('Invalid number'); return; }
                                                                        window.open(`https://wa.me/91${num}`, '_blank');
                                                                        setOpenWhatsappFor(null);
                                                                    }}
                                                                >
                                                                    {`P1:${m1 ? d1 : (phone1 || '').replace(/\D/g, '')}`}
                                                                </div>
                                                            ) : null}
                                                            {valid2 ? (
                                                                <div
                                                                    className={`${m2 ? 'text-gray-400 cursor-not-allowed px-3 py-1' : 'px-3 py-1 hover:bg-gray-50 cursor-pointer text-green-600'}`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (m2) { toast.error('Cannot open WhatsApp for masked number'); return; }
                                                                        const num = String(phone2 || '').replace(/\D/g, '');
                                                                        if (!num) { toast.error('Invalid number'); return; }
                                                                        window.open(`https://wa.me/91${num}`, '_blank');
                                                                        setOpenWhatsappFor(null);
                                                                    }}
                                                                >
                                                                    {`P2: ${m2 ? d2 : (phone2 || '').replace(/\D/g, '')}`}
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            <div className="truncate max-w-[180px] flex items-center">
                                                <Mail className="w-3.5 h-3.5 mr-1 text-gray-400" />
                                                {displayValue(candidate.originalCandidate?.email || candidate.originalCandidate?.email_id || candidate.email)}
                                            </div>
                                        </div>
                                    </td>
                                    {/* Personal Info - Desktop only */}
                                    <td className="hidden md:table-cell px-4 py-1 text-xs text-gray-700">
                                        <div className="space-y-1">
                                            <div>
                                                <strong>Education:</strong> {displayValue(candidate.originalCandidate?.degree || candidate.originalCandidate?.education)}
                                            </div>
                                            <div>
                                                <strong>Experience:</strong> {displayValue(candidate.originalCandidate?.years_of_experience || candidate.originalCandidate?.experience)}
                                            </div>
                                            <div>
                                                <strong>Location:</strong> {displayValue(candidate.originalCandidate?.address || candidate.originalCandidate?.city || candidate.location)}
                                            </div>
                                        </div>
                                    </td>
                                    {/* Job Info - Desktop only */}
                                    <td className="hidden md:table-cell px-4 py-1 text-xs text-gray-700">
                                        <div className="space-y-1">
                                            <div>
                                                <strong>Client:</strong> {displayValue(candidate.clientName)}
                                            </div>
                                            <div>
                                                <strong>Designation:</strong> {displayValue(
                                                    candidate.originalCandidate?.client_jobs?.[0]?.designation ||
                                                    candidate.originalClientJob?.designation ||
                                                    candidate.designation
                                                )}
                                            </div>
                                            <div>
                                                <strong>C-CTC:</strong> {formatCTC(
                                                    candidate.originalCandidate?.client_jobs?.[0]?.current_ctc ||
                                                    candidate.originalClientJob?.current_ctc ||
                                                    candidate.currentCtc
                                                )} &nbsp;&nbsp;
                                                <strong>E-CTC:</strong> {formatCTC(
                                                    candidate.originalCandidate?.client_jobs?.[0]?.expected_ctc ||
                                                    candidate.originalClientJob?.expected_ctc ||
                                                    candidate.expectedCtc
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    {/* Remarks - Current Status - Desktop only */}
                                    <td className="hidden md:table-cell px-4 py-1 text-xs text-gray-700">
                                        <div className="space-y-1">
                                            {/* Current Status from Remarks Field */}
                                            <div className="flex items-center gap-2">
                                                <strong>Remarks:</strong>
                                                <span className="text-gray-700">
                                                    {displayValue(candidate.remarks)}
                                                </span>
                                            </div>
                                            {/* NFD - Show based on available data */}
                                            {(() => {
                                                const nfdDate = candidate.originalCandidate?.client_jobs?.[0]?.next_follow_up_date ||
                                                    candidate.originalClientJob?.next_follow_up_date ||
                                                    candidate.nfd;

                                                // If no date, show "Open Profile" in orange
                                                if (!nfdDate || nfdDate === '-' || nfdDate.trim() === '') {
                                                    return (
                                                        <div>
                                                            <strong>NFD:</strong>{' '}
                                                            <span className="text-orange-600 font-semibold">Open Profile</span>
                                                        </div>
                                                    );
                                                }

                                                // Check if NFD has expired
                                                const isNfdExpired = (() => {
                                                    try {
                                                        const currentDate = new Date();
                                                        const nfdDateObj = new Date(nfdDate);
                                                        const nfdExpiryDate = new Date(nfdDateObj);
                                                        nfdExpiryDate.setDate(nfdExpiryDate.getDate() + 1);
                                                        return currentDate > nfdExpiryDate;
                                                    } catch {
                                                        return false;
                                                    }
                                                })();

                                                return (
                                                    <div>
                                                        <strong>NFD:</strong>{' '}
                                                        <span className={isNfdExpired ? 'text-orange-600 font-semibold' : 'text-blue-600 font-semibold'}>
                                                            {(() => {
                                                                try {
                                                                    const formattedDate = new Date(nfdDate).toLocaleDateString('en-IN');
                                                                    return isNfdExpired ? `${formattedDate} (Open Profile)` : formattedDate;
                                                                } catch {
                                                                    return nfdDate;
                                                                }
                                                            })()}
                                                        </span>
                                                    </div>
                                                );
                                            })()}
                                            {/* IFD - Interview Fixed Date */}
                                            {(() => {
                                                const ifdDate = candidate.originalCandidate?.client_jobs?.[0]?.interview_date ||
                                                    candidate.originalClientJob?.interview_date ||
                                                    candidate.ifd;

                                                if (ifdDate && ifdDate !== '-' && ifdDate.trim() !== '') {
                                                    return (
                                                        <div>
                                                            <strong>IFD:</strong>
                                                            <span className="text-gray-700">
                                                                {new Date(ifdDate).toLocaleDateString('en-IN')}
                                                            </span>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                            {/* EJD - Expected Joining Date */}
                                            {(() => {
                                                const ejdDate = candidate.originalCandidate?.client_jobs?.[0]?.expected_joining_date ||
                                                    candidate.originalClientJob?.expected_joining_date ||
                                                    candidate.ejd;

                                                if (ejdDate && ejdDate !== '-' && ejdDate.trim() !== '') {
                                                    return (
                                                        <div>
                                                            <strong>EJD:</strong>
                                                            <span className="text-gray-700">
                                                                {new Date(ejdDate).toLocaleDateString('en-IN')}
                                                            </span>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                            {/* Source of Candidate */}
                                            <div>
                                                <strong>Source:</strong>
                                                <span className="text-gray-700">
                                                    {(() => {
                                                        const source = candidate.originalCandidate?.source ||
                                                            candidate.originalCandidate?.source_of_candidate ||
                                                            candidate.source;

                                                        if (source && source !== '-' && source.trim() !== '' && source !== 'Unknown Source') {
                                                            return source;
                                                        }
                                                        return 'N/A';
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    {/* Actions - Desktop only */}
                                    <td className="hidden md:table-cell px-2 py-1 text-center">
                                        <div className="flex justify-center space-x-1">
                                            {/* View Button - Opens in new tab */}
                                            <Link
                                                to={`/view-candidate/${getCandidateId(candidate)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1 rounded-full hover:bg-blue-100/50 group transition-all duration-300 inline-flex items-center"
                                                title="View Full Details (Opens in new tab)"
                                            >
                                                <Eye className="w-4 h-4 text-blue-600 group-hover:text-blue-700 group-hover:scale-110" />
                                            </Link>
                                        </div>
                                    </td>

                                    {/* Mobile Row Data - Only show specified columns */}
                                    <td className="md:hidden px-3 py-1 whitespace-nowrap text-xs text-gray-900 font-medium">
                                        {detailedStartIndex + index + 1}
                                    </td>

                                    <td className="md:hidden px-2 py-1">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-xs">
                                                {(() => {
                                                    const executiveCode = candidate.originalCandidate?.created_by || candidate.originalCandidate?.executive_display || candidate.originalCandidate?.executive_name || candidate.executiveName;
                                                    return executiveCode ? executiveCode.split(' ').map(n => n[0]).join('').substring(0, 2) : 'EX';
                                                })()}
                                            </div>
                                            <div className="text-xs font-medium text-gray-900">
                                                {(() => {
                                                    // Try to get executive_display from backend (contains actual employee name)
                                                    const executiveDisplay = candidate.originalCandidate?.executive_display;
                                                    if (executiveDisplay && executiveDisplay !== 'N/A' && executiveDisplay !== '-') {
                                                        return executiveDisplay;
                                                    }

                                                    // Fallback: Get executive name from available data
                                                    const executiveName = candidate.originalCandidate?.executive_display || candidate.originalCandidate?.executive_name || candidate.executiveName;
                                                    return executiveName || '-';
                                                })()}
                                            </div>
                                        </div>
                                    </td>

                                    <td className="md:hidden px-2 py-1">
                                        <div className="space-y-1 text-xs text-gray-700">
                                            <div
                                                className="font-medium text-blue-600 cursor-pointer hover:text-blue-800 hover:underline transition-colors duration-200"
                                                onClick={() => handleFeedbackCandidate(candidate)}
                                                title="Click to add feedback"
                                            >
                                                {candidate.candidateName}
                                            </div>
                                            <div className="flex items-center">
                                                <Users className="inline-block w-3 h-3 mr-1 text-gray-400" />
                                                {candidate.candidateId}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {candidate.clientName} • {new Date(candidate.dateOfEntry).toLocaleDateString('en-IN')}
                                            </div>
                                        </div>
                                    </td>

                                    <td className="md:hidden px-2 py-1 text-center">
                                        <Link
                                            to={`/view-candidate/${getCandidateId(candidate)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1 rounded-full hover:bg-blue-100 group transition-all duration-200 inline-flex items-center"
                                            title="View Full Details (Opens in new tab)"
                                        >
                                            <Eye className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Sticky Footer - Pagination Controls (Server-side) */}
                <div className="px-3 py-2 border-t border-gray-200 bg-white sticky bottom-0 z-10 shadow-lg">
                    {/* Mobile Pagination */}
                    <div className="flex sm:hidden items-center justify-between">
                        <button
                            onClick={() => fetchDetailedPage(selectedRemark, Math.max(1, detailedPage - 1), debouncedSearchTerm)}
                            disabled={!detailedHasPrev || isDetailedLoading}
                            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => fetchDetailedPage(selectedRemark, detailedPage + 1, debouncedSearchTerm)}
                            disabled={!detailedHasNext || isDetailedLoading}
                            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>

                    {/* Desktop Pagination */}
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                            <p className="text-xs text-gray-600">
                                Showing{' '}
                                <span className="font-medium text-gray-900">{detailedStartIndex + 1}</span>
                                {' '}to{' '}
                                <span className="font-medium text-gray-900">{detailedEndIndex}</span>
                                {' '}of{' '}
                                <span className="font-medium text-gray-900">{detailedTotalCount}</span>
                                {' '}results
                            </p>
                        </div>
                        <div>
                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                                {/* First Page */}
                                <button
                                    onClick={() => fetchDetailedPage(selectedRemark, 1, debouncedSearchTerm)}
                                    disabled={!detailedHasPrev || isDetailedLoading}
                                    className="relative inline-flex items-center rounded-l-md px-1.5 py-1.5 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                    <ChevronLeft className="h-3.5 w-3.5 -ml-1.5" />
                                </button>

                                {/* Previous Page */}
                                <button
                                    onClick={() => fetchDetailedPage(selectedRemark, Math.max(1, detailedPage - 1), debouncedSearchTerm)}
                                    disabled={!detailedHasPrev || isDetailedLoading}
                                    className="relative inline-flex items-center px-1.5 py-1.5 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                </button>

                                {/* Page Numbers */}
                                {(() => {
                                    const totalPages = Math.ceil(detailedTotalCount / detailedPageSize);
                                    const pages = [];
                                    const siblings = 1;
                                    const showLeftEllipsis = detailedPage > siblings + 2;
                                    const showRightEllipsis = detailedPage < totalPages - (siblings + 1);
                                    const startPage = Math.max(2, detailedPage - siblings);
                                    const endPage = Math.min(totalPages - 1, detailedPage + siblings);

                                    // First page
                                    pages.push(
                                        <button
                                            key={1}
                                            onClick={() => fetchDetailedPage(selectedRemark, 1, debouncedSearchTerm)}
                                            className={`relative inline-flex items-center px-3 py-1.5 text-xs font-medium ${detailedPage === 1
                                                ? 'z-10 bg-blue-600 text-white'
                                                : 'text-gray-700 ring-1 ring-gray-300 ring-inset hover:bg-gray-50'
                                                }`}
                                        >
                                            1
                                        </button>
                                    );

                                    // Left ellipsis
                                    if (showLeftEllipsis) {
                                        pages.push(
                                            <span
                                                key="left-ellipsis"
                                                className="relative inline-flex items-center px-3 py-1.5 text-xs text-gray-700 ring-1 ring-gray-300 ring-inset"
                                            >
                                                ...
                                            </span>
                                        );
                                    }

                                    // Middle pages
                                    for (let i = startPage; i <= endPage; i++) {
                                        pages.push(
                                            <button
                                                key={i}
                                                onClick={() => fetchDetailedPage(selectedRemark, i, debouncedSearchTerm)}
                                                className={`relative inline-flex items-center px-3 py-1.5 text-xs font-medium ${i === detailedPage
                                                    ? 'z-10 bg-blue-600 text-white'
                                                    : 'text-gray-700 ring-1 ring-gray-300 ring-inset hover:bg-gray-50'
                                                    }`}
                                            >
                                                {i}
                                            </button>
                                        );
                                    }

                                    // Right ellipsis
                                    if (showRightEllipsis) {
                                        pages.push(
                                            <span
                                                key="right-ellipsis"
                                                className="relative inline-flex items-center px-3 py-1.5 text-xs text-gray-700 ring-1 ring-gray-300 ring-inset"
                                            >
                                                ...
                                            </span>
                                        );
                                    }

                                    // Last page
                                    if (totalPages > 1) {
                                        pages.push(
                                            <button
                                                key={totalPages}
                                                onClick={() => fetchDetailedPage(selectedRemark, totalPages, debouncedSearchTerm)}
                                                className={`relative inline-flex items-center px-3 py-1.5 text-xs font-medium ${detailedPage === totalPages
                                                    ? 'z-10 bg-blue-600 text-white'
                                                    : 'text-gray-700 ring-1 ring-gray-300 ring-inset hover:bg-gray-50'
                                                    }`}
                                            >
                                                {totalPages}
                                            </button>
                                        );
                                    }

                                    return pages;
                                })()}

                                {/* Next Page */}
                                <button
                                    onClick={() => fetchDetailedPage(selectedRemark, detailedPage + 1, debouncedSearchTerm)}
                                    disabled={!detailedHasNext || isDetailedLoading}
                                    className="relative inline-flex items-center px-1.5 py-1.5 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </button>

                                {/* Last Page */}
                                <button
                                    onClick={() => fetchDetailedPage(selectedRemark, Math.ceil(detailedTotalCount / detailedPageSize), debouncedSearchTerm)}
                                    disabled={!detailedHasNext || isDetailedLoading}
                                    className="relative inline-flex items-center rounded-r-md px-1.5 py-1.5 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                    <ChevronRight className="h-3.5 w-3.5 -ml-1.5" />
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    ), [
        selectedRemark,
        selectedRemarkData,
        detailedPage,
        detailedPageSize,
        detailedTotalCount,
        detailedHasNext,
        detailedHasPrev,
        isDetailedLoading,
        detailedSearchTerm,
        detailedStartIndex,
        detailedEndIndex,
        filteredDetailedData
    ]);

    /**
     * Mobile Filter Modal Overlay for Detailed View
     * @returns {JSX.Element} The mobile filter overlay component
     */
    const MobileDetailedFilterOverlay = () => (
        <div
            className={`md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex flex-col transition-opacity duration-300 ${isMobileDetailedFiltersOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={closeMobileDetailedFilters}
        >
            <div className="relative mt-auto px-1">
                {/* Stacked background layers for stack-like effect */}
                <div
                    className={`pointer-events-none absolute inset-x-0 bottom-2 mx-2 rounded-t-2xl bg-white shadow-lg transform transition-all duration-300 ease-out ${isMobileDetailedFiltersOpen ? 'translate-y-0 scale-95 opacity-70' : 'translate-y-full scale-95 opacity-0'}`}
                />
                <div
                    className={`pointer-events-none absolute inset-x-0 bottom-4 mx-4 rounded-t-2xl bg-white shadow-md transform transition-all duration-300 delay-75 ease-out ${isMobileDetailedFiltersOpen ? 'translate-y-0 scale-90 opacity-50' : 'translate-y-full scale-90 opacity-0'}`}
                />

                {/* Main bottom sheet */}
                <div
                    className={`relative bg-white rounded-t-2xl shadow-xl transform transition-all duration-300 ease-out ${isMobileDetailedFiltersOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Mobile Filter Header */}
                    <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-2xl">
                        <h3 className="text-lg font-semibold text-white flex items-center">
                            <Filter className="w-5 h-5 mr-2" />
                            Date Filters
                        </h3>
                        <button
                            onClick={closeMobileDetailedFilters}
                            className="p-2 hover:bg-blue-700 rounded-full transition-colors duration-200"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    {/* Mobile Filter Content */}
                    <div className="p-2 max-h-[70vh] overflow-y-auto">
                        <div className="space-y-3">
                            {/* From Date */}
                            <div>
                                <label htmlFor="detailed-from-date" className="block text-sm font-medium text-gray-700 mb-2 cursor-pointer">
                                    <Calendar className="w-4 h-4 inline mr-2" />
                                    From Date
                                </label>
                                <input
                                    id="detailed-from-date"
                                    type="date"
                                    value={detailedFilters.fromDate}
                                    onChange={(e) => handleDetailedFilterChange('fromDate', e.target.value)}
                                    onFocus={(e) => { try { e.target.showPicker && e.target.showPicker(); } catch (err) { } }}
                                    className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 cursor-text"
                                />
                            </div>

                            {/* To Date */}
                            <div>
                                <label htmlFor="detailed-to-date" className="block text-sm font-medium text-gray-700 mb-2 cursor-pointer">
                                    <Calendar className="w-4 h-4 inline mr-2" />
                                    To Date
                                </label>
                                <input
                                    id="detailed-to-date"
                                    type="date"
                                    value={detailedFilters.toDate}
                                    onChange={(e) => handleDetailedFilterChange('toDate', e.target.value)}
                                    onFocus={(e) => { try { e.target.showPicker && e.target.showPicker(); } catch (err) { } }}
                                    className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 cursor-text"
                                />
                            </div>
                        </div>

                        {/* Mobile Filter Actions */}
                        <div className="flex space-x-3 mt-6 pt-4 border-t border-gray-200">
                            <button
                                onClick={() => {
                                    handleClearDetailedFilters();
                                    closeMobileDetailedFilters();
                                }}
                                className="flex-1 px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
                            >
                                <X className="w-4 h-4" />
                                <span className="font-medium">Clear Filters</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Show detailed view if a remark is selected
    if (showDetailedView) {
        return (
            <>
                {DetailedView}
                {showMobileDetailedFilters && <MobileDetailedFilterOverlay />}
                {isViewModalOpen && <CandidateDetailsModal />}
                {showFeedbackModal && selectedCandidateForFeedback && (
                    <FeedbackModal
                        key={`feedback-${selectedCandidateForFeedback.id}-${selectedCandidateForFeedback._forceRefresh}`}
                        isOpen={showFeedbackModal}
                        onClose={handleCloseFeedbackModal}
                        candidate={selectedCandidateForFeedback}
                        clientJobId={selectedCandidateForFeedback?.clientJobId || selectedCandidateForFeedback?.selectedClientJob?.id || null}
                    />
                )}
            </>
        );
    }

    // Show loading state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">
                        {selectedRemark
                            ? `Loading all candidates for "${selectedRemark}"...`
                            : 'Loading DataBank report...'
                        }
                    </p>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-xl mb-4">⚠️ Error</div>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => fetchData()}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }


    return (
        <div className="min-h-screen  space-y-1">
            {/* Header Section */}
            <div className="bg-white rounded-sm  border border-gray-200">
                <div className="px-2 py-1 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <div className="p-1 bg-gradient-to-r from-blue-400 to-blue-500 rounded-lg">
                                <Database className="w-3 h-3 text-white" />
                            </div>
                            <div>
                                <h1 className="text-md font-bold text-gray-900">Data Bank Report</h1>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            {/* Mobile Filter Toggle */}
                            <button
                                onClick={() => {
                                    if (!showMobileFilters) {
                                        openMobileFilters();
                                    } else {
                                        closeMobileFilters();
                                    }
                                }}
                                className="md:hidden p-1.5 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors duration-200"
                                title="Toggle Filters"
                            >
                                <Filter className="w-3 h-3 text-blue-600" />
                            </button>
                            <div className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                <span className="hidden sm:inline">Total Records: </span>{totalRecords}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-sm mt-2  border border-gray-200">
                {/* Filter Section - Desktop (always visible) */}
                <div className="hidden md:block">
                    <div className="p-3 border-t border-gray-100">
                        {/* Responsive Filter Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-2">
                            {/* From Date */}
                            <div>
                                <label htmlFor="filter-from-date" className="block text-xs font-medium text-gray-700 mb-2 cursor-pointer">
                                    <Calendar className="w-4 h-4 inline mr-1" />
                                    From Date
                                </label>
                                <input
                                    id="filter-from-date"
                                    type="date"
                                    value={filters.fromDate}
                                    onChange={(e) => handleInputChange('fromDate', e.target.value)}
                                    onFocus={(e) => { try { e.target.showPicker && e.target.showPicker(); } catch (err) { } }}
                                    className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 cursor-text"
                                />
                            </div>

                            {/* To Date */}
                            <div>
                                <label htmlFor="filter-to-date" className="block text-xs font-medium text-gray-700 mb-2 cursor-pointer">
                                    <Calendar className="w-4 h-4 inline mr-1" />
                                    To Date
                                </label>
                                <input
                                    id="filter-to-date"
                                    type="date"
                                    value={filters.toDate}
                                    onChange={(e) => handleInputChange('toDate', e.target.value)}
                                    onFocus={(e) => { try { e.target.showPicker && e.target.showPicker(); } catch (err) { } }}
                                    className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 cursor-text"
                                />
                            </div>

                            {/* Client */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">
                                    <Users className="w-4 h-4 inline mr-1" />
                                    Client
                                </label>
                                <select
                                    value={filters.client}
                                    onChange={(e) => handleInputChange('client', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                    disabled={loadingDropdowns.clients}
                                >
                                    <option value="">
                                        {loadingDropdowns.clients ? 'Loading clients...' : 'All Clients'}
                                    </option>
                                    {clientOptions.map(client => (
                                        <option key={client.value} value={client.value}>
                                            {client.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Executive */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">
                                    <User className="w-4 h-4 inline mr-1" />
                                    Executive
                                </label>
                                <select
                                    value={filters.executive}
                                    onChange={(e) => handleInputChange('executive', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                    disabled={loadingDropdowns.executives}
                                >
                                    <option value="">
                                        {loadingDropdowns.executives ? 'Loading executives...' : 'All Executives'}
                                    </option>
                                    {executiveOptions.map(executive => (
                                        <option key={executive.uniqueKey} value={executive.value}>
                                            {executive.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* State */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">
                                    <MapPin className="w-4 h-4 inline mr-1" />
                                    State
                                </label>
                                <select
                                    value={filters.state}
                                    onChange={(e) => handleStateChange(e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                    disabled={locationLoading}
                                >
                                    <option value="">
                                        {locationLoading ? 'Loading states...' : 'All States'}
                                    </option>
                                    {stateOptions.map(state => (
                                        <option key={state.id || state.value} value={state.value}>
                                            {state.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* City */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">
                                    <MapPin className="w-4 h-4 inline mr-1" />
                                    City
                                </label>
                                <select
                                    value={filters.city}
                                    onChange={(e) => handleInputChange('city', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
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

                            {/* Apply Button */}
                            <div className="flex items-end space-x-2">
                                <button
                                    onClick={handleApplyFilters}
                                    className="flex-1 px-2 py-1 text-xs bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center space-x-1 shadow-md hover:shadow-lg transform hover:scale-105"
                                >
                                    <Search className="w-3 h-3" />
                                    <span className="font-medium">Apply</span>
                                </button>
                                <button
                                    onClick={handleClearFilters}
                                    className="flex-1 px-2 py-1 text-xs bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-all duration-200 flex items-center justify-center space-x-1 shadow-md hover:shadow-lg"
                                >
                                    <X className="w-3 h-3" />
                                    <span className="font-medium">Clear</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Statistics Cards - Only show when filters are applied and data is available
            {hasAppliedFilters && filteredData.length > 0 && (
                <div className="grid grid-cols-3 md:grid-cols-3 gap-1">
                    <div className="bg-white p-2 md:p-3 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-600">Total Remarks</p>
                                <p className="text-sm md:text-lg font-bold text-gray-900">{filteredData.length}</p>
                                <p className="text-xs text-gray-500">{remarksWithData} with data</p>
                            </div>
                            <div className="p-1 md:p-2 bg-blue-100 rounded-full">
                                <FileText className="w-3 h-3 md:w-4 md:h-4 text-blue-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-2 md:p-3 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-600">Filtered Records</p>
                                <p className="text-sm md:text-lg font-bold text-blue-600">{totalRecords}</p>
                                <p className="text-xs text-gray-500">matching filters</p>
                            </div>
                            <div className="p-1 md:p-2 bg-blue-100 rounded-full">
                                <BarChart3 className="w-3 h-3 md:w-4 md:h-4 text-blue-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-2 md:p-3 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-600">Match Rate</p>
                                <p className="text-sm md:text-lg font-bold text-green-600">{filteredData.length > 0 ? Math.round((remarksWithData / filteredData.length) * 100) : 0}%</p>
                                <p className="text-xs text-gray-500">remarks with data</p>
                            </div>
                            <div className="p-1 md:p-2 bg-green-100 rounded-full">
                                <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
                            </div>
                        </div>
                    </div>
                </div>
            )} */}

            {/* Data Table Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {hasAppliedFilters && filteredData.length > 0 && (
                    <div className="px-2 py-1 md:px-3 md:py-2 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1 md:space-x-2">
                                <label className="text-xs font-medium text-gray-700 hidden sm:inline">Show:</label>
                                <select
                                    value={summaryItemsPerPage}
                                    onChange={(e) => handleSummaryPageSizeChange(Number(e.target.value))}
                                    className="px-1 py-1 md:px-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>
                            <div className="text-xs text-gray-600">
                                <span className="hidden sm:inline">Showing </span>{summaryStartIndex + 1}-{Math.min(summaryStartIndex + summaryItemsPerPage, filteredData.length)} of {filteredData.length}
                            </div>
                        </div>
                    </div>
                )}

                {/* Responsive Table Container */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        {/* Table Header */}
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                            <tr>
                                <th className="px-2 py-1 md:px-3 md:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                                    S.No
                                </th>
                                <th className="px-2 py-1 md:px-3 md:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                                    Remark
                                </th>
                                <th className="px-2 py-1 md:px-3 md:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                                    Count
                                </th>
                            </tr>
                        </thead>

                        {/* Table Body */}
                        <tbody className="bg-white divide-y divide-gray-200">
                            {!hasAppliedFilters ? (
                                // Empty state - no filters applied
                                <tr>
                                    <td colSpan="3" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                                <AlertCircle className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <div className="text-gray-500">
                                                <h3 className="text-lg font-medium mb-2">No Data to Display</h3>
                                                <p className="text-sm">Please apply at least one filter to view the DataBank report.</p>
                                                <p className="text-xs text-gray-400 mt-1">Use the filters above to get started.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : loading ? (
                                // Loading state
                                <tr>
                                    <td colSpan="3" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            <p className="text-gray-500 text-sm">Loading data...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : error ? (
                                // Error state
                                <tr>
                                    <td colSpan="3" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                                                <AlertCircle className="w-8 h-8 text-red-400" />
                                            </div>
                                            <div className="text-red-500">
                                                <h3 className="text-lg font-medium mb-2">Error Loading Data</h3>
                                                <p className="text-sm">{error}</p>
                                                <button
                                                    onClick={() => fetchData()}
                                                    className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                                                >
                                                    Retry
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedSummaryData.length === 0 ? (
                                // No results state
                                <tr>
                                    {/* <td colSpan="3" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                                <Database className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <div className="text-gray-500">
                                                <h3 className="text-lg font-medium mb-2">No Results Found</h3>
                                                <p className="text-sm">No data matches the applied filters.</p>
                                                {appliedFilters.fromDate && appliedFilters.toDate && (
                                                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                        <p className="text-xs text-yellow-700 font-medium">📅 Date Range Issue</p>
                                                        <p className="text-xs text-yellow-600 mt-1">
                                                            Filtering by: {appliedFilters.fromDate} to {appliedFilters.toDate}
                                                        </p>
                                                        <p className="text-xs text-yellow-600 mt-1">
                                                            Try expanding your date range or clearing date filters to see more data.
                                                        </p>
                                                        <div className="flex space-x-2 mt-2">
                                                            <button
                                                                onClick={() => {
                                                                    setFilters(prev => ({ ...prev, fromDate: '', toDate: '' }));
                                                                    const clearedFilters = { ...appliedFilters, fromDate: '', toDate: '' };
                                                                    setAppliedFilters(clearedFilters);
                                                                    fetchData(clearedFilters);
                                                                }}
                                                                className="px-3 py-1 text-xs bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors duration-200"
                                                            >
                                                                Clear Date Filters
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    const thirtyDaysAgo = new Date();
                                                                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                                                                    const today = new Date();
                                                                    const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
                                                                    const toDate = today.toISOString().split('T')[0];

                                                                    setFilters(prev => ({ ...prev, fromDate, toDate }));
                                                                    const expandedFilters = { ...appliedFilters, fromDate, toDate };
                                                                    setAppliedFilters(expandedFilters);
                                                                    fetchData(expandedFilters);
                                                                }}
                                                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
                                                            >
                                                                Last 30 Days
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                                <p className="text-xs text-gray-400 mt-2">Try adjusting your filter criteria or clearing all filters.</p>
                                            </div>
                                        </div>
                                    </td> */}
                                </tr>
                            ) : (
                                // Data rows
                                paginatedSummaryData.map((item, index) => (
                                    <tr
                                        key={item.sno}
                                        className="hover:bg-blue-50 transition-colors duration-200 cursor-pointer"
                                    >
                                        <td className="px-2 py-1 md:px-3 md:py-2 whitespace-nowrap text-xs text-gray-900 font-medium">
                                            {summaryStartIndex + index + 1}
                                        </td>
                                        <td className="px-2 py-1 md:px-3 md:py-2 text-xs text-gray-700">
                                            <div className="flex items-center">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 md:mr-3 flex-shrink-0"></div>
                                                <span className="truncate">{item.remarks || item.remark}</span>
                                            </div>
                                        </td>
                                        <td className="px-2 py-1 md:px-3 md:py-2 whitespace-nowrap text-xs font-semibold">
                                            {(item.total_count || item.filtered_count || 0) > 0 ? (
                                                <button
                                                    onClick={() => handleCountClick(item)}
                                                    className="inline-flex items-center px-2 py-1 md:px-3 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 hover:text-blue-900 transition-all duration-200 cursor-pointer transform hover:scale-105"
                                                    title="Click to view detailed candidates"
                                                >
                                                    {item.total_count || item.filtered_count}
                                                </button>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 md:px-3 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                                    0
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {hasAppliedFilters && filteredData.length > 0 && summaryTotalPages > 1 && (
                    <div className="px-2 py-1 md:px-3 md:py-2 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-700">
                                <span className="hidden sm:inline">Showing </span>{summaryStartIndex + 1}-{Math.min(summaryStartIndex + summaryItemsPerPage, filteredData.length)} of {filteredData.length}
                            </div>
                            <div className="flex items-center space-x-1 md:space-x-2">
                                <button
                                    onClick={() => handleSummaryPageChange(summaryCurrentPage - 1)}
                                    disabled={summaryCurrentPage === 1}
                                    className="px-2 py-1 md:px-3 text-xs bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="hidden sm:inline">Previous</span>
                                    <span className="sm:hidden">Prev</span>
                                </button>

                                {Array.from({ length: Math.min(5, summaryTotalPages) }, (_, i) => {
                                    const pageNum = Math.max(1, Math.min(summaryTotalPages - 4, summaryCurrentPage - 2)) + i;
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => handleSummaryPageChange(pageNum)}
                                            className={`px-2 py-1 md:px-3 text-xs rounded-md ${summaryCurrentPage === pageNum
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-white border border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                <button
                                    onClick={() => handleSummaryPageChange(summaryCurrentPage + 1)}
                                    disabled={summaryCurrentPage === summaryTotalPages}
                                    className="px-2 py-1 md:px-3 text-xs bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="hidden sm:inline">Next</span>
                                    <span className="sm:hidden">Next</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}


            </div>

            {/* ViewModal */}
            {isViewModalOpen && <CandidateDetailsModal />}

            {/* Mobile Filter Modal Overlay */}
            {showMobileFilters && (
                <div
                    className={`md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex flex-col transition-opacity duration-300 ${isMobileFiltersOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={closeMobileFilters}
                >
                    <div className="relative mt-auto px-1">
                        {/* Stacked background layers for stack-like effect */}
                        <div
                            className={`pointer-events-none absolute inset-x-0 bottom-2 mx-2 rounded-t-2xl bg-white shadow-lg transform transition-all duration-300 ease-out ${isMobileFiltersOpen ? 'translate-y-0 scale-95 opacity-70' : 'translate-y-full scale-95 opacity-0'}`}
                        ></div>
                        <div
                            className={`pointer-events-none absolute inset-x-0 bottom-4 mx-4 rounded-t-2xl bg-white shadow-md transform transition-all duration-300 delay-75 ease-out ${isMobileFiltersOpen ? 'translate-y-0 scale-90 opacity-50' : 'translate-y-full scale-90 opacity-0'}`}
                        ></div>

                        {/* Main bottom sheet */}
                        <div
                            className={`relative bg-white rounded-t-2xl shadow-xl transform transition-all duration-300 ease-out ${isMobileFiltersOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Mobile Filter Header */}
                            <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gradient-to-r from-blue-400 to-blue-500 rounded-t-2xl">
                                <h3 className="text-lg font-semibold text-white flex items-center">
                                    <Filter className="w-5 h-5 mr-2" />
                                    Filters
                                </h3>
                                <button
                                    onClick={closeMobileFilters}
                                    className="p-2 hover:bg-blue-600 rounded-full transition-colors duration-200"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>

                            {/* Mobile Filter Content */}
                            <div className="p-2 max-h-[70vh] overflow-y-auto">
                                <div className="space-y-3">
                                    {/* From Date */}
                                    <div>
                                        <label htmlFor="mobile-filter-from-date" className="block text-sm font-medium text-gray-700 mb-2 cursor-pointer">
                                            <Calendar className="w-4 h-4 inline mr-2" />
                                            From Date
                                        </label>
                                        <input
                                            id="mobile-filter-from-date"
                                            type="date"
                                            value={filters.fromDate}
                                            onChange={(e) => handleInputChange('fromDate', e.target.value)}
                                            onFocus={(e) => { try { e.target.showPicker && e.target.showPicker(); } catch (err) { } }}
                                            className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 cursor-text"
                                        />
                                    </div>

                                    {/* To Date */}
                                    <div>
                                        <label htmlFor="mobile-filter-to-date" className="block text-sm font-medium text-gray-700 mb-2 cursor-pointer">
                                            <Calendar className="w-4 h-4 inline mr-2" />
                                            To Date
                                        </label>
                                        <input
                                            id="mobile-filter-to-date"
                                            type="date"
                                            value={filters.toDate}
                                            onChange={(e) => handleInputChange('toDate', e.target.value)}
                                            onFocus={(e) => { try { e.target.showPicker && e.target.showPicker(); } catch (err) { } }}
                                            className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 cursor-text"
                                        />
                                    </div>

                                    {/* Client */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <Users className="w-4 h-4 inline mr-2" />
                                            Client
                                        </label>
                                        <select
                                            value={filters.client}
                                            onChange={(e) => handleInputChange('client', e.target.value)}
                                            className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                            disabled={loadingDropdowns.clients}
                                        >
                                            <option value="">
                                                {loadingDropdowns.clients ? 'Loading clients...' : 'All Clients'}
                                            </option>
                                            {clientOptions.map(client => (
                                                <option key={client.value} value={client.value}>
                                                    {client.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Executive */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <User className="w-4 h-4 inline mr-2" />
                                            Executive
                                        </label>
                                        <select
                                            value={filters.executive}
                                            onChange={(e) => handleInputChange('executive', e.target.value)}
                                            className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                            disabled={loadingDropdowns.executives}
                                        >
                                            <option value="">
                                                {loadingDropdowns.executives ? 'Loading executives...' : 'All Executives'}
                                            </option>
                                            {executiveOptions.map(executive => (
                                                <option key={executive.uniqueKey} value={executive.value}>
                                                    {executive.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* State */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <MapPin className="w-4 h-4 inline mr-2" />
                                            State
                                        </label>
                                        <select
                                            value={filters.state}
                                            onChange={(e) => handleStateChange(e.target.value)}
                                            className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                            disabled={locationLoading}
                                        >
                                            <option value="">
                                                {locationLoading ? 'Loading states...' : 'All States'}
                                            </option>
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
                                            <MapPin className="w-4 h-4 inline mr-2" />
                                            City
                                        </label>
                                        <select
                                            value={filters.city}
                                            onChange={(e) => handleInputChange('city', e.target.value)}
                                            className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
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
                                </div>

                                {/* Mobile Filter Actions */}
                                <div className="flex space-x-3 mt-6 pt-4 border-t border-gray-200">
                                    <button
                                        onClick={() => {
                                            handleApplyFilters();
                                            closeMobileFilters();
                                        }}
                                        className="flex-1 px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transform hover:scale-105"
                                    >
                                        <Search className="w-4 h-4" />
                                        <span className="font-medium">Apply Filters</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleClearFilters();
                                            closeMobileFilters();
                                        }}
                                        className="flex-1 px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
                                    >
                                        <X className="w-4 h-4" />
                                        <span className="font-medium">Clear All</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ViewModal for candidate details */}
            <CandidateDetailsModal />
        </div>
    );
};

export default DataBank;