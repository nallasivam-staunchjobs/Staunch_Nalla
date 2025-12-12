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

// const sampleMasterData = [
//   { 'Blood Group': 'A+' },
//   { 'Blood Group': 'A-' },
//   { 'Blood Group': 'B+' },
//   { 'Blood Group': 'B-' },
//   { 'Blood Group': 'AB+' },
//   { 'Blood Group': 'AB-' },
//   { 'Blood Group': 'O+' },
//   { 'Blood Group': 'O-' },
// ];


function BloodGroup() {
  // Initialize bloodgroups state from sampleMasterData, mapping 'Blood Group' to 'name'
  // const [bloodgroups, setbloodgroups] = useState(() =>
  //   sampleMasterData.map((item, index) => ({
  //     id: Date.now() + index, // Unique ID for each Blood Group
  //     name: item['Blood Group'], // 'Blood Group' from sample data becomes 'name' for Blood Group
  //     status: 'Active', // Default status
  //     createdAt: new Date().toISOString(), // Creation timestamp
  //   }))
  // );
  
  const [bloodgroups, setBloodgroups] = useState([]);

  useEffect(() => {
    const fetchBloodgroups = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/masters/bloodgroups/`
        );
        if (!res.ok) throw new Error("Failed to fetch Blood Groups");
        const data = await res.json();
        setBloodgroups(data); // Replace local sample data with API data
      } catch (err) {
        console.error("Failed to fetch Blood Groups:", err);
      }
    };

    fetchBloodgroups();
  }, []);

  // State for adding new Blood Group
  const [newBloodgroup, setnewBloodgroup] = useState('');
  const [newbloodgroupstatus, setNewbloodgroupstatus] = useState('Active');
  const [showAddModal, setShowAddModal] = useState(false);

  // State for deleting Blood Group
  const [bloodgroupToDelete, setBloodgroupToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // State for editing Blood Group
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

  // Handles adding a new Blood Group
  // const handleSubmit = (e) => {
  //   e.preventDefault();
  //   const trimmed = newBloodgroup.trim();
  //   if (!trimmed) return; // Prevent adding empty Blood Group names

  //   // Check for duplicate Blood Group names (case-insensitive)
  //   const isDuplicate = bloodgroups.some(
  //     (item) => item.name.toLowerCase() === trimmed.toLowerCase()
  //   );
  //   if (isDuplicate) {
  //     showToast('Blood Group already exists!', 'error');
  //     return;
  //   }

  //   // Create new Blood Group object
  //   const newEntry = {
  //     id: Date.now(), // Unique ID
  //     name: trimmed,
  //     status: newbloodgroupstatus,
  //     createdAt: new Date().toISOString(),
  //   };

  //   setbloodgroups([newEntry, ...bloodgroups]); // Add new Blood Group to the beginning of the list
  //   setnewBloodgroup(''); // Clear input field
  //   setNewbloodgroupstatus('Active'); // Reset status
  //   setShowAddModal(false); // Close modal
  //   showToast(`${newEntry.name} added successfully!`); // Show success toast
  // };

const handleSubmit = async (e) => {
  e.preventDefault();
  const trimmed = newBloodgroup.trim();
  if (!trimmed) return; // prevent empty names

  // Check duplicate (case-insensitive)
  const isDuplicate = bloodgroups.some(
    (item) => item.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (isDuplicate) {
    showToast('Blood Group already exists!', 'error');
    return;
  }

  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/masters/bloodgroups/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: trimmed,
        status: newbloodgroupstatus
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Failed to add Blood Group. Status: ${res.status}, Response: ${errorText}`);
      throw new Error('Failed to add Blood Group');
    }

    const newEntry = await res.json();
    setBloodgroups([newEntry, ...bloodgroups]); // add new at top
    setnewBloodgroup(''); // clear input
    setNewbloodgroupstatus('Active'); // reset status
    setShowAddModal(false); // close modal
    showToast(`${newEntry.name} added successfully!`);
  } catch (err) {
    console.error(err);
    showToast('Error adding Blood Group', 'error');
  }
};

  // Initiates the delete process by setting the Blood Group to delete and showing the modal
  const handleDelete = (id) => {
    setBloodgroupToDelete(id);
    setShowDeleteModal(true);
  };

  // Confirms and performs the deletion of a Blood Group
const confirmDelete = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/masters/bloodgroups/${bloodgroupToDelete}/`,
        {
          method: 'DELETE',
        }
      );

      if (!res.ok) throw new Error('Delete failed');

      const deletedItem = bloodgroups.find(
        (item) => item.id === bloodgroupToDelete
      );

      setBloodgroups(bloodgroups.filter((item) => item.id !== bloodgroupToDelete));
      setShowDeleteModal(false);
      setBloodgroupToDelete(null);

      showToast(
        `${deletedItem?.name || 'Blood Group'} deleted successfully!`,
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast('Error deleting blood group', 'error');
    }
  };

  // Handles double click on a Blood Group name to show edit confirmation modal
  const handleDoubleClick = (id, currentName) => {
    setEditConfirmationModal({
      show: true,
      id,
      currentName,
    });
  };

  // Starts the actual editing process after confirmation
  const startEditing = () => {
    setEditingId(editConfirmationModal.id); // Set the ID of the Blood Group being edited
    setEditValue(editConfirmationModal.currentName); // Populate input with current name
    setEditConfirmationModal({
      show: false,
      id: null,
      currentName: '',
    }); // Close confirmation modal
  };

  // Saves the edited Blood Group name
  // const handleSaveEdit = (id) => {
  //   const updatedName = editValue.trim();
  //   if (!updatedName) return; // Prevent saving empty names

  //   // Check for duplicate Blood Group names (excluding the current Blood Group being edited)
  //   const isDuplicate = bloodgroups.some(
  //     (item) =>
  //       item.id !== id && item.name.toLowerCase() === updatedName.toLowerCase()
  //   );
  //   if (isDuplicate) {
  //     showToast('Another Blood Group with the same name already exists!', 'error');
  //     return;
  //   }

  //   // Update the Blood Group name in the state
  //   setbloodgroups(
  //     bloodgroups.map((item) =>
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

  // Check for duplicate Blood Group names (excluding the one being edited)
  const isDuplicate = bloodgroups.some(
    (item) =>
      item.id !== id && item.name.toLowerCase() === updatedName.toLowerCase()
  );
  if (isDuplicate) {
    showToast('Another Blood Group with the same name already exists!', 'error');
    return;
  }

  try {
    // Prepare payload
    const currentStatus = bloodgroups.find((item) => item.id === id)?.status;
    const bodyPayload = { name: updatedName };
    if (currentStatus) bodyPayload.status = currentStatus;

    const res = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/masters/bloodgroups/${id}/`,
      {
        method: 'PATCH', // Using PATCH for partial update
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Update failed with status ${res.status}: ${errorText}`);
      throw new Error('Update failed');
    }

    const updated = await res.json();

    // Update state with API response
    setBloodgroups(
      bloodgroups.map((item) => (item.id === id ? updated : item))
    );

    setEditingId(null);
    setEditValue('');
    showToast(`${updated.name} updated successfully!`);
  } catch (err) {
    console.error('Error:', err);
    showToast('Error updating blood group', 'error');
  }
};


  // Cancels the editing process
  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  // Shows the status change confirmation modal
  const showStatusChangeConfirmation = (id) => {
    const bloodGroup = bloodgroups.find((item) => item.id === id);
    setStatusChangeModal({
      show: true,
      id,
      newStatus: bloodGroup.status === 'Active' ? 'Deactive' : 'Active', // Toggle status
      departmentName: bloodGroup.name, // Pass Blood Group name for display
    });
  };

  // Confirms and performs the status change
  // const confirmStatusChange = () => {
  //   const { id, newStatus } = statusChangeModal;
  //   setbloodgroups(
  //     bloodgroups.map((item) =>
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

  // const confirmStatusChange = async () => {
  //   const { id, newStatus } = statusChangeModal;

  //   try {
  //     const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/masters/bloodgroups/${id}/`, {
  //       method: 'PATCH',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ status: newStatus }),
  //     });

  //     if (!res.ok) throw new Error('Status update failed');

  //     const updated = await res.json();

  //     // Update the bloodgroups state after a successful API call
  //     setbloodgroups(
  //       bloodgroups.map((item) => (item.id === id ? updated : item))
  //     );

  //     // Close modal and reset state
  //     setStatusChangeModal({
  //       show: false,
  //       id: null,
  //       newStatus: '',
  //       departmentName: '',
  //     });

  //     showToast(`Status changed to ${newStatus} successfully!`);
  //   } catch (err) {
  //     console.error(err);
  //     showToast('Error changing status', 'error');
  //   }
  // };

  const confirmStatusChange = async () => {
    const { id, newStatus } = statusChangeModal;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/masters/bloodgroups/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Status update failed: ${res.status} - ${errorText}`);
        throw new Error('Status update failed');
      }

      const updated = await res.json();

      setBloodgroups(
        bloodgroups.map((item) => (item.id === id ? updated : item))
      );

      setStatusChangeModal({
        show: false,
        id: null,
        newStatus: '',
        // remove departmentName if not relevant here
      });

      showToast(`Status changed to ${newStatus} successfully!`);
    } catch (err) {
      console.error(err);
      showToast('Error changing status', 'error');
    }
  };



  // Filter bloodgroups based on search term
  const filteredbloodgroups = bloodgroups.filter((item) =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Count active and deactive bloodgroups
  const activeCount = bloodgroups.filter((item) => item.status === 'Active').length;
  const deactiveCount = bloodgroups.filter(
    (item) => item.status === 'Deactive'
  ).length;

  // Calculate total pages for pagination
  const totalPages = Math.ceil(filteredbloodgroups.length / entriesPerPage);
  // Get bloodgroups for the current page
  const paginatedbloodgroups = filteredbloodgroups.slice(
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
        <h1 className="text-lg font-bold">Blood Group Management</h1>
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
            placeholder="Search Blood Group..."
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
                  <th className="px-2 sm:px-4 py-2 text-start">Blood Group</th>
                  <th className="px-2 sm:px-4 py-2 text-center">Status</th>
                  <th className="px-2 sm:px-4 py-2 text-end">Action</th>
                </tr>
              </thead>
              {/* Table body */}
              <tbody>
                {paginatedbloodgroups.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4 text-gray-500">
                      <p className="text-md font-medium">
                        No bloodgroups found
                      </p>
                      <p className="text-xs">
                        Try adjusting your search or filter criteria.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedbloodgroups.map((item, index) => (
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
                      {/* Blood Group name cell with double-click for editing */}
                      <td
                        className="px-2 sm:px-4 py-1.5"
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
                      {/* Action (Delete) button */}
                      <td className="px-2 sm:px-4 py-1.5 text-end">
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
        {filteredbloodgroups.length > 0 && (
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
                      filteredbloodgroups.length
                    )}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{filteredbloodgroups.length}</span>{' '}
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

      {/* Add Blood Group Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white text-black rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-md mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Add New Blood Group</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Blood Group</label>
                <input
                  type="text"
                  placeholder="Enter Blood Group"
                  value={newBloodgroup}
                  onChange={(e) => setnewBloodgroup(e.target.value)}
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
                  Add Blood Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Blood Group Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white text-black rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-md mx-auto">
            <h2 className="text-lg font-bold mb-4">Confirm Delete</h2>
            <p className="mb-6">
              Are you sure you want to delete{' '}
              <span className="font-bold ms-1">
                {bloodgroups.find((item) => item.id === bloodgroupToDelete)?.name ||
                  'this Blood Group'}
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
            <h2 className="text-lg font-bold mb-4">Edit Blood Group</h2>
            <p className="mb-6">
              Do you want to edit the Blood Group{' '}
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

export default BloodGroup;