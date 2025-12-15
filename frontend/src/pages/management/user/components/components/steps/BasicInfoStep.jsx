import React, { useState, useRef, useEffect } from 'react';
import FormField from '../FormField';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { User, Hash, Building2, Eye, EyeOff, Camera, Edit, Trash2 } from 'lucide-react';
import PasswordStrengthIndicator from '../PasswordStrengthIndicator';
import { API_URL } from '../../../../../../api/config';

const BasicInfoStep = ({ formData, updateFormData, errors, setErrors }) => {
  const [touchedFields, setTouchedFields] = useState({});
  const [branchOptions, setBranchOptions] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);
  const [crop, setCrop] = useState(() =>
    makeAspectCrop(
      {
        unit: '%',
        width: 100,
        aspect: 1,
      },
      1
    )
  );
  const [completedCrop, setCompletedCrop] = useState(null);
  const [croppedImage, setCroppedImage] = useState(
    formData.profilePhotoPreview || null
  );
  const [showCropModal, setShowCropModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch branches from Masters API
  // useEffect(() => {
  //   const fetchBranches = async () => {
  //     try {
  //       setLoadingBranches(true);
  //       console.log('Fetching branches from API...');

  //       // const response = await fetch(`${API_URL}/masters/branches/`);
  //       const response = await fetch(`${API_URL}/masters/branches/`, {
  //         method: 'GET',
  //         headers: {
  //           'Authorization': `Token ${token}`,
  //           'Content-Type': 'application/json',
  //         },
  //       });

  //       if (response.ok) {
  //         const contentType = response.headers.get('content-type');
  //         if (contentType && contentType.includes('application/json')) {
  //           const branches = await response.json();
  //           console.log('Branches fetched successfully:', branches);

  //           // Filter only active branches and transform to dropdown format
  //           const activeBranches = branches.filter(branch => branch.status === 'Active');
  //           const formattedBranches = activeBranches.map(branch => ({
  //             value: branch.name, // Use branch name as value instead of ID
  //             label: branch.name,
  //             code: branch.code, // Store code for employee code generation
  //             id: branch.id // Keep ID for backward compatibility if needed
  //           }));

  //           setBranchOptions(formattedBranches);
  //           console.log('Formatted branches:', formattedBranches);
  //         } else {
  //           throw new Error('Response is not JSON');
  //         }
  //       } else {
  //         throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  //       }
  //     } catch (error) {
  //       console.error('Error fetching branches:', error);
  //       console.log('No branches available - API failed');

  //       // No fallback options - rely on API only
  //       setBranchOptions([]);
  //       console.error('Failed to load branches from API');
  //     } 
  //     finally {
  //       setLoadingBranches(false);
  //     }
  //   };

  //   fetchBranches();
  // }, []);


  // Fetch branches from Masters API with token:
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setLoadingBranches(true);
        console.log('Fetching branches from API...');

        //  Correct token key name
        const token = localStorage.getItem('token');
        if (!token) {
          setBranchOptions([]);
          return;
        }

        const response = await fetch(`${API_URL}/masters/branches/`, {
          method: 'GET',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const branches = await response.json();
            console.log('Branches fetched successfully:', branches);

            const activeBranches = branches.filter(branch => branch.status === 'Active');
            const formattedBranches = activeBranches.map(branch => ({
              value: branch.name,
              label: branch.name,
              code: branch.code,
              id: branch.id,
            }));

            setBranchOptions(formattedBranches);
            console.log('Formatted branches:', formattedBranches);
          } else {
            throw new Error('Response is not JSON');
          }
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

      } catch {
        setBranchOptions([]);
      } finally {
        setLoadingBranches(false);
      }
    };

    fetchBranches();
  }, []);

  useEffect(() => {
    if (formData.profilePhotoPreview && !croppedImage) {
      setCroppedImage(formData.profilePhotoPreview);
    }
  }, [formData.profilePhotoPreview, croppedImage]);

  function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
    return centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        aspect,
        mediaWidth,
        mediaHeight
      ),
      mediaWidth,
      mediaHeight
    );
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setErrors(prev => ({ ...prev, profilePhoto: undefined }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({
        ...prev,
        profilePhoto: 'File size exceeds 5MB limit'
      }));
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({
        ...prev,
        profilePhoto: 'Please select a valid image file'
      }));
      return;
    }

    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.profilePhoto;
      return newErrors;
    });

    updateFormData({ profilePhoto: file });
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewImage(event.target.result);
      setCroppedImage(null);
      setCrop(null);
      setShowCropModal(true);
    };
    reader.onerror = () => {
      setErrors(prev => ({
        ...prev,
        profilePhoto: 'Error reading image file'
      }));
    };
    reader.readAsDataURL(file);
  };

  const onImageLoad = (e) => {
    const { naturalWidth: width, naturalHeight: height } = e.currentTarget;
    const newCrop = centerAspectCrop(width, height, 1);
    setCrop(newCrop);
    setCompletedCrop(newCrop);
  };

  const getCroppedImg = () => {
    if (!completedCrop || !imgRef.current) {
      throw new Error('Missing crop data or image reference');
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        0.9
      );
    });
  };

  const handleSaveCrop = async () => {
    try {
      const croppedImageBlob = await getCroppedImg();
      const croppedImageUrl = URL.createObjectURL(croppedImageBlob);
      setCroppedImage(croppedImageUrl);

      updateFormData({
        profilePhotoPreview: croppedImageUrl,
      });

      setShowCropModal(false);
      setPreviewImage(null);
    } catch (err) {
      console.error('Error cropping image:', err);
      setErrors(prev => ({
        ...prev,
        profilePhoto: 'Failed to crop image'
      }));
    }
  };

  const handleCancelCrop = () => {
    setShowCropModal(false);
    setPreviewImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    updateFormData(prev => ({
      ...prev,
      profilePhoto: null,
      profilePhotoPreview: null,
    }));
    setCroppedImage(null);
  };

  const handleEditPhoto = () => {
    const fileToCrop = formData.profilePhoto;
    if (fileToCrop) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImage(event.target.result);
        setShowCropModal(true);
      };
      reader.readAsDataURL(fileToCrop);
    } else if (croppedImage) {
      setPreviewImage(croppedImage);
      setShowCropModal(true);
    }
  };

  const handleRemovePhoto = (e) => {
    e.stopPropagation();
    updateFormData({
      profilePhoto: null,
      profilePhotoPreview: null
    });
    setCroppedImage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    updateFormData({
      ...formData,
      [name]: newValue
    });

    // Clear error when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;

    // Mark field as touched
    setTouchedFields({
      ...touchedFields,
      [name]: true
    });

    // Add your validation logic here if needed
    // For example:
    // if (name === 'email' && value && !isValidEmail(value)) {
    //   setErrors({
    //     ...errors,
    //     [name]: 'Please enter a valid email address'
    //   });
    // }
  };

  useEffect(() => {
    if (formData.username && formData.username.length >= 3) {
      const timer = setTimeout(() => {
        // For now, assume username is available (you can implement actual API check later)
        // const reservedUsernames = ['admin', 'root', 'user', 'test'];
        // const isAvailable = !reservedUsernames.includes(
        //   formData.username.toLowerCase()
        // );
        // setUsernameAvailability(isAvailable);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // setUsernameAvailability(null);
    }
  }, [formData.username]);

  // Generate employee code based on branch (continuous numbering with slash format)
  const generateEmployeeCode = async (branchName) => {
    if (!branchName) return '';

    try {
      // Find the selected branch to get its code
      const selectedBranch = branchOptions.find(branch => branch.value === branchName);
      if (!selectedBranch) {
        console.error('Branch not found:', branchName);
        return '';
      }

      const branchCode = selectedBranch.code;
      console.log('Generating employee code for branch:', branchCode);

      // Get token for authentication
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return `${branchCode}/00001`;
      }

      // Call the new continuous employee code generation endpoint
      const response = await fetch(`${API_URL}/empreg/generate-employee-code/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch: branchCode // Send branch code (e.g., "MDU", "CBE")
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Generated employee code:', data.employeeCode);
        return data.employeeCode; // e.g., "MDU/00126", "CBE/00127", etc.
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to generate employee code:', response.status, errorData);
        // Fallback - generate a basic code
        return `${branchCode}/00001`;
      }
    } catch (error) {
      console.error('Error generating employee code:', error);

      // Final fallback: start with 00001 in slash format
      const selectedBranch = branchOptions.find(branch => branch.value === branchName);
      if (selectedBranch) {
        return `${selectedBranch.code}/00001`;
      }
      return '';
    }
  };

  const handleBranchChange = async (e) => {
    const branchName = e.target.value;

    // Update branch in form data
    updateFormData({
      ...formData,
      branch: branchName
    });

    // Auto-generate employee code based on selected branch
    if (branchName) {
      const employeeCode = await generateEmployeeCode(branchName);
      updateFormData({
        ...formData,
        branch: branchName,
        employeeCode: employeeCode
      });
    } else {
      // Clear employee code if no branch selected
      updateFormData({
        ...formData,
        branch: '',
        employeeCode: ''
      });
    }

    console.log('Branch changed to:', branchName);
  };

  return (
    <div className="space-y-6">
      {/* Crop Modal */}
      {showCropModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-1">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md sm:max-w-xl md:max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold mb-1">Crop Profile Photo</h3>
            <p className="text-sm text-gray-600 mb-1">
              Adjust the crop area to select your profile picture. The image will be cropped to a square.
            </p>

            <div className="flex justify-center items-center bg-gray-50 rounded-lg p-1">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
                className="max-w-full"
              >
                <img
                  ref={imgRef}
                  src={previewImage}
                  alt="Crop Preview"
                  className="max-w-[450px] max-h-[450px] w-auto h-auto object-contain"
                  style={{
                    minWidth: '300px',
                    minHeight: '150px'
                  }}
                  onLoad={onImageLoad}
                  onError={() => {
                    setErrors(prev => ({
                      ...prev,
                      profilePhoto: 'Failed to load image'
                    }));
                    handleCancelCrop();
                  }}
                />
              </ReactCrop>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              <button
                onClick={handleCancelCrop}
                className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCrop}
                className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={!completedCrop}
              >
                Save Profile Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Profile Photo Preview</h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="flex justify-center">
              <img
                src={croppedImage || formData.profilePhotoPreview}
                alt="Profile Preview"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
      <div className="pb-1">
        <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Left side - Form fields */}
        <div className="order-2 lg:order-1 lg:col-span-2 space-y-6">
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* Branch */}
            <FormField
              label="Branch"
              type="select"
              name="branch"
              value={formData.branch || ''}
              onChange={handleBranchChange}
              onBlur={handleBlur}
              required={true}
              options={[
                { value: '', label: loadingBranches ? 'Loading branches...' : 'Select Branch', isDisabled: loadingBranches },
                ...branchOptions
              ]}
              disabled={loadingBranches}
              icon={<Building2 size={16} className="text-gray-500" />}
              error={errors.branch}
            />

            {/* Employee Code */}
            <FormField
              label="Employee Code"
              type="text"
              name="employeeCode"
              value={formData.employeeCode || ''}
              onChange={handleChange}
              icon={<Hash size={16} className="text-gray-500" />}
              disabled={true}
              className="bg-gray-50 text-gray-500"
            />
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* First Name */}
            <FormField
              label="First Name"
              type="text"
              name="firstName"
              value={formData.firstName || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              required={true}
              placeholder="Enter first name"
              icon={<User size={16} className="text-gray-500" />}
              error={errors.firstName}
            />

            {/* Last Name */}
            <FormField
              label="Last Name"
              type="text"
              name="lastName"
              value={formData.lastName || ''}
              onChange={handleChange}
              placeholder="Enter last name"
              icon={<User size={16} className="text-gray-500" />}
              error={errors.lastName}
            />
          </div>
        </div>

        {/* Right side - Profile photo upload */}
        <div className="order-1 lg:order-2 flex items-center justify-center lg:justify-start mb-3 lg:mb-0">
          <div className="w-full max-w-[200px] mx-auto">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/jpg"
              className="hidden"
              id="profilePhoto"
            />
            <div className="flex flex-col items-center">
              <div
                className="relative w-40 h-40 rounded-full border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {(croppedImage || formData.profilePhotoPreview) ? (
                  <>
                    <img
                      src={croppedImage || formData.profilePhotoPreview}
                      alt="Profile preview"
                      className="w-full h-full rounded-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Camera className="h-8 w-8 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="text-center p-2">
                    <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <span className="text-xs text-gray-500">JPG, PNG (Max 5MB)</span>
                  </div>
                )}
              </div>

              {(croppedImage || formData.profilePhotoPreview) && (
                <div className="flex gap-3 mt-2 justify-center">
                  <button
                    type="button"
                    onClick={handleEditPhoto}
                    className="p-2 rounded-full bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 transition-colors"
                    title="Edit Photo"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="p-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors"
                    title="Delete Photo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}

              {errors.profilePhoto && (
                <p className="mt-1 text-xs text-red-600 text-center">{errors.profilePhoto}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Row 3: Personal Email | Official Email | Phone Number 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <FormField
            label="Personal Email"
            type="email"
            name="personalEmail"
            value={formData.personalEmail || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            required={true}
            placeholder="personal@example.com"
            error={errors.personalEmail}
          />
          <FormField
            label="Official Email"
            type="email"
            name="officialEmail"
            value={formData.officialEmail || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="employee@company.com"
            error={errors.officialEmail}
          />
          <FormField
            label="Personal Number"
            type="tel"
            name="phone1"
            value={formData.phone1 || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            required={true}
            placeholder="+91 9876543210"
            error={errors.phone1}
          />
        </div>

        {/* Row 4: Phone Number 2 | Allow Login | Password */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <FormField
            label="Official Number"
            type="tel"
            name="phone2"
            value={formData.phone2 || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="+91 9876543210"
            error={errors.phone2}
          />

          {/* Allow Login Toggle */}
          <div className="flex items-center h-full px-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Allow Login
              </span>
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.allowLogin !== undefined ? formData.allowLogin : true}
                  onChange={(e) => {
                    const next = e.target.checked;
                    updateFormData({ allowLogin: next, ...(next ? {} : { password: '' }) });
                  }}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </div>
            </label>
          </div>

          {/* Password Field */}
          <div>
            {(formData.allowLogin !== undefined ? formData.allowLogin : true) && (
              <div className="relative">
                <FormField
                  label="Password"
                  type={formData.showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password || ''}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required={false}
                  error={errors.password}
                  autoComplete="new-password"
                  spacingClass="mb-2"
                />
                <button
                  type="button"
                  className="absolute right-3 top-9 text-gray-500 hover:text-gray-700 focus:outline-none"
                  onClick={(e) => {
                    e.preventDefault();
                    updateFormData({ showPassword: !formData.showPassword });
                  }}
                  tabIndex="-1"
                  aria-label={formData.showPassword ? 'Hide password' : 'Show password'}
                >
                  {formData.showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                {formData.password && <PasswordStrengthIndicator password={formData.password} className="mt-1" />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicInfoStep;