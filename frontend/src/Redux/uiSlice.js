import { createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    currentView: 'search',
    currentStep: 1,
    completedSteps: [],
    searchTerm: '',
    hasSearched: false,
    tableSearchQuery: '',
    entriesPerPage: 10,
    isViewModalOpen: false,
  },
  reducers: {
    setCurrentView: (state, action) => {
      state.currentView = action.payload
    },
    setCurrentStep: (state, action) => {
      state.currentStep = action.payload
    },
    addCompletedStep: (state, action) => {
      if (!state.completedSteps.includes(action.payload)) {
        state.completedSteps.push(action.payload)
      }
    },
    setCompletedSteps: (state, action) => {
      state.completedSteps = action.payload
    },
    setSearchTerm: (state, action) => {
      state.searchTerm = action.payload
    },
    setHasSearched: (state, action) => {
      state.hasSearched = action.payload
    },
    setTableSearchQuery: (state, action) => {
      state.tableSearchQuery = action.payload
    },
    setEntriesPerPage: (state, action) => {
      state.entriesPerPage = action.payload
    },
    setIsViewModalOpen: (state, action) => {
      state.isViewModalOpen = action.payload
    },
    resetUI: (state) => {
      state.currentView = 'search'
      state.currentStep = 1
      state.completedSteps = []
      state.searchTerm = ''
      state.hasSearched = false
      state.tableSearchQuery = ''
      state.isViewModalOpen = false
    },
  },
})

export const {
  setCurrentView,
  setCurrentStep,
  addCompletedStep,
  setCompletedSteps,
  setSearchTerm,
  setHasSearched,
  setTableSearchQuery,
  setEntriesPerPage,
  setIsViewModalOpen,
  resetUI,
} = uiSlice.actions

export default uiSlice.reducer