 

// import React, { useEffect, useRef } from 'react';
// import Datapicker from '@ui/DatePicker';
// import {
//   User,
//   Lock,
//   Phone,
//   Calendar,
//   Briefcase,
//   CheckCircle2,
//   XCircle,
//   Mail,
//   IdCardLanyard,
//   UserRoundCheck,
//   MapPinHouse,
//   IndianRupee,
//   Paperclip,
//   Venus,
//   Mars,
//   Transgender,
// } from 'lucide-react';

// const FormField = ({
//   label,
//   type = 'text',
//   name,
//   value,
//   onChange,
//   onBlur,
//   required = false,
//   error,
//   placeholder,
//   options = [],
//   className = '',
//   disabled = false,
//   rows = 3,
//   accept,
//   showAvailability = false,
//   isAvailable = null,
//   icon,
//   autoComplete,
// }) => {
//   const validationColor = error
//     ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
//     : showAvailability && isAvailable === false
//     ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
//     : showAvailability && isAvailable === true
//     ? 'border-green-500 focus:ring-green-500 focus:border-green-500'
//     : 'border-gray-300';

//   const getFieldIcon = () => {
//     const lowerName = name.toLowerCase();
//     if (icon) return icon;
//     if (lowerName.includes('phone') || type === 'tel')
//       return <Phone size={16} className="text-gray-500" />;
//     if (lowerName.includes('password'))
//       return <Lock size={16} className="text-gray-500" />;
//     if (lowerName.includes('username'))
//       return <UserRoundCheck size={16} className="text-gray-500" />;
//     if (lowerName.includes('name'))
//       return <User size={16} className="text-gray-500" />;
//     if (lowerName.includes('code'))
//       return <IdCardLanyard size={16} className="text-gray-500" />;
//     if (lowerName.includes('ctc'))
//       return <IndianRupee size={16} className="text-gray-500" />;
//     if (lowerName.includes('experience'))
//       return <Briefcase size={16} className="text-gray-500" />;
//     if (type === 'file')
//       return <Paperclip size={16} className="text-gray-500" />;
//     if (type === 'email') return <Mail size={16} className="text-gray-500" />;
//     if (type === 'textarea')
//       return <MapPinHouse size={16} className="text-gray-500" />;
    
//     return null;
//   };

//   const fieldIcon = getFieldIcon();

//   const baseInputClass = `w-full rounded-md border ${
//     fieldIcon ? 'pl-10 pr-3' : 'px-3'
//   } py-2 text-sm text-gray-900 placeholder:text-gray-400
//   focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed ${className} ${validationColor}`;

//   const renderValidationIcon = () => {
//     if (error) {
//       return (
//         <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
//           <XCircle size={16} className="text-red-500" />
//         </div>
//       );
//     }
//     if (showAvailability) {
//       return (
//         <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
//           {isAvailable === false ? (
//             <XCircle size={16} className="text-red-500" />
//           ) : isAvailable === true ? (
//             <CheckCircle2 size={16} className="text-green-500" />
//           ) : null}
//         </div>
//       );
//     }
//     return null;
//   };

//   const handleSanitizedInput = (e) => {
//     const { name, value } = e.target;
//     const lowerName = name.toLowerCase();

//     // Specific handling for phone numbers
//     if (lowerName.includes('phone')) {
//       // Allow only digits for phone numbers, max 10, and starting with 6-9
//       const digits = value.replace(/\D/g, '').slice(0, 10);
//       if (digits === '' || /^[6-9]/.test(digits)) {
//         onChange({ target: { name, value: digits } });
//       }
//     }
//     // Specific handling for CTC
//     else if (name === 'ctc') {
//       // Allow only digits for CTC, max 7
//       const digits = value.replace(/\D/g, '');
//       if (digits === '' || /^\d{0,7}$/.test(digits)) {
//         onChange({ target: { name, value: digits } });
//       }
//     }
//     // Specific handling for yearsOfExperience
//     else if (name === 'yearsOfExperience') {
//       // Allow only digits for years of experience, max 2 digits
//       const digits = value.replace(/\D/g, '').slice(0, 2);
//       onChange({ target: { name, value: digits } });
//     }
//     // Handle all 'name' fields (except username) to allow only letters and spaces
//     else if (lowerName.includes('name') && name !== 'username') {
//       const lettersAndSpacesOnly = value.replace(/[^a-zA-Z\s]/g, '');
//       onChange({ target: { name, value: lettersAndSpacesOnly } });
//     }
//     // Default handling for all other fields
//     else {
//       onChange(e);
//     }
//   };

//   const renderInput = () => {
//     const showPrefix =
//       name.toLowerCase().includes('phone') && value?.length === 10;

//     return (
//       <div className="relative">
//         {fieldIcon && (
//           <span className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
//             {fieldIcon}
//           </span>
//         )}
//         {showPrefix && (
//           <span className="absolute left-9.5 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
//             +91
//           </span>
//         )}
//         <input
//           type={type}
//           name={name}
//           value={value}
//           onChange={handleSanitizedInput}
//           onBlur={onBlur}
//           placeholder={placeholder}
//           className={`${baseInputClass} ${showPrefix ? 'pl-16' : ''}`}
//           required={required}
//           disabled={disabled}
//           maxLength={type === 'tel' ? 10 : undefined}
//           autoComplete={autoComplete || (name.toLowerCase().includes('password') ? 
//             (name.toLowerCase().includes('confirm') ? 'new-password' : 
//              name.toLowerCase().includes('current') ? 'current-password' : 'new-password') : 
//             autoComplete)}
//         />
//         {renderValidationIcon()}
//       </div>
//     );
//   };

//   const getGenderIcon = (genderValue) => {
//     switch (genderValue.toLowerCase()) {
//       case 'male':
//         return <Mars size={16} className="mr-1" />;
//       case 'female':
//         return <Venus size={16} className="mr-1" />;
//       case 'other':
//         return <Transgender size={16} className="mr-1" />;
//       default:
//         return null;
//     }
//   };

//   const renderField = () => {
//     switch (type) {
//       case 'select':
//         return (
//           <div className="relative">
//             {fieldIcon && (
//               <span className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
//                 {fieldIcon}
//               </span>
//             )}
//             <select
//               name={name}
//               value={value}
//               onChange={onChange}
//               onBlur={onBlur}
//               className={baseInputClass}
//               required={required}
//               disabled={disabled}
//             >
//               <option value="">Select {label}</option>
//               {options.map((opt) => (
//                 <option key={opt.value} value={opt.value}>
//                   {opt.label}
//                 </option>
//               ))}
//             </select>
//             {renderValidationIcon()}
//           </div>
//         );

//       case 'textarea':
//         return (
//           <div className="relative">
//             {fieldIcon && (
//               <span className="absolute left-3 top-3 pointer-events-none">
//                 {fieldIcon}
//               </span>
//             )}
//             <textarea
//               name={name}
//               value={value}
//               onChange={onChange}
//               onBlur={onBlur}
//               placeholder={placeholder}
//               className={baseInputClass}
//               rows={rows}
//               required={required}
//               disabled={disabled}
//             />
//             {renderValidationIcon()}
//           </div>
//         );

//       case 'date': {
//         let minDate = null;
//         let maxDate = null;
//         const today = new Date();

//         if (name === 'dateOfBirth') {
//           maxDate = new Date(today.getFullYear() - 18, 11, 31); // Max 18 years ago
//           minDate = new Date(today.getFullYear() - 60, 0, 1); // Min 60 years ago
//         } else if (name === 'joiningDate') {
//           maxDate = today; // Cannot select a future date
//         }

//         return (
//           <div className="relative">
//             {fieldIcon && (
//               <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
//                 {fieldIcon}
//               </div>
//             )}
//             <Datapicker
//               label={label}
//               value={value}
//               onChange={(newDate) => {
//                 onChange({
//                   target: {
//                     name,
//                     value: newDate,
//                   },
//                 });
//               }}
//               onBlur={onBlur}
//               minDate={minDate}
//               maxDate={maxDate}
//               disableFuture={name === 'dateOfBirth' || name === 'joiningDate'}
//             />
//             {renderValidationIcon()}
//           </div>
//         );
//       }

//       case 'file':
//         return (
//           <div className="relative">
//             {fieldIcon && (
//               <span className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
//                 {fieldIcon}
//               </span>
//             )}
//             <input
//               type="file"
//               name={name}
//               onChange={onChange}
//               onBlur={onBlur}
//               className={baseInputClass}
//               required={required}
//               disabled={disabled}
//               accept={accept}
//             />
//             {renderValidationIcon()}
//           </div>
//         );

//       case 'radio':
//         return (
//           <div className="flex space-x-6">
//             {options.map((opt) => (
//               <label key={opt.value} className="flex items-center">
//                 <input
//                   type="radio"
//                   name={name}
//                   value={opt.value}
//                   checked={value === opt.value}
//                   onChange={onChange}
//                   onBlur={onBlur}
//                   className="form-radio mr-2"
//                   required={required}
//                   disabled={disabled}
//                 />
//                 <span className="text-sm text-gray-700 flex items-center">
//                   {name.toLowerCase().includes('gender') &&
//                     getGenderIcon(opt.value)}
//                   {opt.label}
//                 </span>
//               </label>
//             ))}
//           </div>
//         );

//       default:
//         return renderInput();
//     }
//   };

//   return (
//     <div className="mb-6">
//       <label className="block text-sm font-medium text-gray-700 mb-2">
//         {label}
//         {required && <span className="text-red-500 ml-1">*</span>}
//       </label>
//       {renderField()}
//       {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
//     </div>
//   );
// };

// export default FormField;



// old 
import React, { useEffect, useRef } from 'react';
import Datapicker from '@ui/DatePicker';
import {
  User,
  Lock,
  Phone,
  Calendar,
  Briefcase,
  CheckCircle2,
  XCircle,
  Mail,
  IdCardLanyard,
  UserRoundCheck,
  MapPinHouse,
  IndianRupee,
  Paperclip,
  Venus,
  Mars,
  Transgender,
  Plus,
  Image as ImageIcon,
  FileText,
  Eye,
  Trash2,
} from 'lucide-react';
import Select from 'react-select';

const FormField = ({
  label,
  type = 'text',
  name,
  value,
  onChange,
  onBlur,
  required = false,
  error,
  placeholder,
  options = [],
  className = '',
  disabled = false,
  rows = 3,
  accept,
  showAvailability = false,
  isAvailable = null,
  icon,
  multiple = false,
  spacingClass = 'mb-2',
  id,
  files = [],
  onViewFile,
  onDeleteFile,
  showAddButton = true,
}) => {
  const fieldId = id || name;
  const validationColor = error
    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
    : showAvailability && isAvailable === false
    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
    : showAvailability && isAvailable === true
    ? 'border-green-500 focus:ring-green-500 focus:border-green-500'
    : 'border-gray-300';

  const getFieldIcon = () => {
    const lowerName = name.toLowerCase();
    if (icon) return icon;
    if (lowerName.includes('phone') || type === 'tel')
      return <Phone size={16} className="text-gray-500" />;
    if (lowerName.includes('password'))
      return <Lock size={16} className="text-gray-500" />;
    if (lowerName.includes('username'))
      return <UserRoundCheck size={16} className="text-gray-500" />;
    if (lowerName.includes('name'))
      return <User size={16} className="text-gray-500" />;
    if (lowerName.includes('code'))
      return <IdCardLanyard size={16} className="text-gray-500" />;
    if (lowerName.includes('ctc'))
      return <IndianRupee size={16} className="text-gray-500" />;
    if (lowerName.includes('experience'))
      return <Briefcase size={16} className="text-gray-500" />;
    if (type === 'file')
      return <Paperclip size={16} className="text-gray-500" />;
    if (type === 'email') return <Mail size={16} className="text-gray-500" />;
    if (type === 'textarea')
      return <MapPinHouse size={16} className="text-gray-500" />;
    
    return null;
  };

  const inputElRef = useRef(null);

  useEffect(() => {
    if (type === 'file' && inputElRef.current) {
      if (!Array.isArray(files) || files.length === 0) {
        inputElRef.current.value = '';
      }
    }
  }, [files, type]);

  const fieldIcon = getFieldIcon();

  const baseInputClass = `w-full rounded-md border ${
    fieldIcon ? 'pl-10 pr-3' : 'px-3'
  } py-2 text-sm text-gray-900 placeholder:text-gray-400
  focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed ${className} ${validationColor}`;

  const renderValidationIcon = () => {
    if (error) {
      return (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <XCircle size={16} className="text-red-500" />
        </div>
      );
    }
    if (showAvailability) {
      return (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isAvailable === false ? (
            <XCircle size={16} className="text-red-500" />
          ) : isAvailable === true ? (
            <CheckCircle2 size={16} className="text-green-500" />
          ) : null}
        </div>
      );
    }
    return null;
  };

  const handleSanitizedInput = (e) => {
    const { name, value } = e.target;
    const lowerName = name.toLowerCase();

    // Specific handling for phone numbers
    if (lowerName.includes('phone')) {
      // Allow only digits for phone numbers, max 10, and starting with 6-9
      const digits = value.replace(/\D/g, '').slice(0, 10);
      if (digits === '' || /^[6-9]/.test(digits)) {
        onChange({ target: { name, value: digits } });
      }
    }
    // Specific handling for CTC
    else if (name === 'ctc') {
      // Allow only digits for CTC, max 7
      const digits = value.replace(/\D/g, '');
      if (digits === '' || /^\d{0,7}$/.test(digits)) {
        onChange({ target: { name, value: digits } });
      }
    }
    // Specific handling for yearsOfExperience
    else if (name === 'yearsOfExperience') {
      // Allow only digits for years of experience, max 2 digits
      const digits = value.replace(/\D/g, '').slice(0, 2);
      onChange({ target: { name, value: digits } });
    }
    // Handle all 'name' fields (except username) to allow only letters and spaces
    else if (lowerName.includes('name') && name !== 'username') {
      const lettersAndSpacesOnly = value.replace(/[^a-zA-Z\s]/g, '');
      onChange({ target: { name, value: lettersAndSpacesOnly } });
    }
    // Default handling for all other fields
    else {
      onChange(e);
    }
  };

  const renderInput = () => {
    const showPrefix =
      name.toLowerCase().includes('phone') && value?.length === 10;

    return (
      <div className="relative">
        {fieldIcon && (
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            {fieldIcon}
          </span>
        )}
        {showPrefix && (
          <span className="absolute left-9.5 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
            +91
          </span>
        )}
        <input
          type={type}
          name={name}
          id={fieldId}
          value={value}
          onChange={handleSanitizedInput}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`${baseInputClass} ${showPrefix ? 'pl-16' : ''}`}
          required={required}
          disabled={disabled}
          maxLength={type === 'tel' ? 10 : undefined}
        />
        {renderValidationIcon()}
      </div>
    );
  };

  const getGenderIcon = (genderValue) => {
    switch (genderValue.toLowerCase()) {
      case 'male':
        return <Mars size={16} className="mr-1" />;
      case 'female':
        return <Venus size={16} className="mr-1" />;
      case 'other':
        return <Transgender size={16} className="mr-1" />;
      default:
        return null;
    }
  };

  const renderField = () => {
    switch (type) {
      case 'select':
  return (
    <div className="relative">
      {fieldIcon && (
        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          {fieldIcon}
        </span>
      )}
      <Select
        name={name}
        inputId={fieldId}
        instanceId={fieldId}
        options={options}
        value={options.find((opt) => opt.value === value) || null}
        onChange={(selectedOption) =>
          onChange({
            target: {
              name,
              value: selectedOption ? selectedOption.value : '',
            },
          })
        }
        onBlur={onBlur}
        placeholder={`Select ${label}`}
        isSearchable
        classNamePrefix="react-select"
        className="react-select-container"
        required={required}
        isDisabled={disabled}
        styles={{
          menuList: (provided) => ({
            ...provided,
            maxHeight: '200px',
            overflowY: 'auto',
          }),
        }}
      />
      {renderValidationIcon()}
    </div>
  );

      case 'textarea':
        return (
          <div className="relative">
            {fieldIcon && (
              <span className="absolute left-3 top-3 pointer-events-none">
                {fieldIcon}
              </span>
            )}
            <textarea
              name={name}
              id={fieldId}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              placeholder={placeholder}
              className={baseInputClass}
              rows={rows}
              required={required}
              disabled={disabled}
            />
            {renderValidationIcon()}
          </div>
        );

      case 'date': {
        let minDate = null;
        let maxDate = null;
        const today = new Date();

        if (name === 'dateOfBirth') {
          maxDate = new Date(today.getFullYear() - 18, 11, 31); // Max 18 years ago
          minDate = new Date(today.getFullYear() - 60, 0, 1); // Min 60 years ago
        } else if (name === 'joiningDate') {
          maxDate = today; // Cannot select a future date
        }

        return (
          <div className="relative">
            {fieldIcon && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                {fieldIcon}
              </div>
            )}
            <Datapicker
              label={label}
              value={value}
              onChange={(newDate) => {
                onChange({
                  target: {
                    name,
                    value: newDate,
                  },
                });
              }}
              onBlur={onBlur}
              minDate={minDate}
              maxDate={maxDate}
              disableFuture={name === 'dateOfBirth' || name === 'joiningDate'}
            />
            {renderValidationIcon()}
          </div>
        );
      }

      case 'file':
        return (
          <div>
            {/* Show input only when no files are selected */}
            {(!Array.isArray(files) || files.length === 0) && (
              <div className="relative">
                {fieldIcon && (
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    {fieldIcon}
                  </span>
                )}
                <input
                  type="file"
                  name={name}
                  id={fieldId}
                  onChange={(e) => {
                    onChange && onChange(e);
                    if (inputElRef.current) inputElRef.current.value = '';
                  }}
                  onBlur={onBlur}
                  className={baseInputClass}
                  required={required}
                  disabled={disabled}
                  accept={accept}
                  multiple={multiple}
                  ref={inputElRef}
                />
                {renderValidationIcon()}
              </div>
            )}
            {(Array.isArray(files) && files.length > 0) && (
              <div className="mt-2 space-y-2">
                {files.map((file, idx) => (
                  <div
                    key={`${file?.name || 'file'}-${idx}`}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {(() => {
                        const name = (file?.name || '').toLowerCase();
                        const type = (file?.type || '').toLowerCase();
                        const looksImage = type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(name);
                        const looksPdf = type === 'application/pdf' || /\.pdf$/i.test(name);
                        if (looksImage) {
                          return (
                            <div className="w-9 h-9 rounded-full border border-green-200 bg-green-50 overflow-hidden shrink-0 flex items-center justify-center">
                              <img
                                src={URL.createObjectURL(file)}
                                alt="Preview"
                                className="w-9 h-9 object-cover"
                                onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)}
                              />
                            </div>
                          );
                        }
                        if (looksPdf) {
                          return (
                            <div className="w-9 h-9 rounded-full border border-red-200 bg-red-50 overflow-hidden shrink-0 flex items-center justify-center">
                              <FileText size={18} className="text-red-600" />
                            </div>
                          );
                        }
                        return (
                          <div className="w-9 h-9 rounded-full border border-blue-200 bg-blue-50 overflow-hidden shrink-0 flex items-center justify-center">
                            <Paperclip size={18} className="text-blue-600" />
                          </div>
                        );
                      })()}
                      
                      <div className="text-sm text-gray-800 truncate max-w-[260px] sm:max-w-[420px]">{file?.name || 'document'}</div>
                    </div>
                    <div className="flex items-center gap-3 pl-3">
                      {typeof onViewFile === 'function' && (
                        <button
                          type="button"
                          onClick={() => onViewFile(idx)}
                          className="text-blue-600 hover:text-blue-800"
                          aria-label="View file"
                          title="View"
                        >
                          <Eye size={18} />
                        </button>
                      )}
                      {typeof onDeleteFile === 'function' && (
                        <button
                          type="button"
                          onClick={() => onDeleteFile(idx)}
                          className="text-red-600 hover:text-red-800"
                          aria-label="Delete file"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'radio':
        return (
          <div className="flex space-x-6">
            {options.map((opt) => (
              <label key={opt.value} className="flex items-center">
                <input
                  type="radio"
                  name={name}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={onChange}
                  onBlur={onBlur}
                  className="form-radio mr-2"
                  required={required}
                  disabled={disabled}
                />
                <span className="text-sm text-gray-700 flex items-center">
                  {name.toLowerCase().includes('gender') &&
                    getGenderIcon(opt.value)}
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        );

      default:
        return renderInput();

    }
  };

  // Only set htmlFor on label for types that render a focusable element with matching id
  const labelSupportsFor = (
    type === 'text' ||
    type === 'number' ||
    type === 'tel' ||
    type === 'email' ||
    type === 'password' ||
    type === 'textarea' ||
    type === 'file' ||
    type === 'select'
  );

  return (
    <div className={spacingClass}>
      <div className="flex items-center justify-between mb-2">
        <label htmlFor={labelSupportsFor ? fieldId : undefined} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {type === 'file' && multiple && showAddButton && Array.isArray(files) && files.length > 0 && (
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById(fieldId);
              if (el) el.click();
            }}
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
            title={`Add ${label}`}
          >
            <Plus size={16} /> Add
          </button>
        )}
      </div>
      {renderField()}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default FormField;
