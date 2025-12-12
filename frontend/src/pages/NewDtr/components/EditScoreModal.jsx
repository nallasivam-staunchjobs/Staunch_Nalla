import React, { useState, useEffect } from 'react';
import { X, Check, ChevronDown, Trash2, Plus } from 'lucide-react';
import { CandidateIntegrationService } from '../services/candidateIntegrationService';
import Loading from '../../../components/Loading';

const EditScoreModal = ({ isOpen, onClose, formData, candidateData, onDataUpdate }) => {
  const [editFormData, setEditFormData] = useState({});
  const [expandedSection, setExpandedSection] = useState('education');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && formData) {
      // Initialize with experience companies if not exists
      const initialData = { ...formData };

      // Initialize education fields if they don't exist
      if (initialData.tenthCertificate === undefined && initialData.education && initialData.education.length > 0) {
        // Map education array to individual fields for EditScoreModal
        const educationMap = {};
        initialData.education.forEach(cert => {
          const certType = cert.certificate_type || cert.type;
          if (certType === '10th') {
            educationMap.tenthCertificate = cert.has_certificate;
            educationMap.tenthCertificateReason = cert.reason || '';
          } else if (certType === '12th') {
            educationMap.twelfthCertificate = cert.has_certificate;
            educationMap.twelfthCertificateReason = cert.reason || '';
          } else if (certType === 'diploma' || certType === 'Diploma') {
            educationMap.diplomaCertificate = cert.has_certificate;
            educationMap.diplomaCertificateReason = cert.reason || '';
          } else if (certType === 'ug' || certType === 'UG') {
            educationMap.ugCertificate = cert.has_certificate;
            educationMap.ugCertificateReason = cert.reason || '';
          } else if (certType === 'pg' || certType === 'PG') {
            educationMap.pgCertificate = cert.has_certificate;
            educationMap.pgCertificateReason = cert.reason || '';
          } else if (certType === 'educationGap' || certType === 'Education Gap') {
            educationMap.educationGap = !cert.has_certificate; // Inverted logic: if has_certificate = false, then there's a gap
            educationMap.educationGapReason = cert.reason || '';
          }
        });
        Object.assign(initialData, educationMap);
      }

      // Initialize additional info fields if they don't exist
      if (initialData.additionalInfo && initialData.additionalInfo.length > 0) {
        const additionalMap = {};
        initialData.additionalInfo.forEach(info => {
          if (info.field_name === 'two_wheeler') {
            additionalMap['two-wheeler'] = info.field_value;
          } else if (info.field_name === 'two_wheeler_license') {
            additionalMap.twoWheelerLicense = info.field_value;
          } else if (info.field_name === 'license_expected_date') {
            additionalMap.licenseExpectedDate = info.field_value;
          } else if (info.field_name === 'laptop') {
            additionalMap.laptop = info.field_value;
          }
        });
        Object.assign(initialData, additionalMap);
      }
      if (!initialData.experienceCompanies || initialData.experienceCompanies.length === 0) {
        initialData.experienceCompanies = [{
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
          moreThan15Months: undefined,
          firstSalary: '',
          currentSalary: '',
          noticePeriod: ''
        }];
      }

      // Initialize previous companies if they exist
      if (initialData.previousCompanies && initialData.previousCompanies.length > 0) {
        // Map previous companies to experience companies format for editing
        const mappedPreviousCompanies = initialData.previousCompanies.map(prevComp => ({
          offerLetter: prevComp.offer_letter,
          offerLetterReason: prevComp.offer_letter_reason || '',
          payslip: prevComp.payslip,
          payslipReason: prevComp.payslip_reason || '',
          relievingLetter: prevComp.relieving_letter,
          relievingLetterReason: prevComp.relieving_letter_reason || ''
        }));

        // Add previous companies to experience companies array (after current company)
        if (initialData.experienceCompanies && initialData.experienceCompanies.length > 0) {
          initialData.experienceCompanies = [...initialData.experienceCompanies, ...mappedPreviousCompanies];
        } else {
          // If no current company, add a default current company first
          initialData.experienceCompanies = [
            {
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
              moreThan15Months: undefined,
              firstSalary: '',
              currentSalary: '',
              noticePeriod: ''
            },
            ...mappedPreviousCompanies
          ];
        }
      }

      setEditFormData(initialData);
    }
  }, [isOpen, formData]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRadioChange = (fieldName, value) => {
    setEditFormData(prev => ({ ...prev, [fieldName]: value }));
    if (value === true) {
      setEditFormData(prev => ({ ...prev, [`${fieldName}Reason`]: '' }));
    }
  };

  const handleDoubleClick = (fieldName) => {
    setEditFormData(prev => ({ ...prev, [fieldName]: undefined }));
    if (editFormData[`${fieldName}Reason`]) {
      setEditFormData(prev => ({ ...prev, [`${fieldName}Reason`]: '' }));
    }
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  const handleSave = async () => {
    if (!candidateData?.id) {
      console.error('No candidate ID available for update');
      return;
    }

    // Extract numeric candidate ID from compound ID if needed
    let numericCandidateId = candidateData.id;
    if (typeof candidateData.id === 'string' && candidateData.id.includes('-')) {
      numericCandidateId = candidateData.id.split('-')[0];
    }
    numericCandidateId = parseInt(numericCandidateId, 10);

    setIsLoading(true);
    try {

      // Only send the scoring fields that EditScoreModal manages
      const scoringData = {};

      // Education fields (only if they exist)
      if (editFormData.tenthCertificate !== undefined) {
        scoringData.tenthCertificate = editFormData.tenthCertificate;
        scoringData.tenthCertificateReason = editFormData.tenthCertificateReason || '';
      }
      if (editFormData.twelfthCertificate !== undefined) {
        scoringData.twelfthCertificate = editFormData.twelfthCertificate;
        scoringData.twelfthCertificateReason = editFormData.twelfthCertificateReason || '';
      }
      if (editFormData.diplomaCertificate !== undefined) {
        scoringData.diplomaCertificate = editFormData.diplomaCertificate;
        scoringData.diplomaCertificateReason = editFormData.diplomaCertificateReason || '';
      }
      if (editFormData.ugCertificate !== undefined) {
        scoringData.ugCertificate = editFormData.ugCertificate;
        scoringData.ugCertificateReason = editFormData.ugCertificateReason || '';
      }
      if (editFormData.pgCertificate !== undefined) {
        scoringData.pgCertificate = editFormData.pgCertificate;
        scoringData.pgCertificateReason = editFormData.pgCertificateReason || '';
      }
      if (editFormData.educationGap !== undefined) {
        scoringData.educationGap = editFormData.educationGap;
        scoringData.educationGapReason = editFormData.educationGapReason || '';
      }

      // Experience companies (only if they exist)
      if (editFormData.experienceCompanies && editFormData.experienceCompanies.length > 0) {
        scoringData.experienceCompanies = editFormData.experienceCompanies;
      }

      // Additional info fields (only if they exist)
      if (editFormData['two-wheeler'] !== undefined) {
        scoringData['two-wheeler'] = editFormData['two-wheeler'];
      }
      if (editFormData.twoWheelerLicense !== undefined) {
        scoringData.twoWheelerLicense = editFormData.twoWheelerLicense;
      }
      if (editFormData.licenseExpectedDate !== undefined) {
        scoringData.licenseExpectedDate = editFormData.licenseExpectedDate || '';
      }
      if (editFormData.laptop !== undefined) {
        scoringData.laptop = editFormData.laptop;
      }


      // Update only the scoring-related data, not the candidate record itself
      const result = await CandidateIntegrationService.updateScoringData(
        numericCandidateId,
        scoringData
      );


      // Notify parent component of data update
      if (onDataUpdate) {
        onDataUpdate(scoringData);
      }

      onClose();
    } catch (error) {
      console.error('Error saving candidate data:', error);
      console.error('Error details:', error.response?.data);
      alert(`Error saving data: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Experience companies helpers
  const addExperienceCompany = () => {
    const existing = editFormData.experienceCompanies || [];
    const newCompany = {
      offerLetter: undefined,
      offerLetterReason: '',
      payslip: undefined,
      payslipReason: '',
      relievingLetter: undefined,
      relievingLetterReason: ''
    };
    setEditFormData(prev => ({ ...prev, experienceCompanies: [...existing, newCompany] }));
  };

  const removeExperienceCompany = (indexToRemove) => {
    const existing = editFormData.experienceCompanies || [];
    if (existing.length <= 1 || indexToRemove === 0) return;
    const updated = existing.filter((_, idx) => idx !== indexToRemove);
    setEditFormData(prev => ({ ...prev, experienceCompanies: updated }));
  };

  const handleExperienceDocChange = (companyIndex, fieldName, value) => {
    const existing = editFormData.experienceCompanies || [];
    const updated = existing.map((company, idx) => (
      idx === companyIndex ? { ...company, [fieldName]: value } : company
    ));
    setEditFormData(prev => ({ ...prev, experienceCompanies: updated }));
  };

  const clearExperienceDoc = (companyIndex, fieldName) => {
    handleExperienceDocChange(companyIndex, fieldName, undefined);
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
            onDoubleClick={() => clearExperienceDoc(companyIndex, fieldKey)}
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
            onDoubleClick={() => clearExperienceDoc(companyIndex, fieldKey)}
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
            onDoubleClick={() => clearExperienceDoc(companyIndex, fieldKey)}
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
            onDoubleClick={() => clearExperienceDoc(companyIndex, fieldKey)}
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

  const renderRadioFieldWithReason = (label, fieldKey) => {
    const value = editFormData[fieldKey];
    const reasonValue = editFormData[`${fieldKey}Reason`];

    return (
      <div className="flex items-center gap-4">
        <label className="w-40 text-xs font-semibold text-gray-700">
          {label}
        </label>

        <label className="inline-flex items-center gap-1">
          <div
            className={`relative flex items-center justify-center w-4 h-4 rounded-full border-2 
              ${value === true ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}
            onDoubleClick={() => handleDoubleClick(fieldKey)}
            title="Double-click to clear selection"
          >
            <input
              type="radio"
              name={fieldKey}
              checked={value === true}
              onChange={() => handleRadioChange(fieldKey, true)}
              className="absolute opacity-0 cursor-pointer"
            />
            {value === true && (
              <Check className="w-3 h-3 text-white" />
            )}
          </div>
          <span className={`text-xs ${value === true ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
            Yes
          </span>
        </label>

        <label className="inline-flex items-center gap-1">
          <div
            className={`relative flex items-center justify-center w-4 h-4 rounded-full border-2 
              ${value === false ? 'border-red-500 bg-red-500' : 'border-gray-300'}`}
            onDoubleClick={() => handleDoubleClick(fieldKey)}
            title="Double-click to clear selection"
          >
            <input
              type="radio"
              name={fieldKey}
              checked={value === false}
              onChange={() => handleRadioChange(fieldKey, false)}
              className="absolute opacity-0 cursor-pointer"
            />
            {value === false && (
              <Check className="w-3 h-3 text-white" />
            )}
          </div>
          <span className={`text-xs ${value === false ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
            No
          </span>
        </label>

        {value === false && (
          <input
            type="text"
            name={`${fieldKey}Reason`}
            value={reasonValue || ''}
            onChange={handleInputChange}
            placeholder={`Reason for not providing ${label.toLowerCase()}`}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/30 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[100vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-2 ">
          <h2 className="text-md font-semibold text-gray-900">Edit Scoring Details</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-2 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-4">
            {/* Education Section */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('education')}
                className="w-full flex justify-between items-center p-3 hover:bg-gray-50"
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

                  {/* Education Gap */}
                  <div className="flex items-center gap-4 mb-3">
                    <label className="w-40 text-xs font-semibold text-gray-700">Education Gap</label>
                    <label className="inline-flex items-center gap-1">
                      <div
                        className={`relative flex items-center justify-center w-4 h-4 rounded-full border-2 
                        ${editFormData.educationGap === true ? 'border-red-500 bg-red-500' : 'border-gray-300'}`}
                        onDoubleClick={() => handleDoubleClick('educationGap')}
                        title="Double-click to clear selection"
                      >
                        <input
                          type="radio"
                          name="educationGap"
                          checked={editFormData.educationGap === true}
                          onChange={() => handleRadioChange('educationGap', true)}
                          className="absolute opacity-0 cursor-pointer"
                        />
                        {editFormData.educationGap === true && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-xs ${editFormData.educationGap === true ? 'text-red-600 font-medium' : 'text-gray-600'}`}>Yes</span>
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <div
                        className={`relative flex items-center justify-center w-4 h-4 rounded-full border-2 
                        ${editFormData.educationGap === false ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}
                        onDoubleClick={() => handleDoubleClick('educationGap')}
                        title="Double-click to clear selection"
                      >
                        <input
                          type="radio"
                          name="educationGap"
                          checked={editFormData.educationGap === false}
                          onChange={() => handleRadioChange('educationGap', false)}
                          className="absolute opacity-0 cursor-pointer"
                        />
                        {editFormData.educationGap === false && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-xs ${editFormData.educationGap === false ? 'text-green-600 font-medium' : 'text-gray-600'}`}>No</span>
                    </label>
                    {editFormData.educationGap === true && (
                      <input
                        type="text"
                        name="educationGapReason"
                        value={editFormData.educationGapReason || ''}
                        onChange={handleInputChange}
                        placeholder="Please specify education gap details"
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Experience Section */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('experience')}
                className="w-full flex justify-between items-center p-3 hover:bg-gray-50"
              >
                <h3 className="text-sm font-medium text-gray-900">Experience Documents</h3>
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 transition-transform ${expandedSection === 'experience' ? 'rotate-180' : ''}`}
                />
              </button>

              {expandedSection === 'experience' && (
                <div className="p-1 h-70 overflow-y-auto scrollbar-desktop">
                  <div className={`${editFormData.experienceCompanies && editFormData.experienceCompanies.length > 1 ? 'h-70 scrollbar-desktop' : ''} space-y-1 pr-1`}>
                    {(editFormData.experienceCompanies && editFormData.experienceCompanies.length > 0
                      ? editFormData.experienceCompanies
                      : [{ offerLetter: undefined, relievingLetter: undefined, payslip: undefined }]
                    ).map((company, idx) => {
                      const increasePercent = calculatePercentageIncrease(company.firstSalary, company.currentSalary);

                      return (
                        <div key={idx} className="relative p-3 border border-gray-200 rounded-md space-y-2 overflow-y-auto scrollbar-desktop">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold text-gray-800">
                              {idx === 0 ? 'Current Company' : `Previous Company ${idx}`}
                            </div>
                            <div className="flex items-center gap-1">
                              {idx === (editFormData.experienceCompanies?.length - 1 || 0) && (
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


                          {/* Notice Period - only for current company */}
                          {idx === 0 && (
                            <div className="flex items-center gap-4">
                              <label className="w-40 text-xs font-semibold text-gray-700">Notice Period</label>
                              <select
                                className="text-xs text-gray-700 px-2 py-1 border shadow-sm border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                value={company.noticePeriod || ''}
                                onChange={(e) => handleExperienceDocChange(idx, 'noticePeriod', e.target.value)}
                              >
                                <option value="">Select</option>
                                <option value="immediate">Immediate</option>
                                <option value="15 days">15 days</option>
                                <option value="30 days">30 days</option>
                                <option value="60 days">60 days</option>
                                <option value="90 days">90 days</option>
                              </select>
                            </div>
                          )}

                          {/* Incentives - only for current company */}
                          {idx === 0 && (
                            <>
                              {renderYesNo('incentives', idx, company, 'Do you earn incentives?')}

                              {/* Incentive details when Yes */}
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
                            </>
                          )}

                          {/* Worked more than 15 months? - only for current company */}
                          {idx === 0 && (
                            <>
                              {renderYesNo('moreThan15Months', idx, company, 'Worked more than 15 months in same company?')}

                              {/* Salary details when worked more than 15 months */}
                              {company.moreThan15Months === true && (
                                <div className="ml-44 space-y-2">
                                  <div className="flex items-center gap-4">
                                    <label className="w-40 text-xs font-semibold text-gray-700">First Salary</label>
                                    <input
                                      type="number"
                                      placeholder="Enter first salary"
                                      value={company.firstSalary || ''}
                                      onChange={(e) => handleExperienceDocChange(idx, 'firstSalary', e.target.value)}
                                      className="border border-gray-300 text-xs rounded px-2 py-0.5 w-40"
                                    />
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <label className="w-40 text-xs font-semibold text-gray-700">Current Salary</label>
                                    <input
                                      type="number"
                                      placeholder="Enter current salary"
                                      value={company.currentSalary || ''}
                                      onChange={(e) => handleExperienceDocChange(idx, 'currentSalary', e.target.value)}
                                      className="border border-gray-300 text-xs rounded px-2 py-0.5 w-40"
                                    />
                                  </div>
                                  {company.firstSalary && company.currentSalary && (
                                    <div className="flex items-center gap-4">
                                      <label className="w-40 text-xs font-semibold text-gray-700">Salary Increase</label>
                                      <span className="text-xs text-green-600 font-medium">
                                        {increasePercent}% increase
                                      </span>
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

            {/* Additional Section */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('additional')}
                className="w-full flex justify-between items-center p-3 hover:bg-gray-50"
              >
                <h3 className="text-sm font-medium text-gray-900">Additional</h3>
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 transition-transform ${expandedSection === 'additional' ? 'rotate-180' : ''}`}
                />
              </button>

              {expandedSection === 'additional' && (
                <div className="p-3 space-y-3">
                  {/* Two-wheeler */}
                  <div className="flex items-center gap-4 mb-3">
                    <label className="w-45 text-xs font-semibold text-gray-700">Do you have a two-wheeler?</label>
                    <label className="inline-flex items-center gap-1">
                      <div
                        className={`relative flex items-center justify-center w-4 h-4 rounded-full border-2 ${editFormData['two-wheeler'] === true ? 'border-green-500 bg-green-500' : 'border-gray-300'
                          }`}
                        onDoubleClick={() => handleDoubleClick('two-wheeler')}
                        title="Double-click to clear selection"
                      >
                        <input
                          type="radio"
                          name="two-wheeler"
                          checked={editFormData['two-wheeler'] === true}
                          onChange={() => handleRadioChange('two-wheeler', true)}
                          className="absolute opacity-0 cursor-pointer"
                        />
                        {editFormData['two-wheeler'] === true && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-xs ${editFormData['two-wheeler'] === true ? 'text-green-600 font-medium' : 'text-gray-600'}`}>Yes</span>
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <div
                        className={`relative flex items-center justify-center w-4 h-4 rounded-full border-2 ${editFormData['two-wheeler'] === false ? 'border-red-500 bg-red-500' : 'border-gray-300'
                          }`}
                        onDoubleClick={() => handleDoubleClick('two-wheeler')}
                        title="Double-click to clear selection"
                      >
                        <input
                          type="radio"
                          name="two-wheeler"
                          checked={editFormData['two-wheeler'] === false}
                          onChange={() => handleRadioChange('two-wheeler', false)}
                          className="absolute opacity-0 cursor-pointer"
                        />
                        {editFormData['two-wheeler'] === false && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-xs ${editFormData['two-wheeler'] === false ? 'text-red-600 font-medium' : 'text-gray-600'}`}>No</span>
                    </label>
                  </div>

                  {/* License when has two-wheeler */}
                  {editFormData['two-wheeler'] === true && (
                    <div className="flex flex-col gap-2 mb-3">
                      <div className="flex items-center gap-4">
                        <label className="w-45 text-xs font-semibold text-gray-700">Do you have a license?</label>
                        <label className="inline-flex items-center gap-1">
                          <div
                            className={`relative flex items-center justify-center w-4 h-4 rounded-full border-2 ${editFormData.twoWheelerLicense === true ? 'border-green-500 bg-green-500' : 'border-gray-300'
                              }`}
                            onDoubleClick={() => handleDoubleClick('twoWheelerLicense')}
                            title="Double-click to clear selection"
                          >
                            <input
                              type="radio"
                              name="twoWheelerLicense"
                              checked={editFormData.twoWheelerLicense === true}
                              onChange={() => handleRadioChange('twoWheelerLicense', true)}
                              className="absolute opacity-0 cursor-pointer"
                            />
                            {editFormData.twoWheelerLicense === true && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className={`text-xs ${editFormData.twoWheelerLicense === true ? 'text-green-600 font-medium' : 'text-gray-600'}`}>Yes</span>
                        </label>
                        <label className="inline-flex items-center gap-1">
                          <div
                            className={`relative flex items-center justify-center w-4 h-4 rounded-full border-2 ${editFormData.twoWheelerLicense === false ? 'border-red-500 bg-red-500' : 'border-gray-300'
                              }`}
                            onDoubleClick={() => handleDoubleClick('twoWheelerLicense')}
                            title="Double-click to clear selection"
                          >
                            <input
                              type="radio"
                              name="twoWheelerLicense"
                              checked={editFormData.twoWheelerLicense === false}
                              onChange={() => handleRadioChange('twoWheelerLicense', false)}
                              className="absolute opacity-0 cursor-pointer"
                            />
                            {editFormData.twoWheelerLicense === false && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className={`text-xs ${editFormData.twoWheelerLicense === false ? 'text-red-600 font-medium' : 'text-gray-600'}`}>No</span>
                        </label>
                      </div>

                      {/* Follow-up question when license = No */}
                      {editFormData.twoWheelerLicense === false && (
                        <div className="flex items-center gap-4">
                          <label className="w-45 text-xs font-semibold text-gray-700">When will you get your license?</label>
                          <input
                            type="text"
                            placeholder="Enter expected date or month"
                            name="licenseExpectedDate"
                            value={editFormData.licenseExpectedDate || ''}
                            onChange={handleInputChange}
                            className="border border-gray-300 text-xs rounded px-2 py-0.5 w-60 placeholder:text-xs"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Laptop */}
                  <div className="flex items-center gap-4 mb-3">
                    <label className="w-45 text-xs font-semibold text-gray-700">Do you have a laptop?</label>
                    <label className="inline-flex items-center gap-1">
                      <div
                        className={`relative flex items-center justify-center w-4 h-4 rounded-full border-2 ${editFormData.laptop === true ? 'border-green-500 bg-green-500' : 'border-gray-300'
                          }`}
                        onDoubleClick={() => handleDoubleClick('laptop')}
                        title="Double-click to clear selection"
                      >
                        <input
                          type="radio"
                          name="laptop"
                          checked={editFormData.laptop === true}
                          onChange={() => handleRadioChange('laptop', true)}
                          className="absolute opacity-0 cursor-pointer"
                        />
                        {editFormData.laptop === true && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-xs ${editFormData.laptop === true ? 'text-green-600 font-medium' : 'text-gray-600'}`}>Yes</span>
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <div
                        className={`relative flex items-center justify-center w-4 h-4 rounded-full border-2 ${editFormData.laptop === false ? 'border-red-500 bg-red-500' : 'border-gray-300'
                          }`}
                        onDoubleClick={() => handleDoubleClick('laptop')}
                        title="Double-click to clear selection"
                      >
                        <input
                          type="radio"
                          name="laptop"
                          checked={editFormData.laptop === false}
                          onChange={() => handleRadioChange('laptop', false)}
                          className="absolute opacity-0 cursor-pointer"
                        />
                        {editFormData.laptop === false && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-xs ${editFormData.laptop === false ? 'text-red-600 font-medium' : 'text-gray-600'}`}>No</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-2 ">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
      
      {/* Loading Overlay */}
    </div>
  );
};

export default EditScoreModal;
