import { createSelector } from '@reduxjs/toolkit';

// Base selectors
export const selectJobPosting = (state) => state.jobPosting;
export const selectForm = (state) => state.form;
export const selectCandidates = (state) => state.candidates;
export const selectUI = (state) => state.ui;
export const selectMasterData = (state) => state.masterData;
export const selectUserManagement = (state) => state.userManagement;
export const selectVendorManagement = (state) => state.vendorManagement;
export const selectDTR = (state) => state.dtr;
export const selectCalendar = (state) => state.calendar;
export const selectDashboard = (state) => state.dashboard;
export const selectAuth = (state) => state.auth;

// Auth Selectors
export const selectUser = createSelector([selectAuth], (auth) => auth.user);
export const selectIsAuthenticated = createSelector([selectAuth], (auth) => auth.isAuthenticated);
export const selectToken = createSelector([selectAuth], (auth) => auth.token);
export const selectPermissions = createSelector([selectAuth], (auth) => auth.permissions);
export const selectRoles = createSelector([selectAuth], (auth) => auth.roles);
export const selectAuthLoading = createSelector([selectAuth], (auth) => auth.loading);
export const selectAuthError = createSelector([selectAuth], (auth) => auth.error);
export const selectIsLocked = createSelector([selectAuth], (auth) => auth.isLocked);
export const selectLoginAttempts = createSelector([selectAuth], (auth) => auth.loginAttempts);

// Permission Check Selector
export const selectHasPermission = createSelector(
  [selectPermissions],
  (permissions) => (permission) => permissions.includes(permission)
);

export const selectHasRole = createSelector(
  [selectRoles],
  (roles) => (role) => roles.includes(role)
);

// UI Selectors
export const selectCurrentView = createSelector([selectUI], (ui) => ui.currentView);
export const selectCurrentStep = createSelector([selectUI], (ui) => ui.currentStep);
export const selectSearchTerm = createSelector([selectUI], (ui) => ui.searchTerm);
export const selectTableSearchQuery = createSelector([selectUI], (ui) => ui.tableSearchQuery);
export const selectEntriesPerPage = createSelector([selectUI], (ui) => ui.entriesPerPage);
export const selectIsViewModalOpen = createSelector([selectUI], (ui) => ui.isViewModalOpen);

// Form Selectors
export const selectFormData = createSelector([selectForm], (form) => form.formData);
export const selectResumeFile = createSelector([selectForm], (form) => form.resumeFile);
export const selectResumePreview = createSelector([selectForm], (form) => form.resumePreview);
export const selectIsParsingResume = createSelector([selectForm], (form) => form.isParsingResume);

// Candidates Selectors
export const selectExistingCandidates = createSelector([selectCandidates], (candidates) => candidates.existingCandidates);
export const selectSubmittedCandidates = createSelector([selectCandidates], (candidates) => candidates.submittedCandidates);
export const selectSearchResults = createSelector([selectCandidates], (candidates) => candidates.searchResults);
export const selectSelectedCandidate = createSelector([selectCandidates], (candidates) => candidates.selectedCandidate);

// Job Posting Selectors
export const selectJobPostingFormData = createSelector([selectJobPosting], (jobPosting) => jobPosting.formData);
export const selectJobPostingCurrentStep = createSelector([selectJobPosting], (jobPosting) => jobPosting.currentStep);
export const selectJobPostingLoading = createSelector([selectJobPosting], (jobPosting) => jobPosting.loading);
export const selectJobPostingError = createSelector([selectJobPosting], (jobPosting) => jobPosting.error);

// Master Data Selectors
export const selectIndustries = createSelector([selectMasterData], (masterData) => masterData.industries);
export const selectDepartments = createSelector([selectMasterData], (masterData) => masterData.departments);
export const selectDesignations = createSelector([selectMasterData], (masterData) => masterData.designations);
export const selectSources = createSelector([selectMasterData], (masterData) => masterData.sources);
export const selectRemarks = createSelector([selectMasterData], (masterData) => masterData.remarks);
export const selectMasterDataLoading = createSelector([selectMasterData], (masterData) => masterData.loading);
export const selectMasterDataError = createSelector([selectMasterData], (masterData) => masterData.error);
export const selectSelectedMasterItem = createSelector([selectMasterData], (masterData) => masterData.selectedItem);
export const selectMasterDataSearchQuery = createSelector([selectMasterData], (masterData) => masterData.searchQuery);

// Filtered Master Data Selectors
export const selectFilteredIndustries = createSelector(
  [selectIndustries, selectMasterDataSearchQuery],
  (industries, searchQuery) => {
    if (!searchQuery) return industries;
    return industries.filter(industry => 
      industry.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
);

export const selectFilteredDepartments = createSelector(
  [selectDepartments, selectMasterDataSearchQuery],
  (departments, searchQuery) => {
    if (!searchQuery) return departments;
    return departments.filter(department => 
      department.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
);

// User Management Selectors
export const selectUsers = createSelector([selectUserManagement], (userManagement) => userManagement.users);
export const selectUserRoles = createSelector([selectUserManagement], (userManagement) => userManagement.roles);
export const selectUserPermissions = createSelector([selectUserManagement], (userManagement) => userManagement.permissions);
export const selectSelectedUser = createSelector([selectUserManagement], (userManagement) => userManagement.selectedUser);
export const selectUserManagementLoading = createSelector([selectUserManagement], (userManagement) => userManagement.loading);
export const selectUserManagementError = createSelector([selectUserManagement], (userManagement) => userManagement.error);
export const selectUserSearchQuery = createSelector([selectUserManagement], (userManagement) => userManagement.searchQuery);
export const selectUserFilterRole = createSelector([selectUserManagement], (userManagement) => userManagement.filterRole);
export const selectUserFilterStatus = createSelector([selectUserManagement], (userManagement) => userManagement.filterStatus);
export const selectTotalUsers = createSelector([selectUserManagement], (userManagement) => userManagement.totalUsers);

// Filtered Users Selector
export const selectFilteredUsers = createSelector(
  [selectUsers, selectUserSearchQuery, selectUserFilterRole, selectUserFilterStatus],
  (users, searchQuery, filterRole, filterStatus) => {
    return users.filter(user => {
      const matchesSearch = !searchQuery || 
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = filterRole === 'all' || user.role === filterRole;
      const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }
);

// Vendor Management Selectors
export const selectVendors = createSelector([selectVendorManagement], (vendorManagement) => vendorManagement.vendors);
export const selectSelectedVendor = createSelector([selectVendorManagement], (vendorManagement) => vendorManagement.selectedVendor);
export const selectVendorManagementLoading = createSelector([selectVendorManagement], (vendorManagement) => vendorManagement.loading);
export const selectVendorManagementError = createSelector([selectVendorManagement], (vendorManagement) => vendorManagement.error);
export const selectVendorSearchQuery = createSelector([selectVendorManagement], (vendorManagement) => vendorManagement.searchQuery);
export const selectVendorFilterStatus = createSelector([selectVendorManagement], (vendorManagement) => vendorManagement.filterStatus);
export const selectVendorFilterType = createSelector([selectVendorManagement], (vendorManagement) => vendorManagement.filterType);
export const selectTotalVendors = createSelector([selectVendorManagement], (vendorManagement) => vendorManagement.totalVendors);

// Filtered Vendors Selector
export const selectFilteredVendors = createSelector(
  [selectVendors, selectVendorSearchQuery, selectVendorFilterStatus, selectVendorFilterType],
  (vendors, searchQuery, filterStatus, filterType) => {
    return vendors.filter(vendor => {
      const matchesSearch = !searchQuery || 
        vendor.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || vendor.status === filterStatus;
      const matchesType = filterType === 'all' || vendor.type === filterType;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }
);

// DTR Selectors
export const selectTimeRecords = createSelector([selectDTR], (dtr) => dtr.timeRecords);
export const selectEmployees = createSelector([selectDTR], (dtr) => dtr.employees);
export const selectSelectedEmployee = createSelector([selectDTR], (dtr) => dtr.selectedEmployee);
export const selectSelectedDate = createSelector([selectDTR], (dtr) => dtr.selectedDate);
export const selectCurrentTimeRecord = createSelector([selectDTR], (dtr) => dtr.currentTimeRecord);
export const selectDTRLoading = createSelector([selectDTR], (dtr) => dtr.loading);
export const selectDTRError = createSelector([selectDTR], (dtr) => dtr.error);
export const selectAttendanceSummary = createSelector([selectDTR], (dtr) => dtr.attendanceSummary);

// Filtered Time Records Selector
export const selectFilteredTimeRecords = createSelector(
  [selectTimeRecords, selectDTR, selectSelectedDate],
  (timeRecords, dtr, selectedDate) => {
    return timeRecords.filter(record => {
      const matchesDate = !selectedDate || record.date === selectedDate;
      const matchesEmployee = dtr.filterEmployee === 'all' || record.employeeId === dtr.filterEmployee;
      const matchesStatus = dtr.filterStatus === 'all' || record.status === dtr.filterStatus;
      
      return matchesDate && matchesEmployee && matchesStatus;
    });
  }
);

// Calendar Selectors
export const selectEvents = createSelector([selectCalendar], (calendar) => calendar.events);
export const selectSelectedEvent = createSelector([selectCalendar], (calendar) => calendar.selectedEvent);
export const selectCalendarSelectedDate = createSelector([selectCalendar], (calendar) => calendar.selectedDate);
export const selectCalendarCurrentView = createSelector([selectCalendar], (calendar) => calendar.currentView);
export const selectCalendarLoading = createSelector([selectCalendar], (calendar) => calendar.loading);
export const selectCalendarError = createSelector([selectCalendar], (calendar) => calendar.error);
export const selectEventCategories = createSelector([selectCalendar], (calendar) => calendar.categories);
export const selectEventTypes = createSelector([selectCalendar], (calendar) => calendar.eventTypes);
export const selectRecurringPatterns = createSelector([selectCalendar], (calendar) => calendar.recurringPatterns);

// Filtered Events Selector
export const selectFilteredEvents = createSelector(
  [selectEvents, selectCalendar],
  (events, calendar) => {
    return events.filter(event => {
      const matchesSearch = !calendar.searchQuery || 
        event.title?.toLowerCase().includes(calendar.searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(calendar.searchQuery.toLowerCase());
      
      const matchesCategory = calendar.filterCategory === 'all' || event.category === calendar.filterCategory;
      const matchesStatus = calendar.filterStatus === 'all' || event.status === calendar.filterStatus;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }
);

// Dashboard Selectors
export const selectAnalytics = createSelector([selectDashboard], (dashboard) => dashboard.analytics);
export const selectCharts = createSelector([selectDashboard], (dashboard) => dashboard.charts);
export const selectRecentActivities = createSelector([selectDashboard], (dashboard) => dashboard.recentActivities);
export const selectQuickStats = createSelector([selectDashboard], (dashboard) => dashboard.quickStats);
export const selectDashboardConfig = createSelector([selectDashboard], (dashboard) => dashboard.dashboardConfig);
export const selectDashboardLoading = createSelector([selectDashboard], (dashboard) => dashboard.loading);
export const selectDashboardError = createSelector([selectDashboard], (dashboard) => dashboard.error);
export const selectLastUpdated = createSelector([selectDashboard], (dashboard) => dashboard.lastUpdated);
export const selectDashboardFilters = createSelector([selectDashboard], (dashboard) => dashboard.filters);

// Widget Visibility Selector
export const selectVisibleWidgets = createSelector(
  [selectDashboardConfig],
  (config) => config.widgets.filter(widget => widget.visible)
);

// Chart Data Selectors
export const selectCandidateTrends = createSelector([selectCharts], (charts) => charts.candidateTrends);
export const selectJobPostingTrends = createSelector([selectCharts], (charts) => charts.jobPostingTrends);
export const selectRevenueChart = createSelector([selectCharts], (charts) => charts.revenueChart);
export const selectInterviewStats = createSelector([selectCharts], (charts) => charts.interviewStats);
export const selectDepartmentDistribution = createSelector([selectCharts], (charts) => charts.departmentDistribution);
export const selectSkillDemand = createSelector([selectCharts], (charts) => charts.skillDemand);

// Pagination Selectors
export const selectCurrentPage = createSelector([selectUI], (ui) => ui.currentPage);
export const selectItemsPerPage = createSelector([selectUI], (ui) => ui.itemsPerPage);

// Combined Loading Selector
export const selectIsAnyLoading = createSelector(
  [selectAuthLoading, selectUserManagementLoading, selectVendorManagementLoading, selectDTRLoading, selectCalendarLoading, selectDashboardLoading],
  (...loadingStates) => loadingStates.some(loading => loading)
);

// Combined Error Selector
export const selectAnyError = createSelector(
  [selectAuthError, selectUserManagementError, selectVendorManagementError, selectDTRError, selectCalendarError, selectDashboardError],
  (...errors) => errors.find(error => error !== null)
);

// Search and Filter Selectors
export const selectAllSearchQueries = createSelector(
  [selectSearchTerm, selectTableSearchQuery, selectMasterDataSearchQuery, selectUserSearchQuery, selectVendorSearchQuery],
  (searchTerm, tableSearchQuery, masterDataSearchQuery, userSearchQuery, vendorSearchQuery) => ({
    searchTerm,
    tableSearchQuery,
    masterDataSearchQuery,
    userSearchQuery,
    vendorSearchQuery,
  })
);

// Export all selectors
export default {
  // Auth
  selectUser,
  selectIsAuthenticated,
  selectToken,
  selectPermissions,
  selectRoles,
  selectAuthLoading,
  selectAuthError,
  selectIsLocked,
  selectLoginAttempts,
  selectHasPermission,
  selectHasRole,
  
  // UI
  selectCurrentView,
  selectCurrentStep,
  selectSearchTerm,
  selectTableSearchQuery,
  selectEntriesPerPage,
  selectIsViewModalOpen,
  
  // Form
  selectFormData,
  selectResumeFile,
  selectResumePreview,
  selectIsParsingResume,
  
  // Candidates
  selectExistingCandidates,
  selectSubmittedCandidates,
  selectSearchResults,
  selectSelectedCandidate,
  
  // Job Posting
  selectJobPostingFormData,
  selectJobPostingCurrentStep,
  selectJobPostingLoading,
  selectJobPostingError,
  
  // Master Data
  selectIndustries,
  selectDepartments,
  selectDesignations,
  selectSources,
  selectRemarks,
  selectMasterDataLoading,
  selectMasterDataError,
  selectSelectedMasterItem,
  selectMasterDataSearchQuery,
  selectFilteredIndustries,
  selectFilteredDepartments,
  
  // User Management
  selectUsers,
  selectUserRoles,
  selectUserPermissions,
  selectSelectedUser,
  selectUserManagementLoading,
  selectUserManagementError,
  selectUserSearchQuery,
  selectUserFilterRole,
  selectUserFilterStatus,
  selectTotalUsers,
  selectFilteredUsers,
  
  // Vendor Management
  selectVendors,
  selectSelectedVendor,
  selectVendorManagementLoading,
  selectVendorManagementError,
  selectVendorSearchQuery,
  selectVendorFilterStatus,
  selectVendorFilterType,
  selectTotalVendors,
  selectFilteredVendors,
  
  // DTR
  selectTimeRecords,
  selectEmployees,
  selectSelectedEmployee,
  selectSelectedDate,
  selectCurrentTimeRecord,
  selectDTRLoading,
  selectDTRError,
  selectAttendanceSummary,
  selectFilteredTimeRecords,
  
  // Calendar
  selectEvents,
  selectSelectedEvent,
  selectCalendarSelectedDate,
  selectCalendarCurrentView,
  selectCalendarLoading,
  selectCalendarError,
  selectEventCategories,
  selectEventTypes,
  selectRecurringPatterns,
  selectFilteredEvents,
  
  // Dashboard
  selectAnalytics,
  selectCharts,
  selectRecentActivities,
  selectQuickStats,
  selectDashboardConfig,
  selectDashboardLoading,
  selectDashboardError,
  selectLastUpdated,
  selectDashboardFilters,
  selectVisibleWidgets,
  selectCandidateTrends,
  selectJobPostingTrends,
  selectRevenueChart,
  selectInterviewStats,
  selectDepartmentDistribution,
  selectSkillDemand,
  
  // Pagination
  selectCurrentPage,
  selectItemsPerPage,
  
  // Combined
  selectIsAnyLoading,
  selectAnyError,
  selectAllSearchQueries,
}; 