import React, { useState } from 'react';
import { calculateScores, getScoreGrade, getScoreColor, getScorePercentage } from '../utils/candidateScoring';
import { Eye, Edit3, Check, ChevronDown, Trash2, Plus, X } from 'lucide-react';
import EditScoreModal from './EditScoreModal';

// Progress Bar Component
const ProgressBar = ({ score, maxScore, color = 'bg-blue-500' }) => {
  const percentage = Math.min(getScorePercentage(score, maxScore), 100);

  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all duration-300 ${percentage === 0 ? 'bg-gray-400' : color}`}
        style={{ width: `${Math.max(percentage, 2)}%` }}
      />
    </div>
  );
};

// Tooltip Component
const Tooltip = ({ children, content, isVisible }) => {
  return (
    <div className="relative">
      {children}
      {isVisible && (
        <div className="absolute z-50 left-0 top-8 w-70 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg">
          <div className="space-y-2">{content}</div>
          <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-800 transform rotate-45"></div>
        </div>
      )}
    </div>
  );
};

// Score Item Component
const ScoreItem = ({ label, score, maxScore, showProgress = true, tooltipContent, onEyeClick }) => {
  const percentage = getScorePercentage(score, maxScore).toFixed(1);
  const colorClass = getScoreColor(score, maxScore);

  let progressColor = 'bg-gray-400';
  if (percentage >= 80) progressColor = 'bg-green-500';
  else if (percentage >= 60) progressColor = 'bg-blue-500';
  else if (percentage >= 40) progressColor = 'bg-yellow-500';
  else progressColor = 'bg-red-500';

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700">{label}</span>
          {tooltipContent && (
            <button
              onClick={onEyeClick}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              title="View details"
            >
              <Eye size={14} />
            </button>
          )}
        </div>
        <span className={`text-xs font-bold ${colorClass}`}>
          {score} / {maxScore}
        </span>
      </div>
      {showProgress && (
        <>
          <ProgressBar score={score} maxScore={maxScore} color={progressColor} />
          <div className="text-right">
            <span className={`text-xs ${colorClass}`}>{percentage}%</span>
          </div>
        </>
      )}
    </div>
  );
};

// Main Candidate Score Display Component
const CandidateScoreDisplay = ({ formData, candidateData, className = '', onDataUpdate }) => {
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentFormData, setCurrentFormData] = useState(formData);

  // Update current form data when props change
  React.useEffect(() => {
    setCurrentFormData(formData);
  }, [formData]);

  // Handle data updates from EditScoreModal
  const handleDataUpdate = (updatedScoringData) => {
    // Convert the scoring data back to the expected form data structure
    const updatedFormData = { ...currentFormData };

    // Map education scoring fields back to education array format
    const educationUpdates = [];
    
    // Handle individual certificate fields
    if (updatedScoringData.tenthCertificate !== undefined) {
      educationUpdates.push({
        type: '10th',
        certificate_type: '10th',
        has_certificate: updatedScoringData.tenthCertificate,
        reason: updatedScoringData.tenthCertificateReason || ''
      });
    }
    if (updatedScoringData.twelfthCertificate !== undefined) {
      educationUpdates.push({
        type: '12th',
        certificate_type: '12th',
        has_certificate: updatedScoringData.twelfthCertificate,
        reason: updatedScoringData.twelfthCertificateReason || ''
      });
    }
    if (updatedScoringData.diplomaCertificate !== undefined) {
      educationUpdates.push({
        type: 'Diploma',
        certificate_type: 'Diploma',
        has_certificate: updatedScoringData.diplomaCertificate,
        reason: updatedScoringData.diplomaCertificateReason || ''
      });
    }
    if (updatedScoringData.ugCertificate !== undefined) {
      educationUpdates.push({
        type: 'UG',
        certificate_type: 'UG',
        has_certificate: updatedScoringData.ugCertificate,
        reason: updatedScoringData.ugCertificateReason || ''
      });
    }
    if (updatedScoringData.pgCertificate !== undefined) {
      educationUpdates.push({
        type: 'PG',
        certificate_type: 'PG',
        has_certificate: updatedScoringData.pgCertificate,
        reason: updatedScoringData.pgCertificateReason || ''
      });
    }
    if (updatedScoringData.educationGap !== undefined) {
      educationUpdates.push({
        type: 'Education Gap',
        certificate_type: 'Education Gap',
        has_certificate: !updatedScoringData.educationGap,
        reason: updatedScoringData.educationGapReason || ''
      });
    }

    // Update education array if we have updates
    if (educationUpdates.length > 0) {
      updatedFormData.education = educationUpdates;
    }

    // Map experience companies data
    if (updatedScoringData.experienceCompanies) {
      updatedFormData.experienceCompanies = updatedScoringData.experienceCompanies;
      
      // Also update the experience array format for scoring
      updatedFormData.experience = updatedScoringData.experienceCompanies.map(company => ({
        offer_letter: company.offerLetter,
        payslip: company.payslip,
        relieving_letter: company.relievingLetter,
        incentives: company.incentives,
        incentive_proof: company.incentiveProof,
        more_than_15_months: company.moreThan15Months,
        first_salary: company.firstSalary,
        current_salary: company.currentSalary,
        incentive_amount: company.incentiveAmount
      }));
    }

    // Map additional info fields
    const additionalUpdates = [];
    if (updatedScoringData['two-wheeler'] !== undefined || 
        updatedScoringData.twoWheelerLicense !== undefined || 
        updatedScoringData.laptop !== undefined) {
      additionalUpdates.push({
        has_two_wheeler: updatedScoringData['two-wheeler'],
        two_wheeler_license: updatedScoringData.twoWheelerLicense,
        has_laptop: updatedScoringData.laptop
      });
    }

    if (additionalUpdates.length > 0) {
      updatedFormData.additional = additionalUpdates;
    }

    
    setCurrentFormData(updatedFormData);
    if (onDataUpdate) {
      onDataUpdate(updatedFormData);
    }
  };

  // Calculate scores using current form data
  const scores = calculateScores(currentFormData);
  const {
    educationScore,
    experienceScore,
    additionalScore,
    totalScore
  } = scores;

  // Get candidate type from actual candidate experience data
  const getCandidateTypeFromExperience = () => {
    if (!candidateData?.experience) return 'fresher';

    const experience = candidateData.experience.toLowerCase();

    // Parse experience string to determine type
    if (experience.includes('year') || experience.includes('month')) {
      // Extract numbers from experience string
      const yearMatch = experience.match(/(\d+)\s*year/);
      const monthMatch = experience.match(/(\d+)\s*month/);

      const years = yearMatch ? parseInt(yearMatch[1]) : 0;
      const months = monthMatch ? parseInt(monthMatch[1]) : 0;
      const totalMonths = (years * 12) + months;

      return totalMonths >= 15 ? 'experienced' : 'fresher';
    }

    // Check for common experience indicators
    if (experience.includes('experienced') ||
      experience.includes('senior') ||
      experience.includes('lead') ||
      experience !== 'not specified' && experience !== '') {
      return 'experienced';
    }

    return 'fresher';
  };

  const candidateType = getCandidateTypeFromExperience();

  // Generate tooltip content for each section
  const getEducationTooltip = () => {
    const educationArray = currentFormData?.education || [];

    if (educationArray.length === 0) {
      return (
        <div className="space-y-1">
          <div className="font-semibold mb-2">Education Details:</div>
          <span className="text-gray-300">No education data available</span>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <div className="font-semibold mb-2">Education Details:</div>
        {educationArray.map((edu, index) => {
          const hasCertificate = edu.has_certificate;
          const reason = edu.reason;


          const getCertificateName = (eduItem, index) => {
            // Try certificate_type first, then type field
            const certType = eduItem.certificate_type || eduItem.type;
            
            if (certType && certType !== 'other' && certType.trim() !== '') {
              const typeMap = {
                '10th': '10th Certificate',
                '12th': '12th Certificate',
                'diploma': 'Diploma Certificate',
                'Diploma': 'Diploma Certificate',
                'ug': 'UG Certificate',
                'UG': 'UG Certificate',
                'pg': 'PG Certificate',
                'PG': 'PG Certificate',
                'educationGap': 'Education Gap',
                'Education Gap': 'Education Gap'
              };
              return typeMap[certType] || `${certType} Certificate`;
            }

            // Only use fallback if no type is provided
            return `Certificate ${index + 1}`;
          };

          const certificateName = getCertificateName(edu, index);

          if (hasCertificate === true) {
            return (
              <div key={index} className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-green-300">{certificateName}: Yes</span>
              </div>
            );
          } else if (hasCertificate === false) {
            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span className="text-red-300">{certificateName}: No</span>
                </div>
                {reason && reason.trim() && (
                  <div className="ml-4 text-red-200 text-xs italic">
                    Reason: {reason}
                  </div>
                )}
              </div>
            );
          } else {
            return (
              <div key={index} className="flex items-center gap-2">
                <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                <span className="text-gray-300">{certificateName}: Not specified</span>
              </div>
            );
          }
        })}
      </div>
    );
  };

  const getExperienceTooltip = () => {
    // Check multiple possible data sources for experience
    const experienceData = currentFormData?.experienceCompanies || currentFormData?.experience || [];

    if (!experienceData || experienceData.length === 0) {
      return (
        <div className="space-y-1">
          <div className="font-semibold mb-2 text-white">📊 Experience Database:</div>
          <div className="text-gray-300 text-xs bg-gray-700 p-2 rounded">
            <div className="font-mono">
              No data found
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">


        {/* Experience Details */}
        <div className="bg-gray-700 p-2 rounded mb-2">
          <div className="text-xs text-white mb-1 font-bold">Experience Details:</div>
          {experienceData.map((company, index) => (
            <div key={index} className="mb-2 text-xs space-y-1">
              <div className="text-yellow-300 font-bold mb-1">
                {index === 0 ? 'Current Company:' : `Previous Company ${index}:`}
              </div>

              {/* Simple tick/cross format - handle both field name variations */}
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${(company.offerLetter === true || company.offerLetter === 1 || company.offer_letter === true || company.offer_letter === 1) ? 'bg-green-500' : (company.offerLetter === false || company.offerLetter === 0 || company.offer_letter === false || company.offer_letter === 0) ? 'bg-red-500' : 'bg-gray-500'}`}></span>
                <span className={`${(company.offerLetter === true || company.offerLetter === 1 || company.offer_letter === true || company.offer_letter === 1) ? 'text-green-300' : (company.offerLetter === false || company.offerLetter === 0 || company.offer_letter === false || company.offer_letter === 0) ? 'text-red-300' : 'text-gray-300'}`}>
                  Offer Letter: {(company.offerLetter === true || company.offerLetter === 1 || company.offer_letter === true || company.offer_letter === 1) ? 'Yes' : (company.offerLetter === false || company.offerLetter === 0 || company.offer_letter === false || company.offer_letter === 0) ? 'No' : 'Not specified'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${(company.payslip === true || company.payslip === 1) ? 'bg-green-500' : (company.payslip === false || company.payslip === 0) ? 'bg-red-500' : 'bg-gray-500'}`}></span>
                <span className={`${(company.payslip === true || company.payslip === 1) ? 'text-green-300' : (company.payslip === false || company.payslip === 0) ? 'text-red-300' : 'text-gray-300'}`}>
                  Payslip: {(company.payslip === true || company.payslip === 1) ? 'Yes' : (company.payslip === false || company.payslip === 0) ? 'No' : 'Not specified'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${(company.relievingLetter === true || company.relievingLetter === 1 || company.relieving_letter === true || company.relieving_letter === 1) ? 'bg-green-500' : (company.relievingLetter === false || company.relievingLetter === 0 || company.relieving_letter === false || company.relieving_letter === 0) ? 'bg-red-500' : 'bg-gray-500'}`}></span>
                <span className={`${(company.relievingLetter === true || company.relievingLetter === 1 || company.relieving_letter === true || company.relieving_letter === 1) ? 'text-green-300' : (company.relievingLetter === false || company.relievingLetter === 0 || company.relieving_letter === false || company.relieving_letter === 0) ? 'text-red-300' : 'text-gray-300'}`}>
                  Relieving Letter: {(company.relievingLetter === true || company.relievingLetter === 1 || company.relieving_letter === true || company.relieving_letter === 1) ? 'Yes' : (company.relievingLetter === false || company.relievingLetter === 0 || company.relieving_letter === false || company.relieving_letter === 0) ? 'No' : 'Not specified'}
                </span>
              </div>

              {/* Current Company Specific Fields */}
              {index === 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span className="text-blue-300">Notice Period: {currentFormData.noticePeriod || 'Not specified'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${(company.incentives === true || company.incentives === 1) ? 'bg-green-500' : (company.incentives === false || company.incentives === 0) ? 'bg-red-500' : 'bg-gray-500'}`}></span>
                    <span className={`${(company.incentives === true || company.incentives === 1) ? 'text-green-300' : (company.incentives === false || company.incentives === 0) ? 'text-red-300' : 'text-gray-300'}`}>
                      Incentives: {(company.incentives === true || company.incentives === 1) ? 'Yes' : (company.incentives === false || company.incentives === 0) ? 'No' : 'Not specified'}
                    </span>
                  </div>

                  {(company.incentives === true || company.incentives === 1) && (
                    <>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                        <span className="text-yellow-300">Incentive Amount: ₹{company.incentiveAmount || company.incentive_amount || 'Not specified'}</span>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <span className={`w-2 h-2 rounded-full ${(company.incentiveProof === true || company.incentiveProof === 1 || company.incentive_proof === true || company.incentive_proof === 1) ? 'bg-green-500' : (company.incentiveProof === false || company.incentiveProof === 0 || company.incentive_proof === false || company.incentive_proof === 0) ? 'bg-red-500' : 'bg-gray-500'}`}></span>
                        <span className={`${(company.incentiveProof === true || company.incentiveProof === 1 || company.incentive_proof === true || company.incentive_proof === 1) ? 'text-green-300' : (company.incentiveProof === false || company.incentiveProof === 0 || company.incentive_proof === false || company.incentive_proof === 0) ? 'text-red-300' : 'text-gray-300'}`}>
                          Incentive Proof: {(company.incentiveProof === true || company.incentiveProof === 1 || company.incentive_proof === true || company.incentive_proof === 1) ? 'Yes' : (company.incentiveProof === false || company.incentiveProof === 0 || company.incentive_proof === false || company.incentive_proof === 0) ? 'No' : 'Not specified'}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${(company.moreThan15Months === true || company.moreThan15Months === 1 || company.more_than_15_months === true || company.more_than_15_months === 1) ? 'bg-green-500' : (company.moreThan15Months === false || company.moreThan15Months === 0 || company.more_than_15_months === false || company.more_than_15_months === 0) ? 'bg-red-500' : 'bg-gray-500'}`}></span>
                    <span className={`${(company.moreThan15Months === true || company.moreThan15Months === 1 || company.more_than_15_months === true || company.more_than_15_months === 1) ? 'text-green-300' : (company.moreThan15Months === false || company.moreThan15Months === 0 || company.more_than_15_months === false || company.more_than_15_months === 0) ? 'text-red-300' : 'text-gray-300'}`}>
                      15+ Months: {(company.moreThan15Months === true || company.moreThan15Months === 1 || company.more_than_15_months === true || company.more_than_15_months === 1) ? 'Yes' : (company.moreThan15Months === false || company.moreThan15Months === 0 || company.more_than_15_months === false || company.more_than_15_months === 0) ? 'No' : 'Not specified'}
                    </span>
                  </div>

                  {(company.moreThan15Months === true || company.moreThan15Months === 1 || company.more_than_15_months === true || company.more_than_15_months === 1) && (
                    <>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                        <span className="text-yellow-300">First Salary: ₹{company.firstSalary || company.first_salary || 'Not specified'}</span>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                        <span className="text-yellow-300">Current Salary: ₹{company.currentSalary || company.current_salary || 'Not specified'}</span>
                      </div>
                      {(company.firstSalary || company.first_salary) && (company.currentSalary || company.current_salary) && (
                        <div className="flex items-center gap-2 ml-4">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span className="text-green-300">Salary Increase: {(((parseFloat(company.currentSalary || company.current_salary) - parseFloat(company.firstSalary || company.first_salary)) / parseFloat(company.firstSalary || company.first_salary)) * 100).toFixed(2)}%</span>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Previous Companies from separate table */}
        {currentFormData.previousCompanies && currentFormData.previousCompanies.length > 0 && (
          <div className="bg-gray-700 p-2 rounded mb-2">
            <div className="text-xs text-orange-400 mb-1 font-mono font-bold">Previous Companies ({currentFormData.previousCompanies.length} records)</div>
            {currentFormData.previousCompanies.map((prevComp, index) => (
              <div key={index} className="border-l-2 border-orange-500 pl-2 mb-2 text-xs space-y-1">
                <div className="text-orange-300 font-bold">Previous Company #{index + 1}:</div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${(prevComp.offer_letter === true || prevComp.offer_letter === 1) ? 'bg-green-500' : (prevComp.offer_letter === false || prevComp.offer_letter === 0) ? 'bg-red-500' : 'bg-gray-500'}`}></span>
                    <span className={`${(prevComp.offer_letter === true || prevComp.offer_letter === 1) ? 'text-green-300' : (prevComp.offer_letter === false || prevComp.offer_letter === 0) ? 'text-red-300' : 'text-gray-300'}`}>
                      Offer Letter: {(prevComp.offer_letter === true || prevComp.offer_letter === 1) ? 'Yes' : (prevComp.offer_letter === false || prevComp.offer_letter === 0) ? 'No' : 'Not specified'}
                    </span>
                  </div>
                  {(prevComp.offer_letter === false || prevComp.offer_letter === 0) && prevComp.offer_letter_reason && prevComp.offer_letter_reason.trim() && (
                    <div className="ml-4 text-red-200 text-xs italic">
                      Reason: {prevComp.offer_letter_reason}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${(prevComp.payslip === true || prevComp.payslip === 1) ? 'bg-green-500' : (prevComp.payslip === false || prevComp.payslip === 0) ? 'bg-red-500' : 'bg-gray-500'}`}></span>
                    <span className={`${(prevComp.payslip === true || prevComp.payslip === 1) ? 'text-green-300' : (prevComp.payslip === false || prevComp.payslip === 0) ? 'text-red-300' : 'text-gray-300'}`}>
                      Payslip: {(prevComp.payslip === true || prevComp.payslip === 1) ? 'Yes' : (prevComp.payslip === false || prevComp.payslip === 0) ? 'No' : 'Not specified'}
                    </span>
                  </div>
                  {(prevComp.payslip === false || prevComp.payslip === 0) && prevComp.payslip_reason && prevComp.payslip_reason.trim() && (
                    <div className="ml-4 text-red-200 text-xs italic">
                      Reason: {prevComp.payslip_reason}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${(prevComp.relieving_letter === true || prevComp.relieving_letter === 1) ? 'bg-green-500' : (prevComp.relieving_letter === false || prevComp.relieving_letter === 0) ? 'bg-red-500' : 'bg-gray-500'}`}></span>
                    <span className={`${(prevComp.relieving_letter === true || prevComp.relieving_letter === 1) ? 'text-green-300' : (prevComp.relieving_letter === false || prevComp.relieving_letter === 0) ? 'text-red-300' : 'text-gray-300'}`}>
                      Relieving Letter: {(prevComp.relieving_letter === true || prevComp.relieving_letter === 1) ? 'Yes' : (prevComp.relieving_letter === false || prevComp.relieving_letter === 0) ? 'No' : 'Not specified'}
                    </span>
                  </div>
                  {(prevComp.relieving_letter === false || prevComp.relieving_letter === 0) && prevComp.relieving_letter_reason && prevComp.relieving_letter_reason.trim() && (
                    <div className="ml-4 text-red-200 text-xs italic">
                      Reason: {prevComp.relieving_letter_reason}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}


      </div>
    );
  };

  const getAdditionalTooltip = () => {
    if (!currentFormData?.additional || currentFormData.additional.length === 0) {
      return (
        <div className="space-y-1">
          <div className="font-semibold mb-2">Additional Details:</div>
          <span className="text-gray-300">No additional data available</span>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <div className="font-semibold mb-2">Additional Details:</div>
        {currentFormData.additional.map((add, index) => (
          <div key={index} className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${add.has_two_wheeler ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className={add.has_two_wheeler ? 'text-green-300' : 'text-red-300'}>
                Has Two Wheeler: {add.has_two_wheeler ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${add.two_wheeler_license ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className={add.two_wheeler_license ? 'text-green-300' : 'text-red-300'}>
                Two Wheeler License: {add.two_wheeler_license ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${add.has_laptop ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className={add.has_laptop ? 'text-green-300' : 'text-red-300'}>
                Has Laptop: {add.has_laptop ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Use fixed max scores: 25 + 55 + 20 = 100
  const totalMaxScore = 100;
  const scoreGrade = getScoreGrade(totalScore, totalMaxScore);
  const totalPercentage = getScorePercentage(totalScore, totalMaxScore).toFixed(1);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-2 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-md font-semibold text-gray-800">
          Candidate Scoring Assessment
        </h3>
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="p-1 text-gray-400 hover:text-blue-600 transition-colors rounded"
          title="Edit scoring details"
        >
          <Edit3 size={16} />
        </button>
      </div>
      <div className="flex mb-2">
        <div className="flex items-center gap-3">
         
          <span className={`text-md font-bold px-2 py-1 rounded-lg bg-gray-100 ${getScoreColor(totalScore, totalMaxScore)}`}>
            {scoreGrade}
          </span>
        </div>
      </div>

      {/* Individual Scores */}
      <div className="space-y-2 mb-3">
        <Tooltip
          content={getEducationTooltip()}
          isVisible={activeTooltip === 'education'}
        >
          <ScoreItem
            label="Education Score"
            score={educationScore}
            maxScore={25}
            tooltipContent={true}
            onEyeClick={() => setActiveTooltip(activeTooltip === 'education' ? null : 'education')}
          />
        </Tooltip>

        <Tooltip
          content={getExperienceTooltip()}
          isVisible={activeTooltip === 'experience'}
        >
          <ScoreItem
            label="Experience Score"
            score={experienceScore}
            maxScore={55}
            tooltipContent={true}
            onEyeClick={() => setActiveTooltip(activeTooltip === 'experience' ? null : 'experience')}
          />
        </Tooltip>

        <Tooltip
          content={getAdditionalTooltip()}
          isVisible={activeTooltip === 'additional'}
        >
          <ScoreItem
            label="Additional Score"
            score={additionalScore}
            maxScore={20}
            tooltipContent={true}
            onEyeClick={() => setActiveTooltip(activeTooltip === 'additional' ? null : 'additional')}
          />
        </Tooltip>
      </div>

      {/* Total Score */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-gray-800">Total Score</span>
          <span className={`text-xs font-bold ${getScoreColor(totalScore, totalMaxScore)}`}>
            {totalScore} / {totalMaxScore}
          </span>
        </div>
        <ProgressBar
          score={totalScore}
          maxScore={totalMaxScore}
          color={parseFloat(totalPercentage) >= 80 ? 'bg-green-500' :
            parseFloat(totalPercentage) >= 60 ? 'bg-blue-500' :
              parseFloat(totalPercentage) >= 40 ? 'bg-yellow-500' : 'bg-red-500'}
        />
        <div className="flex justify-between items-center mt-2 ml-2">
          <span className={`text-xs font-medium ${getScoreColor(totalScore, totalMaxScore)}`}>
            {totalPercentage}%
          </span>
          <span className={`text-xs font-bold ${getScoreColor(totalScore, totalMaxScore)}`}>
            Grade: {scoreGrade}
          </span>
        </div>
      </div>

      {/* Score Breakdown */}
      {/* <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Score Breakdown</h4>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-gray-600">Education:</span>
            <span className={`ml-2 font-medium ${getScoreColor(educationScore, 25)}`}>
              {getScorePercentage(educationScore, 25).toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-gray-600">Experience:</span>
            <span className={`ml-2 font-medium ${getScoreColor(experienceScore, 55)}`}>
              {getScorePercentage(experienceScore, 55).toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-gray-600">Additional:</span>
            <span className={`ml-2 font-medium ${getScoreColor(additionalScore, 20)}`}>
              {getScorePercentage(additionalScore, 20).toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-gray-600">Type:</span>
            <span className="ml-2 font-medium text-blue-600">
              {candidateType === 'fresher' ? 'Fresher' : 'Experienced'}
            </span>
          </div>
        </div>
      </div> */}

      {/* Edit Modal */}
      <EditScoreModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        formData={currentFormData}
        candidateData={candidateData}
        onDataUpdate={handleDataUpdate}
      />
    </div>
  );
};

export default CandidateScoreDisplay;
