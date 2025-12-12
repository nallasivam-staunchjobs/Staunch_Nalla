// import React, { useState, useEffect, useRef } from 'react';
// import {
//   X,
//   ChevronLeft,
//   ChevronRight,
//   User,
//   FileText,
//   Shield,
//   Upload,
//   Plus,
//   Trash2,
//   Eye,
//   Download,
// } from 'lucide-react';
// import mammoth from 'mammoth';

// const VendorConversionForm = ({ vendor, leadData, onSubmit, onCancel }) => {
//   const [currentStep, setCurrentStep] = useState(1);
//   const [previewUrl, setPreviewUrl] = useState(null);
//   const fileInputRef = useRef(null);
//   const [errors, setErrors] = useState({});

//   const [formData, setFormData] = useState({
//     vendor_code: '',
//     vendor_name: '',
//     contact_person: '',
//     designation: '',
//     email: '',
//     contact_no1: '',
//     contact_no2: '',
//     company_type: '',
//     address: '',
//     contract_copy: '',
//     start_date: '',
//     end_date: '',
//     pan_no: '',
//     gst_details: [{ gst_no: '', state: '' }],
//     rc_no: '',
//     status: 'active',
//   });
//   const companyTypes = [
//     'IT Services',
//     'Manufacturing',
//     'Logistics',
//     'Consulting',
//     'Healthcare',
//     'Education',
//     'Finance',
//     'Retail',
//     'Construction',
//     'Other',
//   ];

//   useEffect(() => {
//     const vendor_code = 'VEN' + Date.now().toString().slice(-6);

//     if (vendor) {
//       setFormData({
//         vendor_code: vendor.vendor_code || vendor_code,
//         vendor_name: vendor.vendor_name || '',
//         contact_person: vendor.contact_person || '',
//         designation: vendor.designation || '',
//         email: vendor.email || '',
//         contact_no1: vendor.contact_no1 || '',
//         contact_no2: vendor.contact_no2 || '',
//         company_type: vendor.company_type || '',
//         address: vendor.address || '',
//         contract_copy: vendor.contract_copy || '',
//         start_date: vendor.start_date || '',
//         end_date: vendor.end_date || '',
//         pan_no: vendor.pan_no || '',
//         rc_no: vendor.rc_no || '',
//         status: vendor.status || 'active',
//         gst_details: vendor.gst_details?.length
//           ? vendor.gst_details.map((d) => ({
//               gst_no: d.gst_no || '',
//               state: d.state || '',
//             }))
//           : [{ gst_no: '', state: '' }],
//       });
//       setCurrentStep(1);
//     } else if (leadData) {
//       setFormData((prev) => ({
//         ...prev,
//         vendor_code,
//         vendor_name: leadData.vendor_name || '',
//         contact_person: leadData.contact_person || '',
//         designation: leadData.designation || '',
//         email: leadData.email || '',
//         contact_no1: leadData.contact_no1 || '',
//         contact_no2: leadData.contact_no2 || '',
//         company_type: leadData.company_type || '',
//         pan_no: '',
//         address: '',
//       }));
//     } else {
//       setFormData((prev) => ({ ...prev, vendor_code }));
//     }
//   }, [vendor, leadData]);

//   const steps = [
//     { number: 1, title: 'Auto-filled Data + Address', icon: User },
//     { number: 2, title: 'Contract Info', icon: FileText },
//     { number: 3, title: 'Compliance', icon: Shield },
//   ];

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//     if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
//   };

//   const handleGstDetailChange = (index, e) => {
//     const { name, value } = e.target;
//     const updated = [...formData.gst_details];
//     updated[index] = { ...updated[index], [name]: value };
//     setFormData((prev) => ({ ...prev, gst_details: updated }));
//   };

//   const addGstDetail = () => {
//     setFormData((prev) => ({
//       ...prev,
//       gst_details: [...prev.gst_details, { gst_no: '', state: '' }],
//     }));
//   };

//   const removeGstDetail = (index) => {
//     if (formData.gst_details.length > 1) {
//       const updated = [...formData.gst_details];
//       updated.splice(index, 1);
//       setFormData((prev) => ({ ...prev, gst_details: updated }));
//     }
//   };

//   const handleFileChange = async (e) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     setFormData((prev) => ({ ...prev, contract_copy: file }));
//     setErrors((prev) => ({ ...prev, contract_copy: '' }));

//     if (
//       file.type ===
//       'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
//     ) {
//       const reader = new FileReader();
//       reader.onload = async (event) => {
//         const arrayBuffer = event.target.result;
//         const result = await mammoth.convertToHtml({ arrayBuffer });
//         setPreviewUrl(result.value); // HTML
//       };
//       reader.readAsArrayBuffer(file);
//     } else {
//       const url = URL.createObjectURL(file);
//       setPreviewUrl(url);
//     }
//   };

//   const renderPreview = (file) => {
//     if (!file) return null;
//     const type = file.type;

//     if (type.startsWith('image/')) {
//       return (
//         <img
//           src={previewUrl}
//           alt="Preview"
//           className="w-40 h-40 object-cover border rounded"
//         />
//       );
//     }

//     if (type === 'application/pdf') {
//       return (
//         <iframe
//           src={previewUrl}
//           className="w-40 h-40 border rounded"
//           title="PDF Preview"
//         />
//       );
//     }

//     if (
//       type ===
//       'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
//     ) {
//       return (
//         <div
//           className="border p-2 mt-2 rounded overflow-auto w-40 h-40 bg-white text-xs"
//           dangerouslySetInnerHTML={{ __html: previewUrl }}
//         />
//       );
//     }

//     return (
//       <div className="p-2 border rounded bg-gray-50 text-gray-700 text-sm">
//         <p className="mb-1">Preview not supported for this file.</p>
//         <p className="font-medium truncate">{file.name}</p>
//       </div>
//     );
//   };

//   const handleDownload = () => {
//     if (!formData.contract_copy || previewUrl?.startsWith('<')) return;

//     const link = document.createElement('a');
//     link.href = previewUrl;
//     link.download = formData.contract_copy.name;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//   };

//   const validateStep = (step) => {
//     const newErrors = {};

//     if (step === 1) {
//       if (!formData.vendor_name.trim())
//         newErrors.vendor_name = 'Vendor name is required';
//       if (!formData.contact_person.trim())
//         newErrors.contact_person = 'Contact person is required';
//       if (!formData.email.trim()) newErrors.email = 'Email is required';
//       else if (!/\S+@\S+\.\S+/.test(formData.email))
//         newErrors.email = 'Invalid email';
//       if (!formData.address.trim()) newErrors.address = 'Address is required';
//     }

//     if (step === 2) {
//       if (!formData.contract_copy)
//         newErrors.contract_copy = 'Contract copy is required';
//       if (!formData.start_date) newErrors.start_date = 'Start date is required';
//       if (!formData.end_date) newErrors.end_date = 'End date is required';
//       if (
//         formData.start_date &&
//         formData.end_date &&
//         formData.start_date >= formData.end_date
//       )
//         newErrors.end_date = 'End date must be after start date';
//     }

//     if (step === 3) {
//       if (!formData.pan_no.trim()) newErrors.pan_no = 'PAN number is required';
//       else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_no))
//         newErrors.pan_no = 'Invalid PAN format';

//       if (!formData.rc_no.trim()) newErrors.rc_no = 'TIN number is required';

//       formData.gst_details.forEach((detail, index) => {
//         // GST Number validation
//         if (!detail.gst_no.trim()) {
//           newErrors[`gst_no-${index}`] = 'GST number is required';
//         } else if (
//           !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
//             detail.gst_no.trim()
//           )
//         ) {
//           newErrors[`gst_no-${index}`] = 'Invalid GST format';
//         }

//         // State validation
//         if (!detail.state.trim()) {
//           newErrors[`state-${index}`] = 'State is required';
//         }
//       });
//     }

//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleNext = () => {
//     if (validateStep(currentStep)) setCurrentStep((prev) => prev + 1);
//   };

//   const handlePrevious = () => setCurrentStep((prev) => prev - 1);

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (validateStep(currentStep)) onSubmit(formData);
//   };

//   // const isStepValid = (step) => {
//   //   if (vendor)  return true;

//   // }

//   return (
//     <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
//       <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
//         {/* Header */}
//         <div className="flex items-center justify-between p-3 border-b border-gray-50">
//           <h2 className="text-lg font-semibold text-gray-900">
//             {vendor
//               ? 'Edit Vendor'
//               : leadData
//               ? 'Convert Lead to Vendor'
//               : 'Add New Vendor'}
//           </h2>
//           <button
//             onClick={onCancel}
//             className="text-gray-400 hover:text-gray-600 transition-colors"
//           >
//             <X className="w-4 h-4" />
//           </button>
//         </div>

//         {/* Progress Steps */}
//         <div className="px-2 py-1 border-b border-gray-50 bg-gray-50">
//           <div className="flex items-center justify-between">
//             {steps.map((step, index) => (
//               <div key={step.number} className="flex items-center">
//                 <div
//                   className={`flex items-center justify-center w-8 h-8 rounded-full ${
//                     currentStep >= step.number
//                       ? 'bg-blue-600 text-white'
//                       : 'bg-gray-300 text-gray-600'
//                   }`}
//                 >
//                   {currentStep > step.number ? (
//                     <svg
//                       className="w-5 h-5"
//                       fill="currentColor"
//                       viewBox="0 0 20 20"
//                     >
//                       <path
//                         fillRule="evenodd"
//                         d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
//                         clipRule="evenodd"
//                       />
//                     </svg>
//                   ) : (
//                     step.number
//                   )}
//                 </div>
//                 <div className="ml-3">
//                   <p
//                     className={`text-sm font-medium ${
//                       currentStep >= step.number
//                         ? 'text-blue-600'
//                         : 'text-gray-500'
//                     }`}
//                   >
//                     Step {step.number}
//                   </p>
//                   <p
//                     className={`text-xs ${
//                       currentStep >= step.number
//                         ? 'text-blue-600'
//                         : 'text-gray-500'
//                     }`}
//                   >
//                     {step.title}
//                   </p>
//                 </div>
//                 {index < steps.length - 1 && (
//                   <div
//                     className={`flex-1 h-0.5 mx-4 ${
//                       currentStep > step.number ? 'bg-blue-600' : 'bg-gray-300'
//                     }`}
//                   />
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>

//         <form onSubmit={handleSubmit}>
//           <div className="p-3">
//             {/* Step 1: Auto-filled Data + Address */}
//             {currentStep === 1 && (
//               <div className="space-y-4">
//                 <div className="flex flex-1 items-center space-x-2 mb-4">
//                   <User className="w-5 h-5 text-blue-600" />
//                   <h3 className="text-lg font-medium text-gray-900">
//                     Vendor Details & Address
//                   </h3>
//                 </div>

//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       Vendor Code
//                     </label>
//                     <input
//                       type="text"
//                       name="vendor_code"
//                       value={formData.vendor_code}
//                       readOnly
//                       className="input-field bg-gray-100 cursor-not-allowed"
//                     />
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       Vendor Name *
//                     </label>
//                     <input
//                       type="text"
//                       name="vendor_name"
//                       value={formData.vendor_name || ''}
//                       onChange={handleInputChange}
//                       className={`input-field ${
//                         errors.vendor_name ? 'border-red-500' : ''
//                       }`}
//                       placeholder="Enter vendor name"
//                     />
//                     {errors.vendor_name && (
//                       <p className="text-red-500 text-xs mt-1">
//                         {errors.vendor_name}
//                       </p>
//                     )}
//                   </div>
//                 </div>

//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       Contact Person *
//                     </label>
//                     <input
//                       type="text"
//                       name="contact_person"
//                       value={formData.contact_person || ''}
//                       onChange={handleInputChange}
//                       className={`input-field ${
//                         errors.contact_person ? 'border-red-500' : ''
//                       }`}
//                       placeholder="Enter contact person"
//                     />
//                     {errors.contact_person && (
//                       <p className="text-red-500 text-xs mt-1">
//                         {errors.contact_person}
//                       </p>
//                     )}
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       Designation
//                     </label>
//                     <input
//                       type="text"
//                       name="designation"
//                       value={formData.designation || ''}
//                       onChange={handleInputChange}
//                       className="input-field"
//                       placeholder="Enter designation"
//                     />
//                   </div>
//                 </div>

//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       Contact Number 1
//                     </label>
//                     <input
//                       type="text"
//                       name="contact_no1"
//                       value={formData.contact_no1 || ''}
//                       onChange={handleInputChange}
//                       className={`input-field ${
//                         errors.contact_no1 ? 'border-red-500' : ''
//                       }`}
//                       placeholder="+91XXXXXXXXXX"
//                     />
//                     {errors.contact_no1 && (
//                       <p className="text-red-500 text-xs mt-1">
//                         {errors.contact_no1}
//                       </p>
//                     )}
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       Contact Number 2
//                     </label>
//                     <input
//                       type="text"
//                       name="contact_no2"
//                       value={formData.contact_no2 || ''}
//                       onChange={handleInputChange}
//                       className={`input-field ${
//                         errors.contact_no2 ? 'border-red-500' : ''
//                       }`}
//                       placeholder="+91XXXXXXXXXX"
//                     />
//                     {errors.contact_no2 && (
//                       <p className="text-red-500 text-xs mt-1">
//                         {errors.contact_no2}
//                       </p>
//                     )}
//                   </div>
//                 </div>

//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       Email *
//                     </label>
//                     <input
//                       type="email"
//                       name="email"
//                       value={formData.email || ''}
//                       onChange={handleInputChange}
//                       className={`input-field ${
//                         errors.email ? 'border-red-500' : ''
//                       }`}
//                       placeholder="Enter email"
//                     />
//                     {errors.email && (
//                       <p className="text-red-500 text-xs mt-1">
//                         {errors.email}
//                       </p>
//                     )}
//                   </div>
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">
//                     Address *
//                   </label>
//                   <textarea
//                     name="address"
//                     value={formData.address || ''}
//                     onChange={handleInputChange}
//                     rows={3}
//                     className={`input-field resize-none ${
//                       errors.address ? 'border-red-500' : ''
//                     }`}
//                     placeholder="Enter complete address"
//                   />
//                   {errors.address && (
//                     <p className="text-red-500 text-xs mt-1">
//                       {errors.address}
//                     </p>
//                   )}
//                 </div>
//               </div>
//             )}

//             {/* Step 2: Contract Info */}
//             {currentStep === 2 && (
//               <div className="space-y-4">
//                 <div className="flex items-center space-x-2 mb-4">
//                   <FileText className="w-5 h-5 text-blue-600" />
//                   <h3 className="text-lg font-medium text-gray-900">
//                     Contract Information
//                   </h3>
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">
//                     Company Type *
//                   </label>
//                   <select
//                     name="company_type"
//                     value={formData.company_type || ''}
//                     onChange={handleInputChange}
//                     className={`input-field ${
//                       errors.company_type ? 'border-red-500' : ''
//                     }`}
//                   >
//                     <option value="">Select company type</option>
//                     {companyTypes.map((type) => (
//                       <option key={type} value={type}>
//                         {type}
//                       </option>
//                     ))}
//                   </select>
//                   {errors.company_type && (
//                     <p className="text-red-500 text-xs mt-1">
//                       {errors.company_type}
//                     </p>
//                   )}
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">
//                     Contract Copy *
//                   </label>
//                   <div className="flex items-center space-x-3">
//                     <input
//                       type="file"
//                       onChange={handleFileChange}
//                       accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
//                       className="hidden"
//                       id="contract-upload"
//                       ref={fileInputRef}
//                     />
//                     <label
//                       htmlFor="contract-upload"
//                       className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
//                     >
//                       <Upload className="w-4 h-4" />
//                       <span>Choose File</span>
//                     </label>

//                     {/* ✅ If user selects a new file */}
//                     {formData.contract_copy ? (
//                       typeof formData.contract_copy === 'string' ? (
//                         <a
//                           href={formData.contract_copy}
//                           target="_blank"
//                           rel="noopener noreferrer"
//                           className="text-sm text-blue-600 underline"
//                         >
//                           View previously uploaded file
//                         </a>
//                       ) : (
//                         <span className="text-sm text-gray-600 truncate max-w-[200px]">
//                           {formData.contract_copy.name}
//                         </span>
//                       )
//                     ) : null}
//                   </div>

//                   {errors.contract_copy && (
//                     <p className="text-red-500 text-xs mt-1">
//                       {errors.contract_copy}
//                     </p>
//                   )}

//                   {formData.contract_copy && previewUrl && (
//                     <div className="mt-3 space-y-2">
//                       {/* Preview Section */}
//                       {renderPreview(formData.contract_copy)}

//                       {/* Preview / Download buttons */}
//                       <div className="flex space-x-4 text-sm mt-1">
//                         <button
//                           type="button"
//                           onClick={() => window.open(previewUrl, '_blank')}
//                           className="text-blue-500 hover:text-blue-700 flex items-center space-x-1"
//                         >
//                           <Eye className="w-4 h-4" />
//                           <span>Open Preview</span>
//                         </button>

//                         <button
//                           type="button"
//                           onClick={handleDownload}
//                           className="text-green-600 hover:text-green-800 flex items-center space-x-1"
//                         >
//                           <Download className="w-4 h-4" />
//                           <span>Download</span>
//                         </button>
//                       </div>
//                     </div>
//                   )}
//                 </div>

//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       Start Date *
//                     </label>
//                     <input
//                       type="date"
//                       name="start_date"
//                       value={formData.start_date || ''}
//                       onChange={handleInputChange}
//                       className={`input-field ${
//                         errors.start_date ? 'border-red-500' : ''
//                       }`}
//                     />
//                     {errors.start_date && (
//                       <p className="text-red-500 text-xs mt-1">
//                         {errors.start_date}
//                       </p>
//                     )}
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       End Date *
//                     </label>
//                     <input
//                       type="date"
//                       name="end_date"
//                       value={formData.end_date || ''}
//                       onChange={handleInputChange}
//                       className={`input-field ${
//                         errors.end_date ? 'border-red-500' : ''
//                       }`}
//                       min={formData.start_date}
//                     />
//                     {errors.end_date && (
//                       <p className="text-red-500 text-xs mt-1">
//                         {errors.end_date}
//                       </p>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* Step 3: Compliance */}
//             {currentStep === 3 && (
//               <div className="space-y-4">
//                 <div className="flex items-center space-x-2 mb-4">
//                   <Shield className="w-5 h-5 text-blue-600" />
//                   <h3 className="text-lg font-medium text-gray-900">
//                     Compliance Information
//                   </h3>
//                 </div>

//                 {/* PAN Number */}
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">
//                     PAN No *
//                   </label>
//                   <input
//                     type="text"
//                     name="pan_no"
//                     value={formData.pan_no || ''}
//                     onChange={handleInputChange}
//                     className={`input-field ${
//                       errors.pan_no ? 'border-red-500' : ''
//                     } uppercase`}
//                     placeholder="AAAAA0000A"
//                     maxLength={10}
//                   />
//                   {errors.pan_no && (
//                     <p className="text-red-500 text-xs mt-1">{errors.pan_no}</p>
//                   )}
//                 </div>

//                 {/* GST Details */}

//                 <div className="space-y-4">
//                   {formData.gst_details.map((detail, index) => (
//                     <div
//                       key={index}
//                       className="border border-gray-200 rounded-lg p-4 relative"
//                     >
//                       {index > 0 && (
//                         <button
//                           type="button"
//                           onClick={() => removeGstDetail(index)}
//                           className="absolute top-2 right-2 text-red-500 hover:text-red-700"
//                         >
//                           <Trash2 className="w-4 h-4" />
//                         </button>
//                       )}
//                       <h4 className="text-sm font-medium text-gray-700 mb-3">
//                         GST Details{' '}
//                         {formData.gst_details.length > 1 ? `#${index + 1}` : ''}
//                       </h4>

//                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                         <div>
//                           <label className="block text-sm font-medium text-gray-700 mb-1">
//                             GST No *
//                           </label>
//                           <input
//                             type="text"
//                             name="gst_no"
//                             value={detail.gst_no || ''}
//                             onChange={(e) => handleGstDetailChange(index, e)}
//                             className={`input-field ${
//                               errors[`gst_no-${index}`] ? 'border-red-500' : ''
//                             }`}
//                             placeholder="22AAAAA0000A1Z5"
//                             maxLength={15}
//                           />
//                           {errors[`gst_no-${index}`] && (
//                             <p className="text-red-500 text-xs mt-1">
//                               {errors[`gst_no-${index}`]}
//                             </p>
//                           )}
//                         </div>

//                         <div>
//                           <label className="block text-sm font-medium text-gray-700 mb-1">
//                             State *
//                           </label>
//                           <input
//                             type="text"
//                             name="state"
//                             value={detail.state || ''}
//                             onChange={(e) => handleGstDetailChange(index, e)}
//                             className={`input-field ${
//                               errors[`state-${index}`] ? 'border-red-500' : ''
//                             }`}
//                             placeholder="Enter state"
//                           />
//                           {errors[`state-${index}`] && (
//                             <p className="text-red-500 text-xs mt-1">
//                               {errors[`state-${index}`]}
//                             </p>
//                           )}
//                         </div>
//                       </div>
//                     </div>
//                   ))}

//                   <button
//                     type="button"
//                     onClick={addGstDetail}
//                     className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
//                   >
//                     <Plus className="w-4 h-4 mr-1" />
//                     Add Another GST Details
//                   </button>
//                 </div>

//                 {/* RC Number */}
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">
//                     TIN No *
//                   </label>
//                   <input
//                     type="text"
//                     name="rc_no"
//                     value={formData.rc_no || ''}
//                     onChange={handleInputChange}
//                     className={`input-field ${
//                       errors.rc_no ? 'border-red-500' : ''
//                     }`}
//                     placeholder="Enter RC number"
//                   />
//                   {errors.rc_no && (
//                     <p className="text-red-500 text-xs mt-1">{errors.rc_no}</p>
//                   )}
//                 </div>

//                 {/* Status */}
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">
//                     Status
//                   </label>
//                   <select
//                     name="status"
//                     value={formData.status || ''}
//                     onChange={handleInputChange}
//                     className="input-field"
//                   >
//                     <option value="active">Active</option>
//                     <option value="inactive">Inactive</option>
//                     <option value="suspended">Suspended</option>
//                   </select>
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Footer */}
//           <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
//             <div className="flex items-center space-x-3">
//               {currentStep > 1 && (
//                 <button
//                   type="button"
//                   onClick={handlePrevious}
//                   className="btn-secondary flex items-center space-x-2"
//                 >
//                   <ChevronLeft className="w-4 h-4" />
//                   <span>Previous</span>
//                 </button>
//               )}
//             </div>

//             <div className="flex items-center space-x-3">
//               <button
//                 type="button"
//                 onClick={onCancel}
//                 className="btn-secondary"
//               >
//                 Cancel
//               </button>

//               {currentStep < 3 ? (
//                 <button
//                   type="button"
//                   onClick={handleNext}
//                   className="btn-blue flex items-center space-x-2"
//                 >
//                   <span>Next</span>
//                   <ChevronRight className="w-4 h-4" />
//                 </button>
//               ) : (
//                 <button
//                   type="submit"
//                   className="btn-blue"
//                 >
//                   {vendor ? 'Update Vendor' : 'Create Vendor'}
//                 </button>
//               )}
//             </div>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default VendorConversionForm;

// import React, { useState, useEffect, useRef } from 'react';
// import {
//   X,
//   ChevronLeft,
//   ChevronRight,
//   User,
//   FileText,
//   Shield,
//   Upload,
//   Plus,
//   Trash2,
//   Eye,
//   Download,
// } from 'lucide-react';
// import mammoth from 'mammoth';

// const VendorConversionForm = ({ vendor, leadData, onSubmit, onCancel }) => {
//   const [currentStep, setCurrentStep] = useState(1);
//   const [previewUrl, setPreviewUrl] = useState(null);
//   const fileInputRef = useRef(null);
//   const [errors, setErrors] = useState({});

//   const [formData, setFormData] = useState({
//     vendor_code: '',
//     vendor_name: '',
//     contact_person: '',
//     designation: '',
//     email: '',
//     contact_no1: '',
//     contact_no2: '',
//     company_type: '',
//     address: '',
//     contract_copy: '',
//     start_date: '',
//     end_date: '',
//     pan_no: '',
//     gst_details: [{ gst_no: '', state: '' }],
//     rc_no: '',
//     status: 'active',
//   });
//   const companyTypes = [
//     'IT Services',
//     'Manufacturing',
//     'Logistics',
//     'Consulting',
//     'Healthcare',
//     'Education',
//     'Finance',
//     'Retail',
//     'Construction',
//     'Other',
//   ];

//   useEffect(() => {
//     // Generate a unique vendor code if not provided by existing vendor data
//     const vendor_code = 'VEN' + Date.now().toString().slice(-6);

//     if (vendor) {
//       // If editing an existing vendor, pre-fill form data
//       setFormData({
//         vendor_code: vendor.vendor_code || vendor_code,
//         vendor_name: vendor.vendor_name || '',
//         contact_person: vendor.contact_person || '',
//         designation: vendor.designation || '',
//         email: vendor.email || '',
//         contact_no1: vendor.contact_no1 || '',
//         contact_no2: vendor.contact_no2 || '',
//         company_type: vendor.company_type || '',
//         address: vendor.address || '',
//         contract_copy: vendor.contract_copy || '',
//         start_date: vendor.start_date || '',
//         end_date: vendor.end_date || '',
//         pan_no: vendor.pan_no || '',
//         rc_no: vendor.rc_no || '',
//         status: vendor.status || 'active',
//         gst_details: vendor.gst_details?.length
//           ? vendor.gst_details.map((d) => ({
//               gst_no: d.gst_no || '',
//               state: d.state || '',
//             }))
//           : [{ gst_no: '', state: '' }], // Ensure at least one GST detail field exists
//       });
//       setCurrentStep(1); // Reset to first step on vendor load
//     } else if (leadData) {
//       // If converting from lead data, pre-fill relevant fields
//       setFormData((prev) => ({
//         ...prev,
//         vendor_code,
//         vendor_name: leadData.vendor_name || '',
//         contact_person: leadData.contact_person || '',
//         designation: leadData.designation || '',
//         email: leadData.email || '',
//         contact_no1: leadData.contact_no1 || '',
//         contact_no2: leadData.contact_no2 || '',
//         company_type: leadData.company_type || '',
//         pan_no: '', // PAN is not typically in lead data, so initialize empty
//         address: '', // Address might not be complete in lead data
//       }));
//     } else {
//       // If adding a new vendor without lead data, just set the vendor code
//       setFormData((prev) => ({ ...prev, vendor_code }));
//     }
//   }, [vendor, leadData]); // Depend on vendor and leadData props

//   // Define the steps for the multi-step form
//   const steps = [
//     { number: 1, title: 'Vendor Details & Address', icon: User },
//     { number: 2, title: 'Compliance Information', icon: Shield }, // Swapped
//     { number: 3, title: 'Contract Information', icon: FileText }, // Swapped
//   ];

//   // Handle changes for standard input fields
//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//     // Clear error for the field being edited
//     if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
//   };

//   // Handle changes for GST detail array fields
//   const handleGstDetailChange = (index, e) => {
//     const { name, value } = e.target;
//     const updated = [...formData.gst_details];
//     updated[index] = { ...updated[index], [name]: value };
//     setFormData((prev) => ({ ...prev, gst_details: updated }));
//     // Clear error for the specific GST field being edited
//     if (errors[`${name}-${index}`])
//       setErrors((prev) => ({ ...prev, [`${name}-${index}`]: '' }));
//   };

//   // Add a new empty GST detail entry
//   const addGstDetail = () => {
//     setFormData((prev) => ({
//       ...prev,
//       gst_details: [...prev.gst_details, { gst_no: '', state: '' }],
//     }));
//   };

//   // Remove a GST detail entry
//   const removeGstDetail = (index) => {
//     // Ensure at least one GST detail remains
//     if (formData.gst_details.length > 1) {
//       const updated = [...formData.gst_details];
//       updated.splice(index, 1);
//       setFormData((prev) => ({ ...prev, gst_details: updated }));
//     }
//   };

//   // Handle file selection and generate preview URL
//   const handleFileChange = async (e) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     setFormData((prev) => ({ ...prev, contract_copy: file }));
//     setErrors((prev) => ({ ...prev, contract_copy: '' })); // Clear file error

//     // Handle .docx files specifically for preview
//     if (
//       file.type ===
//       'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
//     ) {
//       const reader = new FileReader();
//       reader.onload = async (event) => {
//         const arrayBuffer = event.target.result;
//         // Use mammoth.js to convert docx to HTML for preview
//         const result = await mammoth.convertToHtml({ arrayBuffer });
//         setPreviewUrl(result.value); // HTML content
//       };
//       reader.readAsArrayBuffer(file);
//     } else {
//       // For other file types (PDF, images), create a blob URL
//       const url = URL.createObjectURL(file);
//       setPreviewUrl(url);
//     }
//   };

//   // Render file preview based on file type
//   const renderPreview = (file) => {
//     if (!file) return null;
//     const type = file.type;

//     if (type.startsWith('image/')) {
//       return (
//         <img
//           src={previewUrl}
//           alt="Preview"
//           className="w-80 h-60 object-cover border rounded"
//         />
//       );
//     }

//     if (type === 'application/pdf') {
//       return (
//         <iframe
//           src={previewUrl}
//           className="w-100 h-50 border rounded"
//           title="PDF Preview"
//         />
//       );
//     }

//     if (
//       type ===
//       'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
//     ) {
//       // Render docx HTML preview
//       return (
//         <div
//           className="border p-2 mt-2 rounded overflow-auto w-80 h-40 bg-white text-xs"
//           dangerouslySetInnerHTML={{ __html: previewUrl }}
//         />
//       );
//     }

//     // Fallback for unsupported file types
//     return (
//       <div className="p-2  rounded bg-gray-50 text-gray-700 text-sm">
//         <p className="mb-1">Preview not supported for this file.</p>
//         <p className="font-medium truncate">{file.name}</p>
//       </div>
//     );
//   };

//   // Handle file download
//   const handleDownload = () => {
//     // Prevent download if contract_copy is not a file object or if previewUrl is HTML content
//     if (
//       !formData.contract_copy ||
//       typeof formData.contract_copy === 'string' ||
//       previewUrl?.startsWith('<')
//     )
//       return;

//     const link = document.createElement('a');
//     link.href = previewUrl;
//     link.download = formData.contract_copy.name; // Use the original file name for download
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//   };

//   // Validate current step's fields
//   const validateStep = (step) => {
//     const newErrors = {};

//     if (step === 1) {
//       // Validation for Vendor Details & Address
//       if (!formData.vendor_name.trim())
//         newErrors.vendor_name = 'Vendor name is required';
//       if (!formData.contact_person.trim())
//         newErrors.contact_person = 'Contact person is required';
//       if (!formData.email.trim()) newErrors.email = 'Email is required';
//       else if (!/\S+@\S+\.\S+/.test(formData.email))
//         newErrors.email = 'Invalid email format';
//       if (!formData.address.trim()) newErrors.address = 'Address is required';
//       if (!formData.company_type.trim())
//         newErrors.company_type = 'Company type is required';

//       // Optional: Add validation for contact numbers if needed
//       // if (formData.contact_no1 && !/^\+?[0-9]{10,15}$/.test(formData.contact_no1))
//       //   newErrors.contact_no1 = 'Invalid contact number 1';
//       // if (formData.contact_no2 && !/^\+?[0-9]{10,15}$/.test(formData.contact_no2))
//       //   newErrors.contact_no2 = 'Invalid contact number 2';
//     }

//     // Validation for Compliance Information (now step 2)
//     if (step === 2) {
//       if (!formData.pan_no.trim()) newErrors.pan_no = 'PAN number is required';
//       else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_no.trim()))
//         newErrors.pan_no = 'Invalid PAN format (e.g., ABCDE1234F)';

//       if (!formData.rc_no.trim()) newErrors.rc_no = 'TIN number is required';

//       formData.gst_details.forEach((detail, index) => {
//         // GST Number validation
//         if (!detail.gst_no.trim()) {
//           newErrors[`gst_no-${index}`] = 'GST number is required';
//         } else if (
//           !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
//             detail.gst_no.trim()
//           )
//         ) {
//           newErrors[`gst_no-${index}`] =
//             'Invalid GST format (e.g., 22AAAAA0000A1Z5)';
//         }

//         // State validation
//         if (!detail.state.trim()) {
//           newErrors[`state-${index}`] = 'State is required';
//         }
//       });
//     }

//     // Validation for Contract Information (now step 3)
//     if (step === 3) {
//       if (!formData.contract_copy)
//         newErrors.contract_copy = 'Contract copy is required';
//       if (!formData.start_date) newErrors.start_date = 'Start date is required';
//       if (!formData.end_date) newErrors.end_date = 'End date is required';
//       if (
//         formData.start_date &&
//         formData.end_date &&
//         formData.start_date >= formData.end_date
//       )
//         newErrors.end_date = 'End date must be after start date';
//     }

//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0; // Return true if no errors
//   };

//   // Navigate to the next step if current step is valid
//   const handleNext = () => {
//     if (validateStep(currentStep)) setCurrentStep((prev) => prev + 1);
//   };

//   // Navigate to the previous step
//   const handlePrevious = () => setCurrentStep((prev) => prev - 1);

//   // Handle form submission
//   const handleSubmit = (e) => {
//     e.preventDefault();
//     // Validate the final step before submitting
//     if (validateStep(currentStep)) onSubmit(formData);
//   };

//   return (
//     <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 font-inter">
//       <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
//         {/* Header */}
//         <div className="flex items-center justify-between p-4 border-b border-gray-100">
//           <h2 className="text-xl font-semibold text-gray-900">
//             {vendor
//               ? 'Edit Vendor'
//               : leadData
//               ? 'Convert Lead to Vendor'
//               : 'Add New Vendor'}
//           </h2>
//           <button
//             onClick={onCancel}
//             className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1"
//           >
//             <X className="w-5 h-5" />
//           </button>
//         </div>

//         {/* Progress Steps */}
//         <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
//           <div className="flex items-center justify-between">
//             {steps.map((step, index) => (
//               <div key={step.number} className="flex items-center">
//                 <div
//                   className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300
//                     ${
//                       currentStep >= step.number
//                         ? 'bg-blue-600 text-white'
//                         : 'bg-gray-200 text-gray-600'
//                     }`}
//                 >
//                   {currentStep > step.number ? (
//                     <svg
//                       className="w-5 h-5"
//                       fill="currentColor"
//                       viewBox="0 0 20 20"
//                     >
//                       <path
//                         fillRule="evenodd"
//                         d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
//                         clipRule="evenodd"
//                       />
//                     </svg>
//                   ) : (
//                     step.number
//                   )}
//                 </div>
//                 <div className="ml-3">
//                   <p
//                     className={`text-sm font-medium transition-colors duration-300
//                       ${
//                         currentStep >= step.number
//                           ? 'text-blue-600'
//                           : 'text-gray-500'
//                       }`}
//                   >
//                     Step {step.number}
//                   </p>
//                   <p
//                     className={`text-xs transition-colors duration-300
//                       ${
//                         currentStep >= step.number
//                           ? 'text-blue-600'
//                           : 'text-gray-500'
//                       }`}
//                   >
//                     {step.title}
//                   </p>
//                 </div>
//                 {index < steps.length - 1 && (
//                   <div
//                     className={`flex-1 h-0.5 mx-4 transition-all duration-300
//                       ${
//                         currentStep > step.number
//                           ? 'bg-blue-600'
//                           : 'bg-gray-300'
//                       }`}
//                   />
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>

//         <form onSubmit={handleSubmit}>
//           <div className="p-6">
//             {/* Step 1: Vendor Details + Address */}
//             {currentStep === 1 && (
//               <div className="space-y-6">
//                 <div className="flex items-center space-x-2 mb-4 text-blue-600">
//                   <User className="w-6 h-6" />
//                   <h3 className="text-lg font-medium text-gray-900">
//                     Vendor Details & Address
//                   </h3>
//                 </div>

//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                   <div>
//                     <label
//                       htmlFor="vendor_code"
//                       className="block text-sm font-medium text-gray-700 mb-1"
//                     >
//                       Vendor Code
//                     </label>
//                     <input
//                       type="text"
//                       name="vendor_code"
//                       id="vendor_code"
//                       value={formData.vendor_code}
//                       readOnly
//                       className="input-field bg-gray-100 cursor-not-allowed"
//                     />
//                   </div>

//                   <div>
//                     <label
//                       htmlFor="vendor_name"
//                       className="block text-sm font-medium text-gray-700 mb-1"
//                     >
//                       Vendor Name <span className="text-red-500">*</span>
//                     </label>
//                     <input
//                       type="text"
//                       name="vendor_name"
//                       id="vendor_name"
//                       value={formData.vendor_name || ''}
//                       onChange={handleInputChange}
//                       className={`input-field ${
//                         errors.vendor_name ? 'border-red-500' : ''
//                       }`}
//                       placeholder="Enter vendor name"
//                     />
//                     {errors.vendor_name && (
//                       <p className="text-red-500 text-xs mt-1">
//                         {errors.vendor_name}
//                       </p>
//                     )}
//                   </div>
//                   <div>
//                     <label
//                       htmlFor="contact_person"
//                       className="block text-sm font-medium text-gray-700 mb-1"
//                     >
//                       Contact Person <span className="text-red-500">*</span>
//                     </label>
//                     <input
//                       type="text"
//                       name="contact_person"
//                       id="contact_person"
//                       value={formData.contact_person || ''}
//                       onChange={handleInputChange}
//                       className={`input-field ${
//                         errors.contact_person ? 'border-red-500' : ''
//                       }`}
//                       placeholder="Enter contact person"
//                     />
//                     {errors.contact_person && (
//                       <p className="text-red-500 text-xs mt-1">
//                         {errors.contact_person}
//                       </p>
//                     )}
//                   </div>
//                   <div>
//                     <label
//                       htmlFor="designation"
//                       className="block text-sm font-medium text-gray-700 mb-1"
//                     >
//                       Designation
//                     </label>
//                     <input
//                       type="text"
//                       name="designation"
//                       id="designation"
//                       value={formData.designation || ''}
//                       onChange={handleInputChange}
//                       className="input-field"
//                       placeholder="Enter designation"
//                     />
//                   </div>
//                   <div>
//                     <label
//                       htmlFor="contact_no1"
//                       className="block text-sm font-medium text-gray-700 mb-1"
//                     >
//                       Contact Number 1
//                     </label>
//                     <input
//                       type="text"
//                       name="contact_no1"
//                       id="contact_no1"
//                       value={formData.contact_no1 || ''}
//                       onChange={handleInputChange}
//                       className={`input-field ${
//                         errors.contact_no1 ? 'border-red-500' : ''
//                       }`}
//                       placeholder="+91XXXXXXXXXX"
//                     />
//                     {errors.contact_no1 && (
//                       <p className="text-red-500 text-xs mt-1">
//                         {errors.contact_no1}
//                       </p>
//                     )}
//                   </div>

//                   <div>
//                     <label
//                       htmlFor="contact_no2"
//                       className="block text-sm font-medium text-gray-700 mb-1"
//                     >
//                       Contact Number 2
//                     </label>
//                     <input
//                       type="text"
//                       name="contact_no2"
//                       id="contact_no2"
//                       value={formData.contact_no2 || ''}
//                       onChange={handleInputChange}
//                       className={`input-field ${
//                         errors.contact_no2 ? 'border-red-500' : ''
//                       }`}
//                       placeholder="+91XXXXXXXXXX"
//                     />
//                     {errors.contact_no2 && (
//                       <p className="text-red-500 text-xs mt-1">
//                         {errors.contact_no2}
//                       </p>
//                     )}
//                   </div>
//                 </div>

//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

//                   <div>
//                     <label
//                       htmlFor="email"
//                       className="block text-sm font-medium text-gray-700 mb-1"
//                     >
//                       Email <span className="text-red-500">*</span>
//                     </label>
//                     <input
//                       type="email"
//                       name="email"
//                       id="email"
//                       value={formData.email || ''}
//                       onChange={handleInputChange}
//                       className={`input-field ${
//                         errors.email ? 'border-red-500' : ''
//                       }`}
//                       placeholder="Enter email"
//                     />
//                     {errors.email && (
//                       <p className="text-red-500 text-xs mt-1">
//                         {errors.email}
//                       </p>
//                     )}
//                   </div>
//                   <div>
//                     <label
//                       htmlFor="company_type"
//                       className="block text-sm font-medium text-gray-700 mb-1"
//                     >
//                       Company Type <span className="text-red-500">*</span>
//                     </label>
//                     <select
//                       name="company_type"
//                       id="company_type"
//                       value={formData.company_type || ''}
//                       onChange={handleInputChange}
//                       className={`input-field ${
//                         errors.company_type ? 'border-red-500' : ''
//                       }`}
//                     >
//                       <option value="">Select company type</option>
//                       {companyTypes.map((type) => (
//                         <option key={type} value={type}>
//                           {type}
//                         </option>
//                       ))}
//                     </select>
//                     {errors.company_type && (
//                       <p className="text-red-500 text-xs mt-1">
//                         {errors.company_type}
//                       </p>
//                     )}
//                   </div>
//                 </div>

//                 <div className="grid grid-cols-1 gap-4">
//                   <div>
//                     <label
//                       htmlFor="address"
//                       className="block text-sm font-medium text-gray-700 mb-1"
//                     >
//                       Address <span className="text-red-500">*</span>
//                     </label>
//                     <textarea
//                       name="address"
//                       id="address"
//                       value={formData.address || ''}
//                       onChange={handleInputChange}
//                       rows={3}
//                       className={`input-field resize-none ${
//                         errors.address ? 'border-red-500' : ''
//                       }`}
//                       placeholder="Enter complete address"
//                     />
//                     {errors.address && (
//                       <p className="text-red-500 text-xs mt-1">
//                         {errors.address}
//                       </p>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* Step 2: Compliance (now step 2) */}
//             {currentStep === 2 && (
//               <div className="space-y-6">
//                 <div className="flex items-center space-x-2 mb-4 text-blue-600">
//                   <Shield className="w-6 h-6" />
//                   <h3 className="text-lg font-medium text-gray-900">
//                     Compliance Information
//                   </h3>
//                 </div>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   {/* PAN Number */}
//                   <div>
//                     <label
//                       htmlFor="pan_no"
//                       className="block text-sm font-medium text-gray-700 mb-1"
//                     >
//                       PAN No <span className="text-red-500">*</span>
//                     </label>
//                     <input
//                       type="text"
//                       name="pan_no"
//                       id="pan_no"
//                       value={formData.pan_no || ''}
//                       onChange={handleInputChange}
//                       className={`input-field ${
//                         errors.pan_no ? 'border-red-500' : ''
//                       } uppercase`}
//                       placeholder="AAAAA0000A"
//                       maxLength={10}
//                     />
//                     {errors.pan_no && (
//                       <p className="text-red-500 text-xs mt-1">
//                         {errors.pan_no}
//                       </p>
//                     )}
//                   </div>
//                   {/* TIN Number (RC No) */}
//                   <div>
//                     <label
//                       htmlFor="rc_no"
//                       className="block text-sm font-medium text-gray-700 mb-1"
//                     >
//                       TIN No <span className="text-red-500">*</span>
//                     </label>
//                     <input
//                       type="text"
//                       name="rc_no"
//                       id="rc_no"
//                       value={formData.rc_no || ''}
//                       onChange={handleInputChange}
//                       className={`input-field ${
//                         errors.rc_no ? 'border-red-500' : ''
//                       }`}
//                       placeholder="Enter TIN number"
//                     />
//                     {errors.rc_no && (
//                       <p className="text-red-500 text-xs mt-1">
//                         {errors.rc_no}
//                       </p>
//                     )}
//                   </div>
//                 </div>

//                 {/* GST Details */}
//                 <div className="space-y-4">
//                   {formData.gst_details.map((detail, index) => (
//                     <div
//                       key={index}
//                       className="border border-gray-200 rounded-lg p-4 relative"
//                     >
//                       {index > 0 && (
//                         <button
//                           type="button"
//                           onClick={() => removeGstDetail(index)}
//                           className="absolute top-2 right-2 text-red-500 hover:text-red-700 rounded-full p-1"
//                           aria-label={`Remove GST detail ${index + 1}`}
//                         >
//                           <Trash2 className="w-4 h-4" />
//                         </button>
//                       )}
//                       <h4 className="text-sm font-medium text-gray-700 mb-3">
//                         GST Details{' '}
//                         {formData.gst_details.length > 1 ? `#${index + 1}` : ''}
//                       </h4>

//                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                         <div>
//                           <label
//                             htmlFor={`gst_no-${index}`}
//                             className="block text-sm font-medium text-gray-700 mb-1"
//                           >
//                             GST No <span className="text-red-500">*</span>
//                           </label>
//                           <input
//                             type="text"
//                             name="gst_no"
//                             id={`gst_no-${index}`}
//                             value={detail.gst_no || ''}
//                             onChange={(e) => handleGstDetailChange(index, e)}
//                             className={`input-field ${
//                               errors[`gst_no-${index}`] ? 'border-red-500' : ''
//                             }`}
//                             placeholder="22AAAAA0000A1Z5"
//                             maxLength={15}
//                           />
//                           {errors[`gst_no-${index}`] && (
//                             <p className="text-red-500 text-xs mt-1">
//                               {errors[`gst_no-${index}`]}
//                             </p>
//                           )}
//                         </div>

//                         <div>
//                           <label
//                             htmlFor={`state-${index}`}
//                             className="block text-sm font-medium text-gray-700 mb-1"
//                           >
//                             State <span className="text-red-500">*</span>
//                           </label>
//                           <input
//                             type="text"
//                             name="state"
//                             id={`state-${index}`}
//                             value={detail.state || ''}
//                             onChange={(e) => handleGstDetailChange(index, e)}
//                             className={`input-field ${
//                               errors[`state-${index}`] ? 'border-red-500' : ''
//                             }`}
//                             placeholder="Enter state"
//                           />
//                           {errors[`state-${index}`] && (
//                             <p className="text-red-500 text-xs mt-1">
//                               {errors[`state-${index}`]}
//                             </p>
//                           )}
//                         </div>
//                       </div>
//                     </div>
//                   ))}

//                   <button
//                     type="button"
//                     onClick={addGstDetail}
//                     className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1.5 rounded-lg border border-blue-600 hover:border-blue-800 transition-colors"
//                   >
//                     <Plus className="w-4 h-4 mr-1" />
//                     Add Another GST Details
//                   </button>
//                 </div>
//               </div>
//             )}

//             {/* Step 3: Contract Info (now step 3) */}
//             {currentStep === 3 && (
//               <div className="space-y-6">
//                 <div className="flex items-center space-x-2 mb-4 text-blue-600">
//                   <FileText className="w-6 h-6" />
//                   <h3 className="text-lg font-medium text-gray-900">
//                     Contract Information
//                   </h3>
//                 </div>

//                 <div className="grid grid-cols-1">
//                   <div>
//                     <label
//                       htmlFor="contract_copy"
//                       className="block text-sm font-medium text-gray-700 mb-1"
//                     >
//                       Contract Copy <span className="text-red-500">*</span>
//                     </label>

//                     {/* Main container with responsive layout */}
//                     <div className="flex flex-col lg:flex-row gap-6">
//                       {/* Left: Upload section - takes full width on mobile, half on desktop */}
//                       <div className="flex-1 space-y-2">
//                         <div className="flex items-center gap-3">
//                           <input
//                             type="file"
//                             onChange={handleFileChange}
//                             accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
//                             className="hidden"
//                             id="contract-upload"
//                             ref={fileInputRef}
//                           />
//                           <label
//                             htmlFor="contract-upload"
//                             className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
//                           >
//                             <Upload className="w-4 h-4" />
//                             <span>Choose File</span>
//                           </label>

//                           {formData.contract_copy && (
//                             <div className="flex-1 min-w-0">
//                               {typeof formData.contract_copy === 'string' ? (
//                                 <a
//                                   href={formData.contract_copy}
//                                   target="_blank"
//                                   rel="noopener noreferrer"
//                                   className="text-sm text-blue-600 hover:text-blue-800 underline truncate block"
//                                   title="View previously uploaded file"
//                                 >
//                                   View uploaded file
//                                 </a>
//                               ) : (
//                                 <p
//                                   className="text-sm text-gray-600 truncate"
//                                   title={formData.contract_copy.name}
//                                 >
//                                   {formData.contract_copy.name}
//                                 </p>
//                               )}
//                             </div>
//                           )}
//                         </div>

//                         {errors.contract_copy && (
//                           <p className="text-red-500 text-xs mt-1">
//                             {errors.contract_copy}
//                           </p>
//                         )}
//                       </div>

//                       {/* Right: Preview section - appears below on mobile, to the right on desktop */}
//                       {formData.contract_copy && previewUrl && (
//                         <div className="flex-1">
//                           <div className="border rounded-lg p-3 bg-gray-50">
//                             <div className="flex justify-between items-start mb-2">
//                               <h4 className="text-sm font-medium text-gray-700">
//                                 File Preview
//                               </h4>
//                               <div className="flex gap-3">
//                                 <button
//                                   type="button"
//                                   onClick={() =>
//                                     window.open(previewUrl, '_blank')
//                                   }
//                                   className="text-blue-500 hover:text-blue-700 flex items-center gap-1 text-xs"
//                                 >
//                                   <Eye className="w-3.5 h-3.5" />
//                                   <span>Open</span>
//                                 </button>
//                                 <button
//                                   type="button"
//                                   onClick={handleDownload}
//                                   className="text-green-600 hover:text-green-800 flex items-center gap-1 text-xs"
//                                 >
//                                   <Download className="w-3.5 h-3.5" />
//                                   <span>Download</span>
//                                 </button>
//                               </div>
//                             </div>

//                             {/* Preview container with fixed height and scroll */}
//                             <div className="h-48  rounded bg-white overflow-auto flex items-center justify-center">
//                               {renderPreview(formData.contract_copy)}
//                             </div>
//                           </div>
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                 </div>

//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                   <div>
//                     <label
//                       htmlFor="start_date"
//                       className="block text-sm font-medium text-gray-700 mb-1"
//                     >
//                       Start Date <span className="text-red-500">*</span>
//                     </label>
//                     <input
//                       type="date"
//                       name="start_date"
//                       id="start_date"
//                       value={formData.start_date || ''}
//                       onChange={handleInputChange}
//                       className={`input-field ${
//                         errors.start_date ? 'border-red-500' : ''
//                       }`}
//                     />
//                     {errors.start_date && (
//                       <p className="text-red-500 text-xs mt-1">
//                         {errors.start_date}
//                       </p>
//                     )}
//                   </div>

//                   <div>
//                     <label
//                       htmlFor="end_date"
//                       className="block text-sm font-medium text-gray-700 mb-1"
//                     >
//                       End Date <span className="text-red-500">*</span>
//                     </label>
//                     <input
//                       type="date"
//                       name="end_date"
//                       id="end_date"
//                       value={formData.end_date || ''}
//                       onChange={handleInputChange}
//                       className={`input-field ${
//                         errors.end_date ? 'border-red-500' : ''
//                       }`}
//                       min={formData.start_date} // End date cannot be before start date
//                     />
//                     {errors.end_date && (
//                       <p className="text-red-500 text-xs mt-1">
//                         {errors.end_date}
//                       </p>
//                     )}
//                   </div>
//                   <div>
//                     <label
//                       htmlFor="status"
//                       className="block text-sm font-medium text-gray-700 mb-1"
//                     >
//                       Status
//                     </label>
//                     <select
//                       name="status"
//                       id="status"
//                       value={formData.status || ''}
//                       onChange={handleInputChange}
//                       className="input-field"
//                     >
//                       <option value="active">Active</option>
//                       <option value="inactive">Inactive</option>
//                       <option value="suspended">Suspended</option>
//                     </select>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Footer */}
//           <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
//             <div className="flex items-center space-x-3">
//               {currentStep > 1 && (
//                 <button
//                   type="button"
//                   onClick={handlePrevious}
//                   className="btn-secondary flex items-center space-x-2"
//                 >
//                   <ChevronLeft className="w-4 h-4" />
//                   <span>Previous</span>
//                 </button>
//               )}
//             </div>

//             <div className="flex items-center space-x-3">
//               <button
//                 type="button"
//                 onClick={onCancel}
//                 className="btn-secondary"
//               >
//                 Cancel
//               </button>

//               {currentStep < 3 ? (
//                 <button
//                   type="button"
//                   onClick={handleNext}
//                   className="btn-blue flex items-center space-x-2"
//                 >
//                   <span>Next</span>
//                   <ChevronRight className="w-4 h-4" />
//                 </button>
//               ) : (
//                 <button type="submit" className="btn-blue">
//                   {vendor ? 'Update Vendor' : 'Create Vendor'}
//                 </button>
//               )}
//             </div>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default VendorConversionForm;

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
  File,
  Image as ImageIcon,
  FileText as DocIcon,
  FileSpreadsheet,
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
    contract_copy: '',
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
        contract_copy: vendor.contract_copy || '',
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
    { number: 1, title: 'Vendor Details & Address', icon: User },
    { number: 2, title: 'Compliance Information', icon: Shield },
    { number: 3, title: 'Contract Information', icon: FileText },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleGstDetailChange = (index, e) => {
    const { name, value } = e.target;
    const updated = [...formData.gst_details];
    updated[index] = { ...updated[index], [name]: value };
    setFormData((prev) => ({ ...prev, gst_details: updated }));
    if (errors[`${name}-${index}`])
      setErrors((prev) => ({ ...prev, [`${name}-${index}`]: '' }));
  };

  const addGstDetail = () => {
    setFormData((prev) => ({
      ...prev,
      gst_details: [...prev.gst_details, { gst_no: '', state: '' }],
    }));
  };

  const removeGstDetail = (index) => {
    if (formData.gst_details.length > 1) {
      const updated = [...formData.gst_details];
      updated.splice(index, 1);
      setFormData((prev) => ({ ...prev, gst_details: updated }));
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFormData((prev) => ({ ...prev, contract_copy: file }));
    setErrors((prev) => ({ ...prev, contract_copy: '' }));

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return;
    }

    if (file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return;
    }

    if (
      file.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'application/msword'
    ) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target.result;
        try {
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setPreviewUrl(result.value);
        } catch (error) {
          console.error('Error converting Word document:', error);
          setPreviewUrl(
            '<p>Could not generate preview for this Word document.</p>'
          );
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    if (
      file.type ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel'
    ) {
      setPreviewUrl('excel-file');
      return;
    }

    setPreviewUrl(null);
  };

  const renderPreview = (file) => {
    if (!file) return null;

    if (typeof file === 'string') {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <File className="w-12 h-12 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 text-center">
            Previously uploaded file. Click "Open" to view.
          </p>
        </div>
      );
    }

    const type = file.type;

    if (type.startsWith('image/')) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="mt-2 flex items-center text-xs text-gray-500">
            <ImageIcon className="w-3 h-3 mr-1" />
            {file.name} ({Math.round(file.size / 1024)} KB)
          </div>
        </div>
      );
    }

    if (type === 'application/pdf') {
      return (
        <div className="flex flex-col h-full">
          <iframe
            src={previewUrl}
            className="flex-1 w-full border-0"
            title="PDF Preview"
          />
          <div className="mt-2 flex items-center text-xs text-gray-500">
            <FileText className="w-3 h-3 mr-1" />
            {file.name} ({Math.round(file.size / 1024)} KB)
          </div>
        </div>
      );
    }

    if (
      type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      type === 'application/msword'
    ) {
      return (
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-auto p-2 bg-white">
            <div dangerouslySetInnerHTML={{ __html: previewUrl }} />
          </div>
          <div className="mt-2 flex items-center text-xs text-gray-500">
            <DocIcon className="w-3 h-3 mr-1" />
            {file.name} ({Math.round(file.size / 1024)} KB)
          </div>
        </div>
      );
    }

    if (
      type ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      type === 'application/vnd.ms-excel'
    ) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <FileSpreadsheet className="w-12 h-12 text-green-600 mb-2" />
          <p className="text-sm text-gray-600 text-center">
            Excel file detected. Download to view contents.
          </p>
          <div className="mt-1 flex items-center text-xs text-gray-500">
            {file.name} ({Math.round(file.size / 1024)} KB)
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <File className="w-12 h-12 text-gray-400 mb-2" />
        <p className="text-sm text-gray-600 text-center">
          Preview not available for this file type.
        </p>
        <div className="mt-1 flex items-center text-xs text-gray-500">
          {file.name} ({Math.round(file.size / 1024)} KB)
        </div>
      </div>
    );
  };

  const handleDownload = () => {
    if (
      !formData.contract_copy ||
      typeof formData.contract_copy === 'string' ||
      previewUrl?.startsWith('<')
    )
      return;

    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = formData.contract_copy.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.vendor_name.trim())
        newErrors.vendor_name = 'Vendor name is required';
      if (!formData.contact_person.trim())
        newErrors.contact_person = 'Contact person is required';
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(formData.email))
        newErrors.email = 'Invalid email format';
      if (!formData.address.trim()) newErrors.address = 'Address is required';
      if (!formData.company_type.trim())
        newErrors.company_type = 'Company type is required';
    }

    if (step === 2) {
      if (!formData.pan_no.trim()) newErrors.pan_no = 'PAN number is required';
      else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_no.trim()))
        newErrors.pan_no = 'Invalid PAN format (e.g., ABCDE1234F)';

      if (!formData.rc_no.trim()) newErrors.rc_no = 'TIN number is required';

      formData.gst_details.forEach((detail, index) => {
        if (!detail.gst_no.trim()) {
          newErrors[`gst_no-${index}`] = 'GST number is required';
        } else if (
          !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
            detail.gst_no.trim()
          )
        ) {
          newErrors[`gst_no-${index}`] =
            'Invalid GST format (e.g., 22AAAAA0000A1Z5)';
        }

        if (!detail.state.trim()) {
          newErrors[`state-${index}`] = 'State is required';
        }
      });
    }

    if (step === 3) {
      if (!formData.contract_copy)
        newErrors.contract_copy = 'Contract copy is required';
      if (!formData.start_date) newErrors.start_date = 'Start date is required';
      if (!formData.end_date) newErrors.end_date = 'End date is required';
      if (
        formData.start_date &&
        formData.end_date &&
        formData.start_date >= formData.end_date
      )
        newErrors.end_date = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) setCurrentStep((prev) => prev + 1);
  };

  const handlePrevious = () => setCurrentStep((prev) => prev - 1);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateStep(currentStep)) onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 font-inter">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">
            {vendor
              ? 'Edit Vendor'
              : leadData
              ? 'Convert Lead to Vendor'
              : 'Add New Vendor'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300
            ${
              currentStep > step.number
                ? 'bg-green-500 text-white' // Completed steps - green
                : currentStep === step.number
                ? 'bg-blue-600 text-white' // Current step - blue
                : 'bg-gray-200 text-gray-600' // Incomplete steps - gray
            }`}
                >
                  {currentStep > step.number ? (
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
                <div className="ml-3">
                  <p
                    className={`text-sm font-medium transition-colors duration-300
              ${
                currentStep > step.number
                  ? 'text-green-600' // Completed steps - green
                  : currentStep === step.number
                  ? 'text-blue-600' // Current step - blue
                  : 'text-gray-500' // Incomplete steps - gray
              }`}
                  >
                    Step {step.number}
                  </p>
                  <p
                    className={`text-xs transition-colors duration-300
              ${
                currentStep > step.number
                  ? 'text-green-600' // Completed steps - green
                  : currentStep === step.number
                  ? 'text-blue-600' // Current step - blue
                  : 'text-gray-500' // Incomplete steps - gray
              }`}
                  >
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 transition-all duration-300
              ${
                currentStep > step.number
                  ? 'bg-green-500' // Completed connector - green
                  : currentStep === step.number
                  ? 'bg-blue-600' // Current connector - blue
                  : 'bg-gray-300' // Incomplete connector - gray
              }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-2 mb-4 text-blue-600">
                  <User className="w-6 h-6" />
                  <h3 className="text-lg font-medium text-gray-900">
                    Vendor Details & Address
                  </h3>
                </div>

                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 md:col-span-4">
                    <label
                      htmlFor="vendor_code"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Vendor Code
                    </label>
                    <input
                      type="text"
                      name="vendor_code"
                      id="vendor_code"
                      value={formData.vendor_code}
                      readOnly
                      className="input-field bg-gray-100 cursor-not-allowed"
                    />
                  </div>

                  <div className="col-span-12 md:col-span-8">
                    <label
                      htmlFor="vendor_name"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Vendor Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="vendor_name"
                      id="vendor_name"
                      value={formData.vendor_name || ''}
                      onChange={handleInputChange}
                      className={`input-field ${
                        errors.vendor_name ? 'border-red-500' : ''
                      }`}
                      placeholder="Enter vendor name"
                    />
                    {errors.vendor_name && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.vendor_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="contact_person"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Contact Person <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="contact_person"
                      id="contact_person"
                      value={formData.contact_person || ''}
                      onChange={handleInputChange}
                      className={`input-field ${
                        errors.contact_person ? 'border-red-500' : ''
                      }`}
                      placeholder="Enter contact person"
                    />
                    {errors.contact_person && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.contact_person}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="designation"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Designation
                    </label>
                    <input
                      type="text"
                      name="designation"
                      id="designation"
                      value={formData.designation || ''}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="Enter designation"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="company_type"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Company Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="company_type"
                      id="company_type"
                      value={formData.company_type || ''}
                      onChange={handleInputChange}
                      className={`input-field ${
                        errors.company_type ? 'border-red-500' : ''
                      }`}
                    >
                      <option value="">Select company type</option>
                      {companyTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    {errors.company_type && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.company_type}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="contact_no1"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Contact Number 1
                    </label>
                    <input
                      type="text"
                      name="contact_no1"
                      id="contact_no1"
                      value={formData.contact_no1 || ''}
                      onChange={handleInputChange}
                      className={`input-field ${
                        errors.contact_no1 ? 'border-red-500' : ''
                      }`}
                      placeholder="+91XXXXXXXXXX"
                    />
                    {errors.contact_no1 && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.contact_no1}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="contact_no2"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Contact Number 2
                    </label>
                    <input
                      type="text"
                      name="contact_no2"
                      id="contact_no2"
                      value={formData.contact_no2 || ''}
                      onChange={handleInputChange}
                      className={`input-field ${
                        errors.contact_no2 ? 'border-red-500' : ''
                      }`}
                      placeholder="+91XXXXXXXXXX"
                    />
                    {errors.contact_no2 && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.contact_no2}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={formData.email || ''}
                      onChange={handleInputChange}
                      className={`input-field ${
                        errors.email ? 'border-red-500' : ''
                      }`}
                      placeholder="Enter email"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label
                      htmlFor="address"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="address"
                      id="address"
                      value={formData.address || ''}
                      onChange={handleInputChange}
                      rows={1}
                      className={`input-field resize-none ${
                        errors.address ? 'border-red-500' : ''
                      }`}
                      placeholder="Enter complete address"
                    />
                    {errors.address && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.address}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-2 mb-4 text-blue-600">
                  <Shield className="w-6 h-6" />
                  <h3 className="text-lg font-medium text-gray-900">
                    Compliance Information
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="pan_no"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      PAN No <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="pan_no"
                      id="pan_no"
                      value={formData.pan_no || ''}
                      onChange={handleInputChange}
                      className={`input-field ${
                        errors.pan_no ? 'border-red-500' : ''
                      } uppercase`}
                      placeholder="AAAAA0000A"
                      maxLength={10}
                    />
                    {errors.pan_no && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.pan_no}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="rc_no"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      TIN No <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="rc_no"
                      id="rc_no"
                      value={formData.rc_no || ''}
                      onChange={handleInputChange}
                      className={`input-field ${
                        errors.rc_no ? 'border-red-500' : ''
                      }`}
                      placeholder="Enter TIN number"
                    />
                    {errors.rc_no && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.rc_no}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {formData.gst_details.map((detail, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 relative"
                    >
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => removeGstDetail(index)}
                          className="absolute top-2 right-2 text-red-500 hover:text-red-700 rounded-full p-1"
                          aria-label={`Remove GST detail ${index + 1}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        GST Details{' '}
                        {formData.gst_details.length > 1 ? `#${index + 1}` : ''}
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label
                            htmlFor={`gst_no-${index}`}
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            GST No <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="gst_no"
                            id={`gst_no-${index}`}
                            value={detail.gst_no || ''}
                            onChange={(e) => handleGstDetailChange(index, e)}
                            className={`input-field ${
                              errors[`gst_no-${index}`] ? 'border-red-500' : ''
                            }`}
                            placeholder="22AAAAA0000A1Z5"
                            maxLength={15}
                          />
                          {errors[`gst_no-${index}`] && (
                            <p className="text-red-500 text-xs mt-1">
                              {errors[`gst_no-${index}`]}
                            </p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor={`state-${index}`}
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            State <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="state"
                            id={`state-${index}`}
                            value={detail.state || ''}
                            onChange={(e) => handleGstDetailChange(index, e)}
                            className={`input-field ${
                              errors[`state-${index}`] ? 'border-red-500' : ''
                            }`}
                            placeholder="Enter state"
                          />
                          {errors[`state-${index}`] && (
                            <p className="text-red-500 text-xs mt-1">
                              {errors[`state-${index}`]}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addGstDetail}
                    className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1.5 rounded-lg border border-blue-600 hover:border-blue-800 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Another GST Details
                  </button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 mb-4 text-blue-600">
                  <FileText className="w-6 h-6" />
                  <h3 className="text-lg font-medium text-gray-900">
                    Contract Information
                  </h3>
                </div>

                <div className="grid grid-cols-1">
                  <div>
                    <label
                      htmlFor="contract_copy"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Contract Copy <span className="text-red-500">*</span>
                    </label>

                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
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
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <Upload className="w-4 h-4" />
                            <span>Choose File</span>
                          </label>

                          {formData.contract_copy && (
                            <div className="flex-1 min-w-0">
                              {typeof formData.contract_copy === 'string' ? (
                                <a
                                  href={formData.contract_copy}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:text-blue-800 underline truncate block"
                                  title="View previously uploaded file"
                                >
                                  View uploaded file
                                </a>
                              ) : (
                                <p
                                  className="text-sm text-gray-600 truncate"
                                  title={formData.contract_copy.name}
                                >
                                  {formData.contract_copy.name}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {errors.contract_copy && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.contract_copy}
                          </p>
                        )}
                      </div>

                      {formData.contract_copy && (
                        <div className="flex-1">
                          <div className="border rounded-lg p-3 bg-gray-50">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="text-sm font-medium text-gray-700">
                                File Preview
                              </h4>
                              {previewUrl &&
                                !previewUrl.startsWith('<') &&
                                previewUrl !== 'excel-file' && (
                                  <div className="flex gap-3">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        window.open(previewUrl, '_blank')
                                      }
                                      className="text-blue-500 hover:text-blue-700 flex items-center gap-1 text-xs"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Open</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleDownload}
                                      className="text-green-600 hover:text-green-800 flex items-center gap-1 text-xs"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      <span>Download</span>
                                    </button>
                                  </div>
                                )}
                            </div>

                            <div className="h-48 rounded bg-gray-100 overflow-hidden border border-gray-200">
                              {renderPreview(formData.contract_copy)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="start_date"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      id="start_date"
                      value={formData.start_date || ''}
                      onChange={handleInputChange}
                      className={`input-field ${
                        errors.start_date ? 'border-red-500' : ''
                      }`}
                    />
                    {errors.start_date && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.start_date}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="end_date"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      id="end_date"
                      value={formData.end_date || ''}
                      onChange={handleInputChange}
                      className={`input-field ${
                        errors.end_date ? 'border-red-500' : ''
                      }`}
                      min={formData.start_date}
                    />
                    {errors.end_date && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.end_date}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="status"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Status
                    </label>
                    <select
                      name="status"
                      id="status"
                      value={formData.status || ''}
                      onChange={handleInputChange}
                      className="input-field"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center space-x-3">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onCancel}
                className="btn-secondary"
              >
                Cancel
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-blue flex items-center space-x-2"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button type="submit" className="btn-blue">
                  {vendor ? 'Update Vendor' : 'Create Vendor'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorConversionForm;
