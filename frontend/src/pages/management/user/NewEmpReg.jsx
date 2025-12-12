import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ProgressSidebar from './components/components/ProgressSidebar';
import BasicInfoStep from './components/components/steps/BasicInfoStep';
import PersonalDetailsStep from './components/components/steps/PersonalDetailsStep';
import EducationExperienceStep from './components/components/steps/EducationExperienceStep';
import JobDetailsStep from './components/components/steps/JobDetailsStep';
import ExtraStep from './components/components/steps/ExtraStep';
import { validateStep, isStepValid } from './components/utils/validation';
import { employeeService } from '../../../api/employeeService';

const stepComponents = {
  1: BasicInfoStep,
  2: PersonalDetailsStep,
  3: EducationExperienceStep,
  4: JobDetailsStep,
  5: ExtraStep,
};

function EmpReg() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Force fresh state on component mount
  useEffect(() => {
    setFormData({});
    setErrors({});
    setCurrentStep(1);
    setCompletedSteps([]);
  }, []);

  const updateFormData = (newData) => {
    setFormData(prev => ({ ...prev, ...newData }));
    const updatedFields = Object.keys(newData);
    setErrors(prev => {
      const newErrors = { ...prev };
      updatedFields.forEach(field => delete newErrors[field]);
      return newErrors;
    });
  };

  const handleNext = () => {
    const stepErrors = validateStep(currentStep, formData);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    setErrors({});
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps(prev => [...prev, currentStep]);
    }
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      const newStep = currentStep - 1;
      setCompletedSteps(prev => prev.filter(step => step <= newStep));
      setCurrentStep(newStep);
    }
  };

  const handleSubmit = async () => {
    const stepErrors = validateStep(currentStep, formData);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    // Additional validation using employee service
    const validationErrors = employeeService.validateEmployeeData(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error('Please fix the validation errors before submitting.', {
        position: "top-right",
        autoClose: 5000,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Submitting employee data:', formData);
      
      // Use the employee service to create the employee
      const response = await employeeService.create(formData);

      console.log('Employee created successfully:', response);
      
      toast.success('Employee registration completed successfully!', {        
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        onClose: () => navigate('/view-users'),
      });

    } catch (error) {
      console.error('Employee creation error:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Employee registration failed. Please try again.';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.non_field_errors) {
          errorMessage = error.response.data.non_field_errors.join(', ');
        } else {
          // Handle field-specific errors
          const fieldErrors = Object.entries(error.response.data)
            .filter(([field, errors]) => errors && errors.length > 0)
            .map(([field, errors]) => {
              const errorList = Array.isArray(errors) ? errors : [errors];
              return `${field}: ${errorList.join(', ')}`;
            })
            .join('; ');
          
          if (fieldErrors) {
            errorMessage = fieldErrors;
            // Also set field errors for form display
            const formErrors = {};
            Object.entries(error.response.data).forEach(([field, errors]) => {
              if (errors && errors.length > 0) {
                formErrors[field] = Array.isArray(errors) ? errors[0] : errors;
              }
            });
            setErrors(formErrors);
          }
        }
      }
      
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 8000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = isStepValid(currentStep, formData);
  const StepComponent = stepComponents[currentStep];

  return (
    <div className="h-[100%] bg-white flex flex-col lg:flex-row w-full">
      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      
      <div className="w-full lg:w-auto">
        <ProgressSidebar currentStep={currentStep} completedSteps={completedSteps} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 w-full">
          <div className="flex items-center justify-between flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Step {currentStep} of 5</h1>
              <p className="text-gray-600 text-sm">
                {currentStep === 1 && 'Basic Information'}
                {currentStep === 2 && 'Personal Details'}
                {currentStep === 3 && 'Education & Experience'}
                {currentStep === 4 && 'Job Details'}
                {currentStep === 5 && 'Additional Information'}
              </p>
            </div>
            <div className="text-sm text-gray-500 mt-2 md:mt-0">
              {completedSteps.length} of 5 steps completed
            </div>
          </div>
        </div>

        <div className="flex-1 p-2 sm:p-6 md:p-8 xl:p-2 overflow-auto scrollbar-desktop shadow-md bg-white border-t border-gray-100">
          <div className="max-w-5xl mx-auto w-full">
            <StepComponent
              formData={formData}
              updateFormData={updateFormData}
              errors={errors}
              setErrors={setErrors}
            />

            <div className="flex justify-between items-center mt-2 pt-4 border-gray-200">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className={`px-4 py-2 rounded-md border border-gray-300 text-black bg-white hover:bg-red-200 transition ${
                  currentStep === 1 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Previous
              </button>

              <div className="flex space-x-4">
                {currentStep < 5 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canProceed}
                    className={`px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 transition font-medium ${
                      !canProceed ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canProceed || isSubmitting}
                    className={`px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-green-700 transition font-medium flex items-center justify-center ${
                      !canProceed || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      'Submit Registration'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmpReg;



