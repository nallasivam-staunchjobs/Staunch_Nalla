import React, { useState } from 'react';
import { saveFormProgress } from '../utils/localStorage';
import toast from 'react-hot-toast';

import { Check, ChevronDown, Trash2, Plus } from 'lucide-react';
import { useAppContext, useAppActions } from '../../../context/AppContext';
import ResumePreview from './ResumePreview';
import { CandidateIntegrationService } from '../services/candidateIntegrationService';
import Loading from '../../../components/Loading';


const FormStep3 = ({ onSubmit, loading }) => {
  const { state } = useAppContext();
  const actions = useAppActions();
  const { formData, resumeFile, resumePreview, currentStep, submittedCandidates } = state;

  // Toggle sections - only one can be open at a time
  const [expandedSection, setExpandedSection] = useState('education');

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleRadioChange = (fieldName, value) => {
    actions.updateFormField(fieldName, value);
  };

  const handleDoubleClick = (fieldName) => {
    actions.updateFormField(fieldName, undefined);
    // Also clear the reason if exists
    if (formData[`${fieldName}Reason`]) {
      actions.updateFormField(`${fieldName}Reason`, '');
    }
  };

  const nextStep = () => {
    const newStep = currentStep + 1;
    actions.addCompletedStep(currentStep);
    actions.setCurrentStep(newStep);
    saveFormProgress(newStep, formData, resumeFile, resumePreview);
    // toast.success(`Step ${currentStep} completed and saved!`);
  };

  const handleSubmit = async () => {
    if (onSubmit) {
      onSubmit();
    } else {
      try {
        // Show loading toast
        toast.loading('Submitting complete candidate data...', { id: 'candidate-submission' });

        // Validate required fields
        const requiredFields = [
          { field: 'candidateName', label: 'Candidate Name' },
          { field: 'mobile1', label: 'Primary Mobile' },
          { field: 'email', label: 'Email' },
          { field: 'executiveName', label: 'Executive Name' }
        ];

        const errors = [];
        requiredFields.forEach(({ field, label }) => {
          if (!formData[field] || formData[field].toString().trim() === '') {
            errors.push(`${label} is required`);
          }
        });

        if (errors.length > 0) {
          toast.error(`Please fill required fields: ${errors.join(', ')}`, { id: 'candidate-submission' });
          return;
        }

        // Prepare enhanced form data for complete submission
        const enhancedFormData = {
          ...formData,
          // Set default values for missing fields
          clientName: formData.clientName || 'TBD',
          designation: formData.designation || 'TBD',
          experienceCompanies: formData.experienceCompanies || [],
          languages: formData.languages || [],
          skills: formData.skills || []
        };

        // Create complete candidate with all related data using CandidateIntegrationService
        const result = await CandidateIntegrationService.createCompleteCandidate(enhancedFormData);

        // Upload resume if provided
        if (resumeFile && result.candidate) {
          try {
            await CandidateIntegrationService.uploadResume(result.candidate.id, resumeFile);
          } catch (resumeError) {
            console.error('Resume upload failed:', resumeError);
            // Don't fail the entire operation if resume upload fails
          }
        }

        // Create local submitted candidate record for UI
        const submittedCandidate = {
          id: result.candidate.id, // Use actual database ID
          serialNo: submittedCandidates.length + 1,
          executiveName: formData.executiveName,
          candidateName: formData.candidateName,
          contactNumber1: formData.mobile1,
          contactNumber2: formData.mobile2,
          email: formData.email,
          education: formData.education,
          experience: formData.experience,
          address: `${formData.city}${formData.state ? ', ' + formData.state : ''}`,
          vendorName: formData.vendorName,
          desigination: formData.designation,
          ctc: formData.ctc,
          profileNumber: formData.profileNumber,
          lastUpdated: new Date().toISOString().split('T')[0],
          source: 'submitted',
          fullData: { ...formData },
        };

        actions.setSubmittedCandidates([...submittedCandidates, submittedCandidate]);

        toast.success('Candidate registered successfully in database!', {
          id: 'candidate-submission',
          duration: 4000
        });

        // Show additional success info
        toast.success('Complete candidate data saved with all related records!', {
          duration: 3000,
          position: 'bottom-center'
        });

        // Reset UI to search and clear form
        actions.resetForm();
        actions.resetUI();

      } catch (error) {
        console.error('FormStep3 submission error:', error);
        toast.error(`Failed to save candidate: ${error.message}`, { id: 'candidate-submission' });
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      const newStep = currentStep - 1;
      actions.setCurrentStep(newStep);
      saveFormProgress(newStep, formData, resumeFile, resumePreview);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    actions.updateFormField(name, value);
  };

  // Experience companies helpers
  const addExperienceCompany = () => {
    const existing = formData.experienceCompanies || [];
    const updated = [
      ...existing,
      { offerLetter: undefined, relievingLetter: undefined, payslip: undefined },
    ];
    actions.updateFormField('experienceCompanies', updated);
  };

  const handleExperienceDocChange = (companyIndex, fieldName, value) => {
    const existing = formData.experienceCompanies || [];
    const updated = existing.map((company, idx) => (
      idx === companyIndex ? { ...company, [fieldName]: value } : company
    ));
    actions.updateFormField('experienceCompanies', updated);
  };

  const clearExperienceDoc = (companyIndex, fieldName) => {
    const existing = formData.experienceCompanies || [];
    const updated = existing.map((company, idx) => (
      idx === companyIndex ? { ...company, [fieldName]: undefined } : company
    ));
    actions.updateFormField('experienceCompanies', updated);
  };

  const removeExperienceCompany = (indexToRemove) => {
    const existing = formData.experienceCompanies || [];
    if (existing.length <= 1) return; // keep at least current company
    if (indexToRemove === 0) return;   // do not remove current company
    const updated = existing.filter((_, idx) => idx !== indexToRemove);
    actions.updateFormField('experienceCompanies', updated);
  };

  // Initialize experience companies if not exists
  const initializeExperienceCompanies = () => {
    if (!formData.experienceCompanies || formData.experienceCompanies.length === 0) {
      const initialCompany = {
        offerLetter: undefined,
        offerLetterReason: '',
        payslip: undefined,
        payslipReason: '',
        relievingLetter: undefined,
        relievingLetterReason: '',
        incentives: undefined,
        incentiveAmount: '',
        incentiveProof: undefined,
        incentiveProofReason: '',
        moreThan15Months: false,
        firstSalary: '',
        currentSalary: ''
      };
      actions.updateFormField('experienceCompanies', [initialCompany]);
    }
  };

  // Call initialization on component mount
  React.useEffect(() => {
    initializeExperienceCompanies();
  }, []);

  const renderRadioFieldWithReason = (label, fieldKey, companyIndex) => {
    const isExperienceField = companyIndex !== undefined;
    const value = isExperienceField ? (formData.experienceCompanies?.[companyIndex]?.[fieldKey]) : (formData[fieldKey]);
    const reasonValue = isExperienceField ? (formData.experienceCompanies?.[companyIndex]?.[`${fieldKey}Reason`]) : (formData[`${fieldKey}Reason`]);
    const name = isExperienceField ? `${fieldKey}_${companyIndex}` : fieldKey;


    const handleChange = (val) => {
      if (isExperienceField) {
        handleExperienceDocChange(companyIndex, fieldKey, val);
      } else {
        handleRadioChange(fieldKey, val);
      }
    };

    const handleClear = () => {
      if (isExperienceField) {
        clearExperienceDoc(companyIndex, fieldKey);
      } else {
        handleDoubleClick(fieldKey);
      }
    };

    const handleReasonChange = (e) => {
      const { value } = e.target;
      if (isExperienceField) {
        const existing = formData.experienceCompanies || [];
        const updated = existing.map((company, idx) =>
          idx === companyIndex ? { ...company, [`${fieldKey}Reason`]: value } : company
        );
        actions.updateFormField('experienceCompanies', updated);
      } else {
        actions.updateFormField(`${fieldKey}Reason`, value);
      }
    };

    return (
      <div className="flex items-center gap-4">
        {/* Label */}
        <label className="w-40 text-xs font-semibold text-gray-700">
          {label}
        </label>

        {/* Yes */}
        <label className="inline-flex items-center gap-1">
          <div
            className={`relative flex items-center justify-center w-4 h-4 rounded-full border-2 
              ${value === true ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}
            onDoubleClick={handleClear}
            title="Double-click to clear selection"
          >
            <input
              type="radio"
              name={name}
              checked={value === true}
              onChange={() => handleChange(true)}
              className="absolute opacity-0 cursor-pointer w-full h-full"
            />
            {value === true && (
              <Check className="w-3 h-3 text-white" />
            )}
          </div>
          <span className={`text-xs ${value === true ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
            Yes
          </span>
        </label>

        {/* No */}
        <label className="inline-flex items-center gap-1">
          <div
            className={`relative flex items-center justify-center w-4 h-4 rounded-full border-2 
              ${value === false ? 'border-red-500 bg-red-500' : 'border-gray-300'}`}
            onDoubleClick={handleClear}
            title="Double-click to clear selection"
          >
            <input
              type="radio"
              name={name}
              checked={value === false}
              onChange={() => handleChange(false)}
              className="absolute opacity-0 cursor-pointer w-full h-full"
            />
            {value === false && (
              <Check className="w-3 h-3 text-white" />
            )}
          </div>
          <span className={`text-xs ${value === false ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
            No
          </span>
        </label>

        {/* Reason Textbox - Show only if No is selected */}
        {value === false && (
          <input
            type="text"
            name={`${fieldKey}Reason`}
            value={reasonValue || ''}
            onChange={handleReasonChange}
            placeholder={`Reason for not providing ${label.toLowerCase()}`}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        )}
      </div>
    );
  };
  const calculatePercentageIncrease = (firstSalary, currentSalary) => {
    const first = parseFloat(firstSalary);
    const current = parseFloat(currentSalary);
    if (isNaN(first) || isNaN(current) || first === 0) {
      return 'N/A';
    }
    const increase = ((current - first) / first) * 100;
    return increase.toFixed(2);
  };




  const handleClear = (companyIndex, fieldName) => {
    const existing = formData.experienceCompanies || [];
    const updated = existing.map((company, idx) =>
      idx === companyIndex ? { ...company, [fieldName]: undefined } : company
    );
    actions.updateFormField('experienceCompanies', updated);

    // Also clear the reason if exists
    if (existing[companyIndex]?.[`${fieldName}Reason`]) {
      const updatedWithReason = updated.map((company, idx) =>
        idx === companyIndex ? { ...company, [`${fieldName}Reason`]: '' } : company
      );
      actions.updateFormField('experienceCompanies', updatedWithReason);
    }
  };

  // Update renderYesNo to use this handleClear
  const renderYesNo = (fieldKey, companyIndex, company, label) => {
    const value = company[fieldKey];

    return (
      <div className="flex items-center gap-4">
        <label className="w-40 text-xs font-semibold text-gray-700">
          {label}
        </label>
        <label className="inline-flex items-center gap-1">
          <div
            className={`relative flex items-center justify-center w-4 h-4 rounded-full border-2 
            ${value === true ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}
            onDoubleClick={() => handleClear(companyIndex, fieldKey)}
            title="Double-click to clear selection"
          >
            <input
              type="radio"
              name={`${fieldKey}_${companyIndex}`}
              checked={value === true}
              onChange={() => handleExperienceDocChange(companyIndex, fieldKey, true)}
              className="absolute opacity-0 cursor-pointer"
            />
            {value === true && <Check className="w-3 h-3 text-white" />}
          </div>
          <span className={`text-xs ${value === true ? 'text-green-600 font-medium' : 'text-gray-600'}`}>Yes</span>
        </label>
        <label className="inline-flex items-center gap-1">
          <div
            className={`relative flex items-center justify-center w-4 h-4 rounded-full border-2 
            ${value === false ? 'border-red-500 bg-red-500' : 'border-gray-300'}`}
            onDoubleClick={() => handleClear(companyIndex, fieldKey)}
            title="Double-click to clear selection"
          >
            <input
              type="radio"
              name={`${fieldKey}_${companyIndex}`}
              checked={value === false}
              onChange={() => handleExperienceDocChange(companyIndex, fieldKey, false)}
              className="absolute opacity-0 cursor-pointer"
            />
            {value === false && <Check className="w-3 h-3 text-white" />}
          </div>
          <span className={`text-xs ${value === false ? 'text-red-600 font-medium' : 'text-gray-600'}`}>No</span>
        </label>
      </div>
    );
  };

  // Update renderYesNoWithReason similarly
  const renderYesNoWithReason = (fieldKey, companyIndex, company, label) => {
    const value = company[fieldKey];
    const reasonValue = company[`${fieldKey}Reason`];

    const handleReasonChange = (e) => {
      handleExperienceDocChange(companyIndex, `${fieldKey}Reason`, e.target.value);
    };

    return (
      <div className="flex items-center gap-4">
        <label className="w-40 text-xs font-semibold text-gray-700">
          {label}
        </label>
        <label className="inline-flex items-center gap-1">
          <div
            className={`relative flex items-center justify-center w-4 h-4 rounded-full border-2 
            ${value === true ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}
            onDoubleClick={() => handleClear(companyIndex, fieldKey)}
            title="Double-click to clear selection"
          >
            <input
              type="radio"
              name={`${fieldKey}_${companyIndex}`}
              checked={value === true}
              onChange={() => handleExperienceDocChange(companyIndex, fieldKey, true)}
              className="absolute opacity-0 cursor-pointer"
            />
            {value === true && <Check className="w-3 h-3 text-white" />}
          </div>
          <span className={`text-xs ${value === true ? 'text-green-600 font-medium' : 'text-gray-600'}`}>Yes</span>
        </label>
        <label className="inline-flex items-center gap-1">
          <div
            className={`relative flex items-center justify-center w-4 h-4 rounded-full border-2 
            ${value === false ? 'border-red-500 bg-red-500' : 'border-gray-300'}`}
            onDoubleClick={() => handleClear(companyIndex, fieldKey)}
            title="Double-click to clear selection"
          >
            <input
              type="radio"
              name={`${fieldKey}_${companyIndex}`}
              checked={value === false}
              onChange={() => handleExperienceDocChange(companyIndex, fieldKey, false)}
              className="absolute opacity-0 cursor-pointer"
            />
            {value === false && <Check className="w-3 h-3 text-white" />}
          </div>
          <span className={`text-xs ${value === false ? 'text-red-600 font-medium' : 'text-gray-600'}`}>No</span>
        </label>
        {value === false && (
          <input
            type="text"
            value={reasonValue || ''}
            onChange={handleReasonChange}
            placeholder={`Reason for not providing ${label.toLowerCase()}`}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        )}
      </div>
    );
  };


  return (
    <div className="space-y-1 ">
      <div className="grid grid-cols-1  gap-3">
        {/* Left Column - Form Sections */}
        <div className="bg-white rounded-lg   flex flex-col">
          <div className="border-b border-gray-200 p-2">
            <h4 className="text-md font-medium text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Background Verification
            </h4>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {/* EDUCATION SECTION */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('education')}
                className="w-full flex justify-between items-center p-3 hover:bg-gray-50  border-gray-200"
              >
                <h3 className="text-sm font-medium text-gray-900">Education Documents</h3>
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 transition-transform ${expandedSection === 'education' ? 'rotate-180' : ''}`}
                />
              </button>

              {expandedSection === 'education' && (
                <div className="p-3 space-y-3">
                  {renderRadioFieldWithReason('10th Certificate', 'tenthCertificate')}
                  {renderRadioFieldWithReason('12th Certificate', 'twelfthCertificate')}
                  {renderRadioFieldWithReason('Diploma Certificate', 'diplomaCertificate')}
                  {renderRadioFieldWithReason('UG Certificate', 'ugCertificate')}
                  {renderRadioFieldWithReason('PG Certificate', 'pgCertificate')}

                  {/* Special handling for Education Gap */}
                  <div className="flex items-center gap-4 mb-3">
                    <label className="w-40 text-xs font-semibold text-gray-700">
                      Education Gap
                    </label>

                    <label className="inline-flex items-center gap-1">
                      <div
                        className={`relative flex items-center justify-center w-4 h-4 rounded-full border-2 
                          ${formData.educationGap === true ? 'border-red-500 bg-red-500' : 'border-gray-300'}`}
                        onDoubleClick={() => handleDoubleClick('educationGap')}
                        title="Double-click to clear selection"
                      >
                        <input
                          type="radio"
                          name="educationGap"
                          checked={formData.educationGap === true}
                          onChange={() => handleRadioChange('educationGap', true)}
                          className="absolute opacity-0 cursor-pointer"
                        />
                        {formData.educationGap === true && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className={`text-xs ${formData.educationGap === true ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        Yes
                      </span>
                    </label>

                    <label className="inline-flex items-center gap-1">
                      <div
                        className={`relative flex items-center justify-center w-4 h-4 rounded-full border-2 
                          ${formData.educationGap === false ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}
                        onDoubleClick={() => handleDoubleClick('educationGap')}
                        title="Double-click to clear selection"
                      >
                        <input
                          type="radio"
                          name="educationGap"
                          checked={formData.educationGap === false}
                          onChange={() => handleRadioChange('educationGap', false)}
                          className="absolute opacity-0 cursor-pointer"
                        />
                        {formData.educationGap === false && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className={`text-xs ${formData.educationGap === false ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                        No
                      </span>
                    </label>

                    {/* Show textbox only if education gap is yes */}
                    {formData.educationGap === true && (
                      <input
                        type="text"
                        name="educationGapReason"
                        value={formData.educationGapReason || ''}
                        onChange={handleInputChange}
                        placeholder="Please specify education gap details"
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* EXPERIENCE SECTION - Only show if candidate has experience */}
            {formData.experience && formData.experience !== '0' && formData.experience.toLowerCase() !== 'fresher' && formData.experience.toLowerCase() !== 'freshers' && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden pb-1">
              <button
                onClick={() => toggleSection('experience')}
                className="w-full flex justify-between items-center p-3 hover:bg-gray-50  border-gray-200"
              >
                <h3 className="text-sm font-medium text-gray-900">Experience Documents</h3>
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 transition-transform ${expandedSection === 'experience' ? 'rotate-180' : ''}`}
                />
              </button>

              {expandedSection === 'experience' && (
                <div className="p-1  h-70 overflow-y-auto scrollbar-desktop">
                  <div className={`${formData.experienceCompanies && formData.experienceCompanies.length > 1
                    ? 'h-70  scrollbar-desktop'
                    : ''
                    } space-y-1 pr-1`}>
                    {(formData.experienceCompanies && formData.experienceCompanies.length > 0
                      ? formData.experienceCompanies
                      : [{ offerLetter: undefined, relievingLetter: undefined, payslip: undefined }]
                    ).map((company, idx) => {
                      const increasePercent = calculatePercentageIncrease(company.firstSalary, company.currentSalary);

                      return (
                        <div key={idx} className="relative p-3  border border-gray-200  rounded-md space-y-2 overflow-y-auto  scrollbar-desktop">

                          <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold text-gray-800">
                              {idx === 0 ? 'Current Company' : `Previous Company ${idx}`}
                            </div>
                            <div className="flex items-center gap-1">
                              {idx === (formData.experienceCompanies?.length - 1 || 0) && (
                                <button
                                  type="button"
                                  onClick={addExperienceCompany}
                                  className="p-1 rounded hover:bg-green-100 group"
                                  title="Add previous company"
                                >
                                  <Plus className="w-4 h-4 text-green-600 group-hover:text-green-700" />
                                </button>
                              )}
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => removeExperienceCompany(idx)}
                                  className="p-1 rounded hover:bg-red-100 group"
                                  title="Delete this previous company"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600 group-hover:text-red-700" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Offer Letter */}
                          {renderYesNoWithReason('offerLetter', idx, company, 'Do you have Offer Letter?')}

                          {/* Payslip */}
                          {renderYesNoWithReason('payslip', idx, company, 'Do you have Payslip?')}

                          {/* Relieving Letter */}
                          {renderYesNoWithReason('relievingLetter', idx, company, 'Do you have Relieving Letter?')}

                          {/* Current Company specific fields */}
                          {idx === 0 && (
                            <>
                              {/* Notice Period */}
                              <div className="flex items-center gap-4 ">
                                <label className="w-40 text-xs font-semibold text-gray-700">Notice Period</label>
                                <select
                                  className="text-xs text-gray-700 px-2 py-1 border shadow-sm border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  name="noticePeriod"
                                  value={formData.noticePeriod}
                                  onChange={handleInputChange}
                                >
                                  <option value="">Select</option>
                                  <option value="immediate">Immediate</option>
                                  <option value="15 days">15 days</option>
                                  <option value="30 days">30 days</option>
                                  <option value="60 days">60 days</option>
                                  <option value="90 days">90 days</option>
                                </select>
                              </div>

                              {/* Do you earn incentives? */}
                              {renderYesNo('incentives', idx, company, 'Do you earn incentives?')}
                              {company.incentives === true && (
                                <div className="ml-44 space-y-2">

                                  <div className="flex items-center gap-4">
                                    <label className="w-40 text-xs font-semibold text-gray-700">Monthly incentive amount</label>
                                    <input
                                      type="text"
                                      placeholder="Enter amount"
                                      value={company.incentiveAmount || ''}
                                      onChange={(e) => handleExperienceDocChange(idx, 'incentiveAmount', e.target.value)}
                                      className="border border-gray-300 text-xs rounded px-2 py-0.5 w-40"
                                    />
                                  </div>
                                  {renderYesNoWithReason('incentiveProof', idx, company, 'Do you have proof?(like: Payslip,Bank Statement)')}
                                </div>
                              )}

                              {/* Worked more than 15 months? */}
                              {renderYesNo('moreThan15Months', idx, company, 'Worked more than 15 months in same company?')}
                              {company.moreThan15Months === true && (
                                <div className="ml-44  space-y-2">

                                  <div className="flex items-center gap-4">
                                    <label className="w-40 text-xs font-semibold text-gray-700">First Salary</label>
                                    <input
                                      type="number"
                                      value={company.firstSalary || ''}
                                      placeholder="Enter amount"
                                      onChange={(e) => handleExperienceDocChange(idx, 'firstSalary', e.target.value)}
                                      className="border border-gray-300 text-xs rounded px-2 py-0.5 w-40"
                                    />
                                  </div>
                                  <div className="flex  items-center gap-4">
                                    <label className="w-40 text-xs font-semibold text-gray-700">Current Salary</label>
                                    <input
                                      type="number"
                                      value={company.currentSalary || ''}
                                      placeholder="Enter amount"
                                      onChange={(e) => handleExperienceDocChange(idx, 'currentSalary', e.target.value)}
                                      className="border border-gray-300 text-xs rounded px-2 py-0.5 w-40"
                                    />
                                  </div>
                                  {increasePercent && increasePercent !== 'N/A' && (
                                    <div className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded">
                                      Increase: {increasePercent}%
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            )}

            {/* EXTRA SECTION */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('extra')}
                className="w-full flex justify-between items-center p-3 hover:bg-gray-50 border-gray-200"
              >
                <h3 className="text-sm font-medium text-gray-900">Additional</h3>
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 transition-transform ${expandedSection === 'extra' ? 'rotate-180' : ''}`}
                />
              </button>

              {expandedSection === 'extra' && (
                <div className="p-3 space-y-3">
                  {/* Two-wheeler */}
                  <div className="flex items-center gap-4 mb-3">
                    <label className="w-45 text-xs font-semibold text-gray-700">
                      Do you have a two-wheeler?
                    </label>

                    {/* Yes */}
                    <label className="inline-flex items-center gap-1">
                      <div
                        className={`relative flex items-center justify-center w-4 h-4 rounded-full border-2 ${formData['two-wheeler'] === true
                          ? 'border-green-500 bg-green-500'
                          : 'border-gray-300'
                          }`}
                        onDoubleClick={() => handleDoubleClick('two-wheeler')}
                        title="Double-click to clear selection"
                      >
                        <input
                          type="radio"
                          name="two-wheeler"
                          checked={formData['two-wheeler'] === true}
                          onChange={() => handleRadioChange('two-wheeler', true)}
                          className="absolute opacity-0 cursor-pointer"
                        />
                        {formData['two-wheeler'] === true && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span
                        className={`text-xs ${formData['two-wheeler'] === true
                          ? 'text-green-600 font-medium'
                          : 'text-gray-600'
                          }`}
                      >
                        Yes
                      </span>
                    </label>

                    {/* No */}
                    <label className="inline-flex items-center gap-1">
                      <div
                        className={`relative flex items-center justify-center w-4 h-4 rounded-full border-2 ${formData['two-wheeler'] === false
                          ? 'border-red-500 bg-red-500'
                          : 'border-gray-300'
                          }`}
                        onDoubleClick={() => handleDoubleClick('two-wheeler')}
                        title="Double-click to clear selection"
                      >
                        <input
                          type="radio"
                          name="two-wheeler"
                          checked={formData['two-wheeler'] === false}
                          onChange={() => handleRadioChange('two-wheeler', false)}
                          className="absolute opacity-0 cursor-pointer"
                        />
                        {formData['two-wheeler'] === false && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span
                        className={`text-xs ${formData['two-wheeler'] === false
                          ? 'text-red-600 font-medium'
                          : 'text-gray-600'
                          }`}
                      >
                        No
                      </span>
                    </label>
                  </div>

                  {/* License only when has two-wheeler */}
                  {formData['two-wheeler'] === true && (
                    <div className="flex flex-col gap-2 mb-3">
                      <div className="flex items-center gap-4">
                        <label className="w-45 text-xs font-semibold text-gray-700">
                          Do you have a license?
                        </label>

                        {/* Yes */}
                        <label className="inline-flex items-center gap-1">
                          <div
                            className={`relative flex items-center justify-center w-4 h-4 rounded-full border-2 ${formData.twoWheelerLicense === true
                              ? 'border-green-500 bg-green-500'
                              : 'border-gray-300'
                              }`}
                            onDoubleClick={() => handleDoubleClick('twoWheelerLicense')}
                            title="Double-click to clear selection"
                          >
                            <input
                              type="radio"
                              name="twoWheelerLicense"
                              checked={formData.twoWheelerLicense === true}
                              onChange={() => handleRadioChange('twoWheelerLicense', true)}
                              className="absolute opacity-0 cursor-pointer"
                            />
                            {formData.twoWheelerLicense === true && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <span
                            className={`text-xs ${formData.twoWheelerLicense === true
                              ? 'text-green-600 font-medium'
                              : 'text-gray-600'
                              }`}
                          >
                            Yes
                          </span>
                        </label>

                        {/* No */}
                        <label className="inline-flex items-center gap-1">
                          <div
                            className={`relative flex items-center justify-center w-4 h-4 rounded-full border-2 ${formData.twoWheelerLicense === false
                              ? 'border-red-500 bg-red-500'
                              : 'border-gray-300'
                              }`}
                            onDoubleClick={() => handleDoubleClick('twoWheelerLicense')}
                            title="Double-click to clear selection"
                          >
                            <input
                              type="radio"
                              name="twoWheelerLicense"
                              checked={formData.twoWheelerLicense === false}
                              onChange={() => handleRadioChange('twoWheelerLicense', false)}
                              className="absolute opacity-0 cursor-pointer"
                            />
                            {formData.twoWheelerLicense === false && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <span
                            className={`text-xs ${formData.twoWheelerLicense === false
                              ? 'text-red-600 font-medium'
                              : 'text-gray-600'
                              }`}
                          >
                            No
                          </span>
                        </label>
                      </div>

                      {/* Follow-up question */}
                      {formData.twoWheelerLicense === false && (
                        <div className="flex items-center gap-4">
                          <label className="w-45 text-xs font-semibold text-gray-700">
                            When will you get your license?
                          </label>
                          <input
                            type="text"
                            placeholder="Enter expected date or month"
                            value={formData.licenseExpectedDate || ''}
                            onChange={(e) =>
                              actions.updateFormField('licenseExpectedDate', e.target.value)
                            }

                            className="border border-gray-300 text-xs rounded px-2 py-0.5  w-60 placeholder:text-xs"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Laptop (no reason box on No) */}
                  <div className="flex items-center gap-4 mb-3">
                    <label className="w-45 text-xs font-semibold text-gray-700">Do you have a laptop?</label>
                    <label className="inline-flex items-center gap-1">
                      <div
                        className={`relative flex items-center justify-center w-4 h-4 rounded-full border-2 ${formData.laptop === true ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}
                        onDoubleClick={() => handleDoubleClick('laptop')}
                        title="Double-click to clear selection"
                      >
                        <input
                          type="radio"
                          name={'laptop'}
                          checked={formData.laptop === true}
                          onChange={() => handleRadioChange('laptop', true)}
                          className="absolute opacity-0 cursor-pointer"
                        />
                        {formData.laptop === true && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className={`text-xs ${formData.laptop === true ? 'text-green-600 font-medium' : 'text-gray-600'}`}>Yes</span>
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <div
                        className={`relative flex items-center justify-center w-4 h-4 rounded-full border-2 ${formData.laptop === false ? 'border-red-500 bg-red-500' : 'border-gray-300'}`}
                        onDoubleClick={() => handleDoubleClick('laptop')}
                        title="Double-click to clear selection"
                      >
                        <input
                          type="radio"
                          name={'laptop'}
                          checked={formData.laptop === false}
                          onChange={() => handleRadioChange('laptop', false)}
                          className="absolute opacity-0 cursor-pointer"
                        />
                        {formData.laptop === false && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className={`text-xs ${formData.laptop === false ? 'text-red-600 font-medium' : 'text-gray-600'}`}>No</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="border-t border-gray-200 p-2 flex justify-between">
            <button
              type="button"
              onClick={prevStep}
              className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md font-medium hover:bg-gray-700 transition-colors"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className={`px-4 py-2 text-sm text-white rounded-md font-medium transition-colors ${loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {loading ? 'Submitting...' : 'Submit Registration'}
            </button>
          </div>
        </div>



      </div>
      
      {/* Full-screen Loading Overlay */}
    </div>
  );
};

export default FormStep3;