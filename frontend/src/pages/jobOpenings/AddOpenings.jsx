import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Send, Files, SlidersHorizontal, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import JobInfoStep from './components/JobInfoStep';
import SkillRequirementsStep from './components/SkillRequirementsStep';
import ContactDetailsStep from './components/ContactDetailsStep';
import { useSelector, useDispatch } from 'react-redux';
import { updateFormData, nextStep, prevStep, resetForm, setLoading, setError } from '../../Redux/jobPostingSlice';
import jobOpeningService from '../../api/jobOpeningService';

function AddOpenings() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { currentStep, formData } = useSelector(state => state.jobPosting);

    const steps = [
        { id: 1, title: 'Job Info', icon: Files },
        { id: 2, title: 'Skill Requirements', icon: SlidersHorizontal },
        { id: 3, title: 'Contact Details', icon: Phone }
    ];

    const updateFormDataHandler = (newData) => {
        dispatch(updateFormData(newData));
    };

    const nextStepHandler = () => {
        dispatch(nextStep());
    };

    const prevStepHandler = () => {
        dispatch(prevStep());
    };

    const handleSubmit = async () => {
        try {
            dispatch(setLoading(true));
            dispatch(setError(null));

            // Transform form data to match backend API structure
            const jobData = {
                job_title: formData.jobTitle,
                company_name: formData.companyName,
                designation: formData.designation,
                ctc: formData.ctc,
                experience: formData.experience,
                state: formData.state,
                city: formData.city,
                skills: formData.skills,
                languages: formData.languages,
                short_description: formData.shortDescription,
                job_description: formData.jobDescription,
                contact_person: formData.contactPerson,
                contact_number: formData.contactNumber,
                is_active: true
            };

            const response = await jobOpeningService.createJobOpening(jobData);
            
            console.log('Job opening created successfully:', response);
            
            // Show success toast with more details
            toast.success(
                `Job posting "${formData.jobTitle}" at ${formData.companyName} submitted successfully!`, 
                {
                    duration: 4000,
                    position: 'top-right',
                    icon: '🎉',
                }
            );
            
            // Show navigation toast
            toast.success('Redirecting to View Job Openings...', {
                duration: 2000,
                position: 'top-center',
                icon: '🔄',
            });
            
            dispatch(resetForm());
            
            // Navigate to ViewOpenings after a short delay
            setTimeout(() => {
                navigate('/view-openings', { 
                    state: { 
                        newJobCreated: true, 
                        jobTitle: formData.jobTitle,
                        companyName: formData.companyName 
                    } 
                });
            }, 2000);
            
        } catch (error) {
            console.error('Error submitting job opening:', error);
            dispatch(setError('Failed to submit job opening. Please try again.'));
            
            let errorMessage = 'Failed to submit job opening. Please try again.';
            if (error.response?.data) {
                // Handle validation errors from backend
                const errors = error.response.data;
                if (typeof errors === 'object') {
                    errorMessage = Object.values(errors).flat().join(', ');
                } else {
                    errorMessage = errors.toString();
                }
            }
            
            // Show error toast with better styling
            toast.error(errorMessage, {
                duration: 5000,
                position: 'top-right',
                icon: '❌',
                style: {
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                },
            });
        } finally {
            dispatch(setLoading(false));
        }
    };

    const isStepComplete = (stepId) => {
        switch (stepId) {
            case 1:
                return formData.jobTitle && formData.companyName && formData.ctc &&
                    formData.experience && formData.state && formData.city &&
                    formData.contactPerson && formData.contactNumber;
            case 2:
                return formData.skills.length > 0 && formData.languages.length > 0 &&
                    formData.shortDescription && formData.jobDescription;
            case 3:
                return true; // Step 3 is now just for review/confirmation
            default:
                return false;
        }
    };

    const renderStep = () => {
        const stepProps = {
            formData,
            updateFormData: updateFormDataHandler,
            nextStep: nextStepHandler,
            prevStep: prevStepHandler
        };

        switch (currentStep) {
            case 1:
                return <JobInfoStep {...stepProps} />;
            case 2:
                return <SkillRequirementsStep {...stepProps} />;
            case 3:
                return <ContactDetailsStep {...stepProps} />;
            default:
                return <JobInfoStep {...stepProps} />;
        }
    };

    return (
        <div className="bg-gray-50 flex">
            {/* Sidebar */}
            <div className="w-60 bg-white rounded-bl-lg rounded-tl-lg shadow-sm">
                <div className="p-4">
                    <h2 className="text-lg font-bold text-gray-800 mb-8">Create Job Posting</h2>

                    <div className="relative space-y-4">
                        {steps.map((step, index) => (
                            <div key={step.id} className="relative flex items-start pl-6">
                                {/* Vertical Progress Line */}
                                {index < steps.length - 1 && (
                                    <div className="absolute left-9 top-4 h-full flex flex-col items-center">
                                        <div className="w-px h-full bg-gray-300" />
                                        {isStepComplete(step.id) && (
                                            <div className="absolute top-0 w-px bg-green-500 transition-all duration-500 ease-in-out" style={{ height: '100%' }} />
                                        )}
                                    </div>
                                )}

                                {/* Step Circle */}
                                <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 
                  ${step.id === currentStep
                                            ? 'bg-blue-500 text-white'
                                            : isStepComplete(step.id)
                                                ? 'bg-green-500 text-white'
                                                : step.id < currentStep
                                                    ? 'bg-gray-300 text-gray-600'
                                                    : 'bg-gray-100 text-gray-400'
                                        }`}>
                                    {isStepComplete(step.id) ? '✓' : step.id}
                                </div>

                                {/* Step Title */}
                                <div className="ml-3">
                                    <p className={`text-sm font-medium ${step.id === currentStep ? 'text-blue-600' : 'text-gray-600'}`}>
                                        {step.title}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
                <div className="w-full mx-auto">
                    <div className="bg-white rounded-br-lg rounded-tr-lg shadow-sm p-4">
                        {renderStep()}

                        {/* Navigation Buttons */}
                        <div className="flex justify-between mt-8 pt-3">
                            <button
                                onClick={prevStepHandler}
                                disabled={currentStep === 1}
                                className={`flex items-center px-4 py-2 rounded-md font-medium ${currentStep === 1
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                                    }`}
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Previous
                            </button>

                            {currentStep === 3 ? (
                                <button
                                    onClick={handleSubmit}
                                    className="flex items-center px-6 py-2 bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600 transition-colors"
                                >
                                    <Send className="w-4 h-4 mr-2" />
                                    Submit Job
                                </button>
                            ) : (
                                <button
                                    onClick={nextStepHandler}
                                    className="flex items-center px-6 py-2 bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600 transition-colors"
                                >
                                    Continue
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AddOpenings;