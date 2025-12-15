import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  industries: [],
  departments: [],
  designations: [],
  sources: [],
  remarks: [],
  loading: false,
  error: null,
  selectedItem: null,
  isEditMode: false,
  searchQuery: '',
  filterType: 'all',
};

const masterDataSlice = createSlice({
  name: 'masterData',
  initialState,
  reducers: {
    // Industries
    setIndustries: (state, action) => {
      state.industries = action.payload;
    },
    addIndustry: (state, action) => {
      state.industries.push(action.payload);
    },
    updateIndustry: (state, action) => {
      const { id, name } = action.payload;
      const index = state.industries.findIndex(item => item.id === id);
      if (index !== -1) {
        state.industries[index] = { ...state.industries[index], name };
      }
    },
    deleteIndustry: (state, action) => {
      state.industries = state.industries.filter(item => item.id !== action.payload);
    },

    // Departments
    setDepartments: (state, action) => {
      state.departments = action.payload;
    },
    addDepartment: (state, action) => {
      state.departments.push(action.payload);
    },
    updateDepartment: (state, action) => {
      const { id, name } = action.payload;
      const index = state.departments.findIndex(item => item.id === id);
      if (index !== -1) {
        state.departments[index] = { ...state.departments[index], name };
      }
    },
    deleteDepartment: (state, action) => {
      state.departments = state.departments.filter(item => item.id !== action.payload);
    },

    // Designations
    setDesignations: (state, action) => {
      state.designations = action.payload;
    },
    addDesignation: (state, action) => {
      state.designations.push(action.payload);
    },
    updateDesignation: (state, action) => {
      const { id, name } = action.payload;
      const index = state.designations.findIndex(item => item.id === id);
      if (index !== -1) {
        state.designations[index] = { ...state.designations[index], name };
      }
    },
    deleteDesignation: (state, action) => {
      state.designations = state.designations.filter(item => item.id !== action.payload);
    },

    // Sources
    setSources: (state, action) => {
      state.sources = action.payload;
    },
    addSource: (state, action) => {
      state.sources.push(action.payload);
    },
    updateSource: (state, action) => {
      const { id, name } = action.payload;
      const index = state.sources.findIndex(item => item.id === id);
      if (index !== -1) {
        state.sources[index] = { ...state.sources[index], name };
      }
    },
    deleteSource: (state, action) => {
      state.sources = state.sources.filter(item => item.id !== action.payload);
    },

    // Remarks
    setRemarks: (state, action) => {
      state.remarks = action.payload;
    },
    addRemark: (state, action) => {
      state.remarks.push(action.payload);
    },
    updateRemark: (state, action) => {
      const { id, name } = action.payload;
      const index = state.remarks.findIndex(item => item.id === id);
      if (index !== -1) {
        state.remarks[index] = { ...state.remarks[index], name };
      }
    },
    deleteRemark: (state, action) => {
      state.remarks = state.remarks.filter(item => item.id !== action.payload);
    },

    // UI State
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setSelectedItem: (state, action) => {
      state.selectedItem = action.payload;
    },
    setIsEditMode: (state, action) => {
      state.isEditMode = action.payload;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setFilterType: (state, action) => {
      state.filterType = action.payload;
    },
    resetMasterData: (state) => {
      state.selectedItem = null;
      state.isEditMode = false;
      state.searchQuery = '';
      state.filterType = 'all';
      state.error = null;
    },
  },
});

export const {
  // Industries
  setIndustries,
  addIndustry,
  updateIndustry,
  deleteIndustry,
  
  // Departments
  setDepartments,
  addDepartment,
  updateDepartment,
  deleteDepartment,
  
  // Designations
  setDesignations,
  addDesignation,
  updateDesignation,
  deleteDesignation,
  
  // Sources
  setSources,
  addSource,
  updateSource,
  deleteSource,
  
  // Remarks
  setRemarks,
  addRemark,
  updateRemark,
  deleteRemark,
  
  // UI State
  setLoading,
  setError,
  setSelectedItem,
  setIsEditMode,
  setSearchQuery,
  setFilterType,
  resetMasterData,
} = masterDataSlice.actions;

export default masterDataSlice.reducer; 