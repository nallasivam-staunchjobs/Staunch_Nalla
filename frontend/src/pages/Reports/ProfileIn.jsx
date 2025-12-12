import React, { useState, useEffect } from 'react';
import { UserPlus, Calendar, Users, Search, X, MapPin, User, RefreshCw, Map } from 'lucide-react';
import { vendorAPI } from '../../api/vendorService';
import { candidates } from '../../api/api';
import CandidateTable from '../calendar/components/CandidateTable';
import FeedbackModal from '../NewDtr/components/FeedbackModal';
import axios from 'axios';
import { API_URL } from '../../api/config';

const ProfileIn = () => {
  // Get current date in YYYY-MM-DD format
  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Filter States
  const [filters, setFilters] = useState({
    fromDate: getCurrentDate(),
    toDate: getCurrentDate(),
    client: '',
    state: '',
    city: ''
  });

  // Dropdown Data States
  const [clientOptions, setClientOptions] = useState([]); // [{id, vendor_name, ...}]
  const [stateOptions, setStateOptions] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState({
    clients: false,
    states: false,
    cities: false
  });
  
  const [cityOptions, setCityOptions] = useState([]);

  // Profile IN Data States
  const [profileInData, setProfileInData] = useState([]);
  const [allProfileData, setAllProfileData] = useState([]); // Store all data for local filtering
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  // Modal States
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Fetch cities from API
  useEffect(() => {
    const fetchCities = async () => {
      setLoadingDropdowns(prev => ({ ...prev, cities: true }));
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/call-details/cities/`, {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data?.success && Array.isArray(response.data.cities)) {
          // Transform the response to match our expected format
          const formattedCities = response.data.cities.map(city => ({
            id: city.id,
            value: city.city,
            label: city.state ? `${city.city}, ${city.state}` : city.city,
            state: city.state || ''
          }));
          setCityOptions(formattedCities);
        }
      } catch (error) {
        console.error('Failed to load cities:', error);
      } finally {
        setLoadingDropdowns(prev => ({ ...prev, cities: false }));
      }
    };

    fetchCities();
  }, []);

  // Fetch dropdown options from APIs
  useEffect(() => {
    let isMounted = true;
    
    // Fetch client options from vendor API
    const fetchClients = async () => {
      setLoadingDropdowns(prev => ({ ...prev, clients: true }));
      try {
        const res = await vendorAPI.get('/vendors/');
        if (isMounted && Array.isArray(res.data)) {
          setClientOptions(res.data);
          console.log('ProfileIn: Loaded client options:', res.data.length);
        }
      } catch (err) {
        console.error('ProfileIn: Failed to load vendors', err);
      } finally {
        if (isMounted) {
          setLoadingDropdowns(prev => ({ ...prev, clients: false }));
        }
      }
    };

  
    // Fetch clients
    fetchClients();

    return () => {
      isMounted = false;
    };
  }, []);

  // Transform candidate data to match CandidateTable expected format
  const transformCandidateData = (items) => {
    return items.map(item => {
      // Create standardized client job object from the item itself
      const standardizedClientJob = {
        id: item.id,
        client_name: item.client_name || 'N/A',
        clientName: item.client_name || 'N/A',
        designation: item.designation || 'N/A',
        current_ctc: item.current_ctc || null,
        currentCtc: item.current_ctc || null,
        expected_ctc: item.expected_ctc || null,
        expectedCtc: item.expected_ctc || null,
        remarks: item.remarks || 'No remarks available',
        next_follow_up_date: item.next_follow_up_date || null,
        nextFollowUpDate: item.next_follow_up_date || null,
        expected_joining_date: item.expected_joining_date || null,
        expectedJoiningDate: item.expected_joining_date || null,
        interview_date: item.interview_date || null,
        interviewFixedDate: item.interview_date || null,
        interview_fixed_date: item.interview_date || null,
        // Assignment fields
        assign_to: item.assign_to || null,
        assignTo: item.assign_to || null,
        assigned_from: item.assigned_from || null,
        assigned_from_name: item.assigned_from_name || null,
        assign_by: item.assign_by || null,
        assign: item.assign || null,
        is_open_profile: item.is_open_profile || false,
        can_assign: item.can_assign || false
      };

      return {
        ...item,
        // Store both for compatibility
        selectedClientJob: standardizedClientJob,
        clientJob: standardizedClientJob,
        
        // Standardized candidate fields
        candidateName: item.candidate?.candidate_name || item.candidate_name || 'Unknown',
        candidate_name: item.candidate?.candidate_name || item.candidate_name || 'Unknown',
        candidateId: item.candidate?.id || item.candidate_id || item.id,
        candidate_id: item.candidate?.id || item.candidate_id || item.id,
        phoneNumber: item.candidate?.mobile1 || item.mobile_no || item.phone_number,
        phone_number: item.candidate?.mobile1 || item.mobile_no || item.phone_number,
        contactNumber1: item.candidate?.mobile1 || item.mobile_no,
        contactNumber2: item.candidate?.mobile2 || null,
        mobile1: item.candidate?.mobile1 || item.mobile_no,
        mobile2: item.candidate?.mobile2 || null,
        email: item.candidate?.email || null,
        education: item.candidate?.education || null,
        experience: item.candidate?.experience || null,
        
        // Enhanced Employee info - For Profile IN, show who it's assigned TO (current owner)
        employeeName: item.assign_to_name || item.candidate?.executive_name || 'Unknown Employee',
        executive_name: item.assign_to_name || item.candidate?.executive_name || 'Unknown Employee',
        executive_display: item.assign_to_name || item.candidate?.executive_display || null, // Show name only, no code
        
        // Assigned To info for Profile IN (current owner)
        assign_to_name: item.assign_to_name || 'N/A',
        assign_to_code: item.assign_to || 'N/A',
        assign_to_display: `${item.assign_to_name || 'N/A'} (${item.assign_to || 'N/A'})`,
        
        // Assigned From info for Profile IN (for reference)
        assigned_from_name: item.assigned_from_name || 'N/A',
        assigned_from_code: item.assigned_from || 'N/A',
        assigned_from_display: `${item.assigned_from_name || 'N/A'} (${item.assigned_from || 'N/A'})`,
        
        // Client info (direct access)
        client_name: standardizedClientJob.client_name,
        clientName: standardizedClientJob.clientName,
        
        // Source info
        source_name: item.candidate?.source || 'Unknown Source',
        sourceName: item.candidate?.source || 'Unknown Source',
        source: item.candidate?.source || 'Unknown Source',
        
        // Location info
        city: item.candidate?.city || 'N/A',
        state: item.candidate?.state || 'N/A',
        address: item.candidate?.address || 'N/A',
        location: `${item.candidate?.city || 'N/A'}, ${item.candidate?.state || 'N/A'}`,
        cityState: `${item.candidate?.city || 'N/A'}, ${item.candidate?.state || 'N/A'}`,
        
        // Profile number
        profile_number: item.candidate?.profile_number || item.profile_number || 'N/A',
        
        // Date info - Use date_of_transfer for created/updated display
        candidateCreatedDate: item.date_of_transfer || item.created_at,
        created_at: item.date_of_transfer || item.created_at,
        updated_at: item.date_of_transfer || item.updated_at,
        date_of_transfer: item.date_of_transfer,
        
        // Job-related fields (direct access for compatibility)
        designation: standardizedClientJob.designation,
        current_ctc: standardizedClientJob.current_ctc,
        currentCTC: standardizedClientJob.currentCtc,
        expected_ctc: standardizedClientJob.expected_ctc,
        expectedCTC: standardizedClientJob.expectedCtc,
        remarks: standardizedClientJob.remarks,
        next_follow_up_date: standardizedClientJob.next_follow_up_date,
        nextFollowUpDate: standardizedClientJob.nextFollowUpDate,
        expected_joining_date: standardizedClientJob.expected_joining_date,
        expectedJoiningDate: standardizedClientJob.expectedJoiningDate,
        interview_date: standardizedClientJob.interview_date,
        interview_fixed_date: standardizedClientJob.interview_fixed_date,
        interviewFixedDate: standardizedClientJob.interviewFixedDate,
        feedback: item.feedback || null
      };
    });
  };

  // Fetch Profile IN data with DATE filters only
  const fetchProfileInData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('ProfileIn: Fetching profile in data with DATE filters:', { fromDate: filters.fromDate, toDate: filters.toDate });
      
      // Build query parameters - ONLY DATE FILTERS (both optional)
      const params = new URLSearchParams();
      if (filters.fromDate && filters.fromDate.trim() !== '') params.append('from_date', filters.fromDate);
      if (filters.toDate && filters.toDate.trim() !== '') params.append('to_date', filters.toDate);
      
      // Add pagination params
      params.append('page', '1');
      params.append('page_size', '1000'); // Get all records for now
      
      const queryString = params.toString();
      console.log('ProfileIn: Query string:', queryString);
      
      const response = await candidates.getProfileIn(queryString);

      console.log('ProfileIn: API Response:', response);
      // Handle the new API response format with success flag and data field
      let data = [];
      if (response.success && Array.isArray(response.data)) {
        data = response.data;
      } else if (Array.isArray(response)) {
        data = response;
      } else if (response.results) {
        data = response.results;
      }
      
      // Transform data to match CandidateTable expected format
      const transformedData = transformCandidateData(data);
      
      // Store all data for local filtering
      setAllProfileData(transformedData);
      
      // Apply local dropdown filters
      applyLocalFilters(transformedData);
      
      setTotalCount(response.count || transformedData.length);
      console.log('ProfileIn: Loaded profile in data:', transformedData.length, 'records');
    } catch (err) {
      console.error('ProfileIn: Failed to load profile in data', err);
      setError('Failed to load profile data. Please try again.');
      setProfileInData([]);
      setAllProfileData([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Apply local filters (client, state, city) on frontend
  const applyLocalFilters = (data = allProfileData) => {
    let filtered = [...data];

    // Filter by client
    if (filters.client) {
      filtered = filtered.filter(item => 
        item.client_name?.toLowerCase().includes(filters.client.toLowerCase())
      );
    }

    // Filter by state
    if (filters.state) {
      filtered = filtered.filter(item => 
        item.state?.toLowerCase().includes(filters.state.toLowerCase())
      );
    }

    // Filter by city
    if (filters.city) {
      filtered = filtered.filter(item => {
        const candidateCity = item.candidate?.city?.toLowerCase() || '';
        const formattedCity = filters.city.toLowerCase();
        return candidateCity.includes(formattedCity) ||
               formattedCity.includes(candidateCity) ||
               (item.candidate?.city && item.candidate.city.toLowerCase() === formattedCity);
      });
    }

    setProfileInData(filtered);
    console.log('ProfileIn: Applied local filters, showing', filtered.length, 'of', data.length, 'records');
  };

  // Load data on component mount
  useEffect(() => {
    fetchProfileInData();
  }, []);

  // Apply local filters when filter values change
  useEffect(() => {
    if (allProfileData.length > 0) {
      applyLocalFilters();
    }
  }, [filters.client, filters.state, filters.city, allProfileData]);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  // Handle apply filters - ONLY for DATE filters (fetches from API)
  const handleApplyFilters = () => {
    // Validate dates - both required
    if (!filters.fromDate || !filters.toDate) {
      alert('Please select both From Date and To Date');
      return;
    }
    
    // Ensure fromDate is before or equal to toDate
    if (new Date(filters.fromDate) > new Date(filters.toDate)) {
      alert('From Date cannot be after To Date');
      return;
    }
    
    console.log('Applying DATE filters:', { fromDate: filters.fromDate, toDate: filters.toDate });
    fetchProfileInData(); // Re-fetch with DATE filters
  };

  // Modal Handlers - ViewModal removed, now opens in new tab via CandidateTable

  const handleCandidateNameClick = (candidate) => {
    console.log('ProfileIn: Opening feedback modal for candidate:', candidate);
    setSelectedCandidate(candidate);
    setIsFeedbackModalOpen(true);
  };


  const handleCloseFeedbackModal = () => {
    setIsFeedbackModalOpen(false);
    setSelectedCandidate(null);
  };

  // Handle clear filters - Clear ALL filters and reset data
  const handleClearFilters = async () => {
    // Show loading state immediately
    setLoading(true);
    
    // Clear existing data first for immediate UI feedback
    setProfileInData([]);
    setAllProfileData([]);
    
    const clearedFilters = {
      fromDate: '',  // Clear date fields
      toDate: '',    // Clear date fields
      client: '',
      state: '',
      city: ''
    };
    
    // Reset all filter states
    setFilters(clearedFilters);
    
    // Reset the city dropdown to show the default option
    const citySelect = document.querySelector('select[name="city"]');
    if (citySelect) {
      citySelect.selectedIndex = 0;
    }
    
    // Reset date inputs
    const fromDateInput = document.querySelector('input[name="fromDate"]');
    const toDateInput = document.querySelector('input[name="toDate"]');
    if (fromDateInput) fromDateInput.value = '';
    if (toDateInput) toDateInput.value = '';
    
    try {
      // Re-fetch data with cleared filters (no date filters)
      await fetchProfileInData();
    } catch (error) {
      console.error('Error fetching data after clearing filters:', error);
      setError('Failed to load data after clearing filters');
    } finally {
      setLoading(false);
    }
    
    console.log('ProfileIn: All filters cleared, showing default data (last 30 days)');
  };

  // Format date for display in Indian Standard Time (12-hour format)
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    // Create date object from the string (assumes UTC)
    const utcDate = new Date(dateString);
    
    // Convert to IST by adding 5 hours and 30 minutes (330 minutes)
    const istDate = new Date(utcDate.getTime() + (330 * 60 * 1000));
    
    // Format the date manually
    const day = String(istDate.getUTCDate()).padStart(2, '0');
    const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
    const year = istDate.getUTCFullYear();
    
    // Convert 24-hour to 12-hour format
    let hours24 = istDate.getUTCHours();
    const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(istDate.getUTCSeconds()).padStart(2, '0');
    
    // Determine AM/PM and convert hours
    const ampm = hours24 >= 12 ? 'PM' : 'AM';
    let hours12 = hours24 % 12;
    hours12 = hours12 ? hours12 : 12; // 0 should be 12
    const hoursFormatted = String(hours12).padStart(2, '0');
    
    return `${day}/${month}/${year}, ${hoursFormatted}:${minutes}:${seconds} ${ampm}`;
  };

  return (
    <div className="space-y-2">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-2 py-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-green-500 to-green-600 rounded-lg">
                <UserPlus className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Profile In</h1>
                <p className="text-xs text-gray-600">Track incoming candidate profiles and registrations</p>
              </div>
            </div>
            
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-sm mt-2 border border-gray-200">
        {/* Filter Section - Desktop (always visible) */}
        <div className="hidden md:block">
          <div className="p-3 border-t border-gray-100">
            {/* Responsive Filter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
              {/* From Date */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => handleInputChange('fromDate', e.target.value)}
                  onFocus={(e) => { try { e.target.showPicker && e.target.showPicker(); } catch(err) {} }}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                />
              </div>

              {/* To Date */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => handleInputChange('toDate', e.target.value)}
                  onFocus={(e) => { try { e.target.showPicker && e.target.showPicker(); } catch(err) {} }}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                />
              </div>

              {/* Client */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  Client
                </label>
                <select
                  value={filters.client}
                  onChange={(e) => handleInputChange('client', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                  disabled={loadingDropdowns.clients}
                >
                  <option value="">
                    {loadingDropdowns.clients ? 'Loading clients...' : 'All Clients'}
                  </option>
                  {clientOptions.map(client => (
                    <option key={client.id} value={client.vendor_name}>
                      {client.vendor_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* City */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  <Map className="w-4 h-4 inline mr-1" />
                  City
                </label>
                <select
                  value={filters.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm text-xs focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                  disabled={loadingDropdowns.cities}
                >
                  <option value="">
                    {loadingDropdowns.cities ? 'Loading cities...' : 'All Cities'}
                  </option>
                  {cityOptions.map(city => (
                    <option key={city.id} value={city.value}>
                      {city.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Apply Button */}
              <div className="flex items-end space-x-2">
                <button
                  onClick={handleApplyFilters}
                  className="flex-1 px-2 py-1 text-xs bg-gradient-to-r from-green-600 to-green-700 text-white rounded-md hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center justify-center space-x-1 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <Search className="w-3 h-3" />
                  <span className="font-medium">Apply</span>
                </button>
                <button
                  onClick={handleClearFilters}
                  className="flex-1 px-2 py-1 text-xs bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-all duration-200 flex items-center justify-center space-x-1 shadow-md hover:shadow-lg"
                >
                  <X className="w-3 h-3" />
                  <span className="font-medium">Clear</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Today's Profiles</p>
              <p className="text-lg font-bold text-gray-900">0</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-full">
              <UserPlus className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-2 rounded-sm shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">This Week</p>
              <p className="text-xl font-bold text-gray-900">0</p>
            </div>
            <div className="p-2 bg-green-100 rounded-full">
              <Calendar className="w-4 h-4 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-2 rounded-sm shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">This Month</p>
              <p className="text-xl font-bold text-gray-900">0</p>
            </div>
            <div className="p-2 bg-purple-100 rounded-full">
              <Users className="w-4 h-4 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-2 rounded-sm shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Growth Rate</p>
              <p className="text-xl font-bold text-gray-900">0%</p>
            </div>
            <div className="p-2 bg-orange-100 rounded-full">
              <TrendingUp className="w-4 h-4 text-orange-600" />
            </div>
          </div>
        </div>
      </div> */}

      {/* Profile IN Data Table - Using Reusable CandidateTable */}
      <div className="bg-white rounded-sm border border-gray-200">
        

        {error && (
          <div className="px-4 py-3 bg-red-50 border-l-4 border-red-400">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Use Reusable CandidateTable Component */}
        <CandidateTable
          candidates={profileInData}
          fetchMode="direct"
          title="Profile IN - Assigned to Me"
          emptyMessage="No profiles assigned to you"
          showActions={true}
          entriesPerPage={25}
          showTransferDate={true}
          // onView removed - now opens in new tab
          onCandidateNameClick={handleCandidateNameClick}
          onDataUpdate={(data, count) => {
            setTotalCount(count);
          }}
        />
      </div>

      {/* ViewModal removed - now opens in new tab via /view-candidate route */}

      {/* Feedback Modal */}
      {isFeedbackModalOpen && selectedCandidate && (
        <FeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={handleCloseFeedbackModal}
          candidate={selectedCandidate}
          clientJobId={selectedCandidate.selectedClientJob?.id || selectedCandidate.clientJob?.id || selectedCandidate.id}
        />
      )}
    </div>
  );
};

export default ProfileIn;
