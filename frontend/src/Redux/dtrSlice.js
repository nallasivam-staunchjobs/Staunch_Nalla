import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  timeRecords: [],
  employees: [],
  selectedEmployee: null,
  selectedDate: new Date().toISOString().split('T')[0],
  currentTimeRecord: null,
  loading: false,
  error: null,
  searchQuery: '',
  filterEmployee: 'all',
  filterDateRange: {
    startDate: null,
    endDate: null,
  },
  filterStatus: 'all',
  currentPage: 1,
  itemsPerPage: 10,
  totalRecords: 0,
  isEditMode: false,
  showDeleteModal: false,
  recordToDelete: null,
  showTimeInModal: false,
  showTimeOutModal: false,
  breakRecords: [],
  overtimeRecords: [],
  attendanceSummary: {
    present: 0,
    absent: 0,
    late: 0,
    overtime: 0,
    totalHours: 0,
  },
};

const dtrSlice = createSlice({
  name: 'dtr',
  initialState,
  reducers: {
    // Time Records
    setTimeRecords: (state, action) => {
      state.timeRecords = action.payload;
      state.totalRecords = action.payload.length;
    },
    addTimeRecord: (state, action) => {
      state.timeRecords.push(action.payload);
      state.totalRecords += 1;
    },
    updateTimeRecord: (state, action) => {
      const { id, ...updateData } = action.payload;
      const index = state.timeRecords.findIndex(record => record.id === id);
      if (index !== -1) {
        state.timeRecords[index] = { ...state.timeRecords[index], ...updateData };
      }
    },
    deleteTimeRecord: (state, action) => {
      state.timeRecords = state.timeRecords.filter(record => record.id !== action.payload);
      state.totalRecords -= 1;
    },
    setCurrentTimeRecord: (state, action) => {
      state.currentTimeRecord = action.payload;
    },

    // Employees
    setEmployees: (state, action) => {
      state.employees = action.payload;
    },
    addEmployee: (state, action) => {
      state.employees.push(action.payload);
    },
    updateEmployee: (state, action) => {
      const { id, ...updateData } = action.payload;
      const index = state.employees.findIndex(employee => employee.id === id);
      if (index !== -1) {
        state.employees[index] = { ...state.employees[index], ...updateData };
      }
    },
    deleteEmployee: (state, action) => {
      state.employees = state.employees.filter(employee => employee.id !== action.payload);
    },
    setSelectedEmployee: (state, action) => {
      state.selectedEmployee = action.payload;
    },

    // Time In/Out Operations
    timeIn: (state, action) => {
      const { employeeId, timeIn, date } = action.payload;
      const newRecord = {
        id: Date.now(),
        employeeId,
        date,
        timeIn,
        timeOut: null,
        totalHours: 0,
        status: 'present',
        breaks: [],
        overtime: 0,
        createdAt: new Date().toISOString(),
      };
      state.timeRecords.push(newRecord);
      state.currentTimeRecord = newRecord;
    },
    timeOut: (state, action) => {
      const { recordId, timeOut } = action.payload;
      const index = state.timeRecords.findIndex(record => record.id === recordId);
      if (index !== -1) {
        const record = state.timeRecords[index];
        const timeIn = new Date(record.timeIn);
        const timeOutDate = new Date(timeOut);
        const totalHours = (timeOutDate - timeIn) / (1000 * 60 * 60);
        
        state.timeRecords[index] = {
          ...record,
          timeOut,
          totalHours: Math.round(totalHours * 100) / 100,
          overtime: totalHours > 8 ? Math.round((totalHours - 8) * 100) / 100 : 0,
        };
      }
    },

    // Break Management
    startBreak: (state, action) => {
      const { recordId, breakStart } = action.payload;
      const recordIndex = state.timeRecords.findIndex(record => record.id === recordId);
      if (recordIndex !== -1) {
        if (!state.timeRecords[recordIndex].breaks) {
          state.timeRecords[recordIndex].breaks = [];
        }
        state.timeRecords[recordIndex].breaks.push({
          id: Date.now(),
          startTime: breakStart,
          endTime: null,
          duration: 0,
        });
      }
    },
    endBreak: (state, action) => {
      const { recordId, breakId, breakEnd } = action.payload;
      const recordIndex = state.timeRecords.findIndex(record => record.id === recordId);
      if (recordIndex !== -1 && state.timeRecords[recordIndex].breaks) {
        const breakIndex = state.timeRecords[recordIndex].breaks.findIndex(
          breakRecord => breakRecord.id === breakId
        );
        if (breakIndex !== -1) {
          const breakStart = new Date(state.timeRecords[recordIndex].breaks[breakIndex].startTime);
          const breakEndDate = new Date(breakEnd);
          const duration = (breakEndDate - breakStart) / (1000 * 60 * 60);
          
          state.timeRecords[recordIndex].breaks[breakIndex] = {
            ...state.timeRecords[recordIndex].breaks[breakIndex],
            endTime: breakEnd,
            duration: Math.round(duration * 100) / 100,
          };
        }
      }
    },

    // Attendance Summary
    updateAttendanceSummary: (state, action) => {
      state.attendanceSummary = action.payload;
    },
    calculateAttendanceSummary: (state, action) => {
      const { startDate, endDate } = action.payload;
      const filteredRecords = state.timeRecords.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= new Date(startDate) && recordDate <= new Date(endDate);
      });

      const summary = {
        present: filteredRecords.filter(record => record.status === 'present').length,
        absent: filteredRecords.filter(record => record.status === 'absent').length,
        late: filteredRecords.filter(record => record.status === 'late').length,
        overtime: filteredRecords.reduce((total, record) => total + (record.overtime || 0), 0),
        totalHours: filteredRecords.reduce((total, record) => total + (record.totalHours || 0), 0),
      };

      state.attendanceSummary = summary;
    },

    // UI State
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setSelectedDate: (state, action) => {
      state.selectedDate = action.payload;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
      state.currentPage = 1;
    },
    setFilterEmployee: (state, action) => {
      state.filterEmployee = action.payload;
      state.currentPage = 1;
    },
    setFilterDateRange: (state, action) => {
      state.filterDateRange = action.payload;
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
    setShowDeleteModal: (state, action) => {
      state.showDeleteModal = action.payload;
    },
    setRecordToDelete: (state, action) => {
      state.recordToDelete = action.payload;
    },
    setShowTimeInModal: (state, action) => {
      state.showTimeInModal = action.payload;
    },
    setShowTimeOutModal: (state, action) => {
      state.showTimeOutModal = action.payload;
    },

    // Bulk Operations
    bulkDeleteRecords: (state, action) => {
      const recordIds = action.payload;
      state.timeRecords = state.timeRecords.filter(record => !recordIds.includes(record.id));
      state.totalRecords -= recordIds.length;
    },
    bulkUpdateStatus: (state, action) => {
      const { recordIds, status } = action.payload;
      state.timeRecords.forEach(record => {
        if (recordIds.includes(record.id)) {
          record.status = status;
        }
      });
    },

    // Reset
    resetDTR: (state) => {
      state.selectedEmployee = null;
      state.currentTimeRecord = null;
      state.isEditMode = false;
      state.searchQuery = '';
      state.filterEmployee = 'all';
      state.filterDateRange = { startDate: null, endDate: null };
      state.filterStatus = 'all';
      state.currentPage = 1;
      state.error = null;
      state.showDeleteModal = false;
      state.recordToDelete = null;
      state.showTimeInModal = false;
      state.showTimeOutModal = false;
    },
  },
});

export const {
  // Time Records
  setTimeRecords,
  addTimeRecord,
  updateTimeRecord,
  deleteTimeRecord,
  setCurrentTimeRecord,
  
  // Employees
  setEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  setSelectedEmployee,
  
  // Time In/Out
  timeIn,
  timeOut,
  
  // Break Management
  startBreak,
  endBreak,
  
  // Attendance Summary
  updateAttendanceSummary,
  calculateAttendanceSummary,
  
  // UI State
  setLoading,
  setError,
  setSelectedDate,
  setSearchQuery,
  setFilterEmployee,
  setFilterDateRange,
  setFilterStatus,
  setCurrentPage,
  setItemsPerPage,
  setIsEditMode,
  setShowDeleteModal,
  setRecordToDelete,
  setShowTimeInModal,
  setShowTimeOutModal,
  
  // Bulk Operations
  bulkDeleteRecords,
  bulkUpdateStatus,
  
  // Reset
  resetDTR,
} = dtrSlice.actions;

export default dtrSlice.reducer; 