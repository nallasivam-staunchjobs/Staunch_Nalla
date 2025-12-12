import React, { useState } from 'react';
import {
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Mail,
  Phone,
  MapPin,
  FileText,
  Settings,
  X,
  File,
  FileSignature,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
} from 'lucide-react';
import StatusModal from './StatusModal';

const VendorsList = ({ vendors, onEdit, onDelete, onUpdateStatus }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [companyTypeFilter, setCompanyTypeFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusChangeVendor, setStatusChangeVendor] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const statusOptions = [
    { value: 'all', label: 'All Status', count: vendors.length },
    {
      value: 'active',
      label: 'Active',
      count: vendors.filter((v) => v.status === 'active').length,
    },
    {
      value: 'inactive',
      label: 'Inactive',
      count: vendors.filter((v) => v.status === 'inactive').length,
    },
    {
      value: 'suspended',
      label: 'Suspended',
      count: vendors.filter((v) => v.status === 'suspended').length,
    },
  ];

  const companyTypes = [
    'all',
    ...new Set(vendors.map((vendor) => vendor.company_type)),
  ];

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      vendor.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false ||
      vendor.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false ||
      vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false ||
      vendor.vendor_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false;

    const matchesStatus =
      statusFilter === 'all' || vendor.status === statusFilter;
    const matchesCompanyType =
      companyTypeFilter === 'all' || vendor.company_type === companyTypeFilter;

    return matchesSearch && matchesStatus && matchesCompanyType;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage);
  const paginatedVendors = filteredVendors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status) => {
    const statusClasses = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses[status]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const InfoField = ({ label, value, mono = false, isEmail = false }) => (
    <div>
      <label className="text-sm font-medium text-gray-500 block mb-1">
        {label}
      </label>
      {isEmail ? (
        <a
          href={`mailto:${value}`}
          className={`text-sm ${mono ? 'font-mono' : ''
            } text-blue-600 hover:underline`}
        >
          {value}
        </a>
      ) : (
        <p className={`text-sm ${mono ? 'font-mono' : ''} text-gray-800`}>
          {value || '-'}
        </p>
      )}
    </div>
  );



  const handleStatusModalOpen = (vendor) => {
    setStatusChangeVendor(vendor);
    setShowStatusModal(true);
  };

  const handleStatusSubmit = (newStatus) => {
    if (statusChangeVendor) {
      onUpdateStatus(statusChangeVendor.id, newStatus);
    }
  };

  const handleViewVendor = (vendor) => {
    setSelectedVendor(vendor);
    setShowViewModal(true);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };



  const ActionButtons = ({ vendor }) => {
    return (
      <div className="flex items-center space-x-1">
        <button
          onClick={() => handleViewVendor(vendor)}
          className="p-1 rounded-full transition-all duration-100 hover:bg-blue-100/50 hover:scale-110 group"
          title="View Details"
        >
          <Eye className="w-3.5 h-3.5 text-blue-600 transition-all duration-300 group-hover:text-blue-700 group-hover:scale-110" />
        </button>

        <button
          onClick={() => onEdit(vendor)}
          className="p-1 hover:bg-gray-100/50 hover:scale-110 group rounded-full transition-all duration-100"
          title="Edit Vendor"
        >
          <Edit className="w-3.5 h-3.5 text-gray-600 transition-all duration-300 group-hover:text-gray-700 group-hover:scale-110" />
        </button>

        <button
          onClick={() => handleStatusModalOpen(vendor)}
          className="p-1 hover:bg-orange-100/50 rounded-full transition-all duration-100 hover:scale-110 group"
          title="Change Status"
        >
          <Settings className="w-3.5 h-3.5 text-orange-600 transition-all duration-300 group-hover:text-orange-700 group-hover:scale-110" />
        </button>

        <button
          onClick={() => onDelete(vendor.id)}
          className="p-1 hover:bg-red-100/50 rounded-full transition-all duration-100 hover:scale-110 group"
          title="Delete Vendor"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-600 transition-all duration-300 group-hover:text-red-700 group-hover:scale-110" />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                className={`w-3 h-3 rounded-full ${status.value === 'active'
                    ? 'bg-green-400'
                    : status.value === 'inactive'
                      ? 'bg-gray-400'
                      : 'bg-red-400'
                  }`}
              ></div>
            </div>
          </div>
        ))}
      </div>

      {/* Header with Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-2">
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
                  setCurrentPage(1);
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
            {/* Search box */}
            <div className="flex max-w-sm">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8 text-xs w-full rounded border border-gray-300 py-2 shadow-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Status and Company Type filters */}
            {showFilters && (
              <>
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
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
                      setCurrentPage(1);
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

            {/* Filter toggle button */}
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

      {/* Vendors Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="max-h-90 w-full overflow-y-auto scrollbar-desktop">
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
            <thead className=" border border-gray-200 bg-gray-50  sticky top-0 z-10">
              <tr>
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
                <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contract Period
                </th>
                <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedVendors.map((vendor, index) => (
                <tr key={vendor.id} className="hover:bg-gray-50">
                  <td className="px-2 py-1.5 whitespace-nowrap text-center text-xs font-medium text-gray-900">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {vendor.vendor_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {vendor.vendor_code}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {vendor.contact_person}
                    </div>
                    <div className="text-xs text-gray-500">
                      {vendor.designation}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <Mail className="flex-shrink-0 mr-2 w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-900 truncate max-w-[160px]">
                          {vendor.email}
                        </span>
                      </div>
                      <div className="flex items-start">
                        <Phone className="flex-shrink-0 mt-0.5 mr-2 w-3.5 h-3.5 text-gray-400" />
                        <div>
                          <div className="text-xs text-gray-900">
                            {vendor.contact_no1}
                          </div>
                          {vendor.contact_no2 && (
                            <div className="text-xs text-gray-500">
                              {vendor.contact_no2}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-900">
                    {vendor.company_type}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <div className="text-xs text-gray-900">
                      <div>{formatDate(vendor.start_date)}</div>
                      <div className="text-gray-500">
                        to {formatDate(vendor.end_date)}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {getStatusBadge(vendor.status)}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-center">
                    <ActionButtons vendor={vendor} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredVendors.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <p className="text-lg font-medium">No vendors found</p>
              <p className="text-sm">
                Try adjusting your search or filter criteria
              </p>
            </div>
          </div>
        )}

        {/* Pagination */}
        {filteredVendors.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-2 py-1.5 sm:px-6">
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
                    {Math.min(
                      currentPage * itemsPerPage,
                      filteredVendors.length
                    )}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{filteredVendors.length}</span>{' '}
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
                        className={`relative inline-flex items-center px-2 py-0.5 text-sm font-semibold ${currentPage === 1
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
                          className="relative inline-flex items-center px-2 py-0.5 text-sm font-semibold text-gray-700 ring-1 ring-gray-300 ring-inset"
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
                          className={`relative inline-flex items-center px-2 py-0.5 text-sm font-semibold ${i === currentPage
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
                          className="relative inline-flex items-center px2 py-0.5 text-sm font-semibold text-gray-700 ring-1 ring-gray-300 ring-inset"
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

      {/* View Vendor Modal */}
      {showViewModal && selectedVendor && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50  ">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-2 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-800">
                  {selectedVendor.vendor_name}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-medium text-gray-500">
                    {selectedVendor.vendor_code}
                  </span>
                  <span className="text-gray-300">•</span>
                  {getStatusBadge(selectedVendor.status)}
                </div>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Content */}
            <div className="p-2 space-y-4">
              {/* Basic Info Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Column 1 - Basic Info */}
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                      <User className="inline mr-2 w-5 h-5" />
                      Basic Information
                    </h3>
                    <div className="space-y-4">
                      <InfoField
                        label="Company Type"
                        value={selectedVendor.company_type}
                      />
                      <InfoField
                        label="Contact Person"
                        value={selectedVendor.contact_person}
                      />
                      <InfoField
                        label="Designation"
                        value={selectedVendor.designation}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                      <FileText className="inline mr-2 w-5 h-5" />
                      Compliance
                    </h3>
                    <div className="space-y-4">
                      <InfoField
                        label="GST No"
                        value={selectedVendor.gst_no}
                        mono
                      />
                      <InfoField
                        label="PAN No"
                        value={selectedVendor.pan_no}
                        mono
                      />
                      <InfoField
                        label="RC No"
                        value={selectedVendor.rc_no}
                        mono
                      />
                    </div>
                  </div>
                </div>

                {/* Column 2 - Contact Info */}
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                      <Phone className="inline mr-2 w-5 h-5" />
                      Contact Information
                    </h3>
                    <div className="space-y-4">
                      <InfoField
                        label="Email"
                        value={selectedVendor.email}
                        isEmail
                      />
                      <InfoField
                        label="Primary Contact"
                        value={selectedVendor.contact_no1}
                      />
                      {selectedVendor.contact_no2 && (
                        <InfoField
                          label="Secondary Contact"
                          value={selectedVendor.contact_no2}
                        />
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                      <MapPin className="inline mr-2 w-5 h-5" />
                      Address
                    </h3>
                    <div className="text-sm text-gray-800 whitespace-pre-line">
                      {selectedVendor.address || 'Not specified'}
                    </div>
                  </div>
                </div>

                {/* Column 3 - Contract Info */}
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                      <Calendar className="inline mr-2 w-5 h-5" />
                      Contract Period
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-500">
                            From
                          </span>
                          <span className="text-sm font-medium text-gray-800 bg-blue-50 px-3 py-1 rounded">
                            {formatDate(selectedVendor.start_date)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-sm font-medium text-gray-500">
                            To
                          </span>
                          <span className="text-sm font-medium text-gray-800 bg-blue-50 px-3 py-1 rounded">
                            {formatDate(selectedVendor.end_date)}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-1">
                          Contract Document
                        </label>
                        {selectedVendor.contract_copy &&
                          typeof selectedVendor.contract_copy === 'string' ? (
                          <a
                            href={selectedVendor.contract_copy}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            <File className="w-4 h-4" />
                            {selectedVendor.contract_copy.split('/').pop()}
                          </a>
                        ) : (
                          <span className="text-sm text-gray-500">
                            No document attached
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                      <Clock className="inline mr-2 w-5 h-5" />
                      System Information
                    </h3>
                    <div className="space-y-4">
                      <InfoField
                        label="Created On"
                        value={new Date(
                          selectedVendor.created_at
                        ).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      />
                      {/* Add more system fields if needed */}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onEdit(selectedVendor);
                  setShowViewModal(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit Vendor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      <StatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        currentStatus={statusChangeVendor?.status}
        onSubmit={handleStatusSubmit}
        type="vendor"
      />
    </div>
  );
};

export default VendorsList;
