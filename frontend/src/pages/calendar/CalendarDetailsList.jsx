import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Tag, Search, Filter, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import calendarApi from '../../api/calendarApi';
import CandidateTable from './components/CandidateTable';
import FeedbackModal from '../NewDtr/components/FeedbackModal';
import { useAppActions } from '../../context/AppContext';
import Loading from '../../components/Loading';

// Utility function to format dates to dd-mm-yyyy
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        // Normalize common backend datetime formats like "YYYY-MM-DD HH:MM:SS+00:00"
        const normalized = typeof dateString === 'string' ? dateString.replace(' ', 'T') : dateString;
        const date = new Date(normalized);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    } catch (error) {
        return 'N/A';
    }
};

// Transform calendar events to candidate format for CandidateTable with complete details
const transformEventsToCandidate = (events) => {
    return events.map((event, index) => {
        // Helper function to format dates
        const formatDate = (dateString) => {
            if (!dateString) return null;
            try {
                const normalized = typeof dateString === 'string' ? dateString.replace(' ', 'T') : dateString;
                const date = new Date(normalized);
                return isNaN(date.getTime()) ? null : date;
            } catch {
                return null;
            }
        };

        // ✅ FIXED: Use proper ID handling - don't fallback to index for real IDs
        const candidateId = event.candidate?.id;
        const clientJobId = event.client_job?.id || event.status_history?.client_job_id;
        const eventType = event.type;
        
        // ✅ Create truly unique key combining candidate ID, client job ID, event type, and index
        const uniqueId = candidateId ? `${candidateId}-${clientJobId || 'no-job'}-${eventType}-${index}` : `event-${index}-${Date.now()}`;
        const uniqueJobId = clientJobId ? `${clientJobId}-${eventType}-${index}` : `job-${index}-${Date.now()}`;

        // Get and format dates
        const nfdDate = formatDate(event.client_job?.next_follow_up_date);
        const ifdDate = formatDate(event.client_job?.interview_date);
        const ejdDate = formatDate(event.client_job?.expected_joining_date);
        const createdDate = formatDate(event.client_job?.created_at || event.candidate?.created_at || event.status_history?.created_at);
        const updatedDate = formatDate(event.client_job?.updated_at || event.candidate?.updated_at || event.status_history?.created_at);

        // Format date for display
        const formatDateDisplay = (date) => date ? date.toLocaleDateString('en-IN') : 'N/A';

        // Check if NFD is expired
        const isNfdExpired = nfdDate ? new Date() > nfdDate : false;

        // Create date display components
        const dateDisplays = [];

        // Add NFD display
        dateDisplays.push(
            <div key="nfd" className="text-sm">
                <strong>NFD:</strong>{' '}
                <span className={isNfdExpired || !nfdDate ? 'text-orange-600 font-semibold' : 'text-blue-600 font-semibold'}>
                    {nfdDate ? formatDateDisplay(nfdDate) : 'Open Profile'}{isNfdExpired && nfdDate ? ' (Open Profile)' : ''}
                </span>
            </div>
        );

        // Add IFD display if exists
        if (ifdDate) {
            dateDisplays.push(
                <div key="ifd" className="text-sm">
                    <strong>IFD:</strong> {formatDateDisplay(ifdDate)}
                </div>
            );
        }

        // Add EJD display if exists
        if (ejdDate) {
            dateDisplays.push(
                <div key="ejd" className="text-sm">
                    <strong>EJD:</strong> {formatDateDisplay(ejdDate)}
                </div>
            );
        }
        
        return {
            // ✅ Complete Candidate Details (from CandidateSerializer)
            id: uniqueId, // Use unique key instead of candidateId for React rendering
            candidateId: candidateId, // Keep original candidate ID for API calls
            candidateName: event.candidate?.candidate_name || event.candidate?.name || 'N/A',
            name: event.candidate?.candidate_name || event.candidate?.name || 'N/A',
            mobile1: event.candidate?.mobile1 || event.candidate?.mobile || 'N/A',
            mobile2: event.candidate?.mobile2 || null,
            contactNumber1: event.candidate?.mobile1 || event.candidate?.mobile || 'N/A',
            email: event.candidate?.email || 'N/A',
            alternateEmail: event.candidate?.alternate_email || 'N/A',
            executiveName: event.candidate?.executive_display || event.candidate?.executive_name || 'N/A',
            executive_name: event.candidate?.executive_display || event.candidate?.executive_name || 'N/A',
            city: event.candidate?.city || 'N/A',
            state: event.candidate?.state || 'N/A',
            pincode: event.candidate?.pincode || 'N/A',
            address: event.candidate?.address || 'N/A',
            education: event.candidate?.education || 'N/A',
            experience: event.candidate?.experience || 'N/A',
            source: event.candidate?.source || 'N/A',
            
            // ✅ Combined city and state for location display
            cityState: (() => {
                const city = event.candidate?.city || '';
                const state = event.candidate?.state || '';
                if (city && state) return `${city}, ${state}`;
                return city || state || 'N/A';
            })(),
            
            // Date displays for the table
            dateDisplays: dateDisplays.length > 0 ? dateDisplays : 'N/A',
            
            // Date fields for sorting/filtering
            nfdDate: nfdDate?.toISOString() || null,
            ifdDate: ifdDate?.toISOString() || null,
            ejdDate: ejdDate?.toISOString() || null,
            
            selectedClientJob: (() => {
                const cj = event.client_job || {};
                const sh = event.status_history || {};
                const candidate = event.candidate || {};
                return {
                    id: cj.id || sh.client_job_id,
                    clientName: cj.client_name || sh.client_name || 'N/A',
                    designation: cj.designation || candidate.designation || 'N/A',
                    expected_ctc: (cj.expected_ctc ?? candidate.expected_ctc ?? 'N/A'),
                    current_ctc: (cj.current_ctc ?? candidate.current_ctc ?? 'N/A'),
                    interview_date: ifdDate?.toISOString() || null,
                    next_follow_up_date: nfdDate?.toISOString() || null,
                    expected_joining_date: ejdDate?.toISOString() || null,
                    remarks: sh.remarks || cj.remarks || 'N/A',
                    status: cj.status || 'N/A',
                    feedback: cj.feedback ? [cj.feedback] : [],
                    extra_notes: sh.extra_notes || ''
                };
            })(),
            
            // ✅ Event type information with consolidated support
            eventType: event.type,
            eventTypeLabel: (() => {
                if (event.multiple_events && event.type.includes('+')) {
                    // Handle consolidated events like "IF+NFD" or "EDJ+IF+NFD"
                    const types = event.type.split('+');
                    const labels = types.map(type => {
                        switch(type) {
                            case 'IF': return 'Interview Fixed';
                            case 'NFD': return 'Next Follow-up';
                            case 'EDJ': return 'Expected Joining';
                            default: return type;
                        }
                    });
                    return labels.join(' + ');
                } else {
                    // Single event type
                    switch(event.type) {
                        case 'IF': return 'Interview Fixed';
                        case 'NFD': return 'Next Follow-up';
                        case 'EDJ': return 'Expected Joining';
                        case 'PS': return 'Profile Submission';
                        case 'SH': return 'Status History';
                        default: return event.type;
                    }
                }
            })(),
            multipleEvents: event.multiple_events || false,
            
            // ✅ Additional fields for compatibility
            serialNo: index + 1,
            isRecentlyUpdated: false,
            
            // Date fields for display - formatted as dd-mm-yyyy
            created_at: createdDate ? formatDateDisplay(createdDate) : 'N/A',
            updated_at: updatedDate ? formatDateDisplay(updatedDate) : 'N/A',
            createdDate: createdDate ? formatDateDisplay(createdDate) : 'N/A',
            updatedDate: updatedDate ? formatDateDisplay(updatedDate) : 'N/A',
            createdDateRaw: createdDate?.toISOString() || null,
            updatedDateRaw: updatedDate?.toISOString() || null,
            
            // ✅ Employee code for name lookup
            employeeCode: event.candidate?.executive_name || 'N/A',
            
            // ✅ Client information at top level for compatibility
            client_name: (event.client_job?.client_name || event.status_history?.client_name || 'N/A'),
            clientName: (event.client_job?.client_name || event.status_history?.client_name || 'N/A'),
            
            // ✅ Unique keys for React rendering
            uniqueKey: uniqueId,
            uniqueJobKey: uniqueJobId,
            
            // ✅ Complete data flag
            hasCompleteDetails: true,
            dataSource: 'calendar-stats-api-full-details'
        };
    });
};

function CalendarDetailsList() {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const actions = useAppActions();
    const dispatch = useDispatch();
    
    // Get user information from Redux
    const user = useSelector((state) => state.auth);
    const userFullName = user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user?.firstName || user?.username || '';
    
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    
    // Data table state - Remove searchTerm from here, let CandidateTable handle it
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [filterType, setFilterType] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [showFilters, setShowFilters] = useState(false);
    
    // Feedback modal state
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    
    const dateParam = searchParams.get('date');
    const eventTypeFilter = searchParams.get('type');
    const selectedDate = location.state?.selectedDate || dateParam;

    
    // Fetch events for the specific date from backend API
    const fetchEventsForDate = async () => {
        if (!dateParam) return;
        
        setLoading(true);
        setError(null);
        
        try {
            // Extract year-month from date parameter
            const date = new Date(dateParam);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const monthParam = `${year}-${String(month).padStart(2, '0')}`;
            
            const response = await calendarApi.getCalendarStats(monthParam);
            
            if (response && response.events) {
                // Normalize dates to YYYY-MM-DD in case backend returns ISO datetimes (e.g., from status history)
                const normalizedEvents = response.events.map(e => ({
                    ...e,
                    date: (e.date || '').split('T')[0]
                }));
                
                // Find events for the specific date
                const dayEvents = normalizedEvents.find(event => event.date === dateParam);
                
                if (dayEvents && dayEvents.events) {
                    let filteredEvents = dayEvents.events;
                    
                    // Event type grouping for special categories
                    const groupedEventTypes = {
                        'ATND': ['ATND'] // Only show ATND status
                    };

                    // Filter by event type if specified (handle consolidated events and grouped types)
                    if (eventTypeFilter) {
                        console.log('Filtering events. Looking for type:', eventTypeFilter);
                        console.log('Available event types:', [...new Set(dayEvents.events.map(e => e.type))]);
                        
                        // Get the event types to filter by (including grouped types)
                        let filterTypes = [eventTypeFilter.toUpperCase()];
                        if (groupedEventTypes[eventTypeFilter.toUpperCase()]) {
                            filterTypes = groupedEventTypes[eventTypeFilter.toUpperCase()];
                            console.log('Expanded grouped event type', eventTypeFilter, 'to:', filterTypes);
                        }
                        
                        filteredEvents = dayEvents.events.filter(event => {
                            if (!event || !event.type) return false;
                            
                            const eventType = event.type.toString().toUpperCase();
                            
                            // For PS (Profile Submission) events, only match exact type
                            if (eventTypeFilter.toUpperCase() === 'PS') {
                                return eventType === 'PS';
                            }
                            
                            // Check if event type matches any of the filter types
                            if (filterTypes.includes(eventType)) {
                                return true;
                            }
                            
                            // Handle consolidated events (e.g., 'IF+NFD')
                            if (eventType.includes('+')) {
                                return eventType.split('+')
                                    .some(type => filterTypes.includes(type));
                            }
                            
                            return false;
                        });
                        
                        console.log(`Found ${filteredEvents.length} events matching type ${eventTypeFilter}`);
                    }
                    
                    console.log('Setting filtered events:', filteredEvents);
                    // Transform events to candidate format if needed
                    const transformed = transformEventsToCandidate(filteredEvents);
                    console.log('Transformed events:', transformed);
                    setEvents(transformed);
                    
                    // Employee names are now included in the backend response
                } else {
                    setEvents([]);
                }
            } else {
                setEvents([]);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
            setError('Failed to load events');
            setEvents([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Use events from navigation state if available, otherwise fetch from API
        if (location.state?.events) {
            setEvents(location.state.events);
        } else {
            fetchEventsForDate();
        }
    }, [dateParam, eventTypeFilter, location.state]);
    
    // Removed BroadcastChannel implementation
    
    // Function to get event type and color - updated for new object format
    const getEventTypeInfo = (event) => {
        const eventType = typeof event === 'object' ? event.type : event.split('-')[0];
        
        if (eventType === 'IF') return { type: 'Interview Fixed', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800', borderColor: 'border-green-500' };
        if (eventType === 'NFD') return { type: 'Next Follow-up Date', color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-800', borderColor: 'border-orange-500' };
        if (eventType === 'EDJ') return { type: 'Expected Date of Joining', color: 'indigo', bgColor: 'bg-indigo-100', textColor: 'text-indigo-800', borderColor: 'border-indigo-500' };
        if (eventType === 'PS') return { type: 'Profile Submission', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800', borderColor: 'border-blue-500' };
        if (eventType === 'INT') return { type: 'Interested', color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-800', borderColor: 'border-purple-500' };
        if (eventType === 'ATND') return { type: 'Attended', color: 'cyan', bgColor: 'bg-cyan-100', textColor: 'text-cyan-800', borderColor: 'border-cyan-500' };
        if (eventType === 'FP') return { type: 'Follow Up', color: 'teal', bgColor: 'bg-teal-100', textColor: 'text-teal-800', borderColor: 'border-teal-500' };
        if (eventType === 'NS') return { type: 'No Show', color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-800', borderColor: 'border-red-500' };
        if (eventType === 'SEL') return { type: 'Selected', color: 'emerald', bgColor: 'bg-emerald-100', textColor: 'text-emerald-800', borderColor: 'border-emerald-500' };
        if (eventType === 'NR') return { type: 'Next Round', color: 'pink', bgColor: 'bg-pink-100', textColor: 'text-pink-800', borderColor: 'border-pink-500' };
        if (eventType === 'REJ') return { type: 'Rejected', color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-800', borderColor: 'border-red-500' };
        if (eventType === 'INP') return { type: 'In Process', color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800', borderColor: 'border-yellow-500' };
        return { type: 'Event', color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-800', borderColor: 'border-gray-500' };
    };

    // Format date for display
    const formatDisplayDate = (dateStr) => {
        if (!dateStr) return 'Selected Date';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        } catch {
            return dateStr;
        }
    };

    const handleBackClick = () => {
        navigate('/day-plans');
    };

    // Data table functions
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1); // Reset to first page when sorting
    };

    const getSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) {
            return <ChevronUp size={14} className="text-gray-400" />;
        }
        return sortConfig.direction === 'asc' ? 
            <ChevronUp size={14} className="text-blue-600" /> : 
            <ChevronDown size={14} className="text-blue-600" />;
    };

    // Filter and sort logic (search is handled by CandidateTable)
    const filteredAndSortedEvents = useMemo(() => {
        let filtered = [...events];

        // Apply type filter
        if (filterType !== 'all') {
            filtered = filtered.filter(event => event.type === filterType);
        }

        // Apply sorting
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aValue = '';
                let bValue = '';

                switch (sortConfig.key) {
                    case 'candidate':
                        aValue = a.candidate?.candidate_name || a.candidate?.name || '';
                        bValue = b.candidate?.candidate_name || b.candidate?.name || '';
                        break;
                    case 'email':
                        aValue = a.candidate?.email || '';
                        bValue = b.candidate?.email || '';
                        break;
                    case 'mobile':
                        aValue = a.candidate?.contact || a.candidate?.mobile1 || a.candidate?.mobile || '';
                        bValue = b.candidate?.contact || b.candidate?.mobile1 || b.candidate?.mobile || '';
                        break;
                    case 'executive':
                        aValue = a.candidate?.executive_name || '';
                        bValue = b.candidate?.executive_name || '';
                        break;
                    case 'client':
                        aValue = a.client_job?.client_name || '';
                        bValue = b.client_job?.client_name || '';
                        break;
                    case 'type':
                        aValue = a.type || '';
                        bValue = b.type || '';
                        break;
                    case 'time':
                        aValue = a.time || '';
                        bValue = b.time || '';
                        break;
                    default:
                        return 0;
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return filtered;
    }, [events, filterType, sortConfig]);

    // Pagination logic
    const totalPages = Math.ceil(filteredAndSortedEvents.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentEvents = filteredAndSortedEvents.slice(startIndex, endIndex);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleItemsPerPageChange = (newItemsPerPage) => {
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1);
    };

    // Get unique event types for filter dropdown
    const eventTypes = useMemo(() => {
        const types = [...new Set(events.map(event => event.type).filter(Boolean))];
        return types;
    }, [events]);

    // Reset pagination when events change
    useEffect(() => {
        setCurrentPage(1);
    }, [events]);

    // Show loading state
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Event Details...</h3>
                    <p className="text-gray-600">Please wait while we fetch candidate information</p>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <Calendar className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Details</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className=" ">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 mb-2 ">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">    
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                                <Calendar className="text-white w-4 h-4" />
                            </div>
                            <div className='flex items-center justify-between w-full'>
                                <h1 className="text-md font-bold text-gray-900">
                                    {eventTypeFilter ? `${getEventTypeInfo({type: eventTypeFilter}).type} Events` : 'Calendar Events'}
                                </h1>
                                <p className="text-gray-500 text-xs">{formatDisplayDate(selectedDate || dateParam)}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
                            <Tag size={12} className="text-blue-600" />
                            <span className="text-xs font-medium text-blue-700">
                                {filteredAndSortedEvents.length} of {events.length} Events
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Card
            {events.length > 0 && (
                <div className="bg-white rounded-sm border border-gray-200 px-2 py-1 mt-2">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-md font-semibold text-gray-900">Event Summary</h3>
                        {(searchTerm || filterType !== 'all') && (
                            <div className="text-xs text-gray-500">
                                Based on filtered results
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-2 bg-green-50 rounded-lg border border-green-200">
                            <div className="text-xl font-bold text-green-600">
                                {filteredAndSortedEvents.filter(e => e.type === 'IF').length}
                            </div>
                            <div className="text-xs text-green-600 font-medium">Interviews</div>
                            {(searchTerm || filterType !== 'all') && (
                                <div className="text-xs text-gray-400 mt-1">
                                    of {events.filter(e => e.type === 'IF').length} total
                                </div>
                            )}
                        </div>
                        <div className="text-center p-2 bg-orange-50 rounded-lg border border-orange-200">
                            <div className="text-xl font-bold text-orange-600">
                                {filteredAndSortedEvents.filter(e => e.type === 'NFD').length}
                            </div>
                            <div className="text-xs text-orange-600 font-medium">Follow-ups</div>
                            {(searchTerm || filterType !== 'all') && (
                                <div className="text-xs text-gray-400 mt-1">
                                    of {events.filter(e => e.type === 'NFD').length} total
                                </div>
                            )}
                        </div>
                        <div className="text-center p-2 bg-indigo-50 rounded-lg border border-indigo-200">
                            <div className="text-xl font-bold text-indigo-600">
                                {filteredAndSortedEvents.filter(e => e.type === 'EDJ').length}
                            </div>
                            <div className="text-xs text-indigo-600 font-medium">Joinings</div>
                            {(searchTerm || filterType !== 'all') && (
                                <div className="text-xs text-gray-400 mt-1">
                                    of {events.filter(e => e.type === 'EDJ').length} total
                                </div>
                            )}
                        </div>
                        <div className="text-center p-2 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="text-xl font-bold text-blue-600">{filteredAndSortedEvents.length}</div>
                            <div className="text-xs text-blue-600 font-medium">Filtered Events</div>
                            {(searchTerm || filterType !== 'all') && (
                                <div className="text-xs text-gray-400 mt-1">
                                    of {events.length} total
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )} */}

           

            {/* Use CandidateTable component with SearchView styling */}
            <CandidateTable
                candidates={filteredAndSortedEvents}
                loading={loading}
                error={error}
                title={`Calendar Events - ${selectedDate}`}
                entriesPerPage={itemsPerPage}
                showActions={true}
                initialSearchTerm={userFullName}
                emptyMessage={events.length === 0 ? 'No events found for this date.' : 'No matching events found.'}
                onViewFeedback={(candidate) => {
                    // Handle feedback modal display
                    console.log('Show feedback for candidate:', candidate);
                    setSelectedCandidate(candidate);
                    setShowFeedbackModal(true);
                }}
                onView={(candidate) => {
                    // Handle ViewModal display when eye icon is clicked using AppContext
                    console.log('View candidate:', candidate);
                    actions.setSelectedCandidate(candidate);
                    actions.setIsViewModalOpen(true);
                }}
                onCandidateNameClick={(candidate) => {
                    // Handle candidate name click - open ViewModal
                    console.log('Candidate clicked:', candidate);
                }}
            />

            {/* Feedback Modal */}
            <FeedbackModal
                isOpen={showFeedbackModal}
                onClose={() => {
                    setShowFeedbackModal(false);
                    setSelectedCandidate(null);
                }}
                candidate={selectedCandidate}
                clientJobId={selectedCandidate?.selectedClientJob?.id || selectedCandidate?.clientJobId}
            />

            {/* ViewModal removed - CandidateTable now opens ViewCandidate in new tab */}

        </div>
    );
}

export default CalendarDetailsList;