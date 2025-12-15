import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Mail,
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Cake,
  Building,
  Briefcase,
  GraduationCap,
  Filter,
} from 'lucide-react';
import ViewModal from './ViewModal';
import EditModal from './EditModal';
import DeleteModal from './DeleteModal';
import { employeeService } from '../../../api/employeeService';
import {
  formatCurrency,
  displayDate,
  calculateAge,
  formatDate,
  calculateWorkDuration,
} from './utils/helpers';
import Loading from '../../../components/Loading';

const EmployeeDataTableBro = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState('id');
  const [sortDirection, setSortDirection] = useState('desc'); // LIFO - newest first
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');

  // Master data states
  const [branchOptions, setBranchOptions] = useState([]);
  const [managerOptions, setManagerOptions] = useState([]);
  const [masterDataLoaded, setMasterDataLoaded] = useState(false);

  // Modal states
  const [viewModal, setViewModal] = useState({ isOpen: false, employee: null });
  const [editModal, setEditModal] = useState({ isOpen: false, employee: null });
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    employee: null,
    isLoading: false,
  });

  // Fetch branch options from masters API
  const fetchBranchOptions = async () => {
    try {
      const base = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${base}/masters/branches/`);
      
      if (!response.ok) {
        throw new Error(`Branch fetch failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      const options = (Array.isArray(data) ? data : [])
        .filter((item) => !item.status || item.status === 'Active')
        .map((item) => ({ 
          value: String(item.id), 
          label: item.name 
        }));
      
      setBranchOptions(options);
    } catch (error) {
      console.error('Error loading branch options:', error);
      setBranchOptions([]);
    }
  };

  // Fetch manager options from employees API
  const fetchManagerOptions = async () => {
    try {
      // Use employeeService which handles authentication
      const data = await employeeService.getAll();
      
      const options = (Array.isArray(data) ? data : [])
        .filter((emp) => emp.del_state === 0)
        .map((emp) => ({
          value: emp.employeeCode, // Use employeeCode instead of ID
          label: `${emp.firstName || ''} `.trim() + (emp.level ? ` (${emp.level})` : '')
        }));
      
      setManagerOptions(options);
    } catch (error) {
      console.error('Error loading manager options:', error);
      setManagerOptions([]);
    }
  };

  // Helper functions to get names from codes/IDs
  const getBranchName = (branchId) => {
    if (!branchId || !branchOptions.length) return branchId || 'N/A';
    const branch = branchOptions.find(option => option.value === String(branchId));
    return branch ? branch.label : branchId;
  };

  const getManagerName = (employeeCode) => {
    if (!employeeCode) return 'N/A';
    if (!masterDataLoaded || !managerOptions.length) return 'Loading...';
    
    const manager = managerOptions.find(option => option.value === employeeCode);
    
    if (manager) {
      return manager.label;
    } else {
      // Fallback: show employeeCode if manager not found
      return employeeCode;
    }
  };

  useEffect(() => {
    const loadAllData = async () => {
      try {
        // Load all data in parallel
        await Promise.all([
          loadEmployees(),
          fetchBranchOptions(),
          fetchManagerOptions()
        ]);
        setMasterDataLoaded(true);
      } catch (error) {
        console.error('Error loading data:', error);
        setMasterDataLoaded(true); // Set to true even on error to prevent infinite loading
      }
    };

    loadAllData();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await employeeService.getAll();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (employee) => {
    setViewModal({ isOpen: true, employee });
  };

  const handleViewModalClose = () => {
    setViewModal({ isOpen: false, employee: null });
    // Refresh data when ViewModal closes (in case employee was updated)
    loadEmployees();
  };

  const handleEdit = (employee) => {
    setEditModal({ isOpen: true, employee });
  };

  const handleDelete = (employee) => {
    setDeleteModal({ isOpen: true, employee, isLoading: false });
  };

  const confirmDelete = async () => {
    if (!deleteModal.employee?.id) return;

    try {
      setDeleteModal((prev) => ({ ...prev, isLoading: true }));
      await employeeService.delete(deleteModal.employee.id);
      setEmployees(prev => prev.filter(emp => emp.id !== deleteModal.employee.id));
      setDeleteModal({ isOpen: false, employee: null, isLoading: false });
    } catch (error) {
      console.error('Error deleting employee:', error);
      setDeleteModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleUpdate = async (employeeId, formData) => {
    try {
      console.log('Updating employee:', employeeId, 'with data:', formData);

      // Check if this is already a response object (from ViewModal's direct API call)
      // If formData has an 'id' field, it's likely already a response from the API
      let response;

      if (formData && typeof formData === 'object' && formData.id) {
        // This is already a response object from ViewModal's direct API call
        console.log('Using provided response data (no additional API call needed)');
        response = formData;
      } else {
        // This is raw form data, make the API call
        console.log('Making API call with form data');
        response = await employeeService.update(employeeId, formData);
        console.log('Update response:', response);
      }

      if (response) {
        // Update the employees list
        setEmployees(prev =>
          prev.map(emp =>
            emp.id === employeeId ? { ...emp, ...response } : emp
          )
        );

        // Update the edit modal with the latest data
        setEditModal(prev => ({
          ...prev,
          employee: { ...prev.employee, ...response },
        }));

        // Also update the view modal if it's currently open for this employee
        if (viewModal.isOpen && viewModal.employee?.id === employeeId) {
          setViewModal(prev => ({
            ...prev,
            employee: { ...prev.employee, ...response }
          }));
        }
      }

      return response;
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error; // Re-throw to handle in the component
    }
  };



  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get unique values for filter options
  const statusOptions = [
    { value: 'all', label: 'All Status', count: employees.length },
    ...Object.entries(
      employees.reduce((acc, emp) => {
        const status = emp.status || 'Active';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {})
    ).map(([status, count]) => ({
      value: status,
      label: status,
      count
    }))
  ];


  const levelOptions = [
    { value: 'all', label: 'Levels' },
    ...Object.entries(
      employees.reduce((acc, emp) => {
        const level = emp.level || 'N/A';
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      }, {})
    ).map(([level, count]) => ({
      value: level,
      label: level,
      count
    }))
  ];

  const filteredEmployees = employees.filter((employee) => {
    if (!employee) return false;

    // Search filter
    const matchesSearch = searchTerm === '' || 
      Object.values(employee).some((value) =>
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );

    // Status filter
    const employeeStatus = employee.status || 'Active';
    const matchesStatus = statusFilter === 'all' || employeeStatus === statusFilter;

    // Level filter
    const employeeLevel = employee.level || 'N/A';
    const matchesLevel = levelFilter === 'all' || employeeLevel === levelFilter;

    return matchesSearch && matchesStatus && matchesLevel;
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    // First priority: Sort by status (Active first, then Inactive)
    const aStatus = a.status || 'Active';
    const bStatus = b.status || 'Active';
    
    if (aStatus !== bStatus) {
      // Active employees come first
      if (aStatus === 'Active' && bStatus === 'Inactive') return -1;
      if (aStatus === 'Inactive' && bStatus === 'Active') return 1;
    }
    
    // Second priority: Sort by the selected field within the same status group
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (aValue === undefined || bValue === undefined) return 0;

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    return sortDirection === 'asc'
      ? aValue > bValue
        ? 1
        : -1
      : aValue < bValue
        ? 1
        : -1;
  });

  const paginatedEmployees = sortedEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(sortedEmployees.length / itemsPerPage);

  // Calculate status counts for display (from filtered results)
  const statusCounts = filteredEmployees.reduce((counts, employee) => {
    const status = employee.status || 'Active';
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});

  // Calculate status counts from all employees (for reference)
  const totalStatusCounts = employees.reduce((counts, employee) => {
    const status = employee.status || 'Active';
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});

  const handleExport = () => {
    console.log('Exporting data...');
  };

  if (loading) {
    return null;
  }

  return (
    <div className="leading-0">
      <div className="max-w-8xl mx-auto">
        <div className="rounded-lg shadow-sm mb-3">
          <div className="px-2 py-2 bg-white  border-b border-gray-200 mb-1">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <User className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Employee Registration Data
                  </h1>
                  <p className="text-xs text-gray-600">
                    Manage and view employee information
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto justify-center"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
            
            
          </div>

          <div className="mb-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="bg-white p-2 rounded-lg  shado">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Employees</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {totalStatusCounts.Active || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-2 rounded-lg  shado">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Building className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Departments</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {[...new Set(employees.map((e) => e.department))].length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-2 rounded-lg  shado">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Remote Workers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {employees.filter((e) => e.workMode === 'Remote').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-2 rounded-lg  shado">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Experience</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {employees.length > 0
                      ? Math.round(
                        employees.reduce(
                          (sum, e) =>
                            sum + parseInt(e.yearsOfExperience || 0),
                          0
                        ) / employees.length
                      )
                      : 0}{' '}
                    years
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 mb-2">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
              {/* Left side - Entries dropdown */}
              <div className="flex items-center gap-2">
                <div>
                  <label className="text-xs text-gray-700">Show</label>
                  <select
                    className="text-xs rounded border border-gray-300 py-1 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500 ml-1"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1); // Reset to first page when changing items per page
                    }}
                  >
                    {[10, 25, 50, 75, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-xs text-gray-500">entries</span>
              </div>

              {/* Right side - Search and Filters */}
              <div className="flex items-center gap-2">
                {/* Search box - always visible */}
                <div className="flex max-w-sm">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search employees..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1); // Reset to first page when searching
                      }}
                      className="pl-8 text-xs w-full rounded border border-gray-300 py-2 shadow-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Status and Level filters - only visible when filters are open */}
                {showFilters && (
                  <>
                    <div>
                      <select
                        value={statusFilter}
                        onChange={(e) => {
                          setStatusFilter(e.target.value);
                          setCurrentPage(1); // Reset to first page when filtering
                        }}
                        className="text-xs rounded border border-gray-300 py-2 px-3 shadow-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label} ({option.count})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <select
                        value={levelFilter}
                        onChange={(e) => {
                          setLevelFilter(e.target.value);
                          setCurrentPage(1); // Reset to first page when filtering
                        }}
                        className="text-xs rounded border border-gray-300 py-2 px-4 shadow-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {levelOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label} ({option.count})
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Filter toggle button - always visible */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center justify-center p-2 rounded border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  title="Filter"
                >
                  <Filter className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto overflow-y-auto scrollbar-desktop max-h-[calc(100vh-335px)]">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white sticky top-0 z-10">
                <tr>
                  <th className="w-15 px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    S.No
                  </th>
                  <th
                    className="min-w-[150px] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('employeeCode')}
                  >
                    EMPLOYEE DETAILS
                    {sortField === 'employeeCode' && (
                      <span className="ml-1">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}  
                  </th>
                  <th className="min-w-[150px] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CONTACT INFO
                  </th>
                  <th className="min-w-[150px] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PERSONAL DETAILS
                  </th>
                  <th className="min-w-[150px] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    JOB DETAILS
                  </th>
                  <th className="min-w-[150px] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    REPORTING TO
                  </th>
                  
                  <th className="w-24 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    STATUS
                  </th>
                  <th className="w-24 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ACTIONS
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedEmployees.length > 0 ? (
                  paginatedEmployees.map((employee, index) => (
                    <tr
                      key={employee.id || index}
                      className="hover:bg-gray-50 transition-colors"
                        >
                      <td className="px-3 text-center text-sm text-gray-500">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>

                      <td className="px-2 py-1">
                        <div className="space-y-0.5">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              {employee.profilePhoto ? (
                                <img
                                  src={employee.profilePhoto}
                                  alt="Profile"
                                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 shadow-md "
                                />
                              ) : (
                                <div className=" rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shadow-md border-2 border-gray-200">
                                  <User className="w-10 h-10" />
                                </div>
                              )}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {employee.firstName} {employee.lastName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {employee.employeeCode}
                              </div>
                              <div className="text-xs text-gray-400">
                                {employee.level && (() => {
                                  const levelMappings = {
                                    // Database format to display format
                                    'employee': 'L1-Employee',
                                    'tl': 'L2-Team Lead',
                                    'bm': 'L3-Branch Manager',
                                    'rm': 'L4-Regional Manager',
                                    'ceo': 'L5-CEO',
                                    // UI format to display format
                                    'L1': 'L1-Employee',
                                    'L2': 'L2-Team Lead',
                                    'L3': 'L3-Branch Manager',
                                    'L4': 'L4-Regional Manager',
                                    'L5': 'L5-CEO'
                                  };
                                  return levelMappings[employee.level] || employee.level;
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-1">
                        <div className="space-y-0.5">
                          <div className="flex items-start">
                            <Phone className="flex-shrink-0 mt-0.5 mr-2 w-3.5 h-3.5 text-gray-400" />
                            <div>
                              <div className="text-xs text-gray-900">
                                {employee.phone1}
                              </div>
                              {employee.phone2 && (
                                <div className="text-xs text-gray-500">
                                  {employee.phone2}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center">
                            <Mail className="flex-shrink-0 mr-2 w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs text-gray-900 truncate max-w-[160px]">
                              {employee.personalEmail}
                            </span>
                          </div>
                          {employee.officialEmail && (
                            <div className="flex items-center">
                              <Mail className="flex-shrink-0 mr-2 w-3.5 h-3.5 text-gray-400" />
                              <span className="text-xs text-gray-900 truncate max-w-[160px]">
                                {employee.officialEmail}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-1">
                        <div className="space-y-0.5">
                          <div className="flex items-center">
                            <Cake className="flex-shrink-0 mr-2 w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs text-gray-900">
                              {displayDate(employee.dateOfBirth)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded ${employee.bloodGroup
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                                }`}
                            >
                              {employee.bloodGroup || 'N/A'}
                            </span>
                            <span className="text-xs text-gray-900">
                              {employee.gender}
                            </span>
                            <span className="text-xs text-gray-500">
                              {calculateAge(employee.dateOfBirth)} yrs old
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <span className="text-xs font-medium text-gray-500">
                              Experience:
                            </span>
                            <span className="text-gray-900">
                              {employee.yearsOfExperience
                                ? `${employee.yearsOfExperience} yrs`
                                : 'Fresher'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-1">
                        <div className="space-y-0.5">
                          <div className="flex justify-start items-center">
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded ${employee.workMode === 'Remote'
                                ? 'bg-purple-100 text-purple-800'
                                : employee.workMode === 'Hybrid'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-green-100 text-green-800'
                                }`}
                            >
                              {employee.workMode}
                            </span>
                            <div className="text-xs font-medium text-gray-900 ml-2">
                              {formatCurrency(employee.ctc)}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            Joined: {formatDate(employee.joiningDate)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Tenure:{' '}
                            {calculateWorkDuration(employee.joiningDate)}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-1">
                        <div className="space-y-0.5">
                          <div className="text-xs font-medium text-gray-900">
                            {employee.department}
                          </div>
                          <div className="text-xs text-gray-900">
                            {employee.position}
                          </div>
                          <div className="text-xs text-gray-500">
                            {getManagerName(employee.reportingManager)} •{' '}
                            {getBranchName(employee.branch)}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-1">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            (employee.status || 'Active') === 'Active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {employee.status || 'Active'}
                          </span>
                        </div>
                      </td>

                      <td className="px-2 py-1 text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => handleView(employee)}
                            className="p-1 rounded-full transition-all duration-300 hover:bg-blue-100/50 hover:scale-110 group"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4 text-blue-600 transition-all duration-300 group-hover:text-blue-700 group-hover:scale-110" />
                          </button>
                          {/* <button
                            onClick={() => handleDelete(employee)}
                            className="p-1 rounded-full transition-all duration-300 hover:bg-red-100/50 hover:scale-110 group"
                            title="Delete Employee"
                          >
                            <Trash2 className="w-4 h-4 text-red-600 transition-all duration-300 group-hover:text-red-700 group-hover:scale-110" />
                          </button> */}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-4 py-4 text-center text-sm text-gray-500"
                    >
                      No employees found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between border-t mt-2 border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>

          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {(currentPage - 1) * itemsPerPage + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, sortedEmployees.length)}
                </span>{' '}
                of <span className="font-medium">{sortedEmployees.length}</span>{' '}
                results
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-xs">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">First</span>
                  <ChevronLeft className="size-4" />
                  <ChevronLeft className="size-4 -ml-2" />
                </button>
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="size-4" />
                </button>

                {(() => {
                  const pages = [];
                  const siblings = 1;
                  const showLeftEllipsis = currentPage > siblings + 2;
                  const showRightEllipsis =
                    currentPage < totalPages - (siblings + 1);
                  const startPage = Math.max(2, currentPage - siblings);
                  const endPage = Math.min(
                    totalPages - 1,
                    currentPage + siblings
                  );

                  pages.push(
                    <button
                      key={1}
                      onClick={() => setCurrentPage(1)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === 1
                        ? 'z-10 bg-blue-600 text-white focus-visible:outline-blue-600'
                        : 'text-gray-900 ring-1 ring-gray-300 ring-inset hover:bg-gray-50'
                        }`}
                    >
                      1
                    </button>
                  );

                  if (showLeftEllipsis) {
                    pages.push(
                      <span
                        key="left-ellipsis"
                        className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-300 ring-inset"
                      >
                        ...
                      </span>
                    );
                  }

                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${i === currentPage
                          ? 'z-10 bg-blue-600 text-white focus-visible:outline-blue-600'
                          : 'text-gray-900 ring-1 ring-gray-300 ring-inset hover:bg-gray-50'
                          }`}
                      >
                        {i}
                      </button>
                    );
                  }

                  if (showRightEllipsis) {
                    pages.push(
                      <span
                        key="right-ellipsis"
                        className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-300 ring-inset"
                      >
                        ...
                      </span>
                    );
                  }

                  if (totalPages > 1) {
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === totalPages
                          ? 'z-10 bg-blue-600 text-white focus-visible:outline-blue-600'
                          : 'text-gray-900 ring-1 ring-gray-300 ring-inset hover:bg-gray-50'
                          }`}
                      >
                        {totalPages}
                      </button>
                    );
                  }

                  return pages;
                })()}

                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="size-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Last</span>
                  <ChevronRight className="size-4" />
                  <ChevronRight className="size-4 -ml-2" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <ViewModal
        isOpen={viewModal.isOpen}
        employee={viewModal.employee}
        onClose={handleViewModalClose}
        onUpdate={handleUpdate}
        onRefresh={loadEmployees}

      />
      <EditModal
        isOpen={editModal.isOpen}
        employee={editModal.employee}
        onClose={() => setEditModal({ isOpen: false, employee: null })}
        onUpdate={handleUpdate}
      />
      <DeleteModal
        isOpen={deleteModal.isOpen}
        employee={deleteModal.employee}
        onClose={() => setDeleteModal({ isOpen: false, employee: null })}
        onConfirm={confirmDelete}
        isLoading={deleteModal.isLoading}
      />
    </div>
  );
};

export default EmployeeDataTableBro;
