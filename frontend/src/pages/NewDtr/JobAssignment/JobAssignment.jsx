import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, User, Briefcase, Building, Phone, Mail, MapPin, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMasterData } from '../../../hooks/useMasterData';
import { clientJobs } from '../../../api/api';
import { masterService } from '../../../api/masterService';
import Loading from '../../../components/Loading';

const JobAssignmentModal = ({ isOpen, onClose, assignmentData }) => {
  const { masterData } = useMasterData();
  const [isLoading, setIsLoading] = useState(false);
  const [positions, setPositions] = useState([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    designation: '',
    remarks: 'Wait for the clearaction',
    nfd: '',
    interviewFixedDate: '',
    expectedJoiningDate: '',
    feedback: ''
  });

  // Auto-calculate NFD (2 days) with weekday logic
  const calculateNfd = () => {
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + 2);

    // Ensure the date falls on a weekday (Mon-Fri)
    const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    if (dayOfWeek === 0) { // Sunday
      targetDate.setDate(targetDate.getDate() + 1); // Move to Monday
    } else if (dayOfWeek === 6) { // Saturday
      targetDate.setDate(targetDate.getDate() + 2); // Move to Monday
    }

    return targetDate.toISOString().split('T')[0];
  };

  // Fetch positions when component mounts
  useEffect(() => {
    const loadPositions = async () => {
      setLoadingPositions(true);
      try {
        const positionsData = await masterService.fetchPositions();
        setPositions(positionsData);
      } catch (error) {
        console.error('Error fetching positions:', error);
        toast.error('Failed to load positions');
      } finally {
        setLoadingPositions(false);
      }
    };

    loadPositions();
  }, []);

  // Pre-fill form with job data when modal opens
  useEffect(() => {
    if (isOpen && assignmentData) {
      const autoNfd = calculateNfd();
      const autoFeedback = `Assigned to ${assignmentData.companyName || 'client'}`;

      setFormData(prev => ({
        ...prev,
        clientName: assignmentData.companyName || '',
        designation: '', // Don't auto-fill - user must select manually
        nfd: autoNfd,
        feedback: autoFeedback
      }));
    }
  }, [isOpen, assignmentData]);

  // For job assignment, always show NFD field
  const getDateFieldsForRemark = () => {
    return { showNextFollowUp: true, showInterviewDate: false, showJoiningDate: false };
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!assignmentData) {
      toast.error('No assignment data available');
      return;
    }

    // Validate required fields
    if (!formData.clientName || formData.clientName.trim() === '') {
      toast.error('Please enter Client Name');
      return;
    }

    if (!formData.designation || formData.designation.trim() === '') {
      toast.error('Please select or enter Designation');
      return;
    }

    setIsLoading(true);
    try {
      // Get current logged-in user's employee code
      const currentUserEmployeeCode = localStorage.getItem('employeeCode') || 'System';
      const currentUserFirstName = localStorage.getItem('firstName') || 'System';

      console.log('👤 Current logged-in user:', { currentUserEmployeeCode, currentUserFirstName });
      
      // Get candidate's executive (account holder)
      const candidateExecutive = assignmentData.executiveName || assignmentData.executive_name;
      
      // Permission check: Only account holder can assign
      if (currentUserEmployeeCode !== candidateExecutive) {
        toast.error(`Only the candidate's account holder (${candidateExecutive}) can assign to new clients.`);
        setIsLoading(false);
        return;
      }

      // 🔄 NEW FLOW: Clone candidate for new client assignment
      // This creates a new candidate record with unique profile_number and candidate_id
      const cloneData = {
        original_candidate_id: assignmentData.candidateId,
        original_client_job_id: assignmentData.clientJobId || null, // Optional - uses first ClientJob if not provided
        new_client_name: formData.clientName,
        new_designation: formData.designation,
        new_executive_name: candidateExecutive, // ✅ Use candidate's executive (account holder), not logged-in user
        remarks: formData.remarks,
        next_follow_up_date: formData.nfd || null,
        feedback: formData.feedback.trim() || `Assigned to ${formData.clientName}`,
        job_id: assignmentData.jobId, // Link to job_openings table
        notes: `Job assignment from job matching system. Assigned by: ${currentUserFirstName} (${currentUserEmployeeCode})`
      };

      console.log('🔄 Cloning candidate for new client assignment:', cloneData);

      // Call the cloning API endpoint
      const cloneResponse = await clientJobs.cloneForClient(cloneData);

      console.log('✅ Clone successful:', cloneResponse);

      toast.success(`Job assignment saved successfully! New profile created: ${cloneResponse.new_candidate.profile_number}`);

      // Open new tab with duplicate-check page using the NEW cloned candidate
      window.open(
        `/duplicate-check?candidateId=${cloneResponse.new_candidate.id}&clientJobId=${cloneResponse.new_client_job.id}`,
        '_blank'
      );

      // Close modal
      onClose();

      // Clear form data to show submission is complete
      setFormData({
        clientName: '',
        designation: '',
        remarks: 'Wait for the clearaction',
        nfd: '',
        interviewFixedDate: '',
        expectedJoiningDate: '',
        feedback: ''
      });

    } catch (error) {
      console.error('❌ Error cloning candidate for job assignment:', error);

      // Show detailed error message
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save job assignment';
      toast.error(`Failed to save job assignment: ${errorMessage}`);

      // Log full error for debugging
      console.error('Full error details:', error.response?.data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    const confirmed = window.confirm('Are you sure you want to cancel? All unsaved changes will be lost.');
    if (confirmed) {
      onClose();
    }
  };

  if (!isOpen || !assignmentData) {
    return null;
  }

  // Show loading state while fetching positions on initial load
  if (loadingPositions && positions.length === 0) {
    return null;
  }

  const { showNextFollowUp, showInterviewDate, showJoiningDate } = getDateFieldsForRemark(formData.remarks);

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-white shadow-sm  rounded-t-lg">
          <div className="px-4 py-2 ">
            <div className="flex items-center justify-between">
              <div>

                <h1 className="text-md text-gray-900">Assign job to {assignmentData.candidateName}</h1>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleCancel}
                  className="px-2 py-2  text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="px-2 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>{isLoading ? 'Assigning...' : 'Assign '}</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-3 py-1.5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column - Candidate & Job Info */}
            <div className="space-y-1.5">
              {/* Candidate Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-sm p-3"
              >
                <div className="flex items-center space-x-3 mb-1">
                  <User className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-medium text-gray-900">Candidate Information</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <p className="text-sm text-gray-900 mt-1">{assignmentData.candidateName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-sm text-gray-900 mt-1 flex items-center">
                      <Mail className="h-4 w-4 mr-1 text-gray-400" />
                      {assignmentData.candidateEmail || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-sm text-gray-900 mt-1 flex items-center">
                      <Phone className="h-4 w-4 mr-1 text-gray-400" />
                      {assignmentData.candidatePhone || 'N/A'}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Job Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-lg shadow-sm p-3"
              >
                <div className="flex items-center space-x-1.5 mb-2">
                  <Briefcase className="h-5 w-5 text-green-600" />
                  <h2 className="text-lg font-medium text-gray-900">Job Information</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Job Title</label>
                    <p className="text-sm text-gray-900 mt-1">{assignmentData.jobTitle}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Company</label>
                    <p className="text-sm text-gray-900 mt-1 flex items-center">
                      <Building className="h-4 w-4 mr-1 text-gray-400" />
                      {assignmentData.companyName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Designation</label>
                    <p className="text-sm text-gray-900 mt-1">{assignmentData.designation}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">CTC</label>
                    <p className="text-sm text-gray-900 mt-1 flex items-center">
                      <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                      {assignmentData.ctc}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Experience Required</label>
                    <p className="text-sm text-gray-900 mt-1">{assignmentData.experience}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Location</label>
                    <p className="text-sm text-gray-900 mt-1 flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                      {assignmentData.location}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Contact Person</label>
                    <p className="text-sm text-gray-900 mt-1">{assignmentData.contactPerson}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Contact Number</label>
                    <p className="text-sm text-gray-900 mt-1">{assignmentData.contactNumber}</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right Column - Assignment Form */}
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-lg shadow-sm  p-3"
              >
                <h2 className="text-lg font-medium text-gray-900 mb-6">Assignment Details</h2>

                <div className="space-y-2">
                  <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
                    {/* Client Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                      <input
                        type="text"
                        value={formData.clientName}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                        placeholder="Client name"
                      />
                    </div>

                    {/* Designation */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Designation <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.designation}
                        onChange={(e) => handleChange('designation', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        required
                        disabled={loadingPositions}
                      >
                        <option value="">Select Designation</option>
                        {positions
                          .filter(pos => pos.status === 'Active')
                          .map((position) => (
                            <option key={position.id} value={position.name}>
                              {position.name}
                            </option>
                          ))}
                      </select>
                      {loadingPositions && (
                        <p className="mt-1 text-xs text-gray-500">Loading designations...</p>
                      )}
                    </div>

                    {/* Remarks */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                      <input
                        type="text"
                        value={formData.remarks}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                        readOnly
                      />
                    </div>

                    {/* Dynamic Date Fields */}
                    {showNextFollowUp && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Next Follow-up Date</label>
                        <input
                          type="date"
                          value={formData.nfd}
                          onChange={(e) => handleChange('nfd', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}

                    {showInterviewDate && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Interview Date</label>
                        <input
                          type="date"
                          value={formData.interviewFixedDate}
                          onChange={(e) => handleChange('interviewFixedDate', e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}

                    {showJoiningDate && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expected Joining Date</label>
                        <input
                          type="date"
                          value={formData.expectedJoiningDate}
                          onChange={(e) => handleChange('expectedJoiningDate', e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Feedback */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Feedback</label>
                    <textarea
                      value={formData.feedback}
                      onChange={(e) => handleChange('feedback', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter feedback..."
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobAssignmentModal;
