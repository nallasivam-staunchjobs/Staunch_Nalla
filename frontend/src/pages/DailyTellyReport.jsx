import React, { useState, useEffect } from 'react';
import { CustomDropdown } from '../components/UIComponents';
import { Modal } from '../components/UIComponents';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Download, 
  Filter, 
  Phone, 
  PhoneOff, 
  Eye, 
  Search,
  Users,
  TrendingUp,
  Clock,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

const DailyTellyReport = () => {
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    client: '',
    team: '',
    branch: ''
  });
  
  const [selectedReport, setSelectedReport] = useState(null);
  const [drillDownModal, setDrillDownModal] = useState(false);
  const [drillDownData, setDrillDownData] = useState([]);
  const [drillDownType, setDrillDownType] = useState(''); // 'answered' or 'not_answered'
  const [currentUser] = useState({ role: 'CEO', name: 'John Doe' }); // Mock user - replace with actual auth
  const navigate = useNavigate();

  // Role hierarchy for visibility
  const roleHierarchy = {
    'Executive': ['Executive'],
    'TL': ['TL', 'Executive'], 
    'BM': ['BM', 'TL', 'Executive'],
    'RM': ['RM', 'BM', 'TL', 'Executive'],
    'CEO': ['CEO', 'RM', 'BM', 'TL', 'Executive']
  };

  // Dummy data for testing with employee names and branch offices
  const dummyReportData = [
    {
      id: 1,
      date: '2024-08-30',
      executiveName: 'Alice Johnson',
      role: 'Executive',
      branch: 'MDU',
      client: 'TCS',
      callsAnswered: 15,
      callsNotAnswered: 8,
      totalCalls: 23,
      answeredDetails: [
        { id: 1, executiveName: 'Alice Johnson', candidateName: 'Rajesh Kumar', mobile: '+91-9876543210', clientName: 'TCS', location: 'Chennai', remark: 'Interested', notes: 'Candidate showed strong interest in the role' },
        { id: 2, executiveName: 'Alice Johnson', candidateName: 'Priya Sharma', mobile: '+91-9876543211', clientName: 'TCS', location: 'Bangalore', remark: 'Interview Fixed', notes: 'Scheduled for next Tuesday' },
        { id: 3, executiveName: 'Alice Johnson', candidateName: 'Amit Patel', mobile: '+91-9876543212', clientName: 'TCS', location: 'Mumbai', remark: 'Selected', notes: 'Client approved the candidate' },
        { id: 4, executiveName: 'Alice Johnson', candidateName: 'Sneha Reddy', mobile: '+91-9876543213', clientName: 'TCS', location: 'Hyderabad', remark: 'Joined', notes: 'Successfully onboarded' },
        { id: 5, executiveName: 'Alice Johnson', candidateName: 'Vikram Singh', mobile: '+91-9876543214', clientName: 'TCS', location: 'Delhi', remark: 'Golden Egg', notes: 'High potential candidate' }
      ],
      notAnsweredDetails: [
        { id: 1, executiveName: 'Alice Johnson', candidateName: 'Rohit Gupta', mobile: '+91-9876543215', clientName: 'TCS', location: 'Pune', remark: 'NNR/NSO', notes: 'Phone not reachable' },
        { id: 2, executiveName: 'Alice Johnson', candidateName: 'Kavya Nair', mobile: '+91-9876543216', clientName: 'TCS', location: 'Kochi', remark: 'Call Later', notes: 'Candidate busy, will call back' },
        { id: 3, executiveName: 'Alice Johnson', candidateName: 'Arjun Menon', mobile: '+91-9876543217', clientName: 'TCS', location: 'Trivandrum', remark: 'No Show', notes: 'Did not attend call' }
      ]
    },
    {
      id: 2,
      date: '2024-08-30',
      executiveName: 'Bob Smith',
      role: 'TL',
      branch: 'CBE',
      client: 'Infosys',
      callsAnswered: 20,
      callsNotAnswered: 5,
      totalCalls: 25,
      answeredDetails: [
        { id: 1, executiveName: 'Bob Smith', candidateName: 'Suresh Babu', mobile: '+91-9876543218', clientName: 'Infosys', location: 'Coimbatore', remark: 'Joined', notes: 'Successfully onboarded' },
        { id: 2, executiveName: 'Bob Smith', candidateName: 'Meera Krishnan', mobile: '+91-9876543219', clientName: 'Infosys', location: 'Madurai', remark: 'Golden Egg', notes: 'High potential candidate identified' },
        { id: 3, executiveName: 'Bob Smith', candidateName: 'Karthik Raj', mobile: '+91-9876543220', clientName: 'Infosys', location: 'Salem', remark: 'Interview Fixed', notes: 'Technical round scheduled' },
        { id: 4, executiveName: 'Bob Smith', candidateName: 'Divya Lakshmi', mobile: '+91-9876543221', clientName: 'Infosys', location: 'Trichy', remark: 'Selected', notes: 'Client approved profile' }
      ],
      notAnsweredDetails: [
        { id: 1, executiveName: 'Bob Smith', candidateName: 'Ravi Kumar', mobile: '+91-9876543222', clientName: 'Infosys', location: 'Erode', remark: 'No Show', notes: 'Candidate did not attend scheduled call' },
        { id: 2, executiveName: 'Bob Smith', candidateName: 'Lakshmi Priya', mobile: '+91-9876543223', clientName: 'Infosys', location: 'Thanjavur', remark: 'NNR/NSO', notes: 'Phone switched off' }
      ]
    },
    {
      id: 3,
      date: '2024-08-29',
      executiveName: 'Carol Davis',
      role: 'BM',
      branch: 'MDU',
      client: 'Google',
      callsAnswered: 18,
      callsNotAnswered: 7,
      totalCalls: 25,
      answeredDetails: [
        { id: 1, executiveName: 'Carol Davis', candidateName: 'Anand Kumar', mobile: '+91-9876543224', clientName: 'Google', location: 'Bangalore', remark: 'Think and Get Back', notes: 'Candidate needs time to consider' },
        { id: 2, executiveName: 'Carol Davis', candidateName: 'Pooja Iyer', mobile: '+91-9876543225', clientName: 'Google', location: 'Chennai', remark: 'Profile Validation', notes: 'Verifying credentials with client' },
        { id: 3, executiveName: 'Carol Davis', candidateName: 'Manoj Pillai', mobile: '+91-9876543226', clientName: 'Google', location: 'Kochi', remark: 'Interested', notes: 'Positive response from candidate' }
      ],
      notAnsweredDetails: [
        { id: 1, executiveName: 'Carol Davis', candidateName: 'Deepak Nair', mobile: '+91-9876543227', clientName: 'Google', location: 'Trivandrum', remark: 'NNR/NSO', notes: 'Multiple attempts, no response' },
        { id: 2, executiveName: 'Carol Davis', candidateName: 'Sita Devi', mobile: '+91-9876543228', clientName: 'Google', location: 'Calicut', remark: 'Call Later', notes: 'In meeting, will call back' }
      ]
    },
    {
      id: 4,
      date: '2024-08-29',
      executiveName: 'David Wilson',
      role: 'Executive',
      branch: 'CBE',
      client: 'Microsoft',
      callsAnswered: 12,
      callsNotAnswered: 10,
      totalCalls: 22,
      answeredDetails: [
        { id: 1, executiveName: 'David Wilson', candidateName: 'Ramesh Chandra', mobile: '+91-9876543229', clientName: 'Microsoft', location: 'Hyderabad', remark: 'Offer Denied', notes: 'Candidate declined due to location' },
        { id: 2, executiveName: 'David Wilson', candidateName: 'Nithya Sree', mobile: '+91-9876543230', clientName: 'Microsoft', location: 'Chennai', remark: 'Next Round', notes: 'Moving to technical interview' },
        { id: 3, executiveName: 'David Wilson', candidateName: 'Gopal Krishna', mobile: '+91-9876543231', clientName: 'Microsoft', location: 'Bangalore', remark: 'Interview Fixed', notes: 'HR round scheduled' }
      ],
      notAnsweredDetails: [
        { id: 1, executiveName: 'David Wilson', candidateName: 'Sundar Rajan', mobile: '+91-9876543232', clientName: 'Microsoft', location: 'Coimbatore', remark: 'Call Later', notes: 'Candidate in meeting' },
        { id: 2, executiveName: 'David Wilson', candidateName: 'Geetha Rani', mobile: '+91-9876543233', clientName: 'Microsoft', location: 'Madurai', remark: 'No Show', notes: 'Missed appointment' }
      ]
    },
    {
      id: 5,
      date: '2024-08-28',
      executiveName: 'Emma Thompson',
      role: 'Executive',
      branch: 'MDU',
      client: 'Apple',
      callsAnswered: 14,
      callsNotAnswered: 6,
      totalCalls: 20,
      answeredDetails: [
        { id: 1, executiveName: 'Emma Thompson', candidateName: 'Arun Prakash', mobile: '+91-9876543234', clientName: 'Apple', location: 'Bangalore', remark: 'Golden Egg', notes: 'Exceptional candidate profile' },
        { id: 2, executiveName: 'Emma Thompson', candidateName: 'Sowmya Devi', mobile: '+91-9876543235', clientName: 'Apple', location: 'Chennai', remark: 'Selected', notes: 'Fast-track approval' }
      ],
      notAnsweredDetails: [
        { id: 1, executiveName: 'Emma Thompson', candidateName: 'Venkat Raman', mobile: '+91-9876543236', clientName: 'Apple', location: 'Coimbatore', remark: 'NNR/NSO', notes: 'Phone unreachable' }
      ]
    }
  ];

  // Filter data based on role visibility
  const getVisibleData = () => {
    const allowedRoles = roleHierarchy[currentUser.role] || [];
    return dummyReportData.filter(report => 
      allowedRoles.includes(report.role) &&
      (!filters.fromDate || report.date >= filters.fromDate) &&
      (!filters.toDate || report.date <= filters.toDate) &&
      (!filters.client || report.client === filters.client) &&
      (!filters.team || report.executiveName === filters.team) &&
      (!filters.branch || report.branch === filters.branch)
    );
  };

  const filteredData = getVisibleData();

  // Dropdown options
  const clientOptions = [
    { value: '', label: 'All Clients' },
    { value: 'TCS', label: 'TCS' },
    { value: 'Infosys', label: 'Infosys' },
    { value: 'Google', label: 'Google' },
    { value: 'Microsoft', label: 'Microsoft' },
    { value: 'Apple', label: 'Apple' },
    { value: 'Wipro', label: 'Wipro' }
  ];

  // Team/Employee options
  const teamOptions = [
    { value: '', label: 'All Team Members' },
    { value: 'Alice Johnson', label: 'Alice Johnson (Executive)' },
    { value: 'Bob Smith', label: 'Bob Smith (TL)' },
    { value: 'Carol Davis', label: 'Carol Davis (BM)' },
    { value: 'David Wilson', label: 'David Wilson (Executive)' },
    { value: 'Emma Thompson', label: 'Emma Thompson (Executive)' }
  ];

  // Branch office options
  const branchOptions = [
    { value: '', label: 'All Branches' },
    { value: 'MDU', label: 'MDU (Madurai)' },
    { value: 'CBE', label: 'CBE (Coimbatore)' }
  ];

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDrillDown = (report, type) => {
    // Navigate to new page with report data
    const reportData = {
      ...report,
      drillDownType: type,
      drillDownData: type === 'answered' ? report.answeredDetails : report.notAnsweredDetails
    };
    
    // Store data in sessionStorage for the detail page
    sessionStorage.setItem('tellyReportDetail', JSON.stringify(reportData));
    
    // Navigate to detail page
    navigate(`/daily-telly-report/details/${report.id}?type=${type}`);
  };

  const exportToCSV = () => {
    const headers = ['S.No', 'Date', 'Executive Name', 'Role', 'Location', 'Client', 'Calls Not Answered', 'Calls Answered', 'Total Calls'];
    const csvData = filteredData.map((report, index) => [
      index + 1,
      report.date,
      report.executiveName,
      report.role,
      report.location,
      report.client,
      report.callsNotAnswered,
      report.callsAnswered,
      report.totalCalls
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily_telly_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report exported successfully!');
  };

  const clearFilters = () => {
    setFilters({
      fromDate: '',
      toDate: '',
      client: '',
      team: '',
      branch: ''
    });
    toast.success('Filters cleared!');
  };

  // Get remarks summary
  const getRemarksSummary = () => {
    const remarkCounts = {};
    filteredData.forEach(report => {
      [...report.answeredDetails, ...report.notAnsweredDetails].forEach(detail => {
        remarkCounts[detail.remark] = (remarkCounts[detail.remark] || 0) + 1;
      });
    });
    return remarkCounts;
  };

  const remarksSummary = getRemarksSummary();
  const topRemarks = Object.entries(remarksSummary)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 4);

  return (
    <>
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-2" >
        <div className="px-3 py-1 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Phone className="w-3 h-3 text-white" />
              </div>
              <div> 
                <h1 className="text-md font-bold text-gray-900">Daily Telly Report</h1>
                <p className="text-xs text-gray-600">Track daily call activities and performance metrics</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                {currentUser.role} Panel
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                className="w-full px-2 py-0.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) => handleFilterChange('toDate', e.target.value)}
                className="w-full px-2 py-0.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
              <CustomDropdown
                value={filters.client}
                onChange={(selected) => handleFilterChange('client', selected ? selected.value : '')}
                options={clientOptions}
                placeholder="All Clients"
                isSearchable={true}
                isClearable={true}
              />
            </div> */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Team Member</label>
              <CustomDropdown
                value={filters.team}
                onChange={(selected) => handleFilterChange('team', selected ? selected.value : '')}
                options={teamOptions}
                placeholder="All Team Members"
                isSearchable={true}
                isClearable={true}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
              <CustomDropdown
                value={filters.branch}
                onChange={(selected) => handleFilterChange('branch', selected ? selected.value : '')}
                options={branchOptions}
                placeholder="All Branches"
                isSearchable={true}
                isClearable={true}
              />
            </div>

            <div className="flex space-x-2">
              <button
                onClick={clearFilters}
                className="px-2 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center space-x-2"
              >
                <Filter className="w-4 h-4" />
                <span>Clear</span>
              </button>
              <button
                onClick={exportToCSV}
                className="px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Reports</p>
              <p className="text-md font-bold text-gray-900">{filteredData.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Calls</p>
              <p className="text-md font-bold text-gray-900">
                {filteredData.reduce((sum, report) => sum + report.totalCalls, 0)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Phone className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Calls Answered</p>
              <p className="text-md font-bold text-green-600">
                {filteredData.reduce((sum, report) => sum + report.callsAnswered, 0)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Calls Not Answered</p>
              <p className="text-md font-bold text-red-600">
                {filteredData.reduce((sum, report) => sum + report.callsNotAnswered, 0)}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <PhoneOff className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Remarks Summary Cards */}
      {/* <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-2">
        <div className="px-3 py-1 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 text-blue-600" />
            Top Remarks Summary
          </h2>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {topRemarks.map(([remark, count], index) => (
              <div key={remark} className="bg-gradient-to-br from-gray-50 to-gray-100 p-3 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600 truncate">{remark}</p>
                    <p className="text-lg font-bold text-gray-900">{count}</p>
                  </div>
                  <div className={`p-2 rounded-full ${
                    ['Interested', 'Selected', 'Joined', 'Golden Egg'].includes(remark)
                      ? 'bg-green-100'
                      : ['Interview Fixed', 'Next Round'].includes(remark)
                      ? 'bg-blue-100'
                      : ['Think and Get Back', 'Profile Validation'].includes(remark)
                      ? 'bg-yellow-100'
                      : 'bg-red-100'
                  }`}>
                    {['Interested', 'Selected', 'Joined', 'Golden Egg'].includes(remark) ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : ['Interview Fixed', 'Next Round'].includes(remark) ? (
                      <Clock className="w-4 h-4 text-blue-600" />
                    ) : ['Think and Get Back', 'Profile Validation'].includes(remark) ? (
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div> */}

      {/* Main Report Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-3 py-1 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Daily Call Reports</h2>
            <div className="text-xs text-gray-600">
              Showing {filteredData.length} reports
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  S.No
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Executive Name
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Calls Not Answered
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Calls Answered
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Calls
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.length > 0 ? (
                filteredData.map((report, index) => (
                  <tr key={report.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      {new Date(report.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                          {report.executiveName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{report.executiveName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        report.role === 'CEO' ? 'bg-purple-100 text-purple-800' :
                        report.role === 'RM' ? 'bg-indigo-100 text-indigo-800' :
                        report.role === 'BM' ? 'bg-blue-100 text-blue-800' :
                        report.role === 'TL' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {report.role}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        report.branch === 'MDU' ? 'bg-orange-100 text-orange-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {report.branch}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      {report.client}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <button
                        onClick={() => handleDrillDown(report, 'not_answered')}
                        className="text-red-600 hover:text-red-800 font-medium text-sm hover:underline transition-colors flex items-center space-x-1 group"
                      >
                        <PhoneOff className="w-4 h-4" />
                        <span>{report.callsNotAnswered}</span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <button
                        onClick={() => handleDrillDown(report, 'answered')}
                        className="text-green-600 hover:text-green-800 font-medium text-sm hover:underline transition-colors flex items-center space-x-1 group"
                      >
                        <Phone className="w-4 h-4" />
                        <span>{report.callsAnswered}</span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      {report.totalCalls}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Search className="w-12 h-12 text-gray-400" />
                      <p className="text-gray-500 text-lg">No reports found</p>
                      <p className="text-gray-400 text-sm">Try adjusting your filters or date range</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill-Down Modal */}
      <Modal
        isOpen={drillDownModal}
        onClose={() => setDrillDownModal(false)}
        title={`${drillDownType === 'answered' ? 'Calls Answered' : 'Calls Not Answered'} Details - ${selectedReport?.executiveName}`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          {/* Modal Header Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Date:</span>
                <span className="ml-2 text-gray-900">
                  {selectedReport && new Date(selectedReport.date).toLocaleDateString('en-IN')}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Location:</span>
                <span className="ml-2 text-gray-900">{selectedReport?.location}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Client:</span>
                <span className="ml-2 text-gray-900">{selectedReport?.client}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Total Count:</span>
                <span className="ml-2 font-bold text-gray-900">{drillDownData.length}</span>
              </div>
            </div>
          </div>

          {/* Drill-down Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    S.No
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Executive Name
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remark
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {drillDownData.map((detail, index) => (
                  <tr key={detail.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      {detail.executiveName}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        ['Interested', 'Selected', 'Joined', 'Golden Egg'].includes(detail.remark)
                          ? 'bg-green-100 text-green-800'
                          : ['Interview Fixed', 'Next Round'].includes(detail.remark)
                          ? 'bg-blue-100 text-blue-800'
                          : ['Think and Get Back', 'Profile Validation'].includes(detail.remark)
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {detail.remark}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {detail.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {drillDownData.length === 0 && (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No call details available</p>
            </div>
          )}
        </div>
      </Modal>
    </> 
  );
};

export default DailyTellyReport;
