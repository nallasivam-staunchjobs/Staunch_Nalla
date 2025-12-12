import React, { useState, useEffect } from 'react';
import { calculateScores, getScoreGrade, getScoreColor } from '../utils/candidateScoring';
import { ChevronDown, ChevronUp, Award, BookOpen, Briefcase, Plus } from 'lucide-react';

const CandidateScoreCard = ({ formData, showDetails = false, className = "" }) => {
  const [scores, setScores] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (formData) {
      const calculatedScores = calculateScores(formData);
      setScores(calculatedScores);
    }
  }, [formData]);

  if (!scores) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <div className="text-center text-gray-500">
          <div className="animate-pulse">Calculating scores...</div>
        </div>
      </div>
    );
  }

  const getScoreBarColor = (score, maxScore) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const ScoreBar = ({ score, maxScore, label, icon: Icon }) => {
    const percentage = Math.min((score / maxScore) * 100, 100);
    const colorClass = getScoreBarColor(score, maxScore);
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon size={16} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-700">{label}</span>
          </div>
          <span className="text-sm font-semibold text-gray-800">
            {score} / {maxScore}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${colorClass}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  const ScoreDetails = ({ breakdown, title, icon: Icon }) => {
    if (!breakdown.details || breakdown.details.length === 0) return null;

    return (
      <div className="bg-white rounded-lg p-3 border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <Icon size={14} className="text-gray-600" />
          <h4 className="text-sm font-medium text-gray-800">{title}</h4>
        </div>
        <div className="space-y-1">
          {breakdown.details.map((detail, index) => (
            <div key={index} className="flex justify-between items-center text-xs">
              <span className="text-gray-600">{detail.item}</span>
              <span className={`font-medium ${detail.points > 0 ? 'text-green-600' : detail.points < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                {detail.points > 0 ? '+' : ''}{detail.points}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const totalMaxScore = 100; // 25 + 55 + 20
  const grade = getScoreGrade(scores.totalScore, totalMaxScore);
  const gradeColor = getScoreColor(scores.totalScore, totalMaxScore);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award className={`w-6 h-6 ${gradeColor}`} />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Candidate Score</h3>
              
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-800">
              {scores.totalScore} / {totalMaxScore}
            </div>
            <div className={`text-sm font-medium ${gradeColor}`}>
              Grade: {grade}
            </div>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="p-4 space-y-4">
        <ScoreBar
          score={scores.educationScore}
          maxScore={25}
          label="Education Score"
          icon={BookOpen}
        />
        
        <ScoreBar
          score={scores.experienceScore}
          maxScore={55}
          label="Experience Score"
          icon={Briefcase}
        />
        
        <ScoreBar
          score={scores.additionalScore}
          maxScore={20}
          label="Additional Score"
          icon={Plus}
        />

        {/* Total Score Bar */}
        <div className="pt-2 border-t border-gray-200">
          <ScoreBar
            score={scores.totalScore}
            maxScore={totalMaxScore}
            label="Total Score"
            icon={Award}
          />
        </div>

        {/* Details Toggle */}
        {showDetails && (
          <div className="pt-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {isExpanded ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
        )}

        {/* Detailed Breakdown */}
        {showDetails && isExpanded && (
          <div className="space-y-3 pt-3 border-t border-gray-200">
            <ScoreDetails
              breakdown={scores.breakdown.education}
              title="Education Breakdown"
              icon={BookOpen}
            />
            <ScoreDetails
              breakdown={scores.breakdown.experience}
              title="Experience Breakdown"
              icon={Briefcase}
            />
            <ScoreDetails
              breakdown={scores.breakdown.additional}
              title="Additional Breakdown"
              icon={Plus}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidateScoreCard;
