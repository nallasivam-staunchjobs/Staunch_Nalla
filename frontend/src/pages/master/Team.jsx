import React, { useState, useEffect, useMemo } from 'react';
import 'react-toastify/dist/ReactToastify.css';
import { toast, ToastContainer } from 'react-toastify';
import Select from 'react-select';
import {
  PlusSquare,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Pencil,
  X as CloseIcon,
} from 'lucide-react';

function Team() {
  // State for team members modal
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [currentTeamMembers, setCurrentTeamMembers] = useState([]);
  const [currentTeamName, setCurrentTeamName] = useState('');

  // Show team members in modal
  const handleShowTeamMembers = (team) => {
    if (team.employees?.length > 0) {
      const members = allEmployees.filter(emp => team.employees?.includes(emp.id));
      setCurrentTeamMembers(members);
      setCurrentTeamName(team.name);
      setShowMembersModal(true);
    }
  };

  // Initialize branches state from sampleMasterData, mapping 'Branch' to 'name'
  useEffect(() => {
    const fetchBranchList = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/masters/branches/`);
        const data = await res.json();
        setBranchList(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch branches:', err);
      }
    };
    const fetchTeams = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/masters/teams/`);
        const data = await res.json();
        setBranches(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch teams:', err);
      }
    };
    fetchBranchList();
    fetchTeams();
  }, []);

  // State for teams (using existing variable name 'branches' for table rows)
  const [branches, setBranches] = useState([]);
  // Branch list for dropdown options
  const [branchList, setBranchList] = useState([]);
  const [newBranch, setNewBranch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(null);
  // Format branches for react-select
  const branchOptions = useMemo(() => {
    return branchList.map(branch => ({
      value: branch.id,
      label: branch.code || branch.branchcode || branch.branch_code || branch.name || branch.branch_name,
      code: branch.code || branch.branchcode || branch.branch_code,
      name: branch.name || branch.branch_name,
    }));
  }, [branchList]);
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchId, setNewBranchId] = useState(null);
  const [newBranchStatus, setNewBranchStatus] = useState('Active');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // State for employee search in dropdown
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  
  // State for form data
  const [formData, setFormData] = useState({
    name: '',
    branch: null,
    employees: []
  });

  // State for employee selection
  const [employees, setEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/empreg/employees/`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Token ${token}` } : {}),
          },
        });
        const data = await res.json();
        const list = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
        const filtered = list.filter((emp) => emp.status === 'Active' && (emp.level === 'L1' || emp.level === 'L2' || emp.level === 'L3'));
        const mapped = filtered.map((emp) => {
          let branchId = null;
          let branchCode = null;
          let branchName = null;
          const b = emp?.branch;
          if (b && typeof b === 'object') {
            branchId = b.id ?? b.pk ?? null;
            branchCode = (b.code ?? b.branchcode ?? null);
            branchName = (b.name ?? null);
          } else if (typeof b === 'number') {
            branchId = b;
          } else if (typeof b === 'string') {
            // Legacy schema: branch as plain text like 'COIMBATORE' or 'MADURAI'
            branchName = b?.trim();
          }
          // Fallback flat fields
          if (branchId == null) branchId = emp?.branch_id ?? null;
          if (branchCode == null) branchCode = (emp?.branch_code ?? emp?.branchCode ?? null);
          if (branchName == null) branchName = (emp?.branch_name ?? emp?.branchName ?? null);
          if (typeof branchCode === 'string') branchCode = branchCode.trim();
          if (typeof branchName === 'string') branchName = branchName.trim();

          return {
            id: emp.id,
            name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.employeeCode || 'Unknown',
            code: emp.employeeCode || '',
            level: emp.level || '',
            branchId,
            branchCode,
            branchName,
            selected: false,
          };
        });
        setAllEmployees(mapped);
        setEmployees(mapped);
      } catch (err) {
        console.error('Failed to fetch employees:', err);
      }
    };
    fetchEmployees();
  }, []);

  // Recompute available employees when teams (branches) or selected team changes
  useEffect(() => {
    if (!allEmployees || allEmployees.length === 0) return;

    // Require a branch selection to show employees
    const selectedBranchRaw = formData?.branch ?? null;
    if (!selectedBranchRaw) {
      setEmployees([]);
      return;
    }

    // Resolve selected branch details (id/name/code) for matching
    const selectedRawStr = typeof selectedBranchRaw === 'string' ? selectedBranchRaw.toString().trim() : undefined;
    const selectedRawNum = typeof selectedBranchRaw === 'number' || (/^\d+$/.test(String(selectedBranchRaw))) ? Number(selectedBranchRaw) : undefined;
    const selectedBranchObj = (branchList || []).find(b => {
      const bid = Number(b.id);
      const bcode = (b.code ?? b.branchcode ?? '').toString().trim().toLowerCase();
      const bname = (b.name ?? '').toString().trim().toLowerCase();
      const rawLower = selectedRawStr?.toLowerCase();
      return (selectedRawNum != null && bid === selectedRawNum) ||
             (rawLower && (bcode === rawLower || bname === rawLower));
    });
    const selId = selectedBranchObj?.id ?? selectedRawNum;
    const selName = selectedBranchObj?.name ? selectedBranchObj.name.toString().trim().toLowerCase() : (selectedRawStr ? selectedRawStr.toLowerCase() : undefined);
    const selCodeRaw = (selectedBranchObj?.code ?? selectedBranchObj?.branchcode ?? undefined);
    const selCode = selCodeRaw ? selCodeRaw.toString().trim().toLowerCase() : (selectedRawStr ? selectedRawStr.toLowerCase() : undefined);

    // Employees currently selected (for edit mode)
    const currentIds = new Set((formData?.employees || []));

    // Allowed list: only branch match (id OR name OR code). Do not restrict by existing team assignments.
    const allowed = allEmployees.filter(e => {
      const eName = e.branchName ? e.branchName.toString().trim().toLowerCase() : undefined;
      const eCode = e.branchCode ? e.branchCode.toString().trim().toLowerCase() : undefined;
      const matchId = selId != null && e.branchId != null && String(e.branchId) === String(selId);
      const matchName = selName && eName && eName === selName;
      const matchCode = selCode && eCode && eCode === selCode;
      return matchId || matchName || matchCode;
    });

    // Mark selections based on formData.employees
    const next = allowed.map(e => ({ ...e, selected: currentIds.has(e.id) }));

    setEmployees(next);
  }, [branches, allEmployees, formData.employees, formData.branch, branchList]);

  // State for deleting Branch
  const [branchToDelete, setBranchToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // State for editing Team
  const [editingNameId, setEditingNameId] = useState(null);
  const [editingCodeId, setEditingCodeId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editCodeValue, setEditCodeValue] = useState('');
  const [editTeamId, setEditTeamId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusChangeModal, setStatusChangeModal] = useState({
    show: false,
    id: null,
    newStatus: '',
    departmentName: '',
  });

  // Helper function to display toast notifications
  const showToast = (message, type = 'success') => {
    toast[type](message);
  };

  // Handles adding a new Team
  // Toggle employee selection
  const toggleEmployeeSelection = (employeeId) => {
    const updatedEmployees = employees.map(emp => 
      emp.id === employeeId ? { ...emp, selected: !emp.selected } : emp
    );
    setEmployees(updatedEmployees);
    setFormData(prev => ({
      ...prev,
      employees: updatedEmployees.filter(emp => emp.selected).map(emp => emp.id)
    }));
  };

  // Select/Deselect all employees
  const toggleSelectAllEmployees = (selectAll) => {
    const updatedEmployees = employees.map(emp => ({
      ...emp,
      selected: selectAll
    }));
    setEmployees(updatedEmployees);
    setFormData(prev => ({
      ...prev,
      employees: selectAll ? updatedEmployees.map(emp => emp.id) : []
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      showToast('Please enter a team name!', 'error');
      return;
    }

    const branchId = formData.branch;
    if (!branchId) {
      showToast('Please select a branch!', 'error');
      return;
    }

    try {
      const url = isEditing && editTeamId 
        ? `${import.meta.env.VITE_API_BASE_URL}/masters/teams/${editTeamId}/`
        : `${import.meta.env.VITE_API_BASE_URL}/masters/teams/`;

      const method = isEditing && editTeamId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          branch: branchId,
          employees: formData.employees,
          status: formData.status || 'Active',
        }),
      });

      if (!res.ok) throw new Error(`Failed to ${isEditing ? 'update' : 'add'} team`);

      const responseData = await res.json();
      
      if (isEditing) {
        setBranches(branches.map(branch => 
          branch.id === editTeamId ? responseData : branch
        ));
        showToast(`Team "${responseData.name}" updated successfully!`);
      } else {
        setBranches([responseData, ...branches]);
        showToast(`Team "${responseData.name}" added successfully!`);
      }

      // Reset form
      setFormData({
        name: '',
        branch: null,
        employees: []
      });
      setEmployees(employees.map(emp => ({ ...emp, selected: false })));
      setShowAddModal(false);
      setIsEditing(false);
      setEditTeamId(null);
    } catch (err) {
      console.error(err);
      showToast(`Failed to ${isEditing ? 'update' : 'add'} team`, 'error');
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle branch change: set branch and clear selected employees
  const handleBranchChange = (e) => {
    const value = e.target.value;
    const parsed = /^\d+$/.test(value) ? parseInt(value, 10) : value;
    setFormData(prev => ({ ...prev, branch: parsed, employees: [] }));
    setEmployees(prev => prev.map(emp => ({ ...emp, selected: false })));
  };

  // Handle edit team
  const handleEditTeam = (team) => {
    const initialBranch = (team && team.branch && typeof team.branch === 'object')
      ? team.branch.id
      : (team?.branch ?? null);

    const memberIds = new Set(team.employees || []);
    let derivedBranch = initialBranch;

    if (!derivedBranch && memberIds.size > 0 && allEmployees?.length > 0) {
      const firstMember = allEmployees.find(e => memberIds.has(e.id));
      if (firstMember) {
        if (firstMember.branchId != null) {
          derivedBranch = firstMember.branchId;
        } else if (firstMember.branchName) {
          const match = (branchList || []).find(b => {
            const bname = (b.name || b.branch_name || '').toString().trim().toLowerCase();
            const bcode = (b.code || b.branchcode || b.branch_code || '').toString().trim().toLowerCase();
            const ename = firstMember.branchName.toString().trim().toLowerCase();
            return bname === ename || bcode === ename;
          });
          if (match) derivedBranch = match.id;
        }
      }
    }

    setFormData({
      name: team.name,
      status: team.status,
      branch: derivedBranch ?? null,
      employees: team.employees || []
    });
    
    // Update employee selection state
    const updatedEmployees = employees.map(emp => ({
      ...emp,
      selected: team.employees ? team.employees.includes(emp.id) : false
    }));
    setEmployees(updatedEmployees);
    
    setEditTeamId(team.id);
    setIsEditing(true);
    setShowAddModal(true);
  };

  // Derive branch automatically if editing and branch missing once data is available
  useEffect(() => {
    if (showAddModal && isEditing && !formData.branch && (formData.employees?.length > 0) && allEmployees.length > 0) {
      const memberIds = new Set(formData.employees);
      const firstMember = allEmployees.find(e => memberIds.has(e.id));
      if (firstMember) {
        let derived = null;
        if (firstMember.branchId != null) derived = firstMember.branchId;
        else if (firstMember.branchName) {
          const match = (branchList || []).find(b => {
            const bname = (b.name || b.branch_name || '').toString().trim().toLowerCase();
            const bcode = (b.code || b.branchcode || b.branch_code || '').toString().trim().toLowerCase();
            const ename = firstMember.branchName.toString().trim().toLowerCase();
            return bname === ename || bcode === ename;
          });
          if (match) derived = match.id;
        }
        if (derived != null) {
          setFormData(prev => ({ ...prev, branch: derived }));
        }
      }
    }
  }, [showAddModal, isEditing, formData.branch, formData.employees, allEmployees, branchList]);

  // Initiates the delete process by setting the Branch to delete and showing the modal
  const handleDelete = (id) => {
    setBranchToDelete(id);
    setShowDeleteModal(true);
  };

  // Confirms and performs the deletion of a Team
  const confirmDelete = async () => {
    const deletedItem = branches.find((item) => item.id === branchToDelete);

    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/masters/teams/${branchToDelete}/`, {
        method: 'DELETE',
      });

      setBranches(branches.filter((item) => item.id !== branchToDelete));
      showToast(`${deletedItem?.name || 'Team'} deleted successfully!`, 'error');
    } catch (err) {
      console.error(err);
      showToast('Error deleting team', 'error');
    }

    setShowDeleteModal(false);
    setBranchToDelete(null);
  };

  // Handles double click on Team name
  const handleNameDoubleClick = (id, currentName) => {
    setEditingNameId(id);
    setEditValue(currentName);
  };

  // Handles double click on Team branch
  const handleCodeDoubleClick = (id, currentBranchId) => {
    setEditingCodeId(id);
    setEditBranchId(currentBranchId);
  };

  // Save team name edit
  const handleSaveNameEdit = async (id) => {
    const updatedName = editValue.trim();
    if (!updatedName) {
      showToast('Please enter a team name!', 'error');
      return;
    }

    const isDuplicateName = branches.some(
      (item) => item.id !== id && item.name.toLowerCase() === updatedName.toLowerCase()
    );
    if (isDuplicateName) {
      showToast('Another team with the same name already exists!', 'error');
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/masters/teams/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: updatedName }),
      });

      if (!res.ok) throw new Error('Failed to update team name');

      const updated = await res.json();
      setBranches(branches.map((item) => (item.id === id ? updated : item)));

      setEditingNameId(null);
      setEditValue('');
      showToast(`Team name updated to "${updatedName}" successfully!`);
    } catch (err) {
      console.error(err);
      showToast('Error updating team name', 'error');
    }
  };

  // Save branch change for team
  const handleSaveCodeEdit = async (id) => {
    if (!editBranchId) {
      showToast('Please select a branch!', 'error');
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/masters/teams/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: editBranchId }),
      });

      if (!res.ok) throw new Error('Failed to update team branch');

      const updated = await res.json();
      setBranches(branches.map((item) => (item.id === id ? updated : item)));

      setEditingCodeId(null);
      setEditCodeValue('');
      setEditBranchId(null);
      showToast(`Team branch updated successfully!`);
    } catch (err) {
      console.error(err);
      showToast('Error updating team branch', 'error');
    }
  };

  // Cancel name edit
  const cancelNameEdit = () => {
    setEditingNameId(null);
    setEditValue('');
  };

  // Cancel code edit
  const cancelCodeEdit = () => {
    setEditingCodeId(null);
    setEditCodeValue('');
    setEditBranchId(null);
  };

  // Shows the status change confirmation modal
  const showStatusChangeConfirmation = (id) => {
    const branch = branches.find((item) => item.id === id);
    setStatusChangeModal({
      show: true,
      id,
      newStatus: branch.status === 'Active' ? 'Deactive' : 'Active',
      departmentName: branch.name,
    });
  };

  // Confirms and performs the status change
  const confirmStatusChange = async () => {
    const { id, newStatus } = statusChangeModal;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/masters/teams/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to change status');

      const updated = await res.json();
      setBranches(branches.map((item) => (item.id === id ? updated : item)));

      setStatusChangeModal({
        show: false,
        id: null,
        newStatus: '',
        departmentName: '',
      });

      showToast(`Status changed to ${newStatus} successfully!`);
    } catch (err) {
      console.error(err);
      showToast('Error changing status', 'error');
    }
  };

  // Filter teams based on search term (by name only)
  const filteredBranches = branches.filter((item) =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Count active and deactive branches
  const activeCount = branches.filter((item) => item.status === 'Active').length;
  const deactiveCount = branches.filter(
    (item) => item.status === 'Deactive'
  ).length;

  // Calculate total pages for pagination
  const totalPages = Math.ceil(filteredBranches.length / entriesPerPage);
  // Get branches for the current page
  const paginatedBranches = filteredBranches.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage
  );

  // Format date to DD/MM/YYYY
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="text-black">
      {/* Header section with title, counts, and add button */}
      <div className="bg-white p-[15px] rounded-[10px] shadow-sm flex justify-between mb-4">
        <h1 className="text-lg font-bold">Teams</h1>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-medium">
              Active: <span className="text-green-600">{activeCount}</span>
            </span>
            <span className="text-xs sm:text-sm font-medium">
              Deactive: <span className="text-red-600">{deactiveCount}</span>
            </span>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-2 sm:px-3 py-1 text-xs sm:text-sm bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            <PlusSquare size={14} />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>
      </div>

      {/* Toast notifications container */}
      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        draggable
        toastClassName="text-sm px-2 w-[300px] sm:w-[350px]"
      />

      {/* Main content area: search, entries per page, and table */}
      <div className="bg-white rounded shadow px-4 py-2">
        <div className="flex justify-between mb-2 items-center px-2">
          {/* Entries per page dropdown */}
          <div className="text-gray-600 text-xs">
            Show{' '}
            <select
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="mx-2 border border-gray-300 rounded focus:outline-0 px-2 py-1"
            >
              {[10, 25, 50, 100].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>{' '}
            entries
          </div>
          {/* Search input */}
          <input
            type="text"
            placeholder="Search Branch..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded px-2 sm:px-3 py-1 text-xs sm:text-sm text-black placeholder:text-gray-500 focus:outline-0 w-full sm:w-auto"
          />
        </div>

        {/* Table container with scrollability */}
        <div className="overflow-x-auto">
          <div className="min-w-full max-h-[calc(100vh-300px)] sm:max-h-[calc(100vh-250px)] overflow-y-auto scrollbar-desktop">
            <table className="w-full text-sm sm:text-sm text-left border border-gray-200">
              {/* Table header */}
              <thead className="bg-white text-xs uppercase text-black border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="px-2 sm:px-4 py-2 text-start">S.No</th>
                  <th className="px-2 sm:px-4 py-2 text-start">Created</th>
                  <th className="px-2 sm:px-4 py-2 text-start">Team Name</th>
                  <th className="px-2 sm:px-4 py-2 text-start">Branch</th>
                  <th className="px-2 sm:px-4 py-2 text-start">Team Members</th>
                  <th className="px-2 sm:px-4 py-2 text-center">Status</th>
                  <th className="px-2 sm:px-4 py-2 text-end">Action</th>
                </tr>
              </thead>
              {/* Table body */}
              <tbody>
                {paginatedBranches.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-gray-500">
                      <p className="text-md font-medium">
                        No branches found
                      </p>
                      <p className="text-xs">
                        Try adjusting your search or filter criteria.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedBranches.map((item, index) => (
                    <tr
                      key={item.id}
                      className="text-black border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-2 sm:px-4 py-1.5">
                        {(currentPage - 1) * entriesPerPage + index + 1}
                      </td>
                      <td className="px-2 sm:px-4 py-1.5 text-xs">
                        {formatDate(item.created_at)}
                      </td>
                      {/* Team name cell */}
                      <td className="px-2 sm:px-4 py-1.5">
                        <span className="text-sm">
                          {item.name}
                        </span>
                      </td>
                      <td className="px-2 sm-px-4 py-1.5">
                        <span className='text-sm'>
                          {item.branch}
                        </span>
                      </td>
                      {/* Team member count cell with hover tooltip */}
                      <td className="px-2 sm:px-4 py-1.5">
                        <div className="relative">
                          <button 
                            onClick={() => handleShowTeamMembers(item)}
                            className={`text-sm ${item.employees?.length > 0 ? 'text-blue-600 hover:underline' : 'text-gray-400'}`}
                            disabled={!item.employees?.length}
                            title={item.employees?.length ? 'Click to view team members' : 'No team members'}
                          >
                            {item.employees?.length || 0} {item.employees?.length === 1 ? 'member' : 'members'}
                          </button>
                        </div>
                      </td>
                      {/* Status button */}
                      <td className="px-2 sm:px-4 py-1.5 text-center">
                        <button
                          onClick={() => showStatusChangeConfirmation(item.id)}
                          className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 mx-auto ${
                            item.status === 'Active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.status === 'Active'
                                ? 'bg-green-500'
                                : 'bg-red-500'
                            }`}
                          ></span>
                          {item.status}
                        </button>
                      </td>
                      {/* Action buttons */}
                      <td className="px-2 sm:px-4 py-1.5">
                        <div className='flex justify-end space-x-2'>
                          <button
                            onClick={() => handleEditTeam(item)}
                            className="p-1 rounded-full transition-all duration-300 hover:bg-blue-100/50 hover:scale-110 group"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4 text-blue-600 transition-all duration-300 group-hover:text-blue-700 group-hover:scale-110" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1 rounded-full transition-all duration-300 hover:bg-red-100/50 hover:scale-110 group"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-600 transition-all duration-300 group-hover:text-red-700 group-hover:scale-110" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination controls */}
        {filteredBranches.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-2 py-2 sm:px-4 sm:py-3">
            {/* Mobile pagination controls */}
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <div className="text-xs text-gray-500 mx-2 my-auto">
                Page {currentPage} of {totalPages}
              </div>
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>

            {/* Desktop pagination controls */}
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-gray-500">
                  Showing{' '}
                  <span className="font-medium">
                    {(currentPage - 1) * entriesPerPage + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium text-gray-700">
                    {Math.min(
                      currentPage * entriesPerPage,
                      filteredBranches.length
                    )}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{filteredBranches.length}</span>{' '}
                  results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-xs">
                  {/* First page button */}
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-md px-1.5 py-1.5 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">First</span>
                    <ChevronLeft className="size-3 sm:size-4" />
                    <ChevronLeft className="size-3 sm:size-4 -ml-1 sm:-ml-2" />
                  </button>
                  {/* Previous page button */}
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-1.5  text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeft className="size-3 sm:size-4" />
                  </button>

                  {/* Page numbers with ellipsis */}
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

                    // Always show first page
                    pages.push(
                      <button
                        key={1}
                        onClick={() => setCurrentPage(1)}
                        className={`relative inline-flex items-center px-2.5  text-xs sm:text-sm font-semibold ${
                          currentPage === 1
                            ? 'z-10 bg-blue-600 text-white focus-visible:outline-blue-600'
                            : 'text-gray-900 ring-1 ring-gray-300 ring-inset hover:bg-gray-50'
                        }`}
                      >
                        1
                      </button>
                    );

                    // Left ellipsis
                    if (showLeftEllipsis) {
                      pages.push(
                        <span
                          key="left-ellipsis"
                          className="relative inline-flex items-center px-2.5  text-xs sm:text-sm font-semibold text-gray-700 ring-1 ring-gray-300 ring-inset"
                        >
                          ...
                        </span>
                      );
                    }

                    // Middle pages
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i)}
                          className={`relative inline-flex items-center px-2.5  text-xs sm:text-sm font-semibold ${
                            i === currentPage
                              ? 'z-10 bg-blue-600 text-white focus-visible:outline-blue-600'
                              : 'text-gray-900 ring-1 ring-gray-300 ring-inset hover:bg-gray-50'
                          }`}
                        >
                          {i}
                        </button>
                      );
                    }

                    // Right ellipsis
                    if (showRightEllipsis) {
                      pages.push(
                        <span
                          key="right-ellipsis"
                          className="relative inline-flex items-center px-2.5  text-xs sm:text-sm font-semibold text-gray-700 ring-1 ring-gray-300 ring-inset"
                        >
                          ...
                        </span>
                      );
                    }

                    // Always show last page (if more than 1 page)
                    if (totalPages > 1) {
                      pages.push(
                        <button
                          key={totalPages}
                          onClick={() => setCurrentPage(totalPages)}
                          className={`relative inline-flex items-center px-2.5  text-xs sm:text-sm font-semibold ${
                            currentPage === totalPages
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

                  {/* Next page button */}
                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-1.5  text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRight className="size-3 sm:size-4" />
                  </button>
                  {/* Last page button */}
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-r-md px-1.5  text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Last</span>
                    <ChevronRight className="size-3 sm:size-4" />
                    <ChevronRight className="size-3 sm:size-4 -ml-1 sm:-ml-2" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Branch Modal */}
      {/* Add/Edit Team Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white text-black rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-md mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{isEditing ? 'Edit' : 'Add New'} Team</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setIsEditing(false);
                  setEditTeamId(null);
                  setFormData({ name: '', branch: null, employees: [] });
                  setEmployees(employees.map(emp => ({ ...emp, selected: false })));
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Team Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter Team Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black placeholder:text-gray-500 outline-none"
                  autoFocus
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Branch</label>
                <select
                  name="branch"
                  value={formData.branch ?? ''}
                  onChange={handleBranchChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black placeholder:text-gray-500 outline-none bg-white"
                  required
                >
                  <option value="" disabled>
                    Select Branch
                  </option>
                  {branchList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code}
                    </option>
                  ))}
                </select>
              </div>

              

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Team Members</label>
                <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
                  <div className="mb-2">
                    <input
                      type="text"
                      placeholder="Search employees..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={employeeSearchTerm}
                      onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-between mb-2 pb-2 border-b">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="selectAllEmployees"
                        checked={employees.length > 0 && employees.every(emp => emp.selected)}
                        onChange={(e) => toggleSelectAllEmployees(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="selectAllEmployees" className="ml-2 text-sm font-medium text-gray-700">
                        Select All
                      </label>
                    </div>
                    <span className="text-xs text-gray-500">
                      {employees.filter(e => e.selected).length} selected
                    </span>
                  </div>
                  <div className="space-y-2">
                    {employees
                      .filter(emp => 
                        emp.name.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
                        emp.code.toLowerCase().includes(employeeSearchTerm.toLowerCase())
                      )
                      .map((employee) => (
                        <div key={employee.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`employee-${employee.id}`}
                            checked={employee.selected}
                            onChange={() => toggleEmployeeSelection(employee.id)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor={`employee-${employee.id}`} className="ml-2 text-sm text-gray-700">
                            {employee.name} 
                            {employee.level && (
                              <span className="ml-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                {employee.level}
                              </span>
                            )}
                            <span className="text-xs text-gray-500 ml-1">({employee.code})</span>
                          </label>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setIsEditing(false);
                    setEditTeamId(null);
                    setFormData({ name: '', branch: null, employees: [] });
                    setEmployees(employees.map(emp => ({ ...emp, selected: false })));
                  }}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded bg-gray-300 hover:bg-gray-400 text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded bg-green-600 text-white hover:bg-green-700 text-sm sm:text-base"
                >
                  {isEditing ? (
                    <>
                      <Check size={16} />
                      Update Team
                    </>
                  ) : (
                    <>
                      <PlusSquare size={16} />
                      Add Team
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Branch Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white text-black rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-md mx-auto">
            <h2 className="text-lg font-bold mb-4">Confirm Delete</h2>
            <p className="mb-6">
              Are you sure you want to delete{' '}
              <span className="font-bold ms-1">
                {branches.find((item) => item.id === branchToDelete)?.name ||
                  'this Team'}
              </span>
              ?
            </p>
            <div className="flex justify-end gap-2 sm:gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded bg-gray-300 hover:bg-gray-400 text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded bg-red-600 text-white hover:bg-red-700 text-sm sm:text-base"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Confirmation Modal */}
      {statusChangeModal.show && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white text-black rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-md mx-auto">
            <h2 className="text-lg font-bold mb-4">Confirm Status Change</h2>
            <p className="mb-6">
              Are you sure you want to change the status of{' '}
              <span className="font-bold">
                "{statusChangeModal.departmentName}"
              </span>{' '}
              to{' '}
              <span
                className={`font-bold ${
                  statusChangeModal.newStatus === 'Active'
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {statusChangeModal.newStatus}
              </span>
              ?
            </p>
            <div className="flex justify-end gap-2 sm:gap-3">
              <button
                onClick={() =>
                  setStatusChangeModal({
                    show: false,
                    id: null,
                    newStatus: '',
                    departmentName: '',
                  })
                }
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded bg-gray-300 hover:bg-gray-400 text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={confirmStatusChange}
                className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded text-white text-sm sm:text-base ${
                  statusChangeModal.newStatus === 'Active'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {statusChangeModal.newStatus === 'Active' ? (
                  <Check size={16} />
                ) : (
                  <CloseIcon size={16} />
                )}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Members Modal */}
      {showMembersModal && (
        <div className="fixed inset-0 bg-black/30 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-2  flex justify-between items-center">
              <h3 className="text-lg font-medium">Team: {currentTeamName}</h3>
              <button 
                onClick={() => setShowMembersModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-2 overflow-y-auto">
              <h4 className="font-medium text-gray-700 mb-3">Team Members ({currentTeamMembers.length}):</h4>
              <ul className="space-y-2">
                {currentTeamMembers.map(member => (
                  <li 
                    key={member.id} 
                    className="flex items-center p-2 hover:bg-gray-50 rounded"
                    title={`${member.name} (${member.code || 'No code'})`}
                  >
                    <span className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full text-xs font-medium mr-3">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <div className="font-medium text-sm">{member.name}</div>
                      {member.code && (
                        <div className="text-xs text-gray-500">ID: {member.code}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {/* <div className="p-2 flex justify-end">
              <button
                onClick={() => setShowMembersModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div> */}
          </div>
        </div>
      )}
    </div>
  );
};

export default Team;