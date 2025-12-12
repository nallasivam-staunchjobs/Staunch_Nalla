// Consolidated Redux exports
export { store } from './Store';
export { useAppDispatch, useAppSelector } from './hooks';

// Selectors
export * from './selectors';

// Action creators from all slices
export { 
  // Auth actions
  login, logout, setUser, clearAuth, updateProfile, changePassword 
} from './authSlice';

export { 
  // Calendar actions
  addEvent, updateEvent, deleteEvent, setEvents, setCurrentDate 
} from './calendarSlice';

export { 
  // Candidates actions
  addCandidate, updateCandidate, deleteCandidate, setCandidates, setSelectedCandidate 
} from './candidatesSlice';

export { 
  // Dashboard actions
  setDashboardData, updateMetrics, addNotification, clearNotifications 
} from './dashboardSlice';

export { 
  // DTR actions
  timeIn, timeOut, setTimeRecords, updateTimeRecord 
} from './dtrSlice';

export { 
  // Form actions
  updateFormData, setResumeFile, setResumePreview, resetForm, setFormErrors 
} from './formSlice';

export { 
  // Job Posting actions
  addJobPosting, updateJobPosting, deleteJobPosting, setJobPostings 
} from './jobPostingSlice';

export { 
  // Master Data actions
  setMasterData, updateMasterData, addMasterDataItem, deleteMasterDataItem 
} from './masterDataSlice';

export { 
  // UI actions
  toggleSidebar, setLoading, setError, clearError, showModal, hideModal 
} from './uiSlice';

export { 
  // User Management actions
  addUser, updateUser, deleteUser, setUsers, setSelectedUser 
} from './userManagementSlice';

export { 
  // Vendor Management actions
  addVendor, updateVendor, deleteVendor, setVendors, setSelectedVendor 
} from './vendorManagementSlice';
