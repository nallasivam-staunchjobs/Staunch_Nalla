
import React, { useEffect, useRef } from 'react';

const steps = [
  { id: 1, title: 'Basic Info', description: 'Personal details' },
  { id: 2, title: 'Personal Details', description: 'Personal info' },
  { id: 3, title: 'Education & Experience', description: 'Background' },
  { id: 4, title: 'Job Details', description: 'Position info' },
  { id: 5, title: 'Additional Information', description: 'Additional notes' },
];

const ProgressSidebar = ({ currentStep, completedSteps }) => {
  const progressRef = useRef(null);

  const getStepStatus = (stepId) => {
  if (stepId === currentStep) return 'active';
  if (completedSteps.includes(stepId)) return 'completed';
  return 'inactive';
};
  

  // Scroll to current step on mobile
  useEffect(() => {
    if (progressRef.current) {
      const activeStep = progressRef.current.querySelector('.bg-blue-600');
      if (activeStep) {
        activeStep.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [currentStep]);

  return (
    <div className="bg-white shadow-md border-e border-gray-200 h-full w-full lg:w-72 xl:w-auto 2xl:w-auto">
      {/* Header - Desktop */}
      <div className="hidden lg:block px-4 py-3 ">
        <h2 className="text-xl font-bold text-gray-900">
          Employee Registration
        </h2>
        <p className="text-sm text-gray-600">Complete all steps to register</p>
      </div>

      {/* Mobile Horizontal Progress */}
      <div
        className="lg:hidden px-4 py-4 overflow-x-auto scrollbar-hide "
        ref={progressRef}
      >
        <div className="flex items-center min-w-max">
          {steps.map((step, index) => {
            const status = getStepStatus(step.id);
            const isLast = index === steps.length - 1;

            return (
              <React.Fragment key={step.id}>
                <div
                  className={`flex flex-col items-center relative ${
                    status === 'active' ? 'top-[8px]' : ''
                  }`}
                >
                  <div
                    className={`
                w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-sm font-medium shrink-0
                transition-all duration-300 ease-in-out
                ${
                  status === 'completed'
                    ? 'bg-green-500 text-white scale-110'
                    : status === 'active'
                    ? 'bg-blue-600 text-white scale-110 ring-4 ring-blue-200'
                    : 'bg-gray-200 text-gray-600'
                }
              `}
                  >
                    {status === 'completed' ? (
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      step.id
                    )}
                  </div>

                  {/* Only show title for current (active) step */}
                  {status === 'active' && (
                    <span className="mt-1 text-[10px] sm:text-xs font-medium text-blue-600 text-center">
                      {step.title}
                    </span>
                  )}
                </div>

                {!isLast && (
                  <div className="relative w-10 sm:w-14 h-0.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`absolute h-full bg-green-500 transition-all duration-500 ease-out ${
                        completedSteps.includes(step.id + 1) ? 'w-full' : 'w-0'
                      }`}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Desktop Vertical Progress */}
      <nav
        className="hidden lg:flex flex-col items-start gap-6 p-4 overflow-y-auto"
        aria-label="Progress"
      >
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="relative flex items-start ml-4">
              {/* Step Circle */}
              <div className="relative z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${
                      status === 'completed'
                        ? 'bg-green-500 text-white'
                        : status === 'active'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-300 text-gray-700'
                    }
                  `}
                >
                  {status === 'completed' ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    step.id
                  )}
                </div>

                {!isLast && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-8 h-10 w-px bg-gray-300">
                    {completedSteps.includes(step.id + 1) &&
                      step.id + 1 !== currentStep && (
                        <div className="h-full w-px bg-green-500"></div>
                      )}
                  </div>
                )}
              </div>

              {/* Step Details */}
              <div className="ml-4">
                <p
                  className={`text-sm font-medium ${
                    status === 'active'
                      ? 'text-blue-600'
                      : status === 'completed'
                      ? 'text-green-600'
                      : 'text-gray-500'
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-sm text-gray-700">{step.description}</p>
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
};

export default ProgressSidebar;
