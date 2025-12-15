import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import FormStep1 from './FormStep1'
import FormStep2 from './FormStep2'
import FormStep3 from './FormStep3'
import { useAppContext, useAppActions } from '../../../context/AppContext'
import ResumePreview from './ResumePreview'
import { useCandidateIntegration } from '../hooks/useCandidateIntegration'
import Loading from '../../../components/Loading'

const RegistrationView = () => {
  const { state } = useAppContext()
  const actions = useAppActions()
  const { currentStep, completedSteps, formData, resumeFile, resumePreview, searchPreFillData } = state
  const { createCandidate, loading } = useCandidateIntegration()
  const [mobileView, setMobileView] = useState('form') // 'form' or 'resume'

  const backToSearch = () => {
    // Clear search results and reset search view state
    actions.setSearchResults([])
    actions.setSearchTerm("")
    actions.setHasSearched(false)
    actions.setTableSearchQuery("")
    actions.setCurrentView("search")
  }

  const handleFormSubmit = async () => {
    try {
      // Validate required fields
      if (!formData.mobile1 || !formData.email || !formData.executiveName || !formData.candidateName) {
        toast.error("Please fill in all required fields");
        return;
      }
      
      // Extract resume file from state (it's stored separately from formData)
      const formDataWithResume = {
        ...formData,
        resumeFile: resumeFile || null // Use the resumeFile from state, not from formData
      };


      // Create candidate using the new integration service
      const result = await createCandidate(formDataWithResume)


      // Add to submitted candidates for immediate display
      const newCandidate = {
        id: result.candidate.id,
        serialNo: state.submittedCandidates.length + 1,
        executiveName: formData.executiveName,
        candidateName: formData.candidateName,
        contactNumber1: formData.mobile1,
        contactNumber2: formData.mobile2,
        email: formData.email,
        education: formData.education,
        experience: formData.experience,
        address: `${formData.city}, ${formData.state}, ${formData.country}`,
        vendorName: formData.clientName || "N/A",
        desigination: formData.designation || "N/A",
        ctc: formData.currentCtc || formData.expectedCtc || "N/A",
        profileNumber: formData.profileNumber,
        lastUpdated: new Date().toISOString().split('T')[0],
        source: "submitted",
        backendData: result.candidate
      }

      actions.setSubmittedCandidates([...state.submittedCandidates, newCandidate])
      
      // Set flag to trigger data refresh when returning to search
      actions.setNeedsDataRefresh(true)
      
      // Use original search term if available, otherwise use candidate data
      let postRegistrationSearchTerm = '';
      if (searchPreFillData && searchPreFillData.searchTerm) {
        // Use the original search term that brought user to registration
        postRegistrationSearchTerm = searchPreFillData.searchTerm;
      } else {
        // Fallback: use candidate data for search (mobile1, mobile2, email)
        const postSubmissionSearchTerms = [
          formData.mobile1,
          formData.mobile2,
          formData.email
        ].filter(Boolean).join(' ');
        postRegistrationSearchTerm = postSubmissionSearchTerms;
      }
      
      actions.setSearchTerm(postRegistrationSearchTerm)
      actions.setHasSearched(true)
      
      // Reset form but preserve search term for post-registration search
      actions.resetForm()
      
      // Wait for data refresh to complete before navigating
      setTimeout(() => {
        actions.setCurrentView("search")
      }, 500) // Small delay to ensure data refresh triggers first

      // Use toast ID to prevent duplicates with other success messages
      toast.success("Candidate registered successfully!", {
        id: 'registration-success',
        duration: 3000
      })
    } catch (error) {
      console.error("Error creating candidate:", error)
      console.error("Error details:", error.response?.data)
      toast.error("Error creating candidate. Please try again.")
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <FormStep1 />
      case 2:
        return <FormStep2 />
      case 3:
        return <FormStep3 onSubmit={handleFormSubmit} loading={loading} />
      default:
        return <FormStep1 />
    }
  }
  // When step changes, show form by default on mobile
  useEffect(() => {
    setMobileView('form')
  }, [currentStep])

  return (
    <>
      {/* Loading Overlay */}

      <div className="bg-white rounded-xl shadow-lg ">
        {/* Header - Mobile shows icon only, desktop shows text */}
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <button
          onClick={backToSearch}
          className="flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-md transition-all duration-200 border border-blue-200 hover:border-blue-400"
        >
          <svg className="w-4 h-4 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden md:inline">Back to Search</span>
        </button>
        <h2 className="text-sm md:text-md font-semibold text-gray-900">New Candidate Registration</h2>
        <div></div>
      </div>
      {/* Stepper - Simplified on mobile */}
      <div className="px-4 py-2 border-b border-gray-200 mt-2 bg-gray-50">
        <nav className="flex items-center justify-center">
          <ol className="flex items-center text-xs space-x-2 sm:space-x-4 md:space-x-8">
            {[1, 2, 3].map((step) => {
              const isCompleted = completedSteps.includes(step)
              const isCurrent = currentStep === step
              const isAccessible = currentStep > step

              return (
                <li key={step} className="flex items-center">
                  <button
                    onClick={() => isAccessible && actions.setCurrentStep(step)}
                    className={`flex items-center ${
                      isCompleted ? "text-green-600" : isCurrent ? "text-blue-600" : "text-gray-500"
                    } ${isAccessible ? "hover:text-blue-800 cursor-pointer" : "cursor-default"}`}
                  >
                    <span
                      className={`flex items-center justify-center w-6 h-6 rounded-full ${
                        isCompleted
                          ? "bg-green-100 border-2 border-green-500"
                          : isCurrent
                          ? "bg-blue-100"
                          : "bg-gray-100"
                      } mr-0 md:mr-2`}
                    >
                      {isCompleted ? (
                        <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        step
                      )}
                    </span>
                    <span className="hidden md:inline text-xs font-medium">
                      {step === 1 && "Basic Information"}
                      {step === 2 && "Client Information"}
                      {step === 3 && "Background Verification"}
                    </span>
                  </button>
                  {step < 3 && (
                    <svg className="w-3 h-3 mx-1 sm:mx-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
      </div>

      {/* Content + Resume */}
      <div className="px-4 md:px-6 py-2">
        {/* Mobile - Tab navigation */}
        <div className="lg:hidden flex border-b border-gray-200 mb-4">
          <button
            className={`flex-1 py-2 text-center text-sm font-medium ${
              mobileView === 'form' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
            }`}
            onClick={() => setMobileView('form')}
          >
            Form
          </button>
          <button
            className={`flex-1 py-2 text-center text-sm font-medium ${
              mobileView === 'resume' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
            }`}
            onClick={() => setMobileView('resume')}
          >
            Resume
          </button>
        </div>

        {/* Desktop - Side by side layout */}
        <div className="hidden lg:grid lg:grid-cols-[55%_45%] gap-3">
          {renderStepContent()}
          <ResumePreview />
        </div>

        {/* Mobile - Single content view */}
        <div className="lg:hidden">
          {mobileView === 'form' ? renderStepContent() : <ResumePreview />}
        </div>
      </div>

      </div>
    </>
  )
}

export default RegistrationView