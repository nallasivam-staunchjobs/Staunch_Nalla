import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Dashboard Data
  analytics: {
    totalCandidates: 0,
    totalJobs: 0,
    totalUsers: 0,
    totalVendors: 0,
    activeJobs: 0,
    pendingInterviews: 0,
    completedInterviews: 0,
    revenue: 0,
    expenses: 0,
    profit: 0,
  },
  
  // Chart Data
  charts: {
    candidateTrends: [],
    jobPostingTrends: [],
    revenueChart: [],
    interviewStats: [],
    departmentDistribution: [],
    skillDemand: [],
  },
  
  // Recent Activities
  recentActivities: [],
  
  // Quick Stats
  quickStats: {
    todayInterviews: 0,
    thisWeekInterviews: 0,
    thisMonthInterviews: 0,
    pendingApplications: 0,
    shortlistedCandidates: 0,
    rejectedCandidates: 0,
  },
  
  // Dashboard Configuration
  dashboardConfig: {
    layout: 'default',
    widgets: [
      { id: 'candidateStats', title: 'Candidate Statistics', visible: true, position: 0 },
      { id: 'jobStats', title: 'Job Statistics', visible: true, position: 1 },
      { id: 'revenueChart', title: 'Revenue Chart', visible: true, position: 2 },
      { id: 'recentActivities', title: 'Recent Activities', visible: true, position: 3 },
      { id: 'interviewCalendar', title: 'Interview Calendar', visible: true, position: 4 },
      { id: 'quickActions', title: 'Quick Actions', visible: true, position: 5 },
    ],
    refreshInterval: 30000, // 30 seconds
    autoRefresh: true,
  },
  
  // Loading States
  loading: {
    analytics: false,
    charts: false,
    activities: false,
    quickStats: false,
  },
  
  error: null,
  lastUpdated: null,
  
  // Filters
  filters: {
    dateRange: {
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      endDate: new Date().toISOString(),
    },
    department: 'all',
    status: 'all',
  },
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    // Analytics Data
    setAnalytics: (state, action) => {
      state.analytics = { ...state.analytics, ...action.payload };
    },
    updateAnalytics: (state, action) => {
      const { key, value } = action.payload;
      state.analytics[key] = value;
    },
    
    // Chart Data
    setChartData: (state, action) => {
      const { chartType, data } = action.payload;
      state.charts[chartType] = data;
    },
    updateChartData: (state, action) => {
      const { chartType, data } = action.payload;
      if (state.charts[chartType]) {
        state.charts[chartType] = [...state.charts[chartType], ...data];
      }
    },
    
    // Recent Activities
    setRecentActivities: (state, action) => {
      state.recentActivities = action.payload;
    },
    addActivity: (state, action) => {
      state.recentActivities.unshift(action.payload);
      // Keep only last 50 activities
      if (state.recentActivities.length > 50) {
        state.recentActivities = state.recentActivities.slice(0, 50);
      }
    },
    clearActivities: (state) => {
      state.recentActivities = [];
    },
    
    // Quick Stats
    setQuickStats: (state, action) => {
      state.quickStats = { ...state.quickStats, ...action.payload };
    },
    updateQuickStats: (state, action) => {
      const { key, value } = action.payload;
      state.quickStats[key] = value;
    },
    
    // Dashboard Configuration
    setDashboardConfig: (state, action) => {
      state.dashboardConfig = { ...state.dashboardConfig, ...action.payload };
    },
    updateWidgetVisibility: (state, action) => {
      const { widgetId, visible } = action.payload;
      const widget = state.dashboardConfig.widgets.find(w => w.id === widgetId);
      if (widget) {
        widget.visible = visible;
      }
    },
    updateWidgetPosition: (state, action) => {
      const { widgetId, position } = action.payload;
      const widget = state.dashboardConfig.widgets.find(w => w.id === widgetId);
      if (widget) {
        widget.position = position;
      }
    },
    addWidget: (state, action) => {
      state.dashboardConfig.widgets.push(action.payload);
    },
    removeWidget: (state, action) => {
      state.dashboardConfig.widgets = state.dashboardConfig.widgets.filter(
        widget => widget.id !== action.payload
      );
    },
    setRefreshInterval: (state, action) => {
      state.dashboardConfig.refreshInterval = action.payload;
    },
    toggleAutoRefresh: (state) => {
      state.dashboardConfig.autoRefresh = !state.dashboardConfig.autoRefresh;
    },
    
    // Loading States
    setLoading: (state, action) => {
      const { type, loading } = action.payload;
      state.loading[type] = loading;
    },
    setAllLoading: (state, action) => {
      Object.keys(state.loading).forEach(key => {
        state.loading[key] = action.payload;
      });
    },
    
    // Error Handling
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    
    // Last Updated
    setLastUpdated: (state, action) => {
      state.lastUpdated = action.payload;
    },
    
    // Filters
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setDateRange: (state, action) => {
      state.filters.dateRange = action.payload;
    },
    setDepartmentFilter: (state, action) => {
      state.filters.department = action.payload;
    },
    setStatusFilter: (state, action) => {
      state.filters.status = action.payload;
    },
    resetFilters: (state) => {
      state.filters = {
        dateRange: {
          startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
          endDate: new Date().toISOString(),
        },
        department: 'all',
        status: 'all',
      };
    },
    
    // Dashboard Actions
    refreshDashboard: (state) => {
      state.lastUpdated = new Date().toISOString();
    },
    exportDashboard: (state, action) => {
      // This would typically trigger an export action
      state.lastUpdated = new Date().toISOString();
    },
    
    // Notifications
    addNotification: (state, action) => {
      // Add notification to recent activities
      const notification = {
        id: Date.now(),
        type: 'notification',
        message: action.payload.message,
        timestamp: new Date().toISOString(),
        read: false,
        ...action.payload,
      };
      state.recentActivities.unshift(notification);
    },
    markNotificationAsRead: (state, action) => {
      const activity = state.recentActivities.find(a => a.id === action.payload);
      if (activity) {
        activity.read = true;
      }
    },
    
    // Reset Dashboard
    resetDashboard: (state) => {
      state.analytics = initialState.analytics;
      state.charts = initialState.charts;
      state.recentActivities = [];
      state.quickStats = initialState.quickStats;
      state.loading = initialState.loading;
      state.error = null;
      state.lastUpdated = null;
      state.filters = initialState.filters;
    },
    
    // Preset Configurations
    setDefaultLayout: (state) => {
      state.dashboardConfig.layout = 'default';
      state.dashboardConfig.widgets = initialState.dashboardConfig.widgets;
    },
    setCompactLayout: (state) => {
      state.dashboardConfig.layout = 'compact';
      state.dashboardConfig.widgets = state.dashboardConfig.widgets.map(widget => ({
        ...widget,
        visible: ['candidateStats', 'jobStats', 'recentActivities'].includes(widget.id),
      }));
    },
    setDetailedLayout: (state) => {
      state.dashboardConfig.layout = 'detailed';
      state.dashboardConfig.widgets = state.dashboardConfig.widgets.map(widget => ({
        ...widget,
        visible: true,
      }));
    },
  },
});

export const {
  // Analytics
  setAnalytics,
  updateAnalytics,
  
  // Charts
  setChartData,
  updateChartData,
  
  // Activities
  setRecentActivities,
  addActivity,
  clearActivities,
  
  // Quick Stats
  setQuickStats,
  updateQuickStats,
  
  // Dashboard Config
  setDashboardConfig,
  updateWidgetVisibility,
  updateWidgetPosition,
  addWidget,
  removeWidget,
  setRefreshInterval,
  toggleAutoRefresh,
  
  // Loading
  setLoading,
  setAllLoading,
  
  // Error
  setError,
  clearError,
  
  // Last Updated
  setLastUpdated,
  
  // Filters
  setFilters,
  setDateRange,
  setDepartmentFilter,
  setStatusFilter,
  resetFilters,
  
  // Actions
  refreshDashboard,
  exportDashboard,
  
  // Notifications
  addNotification,
  markNotificationAsRead,
  
  // Reset
  resetDashboard,
  
  // Layouts
  setDefaultLayout,
  setCompactLayout,
  setDetailedLayout,
} = dashboardSlice.actions;

export default dashboardSlice.reducer; 