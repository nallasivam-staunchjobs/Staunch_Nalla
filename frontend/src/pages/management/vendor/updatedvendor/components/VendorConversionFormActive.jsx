import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  User,
  FileText,
  Shield,
  Upload,
  Plus,
  Trash2,
  Eye,
  Download,
} from 'lucide-react';
import mammoth from 'mammoth';

const VendorConversionForm = ({ vendor, leadData, onSubmit, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    vendor_code: '',
    vendor_name: '',
    contact_person: '',
    designation: '',
    email: '',
    contact_no1: '',
    contact_no2: '',
    company_type: '',
    address: '',
    contract_copy: null,
    start_date: '',
    end_date: '',
    pan_no: '',
    gst_details: [{ gst_no: '', state: '' }],
    rc_no: '',
    status: 'active',
  });

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

  useEffect(() => {
    const vendor_code = 'VEN' + Date.now().toString().slice(-6);

    if (vendor) {
      setFormData({
        vendor_code: vendor.vendor_code || vendor_code,
        vendor_name: vendor.vendor_name || '',
        contact_person: vendor.contact_person || '',
        designation: vendor.designation || '',
        email: vendor.email || '',
        contact_no1: vendor.contact_no1 || '',
        contact_no2: vendor.contact_no2 || '',
        company_type: vendor.company_type || '',
        address: vendor.address || '',
        contract_copy: vendor.contract_copy || null,
        start_date: vendor.start_date || '',
        end_date: vendor.end_date || '',
        pan_no: vendor.pan_no || '',
        rc_no: vendor.rc_no || '',
        status: vendor.status || 'active',
        gst_details: vendor.gst_details?.length
          ? vendor.gst_details.map((d) => ({
            gst_no: d.gst_no || '',
            state: d.state || '',
          }))
          : [{ gst_no: '', state: '' }],
      });
      setCurrentStep(1);
    } else if (leadData) {
      setFormData((prev) => ({
        ...prev,
        vendor_code,
        vendor_name: leadData.vendor_name || '',
        contact_person: leadData.contact_person || '',
        designation: leadData.designation || '',
        email: leadData.email || '',
        contact_no1: leadData.contact_no1 || '',
        contact_no2: leadData.contact_no2 || '',
        company_type: leadData.company_type || '',
        pan_no: '',
        address: '',
      }));
    } else {
      setFormData((prev) => ({ ...prev, vendor_code }));
    }
  }, [vendor, leadData]);

  const steps = [
    { number: 1, title: 'Vendor Details', icon: User },
    { number: 2, title: 'Contract & Compliance', icon: FileText },
    { number: 3, title: 'GST Details', icon: Shield },
  ];

  // Handle changes for standard input fields
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFormData((prev) => ({ ...prev, contract_copy: file }));
    setErrors((prev) => ({ ...prev, contract_copy: '' }));

    // Handle .docx files specifically for preview
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target.result;
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setPreviewUrl(result.value);
        } catch (error) {
          console.error('Error converting docx to HTML:', error);
          setPreviewUrl(null);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewUrl(event.target.result);
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  // Handle file download
  const handleDownload = () => {
    if (!formData.contract_copy || previewUrl?.startsWith('<')) return;

    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = formData.contract_copy.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render file preview
  const renderPreview = (file) => {
    if (!file || !previewUrl) return null;

    if (file.type.startsWith('image/')) {
      return (
        <div className="mt-2">
          <img
            src={previewUrl}
            alt="Contract preview"
            className="max-w-full h-32 object-contain border rounded"
          />
        </div>
      );
    } else if (file.type === 'application/pdf') {
      return (
        <div className="mt-2">
          <iframe
            src={previewUrl}
            className="w-full h-32 border rounded"
            title="PDF Preview"
          />
        </div>
      );
    } else if (previewUrl.startsWith('<')) {
      return (
        <div
          className="mt-2 p-2 border rounded bg-gray-50 max-h-32 overflow-y-auto text-sm"
          dangerouslySetInnerHTML={{ __html: previewUrl }}
        />
      );
    }
    return null;
  };

  // Validation function
  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.vendor_name.trim()) newErrors.vendor_name = 'Vendor name is required';
      if (!formData.contact_person.trim()) newErrors.contact_person = 'Contact person is required';
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      if (!formData.contact_no1.trim()) newErrors.contact_no1 = 'Contact number is required';
      if (!formData.address.trim()) newErrors.address = 'Address is required';
    }

    if (step === 2) {
      if (!formData.contract_copy) newErrors.contract_copy = 'Contract copy is required';
      if (!formData.start_date) newErrors.start_date = 'Start date is required';
      if (!formData.end_date) newErrors.end_date = 'End date is required';
      if (!formData.pan_no.trim()) newErrors.pan_no = 'PAN number is required';
    }

    if (step === 3) {
      formData.gst_details.forEach((gst, index) => {
        if (!gst.gst_no.trim()) {
          newErrors[`gst_no_${index}`] = 'GST number is required';
        }
        if (!gst.state.trim()) {
          newErrors[`state_${index}`] = 'State is required';
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleGSTChange = (index, field, value) => {
    const updatedGST = [...formData.gst_details];
    updatedGST[index][field] = value;
    setFormData((prev) => ({ ...prev, gst_details: updatedGST }));

    // Clear errors
    if (errors[`${field}_${index}`]) {
      setErrors((prev) => ({ ...prev, [`${field}_${index}`]: '' }));
    }
  };

  const addGSTDetail = () => {
    setFormData((prev) => ({
      ...prev,
      gst_details: [...prev.gst_details, { gst_no: '', state: '' }],
    }));
  };

  const removeGSTDetail = (index) => {
    if (formData.gst_details.length > 1) {
      const updatedGST = formData.gst_details.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, gst_details: updatedGST }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateStep(1) && validateStep(2) && validateStep(3)) {
      onSubmit(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {vendor ? 'Edit Vendor' : leadData ? 'Convert Lead to Vendor' : 'Add New Vendor'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-3 py-2 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep >= step.number
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                    }`}
                >
                  <step.icon className="w-4 h-4" />
                </div>
                <span
                  className={`ml-2 text-sm font-medium ${currentStep >= step.number ? 'text-blue-600' : 'text-gray-500'
                    }`}
                >
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div
                    className={`w-16 h-0.5 mx-4 ${currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <form onSubmit={handleSubmit}>
            {/* Step 1: Vendor Details */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <User className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-medium text-gray-900">Vendor Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendor Code
                    </label>
                    <input
                      type="text"
                      name="vendor_code"
                      value={formData.vendor_code}
                      onChange={handleInputChange}
                      className="input-field bg-gray-50"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendor Name *
                    </label>
                    <input
                      type="text"
                      name="vendor_name"
                      value={formData.vendor_name}
                      onChange={handleInputChange}
                      className={`input-field ${errors.vendor_name ? 'border-red-500' : ''}`}
                      placeholder="Enter vendor name"
                    />
                    {errors.vendor_name && (
                      <p className="text-red-500 text-xs mt-1">{errors.vendor_name}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Person *
                    </label>
                    <input
                      type="text"
                      name="contact_person"
                      value={formData.contact_person}
                      onChange={handleInputChange}
                      className={`input-field ${errors.contact_person ? 'border-red-500' : ''}`}
                      placeholder="Enter contact person"
                    />
                    {errors.contact_person && (
                      <p className="text-red-500 text-xs mt-1">{errors.contact_person}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Designation
                    </label>
                    <input
                      type="text"
                      name="designation"
                      value={formData.designation}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="Enter designation"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`input-field ${errors.email ? 'border-red-500' : ''}`}
                      placeholder="Enter email"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Number 1 *
                    </label>
                    <input
                      type="tel"
                      name="contact_no1"
                      value={formData.contact_no1}
                      onChange={handleInputChange}
                      className={`input-field ${errors.contact_no1 ? 'border-red-500' : ''}`}
                      placeholder="Enter contact number"
                    />
                    {errors.contact_no1 && (
                      <p className="text-red-500 text-xs mt-1">{errors.contact_no1}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Number 2
                    </label>
                    <input
                      type="tel"
                      name="contact_no2"
                      value={formData.contact_no2}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="Enter alternate contact"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Type
                    </label>
                    <select
                      name="company_type"
                      value={formData.company_type}
                      onChange={handleInputChange}
                      className="input-field"
                    >
                      <option value="">Select company type</option>
                      {companyTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address *
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows={3}
                    className={`input-field ${errors.address ? 'border-red-500' : ''}`}
                    placeholder="Enter complete address"
                  />
                  {errors.address && (
                    <p className="text-red-500 text-xs mt-1">{errors.address}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Contract & Compliance */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-medium text-gray-900">Contract & Compliance</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      className={`input-field ${errors.start_date ? 'border-red-500' : ''}`}
                    />
                    {errors.start_date && (
                      <p className="text-red-500 text-xs mt-1">{errors.start_date}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date *
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleInputChange}
                      className={`input-field ${errors.end_date ? 'border-red-500' : ''}`}
                    />
                    {errors.end_date && (
                      <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PAN Number *
                    </label>
                    <input
                      type="text"
                      name="pan_no"
                      value={formData.pan_no}
                      onChange={handleInputChange}
                      className={`input-field ${errors.pan_no ? 'border-red-500' : ''}`}
                      placeholder="Enter PAN number"
                    />
                    {errors.pan_no && (
                      <p className="text-red-500 text-xs mt-1">{errors.pan_no}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      RC Number
                    </label>
                    <input
                      type="text"
                      name="rc_no"
                      value={formData.rc_no}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="Enter RC number"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contract Copy *
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                      className="hidden"
                      id="contract-upload"
                      ref={fileInputRef}
                    />
                    <label
                      htmlFor="contract-upload"
                      className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Contract</span>
                    </label>

                    {formData.contract_copy && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600 truncate max-w-[200px]">
                          {typeof formData.contract_copy === 'string'
                            ? formData.contract_copy.split('/').pop()
                            : formData.contract_copy.name}
                        </span>
                        {previewUrl && (
                          <div className="flex space-x-1">
                            <button
                              type="button"
                              onClick={() => window.open(previewUrl, '_blank')}
                              className="p-1 text-blue-600 hover:text-blue-800"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={handleDownload}
                              className="p-1 text-green-600 hover:text-green-800"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {errors.contract_copy && (
                    <p className="text-red-500 text-xs mt-1">{errors.contract_copy}</p>
                  )}

                  {formData.contract_copy && previewUrl && (
                    <div className="mt-3">
                      {renderPreview(formData.contract_copy)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: GST Details */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-medium text-gray-900">GST Details</h3>
                  </div>
                  <button
                    type="button"
                    onClick={addGSTDetail}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add GST</span>
                  </button>
                </div>

                {formData.gst_details.map((gst, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700">GST Detail {index + 1}</h4>
                      {formData.gst_details.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeGSTDetail(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          GST Number *
                        </label>
                        <input
                          type="text"
                          value={gst.gst_no}
                          onChange={(e) => handleGSTChange(index, 'gst_no', e.target.value)}
                          className={`input-field ${errors[`gst_no_${index}`] ? 'border-red-500' : ''}`}
                          placeholder="Enter GST number"
                        />
                        {errors[`gst_no_${index}`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`gst_no_${index}`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          State *
                        </label>
                        <input
                          type="text"
                          value={gst.state}
                          onChange={(e) => handleGSTChange(index, 'state', e.target.value)}
                          className={`input-field ${errors[`state_${index}`] ? 'border-red-500' : ''}`}
                          placeholder="Enter state"
                        />
                        {errors[`state_${index}`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`state_${index}`]}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center space-x-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevious}
                className="flex items-center space-x-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
            )}

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center space-x-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                {vendor ? 'Update Vendor' : 'Create Vendor'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorConversionForm;
