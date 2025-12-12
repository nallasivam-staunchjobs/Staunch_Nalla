import React, { useState,useEffect } from 'react';
import 'react-toastify/dist/ReactToastify.css';
import { toast, ToastContainer } from 'react-toastify';
import {
  PlusSquare,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  X as CloseIcon,
} from 'lucide-react';

// Assuming SampleData.js exists and exports a default array of objects
// Each object should have a 'department' property
// const sampleMasterData = [
//   { department: 'Engineering' },
//   { department: 'Human Resources' },
//   { department: 'Marketing' },
//   { department: 'Sales' },
//   { department: 'Finance' },
//   { department: 'Operations' },
//   { department: 'Customer Service' },
//   { department: 'Product Management' },
//   { department: 'Research & Development' },
//   { department: 'Legal' },
//   { department: 'IT Support' },
//   { department: 'Design' },
//   { department: 'Quality Assurance' },
//   { department: 'Business Development' },
//   { department: 'Public Relations' },
// ];


function Department() {
  // Initialize departments state from sampleMasterData, mapping 'department' to 'name'


  useEffect(() => {
  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/masters/departments/`);
      const data = await response.json();
      setDepartments(data);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  fetchDepartments();
}, []);

  // State for adding new department
  const [departments, setDepartments] = useState([]);
  const [newDepartment, setNewDepartment] = useState('');
  const [newDepartmentStatus, setNewDepartmentStatus] = useState('Active');
  const [showAddModal, setShowAddModal] = useState(false);

  // State for deleting department
  const [departmentToDelete, setDepartmentToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // State for editing department
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  // State for search functionality
  const [searchTerm, setSearchTerm] = useState('');

  // State for status change confirmation modal
  const [statusChangeModal, setStatusChangeModal] = useState({
    show: false,
    id: null,
    newStatus: '',
    departmentName: '', // Renamed from designationName
  });

  // State for edit confirmation modal (before starting actual edit)
  const [editConfirmationModal, setEditConfirmationModal] = useState({
    show: false,
    id: null,
    currentName: '',
  });

  // Helper function to display toast notifications
  const showToast = (message, type = 'success') => {
    toast[type](message);
  };

  // Handles adding a new department
  // const handleSubmit = (e) => {
  //   e.preventDefault();
  //   const trimmed = newDepartment.trim();
  //   if (!trimmed) return; // Prevent adding empty department names

  //   // Check for duplicate department names (case-insensitive)
  //   const isDuplicate = departments.some(
  //     (item) => item.name.toLowerCase() === trimmed.toLowerCase()
  //   );
  //   if (isDuplicate) {
  //     showToast('Department already exists!', 'error');
  //     return;
  //   }

  //   // Create new department object
  //   const newEntry = {
  //     id: Date.now(), // Unique ID
  //     name: trimmed,
  //     status: newDepartmentStatus,
  //     createdAt: new Date().toISOString(),
  //   };

  //   setDepartments([newEntry, ...departments]); // Add new department to the beginning of the list
  //   setNewDepartment(''); // Clear input field
  //   setNewDepartmentStatus('Active'); // Reset status
  //   setShowAddModal(false); // Close modal
  //   showToast(`${newEntry.name} added successfully!`); // Show success toast
  // };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = newDepartment.trim();
    if (!trimmed) return;

    const isDuplicate = departments.some(
      (item) => item.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      showToast('Department already exists!', 'error');
      return;
    }

    const payload = {
      name: trimmed,
      status: newDepartmentStatus,
    };

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/masters/departments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to add department');
      const newEntry = await res.json();
      setDepartments([newEntry, ...departments]);
      setNewDepartment('');
      setNewDepartmentStatus('Active');
      setShowAddModal(false);
      showToast(`${newEntry.name} added successfully!`);
    } catch (err) {
      console.error(err);
      showToast('Failed to add department', 'error');
    }
  };


  // Initiates the delete process by setting the department to delete and showing the modal
  const handleDelete = (id) => {
    setDepartmentToDelete(id);
    setShowDeleteModal(true);
  };

  // Confirms and performs the deletion of a department
  // const confirmDelete = () => {
  //   const deletedItem = departments.find((item) => item.id === departmentToDelete);
  //   setDepartments(departments.filter((item) => item.id !== departmentToDelete)); // Filter out the deleted department
  //   setShowDeleteModal(false); // Close modal
  //   setDepartmentToDelete(null); // Clear department to delete
  //   showToast(
  //     `${deletedItem?.name || 'Department'} deleted successfully!`,
  //     'error'
  //   ); // Show success/error toast
  // };

  const confirmDelete = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/masters/departments/${departmentToDelete}/`,
        {
          method: 'DELETE',
        }
      );
      if (!res.ok) throw new Error('Delete failed');
      // Remove from local list
      const deletedItem = departments.find((item) => item.id === departmentToDelete);
      setDepartments(departments.filter((item) => item.id !== departmentToDelete));
      setShowDeleteModal(false);
      setDepartmentToDelete(null);
      showToast(`${deletedItem?.name || 'Department'} deleted successfully!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Error deleting department', 'error');
    }
  };

  // Handles double click on a department name to show edit confirmation modal
  const handleDoubleClick = (id, currentName) => {
    setEditConfirmationModal({
      show: true,
      id,
      currentName,
    });
  };

  // Starts the actual editing process after confirmation
  const startEditing = () => {
    setEditingId(editConfirmationModal.id); // Set the ID of the department being edited
    setEditValue(editConfirmationModal.currentName); // Populate input with current name
    setEditConfirmationModal({
      show: false,
      id: null,
      currentName: '',
    }); // Close confirmation modal
  };

  // Saves the edited department name
  // const handleSaveEdit = (id) => {
  //   const updatedName = editValue.trim();
  //   if (!updatedName) return; // Prevent saving empty names

  //   // Check for duplicate department names (excluding the current department being edited)
  //   const isDuplicate = departments.some(
  //     (item) =>
  //       item.id !== id && item.name.toLowerCase() === updatedName.toLowerCase()
  //   );
  //   if (isDuplicate) {
  //     showToast('Another department with the same name already exists!', 'error');
  //     return;
  //   }

  //   // Update the department name in the state
  //   setDepartments(
  //     departments.map((item) =>
  //       item.id === id ? { ...item, name: updatedName } : item
  //     )
  //   );

  //   setEditingId(null); // Exit editing mode
  //   setEditValue(''); // Clear edit input
  //   showToast(`${updatedName} updated successfully!`); // Show success toast
  // };

  const handleSaveEdit = async (id) => {
    const updatedName = editValue.trim();
    if (!updatedName) return; // Prevent saving empty names

    // Check for duplicate department names (excluding the current department being edited)
    const isDuplicate = departments.some(
      (item) =>
        item.id !== id && item.name.toLowerCase() === updatedName.toLowerCase()
    );
    if (isDuplicate) {
      showToast('Another department with the same name already exists!', 'error');
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/masters/departments/${id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: updatedName,
          status: departments.find((item) => item.id === id)?.status, // retain current status
        }),
      });

      if (!res.ok) throw new Error('Update failed');

      const updated = await res.json();

      setDepartments(
        departments.map((item) =>
          item.id === id ? updated : item
        )
      );

      setEditingId(null); // Exit editing mode
      setEditValue(''); // Clear input
      showToast(`${updated.name} updated successfully!`);
    } catch (err) {
      console.error(err);
      showToast('Error updating department', 'error');
    }
  };


  // Cancels the editing process
  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  // Shows the status change confirmation modal
  const showStatusChangeConfirmation = (id) => {
    const department = departments.find((item) => item.id === id);
    setStatusChangeModal({
      show: true,
      id,
      newStatus: department.status === 'Active' ? 'Deactive' : 'Active', // Toggle status
      departmentName: department.name, // Pass department name for display
    });
  };

  // Confirms and performs the status change
  // const confirmStatusChange = () => {
  //   const { id, newStatus } = statusChangeModal;
  //   setDepartments(
  //     departments.map((item) =>
  //       item.id === id ? { ...item, status: newStatus } : item
  //     )
  //   );
  //   setStatusChangeModal({
  //     show: false,
  //     id: null,
  //     newStatus: '',
  //     departmentName: '',
  //   }); // Close modal and reset state
  //   showToast(`Status changed to ${newStatus} successfully!`); // Show success toast
  // };

  const confirmStatusChange = async () => {
    const { id, newStatus } = statusChangeModal;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/masters/departments/${id}/`, {
        method: 'PATCH', // PATCH to partially update only the status
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update status');

      const updated = await res.json();

      // Update the department in local state
      setDepartments(
        departments.map((item) => (item.id === id ? updated : item))
      );

      // Close modal and reset state
      setStatusChangeModal({
        show: false,
        id: null,
        newStatus: '',
        departmentName: '',
      });

      showToast(`Status changed to ${newStatus} successfully!`);
    } catch (error) {
      console.error(error);
      showToast('Error changing department status', 'error');
    }
  };

  // Filter departments based on search term
  const filteredDepartments = departments.filter((item) =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Count active and deactive departments
  const activeCount = departments.filter((item) => item.status === 'Active').length;
  const deactiveCount = departments.filter(
    (item) => item.status === 'Deactive'
  ).length;

  // Calculate total pages for pagination
  const totalPages = Math.ceil(filteredDepartments.length / entriesPerPage);
  // Get departments for the current page
  const paginatedDepartments = filteredDepartments.slice(
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
        <h1 className="text-lg font-bold">Department Management</h1>
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
                setCurrentPage(1); // Reset to first page on entries per page change
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
            placeholder="Search department..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page on search
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
                  <th className="px-2 sm:px-4 py-2 text-start">Department</th>
                  <th className="px-2 sm:px-4 py-2 text-center">Status</th>
                  <th className="px-2 sm:px-4 py-2 text-end">Action</th>
                </tr>
              </thead>
              {/* Table body */}
              <tbody>
                {paginatedDepartments.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4 text-gray-500">
                      <p className="text-md font-medium">
                        No departments found
                      </p>
                      <p className="text-xs">
                        Try adjusting your search or filter criteria.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedDepartments.map((item, index) => (
                    <tr
                      key={item.id}
                      className="text-black border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-2 sm:px-4 py-1.5 w-4">
                        {(currentPage - 1) * entriesPerPage + index + 1}
                      </td>
                      <td className="px-2 sm:px-4 py-1.5 w-1/4 text-xs">
                        {formatDate(item.created_at)}
                      </td>
                      {/* Department name cell with double-click for editing */}
                      <td
                        className="px-2 sm:px-4 py-1.5 w-1/4"
                        onDoubleClick={() => handleDoubleClick(item.id, item.name)}
                      >
                        {editingId === item.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="rounded px-2 py-1 border border-gray-300 w-full max-w-[200px]"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(item.id);
                                if (e.key === 'Escape') cancelEdit();
                              }}
                            />
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              className="text-green-600 hover:text-green-800"
                              title="Save"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-red-600 hover:text-red-800"
                              title="Cancel"
                            >
                              <CloseIcon size={16} />
                            </button>
                          </div>
                        ) : (
                          item.name
                        )}
                      </td>
                      {/* Status button */}
                      <td className="px-2 sm:px-4 py-1.5 w-1/4 text-center">
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
                      {/* Action (Delete) button */}
                      <td className="px-2 sm:px-4 py-1.5 w-1/4 text-end">
                        <div className="flex justify-end">
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
        {filteredDepartments.length > 0 && (
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
                      filteredDepartments.length
                    )}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{filteredDepartments.length}</span>{' '}
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
                    const siblings = 1; // Number of page numbers to show around the current page

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

      {/* Add Department Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white text-black rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-md mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Add New Department</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Department</label>
                <input
                  type="text"
                  placeholder="Enter Department"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black placeholder:text-gray-500 outline-none"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded bg-gray-300 hover:bg-gray-400 text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded bg-green-600 text-white hover:bg-green-700 text-sm sm:text-base"
                >
                  <PlusSquare size={16} />
                  Add Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Department Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white text-black rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-md mx-auto">
            <h2 className="text-lg font-bold mb-4">Confirm Delete</h2>
            <p className="mb-6">
              Are you sure you want to delete{' '}
              <span className="font-bold ms-1">
                {departments.find((item) => item.id === departmentToDelete)?.name ||
                  'this Department'}
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

      {/* Edit Confirmation Modal */}
      {editConfirmationModal.show && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white text-black rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-md mx-auto">
            <h2 className="text-lg font-bold mb-4">Edit Department</h2>
            <p className="mb-6">
              Do you want to edit the department{' '}
              <span className="font-bold">
                "{editConfirmationModal.currentName}"
              </span>
              ?
            </p>
            <div className="flex justify-end gap-2 sm:gap-3">
              <button
                onClick={() => setEditConfirmationModal({
                  show: false,
                  id: null,
                  currentName: '',
                })}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded bg-gray-300 hover:bg-gray-400 text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={startEditing}
                className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm sm:text-base"
              >
                <Check size={16} />
                Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Department;
