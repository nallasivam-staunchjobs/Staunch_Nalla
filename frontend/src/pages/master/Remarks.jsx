
import React, { useState, useEffect } from 'react';
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
// Assuming sampleMasterData is available in a file named SampleData.js
function Remarks() {
  useEffect(() => {
    const fetchRemarks = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/masters/remarks/`);
        const data = await response.json();
        setRemarks(data);
      } catch (error) {
        console.error("Error fetching remarks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRemarks();
  }, []);
  const [remarks, setRemarks] = useState([]);

  const [newRemark, setNewRemark] = useState('');
  const [loading, setLoading] = useState(true);

  const [newRemarkStatus, setNewRemarkStatus] = useState('Active');

  const [showAddModal, setShowAddModal] = useState(false);
  const [remarkToDelete, setRemarkToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingRemarkId, setEditingRemarkId] = useState(null);
  const [editRemarkValue, setEditRemarkValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusChangeModal, setStatusChangeModal] = useState({
    show: false,
    id: null,
    newStatus: '',
    remarkName: '', // Renamed from sourceName
  });
  const [editConfirmationModal, setEditConfirmationModal] = useState({
    show: false,
    id: null,
    currentRemarkName: '', // Renamed from currentName
  });

  // Function to show toast notifications
  const showToast = (message, type = 'success') => {
    toast[type](message);
  };

  // Handles adding a new remark

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = newRemark.trim();
    if (!trimmed) return;

    // Check for duplicate remark names in current list
    const isDuplicate = remarks.some(
      (item) => item.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      showToast('Remark already exists!', 'error');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/masters/remarks/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmed,
          status: newRemarkStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create remark');
      }

      const createdRemark = await response.json();

      // Add new remark to the beginning of the list
      setRemarks([createdRemark, ...remarks]);
      setNewRemark('');
      setNewRemarkStatus('Active');
      setShowAddModal(false);
      showToast(`${createdRemark.name} added successfully!`);
    } catch (error) {
      console.error('Error creating remark:', error);
      showToast('Error creating remark', 'error');
    }
  };

  // Handles initiating the delete confirmation modal
  const handleDelete = (id) => {
    setRemarkToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/masters/remarks/${remarkToDelete}/`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Delete failed');

      // Remove from local list
      const deletedItem = remarks.find((item) => item.id === remarkToDelete);
      setRemarks(remarks.filter((item) => item.id !== remarkToDelete));
      setShowDeleteModal(false);
      setRemarkToDelete(null);
      showToast(`${deletedItem?.name || 'Remark'} deleted successfully!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Error deleting remark', 'error');
    }
  };

  // Handles double-click to open edit confirmation modal
  const handleDoubleClick = (id, currentName) => {
    setEditConfirmationModal({
      show: true,
      id,
      currentRemarkName: currentName,
    });
  };

  // Starts the editing process after confirmation
  const startEditing = () => {
    setEditingRemarkId(editConfirmationModal.id);
    setEditRemarkValue(editConfirmationModal.currentRemarkName);
    setEditConfirmationModal({
      show: false,
      id: null,
      currentRemarkName: '',
    });
  };

  // Saves the edited remark name 

  const handleSaveEdit = async (id) => {
    const updatedName = editRemarkValue.trim();
    if (!updatedName) return;

    // Check for duplicate names during edit
    const isDuplicate = remarks.some(
      (item) =>
        item.id !== id && item.name.toLowerCase() === updatedName.toLowerCase()
    );
    if (isDuplicate) {
      showToast('Another remark with the same name already exists!', 'error');
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/masters/remarks/${id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: updatedName,
          status: remarks.find((item) => item.id === id)?.status, // retain existing status
        }),
      });

      if (!res.ok) throw new Error('Update failed');

      const updated = await res.json();

      // Update local state with updated record
      setRemarks(
        remarks.map((item) => (item.id === id ? updated : item))
      );

      setEditingRemarkId(null);
      setEditRemarkValue('');
      showToast(`${updated.name} updated successfully!`);
    } catch (err) {
      console.error(err);
      showToast('Error updating remark', 'error');
    }
  };

  // Cancels the editing process
  const cancelEdit = () => {
    setEditingRemarkId(null);
    setEditRemarkValue('');
  };

  // Shows the status change confirmation modal
  const showStatusChangeConfirmation = (id) => {
    const remark = remarks.find((item) => item.id === id);
    setStatusChangeModal({
      show: true,
      id,
      newStatus: remark.status === 'Active' ? 'Deactive' : 'Active',
      remarkName: remark.name,
    });
  };

  // Confirms and executes the status change
  // const confirmStatusChange = () => {
  //   const { id, newStatus } = statusChangeModal;
  //   setRemarks(
  //     remarks.map((item) =>
  //       item.id === id ? { ...item, status: newStatus } : item
  //     )
  //   );
  //   setStatusChangeModal({
  //     show: false,
  //     id: null,
  //     newStatus: '',
  //     remarkName: '',
  //   });
  //   showToast(`Status changed to ${newStatus} successfully!`);
  // };

  const confirmStatusChange = async () => {
    const { id, newStatus } = statusChangeModal;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/masters/remarks/${id}/`, {
        method: 'PATCH', // Use PUT to update only the status
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update status');

      const updated = await res.json();

      // Update local state with the updated remark
      setRemarks(
        remarks.map((item) => (item.id === id ? updated : item))
      );

      setStatusChangeModal({
        show: false,
        id: null,
        newStatus: '',
        remarkName: '',
      });

      showToast(`Status changed to ${newStatus} successfully!`);
    } catch (error) {
      console.error(error);
      showToast('Error changing status', 'error');
    }
  };



  // Filter remarks based on search term
  const filteredRemarks = remarks.filter((item) =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Count active and deactive remarks
  const activeCount = remarks.filter((item) => item.status === 'Active').length;
  const deactiveCount = remarks.filter(
    (item) => item.status === 'Deactive'
  ).length;

  // Calculate pagination details
  const totalPages = Math.ceil(filteredRemarks.length / entriesPerPage);
  const paginatedRemarks = filteredRemarks.slice(
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
    <div className="text-black font-sans"> {/* Added font-sans for better typography */}
      {/* Header Section */}
      <div className="bg-white p-[15px] rounded-[10px] shadow-sm flex flex-col sm:flex-row justify-between mb-4 items-start sm:items-center">
        <h1 className="text-lg font-bold mb-2 sm:mb-0">Remarks Management</h1>
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
            className="flex items-center gap-1 px-2 sm:px-3 py-1 text-xs sm:text-sm bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200 ease-in-out"
          >
            <PlusSquare size={14} />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>
      </div>

      {/* Toast Container for notifications */}
      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        draggable
        toastClassName="text-sm px-2 w-[300px] sm:w-[350px] rounded-lg shadow-lg"
      />

      {/* Main Content Area: Search and Table */}
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
              className="mx-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 px-2 py-1"
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
            placeholder="Search remark..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded px-2 sm:px-3 py-1 text-xs sm:text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
          />
        </div>

        {/* Responsive Table Container */}
        <div className="overflow-x-auto">
          <div className="min-w-full max-h-[calc(100vh-300px)] sm:max-h-[calc(100vh-250px)] overflow-y-auto scrollbar-desktop">
            <table className="w-full text-sm sm:text-sm text-left border border-gray-200 ">
              <thead className="bg-white text-xs uppercase text-black border-b border-gray-200 sticky top-0 z-10 ">
                <tr>
                  <th className="px-2 sm:px-4 py-2 text-start">S.No</th>
                  <th className="px-2 sm:px-4 py-2 text-start">Created</th>
                  <th className="px-2 sm:px-4 py-2 text-start">Remark</th>
                  <th className="px-2 sm:px-4 py-2 text-center">Status</th>
                  <th className="px-2 sm:px-4 py-2 text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRemarks.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4 text-gray-500">
                      <p className="text-md font-medium">
                        No remarks found
                      </p>
                      <p className="text-xs">
                        Try adjusting your search or filter criteria.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedRemarks.map((item, index) => (
                    <tr
                      key={item.id}
                      className="text-black border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150 ease-in-out"
                    >
                      <td className="px-2 sm:px-4 py-1.5 w-4">
                        {(currentPage - 1) * entriesPerPage + index + 1}
                      </td>
                      <td className="px-2 sm:px-4 py-1.5 w-1/4 text-xs">
                        {formatDate(item.created_at)}
                      </td>
                      <td
                        className="px-2 sm:px-4 py-1.5 w-1/4"
                        onDoubleClick={() => handleDoubleClick(item.id, item.name)}
                      >
                        {editingRemarkId === item.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              value={editRemarkValue}
                              onChange={(e) => setEditRemarkValue(e.target.value)}
                              className="rounded px-2 py-1 border border-gray-300 w-full max-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(item.id);
                                if (e.key === 'Escape') cancelEdit();
                              }}
                            />
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              className="text-green-600 hover:text-green-800 p-1 rounded-full hover:bg-green-100 transition-all duration-200"
                              title="Save"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100 transition-all duration-200"
                              title="Cancel"
                            >
                              <CloseIcon size={16} />
                            </button>
                          </div>
                        ) : (
                          item.name
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-1.5 w-1/4 text-center">
                        <button
                          onClick={() => showStatusChangeConfirmation(item.id)}
                          className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 mx-auto transition-colors duration-200 ease-in-out ${item.status === 'Active'
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${item.status === 'Active'
                              ? 'bg-green-500'
                              : 'bg-red-500'
                              }`}
                          ></span>
                          {item.status}
                        </button>
                      </td>
                      <td className="px-2 sm:px-4 py-1.5  text-end">
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

        {/* Pagination Controls */}
        {filteredRemarks.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-2 py-2 sm:px-4 sm:py-3">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors duration-200"
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
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors duration-200"
              >
                Next
              </button>
            </div>

            {/* Desktop Pagination */}
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
                      filteredRemarks.length
                    )}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{filteredRemarks.length}</span>{' '}
                  results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-xs" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-md px-1.5 py-1.5 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-colors duration-200"
                    title="First Page"
                  >
                    <span className="sr-only">First</span>
                    <ChevronLeft className="size-3 sm:size-4" />
                    <ChevronLeft className="size-3 sm:size-4 -ml-1 sm:-ml-2" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-1.5 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-colors duration-200"
                    title="Previous Page"
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeft className="size-3 sm:size-4" />
                  </button>

                  {/* Page number buttons with ellipsis logic */}
                  {(() => {
                    const pages = [];
                    const siblings = 1; // Number of page links to show on each side of the current page

                    // Determine if ellipses are needed
                    const showLeftEllipsis = currentPage > siblings + 2;
                    const showRightEllipsis = currentPage < totalPages - (siblings + 1);

                    // Calculate start and end for middle pages
                    let startPage = Math.max(2, currentPage - siblings);
                    let endPage = Math.min(totalPages - 1, currentPage + siblings);

                    // Adjust start/end if ellipses are only on one side
                    if (!showLeftEllipsis && showRightEllipsis) {
                      endPage = Math.min(totalPages - 1, 1 + 2 * siblings + 1);
                    } else if (showLeftEllipsis && !showRightEllipsis) {
                      startPage = Math.max(2, totalPages - (2 * siblings + 1));
                    }

                    // Always show first page if total pages > 0
                    if (totalPages > 0) {
                      pages.push(
                        <button
                          key={1}
                          onClick={() => setCurrentPage(1)}
                          className={`relative inline-flex items-center px-2.5 text-xs sm:text-sm font-semibold ${currentPage === 1
                            ? 'z-10 bg-blue-600 text-white focus-visible:outline-blue-600'
                            : 'text-gray-900 ring-1 ring-gray-300 ring-inset hover:bg-gray-50'
                            } transition-colors duration-200`}
                        >
                          1
                        </button>
                      );
                    }


                    // Left ellipsis
                    if (showLeftEllipsis) {
                      pages.push(
                        <span
                          key="left-ellipsis"
                          className="relative inline-flex items-center px-2.5 text-xs sm:text-sm font-semibold text-gray-700 ring-1 ring-gray-300 ring-inset"
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
                          className={`relative inline-flex items-center px-2.5 text-xs sm:text-sm font-semibold ${i === currentPage
                            ? 'z-10 bg-blue-600 text-white focus-visible:outline-blue-600'
                            : 'text-gray-900 ring-1 ring-gray-300 ring-inset hover:bg-gray-50'
                            } transition-colors duration-200`}
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
                          className="relative inline-flex items-center px-2.5 text-xs sm:text-sm font-semibold text-gray-700 ring-1 ring-gray-300 ring-inset"
                        >
                          ...
                        </span>
                      );
                    }

                    // Always show last page if total pages > 1
                    if (totalPages > 1) {
                      pages.push(
                        <button
                          key={totalPages}
                          onClick={() => setCurrentPage(totalPages)}
                          className={`relative inline-flex items-center px-2.5 text-xs sm:text-sm font-semibold ${currentPage === totalPages
                            ? 'z-10 bg-blue-600 text-white focus-visible:outline-blue-600'
                            : 'text-gray-900 ring-1 ring-gray-300 ring-inset hover:bg-gray-50'
                            } transition-colors duration-200`}
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
                    className="relative inline-flex items-center px-1.5 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-colors duration-200"
                    title="Next Page"
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRight className="size-3 sm:size-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-r-md px-1.5 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-colors duration-200"
                    title="Last Page"
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

      {/* Add Remark Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white text-black rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-lg mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Add New Remark</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors duration-200"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="newRemark" className="block text-sm font-medium mb-1">Remark</label>
                <input
                  type="text"
                  id="newRemark"
                  placeholder="Enter Remark"
                  value={newRemark}
                  onChange={(e) => setNewRemark(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-black placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded bg-gray-300 hover:bg-gray-400 text-sm sm:text-base transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded bg-green-600 text-white hover:bg-green-700 text-sm sm:text-base transition-colors duration-200"
                >
                  <PlusSquare size={16} />
                  Add Remark
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Remark Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white text-black rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-md mx-auto">
            <h2 className="text-lg font-bold mb-4">Confirm Delete</h2>
            <p className="mb-6">
              Are you sure you want to delete{' '}
              <span className="font-bold ms-1">
                {remarks.find((item) => item.id === remarkToDelete)?.name ||
                  'this Remark'}
              </span>
              ?
            </p>
            <div className="flex justify-end gap-2 sm:gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded bg-gray-300 hover:bg-gray-400 text-sm sm:text-base transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded bg-red-600 text-white hover:bg-red-700 text-sm sm:text-base transition-colors duration-200"
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
                "{statusChangeModal.remarkName}"
              </span>{' '}
              to{' '}
              <span
                className={`font-bold ${statusChangeModal.newStatus === 'Active'
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
                    remarkName: '',
                  })
                }
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded bg-gray-300 hover:bg-gray-400 text-sm sm:text-base transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmStatusChange}
                className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded text-white text-sm sm:text-base transition-colors duration-200 ${statusChangeModal.newStatus === 'Active'
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
            <h2 className="text-lg font-bold mb-4">Edit Remark</h2>
            <p className="mb-6">
              Do you want to edit the remark{' '}
              <span className="font-bold">
                "{editConfirmationModal.currentRemarkName}"
              </span>
              ?
            </p>
            <div className="flex justify-end gap-2 sm:gap-3">
              <button
                onClick={() => setEditConfirmationModal({
                  show: false,
                  id: null,
                  currentRemarkName: '',
                })}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded bg-gray-300 hover:bg-gray-400 text-sm sm:text-base transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={startEditing}
                className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm sm:text-base transition-colors duration-200"
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

export default Remarks;


