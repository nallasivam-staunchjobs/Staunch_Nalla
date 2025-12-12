import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import * as selectors from './selectors';
import { login, logout } from './authSlice';
import * as uiActions from './uiSlice';
import * as formActions from './formSlice';
import * as candidatesActions from './candidatesSlice';
import * as jobPostingActions from './jobPostingSlice';
import * as masterDataActions from './masterDataSlice';
import * as userManagementActions from './userManagementSlice';
import * as vendorManagementActions from './vendorManagementSlice';
import * as dtrActions from './dtrSlice';
import * as calendarActions from './calendarSlice';
import * as dashboardActions from './dashboardSlice';

// ✅ Fixed Auth Hooks
export const useAuth = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, userRole, loading, error, token, firstName, employeeCode, phone } = useSelector(
    (state) => state.auth
  );

  // Level mapping from database values to user-friendly display
  const levelMappings = {
    'employee': 'L1',
    'tl': 'L2',
    'bm': 'L3',
    'rm': 'L4',
    'ceo': 'L5'
  };

  // ✅ Construct the 'user' object here from the Redux state
  const user = {
    firstName: firstName,
    employeeCode: employeeCode,
    phone: phone,
    role: userRole,
    level: levelMappings[userRole] || userRole, // Map to L1, L2, etc. or fallback to original
    token: token,
    // Add any other user-specific data you store in authSlice here
  };

  const loginUser = async (credentials) => {
    try {
      await dispatch(login(credentials));
    } catch (err) {
      console.error("Login failed", err);
    }
  };

  const signOutUser = () => {
    dispatch(logout());
  };

  return {
    isAuthenticated,
    userRole,
    loading,
    error,
    token,
    user, // ✅ Return the constructed 'user' object
    login: loginUser,
    logout: signOutUser,
  };
};

// UI Hooks
export const useUI = () => {
  const dispatch = useDispatch();
  const currentView = useSelector(selectors.selectCurrentView);
  const currentStep = useSelector(selectors.selectCurrentStep);
  const searchTerm = useSelector(selectors.selectSearchTerm);
  const tableSearchQuery = useSelector(selectors.selectTableSearchQuery);
  const entriesPerPage = useSelector(selectors.selectEntriesPerPage);
  const isViewModalOpen = useSelector(selectors.selectIsViewModalOpen);

  const setCurrentView = useCallback((view) => {
    dispatch(uiActions.setCurrentView(view));
  }, [dispatch]);

  const setCurrentStep = useCallback((step) => {
    dispatch(uiActions.setCurrentStep(step));
  }, [dispatch]);

  const setSearchTerm = useCallback((term) => {
    dispatch(uiActions.setSearchTerm(term));
  }, [dispatch]);

  const setTableSearchQuery = useCallback((query) => {
    dispatch(uiActions.setTableSearchQuery(query));
  }, [dispatch]);

  const setEntriesPerPage = useCallback((entries) => {
    dispatch(uiActions.setEntriesPerPage(entries));
  }, [dispatch]);

  const setIsViewModalOpen = useCallback((isOpen) => {
    dispatch(uiActions.setIsViewModalOpen(isOpen));
  }, [dispatch]);

  const resetUI = useCallback(() => {
    dispatch(uiActions.resetUI());
  }, [dispatch]);

  return {
    currentView,
    currentStep,
    searchTerm,
    tableSearchQuery,
    entriesPerPage,
    isViewModalOpen,
    setCurrentView,
    setCurrentStep,
    setSearchTerm,
    setTableSearchQuery,
    setEntriesPerPage,
    setIsViewModalOpen,
    resetUI,
  };
};

// Form Hooks
export const useForm = () => {
  const dispatch = useDispatch();
  const formData = useSelector(selectors.selectFormData);
  const resumeFile = useSelector(selectors.selectResumeFile);
  const resumePreview = useSelector(selectors.selectResumePreview);
  const isParsingResume = useSelector(selectors.selectIsParsingResume);

  const updateFormData = useCallback((data) => {
    dispatch(formActions.updateFormData(data));
  }, [dispatch]);

  const updateField = useCallback((name, value) => {
    dispatch(formActions.updateField({ name, value }));
  }, [dispatch]);

  const setResumeFile = useCallback((file) => {
    dispatch(formActions.setResumeFile(file));
  }, [dispatch]);

  const setResumePreview = useCallback((preview) => {
    dispatch(formActions.setResumePreview(preview));
  }, [dispatch]);

  const resetForm = useCallback(() => {
    dispatch(formActions.resetForm());
  }, [dispatch]);

  return {
    formData,
    resumeFile,
    resumePreview,
    isParsingResume,
    updateFormData,
    updateField,
    setResumeFile,
    setResumePreview,
    resetForm,
  };
};

// Candidates Hooks
export const useCandidates = () => {
  const dispatch = useDispatch();
  const existingCandidates = useSelector(selectors.selectExistingCandidates);
  const submittedCandidates = useSelector(selectors.selectSubmittedCandidates);
  const searchResults = useSelector(selectors.selectSearchResults);
  const selectedCandidate = useSelector(selectors.selectSelectedCandidate);

  const setExistingCandidates = useCallback((candidates) => {
    dispatch(candidatesActions.setExistingCandidates(candidates));
  }, [dispatch]);

  const addSubmittedCandidate = useCallback((candidate) => {
    dispatch(candidatesActions.addSubmittedCandidate(candidate));
  }, [dispatch]);

  const setSearchResults = useCallback((results) => {
    dispatch(candidatesActions.setSearchResults(results));
  }, [dispatch]);

  const setSelectedCandidate = useCallback((candidate) => {
    dispatch(candidatesActions.setSelectedCandidate(candidate));
  }, [dispatch]);

  const deleteCandidate = useCallback((id) => {
    dispatch(candidatesActions.deleteCandidate(id));
  }, [dispatch]);

  const clearSearchResults = useCallback(() => {
    dispatch(candidatesActions.clearSearchResults());
  }, [dispatch]);

  return {
    existingCandidates,
    submittedCandidates,
    searchResults,
    selectedCandidate,
    setExistingCandidates,
    addSubmittedCandidate,
    setSearchResults,
    setSelectedCandidate,
    deleteCandidate,
    clearSearchResults,
  };
};

// Job Posting Hooks
export const useJobPosting = () => {
  const dispatch = useDispatch();
  const formData = useSelector(selectors.selectJobPostingFormData);
  const currentStep = useSelector(selectors.selectJobPostingCurrentStep);
  const loading = useSelector(selectors.selectJobPostingLoading);
  const error = useSelector(selectors.selectJobPostingError);

  const updateFormData = useCallback((data) => {
    dispatch(jobPostingActions.updateFormData(data));
  }, [dispatch]);

  const nextStep = useCallback(() => {
    dispatch(jobPostingActions.nextStep());
  }, [dispatch]);

  const prevStep = useCallback(() => {
    dispatch(jobPostingActions.prevStep());
  }, [dispatch]);

  const resetForm = useCallback(() => {
    dispatch(jobPostingActions.resetForm());
  }, [dispatch]);

  const addSkill = useCallback((skill) => {
    dispatch(jobPostingActions.addSkill(skill));
  }, [dispatch]);

  const removeSkill = useCallback((skill) => {
    dispatch(jobPostingActions.removeSkill(skill));
  }, [dispatch]);

  return {
    formData,
    currentStep,
    loading,
    error,
    updateFormData,
    nextStep,
    prevStep,
    resetForm,
    addSkill,
    removeSkill,
  };
};

// Master Data Hooks
export const useMasterData = () => {
  const dispatch = useDispatch();
  const industries = useSelector(selectors.selectIndustries);
  const departments = useSelector(selectors.selectDepartments);
  const designations = useSelector(selectors.selectDesignations);
  const sources = useSelector(selectors.selectSources);
  const remarks = useSelector(selectors.selectRemarks);
  const loading = useSelector(selectors.selectMasterDataLoading);
  const error = useSelector(selectors.selectMasterDataError);
  const searchQuery = useSelector(selectors.selectMasterDataSearchQuery);

  const addIndustry = useCallback((industry) => {
    dispatch(masterDataActions.addIndustry(industry));
  }, [dispatch]);

  const updateIndustry = useCallback((data) => {
    dispatch(masterDataActions.updateIndustry(data));
  }, [dispatch]);

  const deleteIndustry = useCallback((id) => {
    dispatch(masterDataActions.deleteIndustry(id));
  }, [dispatch]);

  const addDepartment = useCallback((department) => {
    dispatch(masterDataActions.addDepartment(department));
  }, [dispatch]);

  const updateDepartment = useCallback((data) => {
    dispatch(masterDataActions.updateDepartment(data));
  }, [dispatch]);

  const deleteDepartment = useCallback((id) => {
    dispatch(masterDataActions.deleteDepartment(id));
  }, [dispatch]);

  const setSearchQuery = useCallback((query) => {
    dispatch(masterDataActions.setSearchQuery(query));
  }, [dispatch]);

  return {
    industries,
    departments,
    designations,
    sources,
    remarks,
    loading,
    error,
    searchQuery,
    addIndustry,
    updateIndustry,
    deleteIndustry,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    setSearchQuery,
  };
};

// User Management Hooks
export const useUserManagement = () => {
  const dispatch = useDispatch();
  const users = useSelector(selectors.selectFilteredUsers);
  const selectedUser = useSelector(selectors.selectSelectedUser);
  const loading = useSelector(selectors.selectUserManagementLoading);
  const error = useSelector(selectors.selectUserManagementError);
  const totalUsers = useSelector(selectors.selectTotalUsers);

  const addUser = useCallback((user) => {
    dispatch(userManagementActions.addUser(user));
  }, [dispatch]);

  const updateUser = useCallback((data) => {
    dispatch(userManagementActions.updateUser(data));
  }, [dispatch]);

  const deleteUser = useCallback((id) => {
    dispatch(userManagementActions.deleteUser(id));
  }, [dispatch]);

  const setSelectedUser = useCallback((user) => {
    dispatch(userManagementActions.setSelectedUser(user));
  }, [dispatch]);

  const activateUser = useCallback((id) => {
    dispatch(userManagementActions.activateUser(id));
  }, [dispatch]);

  const deactivateUser = useCallback((id) => {
    dispatch(userManagementActions.deactivateUser(id));
  }, [dispatch]);

  return {
    users,
    selectedUser,
    loading,
    error,
    totalUsers,
    addUser,
    updateUser,
    deleteUser,
    setSelectedUser,
    activateUser,
    deactivateUser,
  };
};

// Vendor Management Hooks
export const useVendorManagement = () => {
  const dispatch = useDispatch();
  const vendors = useSelector(selectors.selectFilteredVendors);
  const selectedVendor = useSelector(selectors.selectSelectedVendor);
  const loading = useSelector(selectors.selectVendorManagementLoading);
  const error = useSelector(selectors.selectVendorManagementError);
  const totalVendors = useSelector(selectors.selectTotalVendors);

  const addVendor = useCallback((vendor) => {
    dispatch(vendorManagementActions.addVendor(vendor));
  }, [dispatch]);

  const updateVendor = useCallback((data) => {
    dispatch(vendorManagementActions.updateVendor(data));
  }, [dispatch]);

  const deleteVendor = useCallback((id) => {
    dispatch(vendorManagementActions.deleteVendor(id));
  }, [dispatch]);

  const setSelectedVendor = useCallback((vendor) => {
    dispatch(vendorManagementActions.setSelectedVendor(vendor));
  }, [dispatch]);

  return {
    vendors,
    selectedVendor,
    loading,
    error,
    totalVendors,
    addVendor,
    updateVendor,
    deleteVendor,
    setSelectedVendor,
  };
};

// DTR Hooks
export const useDTR = () => {
  const dispatch = useDispatch();
  const timeRecords = useSelector(selectors.selectFilteredTimeRecords);
  const employees = useSelector(selectors.selectEmployees);
  const selectedEmployee = useSelector(selectors.selectSelectedEmployee);
  const selectedDate = useSelector(selectors.selectSelectedDate);
  const currentTimeRecord = useSelector(selectors.selectCurrentTimeRecord);
  const loading = useSelector(selectors.selectDTRLoading);
  const error = useSelector(selectors.selectDTRError);
  const attendanceSummary = useSelector(selectors.selectAttendanceSummary);

  const timeIn = useCallback((employeeId, timeIn, date) => {
    dispatch(dtrActions.timeIn({ employeeId, timeIn, date }));
  }, [dispatch]);

  const timeOut = useCallback((recordId, timeOut) => {
    dispatch(dtrActions.timeOut({ recordId, timeOut }));
  }, [dispatch]);

  const setSelectedEmployee = useCallback((employee) => {
    dispatch(dtrActions.setSelectedEmployee(employee));
  }, [dispatch]);

  const setSelectedDate = useCallback((date) => {
    dispatch(dtrActions.setSelectedDate(date));
  }, [dispatch]);

  return {
    timeRecords,
    employees,
    selectedEmployee,
    selectedDate,
    currentTimeRecord,
    loading,
    error,
    attendanceSummary,
    timeIn,
    timeOut,
    setSelectedEmployee,
    setSelectedDate,
  };
};

// Calendar Hooks
export const useCalendar = () => {
  const dispatch = useDispatch();
  const events = useSelector(selectors.selectFilteredEvents);
  const selectedEvent = useSelector(selectors.selectSelectedEvent);
  const selectedDate = useSelector(selectors.selectCalendarSelectedDate);
  const currentView = useSelector(selectors.selectCurrentView);
  const loading = useSelector(selectors.selectCalendarLoading);
  const error = useSelector(selectors.selectCalendarError);
  const categories = useSelector(selectors.selectEventCategories);

  const addEvent = useCallback((event) => {
    dispatch(calendarActions.addEvent(event));
  }, [dispatch]);

  const updateEvent = useCallback((data) => {
    dispatch(calendarActions.updateEvent(data));
  }, [dispatch]);

  const deleteEvent = useCallback((id) => {
    dispatch(calendarActions.deleteEvent(id));
  }, [dispatch]);

  const setSelectedEvent = useCallback((event) => {
    dispatch(calendarActions.setSelectedEvent(event));
  }, [dispatch]);

  const setSelectedDate = useCallback((date) => {
    dispatch(calendarActions.setSelectedDate(date));
  }, [dispatch]);

  const setCurrentView = useCallback((view) => {
    dispatch(calendarActions.setCurrentView(view));
  }, [dispatch]);

  return {
    events,
    selectedEvent,
    selectedDate,
    currentView,
    loading,
    error,
    categories,
    addEvent,
    updateEvent,
    deleteEvent,
    setSelectedEvent,
    setSelectedDate,
    setCurrentView,
  };
};

// Dashboard Hooks
export const useDashboard = () => {
  const dispatch = useDispatch();
  const analytics = useSelector(selectors.selectAnalytics);
  const charts = useSelector(selectors.selectCharts);
  const recentActivities = useSelector(selectors.selectRecentActivities);
  const quickStats = useSelector(selectors.selectQuickStats);
  const dashboardConfig = useSelector(selectors.selectDashboardConfig);
  const loading = useSelector(selectors.selectDashboardLoading);
  const error = useSelector(selectors.selectDashboardError);
  const lastUpdated = useSelector(selectors.selectLastUpdated);

  const refreshDashboard = useCallback(() => {
    dispatch(dashboardActions.refreshDashboard());
  }, [dispatch]);

  const addActivity = useCallback((activity) => {
    dispatch(dashboardActions.addActivity(activity));
  }, [dispatch]);

  const updateWidgetVisibility = useCallback((widgetId, visible) => {
    dispatch(dashboardActions.updateWidgetVisibility({ widgetId, visible }));
  }, [dispatch]);

  const setRefreshInterval = useCallback((interval) => {
    dispatch(dashboardActions.setRefreshInterval(interval));
  }, [dispatch]);

  return {
    analytics,
    charts,
    recentActivities,
    quickStats,
    dashboardConfig,
    loading,
    error,
    lastUpdated,
    refreshDashboard,
    addActivity,
    updateWidgetVisibility,
    setRefreshInterval,
  };
};

// Combined Loading Hook
export const useLoading = () => {
  const isAnyLoading = useSelector(selectors.selectIsAnyLoading);
  const anyError = useSelector(selectors.selectAnyError);

  return {
    isAnyLoading,
    anyError,
  };
};

// Export all hooks
export default {
  useAuth,
  useUI,
  useForm,
  useCandidates,
  useJobPosting,
  useMasterData,
  useUserManagement,
  useVendorManagement,
  useDTR,
  useCalendar,
  useDashboard,
  useLoading,
};
