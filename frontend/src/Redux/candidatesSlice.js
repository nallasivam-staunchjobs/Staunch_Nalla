import { createSlice } from '@reduxjs/toolkit'

const candidatesSlice = createSlice({
  name: 'candidates',
  initialState: {
    existingCandidates: [],
    submittedCandidates: [],
    searchResults: [],
    selectedCandidate: null,
  },
  reducers: {
    setExistingCandidates: (state, action) => {
      state.existingCandidates = action.payload
    },
    addSubmittedCandidate: (state, action) => {
      state.submittedCandidates.push(action.payload)
    },
    setSearchResults: (state, action) => {
      state.searchResults = action.payload
    },
    setSelectedCandidate: (state, action) => {
      state.selectedCandidate = action.payload
    },
    deleteCandidate: (state, action) => {
      const candidateId = action.payload
      state.submittedCandidates = state.submittedCandidates.filter(c => c.id !== candidateId)
      state.searchResults = state.searchResults.filter(c => c.id !== candidateId)
      state.existingCandidates = state.existingCandidates.filter(c => c.id !== candidateId)
    },
    clearSearchResults: (state) => {
      state.searchResults = []
      state.existingCandidates = []
    },
  },
})

export const {
  setExistingCandidates,
  addSubmittedCandidate,
  setSearchResults,
  setSelectedCandidate,
  deleteCandidate,
  clearSearchResults,
} = candidatesSlice.actions

export default candidatesSlice.reducer