import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  events: [],
  selectedEvent: null,
  selectedDate: new Date().toISOString(),
  currentView: 'month', // month, week, day, agenda
  loading: false,
  error: null,
  searchQuery: '',
  filterCategory: 'all',
  filterStatus: 'all',
  currentPage: 1,
  itemsPerPage: 10,
  totalEvents: 0,
  isEditMode: false,
  showEventModal: false,
  showDeleteModal: false,
  eventToDelete: null,
  categories: [
    { id: 1, name: 'Meeting', color: '#3B82F6' },
    { id: 2, name: 'Interview', color: '#10B981' },
    { id: 3, name: 'Deadline', color: '#F59E0B' },
    { id: 4, name: 'Training', color: '#8B5CF6' },
    { id: 5, name: 'Holiday', color: '#EF4444' },
  ],
  eventTypes: [
    { id: 1, name: 'Internal Meeting' },
    { id: 2, name: 'Client Meeting' },
    { id: 3, name: 'Interview' },
    { id: 4, name: 'Training Session' },
    { id: 5, name: 'Deadline' },
    { id: 6, name: 'Holiday' },
    { id: 7, name: 'Other' },
  ],
  recurringPatterns: [
    { id: 'none', name: 'No Repeat' },
    { id: 'daily', name: 'Daily' },
    { id: 'weekly', name: 'Weekly' },
    { id: 'monthly', name: 'Monthly' },
    { id: 'yearly', name: 'Yearly' },
  ],
  // Refresh trigger for auto-refresh functionality
  refreshTrigger: 0,
  lastRefreshTimestamp: null,
};

const calendarSlice = createSlice({
  name: 'calendar',
  initialState,
  reducers: {
    // Events
    setEvents: (state, action) => {
      state.events = action.payload;
      state.totalEvents = action.payload.length;
    },
    addEvent: (state, action) => {
      state.events.push(action.payload);
      state.totalEvents += 1;
    },
    updateEvent: (state, action) => {
      const { id, ...updateData } = action.payload;
      const index = state.events.findIndex(event => event.id === id);
      if (index !== -1) {
        state.events[index] = { ...state.events[index], ...updateData };
      }
    },
    deleteEvent: (state, action) => {
      state.events = state.events.filter(event => event.id !== action.payload);
      state.totalEvents -= 1;
    },
    setSelectedEvent: (state, action) => {
      state.selectedEvent = action.payload;
    },

    // Calendar Navigation
    setSelectedDate: (state, action) => {
      state.selectedDate = typeof action.payload === 'string' ? action.payload : new Date(action.payload).toISOString();
    },
    setCurrentView: (state, action) => {
      state.currentView = action.payload;
    },
    goToToday: (state) => {
      state.selectedDate = new Date().toISOString();
    },
    goToPrevious: (state) => {
      const currentDate = new Date(state.selectedDate);
      switch (state.currentView) {
        case 'month':
          currentDate.setMonth(currentDate.getMonth() - 1);
          break;
        case 'week':
          currentDate.setDate(currentDate.getDate() - 7);
          break;
        case 'day':
          currentDate.setDate(currentDate.getDate() - 1);
          break;
        default:
          break;
      }
      state.selectedDate = currentDate.toISOString();
    },
    goToNext: (state) => {
      const currentDate = new Date(state.selectedDate);
      switch (state.currentView) {
        case 'month':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'week':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'day':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        default:
          break;
      }
      state.selectedDate = currentDate.toISOString();
    },

    // Event Categories
    addCategory: (state, action) => {
      state.categories.push(action.payload);
    },
    updateCategory: (state, action) => {
      const { id, ...updateData } = action.payload;
      const index = state.categories.findIndex(category => category.id === id);
      if (index !== -1) {
        state.categories[index] = { ...state.categories[index], ...updateData };
      }
    },
    deleteCategory: (state, action) => {
      state.categories = state.categories.filter(category => category.id !== action.payload);
    },

    // Event Types
    addEventType: (state, action) => {
      state.eventTypes.push(action.payload);
    },
    updateEventType: (state, action) => {
      const { id, ...updateData } = action.payload;
      const index = state.eventTypes.findIndex(type => type.id === id);
      if (index !== -1) {
        state.eventTypes[index] = { ...state.eventTypes[index], ...updateData };
      }
    },
    deleteEventType: (state, action) => {
      state.eventTypes = state.eventTypes.filter(type => type.id !== action.payload);
    },

    // Recurring Events
    createRecurringEvent: (state, action) => {
      const { baseEvent, pattern, endDate } = action.payload;
      const events = [];
      let currentDate = new Date(baseEvent.startDate);
      const end = new Date(endDate);

      while (currentDate <= end) {
        const eventDate = new Date(currentDate);
        const newEvent = {
          ...baseEvent,
          id: Date.now() + Math.random(),
          startDate: new Date(eventDate.setHours(new Date(baseEvent.startDate).getHours())),
          endDate: new Date(eventDate.setHours(new Date(baseEvent.endDate).getHours())),
          isRecurring: true,
          recurringPattern: pattern,
          originalEventId: baseEvent.id,
        };
        events.push(newEvent);

        // Calculate next occurrence
        switch (pattern) {
          case 'daily':
            currentDate.setDate(currentDate.getDate() + 1);
            break;
          case 'weekly':
            currentDate.setDate(currentDate.getDate() + 7);
            break;
          case 'monthly':
            currentDate.setMonth(currentDate.getMonth() + 1);
            break;
          case 'yearly':
            currentDate.setFullYear(currentDate.getFullYear() + 1);
            break;
          default:
            break;
        }
      }

      state.events.push(...events);
      state.totalEvents += events.length;
    },

    // Event Status Management
    markEventAsCompleted: (state, action) => {
      const index = state.events.findIndex(event => event.id === action.payload);
      if (index !== -1) {
        state.events[index].status = 'completed';
      }
    },
    markEventAsCancelled: (state, action) => {
      const index = state.events.findIndex(event => event.id === action.payload);
      if (index !== -1) {
        state.events[index].status = 'cancelled';
      }
    },
    rescheduleEvent: (state, action) => {
      const { eventId, newStartDate, newEndDate } = action.payload;
      const index = state.events.findIndex(event => event.id === eventId);
      if (index !== -1) {
        state.events[index].startDate = typeof newStartDate === 'string' ? newStartDate : new Date(newStartDate).toISOString();
        state.events[index].endDate = typeof newEndDate === 'string' ? newEndDate : new Date(newEndDate).toISOString();
        state.events[index].lastModified = new Date().toISOString();
      }
    },

    // UI State
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
      state.currentPage = 1;
    },
    setFilterCategory: (state, action) => {
      state.filterCategory = action.payload;
      state.currentPage = 1;
    },
    setFilterStatus: (state, action) => {
      state.filterStatus = action.payload;
      state.currentPage = 1;
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
    setItemsPerPage: (state, action) => {
      state.itemsPerPage = action.payload;
      state.currentPage = 1;
    },
    setIsEditMode: (state, action) => {
      state.isEditMode = action.payload;
    },
    setShowEventModal: (state, action) => {
      state.showEventModal = action.payload;
    },
    setShowDeleteModal: (state, action) => {
      state.showDeleteModal = action.payload;
    },
    setEventToDelete: (state, action) => {
      state.eventToDelete = action.payload;
    },

    // Bulk Operations
    bulkDeleteEvents: (state, action) => {
      const eventIds = action.payload;
      state.events = state.events.filter(event => !eventIds.includes(event.id));
      state.totalEvents -= eventIds.length;
    },
    bulkUpdateEventStatus: (state, action) => {
      const { eventIds, status } = action.payload;
      state.events.forEach(event => {
        if (eventIds.includes(event.id)) {
          event.status = status;
        }
      });
    },

    // Event Search and Filter
    searchEvents: (state, action) => {
      state.searchQuery = action.payload;
      state.currentPage = 1;
    },
    filterEventsByDateRange: (state, action) => {
      const { startDate, endDate } = action.payload;
      // This would typically be handled in a selector
      state.filterDateRange = { startDate, endDate };
      state.currentPage = 1;
    },

    // Reset
    resetCalendar: (state) => {
      state.selectedEvent = null;
      state.isEditMode = false;
      state.searchQuery = '';
      state.filterCategory = 'all';
      state.filterStatus = 'all';
      state.currentPage = 1;
      state.error = null;
      state.showEventModal = false;
      state.showDeleteModal = false;
      state.eventToDelete = null;
    },

    // Trigger calendar refresh (for auto-refresh when NFD/remarks updated)
    triggerCalendarRefresh: (state) => {
      state.refreshTrigger += 1;
      state.lastRefreshTimestamp = new Date().toISOString();
    },
  },
});

export const {
  // Events
  setEvents,
  addEvent,
  updateEvent,
  deleteEvent,
  setSelectedEvent,
  
  // Calendar Navigation
  setSelectedDate,
  setCurrentView,
  goToToday,
  goToPrevious,
  goToNext,
  
  // Categories
  addCategory,
  updateCategory,
  deleteCategory,
  
  // Event Types
  addEventType,
  updateEventType,
  deleteEventType,
  
  // Recurring Events
  createRecurringEvent,
  
  // Event Status
  markEventAsCompleted,
  markEventAsCancelled,
  rescheduleEvent,
  
  // UI State
  setLoading,
  setError,
  setSearchQuery,
  setFilterCategory,
  setFilterStatus,
  setCurrentPage,
  setItemsPerPage,
  setIsEditMode,
  setShowEventModal,
  setShowDeleteModal,
  setEventToDelete,
  
  // Bulk Operations
  bulkDeleteEvents,
  bulkUpdateEventStatus,
  
  // Search and Filter
  searchEvents,
  filterEventsByDateRange,
  
  // Reset
  resetCalendar,

  // Refresh
  triggerCalendarRefresh,
} = calendarSlice.actions;

export default calendarSlice.reducer; 