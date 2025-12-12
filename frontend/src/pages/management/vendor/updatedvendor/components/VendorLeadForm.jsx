import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { X, Pencil, Plus } from 'lucide-react';

const VendorLeadForm = ({ lead, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    vendor_name: '',
    contact_person: '',
    designation: '',
    email: '',
    contact_no1: '',
    contact_no2: '',
    company_type: '',
    nfd: '',
    description: '',
  });

  const [isEditingLead, setIsEditingLead] = useState(false);

  useEffect(() => {
    if (lead) {
      setFormData(lead);
      setIsEditingLead(true);
    }
  }, [lead]);

  const companyTypes = [
    'IT Services',
    'Manufacturing',
    'Logistics',
    'Consulting',
    'Healthcare',
    'Education',
    'Finance',
    'Retail',
    'Construction',
    'Other',
  ];

  const selectStyles = {
    menuList: (provided) => ({
      ...provided,
      maxHeight: '150px',
      overflowY: 'auto',
    }),
    option: (provided, state) => ({
      ...provided,
      paddingTop: 6,
      paddingBottom: 6,
      paddingLeft: 10,
      paddingRight: 10,
      fontSize: '14px',
      backgroundColor: state.isSelected
        ? '#e2e8f0'
        : state.isFocused
          ? '#f1f5f9'
          : 'white',
      color: 'black',
      cursor: 'pointer',
    }),
    placeholder: (provided) => ({
      ...provided,
      fontSize: '14px',
      color: '#9ca3af',
    }),
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (selectedOption, { name }) => {
    setFormData((prev) => ({
      ...prev,
      [name]: selectedOption ? selectedOption.value : '',
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">


        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {isEditingLead ? (
              <Pencil className="w-4 h-4 text-gray-700" />
            ) : (
              <Plus className="w-4 h-4 text-gray-700" />
            )}
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditingLead ? 'Edit Vendor Lead' : 'Add New Vendor Lead'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
            title="Close"
          >
            <X className="w-4 h-4 hover:text-red-600 cursor-pointer transition-colors duration-200" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-2">
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Vendor Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="vendor_name"
                    value={formData.vendor_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 text-sm placeholder:text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter vendor name"
                    required
                    autoFocus
                  />
                </div>

                {/* Contact Person */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="contact_person"
                    value={formData.contact_person}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 text-sm placeholder:text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter contact person"
                    required
                  />
                </div>

                {/* Designation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 text-sm placeholder:text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter designation"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 text-sm placeholder:text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter email"
                  />
                </div>


                {/* Contact No 1 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact No 1 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="contact_no1"
                    value={formData.contact_no1}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 text-sm placeholder:text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter primary contact number"
                    required
                  />
                </div>

                {/* Contact No 2 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact No 2
                  </label>
                  <input
                    type="tel"
                    name="contact_no2"
                    value={formData.contact_no2}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 text-sm placeholder:text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter secondary contact number"
                  />
                </div>

                {/* Company Type */}
                <div className="lg:col-span-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Company Type
                  </label>
                  <Select
                    name="company_type"
                    options={companyTypes.map((type) => ({
                      value: type,
                      label: type,
                    }))}
                    value={
                      formData.company_type
                        ? {
                          value: formData.company_type,
                          label: formData.company_type,
                        }
                        : null
                    }
                    onChange={(selectedOption, actionMeta) =>
                      handleSelectChange(selectedOption, actionMeta)
                    }
                    placeholder="Select company type"
                    isSearchable
                    classNamePrefix="react-select"
                    className="react-select-container"
                    styles={selectStyles}
                  />
                </div>

                {/* NFD */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    NFD (Next Follow-up Date)
                  </label>
                  <input
                    type="date"
                    name="nfd"
                    value={formData.nfd}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 text-sm placeholder:text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-1.5 text-sm placeholder:text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter additional notes or description"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end px-4 py-2 border-t border-gray-100 bg-gray-50 gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isEditingLead ? 'Update Lead' : 'Submit Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorLeadForm;