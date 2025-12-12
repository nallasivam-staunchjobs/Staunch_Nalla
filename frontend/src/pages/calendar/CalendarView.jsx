import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import calendarApi from '../../api/calendarApi';
import Loading from '../../components/Loading';

const CalendarView = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [_selectedDate, setSelectedDate] = useState(new Date());
    const [miniCalendarDate, setMiniCalendarDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [monthlyStats, setMonthlyStats] = useState({
        interviews: 0,
        followups: 0,
        joinings: 0,
        profileSubmissions: 0,
        interested: 0,
        attended: 0,
        noShow: 0,
        selected: 0,
        totalEvents: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const debounceRef = useRef(null);
    const loadingRef = useRef(false);

    // Fetch calendar data from backend API
    const fetchCalendarData = useCallback(async (dateToUse = null) => {
        // Prevent duplicate calls if already loading
        if (loadingRef.current) {
            console.log('CalendarView - Skipping fetch, already loading');
            return;
        }

        loadingRef.current = true;
        setLoading(true);
        setError(null);

        try {
            const targetDate = dateToUse || currentDate;
            const year = targetDate.getFullYear();
            const month = targetDate.getMonth() + 1;
            const monthParam = `${year}-${String(month).padStart(2, '0')}`;

            console.log('CalendarView - Fetching data for:', monthParam, 'targetDate:', targetDate);
            const response = await calendarApi.getCalendarStats(monthParam);

            if (response && response.events) {
                // Format events for calendar display
                const formattedEvents = calendarApi.formatEventsForCalendar(response.events);
                setEvents(formattedEvents);

                // Set monthly stats from API response
                const stats = calendarApi.getSummaryStats(response);
                setMonthlyStats(stats);
            } else {
                setEvents([]);
                setMonthlyStats({ 
                    interviews: 0,
                    followups: 0, 
                    joinings: 0, 
                    profileSubmissions: 0,
                    interested: 0,
                    attended: 0,
                    feedbackPending: 0,
                    inProcess: 0,
                    noShow: 0,
                    selected: 0,
                    totalEvents: 0
                });
            }
        } catch (err) {
            console.error('Error fetching calendar stats:', err);
            setError('Failed to load calendar data');
            setEvents([]);
            setMonthlyStats({ 
                interviews: 0,
                followups: 0, 
                joinings: 0, 
                profileSubmissions: 0,
                interested: 0,
                attended: 0,
                feedbackPending: 0,
                inProcess: 0,
                noShow: 0,
                selected: 0,
                totalEvents: 0
            });
        } finally {
            setLoading(false);
            loadingRef.current = false;
        }
    }, [currentDate]);

    // Debounced fetch function to prevent rapid successive calls (currently unused but kept for future use)
    const _debouncedFetchCalendarData = useCallback(() => {
        // Clear any existing timeout
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        // Set new timeout
        debounceRef.current = setTimeout(() => {
            fetchCalendarData();
        }, 300); // 300ms debounce
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Use month/year string as dependency to prevent unnecessary re-renders
    const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    // Single useEffect to handle all calendar data fetching
    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            if (isMounted && !loadingRef.current) {
                console.log('CalendarView - Fetching data for month:', currentMonthKey);
                await fetchCalendarData(currentDate);
            }
        };

        fetchData();

        // Cleanup function
        return () => {
            isMounted = false;
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentMonthKey]); // Only re-fetch when month/year changes, fetchCalendarData is stable via useCallback

    // Listen for cross-tab refresh messages when NFD/EJD/IFD dates are updated
    useEffect(() => {
        let channel;
        let timeoutId;
        
        try {
            channel = new BroadcastChannel('calendar_refresh');
            
            channel.onmessage = (event) => {
                if (event.data.type === 'CALENDAR_REFRESH_TRIGGER') {
                    console.log('📡 CalendarView - Cross-tab refresh trigger received:', event.data);
                    // Clear any pending timeout to avoid duplicate refreshes
                    if (timeoutId) clearTimeout(timeoutId);
                    // Trigger refresh after a small delay
                    timeoutId = setTimeout(() => {
                        console.log('🔄 CalendarView - Auto-refreshing calendar data');
                        fetchCalendarData(currentDate);
                    }, 500);
                }
            };
        } catch (error) {
            console.log('CalendarView - BroadcastChannel not supported:', error);
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            if (channel) channel.close();
        };
    }, [currentDate, fetchCalendarData]);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        // Add previous month's trailing days
        const prevMonth = new Date(year, month - 1, 0);
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            days.push({
                date: prevMonth.getDate() - i,
                isCurrentMonth: false,
                isToday: false,
                fullDate: new Date(year, month - 1, prevMonth.getDate() - i)
            });
        }

        // Add current month's days
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const dayDate = new Date(year, month, day);
            days.push({
                date: day,
                isCurrentMonth: true,
                isToday: dayDate.toDateString() === today.toDateString(),
                fullDate: dayDate
            });
        }

        // Add next month's leading days
        const totalCells = 42; // 6 rows × 7 days
        const remainingCells = totalCells - days.length;
        for (let day = 1; day <= remainingCells; day++) {
            days.push({
                date: day,
                isCurrentMonth: false,
                isToday: false,
                fullDate: new Date(year, month + 1, day)
            });
        }

        return days;
    };

    const navigateMonth = (direction) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(currentDate.getMonth() + direction);
        console.log('CalendarView - Navigating to:', newDate, 'from:', currentDate);
        setCurrentDate(newDate);
        // useEffect will automatically fetch data when currentDate changes
    };

    const goToToday = () => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
        // useEffect will automatically fetch data when currentDate changes
    };

    const handleMonthChange = (monthIndex) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(monthIndex);
        setCurrentDate(newDate);
        // useEffect will automatically fetch data when currentDate changes
    };

    const handleYearChange = (year) => {
        const newDate = new Date(currentDate);
        newDate.setFullYear(year);
        setCurrentDate(newDate);
        // useEffect will automatically fetch data when currentDate changes
    };

    const getEventsForDate = (date) => {
        // Handle both string and Date object inputs
        let dateStr;
        if (typeof date === 'string') {
            dateStr = date;
        } else if (date instanceof Date) {
            // Format date as YYYY-MM-DD in local timezone
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            dateStr = `${year}-${month}-${day}`;
        } else {
            return [];
        }

        const dayEvents = events.find(e => e.date === dateStr);
        return dayEvents ? dayEvents.events : [];
    };

    const getDayDataForDate = (date) => {
        // Handle both string and Date object inputs
        let dateStr;
        if (typeof date === 'string') {
            dateStr = date;
        } else if (date instanceof Date) {
            // Format date as YYYY-MM-DD in local timezone
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            dateStr = `${year}-${month}-${day}`;
        } else {
            return { events: [], event_counts: {} };
        }

        const dayData = events.find(e => e.date === dateStr);
        return dayData ? dayData : { events: [], event_counts: {} };
    };

    const handleDayClick = (day) => {
        setSelectedDate(day.fullDate);
        const dayEvents = getEventsForDate(day.fullDate);
        if (dayEvents.length > 0) {
            // Format date as YYYY-MM-DD for URL parameter
            const year = day.fullDate.getFullYear();
            const month = String(day.fullDate.getMonth() + 1).padStart(2, '0');
            const dayStr = String(day.fullDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${dayStr}`;

            // ✅ Open in NEW TAB instead of same tab
            const url = `/calendar-details?date=${dateStr}`;
            window.open(url, '_blank');
        }
    };

    const handleEventTypeClick = (day, eventType, e) => {
        e.stopPropagation(); // Prevent day click event
        setSelectedDate(day.fullDate);
        
        // Format date as YYYY-MM-DD for URL parameter
        const year = day.fullDate.getFullYear();
        const month = String(day.fullDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(day.fullDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${dayStr}`;

        // ✅ ADD EVENT TYPE FILTER to URL
        const url = `/calendar-details?date=${dateStr}&type=${eventType}`;
        window.open(url, '_blank');
    };

    const getEventDisplayText = (dayData, eventType) => {
        // Use backend-provided counts for accurate candidate counts
        if (dayData.event_counts && dayData.event_counts[eventType] !== undefined) {
            return `${eventType}-${dayData.event_counts[eventType]}`;
        }

        // Fallback to counting consolidated events (for backward compatibility)
        const count = dayData.events.filter(e => e.type === eventType || e.type.includes(eventType)).length;
        return `${eventType}-${count}`;
    };

    const generateYearOptions = () => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = currentYear - 5; i <= currentYear + 5; i++) {
            years.push(i);
        }
        return years;
    };

    // Mini calendar helper functions
    const getMiniCalendarDays = () => {
        const year = miniCalendarDate.getFullYear();
        const month = miniCalendarDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        const days = [];
        const current = new Date(startDate);

        for (let i = 0; i < 42; i++) {
            const currentYear = current.getFullYear();
            const currentMonth = current.getMonth();
            const currentDate = current.getDate();

            days.push({
                date: currentDate,
                year: currentYear,
                month: currentMonth,
                fullDate: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDate).padStart(2, '0')}`,
                isCurrentMonth: currentMonth === month,
                isToday: current.toDateString() === new Date().toDateString(),
                hasEvents: getEventsForDate(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDate).padStart(2, '0')}`).length > 0
            });
            current.setDate(current.getDate() + 1);
        }
        return days;
    };


    const handlePrevMiniMonth = () => {
        const newDate = new Date(miniCalendarDate);
        newDate.setMonth(newDate.getMonth() - 1);
        setMiniCalendarDate(newDate);
    };

    const handleNextMiniMonth = () => {
        const newDate = new Date(miniCalendarDate);
        newDate.setMonth(newDate.getMonth() + 1);
        setMiniCalendarDate(newDate);
    };

    const days = getDaysInMonth(currentDate);
    const miniCalendarDays = getMiniCalendarDays();

    // Show loading state while fetching data
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Calendar...</h3>
                    <p className="text-gray-600">Please wait while we fetch your events</p>
                </div>
            </div>
        );
    }

    // Show error state if there's an error
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <Calendar className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Calendar</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => fetchCalendarData()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50 ">
            {/* Modern Clean Header */}
            <div className="bg-white border-b border-gray-200 px-3 py-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                                <Calendar className="text-white w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-md font-bold text-gray-900">Calendar</h1>
                                <p className="text-gray-500 text-sm">Manage your events and schedule</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <button
                                    className="w-6 h-6 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors duration-200"
                                    onClick={() => navigateMonth(-1)}
                                >
                                    <ChevronLeft size={18} className="text-gray-600" />
                                </button>

                                <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-lg">
                                    <select
                                        className="bg-transparent border-0 text-md font-bold text-gray-900 cursor-pointer focus:outline-none appearance-none"
                                        value={currentDate.getMonth()}
                                        onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                                    >
                                        {months.map((month, index) => (
                                            <option key={index} value={index}>{month}</option>
                                        ))}
                                    </select>
                                    <select
                                        className="bg-transparent border-0 text-md font-bold text-gray-900 cursor-pointer focus:outline-none appearance-none"
                                        value={currentDate.getFullYear()}
                                        onChange={(e) => handleYearChange(parseInt(e.target.value))}
                                    >
                                        {generateYearOptions().map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    className="w-6 h-6 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors duration-200"
                                    onClick={() => navigateMonth(1)}
                                >
                                    <ChevronRight size={18} className="text-gray-600" />
                                </button>
                            </div>
                        </div>
                        <button
                            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-2 py-1 rounded-lg font-medium transition-colors duration-200"
                            onClick={goToToday}
                        >
                            Today
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-2">



                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex flex-1 gap-2 p-2 overflow-hidden h-[calc(100vh-280px)]">
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    {/* Week Days Header */}
                    <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200 flex-shrink-0">
                        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                            <div key={day} className="p-2 text-center text-base font-semibold text-gray-700 border-r border-gray-200 last:border-r-0">
                                <div className="hidden md:block">{day}</div>
                                <div className="md:hidden">{day.slice(0, 3)}</div>
                            </div>
                        ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 flex-1 overflow-y-auto scrollbar-hide">
                        {days.map((day, index) => {
                            const dayData = getDayDataForDate(day.fullDate);

                            return (
                                <div
                                    key={index}
                                    className={`border-r border-b border-gray-200 p-3 cursor-pointer transition-all duration-200 flex flex-col min-h-[220px] group ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'hover:bg-blue-50'
                                        } ${day.isToday ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                                        }`}
                                    onClick={() => handleDayClick(day)}
                                >
                                    <div className={`text-sm font-semibold mb-1 ${day.isToday ? 'text-blue-600 bg-blue-100 w-7 h-7 rounded-full flex items-center justify-center' :
                                        !day.isCurrentMonth ? 'text-gray-400' : 'text-gray-900'
                                        }`}>
                                        {day.date}
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-1 flex-1 overflow-y-auto max-h-[190px] scrollbar-hide w-full">
                                        {/* Group events by type and show counts - only for current month days
                                           Order (2 columns):
                                           NFD  EJD
                                           PS   IF
                                           ATND SEL
                                           INP  NR
                                        */}
                                        {day.isCurrentMonth && ['NFD', 'EDJ', 'PS', 'IF', 'ATND', 'SEL', 'INP', 'NR'].map(eventType => {
                                            const displayText = getEventDisplayText(dayData, eventType);

                                            return (
                                                <div
                                                    key={eventType}
                                                    className={`text-xs px-2 py-1 rounded-md font-bold whitespace-normal overflow-visible transition-all duration-200 cursor-pointer grid place-items-center w-full 
                                                        ${displayText.endsWith('-0') ? 'opacity-60 ' : ''}
                                                        ${eventType === 'IF' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                                                            eventType === 'NFD' ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' :
                                                            eventType === 'EDJ' ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200' :
                                                            eventType === 'PS' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                                                            eventType === 'ATND' ? 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200' :
                                                            eventType === 'SEL' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' :
                                                            eventType === 'NR' ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' :
                                                            eventType === 'INP' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                                                            'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                                        }`}
                                                    onClick={(e) => handleEventTypeClick(day, eventType, e)}
                                                    title={eventType === 'IF' ? 'Interview Fixed' : 
                                                           eventType === 'NFD' ? 'Next Follow-up Date' : 
                                                           eventType === 'EDJ' ? 'Expected Date of Joining' :
                                                           eventType === 'PS' ? 'Profile Submission' :
                                                           eventType === 'ATND' ? 'Attended' :
                                                           eventType === 'SEL' ? 'Selected' :
                                                           eventType === 'NR' ? 'Next Round' :
                                                           eventType === 'INP' ? 'In Process' :
                                                           'Event'}
                                                >
                                                    <span className="text-center">{displayText}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Modern Sidebar */}
                <div className="hidden xl:block w-80 h-[calc(100vh-80px)] overflow-y-auto scrollbar-hide space-y-2 pr-2">
                    {/* Mini Calendar Card */}
                    {/* <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-md font-semibold text-gray-900">Calendar</h3>
                            <div className="flex items-center gap-1">
                                <button
                                    className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors duration-200"
                                    onClick={handlePrevMiniMonth}
                                >
                                    <ChevronLeft size={16} className="text-gray-600" />
                                </button>
                                <div className="text-center">
                                    <div className="text-base font-semibold text-gray-900">
                                        {miniCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                    </div>
                                </div>
                                <button
                                    className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors duration-200"
                                    onClick={handleNextMiniMonth}
                                >
                                    <ChevronRight size={16} className="text-gray-600" />
                                </button>
                            </div>
                        </div>

                        
                        <div className="grid grid-cols-7 gap-1 text-sm mb-2">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                                <div key={index} className="text-center font-medium text-gray-500 p-2">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-sm">
                            {miniCalendarDays.map((day, index) => {
                                const dayEvents = getEventsForDate(day.fullDate);
                                const hasEvents = dayEvents.length > 0;
                                return (
                                    <div
                                        key={index}
                                        className={`text-center p-2 rounded-md cursor-pointer transition-colors duration-200 relative ${!day.isCurrentMonth ? 'text-gray-400 hover:bg-gray-50' :
                                            day.isToday ? 'bg-blue-600 text-white font-semibold' :
                                                'text-gray-700 hover:bg-gray-100'
                                            }`}
                                        onClick={() => {
                                            const newDate = new Date(day.year, day.month, day.date);
                                            setCurrentDate(newDate);
                                            setMiniCalendarDate(newDate);
                                        }}
                                    >
                                        {day.date}
                                        {hasEvents && !day.isToday && (
                                            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div> */}

                    {/* Stats Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <h3 className="text-md font-semibold text-gray-900 mb-3">This Month</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {/* Row 1: NFD, EDJ */}
                            <div className="text-center p-2 bg-orange-50 rounded-lg" title="Next Follow-up Date (NFD)">
                                <div className="text-lg font-bold text-orange-600">{monthlyStats.followups}</div>
                                <div className="text-sm text-orange-600 font-medium">Follow-ups</div>
                            </div>
                            <div className="text-center p-2 bg-indigo-50 rounded-lg" title="Expected Date of Joining (EDJ)">
                                <div className="text-lg font-bold text-indigo-600">{monthlyStats.joinings}</div>
                                <div className="text-sm text-indigo-600 font-medium">Joinings</div>
                            </div>

                            {/* Row 2: PS, IF */}
                            <div className="text-center p-2 bg-blue-50 rounded-lg" title="Profile Submission (PS)">
                                <div className="text-lg font-bold text-blue-600">{monthlyStats.profileSubmissions}</div>
                                <div className="text-sm text-blue-600 font-medium">Profiles</div>
                            </div>
                            <div className="text-center p-2 bg-green-50 rounded-lg" title="Interview Fixed (IF)">
                                <div className="text-lg font-bold text-green-600">{monthlyStats.interviews}</div>
                                <div className="text-sm text-green-600 font-medium">Interviews</div>
                            </div>

                            {/* Row 3: ATND, SEL */}
                            <div className="text-center p-2 bg-cyan-50 rounded-lg" title="Attended (ATND)">
                                <div className="text-lg font-bold text-cyan-600">{monthlyStats.attended}</div>
                                <div className="text-sm text-cyan-600 font-medium">Attended</div>
                            </div>
                            <div className="text-center p-2 bg-emerald-50 rounded-lg" title="Selected (SEL)">
                                <div className="text-lg font-bold text-emerald-600">{monthlyStats.selected}</div>
                                <div className="text-sm text-emerald-600 font-medium">Selected</div>
                            </div>

                            {/* Row 4: INP, INT */}
                            <div className="text-center p-2 bg-yellow-50 rounded-lg" title="In Process (INP)">
                                <div className="text-lg font-bold text-yellow-600">{monthlyStats.inProcess || 0}</div>
                                <div className="text-sm text-yellow-600 font-medium">In Process</div>
                            </div>
                            
                            <div className="text-center p-2 bg-purple-50 rounded-lg" title="Next Round (NR)">
                                <div className="text-lg font-bold text-purple-600">{monthlyStats.nextRound || 0}</div>
                                <div className="text-sm text-purple-600 font-medium">Next Round</div>
                            </div>

                            {/* Remaining stats */}
                            
                            <div className="text-center p-2 bg-gray-50 rounded-lg col-span-2">
                                <div className="text-lg font-bold text-gray-600">{monthlyStats.totalEvents}</div>
                                <div className="text-sm text-gray-600 font-medium">Total Events</div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity Card
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 overflow-y-auto max-h-80">
                        <h3 className="text-md font-semibold text-gray-900 mb-3">Recent Activity</h3>
                        <div className="space-y-2">
                            <div className="flex items-start gap-3" title="Interview Fixed (IF)">
                                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">Interviews Fixed</div>
                                    <div className="text-sm text-gray-500">{monthlyStats.interviews} this month</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3" title="Next Follow-up Date (NFD)">
                                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">Follow-up Dates</div>
                                    <div className="text-sm text-gray-500">{monthlyStats.followups} this month</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3" title="Expected Date of Joining (EDJ)">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2"></div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">Expected Joinings</div>
                                    <div className="text-sm text-gray-500">{monthlyStats.joinings} this month</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3" title="Profile Submission (PS)">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">Profile Submissions</div>
                                    <div className="text-sm text-gray-500">{monthlyStats.profileSubmissions} this month</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3" title="Interested (INT)">
                                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">Interested Candidates</div>
                                    <div className="text-sm text-gray-500">{monthlyStats.interested} this month</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3" title="Attended (ATND)">
                                <div className="w-2 h-2 bg-cyan-500 rounded-full mt-2"></div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">Attended</div>
                                    <div className="text-sm text-gray-500">{monthlyStats.attended} this month</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3" title="Rejected (REJ)">
                                <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">Rejected</div>
                                    <div className="text-sm text-gray-500">{monthlyStats.rejected || 0} this month</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3" title="No Show (NS)">
                                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">No Shows</div>
                                    <div className="text-sm text-gray-500">{monthlyStats.noShow} this month</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3" title="Selected (SEL)">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">Selected Candidates</div>
                                    <div className="text-sm text-gray-500">{monthlyStats.selected} this month</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3" title="In Process (INP)">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">In Process</div>
                                    <div className="text-sm text-gray-500">{monthlyStats.inProcess || 0} this month</div>
                                </div>
                            </div>
                            {monthlyStats.totalEvents === 0 && (
                                <div className="text-center py-4">
                                    <div className="text-sm text-gray-500">No events for this month</div>
                                </div>
                            )}
                        </div>
                    </div> */}
                </div>
            </div>

        </div>
    );
};

export default CalendarView;
