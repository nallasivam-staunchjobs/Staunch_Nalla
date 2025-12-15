import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Briefcase, Calendar, MapPin, Save, Mail, Phone, Building, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { employeeAPI } from '../../../api/api';
import assignmentService from '../services/assignmentService';
import { getDisplayExecutiveName, fetchEmployeeNames } from '../utils';
import Loading from '../../../components/Loading';

// Utility functions now imported from shared utils

const AssignModal = ({ isOpen, onClose, candidate, onAssignmentSuccess }) => {
    const [assignmentData, setAssignmentData] = useState({
        assignedTo: '',
        assignmentDate: new Date().toISOString().split('T')[0],
        priority: 'medium',
        notes: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [employeeNames, setEmployeeNames] = useState({});
    const [availableEmployees, setAvailableEmployees] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

    // Using shared fetchEmployeeNames utility

    // Fetch available employees for assignment dropdown
    const fetchAvailableEmployees = async () => {
        setIsLoadingEmployees(true);
        try {
            const employees = await assignmentService.getAvailableEmployees();
            setAvailableEmployees(employees);
            console.log('✅ Loaded employees for assignment:', employees.length);
        } catch (error) {
            console.error('❌ Failed to load employees:', error);
            toast.error('Failed to load employees for assignment');
        } finally {
            setIsLoadingEmployees(false);
        }
    };

    // Get actual logged-in user (not candidate's executive)
    const setCurrentLoggedInUser = async () => {
        try {
            const userInfo = await assignmentService.getCurrentUserInfo();
            setCurrentUser({
                employeeCode: userInfo.employeeCode,
                firstName: userInfo.firstName,
                userRole: userInfo.userRole
            });
            const isCEO = userInfo.userRole && (userInfo.userRole.toLowerCase() === 'ceo' || userInfo.userRole === 'L5');

            if (!isCEO && userInfo.employeeCode) {
                setAssignmentData(prev => ({
                    ...prev,
                    assignedTo: prev.assignedTo || userInfo.employeeCode
                }));
            }

            console.log(' Current logged-in user set:', userInfo);
        } catch (error) {
            console.error(' Failed to get current user info:', error);
            // Fallback - but this should be the actual logged-in user, not candidate's executive
            setCurrentUser({
                employeeCode: 'UNKNOWN',
                firstName: 'Current User'
            });
        }
    };

    // Fetch employee name when modal opens or candidate changes
    useEffect(() => {
        const fetchNames = async () => {
            if (isOpen && candidate) {
                const employeeCodesToFetch = [];
                
                // Add original executive code
                const originalExecutiveCode = candidate.executive_name || candidate.executiveName;
                if (originalExecutiveCode && originalExecutiveCode !== 'Loggers' && !employeeNames[originalExecutiveCode]) {
                    employeeCodesToFetch.push(originalExecutiveCode);
                }
                
                // Add current assigned executive code (assignment-aware)
                const currentExecutiveCode = getDisplayExecutiveName(candidate, candidate.selectedClientJob);
                if (currentExecutiveCode && currentExecutiveCode !== 'Loggers' && currentExecutiveCode !== 'N/A' && !employeeNames[currentExecutiveCode]) {
                    employeeCodesToFetch.push(currentExecutiveCode);
                }
                
                // Fetch names for all unique codes using shared utility
                if (employeeCodesToFetch.length > 0) {
                    const uniqueCodes = [...new Set(employeeCodesToFetch)];
                    const namesMap = await fetchEmployeeNames(uniqueCodes);
                    setEmployeeNames(prev => ({ ...prev, ...namesMap }));
                }
            }
        };
        
        fetchNames();
    }, [isOpen, candidate, employeeNames]);

    // Fetch employees and set current logged-in user when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchAvailableEmployees();
            setCurrentLoggedInUser();
        }
    }, [isOpen]);

    const handleSave = async () => {
        if (!assignmentData.assignedTo) {
            toast.error('Please select a team member to assign to');
            return;
        }

        if (!currentUser?.employeeCode) {
            toast.error('Unable to determine current user for assignment');
            return;
        }

        if (!candidate?.selectedClientJob?.id) {
            toast.error('No client job selected for assignment');
            return;
        }

        setIsLoading(true);

        try {
            // Get assigned employee details
            const assignedEmployee = availableEmployees.find(emp => emp.employeeCode === assignmentData.assignedTo);
            const currentLoggedInUserName = currentUser.firstName || currentUser.employeeCode;
            const assignedEmployeeName = assignedEmployee ? assignedEmployee.firstName : (employeeNames[assignmentData.assignedTo] || assignmentData.assignedTo);
            
            // Get candidate's CURRENT assigned executive for display (not original executive)
            const candidateExecutiveCode = getDisplayExecutiveName(candidate, candidate.selectedClientJob);
            
            // Always fetch fresh executive name for assignment feedback (don't rely on cache)
            let candidateExecutiveName = candidateExecutiveCode;
            try {
                const freshExecutiveInfo = await employeeAPI.getEmployeeInfo(candidateExecutiveCode);
                if (freshExecutiveInfo && freshExecutiveInfo.firstName) {
                    candidateExecutiveName = freshExecutiveInfo.firstName;
                    // Update cache with fresh data
                    setEmployeeNames(prev => ({
                        ...prev,
                        [candidateExecutiveCode]: freshExecutiveInfo.firstName
                    }));
                }
            } catch (error) {
                console.error('Error fetching fresh executive name:', error);
                // Fallback to cached name if API fails
                candidateExecutiveName = employeeNames[candidateExecutiveCode] || candidateExecutiveCode;
            }

            // Generate assignment feedback with both auto-generated and custom text
            const autoGeneratedFeedback = `Profile assigned from ${candidateExecutiveName}(${candidateExecutiveCode}) to ${assignedEmployeeName}(${assignmentData.assignedTo})`;
            
            let assignmentFeedback;
            if (assignmentData.notes && assignmentData.notes.trim()) {
                // Combine auto-generated feedback with user's custom feedback
                assignmentFeedback = `${autoGeneratedFeedback}. ${assignmentData.notes.trim()}`;
            } else {
                // Use only auto-generated feedback if no custom text
                assignmentFeedback = autoGeneratedFeedback;
            }

            // Generate NFD (Next Follow-up Date) - 1 day with weekday handling using Indian timezone
            const generateAssignmentNfd = () => {
                // Get current date in Indian timezone (IST)
                const now = new Date();
                const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
                const istTime = new Date(now.getTime() + istOffset);
                
                // Use IST date for calculation
                const today = new Date(istTime.getFullYear(), istTime.getMonth(), istTime.getDate());
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + 1); // Add 1 day for assignment follow-up
                
                // Ensure the date falls on a weekday (Mon-Fri) - same logic as FormStep2
                const getNextWeekday = (date) => {
                    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
                    
                    if (dayOfWeek === 0) { // Sunday
                        date.setDate(date.getDate() + 1); // Move to Monday
                    } else if (dayOfWeek === 6) { // Saturday
                        date.setDate(date.getDate() + 2); // Move to Monday
                    }
                    
                    return date;
                };
                
                const weekdayDate = getNextWeekday(targetDate);
                
                // Format as YYYY-MM-DD using IST date
                const year = weekdayDate.getFullYear();
                const month = String(weekdayDate.getMonth() + 1).padStart(2, '0');
                const day = String(weekdayDate.getDate()).padStart(2, '0');
                
                return `${year}-${month}-${day}`;
            };
            
            const nfdDate = generateAssignmentNfd();

            const assignmentPayload = {
                assign_to_code: assignmentData.assignedTo,
                assign_by_code: currentUser.employeeCode,  // Currently logged-in user making the assignment
                entry_by: currentLoggedInUserName,         // Currently logged-in user's name
                feedback_text: assignmentFeedback,
                nfd_date: nfdDate,  // NEW NFD based on today's date
                ejd_date: '',       // Clear EJD on assignment
                ifd_date: '',       // Clear IFD on assignment
                remarks: 'Profile Assigned'  // Store descriptive text in remarks
            };

            console.log('🚀 Assigning candidate with payload:', assignmentPayload);

            const result = await assignmentService.assignCandidate(
                candidate.selectedClientJob.id,
                assignmentPayload
            );

            console.log('✅ Assignment successful:', result);
            toast.success(`Successfully assigned to ${assignedEmployeeName}. NFD updated to tomorrow.`);
            
            onClose();
            
            // Call the success callback to refresh data (if provided)
            if (onAssignmentSuccess) {
                onAssignmentSuccess(result);
            } else {
                // Fallback to page reload if no callback provided
                window.location.reload();
            }
            
        } catch (error) {
            console.error('❌ Assignment failed:', error);
            toast.error(error.message || 'Failed to assign candidate');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        resetForm();
        onClose();
    };

    const resetForm = () => {
        setAssignmentData({
            assignedTo: '',
            assignmentDate: new Date().toISOString().split('T')[0],
            priority: 'medium',
            notes: ''
        });
    };

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            resetForm();
        }
    }, [isOpen]);

    const handleInputChange = (field, value) => {
        setAssignmentData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    if (!isOpen || !candidate) {
        return null;
    }

    // Show loading state while fetching employees
    if (isLoadingEmployees) {
        return null;
    }

    const isCEO = currentUser?.userRole && (currentUser.userRole.toLowerCase() === 'ceo' || currentUser.userRole === 'L5');

    const employeesForDropdown = !isCEO && currentUser?.employeeCode
        ? availableEmployees.filter(employee =>
            employee.employeeCode === currentUser.employeeCode ||
            employee.value === currentUser.employeeCode
        )
        : availableEmployees;

    return (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-2">
            <div className="bg-gray-50 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="px-2 py-2 text-black border-b border-gray-200">
                    <div className="flex items-center ml-2 justify-between">
                        <div>
                            <h2 className="text-lg font-bold">Candidate Assign</h2>
                            <p className="text-sm text-gray-600">
                                Assign {candidate?.candidateName} 
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                resetForm();
                                onClose();
                            }}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            title="Close"
                        >
                            <X className="h-5 w-5 text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="px-3 py-1.5">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                        {/* Left Column - Candidate & Job Info */}
                        <div className="space-y-1.5">
                            {/* Candidate Information */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-lg shadow-sm p-2"
                            >
                                <div className="flex items-center space-x-3 mb-1">
                                    <User className="h-5 w-5 text-blue-600" />
                                    <h2 className="text-lg font-medium text-gray-900">Candidate Information</h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Name</label>
                                        <p className="text-sm text-gray-900 mt-1">{candidate.candidateName}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Email</label>
                                        <p className="text-sm text-gray-900 mt-1 flex items-center">
                                            <Mail className="h-4 w-4 mr-1 text-gray-400" />
                                            {candidate.email || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Phone</label>
                                        <p className="text-sm text-gray-900 mt-1 flex items-center">
                                            <Phone className="h-4 w-4 mr-1 text-gray-400" />
                                            {candidate.contactNumber1 || candidate.phone || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Remarks</label>
                                        <div className="mt-1">
                                            {(() => {
                                                // Get latest remarks from client job feedback
                                                const clientJob = candidate.selectedClientJob;
                                                let latestRemarks = 'N/A';

                                                if (clientJob?.feedback) {
                                                    const rawFeedback = clientJob.feedback;
                                                    const feedbackEntries = rawFeedback.split(';;;;;')
                                                        .filter(entry => entry.trim())
                                                        .map(entry => {
                                                            const parsed = {};
                                                            const remarksMatch = entry.match(/Remarks-([^:]+)/);
                                                            parsed.remarks = remarksMatch ? remarksMatch[1].trim() : '';

                                                            const entryTimeMatch = entry.match(/Entry Time([^;]+)/);
                                                            let entryTimeStr = entryTimeMatch ? entryTimeMatch[1].trim() : '';

                                                            if (entryTimeStr) {
                                                                const timeMatch = entryTimeStr.match(/(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
                                                                if (timeMatch) {
                                                                    const [, day, month, year, hour, minute, second] = timeMatch;
                                                                    entryTimeStr = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
                                                                }
                                                            }

                                                            parsed.entry_time = entryTimeStr;
                                                            return parsed;
                                                        });

                                                    if (feedbackEntries.length > 0) {
                                                        const sortedFeedback = feedbackEntries.sort((a, b) => {
                                                            const timeA = new Date(a.entry_time || 0);
                                                            const timeB = new Date(b.entry_time || 0);
                                                            return timeB - timeA;
                                                        });
                                                        latestRemarks = sortedFeedback[0].remarks || candidate.remarks || 'N/A';
                                                    } else {
                                                        latestRemarks = candidate.remarks || 'N/A';
                                                    }
                                                } else {
                                                    latestRemarks = candidate.remarks || 'N/A';
                                                }

                                                // Highlight based on remarks value
                                                const isOpenProfile = latestRemarks && latestRemarks.toLowerCase() === 'open profile';
                                                const isPositive = latestRemarks && ['interested', 'selected', 'hired', 'joined'].includes(latestRemarks.toLowerCase());
                                                const isNegative = latestRemarks && ['rejected', 'not interested', 'declined'].includes(latestRemarks.toLowerCase());

                                                let bgColor = 'bg-gray-100';
                                                let textColor = 'text-gray-800';
                                                let borderColor = 'border-gray-200';

                                                if (isOpenProfile) {
                                                    bgColor = 'bg-green-100';
                                                    textColor = 'text-green-800';
                                                    borderColor = 'border-green-200';
                                                } else if (isPositive) {
                                                    bgColor = 'bg-blue-100';
                                                    textColor = 'text-blue-800';
                                                    borderColor = 'border-blue-200';
                                                } else if (isNegative) {
                                                    bgColor = 'bg-red-100';
                                                    textColor = 'text-red-800';
                                                    borderColor = 'border-red-200';
                                                }

                                                return (
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${bgColor} ${textColor} ${borderColor}`}>
                                                        {latestRemarks}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Job Information */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-white rounded-lg shadow-sm p-2"
                            >
                                <div className="flex items-center space-x-1.5 mb-2">
                                    <Briefcase className="h-5 w-5 text-green-600" />
                                    <h2 className="text-lg font-medium text-gray-900">Client Information</h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Designation</label>
                                        <p className="text-sm text-gray-900 mt-1">
                                            {candidate.selectedClientJob?.designation || candidate.designation || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Client Name</label>
                                        <p className="text-sm text-gray-900 mt-1 flex items-center">
                                            <Building className="h-4 w-4 mr-1 text-gray-400" />
                                            {candidate.selectedClientJob?.client_name || candidate.clientName || 'N/A'}
                                        </p>
                                    </div>


                                    <div>

                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Right Column - Assignment Form */}
                        <div className="space-y-2">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-white rounded-lg shadow-sm p-2"
                            >
                                <div className="flex items-center space-x-3 mb-3">
                                    <Briefcase className="h-5 w-5 text-blue-600" />
                                    <h2 className="text-lg font-medium text-gray-900">Assign Details</h2>
                                </div>

                                <div className="space-y-1">
                                    <div className ="grid grid-cols-1 xl:grid-cols-2 gap-2">
                                    {/* Assign From */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Assign From 
                                        </label>
                                        <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 flex items-center">
                                            <User className="h-4 w-4 mr-2 text-gray-400" />
                                            {(() => {
                                                // Show current assigned executive name (not original executive)
                                                const currentExecutiveCode = getDisplayExecutiveName(candidate, candidate.selectedClientJob);
                                                const displayName = employeeNames[currentExecutiveCode] || currentExecutiveCode || 'Current Executive';
                                                return `${displayName} (${currentExecutiveCode})`;
                                            })()}
                                        </div>
                                    </div>

                                    {/* Assign To */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Assign To *
                                        </label>
                                        <select
                                            value={assignmentData.assignedTo}
                                            onChange={(e) => handleInputChange('assignedTo', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                            disabled={isLoadingEmployees}
                                        >
                                            <option value="">
                                                {isLoadingEmployees ? 'Loading employees...' : 'Select team member...'}
                                            </option>
                                            {employeesForDropdown.map((employee) => (
                                                <option key={employee.uniqueKey || `${employee.id}-${employee.value}`} value={employee.value}>
                                                    {employee.firstName} ({employee.value}){employee.level && ` - ${employee.level}`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Assignment Date */}
                                    {/* <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Assign Date
                                        </label>
                                        <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                                            {new Date().toLocaleDateString('en-GB')}
                                        </div>
                                    </div> */}

                                    
                                        </div>

                                    {/* Notes */}
                                    <div className="space-y-1 mt-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Assign Feedback
                                        </label>
                                        <textarea
                                            value={assignmentData.notes}
                                            onChange={(e) => handleInputChange('notes', e.target.value)}
                                            placeholder="Add additional feedback... (Will be combined with: 'Profile assigned from X to Y')"
                                            rows={4}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500  resize-none"
                                        />
                                    </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
                
                {/* Bottom Action Buttons */}
                <div className="bg-gray-50 px-2 py-1 mr-2 flex justify-end space-x-2">
                    <button
                        onClick={handleCancel}
                        className="px-2 py-2 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="px-2 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-lg shadow-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-50 flex items-center"
                    >
                        {isLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        <span>{isLoading ? 'Assigning...' : 'Save and Assign'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssignModal;
