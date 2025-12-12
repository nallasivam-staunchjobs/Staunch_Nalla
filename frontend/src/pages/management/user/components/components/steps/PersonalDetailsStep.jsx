import FormField from '../FormField';
import { useMemo, useEffect } from 'react';
import { Mars, User, Users, Venus } from 'lucide-react';
import { useState } from 'react';
import { validateStep } from '../../utils/validation'
import { masterService } from '../../../../../../api/masterService.js';

const PersonalDetailsStep = ({ formData, updateFormData, errors, setErrors }) => {
  const [touchedFields, setTouchedFields] = useState({});
  const [sameAsPermanent, setSameAsPermanent] = useState(false);

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouchedFields(prev => ({ ...prev, [name]: true }));
    validateField(name);
  };

  const validateField = (fieldName) => {
    const stepErrors = validateStep(3, {
      ...formData,
      // Include any dependent fields if needed
    });

    setErrors(prev => ({
      ...prev,
      [fieldName]: stepErrors[fieldName] || undefined
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });

    if (sameAsPermanent && name === 'permanentAddress') {
      updateFormData({ currentAddress: value });
    }

    if (errors[name] && touchedFields[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleCheckboxChange = (e) => {
    const checked = e.target.checked;
    setSameAsPermanent(checked);

    if (checked) {
      updateFormData({ currentAddress: formData.permanentAddress || '' });
    }
  };

  const handleRadioChange = (e) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });

    // Immediately validate radio selections
    validateField(name);
  };

  const [genderOptions, setGenderOptions] = useState([]);
  const [bloodGroups, setBloodGroups] = useState([]);
  const [maritalStatusOptions, setMaritalStatusOptions] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const loadMasters = async () => {
      try {
        const [genders, bloods, maritals] = await Promise.all([
          masterService.fetchGenders(),
          masterService.fetchBloodGroups(),
          masterService.fetchMaritalStatuses()
        ]);

        if (!isMounted) return;

        setGenderOptions(
          (genders || []).map(g => ({
            value: g.name,
            label: g.name,
            icon: g.name?.toLowerCase() === 'female' ? <Venus className="mt-2" /> : <Mars className="mt-2" />
          }))
        );

        setBloodGroups((bloods || []).map(b => ({ value: b.name, label: b.name })));

        setMaritalStatusOptions(
          (maritals || []).map(m => ({
            value: m.name,
            label: m.name,
            icon: m.name?.toLowerCase() === 'married' ? <Users className="mt-2" /> : <User className="mt-2" />
          }))
        );
      } catch (e) {
        console.error('Failed to load master options', e);
      }
    };
    loadMasters();
    return () => { isMounted = false; };
  }, []);

  // Custom Radio Tile Component with error state
  const RadioTile = ({
    name,
    value,
    currentValue,
    onChange,
    option,
    error,
    className = '',
  }) => {
    const isActive = currentValue === value;
    const hasError = !!error;

    let selectedColor = 'border-gray-300 hover:border-gray-400 hover:bg-gray-100 text-gray-800';
    let errorClass = '';

    if (hasError) {
      errorClass = 'border-red-500';
    }

    if (isActive) {
      if (name === 'gender' && value === 'Female') {
        selectedColor = 'border-pink-500 bg-pink-500 text-white';
      } else if (name === 'gender' && value === 'Male') {
        selectedColor = 'border-blue-500 bg-blue-500 text-white';
      } else if (name === 'maritalStatus' && value === 'Single') {
        selectedColor = 'border-green-600 bg-green-600 text-white';
      } else if (name === 'maritalStatus' && value === 'Married') {
        selectedColor = 'border-red-700 bg-red-700 text-white';
      }
    }

    return (
      <label
        className={`relative flex flex-col items-center justify-center border-2 rounded-lg cursor-pointer transition-all ${className} ${selectedColor} ${errorClass} shadow-md`}
      >
        <input
          type="radio"
          name={name}
          value={value}
          checked={isActive}
          onChange={onChange}
          className="absolute opacity-0 w-0 h-0"
        />
        <span>{option.icon}</span>
        <span className="text-xs tracking-wide mb-2">{option.label}</span>
      </label>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Gender */}
          <div className="space-y-1">
            <FormField
              label="Gender"
              type="select"
              name="gender"
              value={formData.gender || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              options={[{ value: '', label: 'Select Gender', isDisabled: false }, ...genderOptions]}
              placeholder="Select Gender"
              error={errors.gender}
              required
              className="w-full"
            />
          </div>

          {/* Date of Birth */}
          <div className="space-y-1">
            <FormField
              label="Date of Birth"
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.dateOfBirth}
              required
              minDate={new Date(new Date().getFullYear() - 60, 0, 1)}
              maxDate={new Date(new Date().getFullYear() - 18, 11, 31)}
              className="w-full"
            />
          </div>

          {/* Blood Group */}
          <div className="space-y-1">
            <FormField
              label="Blood Group"
              type="select"
              name="bloodGroup"
              value={formData.bloodGroup || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              options={[{ value: '', label: 'Select Blood Group', isDisabled: false }, ...bloodGroups]}
              placeholder="Select blood group"
              error={errors.bloodGroup}
              className="w-full"
            />
          </div>

          {/* Marital Status */}
          <div className="space-y-1">
            <FormField
              label="Marital Status"
              type="select"
              name="maritalStatus"
              value={formData.maritalStatus || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              options={[{ value: '', label: 'Select Marital Status', isDisabled: false }, ...maritalStatusOptions]}
              placeholder="Select status"
              error={errors.maritalStatus}
              className="w-full"
            />
          </div>
          <FormField
            label="Emergency Contact Person"
            type="text"
            name="emergencyContact1Name"
            value={formData.emergencyContact1Name || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            required={true}
            placeholder="Contact name"
            error={errors.emergencyContact1Name}
          />

          <FormField
            label="Emergency Contact Number"
            type="tel"
            name="emergencyContact1Phone"
            value={formData.emergencyContact1Phone || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            required={true}
            placeholder="+91 98765 43210"
            error={errors.emergencyContact1Phone}
          />
        </div>
      </div>

      {/* Address Section */}
      <div className="space-y-3">
        <h4 className="text-md font-medium text-gray-900">Address Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormField
              label="Permanent Address"
              type="textarea"
              name="permanentAddress"
              value={formData.permanentAddress || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter complete permanent address including pin code"
              rows={2}
              error={errors.permanentAddress}
              className="w-full"
              required
            />
          </div>

          <div className="">
            <div className="flex justify-between items-center">
              <label htmlFor="currentAddress" className="text-sm font-medium text-gray-700">
                Current Address (if different)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sameAsPermanent"
                  checked={sameAsPermanent}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="sameAsPermanent" className="text-sm text-gray-700">
                  Same as Permanent
                </label>
              </div>
            </div>
            <FormField
              type="textarea"
              name="currentAddress"
              value={formData.currentAddress || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter complete current address if different from permanent"
              rows={2}
              error={errors.currentAddress}
              className="w-full mt-1"
              disabled={sameAsPermanent}
            />
          </div>
        </div>
      </div>

     
    </div>
  );
};

export default PersonalDetailsStep;