import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";


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

export default function InvoiceForm() {
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

  const [errors, setErrors] = useState({});
  const [savedAddress, setSavedAddress] = useState("");

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
  // Handle input changes with strict validation
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

  // Submit Full Form
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    console.log("Invoice Submitted:", formData);
    alert("Invoice submitted successfully!");
  };

  return (
    <div className="min-h-screen bg-blue-50 p-2">
      <div className="max-full mx-auto">
        <div className="bg-white shadow-lg rounded-lg border border-blue-200">
          <div className="bg-blue-600 px-4 py-2">
            <h2 className="text-lg font-semibold text-white">Invoice Form</h2>
          </div>

          <div className="p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* All Fields in 4-Column Grid */}
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">Candidate Name *</label>
                    <input
                      type="text"
                      name="candidateName"
                      value={formData.candidateName}
                      onChange={handleChange}
                      className="w-full px-2 py-1 border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Enter candidate name"
                    />
                    {errors.candidateName && (
                      <p className="text-red-500 text-xs mt-1">{errors.candidateName}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">Client Name *</label>
                    <input
                      type="text"
                      name="clientName"
                      value={formData.clientName}
                      onChange={handleChange}
                      className="w-full px-2 py-1 border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Enter client name"
                    />
                    {errors.clientName && (
                      <p className="text-red-500 text-xs mt-1">{errors.clientName}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">State *</label>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full px-2 py-1 border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                    <label className="block text-sm font-medium text-blue-800 mb-1">Employee Code *</label>
                    <input
                      type="text"
                      name="empCode"
                      value={formData.empCode}
                      onChange={handleChange}
                      className="w-full px-2 py-1 border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Enter employee code"
                    />
                    {errors.empCode && (
                      <p className="text-red-500 text-xs mt-1">{errors.empCode}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">CTC (₹) *</label>
                    <input
                      type="number"
                      name="ctc"
                      value={formData.ctc}
                      onChange={handleChange}
                      className="w-full px-2 py-1 border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Enter CTC amount"
                    />
                    {errors.ctc && (
                      <p className="text-red-500 text-xs mt-1">{errors.ctc}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">Placement Charges *</label>
                    <div className="flex mb-2">
                      <button
                        type="button"
                        onClick={() => setPlacementType('percentage')}
                        className={`px-3 py-1 text-xs font-medium rounded-l border transition-colors ${
                          placementType === 'percentage'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlacementType('fixed')}
                        className={`px-3 py-1 text-xs font-medium rounded-r border-t border-r border-b transition-colors ${
                          placementType === 'fixed'
                            ? 'bg-blue-600 text-white border-blue-600'
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
                        className="w-full px-2 py-1 border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Enter percentage"
                      />
                    ) : (
                      <input
                        type="number"
                        name="placementFixed"
                        value={formData.placementFixed}
                        onChange={handleChange}
                        className="w-full px-2 py-1 border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                    <label className="block text-sm font-medium text-blue-800 mb-1">Invoice Number *</label>
                    <input
                      type="text"
                      name="invoiceNumber"
                      value={formData.invoiceNumber}
                      onChange={handleChange}
                      className="w-full px-2 py-1 border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Enter invoice number"
                    />
                    {errors.invoiceNumber && (
                      <p className="text-red-500 text-xs mt-1">{errors.invoiceNumber}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">Invoice Date *</label>
                    <DatePicker
                      selected={formData.invoiceDate}
                      onChange={handleDateChange}
                      dateFormat="dd/MM/yyyy"
                      className="w-full px-2 py-1 border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholderText="Select invoice date"
                      showPopperArrow={false}
                    />
                    {errors.invoiceDate && (
                      <p className="text-red-500 text-xs mt-1">{errors.invoiceDate}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">Placement Amount (₹)</label>
                    <div className="w-full px-2 py-1 bg-blue-100 border border-blue-300 rounded text-blue-800 font-medium text-sm">
                      ₹ {parseFloat(formData.placementAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">CGST @ 9% (₹)</label>
                    <div className="w-full px-2 py-1 bg-blue-100 border border-blue-300 rounded text-blue-800 font-medium text-sm">
                      ₹ {parseFloat(formData.cgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">SGST @ 9% (₹)</label>
                    <div className="w-full px-2 py-1 bg-blue-100 border border-blue-300 rounded text-blue-800 font-medium text-sm">
                      ₹ {parseFloat(formData.sgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">IGST @ 18% (₹)</label>
                    <div className="w-full px-2 py-1 bg-blue-100 border border-blue-300 rounded text-blue-800 font-medium text-sm">
                      ₹ {parseFloat(formData.igst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">Total GST (₹)</label>
                    <div className="w-full px-2 py-1 bg-blue-100 border border-blue-300 rounded text-blue-800 font-medium text-sm">
                      ₹ {parseFloat(formData.totalGst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">Total Amount (₹)</label>
                    <div className="w-full px-2 py-1 bg-blue-200 border-2 border-blue-400 rounded text-blue-900 font-bold text-sm">
                      ₹ {parseFloat(formData.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">Client GST Number</label>
                    <input
                      type="text"
                      name="clientGST"
                      value={formData.clientGST}
                      onChange={handleChange}
                      className="w-full px-2 py-1 border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="22AAAAA0000A1Z5"
                      maxLength={15}
                    />
                    {errors.clientGST && (
                      <p className="text-red-500 text-xs mt-1">{errors.clientGST}</p>
                    )}
                    <p className="text-blue-600 text-xs mt-1">Format: 22AAAAA0000A1Z5</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-1">Client PAN Number</label>
                    <input
                      type="text"
                      name="clientPAN"
                      value={formData.clientPAN}
                      onChange={handleChange}
                      className="w-full px-2 py-1 border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="AAAAA0000A"
                      maxLength={10}
                    />
                    {errors.clientPAN && (
                      <p className="text-red-500 text-xs mt-1">{errors.clientPAN}</p>
                    )}
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-blue-800 mb-1">Client Address</label>
                    <textarea
                      name="clientAddress"
                      value={formData.clientAddress}
                      onChange={handleChange}
                      rows="2"
                      className="w-full px-2 py-1 border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                      placeholder="Enter complete client address"
                    />
                  </div>
                  
                  <div className="col-span-2 flex items-end">
                    <button
                      type="button"
                      onClick={handleSaveAddress}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded text-sm mr-2"
                    >
                      Save Address
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded text-sm"
                    >
                      Submit Invoice
                    </button>
                  </div>
                </div>
                
                {savedAddress && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                    <p className="text-green-700 text-xs font-medium">✓ Address Saved: {savedAddress}</p>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
