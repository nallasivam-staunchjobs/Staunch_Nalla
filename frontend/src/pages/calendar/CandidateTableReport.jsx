import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Download, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import CandidateTable from './components/CandidateTable';
import FeedbackModal from '../NewDtr/components/FeedbackModal';
import ViewModal from '../NewDtr/components/ViewModal';
import { useAppActions } from '../../context/AppContext';

const CandidateTableReport = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const actions = useAppActions();
  
  // Get URL parameters
  const title = searchParams.get('title') || 'Candidates Report';
  const statsType = searchParams.get('statsType') || '';
  const reportKey = searchParams.get('reportKey');
  
  // State for candidates data
  const [candidatesData, setCandidatesData] = useState([]);
  const [candidateIds, setCandidateIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Feedback modal state
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Load data from sessionStorage
  useEffect(() => {
    if (reportKey) {
      try {
        const storedData = sessionStorage.getItem(reportKey);
        if (storedData) {
          const reportData = JSON.parse(storedData);
          
          // Set the data based on what was stored
          if (reportData.candidates) {
            setCandidatesData(reportData.candidates);
          }
          if (reportData.candidateIds) {
            setCandidateIds(reportData.candidateIds);
          }
          
          setLoading(false);
        } else {
          setError('Report data not found. The session may have expired.');
          setLoading(false);
        }
      } catch (error) {
        setError('Error loading report data.');
        setLoading(false);
      }
    } else {
      setError('Invalid report request.');
      setLoading(false);
    }
  }, [reportKey]);

  // Handle candidate name click
  const handleCandidateNameClick = (candidate) => {
    setSelectedCandidate(candidate);
    setFeedbackModalOpen(true);
  };

  // Get stats type display name
  const getStatsTypeDisplayName = (type) => {
    switch (type) {
      case 'callsOnPlan':
        return 'Calls On Plan';
      case 'callsOnOthers':
        return 'Calls On Others';
      case 'profilesOnPlan':
        return 'Profiles On Plan';
      case 'profilesOnOthers':
        return 'Profiles On Others';
      default:
        return 'Candidates';
    }
  };

  // Handle back navigation
  const handleBack = () => {
    // Clean up sessionStorage
    if (reportKey) {
      sessionStorage.removeItem(reportKey);
    }
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Loading Candidates...</h2>
          <p className="text-gray-600">Please wait while we load the candidate data.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Report</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/events')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-2 py-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
             
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-md font-bold text-gray-900">
                    {title}
                  </h1>
                  <p className="text-xs text-gray-600">
                    {statsType && `${getStatsTypeDisplayName(statsType)} • `}
                    {candidatesData.length || candidateIds.length} candidates
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className=" ">
        <div className="mt-2">
          <CandidateTable
            candidates={candidatesData}
            candidateIds={candidateIds}
            fetchMode={candidatesData.length > 0 ? "direct" : "ids"}
            title={`${getStatsTypeDisplayName(statsType)} - Candidates`}
            entriesPerPage={10} // Show more entries in report view
            showActions={true} // Show actions in report view
            emptyMessage="No candidates found for this report"
            onCandidateNameClick={handleCandidateNameClick}
            onView={(candidate) => {
              // Handle ViewModal display when eye icon is clicked using AppContext
              console.log('View candidate:', candidate);
              actions.setSelectedCandidate(candidate);
              actions.setIsViewModalOpen(true);
            }}
          />
        </div>
      </div>
      
      {/* Feedback Modal */}
      {feedbackModalOpen && selectedCandidate && (
        <FeedbackModal
          isOpen={feedbackModalOpen}
          onClose={() => {
            setFeedbackModalOpen(false);
            setSelectedCandidate(null);
          }}
          candidate={selectedCandidate}
        />
      )}

      {/* ViewModal - Uses AppContext for state management */}
      <ViewModal />
    </div>
  );
};

export default CandidateTableReport;
