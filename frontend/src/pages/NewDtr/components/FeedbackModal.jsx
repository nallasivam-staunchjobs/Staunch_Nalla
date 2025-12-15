import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MessageSquare, DollarSign, IndianRupee, Search, Phone, PhoneOff, Clock } from 'lucide-react'
import { clientJobs } from '../../../api/api'
import { revenueService } from '../../../api/revenueService'
import toast from 'react-hot-toast'
import { useLocation, useNavigate } from 'react-router-dom'
import { fetchEmployeeName, getEmployeeNameFromCache } from '../utils'
import { useSelector } from 'react-redux'

const FeedbackModal = ({ isOpen, onClose, candidate, clientJobId = null }) => {
    const { user } = useSelector((state) => state.auth) || {};
    // Get user role from Redux or localStorage
    const userRole = user?.userRole || localStorage.getItem('userRole') || localStorage.getItem('temp_auth_userRole');
    const location = useLocation()
    const navigate = useNavigate()

    const [activeTab, setActiveTab] = useState('feedback')
    const [feedbackData, setFeedbackData] = useState([])
    const [revenueData, setRevenueData] = useState([])
    const [revenueFeedbacks, setRevenueFeedbacks] = useState({})
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingRevenue, setIsLoadingRevenue] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentClientJob, setCurrentClientJob] = useState(null)

    // URL change handling state
    const [previousLocation, setPreviousLocation] = useState(location.pathname)
    const [isUrlChangeDetected, setIsUrlChangeDetected] = useState(false)
    const [shouldReload, setShouldReload] = useState(false)
    const [dateFilter, setDateFilter] = useState({
        from: '',
        to: '',
        type: 'created' // 'created' or 'updated'
    })
    const [employeeNames, setEmployeeNames] = useState({});
    const [failedEmployeeCodes, setFailedEmployeeCodes] = useState(new Set());

    // Add caching for feedback data to prevent repeated API calls
    const [feedbackCache, setFeedbackCache] = useState({});
    const [lastFetchTime, setLastFetchTime] = useState(null);
    const CACHE_TIMEOUT = 5 * 1000; // 5 seconds cache (very short for NFD updates)

    // Loading progress state
    const [loadingProgress, setLoadingProgress] = useState('');

    // Using shared fetchEmployeeName utility

    // URL change detection and handling
    useEffect(() => {
        const currentPath = location.pathname;

        // Check if URL has changed
        if (currentPath !== previousLocation) {
            setIsUrlChangeDetected(true);
            setPreviousLocation(currentPath);

            // If modal is open during URL change, handle it
            if (isOpen) {
                // Option 1: Close modal and clear cache
                setFeedbackCache({}); // Clear cache to force fresh data
                setFeedbackData([]);
                setRevenueData([]);
                setShouldReload(true);

                // Close modal with a slight delay to allow state updates
                setTimeout(() => {
                    onClose();
                    toast.info('Modal closed due to page navigation');
                }, 100);

                // Option 2: Alternative - Force reload data without closing modal
                // Uncomment below if you prefer to keep modal open but refresh data
                /*
                console.log('🔄 Reloading FeedbackModal data due to URL change');
                setFeedbackCache({}); // Clear cache
                setShouldReload(true);
                
                // Force refresh data if candidate is available
                const candidateId = candidate?.candidateId || candidate?.id;
                if (candidateId) {
                    setTimeout(() => {
                        fetchFeedbackData();
                        fetchRevenueData();
                    }, 200);
                }
                */
            }
        }

        // Reset URL change detection flag after handling
        if (isUrlChangeDetected) {
            setTimeout(() => setIsUrlChangeDetected(false), 1000);
        }
    }, [location.pathname, previousLocation, isOpen, isUrlChangeDetected, onClose]);

    // Debug: Log candidate object to see available properties
    useEffect(() => {
        if (isOpen && candidate) {
            // Intentionally left blank: no runtime logging
        }
    }, [isOpen, candidate]);

    // Fetch feedback and revenue data when modal opens
    useEffect(() => {
        const candidateId = candidate?.candidateId || candidate?.id;
        if (isOpen && candidateId) {
            // Check if we need to reload due to URL change
            if (shouldReload) {
                setFeedbackCache({}); // Clear cache to ensure fresh data
                setShouldReload(false);
            }

            fetchFeedbackData()
            fetchRevenueData()
        }
    }, [isOpen, candidate?.id, candidate?.candidateId, clientJobId, shouldReload])

    // Listen for feedback updates from ViewModal
    useEffect(() => {
        const handleFeedbackUpdate = (event) => {
            if (isOpen) {
                setTimeout(() => {
                    fetchFeedbackData();
                }, 500); // Small delay to ensure backend is updated
            }
        };

        window.addEventListener('feedbackUpdated', handleFeedbackUpdate);
        window.addEventListener('candidateUpdated', handleFeedbackUpdate);

        return () => {
            window.removeEventListener('feedbackUpdated', handleFeedbackUpdate);
            window.removeEventListener('candidateUpdated', handleFeedbackUpdate);
        };
    }, [isOpen])

    // Fetch employee names when FeedbackModal opens
    useEffect(() => {
        const fetchEmployeeNames = async () => {
            if (isOpen && feedbackData.length > 0) {
                // Get unique employee codes from feedback data
                const employeeCodes = new Set();

                // Add executive name from candidate's database data
                if (candidate?.backendData?.executive_name && candidate.backendData.executive_name !== 'Loggers') {
                    employeeCodes.add(candidate.backendData.executive_name);
                }

                // Add executive names from feedback entries
                feedbackData.forEach(entry => {
                    if (entry.executive_name && entry.executive_name !== 'Loggers' && !employeeNames[entry.executive_name]) {
                        employeeCodes.add(entry.executive_name);
                    }
                });

                // Fetch names for all unique employee codes in parallel for better performance
                const employeeCodeArray = Array.from(employeeCodes).filter(code =>
                    !employeeNames[code] && !failedEmployeeCodes.has(code)
                );

                if (employeeCodeArray.length > 0) {
                    await Promise.allSettled(
                        employeeCodeArray.map(employeeCode => fetchEmployeeName(employeeCode))
                    );
                }
            }
        };

        fetchEmployeeNames();
    }, [isOpen, feedbackData]);

    const fetchFeedbackData = async () => {
        setIsLoading(true)
        setLoadingProgress('Initializing...')
        try {
            // Check if this is a DataBank candidate - still fetch feedback data but use provided client job context
            if (candidate?.isFromDataBank) {
                // Use the client jobs data provided by DataBank for context
                const clientJobsData = candidate.client_jobs || [];
                setCurrentClientJob(clientJobsData[0] || null);

                // Continue with normal feedback fetching process for DataBank candidates
                // Don't return here - let it fetch the actual feedback data
            }

            const candidateId = candidate?.candidateId || candidate?.id;

            if (!candidateId) {
                throw new Error('No candidate ID available');
            }

            // Check cache first to prevent repeated API calls
            // Use custom cache key if provided (for cache bypass), otherwise use default
            const baseCacheKey = candidate._cacheKey || candidateId;
            const cacheKey = `${baseCacheKey}-${clientJobId || 'all'}`;
            const now = Date.now();

            // Skip cache if bypass flag is set OR for NFD updates
            const shouldBypassCache = candidate._bypassCache || candidate._fromDailyReports || true; // Always bypass cache for NFD updates

            if (!shouldBypassCache && feedbackCache[cacheKey] && lastFetchTime && (now - lastFetchTime) < CACHE_TIMEOUT) {
                setFeedbackData(feedbackCache[cacheKey]);
                setIsLoading(false);
                setLoadingProgress('');
                return;
            }



            let allFeedbackEntries = [];

            if (clientJobId) {
                // Fetch feedback for specific client job only
                try {
                    setLoadingProgress('Fetching client job details...')
                    // First, get client job details to verify it exists
                    const clientJobsData = await clientJobs.getByCandidate(candidateId);
                    const specificClientJob = clientJobsData.find(job => job.id === clientJobId);

                    if (specificClientJob) {
                        setLoadingProgress('Loading feedback entries...')
                        // ClientJob exists, fetch feedback entries
                        const feedbackResponse = await clientJobs.getFeedbackEntries(clientJobId);
                        const entries = feedbackResponse.feedback_entries || [];

                        // Store current client job info
                        setCurrentClientJob(specificClientJob);

                        // Add client job info to each feedback entry
                        const entriesWithJobInfo = (entries || []).map(entry => ({
                            ...entry,
                            clientJobId: clientJobId,
                            clientName: specificClientJob?.client_name || 'Unknown Client',
                            designation: specificClientJob?.designation || 'Unknown Position'
                        }));

                        allFeedbackEntries = entriesWithJobInfo;
                    } else {
                        console.warn(`ClientJob with ID ${clientJobId} not found for candidate ${candidateId}`);
                        setCurrentClientJob(null);
                        // Fall back to fetching all client jobs for this candidate
                        // Continue to the else block to fetch all client jobs
                        try {
                            const feedbackResponse = await clientJobs.getFeedbackEntries(clientJobId);
                            const entries = feedbackResponse.feedback_entries || [];
                            const entriesWithJobInfo = (entries || []).map(entry => ({
                                ...entry,
                                clientJobId: clientJobId,
                                clientName: 'Unknown Client',
                                designation: 'Unknown Position'
                            }));
                            allFeedbackEntries = entriesWithJobInfo;
                        } catch (e) {
                            // ignore and let fallback logic continue
                        }
                    }
                } catch (error) {
                    console.error(`Error fetching feedback for client job ${clientJobId}:`, error);
                    setCurrentClientJob(null);
                    // Fall back to fetching all client jobs for this candidate
                    // Continue to the else block to fetch all client jobs
                }
            }

            if (!clientJobId || allFeedbackEntries.length === 0) {
                setCurrentClientJob(null);
                setLoadingProgress('Fetching all client jobs...')
                // Get all client jobs for this candidate (existing behavior)
                const clientJobsData = await clientJobs.getByCandidate(candidateId);

                if (!clientJobsData || clientJobsData.length === 0) {
                    setFeedbackData([]);
                    return;
                }

                setLoadingProgress('Processing feedback data...')
                // Collect all feedback entries from all client jobs
                // Filter out invalid client jobs first to prevent 404 errors
                const validClientJobs = clientJobsData.filter(clientJob => {
                    // Basic validation checksx
                    if (!clientJob.id || typeof clientJob.id !== 'number' || clientJob.id <= 0) {
                        return false;
                    }

                    // If _showAllFeedback flag is set (from DailyReports), show all client jobs
                    if (candidate._showAllFeedback) {
                        return true;
                    }

                    // Check if feedback exists and has meaningful content
                    if (!clientJob.feedback ||
                        typeof clientJob.feedback !== 'string' ||
                        clientJob.feedback.trim() === '' ||
                        clientJob.feedback === 'null' ||
                        clientJob.feedback === 'undefined') {
                        return false;
                    }

                    // Relaxed validation - only skip obviously empty feedback
                    const feedbackContent = clientJob.feedback.trim().toLowerCase();
                    if (feedbackContent === 'no feedback' ||
                        feedbackContent === 'none' ||
                        feedbackContent === 'n/a' ||
                        feedbackContent === 'na') {
                        return false;
                    }

                    return true;
                });

                for (const clientJob of validClientJobs) {
                    try {
                        // Use backend get-feedback-entries endpoint for each client job
                        const feedbackResponse = await clientJobs.getFeedbackEntries(clientJob.id);
                        const entries = (feedbackResponse && Array.isArray(feedbackResponse.feedback_entries))
                            ? feedbackResponse.feedback_entries
                            : [];

                        if (!entries || entries.length === 0) {
                            continue;
                        }

                        // Add client job info to each feedback entry
                        const entriesWithJobInfo = entries.map(entry => ({
                            ...entry,
                            clientJobId: clientJob.id,
                            clientName: clientJob.client_name,
                            designation: clientJob.designation
                        }));

                        allFeedbackEntries = [...allFeedbackEntries, ...entriesWithJobInfo];
                    } catch (error) {
                        // More specific error handling
                        if (error.response && error.response.status === 404) {
                            console.warn(`ClientJob ${clientJob.id} not found on server, skipping`);
                        } else {
                            console.warn(`Error fetching feedback entries for ClientJob ${clientJob.id}:`, error.message);
                        }
                        // Continue processing other client jobs
                    }
                }
            }

            setLoadingProgress('Finalizing feedback data...')

            // Sort by full datetime (date + time) to ensure chronological order (oldest first)
            const sortedFeedbackEntries = allFeedbackEntries;

            setFeedbackData(sortedFeedbackEntries);

            // Cache the result to prevent repeated API calls
            // cacheKey already declared above, reuse it
            setFeedbackCache(prev => ({
                ...prev,
                [cacheKey]: sortedFeedbackEntries
            }));
            setLastFetchTime(Date.now());

        } catch (error) {
            console.error('Error fetching feedback:', error)
            toast.error('Failed to load feedback data')
            setFeedbackData([])
        } finally {
            setIsLoading(false)
            setLoadingProgress('')
        }
    }

    const fetchRevenueData = async () => {
        setIsLoadingRevenue(true)
        try {
            // Check if this is a DataBank candidate - skip revenue API calls
            if (candidate?.isFromDataBank) {
                setRevenueData([]); // DataBank candidates don't have revenue data
                setIsLoadingRevenue(false);
                return;
            }

            const candidateId = candidate?.candidateId || candidate?.id;
            if (!candidateId) {
                throw new Error('No candidate ID available');
            }

            const response = await revenueService.getRevenuesByCandidate(candidateId)

            // Normalize paginated or non-paginated responses into a flat array
            const revenues = Array.isArray(response)
                ? response
                : response && typeof response === 'object'
                    ? response.results || response.data || []
                    : [];

            setRevenueData(revenues)

            // Fetch feedback for each revenue record
            const feedbackPromises = revenues.map(async (revenue) => {
                try {
                    const feedbacks = await revenueService.getFeedbacksByRevenue(revenue.id)
                    return { revenueId: revenue.id, feedbacks: feedbacks || [] }
                } catch (error) {
                    console.error(`Error fetching feedback for revenue ${revenue.id}:`, error)
                    return { revenueId: revenue.id, feedbacks: [] }
                }
            })

            const feedbackResults = await Promise.all(feedbackPromises)
            const feedbackMap = {}
            feedbackResults.forEach(result => {
                feedbackMap[result.revenueId] = result.feedbacks
            })
            setRevenueFeedbacks(feedbackMap)

        } catch (error) {
            console.error('Error fetching revenue:', error)
            toast.error('Failed to load revenue data')
            setRevenueData([])
        } finally {
            setIsLoadingRevenue(false)
        }
    }

    // Close modal on escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            document.body.style.overflow = 'hidden'
        }

        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, onClose])

    // Reset tab and search when modal closes
    useEffect(() => {
        if (!isOpen) {
            setActiveTab('feedback')
            setSearchTerm('')
            // Reset URL change states when modal closes
            setIsUrlChangeDetected(false)
            setShouldReload(false)
        }
    }, [isOpen])

    // Cleanup function for component unmounting
    useEffect(() => {
        return () => {
            // Clear any pending timeouts and reset states on unmount
            setFeedbackCache({})
            setFeedbackData([])
            setRevenueData([])
            setIsUrlChangeDetected(false)
            setShouldReload(false)
        }
    }, [])

    const formatDate = (dateString, includeTime = false) => {
        if (!dateString) return 'N/A'
        const date = new Date(dateString)
        if (isNaN(date)) return 'N/A'

        // Format date as dd/mm/yyyy
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear()

        if (!includeTime) {
            return `${day}/${month}/${year}`
        }

        // Format time as hh:mm (24-hour format)
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')

        return `${day}/${month}/${year} ${hours}:${minutes}`
    }

    // Filter feedback data based on search term and date filter
    const filteredFeedbackData = feedbackData.filter(feedback => {
        // Text search filter
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase()
            let textMatch = false

            // Helper function to safely check string fields
            const checkField = (value) => {
                return value && typeof value === 'string' && value.toLowerCase().includes(searchLower)
            }

            // Search in structured feedback fields
            if (checkField(feedback.feedback)) {
                textMatch = true
            }

            if (checkField(feedback.remarks)) {
                textMatch = true
            }

            if (checkField(feedback.executive_name)) {
                textMatch = true
            }

            // Search in candidate executive name (from database)
            if (checkField(candidate?.backendData?.executive_name)) {
                textMatch = true
            }

            // Search in dates
            if (checkField(feedback.nfd_date) ||
                checkField(feedback.ejd_date) ||
                checkField(feedback.ifd_date) ||
                checkField(feedback.entry_time)) {
                textMatch = true
            }

            // Search in client info
            if (checkField(feedback.clientName) ||
                checkField(feedback.designation)) {
                textMatch = true
            }

            if (!textMatch) return false
        }

        // Date filter for feedback
        if (dateFilter.from || dateFilter.to) {
            // Use entry_time for feedback date filtering
            const feedbackDate = feedback.entry_time
            if (!feedbackDate) return false

            try {
                // Parse the entry_time which is in format "DD-MM-YYYY HH:mm:ss"
                let parsedDate
                if (feedbackDate.includes('-') && feedbackDate.includes(' ')) {
                    // Format: "03-09-2025 16:53:30"
                    const [datePart, timePart] = feedbackDate.split(' ')
                    const [day, month, year] = datePart.split('-')
                    parsedDate = new Date(`${year}-${month}-${day}T${timePart}`)
                } else {
                    // Fallback to direct parsing
                    parsedDate = new Date(feedbackDate)
                }

                if (isNaN(parsedDate.getTime())) return false

                const feedbackDateStr = parsedDate.toISOString().split('T')[0]

                if (dateFilter.from && feedbackDateStr < dateFilter.from) {
                    return false
                }

                if (dateFilter.to && feedbackDateStr > dateFilter.to) {
                    return false
                }
            } catch (e) {
                return false
            }
        }

        return true
    })

    // Filter revenue data based on search term and date filter
    const filteredRevenueData = revenueData.filter(revenue => {
        // Text search filter
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase()
            let textMatch = false

            // Helper function to safely check string and number fields
            const checkField = (value) => {
                if (!value) return false
                return value.toString().toLowerCase().includes(searchLower)
            }

            // Helper function to format date for search
            const formatDateForSearch = (dateString) => {
                if (!dateString) return ''
                try {
                    const date = new Date(dateString)
                    if (isNaN(date)) return ''
                    const day = date.getDate().toString().padStart(2, '0')
                    const month = (date.getMonth() + 1).toString().padStart(2, '0')
                    const year = date.getFullYear()
                    return `${day}${month}${year}`
                } catch (e) {
                    return ''
                }
            }

            // Search in revenue fields
            if (checkField(revenue.revenue) ||
                checkField(revenue.accountable_ctc) ||
                checkField(revenue.offer_ctc) ||
                checkField(revenue.percentage) ||
                checkField(revenue.invoice_number) ||
                checkField(revenue.revenue_status) ||
                checkField(revenue.client_name) ||
                checkField(revenue.job_title) ||
                checkField(revenue.remarks)) {
                textMatch = true
            }

            // Search in dates
            if (formatDateForSearch(revenue.created_at).includes(searchLower) ||
                formatDateForSearch(revenue.updated_at).includes(searchLower) ||
                formatDateForSearch(revenue.joining_date).includes(searchLower) ||
                formatDateForSearch(revenue.itbr_date).includes(searchLower) ||
                formatDateForSearch(revenue.erd_date).includes(searchLower) ||
                formatDateForSearch(revenue.br_date).includes(searchLower)) {
                textMatch = true
            }

            // Search in revenue feedback
            const revenueFeedbackList = revenueFeedbacks[revenue.id] || []
            for (const revFeedback of revenueFeedbackList) {
                if (checkField(revFeedback.feedback)) {
                    textMatch = true
                    break
                }
            }

            if (!textMatch) return false
        }

        // Date filter
        if (dateFilter.from || dateFilter.to) {
            const targetDate = dateFilter.type === 'created' ? revenue.created_at : revenue.updated_at
            if (!targetDate) return false

            try {
                const revenueDate = new Date(targetDate).toISOString().split('T')[0]

                if (dateFilter.from && revenueDate < dateFilter.from) {
                    return false
                }

                if (dateFilter.to && revenueDate > dateFilter.to) {
                    return false
                }
            } catch (e) {
                return false
            }
        }

        return true
    })
    // Function to highlight search term in text
    const highlightSearchTerm = (text, searchTerm) => {
        if (!searchTerm || !text) return text

        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
        const parts = text.split(regex)

        return parts.map((part, index) =>
            regex.test(part) ? (
                <span key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
                    {part}
                </span>
            ) : part
        )
    }

    // Format all numeric substrings in a text using Indian number formatting (e.g., 590000 -> 5,90,000)
    const formatIndianNumbersInText = (text) => {
        if (!text) return text
        return text.replace(/(\d+(?:\.\d+)?)/g, (match) => {
            const num = Number(match)
            if (isNaN(num)) return match
            return num.toLocaleString('en-IN')
        })
    }

    const renderFeedbackContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <div className="ml-3">
                        <span className="text-gray-600">Loading feedback...</span>
                        {loadingProgress && (
                            <div className="text-xs text-gray-500 mt-1">{loadingProgress}</div>
                        )}
                    </div>
                </div>
            )
        }

        if (feedbackData.length === 0) {
            return (
                <div className="text-center py-12">
                    <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Feedback Available</h3>
                    <p className="text-gray-500">No feedback records found for this candidate.</p>
                </div>
            )
        }

        if (filteredFeedbackData.length === 0 && (searchTerm || dateFilter.from || dateFilter.to)) {
            return (
                <div className="text-center py-12">
                    <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
                    <p className="text-gray-500">
                        No feedback records match your {searchTerm && 'search term'}
                        {searchTerm && (dateFilter.from || dateFilter.to) && ' and '}
                        {(dateFilter.from || dateFilter.to) && 'date filter'}.
                    </p>
                </div>
            )
        }

        // Get the first feedback record (oldest entry) for Profile Created section
        const firstFeedback = feedbackData.find(f => f && f.is_profile_created) || feedbackData[feedbackData.length - 1]

        return (
            <div className="flex flex-col h-full">
                {/* Structured Feedback History Section - Scrollable */}
                {feedbackData.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex-1 overflow-hidden"
                    >
                        <h3 className="text-sm font-medium text-slate-700 mb-1">Feedback History</h3>
                        <div className="space-y-2 max-h-[320px] overflow-y-auto scrollbar-desktop pr-2">
                            {filteredFeedbackData.map((feedback, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-white rounded-md p-2 sm:p-3 border border-slate-200 shadow-sm hover:border-blue-300 transition-colors"
                                >
                                    <div className="space-y-2">
                                        {/* First line: Feedback and Executive Name */}
                                        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-1 lg:gap-0">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-gray-700 text-xs sm:text-sm break-words">
                                                    <span className="font-medium text-slate-600">Feedback: </span>
                                                    <span className="break-words">
                                                        {highlightSearchTerm(feedback.feedback || feedback.feedbackText || 'No feedback available', searchTerm)}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="text-blue-600 text-xs font-medium lg:ml-3 self-start lg:self-auto flex-shrink-0">
                                                {(() => {
                                                    const executiveName = getEmployeeNameFromCache(feedback.executive_name) || feedback.executive_name || 'Unknown';
                                                    return highlightSearchTerm(executiveName, searchTerm);
                                                })()}
                                            </span>
                                        </div>

                                        {/* Second line: Remarks with NFD/EJD/IFD and Date/Time */}
                                        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-1 lg:gap-0">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-gray-700 text-xs sm:text-sm flex break-words">
                                                    <span className="font-medium text-slate-600 flex-shrink-0">Remarks: </span>
                                                    {feedback.call_status && feedback.call_status !== 'assignment' && (
                                                        <div className="text-xs mt-1">
                                                            {/* Call Status - only icons */}
                                                            <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium inline-flex items-center justify-center ${feedback.call_status === 'call answered'
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                {feedback.call_status === 'call answered' ? (
                                                                    <Phone className="w-3 h-3" />
                                                                ) : (
                                                                    <PhoneOff className="w-3 h-3" />
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {(() => {
                                                        const remarks = feedback.remarks;

                                                        // If no remarks, don't show the Remarks line at all
                                                        if (!remarks) {
                                                            return null;
                                                        }

                                                        const dates = [];

                                                        // Helper function to safely format dates
                                                        const formatDate = (dateValue, label) => {
                                                            // More comprehensive validation
                                                            if (!dateValue ||
                                                                dateValue === 'null' ||
                                                                dateValue === 'undefined' ||
                                                                dateValue === 'Invalid Date' ||
                                                                dateValue.toString().toLowerCase().includes('invalid')) {
                                                                return null;
                                                            }

                                                            // Special handling for NFD with (open profile)
                                                            if (dateValue.includes('(open profile)')) {
                                                                // Extract the date part and reformat it
                                                                const datePart = dateValue.split(' ')[0];
                                                                try {
                                                                    const [year, month, day] = datePart.split('-');
                                                                    const formattedDate = `${day}/${month}/${year}`;
                                                                    return `${label}: ${formattedDate} (open profile)`;
                                                                } catch {
                                                                    return `${label}: ${dateValue}`; // Fallback to original if parsing fails
                                                                }
                                                            }

                                                            try {
                                                                const date = new Date(dateValue);
                                                                // Check if date is valid and not in year 1970 (common for invalid dates)
                                                                if (isNaN(date.getTime()) || date.getFullYear() < 2000) {
                                                                    return null;
                                                                }
                                                                return `${label}: ${date.toLocaleDateString('en-GB')}`;
                                                            } catch {
                                                                return null;
                                                            }
                                                        };

                                                        // Add valid dates only
                                                        const nfdFormatted = formatDate(feedback.nfd_date, 'NFD');
                                                        if (nfdFormatted) dates.push(nfdFormatted);

                                                        const ejdFormatted = formatDate(feedback.ejd_date, 'EJD');
                                                        if (ejdFormatted) dates.push(ejdFormatted);

                                                        const ifdFormatted = formatDate(feedback.ifd_date, 'IFD');
                                                        if (ifdFormatted) {
                                                            dates.push(ifdFormatted);
                                                        }

                                                        const interviewFormatted = formatDate(feedback.interview_date, 'Interview');
                                                        if (interviewFormatted) dates.push(interviewFormatted);

                                                        const datesStr = dates.join(', ');
                                                        const fullText = datesStr ? `${remarks} (${datesStr})` : remarks;

                                                        // Special handling for NFD with (open profile) highlighting
                                                        if (fullText.includes('(open profile)')) {
                                                            const parts = fullText.split('(open profile)');
                                                            return (
                                                                <span>
                                                                    {highlightSearchTerm(parts[0], searchTerm)}
                                                                    <span className="bg-red-100 text-red-800 px-1 py-0.5 rounded text-xs font-medium ml-1">
                                                                        (open profile)
                                                                    </span>
                                                                    {parts[1] && highlightSearchTerm(parts[1], searchTerm)}
                                                                </span>
                                                            );
                                                        }

                                                        return highlightSearchTerm(fullText, searchTerm);
                                                    })()}

                                                </div>
                                                {/* Client Job Info - Hide for assignment feedback */}

                                            </div>
                                            <span className="text-gray-500 text-xs lg:ml-3 self-start lg:self-auto whitespace-nowrap flex-shrink-0">
                                                {feedback.entry_time || 'N/A'}
                                            </span>
                                        </div>


                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Profile Created Section - Fixed at Bottom */}
                {feedbackData.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        className="flex-shrink-0 bg-white  "
                    >
                        <h3 className="text-sm font-medium text-emerald-600 mb-1">Profile Created</h3>
                        <div className="bg-emerald-50 rounded-md p-2 sm:p-3 border border-emerald-200">
                            <div className="space-y-2">
                                {/* First line: Feedback and Executive Name */}
                                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-1 lg:gap-0">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-gray-700 text-xs sm:text-sm break-words">
                                            <span className="font-medium text-slate-600">Feedback: </span>
                                            <span className="break-words">{firstFeedback?.feedback || firstFeedback?.feedbackText || 'No feedback available'}</span>
                                        </div>
                                    </div>
                                    <span className="text-emerald-600 text-xs font-medium lg:ml-3 self-start lg:self-auto flex-shrink-0">
                                        {(() => {
                                            // Show only the entry-by user for Profile Created section,
                                            // falling back to profile creator or candidate creator if needed
                                            const entryCode =
                                                firstFeedback?.executive_name ||
                                                firstFeedback?.profile_created_by ||
                                                candidate?.backendData?.executive_name;

                                            const entryName = entryCode
                                                ? (getEmployeeNameFromCache(entryCode) || entryCode)
                                                : '';

                                            return entryName;
                                        })()}
                                    </span>
                                </div>

                                {/* Second line: Remarks with NFD/EJD/IFD and Date/Time */}
                                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-1 lg:gap-0">
                                    {firstFeedback?.remarks ? (
                                        <div className="flex-1 min-w-0">
                                            <div className="text-gray-700 text-xs sm:text-sm break-words">
                                                <span className="font-medium text-slate-600 flex-shrink-0">Remarks: </span>
                                                {(() => {
                                                    const remarks = firstFeedback.remarks;
                                                    const dates = [];

                                                    if (firstFeedback?.nfd_date) {
                                                        // Handle NFD date with potential (open profile) indicator
                                                        let nfdDisplay;
                                                        if (typeof firstFeedback.nfd_date === 'string' && firstFeedback.nfd_date.includes('(open profile)')) {
                                                            // Format the date part to dd/mm/yyyy and keep (open profile) text
                                                            const datePart = firstFeedback.nfd_date.split(' ')[0];
                                                            try {
                                                                const [year, month, day] = datePart.split('-');
                                                                nfdDisplay = `NFD: ${day}/${month}/${year} (open profile)`;
                                                            } catch {
                                                                nfdDisplay = `NFD: ${firstFeedback.nfd_date}`; // Fallback if parsing fails
                                                            }
                                                        } else {
                                                            // Regular date formatting
                                                            const nfdFormatted = new Date(firstFeedback.nfd_date).toLocaleDateString('en-GB');
                                                            nfdDisplay = `NFD: ${nfdFormatted}`;
                                                        }
                                                        dates.push(nfdDisplay);
                                                    }
                                                    if (firstFeedback?.ejd_date) {
                                                        const ejdFormatted = new Date(firstFeedback.ejd_date).toLocaleDateString('en-GB');
                                                        dates.push(`EJD: ${ejdFormatted}`);
                                                    }
                                                    if (firstFeedback?.ifd_date) {
                                                        const ifdFormatted = new Date(firstFeedback.ifd_date).toLocaleDateString('en-GB');
                                                        dates.push(`IFD: ${ifdFormatted}`);
                                                    }

                                                    const datesStr = dates.join(', ');
                                                    const fullText = datesStr ? `${remarks} (${datesStr})` : remarks;

                                                    // Special handling for NFD with (open profile) highlighting
                                                    if (fullText.includes('(open profile)')) {
                                                        const parts = fullText.split('(open profile)');
                                                        return (
                                                            <span>
                                                                {parts[0]}
                                                                <span className="bg-red-100 text-red-800 px-1 py-0.5 rounded text-xs font-medium ml-1">
                                                                    (open profile)
                                                                </span>
                                                                {parts[1]}
                                                            </span>
                                                        );
                                                    }

                                                    return fullText;
                                                })()}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 min-w-0"></div>
                                    )}
                                    <span className="text-gray-500 text-xs lg:ml-3 self-start lg:self-auto whitespace-nowrap flex-shrink-0">
                                        {firstFeedback?.entry_time || 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* No feedback available */}
                {feedbackData.length === 0 && (
                    <div className="text-center py-8">
                        <p className="text-gray-500">No feedback history available</p>
                    </div>
                )}
            </div>
        )
    }

    const renderRevenueContent = () => {
        if (isLoadingRevenue) {
            return (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Loading revenue data...</span>
                </div>
            )
        }

        if (revenueData.length === 0) {
            return (
                <div className="text-center py-12">
                    <IndianRupee className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Revenue Records</h3>
                    <p className="text-gray-500">No revenue records found for this candidate.</p>
                </div>
            )
        }

        if (filteredRevenueData.length === 0 && (searchTerm || dateFilter.from || dateFilter.to)) {
            return (
                <div className="text-center py-12">
                    <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
                    <p className="text-gray-500">
                        No revenue records match your {searchTerm && 'search term'}
                        {searchTerm && (dateFilter.from || dateFilter.to) && ' and '}
                        {(dateFilter.from || dateFilter.to) && 'date filter'}.
                    </p>
                </div>
            )
        }

        return (
            <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-desktop">
                {filteredRevenueData.map((revenue, index) => (
                    <motion.div
                        key={revenue.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className={`rounded-lg p-4 border bg-gradient-to-r ${revenue.profile_status === 'Abscond'
                                ? 'from-red-50 to-rose-50 border-red-200'
                                : 'from-green-50 to-emerald-50 border-green-200'
                            }`}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center">
                                <IndianRupee className="h-5 w-5 text-green-600 mr-2" />
                                <h4 className="text-lg font-semibold text-gray-900">
                                    ₹{(Number(revenue.revenue) || 0).toLocaleString('en-IN')}
                                </h4>
                                <span className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${revenue.revenue_status === 'Processing' ? 'bg-yellow-100 text-yellow-800' :
                                        revenue.revenue_status === 'Claimed' ? 'bg-green-100 text-green-800' :
                                            revenue.revenue_status === 'Pending' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                    }`}>
                                    {highlightSearchTerm(revenue.revenue_status || 'Unknown', searchTerm)}
                                </span>
                                <span className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${revenue.profile_status === 'Joined' ? 'bg-green-100 text-green-800' :
                                        revenue.profile_status === 'Abscond' ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'
                                    }`}>
                                    {highlightSearchTerm(revenue.profile_status || 'unknown', searchTerm)}
                                </span>
                            </div>
                            <div className="text-right text-sm text-gray-500">
                                {revenue.created_at ? formatDate(revenue.created_at, true) : 'N/A'}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <div>
                                <span className="font-medium text-gray-600">Accountable CTC:</span>
                                <span className="ml-2 text-gray-900">₹{(Number(revenue.accountable_ctc) || 0).toLocaleString('en-IN')}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-600">Offer CTC:</span>
                                <span className="ml-2 text-gray-900">₹{(Number(revenue.offer_ctc) || 0).toLocaleString('en-IN')}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-600">Percentage:</span>
                                <span className="ml-2 text-gray-900">{revenue.percentage || 0}%</span>
                            </div>
                            {revenue.joining_date && (
                                <div>
                                    <span className="font-medium text-gray-600">Joining Date:</span>
                                    <span className="ml-2 text-gray-900">{formatDate(revenue.joining_date)}</span>
                                </div>
                            )}
                            {revenue.itbr_date && (
                                <div>
                                    <span className="font-medium text-gray-600">ITBR Date:</span>
                                    <span className="ml-2 text-gray-900">{formatDate(revenue.itbr_date)}</span>
                                </div>
                            )}
                            {revenue.erd_date && (
                                <div>
                                    <span className="font-medium text-gray-600">ERD Date:</span>
                                    <span className="ml-2 text-gray-900">{formatDate(revenue.erd_date)}</span>
                                </div>
                            )}
                            {revenue.br_date && (
                                <div>
                                    <span className="font-medium text-gray-600">BR Date:</span>
                                    <span className="ml-2 text-gray-900">{formatDate(revenue.br_date)}</span>
                                </div>
                            )}
                            {revenue.invoice_number && (
                                <div>
                                    <span className="font-medium text-gray-600">Invoice Number:</span>
                                    <span className="ml-2 text-gray-900">{highlightSearchTerm(revenue.invoice_number, searchTerm)}</span>
                                </div>
                            )}
                        </div>
                        {/* Revenue Feedback Section */}
                        {revenueFeedbacks[revenue.id] && revenueFeedbacks[revenue.id].length > 0 && (
                            <div className="mt-2 pt-2 border-t border-green-200">
                                <div className="flex items-center mb-2">
                                    <MessageSquare className="h-4 w-4 text-green-600 mr-2" />
                                    <span className="font-medium text-gray-700 text-sm">Revenue Feedback</span>
                                </div>
                                <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-desktop pr-2">
                                    {revenueFeedbacks[revenue.id].slice().reverse().map((feedback, feedbackIndex) => (
                                        <div key={feedback.id || feedbackIndex} className="bg-white rounded p-2 border border-green-100 break-words">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="text-sm text-gray-800 flex-1 min-w-0">
                                                    {highlightSearchTerm(feedback.feedback, searchTerm)}
                                                </div>
                                                {feedback.created_at && (
                                                    <div className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                                                        {formatDate(feedback.created_at, true)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Revenue Change History - styled like Revenue Feedback */}
                        {revenue.change_history && revenue.change_history.trim() !== '' && (
                            <div className="mt-2 pt-2 border-t border-blue-200">
                                <div className="flex items-center mb-2">
                                    <Clock className="h-4 w-4 text-blue-600 mr-2" />
                                    <span className="font-medium text-gray-700 text-sm">Revenue Change History</span>
                                </div>
                                <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-desktop pr-2">
                                    {revenue.change_history
                                        .split('\n')
                                        .map(line => line.trim())
                                        .filter(Boolean)
                                        .reverse() // Latest first
                                        .map((line, idx) => {
                                            // Extract [timestamp] prefix if present
                                            let timestamp = '';
                                            let message = line;
                                            const match = line.match(/^\[(.*?)\]\s*(.*)$/);
                                            if (match) {
                                                timestamp = match[1];
                                                message = match[2] || '';
                                            }

                                            // Split message by " | " so each field change is on its own line
                                            const parts = message
                                                .split(' | ')
                                                .map(p => p.trim())
                                                .filter(Boolean);

                                            // Format timestamp as "dd/mm/yyyy, hh:mm[:ss]" if possible
                                            let displayTimestamp = timestamp;
                                            if (timestamp) {
                                                try {
                                                    // Convert "YYYY-MM-DD HH:MM:SS" to a Date
                                                    const isoLike = timestamp.replace(' ', 'T');
                                                    const d = new Date(isoLike);
                                                    if (!isNaN(d.getTime())) {
                                                        const day = String(d.getDate()).padStart(2, '0');
                                                        const month = String(d.getMonth() + 1).padStart(2, '0');
                                                        const year = d.getFullYear();
                                                        const hours = String(d.getHours()).padStart(2, '0');
                                                        const minutes = String(d.getMinutes()).padStart(2, '0');
                                                        const seconds = String(d.getSeconds()).padStart(2, '0');
                                                        displayTimestamp = `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
                                                    }
                                                } catch (e) {
                                                    // Fallback: keep original timestamp string
                                                    displayTimestamp = timestamp;
                                                }
                                            }

                                            return (
                                                <div
                                                    key={idx}
                                                    className="bg-white rounded p-2 border border-blue-100 text-sm text-gray-800 break-words"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0 space-y-0.5">
                                                            {parts.length > 0
                                                                ? parts.map((part, i) => {
                                                                      const formatted = formatIndianNumbersInText(part)
                                                                      return (
                                                                          <div key={i}>
                                                                              {highlightSearchTerm(formatted, searchTerm)}
                                                                          </div>
                                                                      )
                                                                  })
                                                                : highlightSearchTerm(formatIndianNumbersInText(message), searchTerm)}
                                                        </div>
                                                        {displayTimestamp && (
                                                            <div className="text-[12px] text-gray-500 whitespace-nowrap flex-shrink-0">
                                                                {displayTimestamp}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
        )
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 ">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 transition-opacity"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <div className="flex min-h-full items-start justify-center p-4 pt-2">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.2 }}
                            className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] "
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}


                            {/* Tabs */}
                            <div className="border-b border-gray-200">
                                <div className="bg-gray-50 px-3 py-1 border-b border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-sm font-semibold text-gray-900">
                                                    {candidate?.candidateName || candidate?.name || candidate?.candidate_name || candidate?.backendData?.candidate_name || 'Candidate Details'}
                                                </h2>
                                                {/* URL Change Indicator */}
                                                {isUrlChangeDetected && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                        className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium"
                                                    >
                                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                                        URL Changed
                                                    </motion.div>
                                                )}
                                                {/* Reload Indicator */}
                                                {shouldReload && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                        className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                                                    >
                                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                                        Reloading...
                                                    </motion.div>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-600 ">
                                                {candidate?.email} • {candidate?.contactNumber1 || candidate?.mobile1}
                                                {/* Show current URL path for debugging */}
                                                {isUrlChangeDetected && (
                                                    <span className="ml-2 text-orange-600 font-mono">
                                                        → {location.pathname}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <nav className="flex space-x-2">
                                                <button
                                                    onClick={() => setActiveTab('feedback')}
                                                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'feedback' ? 'bg-white text-blue-600 border-t-2 border-blue-500' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}
                                                >
                                                    <MessageSquare className="inline-block w-4 h-4 mr-2" />
                                                    Feedback
                                                </button>
                                                {(userRole === 'L5' || userRole === 'ceo') && (
                                                    <button
                                                        onClick={() => setActiveTab('revenue')}
                                                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'revenue' ? 'bg-white text-blue-600 border-t-2 border-blue-500' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}
                                                    >
                                                        <IndianRupee className="inline-block w-4 h-4 mr-2" />
                                                        Revenue
                                                    </button>
                                                )}
                                            </nav>

                                            {/* Close Button */}
                                            <button
                                                onClick={onClose}
                                                className="p-1 hover:bg-gray-200 rounded-full transition-colors group"
                                                title="Close modal"
                                            >
                                                <X className="h-4 w-4 text-gray-500 group-hover:text-gray-700 transition-colors" />
                                            </button>
                                        </div>
                                        {/* <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button> */}
                                    </div>
                                </div>

                            </div>

                            {/* Date Filter and Search Box */}
                            <div className="px-3 py-2 border-b border-gray-200">
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-gray-500">From:</span>
                                        <input
                                            type="date"
                                            value={dateFilter.from}
                                            onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                                            className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-gray-500">To:</span>
                                        <input
                                            type="date"
                                            value={dateFilter.to}
                                            onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                                            className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        />
                                    </div>
                                    <div className="relative flex-1 min-w-[200px]">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder={`Search ${activeTab === 'feedback' ? 'feedback' : 'revenue'}...`}
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-1 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        />
                                        {searchTerm && (
                                            <button
                                                onClick={() => setSearchTerm('')}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                    {(dateFilter.from || dateFilter.to) && (
                                        <button
                                            onClick={() => setDateFilter({ from: '', to: '', type: 'created' })}
                                            className="text-xs text-red-500 hover:text-red-700 px-2 py-1 border border-red-300 rounded hover:bg-red-50 transition-colors"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-3 ">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeTab}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {activeTab === 'feedback' ? renderFeedbackContent() : renderRevenueContent()}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    )
}

export default FeedbackModal
