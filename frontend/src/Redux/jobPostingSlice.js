import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    currentStep: 1,
    formData: {
        jobTitle: '',
        companyName: '',
        ctc: '',
        experience: '',
        state: '',
        city: '',
        skills: [],
        languages: [],
        shortDescription: '',
        jobDescription: '',
        contactPerson: '',
        contactNumber: ''
    },
    loading: false,
    error: null
};

const jobPostingSlice = createSlice({
    name: 'jobPosting',
    initialState,
    reducers: {
        updateFormData: (state, action) => {
            state.formData = { ...state.formData, ...action.payload };
        },
        nextStep: (state) => {
            if (state.currentStep < 3) {
                state.currentStep += 1;
            }
        },
        prevStep: (state) => {
            if (state.currentStep > 1) {
                state.currentStep -= 1;
            }
        },
        resetForm: () => initialState,
        addSkill: (state, action) => {
            if (action.payload && !state.formData.skills.includes(action.payload)) {
                state.formData.skills.push(action.payload);
            }
        },
        removeSkill: (state, action) => {
            state.formData.skills = state.formData.skills.filter(
                skill => skill !== action.payload
            );
        },
        addLanguage: (state, action) => {
            if (action.payload && !state.formData.languages.includes(action.payload)) {
                state.formData.languages.push(action.payload);
            }
        },
        removeLanguage: (state, action) => {
            state.formData.languages = state.formData.languages.filter(
                language => language !== action.payload
            );
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setError: (state, action) => {
            state.error = action.payload;
        }
    }
});

export const {
    updateFormData,
    nextStep,
    prevStep,
    resetForm,
    addSkill,
    removeSkill,
    addLanguage,
    removeLanguage,
    setLoading,
    setError
} = jobPostingSlice.actions;

export default jobPostingSlice.reducer;