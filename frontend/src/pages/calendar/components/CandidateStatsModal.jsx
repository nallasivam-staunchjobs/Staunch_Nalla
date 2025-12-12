import React, { useState, useEffect } from 'react';
import { X, Users, TrendingUp, Calendar, Building } from 'lucide-react';
import CandidateTable from './CandidateTable';
import FeedbackModal from '../../NewDtr/components/FeedbackModal';
import { candidates as candidatesAPI } from '../../../api/api';
import toast from 'react-hot-toast';

const CandidateStatsModal = ({
  isOpen,
  onClose,
  statsType,
  eventData,
  candidateIds = [],
  title = "Candidates"
}) => {
  const [employeeNames, setEmployeeNames] = useState({});
  const [totalCount, setTotalCount] = useState(0);
  
  // Feedback modal state
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Map stats type to display information
  const getStatsInfo = (type) => {
    switch (type) {
      case 'callsOnPlan':
        return {
          title: 'Calls on Plan',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          icon: <Users className="w-5 h-5" />
        };
      case 'callsOnOthers':
        return {
          title: 'Calls on Others',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          icon: <TrendingUp className="w-5 h-5" />
        };
      case 'profilesOnPlan':
        return {
          title: 'Profiles on Plan',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          icon: <Calendar className="w-5 h-5" />
        };
      case 'profilesOnOthers':
        return {
          title: 'Profiles on Others',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          icon: <Building className="w-5 h-5" />
        };
      default:
        return {
          title: 'Candidates',
          description: 'Candidate information',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          icon: <Users className="w-5 h-5" />
        };
    }
  };

  const statsInfo = getStatsInfo(statsType);

  // Fetch employee names for display
  const fetchEmployeeNames = async () => {
    try {
      // This would typically come from your employee API
      // For now, using a placeholder
      setEmployeeNames({});
    } catch (error) {
      console.error('Error fetching employee names:', error);
    }
  };

  // Handle data updates from CandidateTable
  const handleDataUpdate = (candidates, count) => {
    setTotalCount(count);
  };

  useEffect(() => {
    if (isOpen) {
      fetchEmployeeNames();
    }
  }, [isOpen]);

  // Handle candidate actions
  const handleCandidateNameClick = (candidate) => {
    setSelectedCandidate(candidate);
    setFeedbackModalOpen(true);
  };

  const handleAssign = (candidate) => {
    // Implement assign candidate logic
  };

  const handleRevenueUpdate = (candidate) => {
    // Implement revenue update logic
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-9999 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className={`${statsInfo.bgColor} px-3 py-2 border-b border-gray-200`}>
          <div className="flex items-center justify-between">

            {/* Left Section: Icon + Title + Event Info */}
            <div className="flex items-center space-x-4">

              {/* Icon */}
              <div className={`${statsInfo.color} flex items-center`}>
                {statsInfo.icon}
              </div>

              {/* Title */}
              <h2 className={`text-xl font-semibold ${statsInfo.color}`}>
                {statsInfo.title}
              </h2>

              {/* Plan / Employee / Client Info */}
              {eventData && (
                <div className="flex items-center space-x-3 text-sm text-gray-700 ml-4">
                  <span><strong>Plan:</strong> {eventData.plan || 'N/A'}</span>
                  <span><strong>Employee:</strong> {eventData.employeeName || 'N/A'}</span>
                  <span><strong>Client:</strong> {eventData.clientName || 'N/A'}</span>
                </div>
              )}
            </div>

            {/* Right Section: Close Button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>



        {/* Modal Body */}
        <div className="p-2 overflow-y-auto max-h-[calc(90vh-200px)]">
          <CandidateTable
            candidateIds={candidateIds}
            employeeNames={employeeNames}
            entriesPerPage={10} // Default entries per page
            onCandidateNameClick={handleCandidateNameClick}
            onAssign={handleAssign}
            // onView removed - CandidateTable now opens in new tab
            onRevenueUpdate={handleRevenueUpdate}
            showActions={true}
            title={`${statsInfo.title}`}
            emptyMessage={`No candidates found for ${statsInfo.title.toLowerCase()}`}
            fetchMode="ids" // Use API to fetch by IDs
            onDataUpdate={handleDataUpdate}
            statsType={statsType} // Pass statsType for new tab context
            eventData={eventData} // Pass eventData for new tab context
            filters={{
              // Add any additional filters based on event data
              ...(eventData?.tb_call_plan_id && { plan_id: eventData.tb_call_plan_id }),
              ...(eventData?.tb_call_emp_id && { employee_id: eventData.tb_call_emp_id }),
              ...(eventData?.tb_call_client_id && { client_id: eventData.tb_call_client_id })
            }}
          />
        </div>


      </div>
      
      {/* Feedback Modal with conditional rendering */}
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
    </div>
  );
};

export default CandidateStatsModal;
