import React, { useMemo } from 'react';
import { calculateScores } from '../utils/candidateScoring';

const InlineScoreDisplay = ({ formData, className = "" }) => {
  const scores = useMemo(() => {
    return calculateScores(formData);
  }, [formData]);

  const getScoreColor = (score, maxScore) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-blue-600';
    if (percentage >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const ScoreItem = ({ label, score, maxScore }) => (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-gray-600">{label}:</span>
      <span className={`text-sm font-semibold ${getScoreColor(score, maxScore)}`}>
        {score} / {maxScore}
      </span>
    </div>
  );

  return (
    <div className={`bg-gray-50 rounded-lg p-3 border border-gray-200 ${className}`}>
      <div className="space-y-1">
        <ScoreItem 
          label="Education Score" 
          score={scores.educationScore} 
          maxScore={25} 
        />
        <ScoreItem 
          label="Experience Score" 
          score={scores.experienceScore} 
          maxScore={55} 
        />
        <ScoreItem 
          label="Additional Score" 
          score={scores.additionalScore} 
          maxScore={20} 
        />
        <div className="border-t border-gray-300 pt-1 mt-2">
          <ScoreItem 
            label="Total Score" 
            score={scores.totalScore} 
            maxScore={100} 
          />
        </div>
      </div>
      {scores.candidateType && (
        <div className="mt-2 pt-2 border-t border-gray-300">
          <span className="text-xs text-gray-500">
            Profile Type: <span className="font-medium capitalize">{scores.candidateType}</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default InlineScoreDisplay;
