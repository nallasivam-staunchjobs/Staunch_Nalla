// Candidate Scoring Configuration and Utilities
// Updated to match exact database schema from FormStep3.jsx

// Scoring Configuration
export const scoringConfig = {
  // Education scoring weights and criteria (25 points max)
  education: {
    maxScore: 25,
    weights: {
      // Education type scoring - Updated to match database values
      type: {
        'phd': 25,
        'pg': 22,           // Post Graduate
        'masters': 20,
        'ug': 16,           // Under Graduate (Bachelor's)
        'bachelors': 16,    // Alternative name for UG
        'diploma': 12,
        '12th': 8,          // 12th standard
        'hsc': 8,           // Higher Secondary Certificate
        '10th': 6,          // 10th standard
        'ssc': 6,           // Secondary School Certificate
        'certificate': 8,
        'high_school': 6,
        'other': 4
      },
      // Certificate bonus
      hasCertificate: 4,
      // Reason for no certificate (deduction)
      reasonDeduction: {
        'lost': -2,
        'not_received': -1,
        'not_applicable': 0
      }
    }
  },

  // Experience scoring weights and criteria (55 points max)
  experience: {
    maxScore: 55,
    weights: {
      // Document verification (25 points max)
      documents: {
        offerLetter: 7,
        payslip: 8,
        relievingLetter: 10
      },
      // Salary progression (12 points max)
      salary: {
        maxScore: 12,
        // Points based on salary growth
        firstToCurrentRatio: {
          excellent: 12, // >50% growth
          good: 8,       // 20-50% growth
          average: 4,    // 0-20% growth
          poor: 0        // negative growth
        }
      },
      // Incentives (8 points max)
      incentives: {
        hasIncentives: 4,
        hasIncentiveProof: 2,
        moreThan15Months: 2
      },
      // Previous companies (10 points max, capped at 3 companies)
      previousCompanies: {
        maxScore: 10,
        perCompany: 2,
        maxCompanies: 3,
        documentBonus: {
          offerLetter: 1,
          payslip: 1,
          relievingLetter: 2
        }
      }
    }
  },

  // Additional information scoring (20 points max)
  additional: {
    maxScore: 20,
    weights: {
      // Transportation (10 points)
      twoWheeler: {
        hasTwoWheeler: 5,
        hasTwoWheelerLicense: 5
      },
      // Equipment (10 points)
      laptop: {
        hasLaptop: 10
      }
    }
  },

  // Overall scoring thresholds
  grading: {
    'A+': { min: 90, max: 100 },
    'A': { min: 80, max: 89 },
    'B+': { min: 70, max: 79 },
    'B': { min: 60, max: 69 },
    'C+': { min: 50, max: 59 },
    'C': { min: 40, max: 49 },
    'D': { min: 30, max: 39 },
    'F': { min: 0, max: 29 }
  }
};

// Calculate Education Score
export const calculateEducationScore = (educationData) => {
  if (!educationData || !Array.isArray(educationData) || educationData.length === 0) return 0;

  let score = 0;
  
  // Filter out invalid education entries before using reduce
  const validEducationData = educationData.filter(edu => 
    edu && typeof edu === 'object' && edu.type
  );
  
  if (validEducationData.length === 0) return 0;
  
  // Take the highest education entry
  const highestEducation = validEducationData.reduce((prev, current) => {
    const prevScore = scoringConfig.education.weights.type[prev.type?.toLowerCase()] || 0;
    const currentScore = scoringConfig.education.weights.type[current.type?.toLowerCase()] || 0;
    return currentScore > prevScore ? current : prev;
  });

  // Base education score
  const typeScore = scoringConfig.education.weights.type[highestEducation.type?.toLowerCase()] || 0;
  score += typeScore;

  // Certificate bonus
  if (highestEducation.has_certificate) {
    score += scoringConfig.education.weights.hasCertificate;
  } else if (highestEducation.reason) {
    // Deduction for missing certificate
    const deduction = scoringConfig.education.weights.reasonDeduction[highestEducation.reason.toLowerCase()] || 0;
    score += deduction;
  }

  return Math.min(score, scoringConfig.education.maxScore);
};

// Calculate Experience Score
export const calculateExperienceScore = (experienceData, previousCompaniesData) => {
  if (!experienceData || !Array.isArray(experienceData) || experienceData.length === 0) return 0;

  let score = 0;
  const experience = experienceData[0]; // Take first experience entry

  // Document verification score
  if (experience.offer_letter) score += scoringConfig.experience.weights.documents.offerLetter;
  if (experience.payslip) score += scoringConfig.experience.weights.documents.payslip;
  if (experience.relieving_letter) score += scoringConfig.experience.weights.documents.relievingLetter;

  // Salary progression score
  if (experience.first_salary && experience.current_salary) {
    const firstSalary = parseFloat(experience.first_salary) || 0;
    const currentSalary = parseFloat(experience.current_salary) || 0;
    
    if (firstSalary > 0) {
      const growthRatio = ((currentSalary - firstSalary) / firstSalary) * 100;
      
      if (growthRatio > 50) {
        score += scoringConfig.experience.weights.salary.firstToCurrentRatio.excellent;
      } else if (growthRatio > 20) {
        score += scoringConfig.experience.weights.salary.firstToCurrentRatio.good;
      } else if (growthRatio >= 0) {
        score += scoringConfig.experience.weights.salary.firstToCurrentRatio.average;
      } else {
        score += scoringConfig.experience.weights.salary.firstToCurrentRatio.poor;
      }
    }
  }

  // Incentives score
  if (experience.incentives) {
    score += scoringConfig.experience.weights.incentives.hasIncentives;
    
    if (experience.incentive_proof) {
      score += scoringConfig.experience.weights.incentives.hasIncentiveProof;
    }
  }
  
  if (experience.more_than_15_months) {
    score += scoringConfig.experience.weights.incentives.moreThan15Months;
  }

  // Previous companies score (capped at 2 companies)
  if (previousCompaniesData && Array.isArray(previousCompaniesData)) {
    const maxCompanies = scoringConfig.experience.weights.previousCompanies.maxCompanies;
    const companiesCount = Math.min(previousCompaniesData.length, maxCompanies);
    
    // Base score for having previous companies
    score += companiesCount * scoringConfig.experience.weights.previousCompanies.perCompany;
    
    // Document bonus for previous companies
    previousCompaniesData.slice(0, maxCompanies).forEach(company => {
      if (company.offer_letter) score += scoringConfig.experience.weights.previousCompanies.documentBonus.offerLetter;
      if (company.payslip) score += scoringConfig.experience.weights.previousCompanies.documentBonus.payslip;
      if (company.relieving_letter) score += scoringConfig.experience.weights.previousCompanies.documentBonus.relievingLetter;
    });
  }

  return Math.min(score, scoringConfig.experience.maxScore);
};

// Calculate Additional Score
export const calculateAdditionalScore = (additionalData) => {
  if (!additionalData || !Array.isArray(additionalData) || additionalData.length === 0) return 0;

  let score = 0;
  const additional = additionalData[0]; // Take first additional info entry

  // Two wheeler score
  if (additional.has_two_wheeler) {
    score += scoringConfig.additional.weights.twoWheeler.hasTwoWheeler;
  }
  
  if (additional.two_wheeler_license) {
    score += scoringConfig.additional.weights.twoWheeler.hasTwoWheelerLicense;
  }

  // Laptop score
  if (additional.has_laptop) {
    score += scoringConfig.additional.weights.laptop.hasLaptop;
  }

  return Math.min(score, scoringConfig.additional.maxScore);
};

// Determine candidate type based on comprehensive experience analysis
export const determineCandidateType = (experienceData, previousCompaniesData) => {
  if (!experienceData || !Array.isArray(experienceData) || experienceData.length === 0) {
    return 'fresher';
  }

  const experience = experienceData[0];
  
  // Multiple criteria to determine if candidate is experienced
  const hasWorkExperience = experience.more_than_15_months;
  const hasSalaryProgression = experience.first_salary && experience.current_salary && 
                              parseFloat(experience.current_salary) > parseFloat(experience.first_salary);
  const hasWorkDocuments = experience.offer_letter || experience.payslip || experience.relieving_letter;
  const hasPreviousCompanies = previousCompaniesData && previousCompaniesData.length > 0;
  const hasIncentives = experience.incentives;
  
  // Consider experienced if they meet multiple criteria
  const experienceIndicators = [
    hasWorkExperience,
    hasSalaryProgression,
    hasWorkDocuments,
    hasPreviousCompanies,
    hasIncentives
  ].filter(Boolean).length;
  
  // If 2 or more indicators suggest experience, classify as experienced
  return experienceIndicators >= 2 ? 'experienced' : 'fresher';
};

// Enhanced scoring function that automatically applies fresher vs experienced rules
export const calculateScores = (formData) => {
  if (!formData) {
    return {
      educationScore: 0,
      experienceScore: 0,
      additionalScore: 0,
      totalScore: 0,
      candidateType: 'fresher',
      breakdown: {
        education: { score: 0, maxScore: 25, details: [] },
        experience: { score: 0, maxScore: 55, details: [] },
        additional: { score: 0, maxScore: 20, details: [] }
      }
    };
  }

  // Extract data from form structure
  const educationData = formData.education || [];
  const experienceData = formData.experience || [];
  const previousCompaniesData = formData.previousCompanies || [];
  const additionalData = formData.additional || [];

  // Determine candidate type automatically using experience and previous companies data
  const candidateType = determineCandidateType(experienceData, previousCompaniesData);

  // Calculate individual scores with detailed breakdown
  const educationResult = calculateEducationScoreDetailed(educationData);
  const experienceResult = calculateExperienceScoreDetailed(experienceData, previousCompaniesData);
  const additionalResult = calculateAdditionalScoreDetailed(additionalData);

  // Apply fresher vs experienced rules
  let finalEducationScore = educationResult.score;
  let finalExperienceScore = experienceResult.score;
  let finalAdditionalScore = additionalResult.score;

  if (candidateType === 'fresher') {
    // For freshers, give more weight to education and additional skills
    finalEducationScore = Math.min(finalEducationScore * 1.1, scoringConfig.education.maxScore);
    finalAdditionalScore = Math.min(finalAdditionalScore * 1.2, scoringConfig.additional.maxScore);
  } else {
    // For experienced candidates, give more weight to experience
    finalExperienceScore = Math.min(finalExperienceScore * 1.1, scoringConfig.experience.maxScore);
  }

  const totalScore = finalEducationScore + finalExperienceScore + finalAdditionalScore;

  return {
    educationScore: Math.round(finalEducationScore),
    experienceScore: Math.round(finalExperienceScore),
    additionalScore: Math.round(finalAdditionalScore),
    totalScore: Math.round(totalScore),
    candidateType,
    breakdown: {
      education: { 
        score: Math.round(finalEducationScore), 
        maxScore: scoringConfig.education.maxScore, 
        details: educationResult.details 
      },
      experience: { 
        score: Math.round(finalExperienceScore), 
        maxScore: scoringConfig.experience.maxScore, 
        details: experienceResult.details 
      },
      additional: { 
        score: Math.round(finalAdditionalScore), 
        maxScore: scoringConfig.additional.maxScore, 
        details: additionalResult.details 
      }
    }
  };
};

// Unified education scoring - Single score for job requirement assessment
const calculateEducationScoreDetailed = (educationData) => {
  const details = [];
  let score = 0;

  if (!educationData || !Array.isArray(educationData) || educationData.length === 0) {
    details.push({ item: 'No education qualification found', points: 0 });
    return { score: 0, details };
  }

  // Filter out invalid education entries
  const validEducationData = educationData.filter(edu => 
    edu && typeof edu === 'object' && edu.type
  );

  if (validEducationData.length === 0) {
    details.push({ item: 'No valid education qualification found', points: 0 });
    return { score: 0, details };
  }

  // Calculate combined education score based on all qualifications
  let totalEducationValue = 0;
  let certificateBonus = 0;

  validEducationData.forEach(education => {
    const typeScore = scoringConfig.education.weights.type[education.type?.toLowerCase()] || 0;
    if (typeScore > 0) {
      totalEducationValue = Math.max(totalEducationValue, typeScore); // Take highest qualification
      
      // Certificate bonus for any qualification that has certificate
      if (education.has_certificate) {
        certificateBonus = Math.max(certificateBonus, scoringConfig.education.weights.hasCertificate);
      }
    }
  });

  // Final unified education score
  score = totalEducationValue + certificateBonus;

  // Single education assessment for job requirement team
  if (totalEducationValue >= 16) {
    details.push({ item: 'Graduate level qualification', points: totalEducationValue });
  } else if (totalEducationValue >= 8) {
    details.push({ item: 'Higher secondary qualification', points: totalEducationValue });
  } else if (totalEducationValue >= 6) {
    details.push({ item: 'Secondary qualification', points: totalEducationValue });
  } else {
    details.push({ item: 'Basic qualification', points: totalEducationValue });
  }

  if (certificateBonus > 0) {
    details.push({ item: 'Certificate verification bonus', points: certificateBonus });
  }

  return { score: Math.min(score, scoringConfig.education.maxScore), details };
};

// Detailed experience scoring with breakdown
const calculateExperienceScoreDetailed = (experienceData, previousCompaniesData) => {
  const details = [];
  let score = 0;

  if (!experienceData || !Array.isArray(experienceData) || experienceData.length === 0) {
    details.push({ item: 'No experience data', points: 0 });
    return { score: 0, details };
  }

  const experience = experienceData[0];

  // Document verification score
  if (experience.offer_letter) {
    const points = scoringConfig.experience.weights.documents.offerLetter;
    score += points;
    details.push({ item: 'Offer letter verified', points });
  }
  if (experience.payslip) {
    const points = scoringConfig.experience.weights.documents.payslip;
    score += points;
    details.push({ item: 'Payslip verified', points });
  }
  if (experience.relieving_letter) {
    const points = scoringConfig.experience.weights.documents.relievingLetter;
    score += points;
    details.push({ item: 'Relieving letter verified', points });
  }

  // Salary progression score
  if (experience.first_salary && experience.current_salary) {
    const firstSalary = parseFloat(experience.first_salary) || 0;
    const currentSalary = parseFloat(experience.current_salary) || 0;
    
    if (firstSalary > 0) {
      const growthRatio = ((currentSalary - firstSalary) / firstSalary) * 100;
      let points = 0;
      let description = '';
      
      if (growthRatio > 50) {
        points = scoringConfig.experience.weights.salary.firstToCurrentRatio.excellent;
        description = `Excellent salary growth (${growthRatio.toFixed(1)}%)`;
      } else if (growthRatio > 20) {
        points = scoringConfig.experience.weights.salary.firstToCurrentRatio.good;
        description = `Good salary growth (${growthRatio.toFixed(1)}%)`;
      } else if (growthRatio >= 0) {
        points = scoringConfig.experience.weights.salary.firstToCurrentRatio.average;
        description = `Average salary growth (${growthRatio.toFixed(1)}%)`;
      } else {
        points = scoringConfig.experience.weights.salary.firstToCurrentRatio.poor;
        description = `Negative salary growth (${growthRatio.toFixed(1)}%)`;
      }
      
      score += points;
      details.push({ item: description, points });
    }
  }

  // Incentives score
  if (experience.incentives) {
    const points = scoringConfig.experience.weights.incentives.hasIncentives;
    score += points;
    details.push({ item: 'Has incentives', points });
    
    if (experience.incentive_proof) {
      const proofPoints = scoringConfig.experience.weights.incentives.hasIncentiveProof;
      score += proofPoints;
      details.push({ item: 'Incentive proof provided', points: proofPoints });
    }
  }
  
  if (experience.more_than_15_months) {
    const points = scoringConfig.experience.weights.incentives.moreThan15Months;
    score += points;
    details.push({ item: 'Experience > 15 months', points });
  }

  // Previous companies score
  if (previousCompaniesData && Array.isArray(previousCompaniesData)) {
    const maxCompanies = scoringConfig.experience.weights.previousCompanies.maxCompanies;
    const companiesCount = Math.min(previousCompaniesData.length, maxCompanies);
    
    if (companiesCount > 0) {
      const basePoints = companiesCount * scoringConfig.experience.weights.previousCompanies.perCompany;
      score += basePoints;
      details.push({ item: `${companiesCount} previous companies`, points: basePoints });
      
      // Document bonus for previous companies
      previousCompaniesData.slice(0, maxCompanies).forEach((company, index) => {
        if (company.offer_letter) {
          const points = scoringConfig.experience.weights.previousCompanies.documentBonus.offerLetter;
          score += points;
          details.push({ item: `Previous company ${index + 1} - offer letter`, points });
        }
        if (company.payslip) {
          const points = scoringConfig.experience.weights.previousCompanies.documentBonus.payslip;
          score += points;
          details.push({ item: `Previous company ${index + 1} - payslip`, points });
        }
        if (company.relieving_letter) {
          const points = scoringConfig.experience.weights.previousCompanies.documentBonus.relievingLetter;
          score += points;
          details.push({ item: `Previous company ${index + 1} - relieving letter`, points });
        }
      });
    }
  }

  return { score: Math.min(score, scoringConfig.experience.maxScore), details };
};

// Detailed additional scoring with breakdown
const calculateAdditionalScoreDetailed = (additionalData) => {
  const details = [];
  let score = 0;

  if (!additionalData || !Array.isArray(additionalData) || additionalData.length === 0) {
    details.push({ item: 'No additional data', points: 0 });
    return { score: 0, details };
  }

  const additional = additionalData[0];

  // Two wheeler score
  if (additional.has_two_wheeler) {
    const points = scoringConfig.additional.weights.twoWheeler.hasTwoWheeler;
    score += points;
    details.push({ item: 'Has two wheeler', points });
  }
  
  if (additional.two_wheeler_license) {
    const points = scoringConfig.additional.weights.twoWheeler.hasTwoWheelerLicense;
    score += points;
    details.push({ item: 'Has two wheeler license', points });
  }

  // Laptop score
  if (additional.has_laptop) {
    const points = scoringConfig.additional.weights.laptop.hasLaptop;
    score += points;
    details.push({ item: 'Has laptop', points });
  }

  return { score: Math.min(score, scoringConfig.additional.maxScore), details };
};

// Get score grade based on percentage
export const getScoreGrade = (score, maxScore) => {
  // Safety checks to prevent NaN
  if (!score && score !== 0) score = 0;
  if (!maxScore || maxScore <= 0) maxScore = 100;
  
  const percentage = (score / maxScore) * 100;
  
  // Additional NaN check
  if (isNaN(percentage)) return 'F';
  
  for (const [grade, range] of Object.entries(scoringConfig.grading)) {
    if (percentage >= range.min && percentage <= range.max) {
      return grade;
    }
  }
  
  return 'F';
};

// Get color class for score display
export const getScoreColor = (score, maxScore) => {
  // Safety checks to prevent NaN
  if (!score && score !== 0) score = 0;
  if (!maxScore || maxScore <= 0) maxScore = 100;
  
  const percentage = (score / maxScore) * 100;
  
  // Additional NaN check
  if (isNaN(percentage)) return 'text-red-600';
  
  if (percentage >= 80) return 'text-green-600';
  if (percentage >= 60) return 'text-blue-600';
  if (percentage >= 40) return 'text-yellow-600';
  return 'text-red-600';
};

// Get percentage with safety checks
export const getScorePercentage = (score, maxScore) => {
  if (!score && score !== 0) score = 0;
  if (!maxScore || maxScore <= 0) maxScore = 100;
  
  const percentage = (score / maxScore) * 100;
  return isNaN(percentage) ? 0 : percentage;
};
