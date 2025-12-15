import { createSlice } from '@reduxjs/toolkit'

const initialFormData = {
  profileNumber: `PROF-${Math.floor(1000 + Math.random() * 9000)}`,
  executiveName: "",
  candidateName: "",
  mobile1: "",
  mobile2: "",
  email: "",
  gender: "",
  dob: "",
  age: "",
  pincode: "",
  state: "",
  city: "",
  country: "",
  education: "",
  experience: "",
  languages: [],
  skills: [],
  vendorName: "",
  designation: "",
  industry: "",
  source: "",
  ctc: "",
  remarks: "",
  interviewDate: "",
  nextFollowUpDate: "",
  expectedJoiningDate: "",
  profileSubmission: "",
  submissionDate: "",
  feedback: "",
  educationCertificate: false,
  educationCertificateReason: "",
  experienceCertificate: false,
  experienceCertificateReason: "",
}

const formSlice = createSlice({
  name: 'form',
  initialState: {
    formData: initialFormData,
    resumeFile: null,
    resumePreview: null,
    isParsingResume: false,
  },
  reducers: {
    updateFormData: (state, action) => {
      state.formData = { ...state.formData, ...action.payload }
    },
    updateField: (state, action) => {
      const { name, value } = action.payload
      state.formData[name] = value
    },
    setResumeFile: (state, action) => {
      state.resumeFile = action.payload
    },
    setResumePreview: (state, action) => {
      state.resumePreview = action.payload
    },
    setIsParsingResume: (state, action) => {
      state.isParsingResume = action.payload
    },
    addTag: (state, action) => {
      const { field, tags } = action.payload
      state.formData[field] = [...state.formData[field], ...tags]
    },
    removeTag: (state, action) => {
      const { field, index } = action.payload
      state.formData[field] = state.formData[field].filter((_, i) => i !== index)
    },
    resetForm: (state) => {
      state.formData = {
        ...initialFormData,
        profileNumber: `PROF-${Math.floor(1000 + Math.random() * 9000)}`,
      }
      state.resumeFile = null
      state.resumePreview = null
      state.isParsingResume = false
    },
    calculateAge: (state, action) => {
      const dob = action.payload
      if (!dob) {
        state.formData.age = ""
        return
      }
      const birthDate = new Date(dob)
      const diff = Date.now() - birthDate.getTime()
      const ageDate = new Date(diff)
      state.formData.age = Math.abs(ageDate.getUTCFullYear() - 1970)
    },
    autoFillLocation: (state, action) => {
      const { state: stateName, city, country } = action.payload
      state.formData.state = stateName
      state.formData.city = city
      state.formData.country = country
    },
  },
})

export const {
  updateFormData,
  updateField,
  setResumeFile,
  setResumePreview,
  setIsParsingResume,
  addTag,
  removeTag,
  resetForm,
  calculateAge,
  autoFillLocation,
} = formSlice.actions

export default formSlice.reducer