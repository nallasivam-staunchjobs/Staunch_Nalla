import React, { useState, useEffect } from 'react';
import { Eye, MapPin, Calendar, Users, DollarSign, Phone, Mail, Search, Filter, X, Clock, Briefcase } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import jobOpeningService from '../../api/jobOpeningService';
import Loading from '../../components/Loading';

const ViewOpenings = () => {
    const location = useLocation();
    const [jobOpenings, setJobOpenings] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        is_active: '',
        company: '',
        location: ''
    });

    useEffect(() => {
        fetchJobOpenings();
        
        // Show welcome message if navigated from AddOpenings
        if (location.state?.newJobCreated) {
            toast.success(
                `Welcome! Your job "${location.state.jobTitle}" at ${location.state.companyName} is now live!`,
                {
                    duration: 4000,
                    position: 'top-center',
                    icon: '🎯',
                    style: {
                        background: '#dcfce7',
                        color: '#166534',
                        border: '1px solid #bbf7d0',
                    },
                }
            );
        }
    }, [location.state]);

    const fetchJobOpenings = async () => {
        try {
            setLoading(true);
            console.log('Fetching job openings with filters:', filters);
            const data = await jobOpeningService.getAllJobOpenings(filters);
            console.log('API Response:', data);
            console.log('Data type:', typeof data, 'Is array:', Array.isArray(data));
            setJobOpenings(data);
        } catch (err) {
            setError('Failed to fetch job openings');
            console.error('Error fetching job openings:', err);
            console.error('Error details:', err.response?.data || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (searchTerm.trim()) {
            try {
                setLoading(true);
                const data = await jobOpeningService.searchJobOpenings(searchTerm);
                setJobOpenings(data);
            } catch (err) {
                setError('Search failed');
            } finally {
                setLoading(false);
            }
        } else {
            fetchJobOpenings();
        }
    };

    const handleViewJob = (job) => {
        setSelectedJob(job);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedJob(null);
    };

    if (loading) {
        return null;
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-600">{error}</p>
                <button 
                    onClick={fetchJobOpenings}
                    className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                    Retry
                </button>
            </div>
        );
    }


    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="container mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Job Openings</h1>
                    <p className="text-gray-600">View and manage all job postings</p>
                </div>

                {/* Search and Filters */}
                <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search by job title or company..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleSearch}
                            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                        >
                            Search
                        </button>
                        <button
                            onClick={fetchJobOpenings}
                            className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                {/* Job Listings */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {jobOpenings.length === 0 ? (
                        <div className="col-span-full text-center py-12">
                            <p className="text-gray-500 text-lg">No job openings found</p>
                        </div>
                    ) : (
                        jobOpenings.map((job) => (
                            <JobCard key={job.id} job={job} onView={() => handleViewJob(job)} />
                        ))
                    )}
                </div>
            </div>
            
            {/* Modal */}
            {showModal && selectedJob && (
                <JobDetailModal job={selectedJob} onClose={handleCloseModal} />
            )}
        </div>
    );
};

// Job Card Component - Card style similar to the image
const JobCard = ({ job, onView }) => {
    const getTimeAgo = (date) => {
        const now = new Date();
        const posted = new Date(date);
        const diffTime = Math.abs(now - posted);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return '1 day ago';
        if (diffDays < 30) return `${diffDays} days ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
        return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
    };

    return (
        <div 
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer hover:border-blue-300"
            onClick={onView}
        >
            {/* Header */}
            <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-blue-600 text-sm">
                        {job.job_title} - {job.company_name}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                        job.is_active 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                    }`}>
                        {job.is_active ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <p className="text-xs text-gray-600 mb-2">
                    {job.designation || 'Position'} in {job.city || 'Location'}
                </p>
            </div>

            {/* Job Type and Time */}
            <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    <span>Full Time</span>
                </div>
                <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{getTimeAgo(job.posted_date)}</span>
                </div>
            </div>

            {/* Skills Tags */}
            <div className="mb-4">
                <div className="flex flex-wrap gap-1">
                    {job.skills && job.skills.length > 0 ? (
                        job.skills.slice(0, 6).map((skill, index) => (
                            <span
                                key={index}
                                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                            >
                                {skill}
                            </span>
                        ))
                    ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            General
                        </span>
                    )}
                </div>
            </div>

            {/* Company Info */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                            {job.company_name ? job.company_name.substring(0, 2).toUpperCase() : 'CO'}
                        </span>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-800">{job.company_name}</p>
                        <p className="text-xs text-gray-500">{job.experience}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs font-semibold text-blue-600">{job.ctc}</p>
                    <p className="text-xs text-gray-500">Years</p>
                </div>
            </div>
        </div>
    );
};

// Job Detail Modal Component
const JobDetailModal = ({ job, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold">
                                {job.company_name ? job.company_name.substring(0, 2).toUpperCase() : 'CO'}
                            </span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">{job.job_title}</h2>
                            <p className="text-lg text-gray-600">{job.company_name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-6">
                    {/* Job Information Section */}
                    <div className="mb-8">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Job Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Job Title</label>
                                <p className="text-gray-800">{job.job_title}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Company</label>
                                <p className="text-gray-800">{job.company_name}</p>
                            </div>
                            {job.designation && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Designation</label>
                                    <p className="text-gray-800">{job.designation}</p>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">CTC</label>
                                <p className="text-gray-800">{job.ctc}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Experience Required</label>
                                <p className="text-gray-800">{job.experience}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Location</label>
                                <p className="text-gray-800">{job.city}, {job.state}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Posted Date</label>
                                <p className="text-gray-800">{new Date(job.posted_date).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    job.is_active 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                }`}>
                                    {job.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Skills & Requirements Section */}
                    <div className="mb-8">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Skills & Requirements</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">Required Skills</label>
                                <div className="flex flex-wrap gap-2">
                                    {job.skills && job.skills.length > 0 ? (
                                        job.skills.map((skill, index) => (
                                            <span
                                                key={index}
                                                className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                                            >
                                                {skill}
                                            </span>
                                        ))
                                    ) : (
                                        <p className="text-gray-500">No skills specified</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">Languages</label>
                                <div className="flex flex-wrap gap-2">
                                    {job.languages && job.languages.length > 0 ? (
                                        job.languages.map((language, index) => (
                                            <span
                                                key={index}
                                                className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                                            >
                                                {language}
                                            </span>
                                        ))
                                    ) : (
                                        <p className="text-gray-500">No languages specified</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">Short Description</label>
                                <p className="text-gray-800">{job.short_description || 'No description provided'}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">Job Description</label>
                                <div className="bg-gray-50 p-4 rounded-md">
                                    <p className="text-gray-800 whitespace-pre-wrap">{job.job_description || 'No detailed description provided'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Information Section */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Contact Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-center gap-3">
                                <Phone className="w-5 h-5 text-gray-400" />
                                <div>
                                    <label className="block text-sm font-medium text-gray-600">Contact Person</label>
                                    <p className="text-gray-800">{job.contact_person}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone className="w-5 h-5 text-gray-400" />
                                <div>
                                    <label className="block text-sm font-medium text-gray-600">Contact Number</label>
                                    <p className="text-gray-800">{job.contact_number}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewOpenings;