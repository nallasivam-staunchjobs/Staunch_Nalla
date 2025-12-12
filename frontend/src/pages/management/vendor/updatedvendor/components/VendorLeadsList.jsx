import React, { useState } from 'react';
import {
  Search,
  Filter,
  Edit,
  Trash2,
  ArrowRight,
  Eye,
  Calendar,
  Mail,
  Phone,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  UserPlus,
} from 'lucide-react';
import StatusModal from './StatusModal';

const VendorLeadsList = ({
  leads,
  onEdit,
  onDelete,
  onConvert,
  onUpdateStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [companyTypeFilter, setCompanyTypeFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusChangeLead, setStatusChangeLead] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleDeleteClick = (leadId) => {
    setLeadToDelete(leadId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete(leadToDelete);
    setShowDeleteConfirm(false);
  };

  const statusOptions = [
    { value: 'all', label: 'All Status', count: leads.length },
    {
      value: 'pending',
      label: 'Pending',
      count: leads.filter((l) => l.status === 'pending').length,
    },
    {
      value: 'verified',
      label: 'Verified',
      count: leads.filter((l) => l.status === 'verified').length,
    },
    {
      value: 'converted',
      label: 'Converted',
      count: leads.filter((l) => l.status === 'converted').length,
    },
    {
      value: 'rejected',
      label: 'Rejected',
      count: leads.filter((l) => l.status === 'rejected').length,
    },
  ];

  const companyTypes = [
    'all',
    ...new Set(leads.map((lead) => lead.company_type)),
  ];

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      (lead.vendor_name?.toLowerCase() || '').includes(
        searchTerm.toLowerCase()
      ) ||
      (lead.contact_person?.toLowerCase() || '').includes(
        searchTerm.toLowerCase()
      ) ||
      (lead.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || lead.status === statusFilter;
    const matchesCompanyType =
      companyTypeFilter === 'all' || lead.company_type === companyTypeFilter;

    return matchesSearch && matchesStatus && matchesCompanyType;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-green-100 text-green-800',
      converted: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses[status]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const handleStatusModalOpen = (lead) => {
    setStatusChangeLead(lead);
    setShowStatusModal(true);
  };

  const handleStatusSubmit = async (newStatus) => {
    if (!statusChangeLead) return;
    try {
      await onUpdateStatus(statusChangeLead.id, newStatus);
    } catch (err) {
      // Surface a minimal error; detailed logging handled upstream
      console.error('Failed to update lead status:', err);
    } finally {
      // Proactively close and reset after submitting to avoid stale state
      setShowStatusModal(false);
      setStatusChangeLead(null);
    }
  };

  const handleViewLead = (lead) => {
    setSelectedLead(lead);
    setShowViewModal(true);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const ActionButtons = ({ lead }) => {
    return (
      <div className="flex items-center ">
        <button
          onClick={() => handleViewLead(lead)}
          className="p-1 rounded-full transition-all duration-100 hover:bg-blue-100/50 hover:scale-110 group"
          title="View Details"
        >
          <Eye className="w-3.5 h-3.5 text-blue-600 transition-all duration-300 group-hover:text-blue-700 group-hover:scale-110" />
        </button>

        <button
          onClick={() => onEdit(lead)}
          className="p-1  hover:bg-gray-100/50 hover:scale-110 group rounded-full transition-all duration-100 "
          title="Edit Lead"
        >
          <Edit className="w-3.5 h-3.5 text-gray-600 transition-all duration-300 group-hover:text-gray-700 group-hover:scale-110" />
        </button>

        <button
          onClick={() => handleStatusModalOpen(lead)}
          className="p-1 hover:bg-orange-100/50  rounded-full transition-all duration-100 hover:scale-110 group"
          title="Change Status"
        >
          <Settings className="w-3.5 h-3.5 text-orange-600 transition-all duration-300 group-hover:text-orange-700 group-hover:scale-110" />
        </button>

        {lead.status === 'verified' && (
          <button
            onClick={() => onConvert(lead)}
            className="p-1  hover:bg-green-100/50 rounded-full transition-all duration-100 hover:scale-110 group"
            title="Convert to Vendor"
          >
            <ArrowRight className="w-3.5 h-3.5 text-green-600 transition-all duration-300 group-hover:text-green-700 group-hover:scale-110" />
          </button>
        )}

        <button
          onClick={() => handleDeleteClick(lead.id)}
          className="p-1  hover:bg-red-100/50 rounded-full transition-all duration-100 hover:scale-110 group"
          title="Delete Lead"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-600 transition-all duration-300 group-hover:text-red-700 group-hover:scale-110" />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {/* Header with Search and Filters */}

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statusOptions.slice(1).map((status) => (
          <div
            key={status.value}
            className="bg-white rounded-lg shadow-sm border border-gray-100 p-2"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {status.label}
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {status.count}
                </p>
              </div>
              <div
                className={`w-3 h-3 rounded-full ${status.value === 'pending'
                    ? 'bg-yellow-400'
                    : status.value === 'verified'
                      ? 'bg-green-400'
                      : status.value === 'converted'
                        ? 'bg-blue-400'
                        : 'bg-red-400'
                  }`}
              ></div>
            </div>
          </div>
        ))}
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
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1); // Reset to first page when searching
                  }}
                  className="pl-8 text-xs w-full rounded border border-gray-300 py-2 shadow-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Status and Company Type filters - only visible when filters are open */}
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
                    value={companyTypeFilter}
                    onChange={(e) => {
                      setCompanyTypeFilter(e.target.value);
                      setCurrentPage(1); // Reset to first page when filtering
                    }}
                    className="text-xs rounded border border-gray-300 py-2 px-4 shadow-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">All Company Types</option>
                    {companyTypes
                      .filter((type) => type !== 'all')
                      .map((type) => (
                        <option key={type} value={type}>
                          {type}
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

      {/* Leads Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="max-h-80 w-full overflow-y-auto scrollbar-desktop">
          <table className="min-w-full table-fixed ">
            <colgroup>
              <col className="w-12" />
              <col className="w-48" />
              <col className="w-48" />
              <col className="w-64" />
              <col className="w-32" />
              <col className="w-32" />
              <col className="w-32" />
              <col className="w-24" />
            </colgroup>
            <thead className=" border border-gray-200  bg-gray-50  sticky top-0 z-10">
              <tr className="">
                <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  S/No
                </th>
                <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor Details
                </th>
                <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Person
                </th>
                <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Info
                </th>
                <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company Type
                </th>
                <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NFD
                </th>
                <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedLeads.map((lead, index) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-2 py-1.5 whitespace-nowrap text-center text-xs font-medium text-gray-900">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <div className="text-sm font-medium  text-gray-900">
                      {lead.vendor_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(lead.created_at).toLocaleDateString('en-GB')}
                    </div>

                    <div className="text-xs text-gray-500">
                      {lead.vendor_business}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {lead.contact_person}
                    </div>
                    <div className="text-xs text-gray-500">
                      {lead.designation}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <Mail className="flex-shrink-0 mr-2 w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-900 truncate max-w-[160px]">
                          {lead.email}
                        </span>
                      </div>
                      <div className="flex items-start">
                        <Phone className="flex-shrink-0 mt-0.5 mr-2 w-3.5 h-3.5 text-gray-400" />
                        <div>
                          <div className="text-xs text-gray-900">
                            {lead.contact_no1}
                          </div>
                          {lead.contact_no2 && (
                            <div className="text-xs text-gray-500">
                              {lead.contact_no2}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-900">
                    {lead.company_type}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-xs text-gray-900">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(lead.nfd)}</span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5  whitespace-nowrap">
                    {getStatusBadge(lead.status)}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-center">
                    <ActionButtons lead={lead} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLeads.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <p className="text-lg font-medium">No leads found</p>
              <p className="text-sm">
                Try adjusting your search or filter criteria
              </p>
            </div>
          </div>
        )}

        {/* Pagination */}
        {filteredLeads.length > 0 && (
          <div className="flex items-center justify-between border-t  border-gray-200 bg-white px-2 py-1.5 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>

            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-gray-500">
                  Showing{' '}
                  <span className="font-medium">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium text-gray-700">
                    {Math.min(currentPage * itemsPerPage, filteredLeads.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredLeads.length}</span>{' '}
                  results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-xs">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-md px-1 py-0.5 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">First</span>
                    <ChevronLeft className="size-4" />
                    <ChevronLeft className="size-4 -ml-2" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-1 py-0.5 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeft className="size-4" />
                  </button>

                  {(() => {
                    const pages = [];
                    const siblings = 1; // show 1 page before and after currentPage

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
                        className={`relative inline-flex items-center px-2 py-0.5 text-sm font-semibold ${currentPage === 1
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
                          className="relative inline-flex items-center px-2 py-0.5 text-sm font-semibold text-gray-700 ring-1 ring-gray-300 ring-inset"
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
                          className={`relative inline-flex items-center px-2 py-0.5 text-sm font-semibold ${i === currentPage
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
                          className="relative inline-flex items-center px2 py-0.5 text-sm font-semibold text-gray-700 ring-1 ring-gray-300 ring-inset"
                        >
                          ...
                        </span>
                      );
                    }

                    // Always show last page
                    if (totalPages > 1) {
                      pages.push(
                        <button
                          key={totalPages}
                          onClick={() => setCurrentPage(totalPages)}
                          className={`relative inline-flex items-center px-3 py-0.5 text-sm font-semibold ${currentPage === totalPages
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
                    className="relative inline-flex items-center px-1 py-0.5 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRight className="size-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-r-md px-1 py-0.5 text-gray-400 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Last</span>
                    <ChevronRight className="size-4" />
                    <ChevronRight className="size-4 -ml-2" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* View Lead Modal */}
      {showViewModal && selectedLead && (
        <div className="fixed inset-0 bg-black/30  flex items-center justify-center z-50 ">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between p-2  border-b border-gray-300 bg-gradient-to-r from-blue-50 to-gray-50">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-800">
                  {selectedLead.vendor_name}
                </h2>
                {getStatusBadge(selectedLead.status)}
                <span className="text-xs text-gray-500">
                  Created:{' '}
                  {new Date(selectedLead.created_at).toLocaleDateString(
                    'en-GB'
                  )}
                </span>
              </div>

              <button
                onClick={() => setShowViewModal(false)}
                className=" rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
                {/* Left Column */}
                <div className="space-y-5">
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
                      Contact
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-gray-400">
                          Contact Person
                        </p>
                        <p className="text-sm font-medium text-gray-700">
                          {selectedLead.contact_person}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-400">
                          Designation
                        </p>
                        <p className="text-sm font-medium text-gray-700">
                          {selectedLead.designation || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-400">
                          Email
                        </p>
                        <a
                          href={`mailto:${selectedLead.email}`}
                          className="text-sm font-medium text-gray-700 hover:underline"
                        >
                          {selectedLead.email}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
                    Phone
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-400">
                        Primary
                      </p>
                      <a
                        href={`tel:${selectedLead.contact_no1}`}
                        className="text-sm font-medium text-gray-700 hover:text-blue-600"
                      >
                        {selectedLead.contact_no1}
                      </a>
                    </div>
                    {selectedLead.contact_no2 && (
                      <div>
                        <p className="text-xs font-medium text-gray-400">
                          Secondary
                        </p>
                        <a
                          href={`tel:${selectedLead.contact_no2}`}
                          className="text-sm font-medium text-gray-700 hover:text-blue-600"
                        >
                          {selectedLead.contact_no2}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-5">
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
                      Company
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-gray-400">
                          Type
                        </p>
                        <p className="text-sm font-medium text-gray-700">
                          {selectedLead.company_type || '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
                      Follow-up
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-gray-400">
                          Next Follow-up Date
                        </p>
                        <p className="text-sm font-medium text-gray-700">
                          {new Date(selectedLead.nfd).toLocaleDateString(
                            'en-US',
                            {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="">
                {selectedLead.description && (
                  <div className="flex items-start gap-2 text-sm">
                    <span className="font-semibold text-blue-600">
                      Remarks:
                    </span>
                    <span className="text-gray-700">
                      {selectedLead.description}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-2 border-t border-gray-300 bg-gray-50">
              <div className="flex ">
                <button
                  onClick={() => {
                    onEdit(selectedLead);
                    setShowViewModal(false);
                  }}
                  className="px-2 py-1 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                >
                  <Edit className="w-3 h-3" />
                  <span className="text-sm">Edit Lead</span>
                </button>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-2 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                {selectedLead.status === 'verified' && (
                  <button
                    onClick={() => {
                      onConvert(selectedLead);
                      setShowViewModal(false);
                    }}
                    className="px-2 py-1 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                  >
                    <UserPlus className="w-3 h-3" />
                    Convert to Vendor
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      <StatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        currentStatus={statusChangeLead?.status}
        onSubmit={handleStatusSubmit}
        type="lead"
      />

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Confirm Delete</h3>
            <p className="mb-6">Are you sure you want to delete this lead?</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorLeadsList;
