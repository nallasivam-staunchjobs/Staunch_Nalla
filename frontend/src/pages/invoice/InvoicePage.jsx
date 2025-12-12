import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DatePicker from "react-datepicker";
import { invoiceService } from '../../api/invoiceService';
import { toast, ToastContainer } from 'react-toastify';
import InvoicePreview from './InvoicePreview';



// Indian States for Dropdown
const indianStates = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu & Kashmir",
  "Ladakh","Puducherry"
];

// Company base state (for GST calculation)
const COMPANY_STATE = "Tamil Nadu";

export default function InvoicePage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get candidate data or invoice data from URL parameters or location state
  const getInitialData = () => {
    const urlParams = new URLSearchParams(location.search);
    const mode = urlParams.get('mode');
    const invoiceId = urlParams.get('invoiceId');
    const candidateDataParam = urlParams.get('candidateData');
    const invoiceDataParam = urlParams.get('invoiceData');
    
    // Check if we're in edit mode
    if (mode === 'edit' && invoiceDataParam) {
      try {
        const invoiceData = JSON.parse(decodeURIComponent(invoiceDataParam));
        return { mode: 'edit', invoiceId, data: invoiceData };
      } catch (error) {
        console.error('Error parsing invoice data from URL:', error);
      }
    }
    
    // Check for candidate data (create mode)
    if (candidateDataParam) {
      try {
        const candidateData = JSON.parse(decodeURIComponent(candidateDataParam));
        return { mode: 'create', data: candidateData };
      } catch (error) {
        console.error('Error parsing candidate data from URL:', error);
      }
    }
    
    return { mode: 'create', data: location.state?.candidateData || null };
  };
  
  const initialData = getInitialData();
  const isEditMode = initialData.mode === 'edit';
  const candidateData = initialData.data;

  // Debug logging for edit mode
  useEffect(() => {
    if (isEditMode) {
      console.log('=== FULL INVOICE DATA ===');
      console.log('Raw Data:', candidateData);
      console.log('All Keys:', candidateData ? Object.keys(candidateData) : 'No data');
      console.log('JSON:', JSON.stringify(candidateData, null, 2));
      
      // Test all possible field name variations
      console.log('=== FIELD TESTING ===');
      console.log('clientAddress vs client_address:', candidateData?.clientAddress, '|', candidateData?.client_address);
      console.log('clientGst vs client_gst:', candidateData?.clientGst, '|', candidateData?.client_gst);
      console.log('clientPan vs client_pan:', candidateData?.clientPan, '|', candidateData?.client_pan);
      console.log('placementType vs placement_type:', candidateData?.placementType, '|', candidateData?.placement_type);
      console.log('empCode vs emp_code:', candidateData?.empCode, '|', candidateData?.emp_code);
      console.log('========================');
    }
  }, [isEditMode, candidateData]);

  const [formData, setFormData] = useState({
    candidateName: "",
    clientName: "",
    state: "",
    empCode: "",
    ctc: "",
    placementPercent: "",
    placementFixed: "",
    placementAmount: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    totalGst: 0,
    invoiceNumber: "",
    invoiceDate: new Date(),
    clientAddress: "",
    clientGST: "",
    clientPAN: "",
    totalAmount: 0,
  });

  const [placementType, setPlacementType] = useState('percentage'); // 'percentage' or 'fixed'

  // Update form data when candidateData changes (for edit mode)
  useEffect(() => {
    if (isEditMode && candidateData && candidateData.id) {
      setFormData({
        candidateName: candidateData.candidateName || candidateData.candidate_name || "",
        clientName: candidateData.clientName || candidateData.client_name || "",
        state: candidateData.state || "",
        empCode: candidateData.empCode || candidateData.emp_code || "",
        ctc: candidateData.ctc || "",
        placementPercent: candidateData.placementPercent || candidateData.placement_percent || "",
        placementFixed: candidateData.placementFixed || candidateData.placement_fixed || "",
        placementAmount: candidateData.placementAmount || candidateData.placement_amount || 0,
        cgst: candidateData.cgst || 0,
        sgst: candidateData.sgst || 0,
        igst: candidateData.igst || 0,
        totalGst: candidateData.totalGst || candidateData.total_gst || 0,
        invoiceNumber: candidateData.invoiceNumber || candidateData.invoice_number || "",
        invoiceDate: candidateData.invoiceDate ? new Date(candidateData.invoiceDate) : 
                    candidateData.invoice_date ? new Date(candidateData.invoice_date) : new Date(),
        clientAddress: candidateData.clientAddress || candidateData.client_address || "",
        clientGST: candidateData.clientGST || candidateData.clientGst || candidateData.client_gst || "",
        clientPAN: candidateData.clientPAN || candidateData.clientPan || candidateData.client_pan || "",
        totalAmount: candidateData.totalAmount || candidateData.total_amount || 0,
      });
      
      // Also update placement type
      if (candidateData.placementType || candidateData.placement_type) {
        setPlacementType(candidateData.placementType || candidateData.placement_type);
      }
    } else if (!isEditMode && candidateData && candidateData.candidateName && !formData.candidateName) {
      // For create mode with candidate data - only update if form is empty
      setFormData(prev => ({
        ...prev,
        candidateName: candidateData.candidateName || "",
        clientName: candidateData.client || "",
        state: candidateData.location || "",
      }));
    }
  }, [isEditMode, candidateData?.id, candidateData?.candidateName, formData.candidateName]);

  const [errors, setErrors] = useState({});
  const [savedAddress, setSavedAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Real-time calculation
  useEffect(() => {
    const ctc = parseFloat(formData.ctc) || 0;
    let placementAmount = 0;

    if (placementType === 'percentage') {
      const percent = parseFloat(formData.placementPercent) || 0;
      placementAmount = (ctc * percent) / 100;
    } else {
      placementAmount = parseFloat(formData.placementFixed) || 0;
    }

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    
    if (formData.state) {
      if (formData.state === COMPANY_STATE) {
        // Tamil Nadu: CGST + SGST @ 9% each
        cgstAmount = placementAmount * 0.09;
        sgstAmount = placementAmount * 0.09;
        igstAmount = 0;
      } else {
        // Other states: IGST @ 18%
        cgstAmount = 0;
        sgstAmount = 0;
        igstAmount = placementAmount * 0.18;
      }
    }
    
    const totalGst = cgstAmount + sgstAmount + igstAmount;
    const totalAmount = placementAmount + totalGst;

    setFormData((prev) => ({
      ...prev,
      placementAmount: placementAmount.toFixed(2),
      cgst: cgstAmount.toFixed(2),
      sgst: sgstAmount.toFixed(2),
      igst: igstAmount.toFixed(2),
      totalGst: totalGst.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
    }));
  }, [formData.ctc, formData.placementPercent, formData.placementFixed, formData.state, placementType]);

  // Validation
  const validate = () => {
    const newErrors = {};
    if (!formData.candidateName) newErrors.candidateName = "Required";
    if (!formData.clientName) newErrors.clientName = "Required";
    if (!formData.state) newErrors.state = "Required";
    if (!formData.empCode) newErrors.empCode = "Required";
    if (!formData.ctc) newErrors.ctc = "Required";
    if (placementType === 'percentage' && !formData.placementPercent) newErrors.placementPercent = "Required";
    if (placementType === 'fixed' && !formData.placementFixed) newErrors.placementFixed = "Required";
    if (!formData.invoiceNumber) newErrors.invoiceNumber = "Required";
    if (!formData.invoiceDate) newErrors.invoiceDate = "Required";

    // PAN validation (AAAAA9999A)
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (formData.clientPAN && !panRegex.test(formData.clientPAN)) {
      newErrors.clientPAN = "Invalid PAN format";
    }

    // GST validation (proper Indian GST format)
    const gstRegex = /^22[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (formData.clientGST && !gstRegex.test(formData.clientGST)) {
      newErrors.clientGST = "Invalid GST format (22AAAAA0000A1Z5)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes with GST/PAN validation
  const handleChange = (e) => {
    const { name, value } = e.target;
  
    if (name === "clientGST") {
      let upper = value.toUpperCase();
  
      // Enforce position rules for GST (15 chars)
      const gstPattern = [
        /^[0-9]{0,2}$/,                     // First 2 digits = State code
        /^[0-9]{2}[A-Z]{0,5}$/,             // Next 5 = Letters (PAN start)
        /^[0-9]{2}[A-Z]{5}[0-9]{0,4}$/,     // Next 4 = Numbers
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{0,1}$/, // Next 1 = Letter
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{0,1}$/, // Next 1 = Alphanumeric
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z?$/, // Fixed 'Z'
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{0,1}$/ // Last check digit
      ];
  
      if (
        upper === "" ||
        gstPattern.some((regex) => regex.test(upper))
      ) {
        setFormData((prev) => ({ ...prev, [name]: upper }));
      }
      return;
    }
  
    if (name === "clientPAN") {
      let upper = value.toUpperCase();
  
      // Enforce position rules for PAN (10 chars)
      const panPattern = [
        /^[A-Z]{0,5}$/,                // First 5 = Alphabets
        /^[A-Z]{5}[0-9]{0,4}$/,        // Next 4 = Numbers
        /^[A-Z]{5}[0-9]{4}[A-Z]{0,1}$/ // Last = Alphabet
      ];
  
      if (
        upper === "" ||
        panPattern.some((regex) => regex.test(upper))
      ) {
        setFormData((prev) => ({ ...prev, [name]: upper }));
      }
      return;
    }
  
    // Default for other fields
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle date change for DatePicker
  const handleDateChange = (date) => {
    setFormData((prev) => ({ ...prev, invoiceDate: date }));
  };

  // Save Address independently
  const handleSaveAddress = () => {
    if (formData.clientAddress.trim() === "") {
      alert("Client address cannot be empty.");
      return;
    }
    setSavedAddress(formData.clientAddress);
    alert("Client address saved successfully!");
  };

  // Generate invoice number on component mount
  useEffect(() => {
    const generateInvoiceNumber = async () => {
      try {
        const response = await invoiceService.generateInvoiceNumber();
        setFormData(prev => ({ ...prev, invoiceNumber: response.invoice_number }));
      } catch (error) {
        console.error('Error generating invoice number:', error);
        toast.error('Failed to generate invoice number');
      }
    };

    if (!formData.invoiceNumber) {
      generateInvoiceNumber();
    }
  }, []);

  // Submit Full Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      toast.error('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const invoiceData = {
        candidate_name: formData.candidateName,
        client_name: formData.clientName,
        state: formData.state,
        emp_code: formData.empCode,
        ctc: parseFloat(formData.ctc),
        placement_type: placementType,
        placement_percent: placementType === 'percentage' ? parseFloat(formData.placementPercent) : null,
        placement_fixed: placementType === 'fixed' ? parseFloat(formData.placementFixed) : null,
        placement_amount: parseFloat(formData.placementAmount),
        cgst: parseFloat(formData.cgst),
        sgst: parseFloat(formData.sgst),
        igst: parseFloat(formData.igst),
        total_gst: parseFloat(formData.totalGst),
        total_amount: parseFloat(formData.totalAmount),
        invoice_number: formData.invoiceNumber,
        invoice_date: formData.invoiceDate.toISOString().split('T')[0],
        client_address: formData.clientAddress,
        client_gst: formData.clientGST,
        client_pan: formData.clientPAN,
      };

      if (isEditMode) {
        await invoiceService.updateInvoice(initialData.invoiceId, invoiceData);
        toast.success('Invoice updated successfully!');
      } else {
        await invoiceService.createInvoice(invoiceData);
        toast.success('Invoice created successfully!');
      }
      
      navigate('/listview');
    } catch (error) {
      console.error('Error creating invoice:', error);
      
      // Extract meaningful error message
      let errorMessage = 'Failed to create invoice. Please try again.';
      if (error.message) {
        if (error.message.includes('Server error: 500')) {
          errorMessage = 'Server error occurred. Please check if all required fields are filled correctly.';
        } else if (error.message.includes('validation')) {
          errorMessage = 'Validation error: Please check your input data.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handlePreview = () => {
    if (!validate()) {
      toast.error('Please fill all required fields before previewing');
      return;
    }
    setShowPreview(true);
  };

  const handlePrint = () => {
    const printContent = document.getElementById('invoice-content');
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

 

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-lg border border-blue-200">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-2 py-1 rounded-t-lg">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">I</span>
                </div>
                Invoice Generation
              </h1>
              <button
                onClick={handleGoBack}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-200 font-medium"
              >
                ← Back to ITBR
              </button>
            </div>
            {candidateData && (
              <p className="text-blue-100 mt-1">
                Generating invoice for: <span className="font-semibold text-white">{candidateData.candidateName}</span>
              </p>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-b-lg border border-blue-200">
          <div className="p-4">
            <form onSubmit={handleSubmit} className="space-y-2">
              {/* All Fields in 4-Column Grid */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">Candidate Name *</label>
                    <input
                      type="text"
                      name="candidateName"
                      value={formData.candidateName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200"
                      placeholder="Enter candidate name"
                    />
                    {errors.candidateName && (
                      <p className="text-red-500 text-xs mt-1">{errors.candidateName}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">Client Name *</label>
                    <input
                      type="text"
                      name="clientName"
                      value={formData.clientName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200"
                      placeholder="Enter client name"
                    />
                    {errors.clientName && (
                      <p className="text-red-500 text-xs mt-1">{errors.clientName}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">State *</label>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200"
                    >
                      <option value="">Select State</option>
                      {indianStates.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                    {errors.state && (
                      <p className="text-red-500 text-xs mt-1">{errors.state}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">Employee Code *</label>
                    <input
                      type="text"
                      name="empCode"
                      value={formData.empCode}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200"
                      placeholder="Enter employee code"
                    />
                    {errors.empCode && (
                      <p className="text-red-500 text-xs mt-1">{errors.empCode}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">CTC (₹) *</label>
                    <input
                      type="number"
                      name="ctc"
                      value={formData.ctc}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200"
                      placeholder="Enter CTC amount"
                    />
                    {errors.ctc && (
                      <p className="text-red-500 text-xs mt-1">{errors.ctc}</p>
                    )}
                  </div>
                  
                  <div>
                    
                    <div className="flex mb-1 space-x-2">
                      <button
                        type="button"
                        onClick={() => setPlacementType('percentage')}
                        className={`px-2  text-sm font-medium rounded-lg border transition-all duration-200 ${
                          placementType === 'percentage'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-600 shadow-md'
                            : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlacementType('fixed')}
                        className={`px-2  text-sm font-medium rounded-lg border-t border transition-all duration-200 ${
                          placementType === 'fixed'
                            ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-yellow-600 shadow-md'
                            : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        ₹
                      </button>
                    </div>
                    {placementType === 'percentage' ? (
                      <input
                        type="number"
                        name="placementPercent"
                        value={formData.placementPercent}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200"
                        placeholder="Enter percentage"
                      />
                    ) : (
                      <input
                        type="number"
                        name="placementFixed"
                        value={formData.placementFixed}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200"
                        placeholder="Enter fixed amount"
                      />
                    )}
                    {errors.placementPercent && (
                      <p className="text-red-500 text-xs mt-1">{errors.placementPercent}</p>
                    )}
                    {errors.placementFixed && (
                      <p className="text-red-500 text-xs mt-1">{errors.placementFixed}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">Invoice Number *</label>
                    <input
                      type="text"
                      name="invoiceNumber"
                      value={formData.invoiceNumber}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200"
                      placeholder="Enter invoice number"
                    />
                    {errors.invoiceNumber && (
                      <p className="text-red-500 text-xs mt-1">{errors.invoiceNumber}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">Invoice Date *</label>
                    <div className="w-full">
                      <DatePicker
                        selected={formData.invoiceDate}
                        onChange={handleDateChange}
                        dateFormat="dd/MM/yyyy"
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200"
                        placeholderText="Select invoice date"
                        showPopperArrow={false}
                        wrapperClassName="w-full"
                      />
                    </div>
                    {errors.invoiceDate && (
                      <p className="text-red-500 text-xs mt-1">{errors.invoiceDate}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">Placement Amount (₹)</label>
                    <div className="w-full px-3 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-300 rounded-lg text-blue-800 font-medium text-sm">
                      ₹ {parseFloat(formData.placementAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  
                  <div className={`${formData.state !== COMPANY_STATE ? "hidden" : ""}`}>
                    <label className="block text-sm font-medium text-blue-800 mb-2">CGST @ 9% (₹)</label>
                    <div className="w-full px-3 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-300 rounded-lg text-blue-800 font-medium text-sm">
                      ₹ {parseFloat(formData.cgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  
                  <div className={`${formData.state !== COMPANY_STATE ? "hidden" : ""}`}>
                    <label className="block text-sm font-medium text-blue-800 mb-2">SGST @ 9% (₹)</label>
                    <div className="w-full px-3 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-300 rounded-lg text-blue-800 font-medium text-sm">
                      ₹ {parseFloat(formData.sgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  
                  <div className={`${formData.state === COMPANY_STATE ? "hidden" : ""}`}>
                    <label className="block text-sm font-medium text-blue-800 mb-2">IGST @ 18% (₹)</label>
                    <div className="w-full px-3 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-300 rounded-lg text-blue-800 font-medium text-sm">
                      ₹ {parseFloat(formData.igst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">Total GST (₹)</label>
                    <div className="w-full px-3 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-300 rounded-lg text-blue-800 font-medium text-sm">
                      ₹ {parseFloat(formData.totalGst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">Total Amount (₹)</label>
                    <div className="w-full px-3 py-2 bg-gradient-to-r from-blue-200 to-indigo-200 border-2 border-blue-400 rounded-lg text-blue-900 font-bold text-sm">
                      ₹ {parseFloat(formData.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">Client GST Number</label>
                    <input
                      type="text"
                      name="clientGST"
                      value={formData.clientGST}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200"
                      placeholder="22AAAAA0000A1Z5"
                      maxLength={15}
                    />
                    {errors.clientGST && (
                      <p className="text-red-500 text-xs mt-1">{errors.clientGST}</p>
                    )}
                    <p className="text-blue-600 text-xs mt-1">Format: 22AAAAA0000A1Z5</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">Client PAN Number</label>
                    <input
                      type="text"
                      name="clientPAN"
                      value={formData.clientPAN}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200"
                      placeholder="AAAAA0000A"
                      maxLength={10}
                    />
                    {errors.clientPAN && (
                      <p className="text-red-500 text-xs mt-1">{errors.clientPAN}</p>
                    )}
                  </div>
                  
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-blue-800 mb-2">Client Address</label>
                    <textarea
                      name="clientAddress"
                      value={formData.clientAddress}
                      onChange={handleChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none transition-all duration-200"
                      placeholder="Enter complete client address"
                    />
                  </div>
                  
                  <div className="col-span-1 md:col-span-2 lg:col-span-4 flex items-end gap-4 flex-wrap">
                    <button
                      type="button"
                      onClick={handleSaveAddress}
                      className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      Save Address
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className={`px-8 py-2 font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg ${
                        submitting
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                      }`}
                    >
                      {submitting ? 'Creating Invoice...' : 'Submit Invoice'}
                    </button>
                  </div>
                </div>
                
                {savedAddress && (
                  <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                    <p className="text-green-700 text-sm font-medium">✓ Address Saved: {savedAddress}</p>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
      
      {/* Invoice Preview Modal */}
      
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}
