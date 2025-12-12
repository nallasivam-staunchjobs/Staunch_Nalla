import { apiRequest } from './apiConfig';

/**
 * Calendar API service for fetching candidate-related calendar statistics
 */
class CalendarApi {
    /**
     * Get calendar statistics for a specific month
     * @param {string} month - Month in YYYY-MM format (optional)
     * @param {string} year - Year in YYYY format (optional)
     * @returns {Promise} API response with calendar statistics
     */
    async getCalendarStats(month = null, year = null) {
        try {
            const params = new URLSearchParams();
            if (month) params.append('month', month);
            if (year) params.append('year', year);
            
            const queryString = params.toString();
            // Use the original calendar-stats endpoint
            const endpoint = `/candidates/calendar-stats/${queryString ? `?${queryString}` : ''}`;
            
            console.log('Calendar API endpoint:', endpoint);
            const response = await apiRequest(endpoint);
            console.log('Calendar API response:', response);
            return response;
        } catch (error) {
            console.error('Error fetching calendar stats:', error);
            throw error;
        }
    }

    /**
     * Get calendar statistics for current month
     * @returns {Promise} API response with current month statistics
     */
    async getCurrentMonthStats() {
        return this.getCalendarStats();
    }

    /**
     * Get calendar statistics for a specific date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise} API response with date range statistics
     */
    async getDateRangeStats(startDate, endDate) {
        // For now, we'll use the month-based API
        // This can be extended later if needed
        const month = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
        return this.getCalendarStats(month);
    }

    /**
     * Format calendar events for display
     * @param {Array} events - Raw events from API with enriched candidate data
     * @returns {Array} Formatted events for calendar display
     */
    formatEventsForCalendar(events) {
        return events.map(event => ({
            date: event.date,
            event_counts: event.event_counts || {}, // Pass through event counts from backend
            events: event.events.map(eventObj => {
                // Handle new enriched event structure with candidate details
                const baseEvent = {
                    id: `${eventObj.type}-${eventObj.candidate?.id || 'unknown'}`,
                    type: eventObj.type,
                    candidate: {
                        id: eventObj.candidate.id,
                        name: eventObj.candidate.name || eventObj.candidate.candidate_name,
                        email: eventObj.candidate.email,
                        mobile: eventObj.candidate.mobile || eventObj.candidate.contact || eventObj.candidate.mobile1,
                        executive_name: eventObj.candidate.executive_name
                    },
                    displayText: `${eventObj.type}-1`, // For backward compatibility
                    color: this.getEventColor(eventObj.type)
                };
                
                // Add client_job data if available
                if (eventObj.client_job) {
                    baseEvent.client_job = eventObj.client_job;
                }
                
                // Add status_history data if available
                if (eventObj.status_history) {
                    baseEvent.status_history = eventObj.status_history;
                    baseEvent.displayText = `${eventObj.type}-${eventObj.status_history.remarks}`;
                }
                
                return baseEvent;
            })
        }));
    }

    /**
     * Get color class for event type
     * @param {string} type - Event type (IF, NFD, EDJ, Profile Submission, etc.)
     * @returns {string} CSS color class
     */
    getEventColor(type) {
        switch (type) {
            case 'IF': return 'event-if'; // Interview Fixed - Green
            case 'NFD': return 'event-nfd'; // Next Follow-up Date - Orange
            case 'EDJ': return 'event-edj'; // Expected Date of Joining - Indigo
            case 'PS': return 'event-profile'; // Profile Submission - Blue
            case 'INT': return 'event-interested'; // Interested - Purple
            case 'AFP': return 'event-attend'; // Attended & Further Process - Cyan
            case 'ATF': return 'event-attend'; // Attend - Cyan
            case 'NS': return 'event-noshow'; // No Show - Red
            case 'SEL': return 'event-selected'; // Selected - Emerald
            case 'JND': return 'event-joined'; // Joined - Dark Green
            case 'REJ': return 'event-rejected'; // Rejected - Red
            case 'HLD': return 'event-hold'; // Hold - Yellow
            case 'CL': return 'event-call-later'; // Call Later - Light Blue
            case 'NLJ': return 'event-not-looking'; // Not Looking - Gray
            case 'GE': return 'event-golden-egg'; // Golden Egg - Gold
            case 'PS': return 'event-profile-submission'; // Profile Submission - Blue
            case 'SH': return 'event-status-history'; // Generic Status History - Light Purple
            case 'NR': return 'event-next-round'; // Next Round - Purple
            case 'INP': return 'event-in-process'; // In Process - Yellow
            default: return 'event-default';
        }
    }

    /**
     * Get event type display name
     * @param {string} type - Event type code
     * @returns {string} Human readable event type
     */
    getEventTypeName(type) {
        switch (type) {
            case 'IF': return 'Interview Fixed';
            case 'NFD': return 'Next Follow-up Date';
            case 'EDJ': return 'Expected Date of Joining';
            case 'PS': return 'Profile Submission';
            case 'INT': return 'Interested';
            case 'AFP': return 'Attend & Further Process';
            case 'NS': return 'No Show';
            case 'SEL': return 'Selected';
            case 'INP': return 'In Process';
            case 'NR': return 'Next Round';
            default: return 'Event';
        }
    }

    /**
     * Get summary statistics from API response
     * @param {Object} apiResponse - Response from calendar stats API
     * @returns {Object} Summary statistics
     */
    getSummaryStats(apiResponse) {
        if (!apiResponse || !apiResponse.totals) {
            return {
                interviews: 0,
                followups: 0,
                joinings: 0,
                profileSubmissions: 0,
                interested: 0,
                attended: 0,
                noShow: 0,
                selected: 0,
                inProcess: 0,
                feedbackPending: 0,
                nextRound:0,
                totalEvents: 0
            };
        }

        return {
            interviews: apiResponse.totals.interviews || 0,
            followups: apiResponse.totals.followups || 0,
            joinings: apiResponse.totals.joinings || 0,
            profileSubmissions: apiResponse.totals.profile_submissions || 0,
            interested: apiResponse.totals.interested || 0,
            attended: apiResponse.totals.attended || 0,
            noShow: apiResponse.totals.no_show || 0,
            selected: apiResponse.totals.selected || 0,
            inProcess: apiResponse.totals.in_process || 0,
            feedbackPending: apiResponse.totals.feedback_pending || 0,
            nextRound: apiResponse.totals.next_round || 0,
            totalEvents: apiResponse.totals.total_events || 0
        };
    }
}

export default new CalendarApi();
