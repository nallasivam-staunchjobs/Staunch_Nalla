import React, { useState, useEffect } from 'react';
import FormField from '../FormField';
import { validateStep } from '../../utils/validation';

const EducationExperienceStep = ({ formData, updateFormData, errors, setErrors }) => {
  const [touchedFields, setTouchedFields] = useState({});
  const [degreeOptions, setDegreeOptions] = useState([]);
  const [experienceOptions, setExperienceOptions] = useState([]);
  const [mastersLoading, setMastersLoading] = useState(false);

  // Fetch Masters: Educations and Experience
  useEffect(() => {
    const fetchMasters = async () => {
      try {
        setMastersLoading(true);
        const base = import.meta.env.VITE_API_BASE_URL;
        const [eduRes, expRes] = await Promise.all([
          fetch(`${base}/masters/educations/`),
          fetch(`${base}/masters/experience/`),
        ]);

        if (!eduRes.ok) throw new Error(`Educations fetch failed: ${eduRes.status}`);
        if (!expRes.ok) throw new Error(`Experience fetch failed: ${expRes.status}`);

        const [eduData, expData] = await Promise.all([eduRes.json(), expRes.json()]);

        const toOptions = (arr) =>
          (Array.isArray(arr) ? arr : [])
            .filter((i) => !i.status || i.status === 'Active')
            .map((i) => ({ value: i.name, label: i.name }));

        // Parse years from masters experience name into numeric string values
        const parseYearsValue = (name) => {
          const str = String(name || '');
          const match = str.match(/\d+/);
          if (match) return String(parseInt(match[0], 10));
          if (/fresh/i.test(str)) return '0';
          return '0';
        };

        setDegreeOptions(toOptions(eduData));
        setExperienceOptions(
          (Array.isArray(expData) ? expData : [])
            .filter((i) => !i.status || i.status === 'Active')
            .map((i) => ({ value: parseYearsValue(i.name), label: i.name }))
        );
      } catch (err) {
        console.error('Error loading master options:', err);
      } finally {
        setMastersLoading(false);
      }
    };

    fetchMasters();
  }, []);

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouchedFields(prev => ({ ...prev, [name]: true }));
    validateField(name);
  };

  const validateField = (fieldName) => {
    const stepErrors = validateStep(4, {
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

    // Clear error when user starts typing
    if (errors[name] && touchedFields[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Helpers for Aadhaar preview list
  const isImage = (file) => file && file.type && file.type.startsWith('image/');
  const isPdf = (file) => file && file.type === 'application/pdf';
  const humanName = (file) => (file?.name ? file.name : 'document');
  const handleViewAadhaar = (idx) => {
    const file = (formData.aadhaarFiles || [])[idx];
    if (!file) return;
    const url = URL.createObjectURL(file);
    window.open(url, '_blank', 'noopener');
    // Optional: revoke after some delay
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  const handleDeleteAadhaar = (idx) => {
    const list = Array.from(formData.aadhaarFiles || []);
    list.splice(idx, 1);
    updateFormData({ aadhaarFiles: list });
  };

  // Aadhaar Front/Back single-file handlers
  const openFile = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  const handleViewAadhaarFront = () => openFile(formData.aadhaarFront || null);
  const handleDeleteAadhaarFront = () => updateFormData({ aadhaarFront: null });
  const handleViewAadhaarBack = () => openFile(formData.aadhaarBack || null);
  const handleDeleteAadhaarBack = () => updateFormData({ aadhaarBack: null });

  // PAN helpers
  const handleViewPAN = (idx) => {
    const file = (formData.panFiles || [])[idx];
    if (!file) return;
    const url = URL.createObjectURL(file);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  const handleDeletePAN = (idx) => {
    const list = Array.from(formData.panFiles || []);
    list.splice(idx, 1);
    updateFormData({ panFiles: list });
  };

  // Offer/Relieving/Payslip helpers
  const openBlob = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const handleViewOffer = (idx) => openBlob((formData.offerLetterFiles || [])[idx]);
  const handleDeleteOffer = (idx) => {
    const list = Array.from(formData.offerLetterFiles || []);
    list.splice(idx, 1);
    updateFormData({ offerLetterFiles: list });
  };

  const handleViewRelieving = (idx) => openBlob((formData.relievingLetterFiles || [])[idx]);
  const handleDeleteRelieving = (idx) => {
    const list = Array.from(formData.relievingLetterFiles || []);
    list.splice(idx, 1);
    updateFormData({ relievingLetterFiles: list });
  };

  const handleViewPayslip = (idx) => openBlob((formData.payslipFiles || [])[idx]);
  const handleDeletePayslip = (idx) => {
    const list = Array.from(formData.payslipFiles || []);
    list.splice(idx, 1);
    updateFormData({ payslipFiles: list });
  };

  // Handle file inputs and store selected files in formData
  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const fileList = files ? Array.from(files) : [];
    // For Aadhaar (multi upload), append to existing list; otherwise, replace
    if (name === 'aadhaarFiles') {
      const existing = Array.isArray(formData.aadhaarFiles) ? formData.aadhaarFiles : [];
      // Optional: prevent duplicates by name+size
      const merged = [...existing];
      for (const f of fileList) {
        if (!merged.some(x => x.name === f.name && x.size === f.size && x.type === f.type)) {
          merged.push(f);
        }
      }
      updateFormData({ aadhaarFiles: merged });
    } else if (name === 'aadhaarFront') {
      updateFormData({ aadhaarFront: fileList[0] || null });
    } else if (name === 'aadhaarBack') {
      updateFormData({ aadhaarBack: fileList[0] || null });
    } else if (name === 'panFiles') {
      const existing = Array.isArray(formData.panFiles) ? formData.panFiles : [];
      const merged = [...existing];
      for (const f of fileList) {
        if (!merged.some(x => x.name === f.name && x.size === f.size && x.type === f.type)) {
          merged.push(f);
        }
      }
      updateFormData({ panFiles: merged });
    } else if (name === 'offerLetterFiles') {
      const existing = Array.isArray(formData.offerLetterFiles) ? formData.offerLetterFiles : [];
      const merged = [...existing];
      for (const f of fileList) {
        if (!merged.some(x => x.name === f.name && x.size === f.size && x.type === f.type)) merged.push(f);
      }
      updateFormData({ offerLetterFiles: merged });
    } else if (name === 'relievingLetterFiles') {
      const existing = Array.isArray(formData.relievingLetterFiles) ? formData.relievingLetterFiles : [];
      const merged = [...existing];
      for (const f of fileList) {
        if (!merged.some(x => x.name === f.name && x.size === f.size && x.type === f.type)) merged.push(f);
      }
      updateFormData({ relievingLetterFiles: merged });
    } else if (name === 'payslipFiles') {
      const existing = Array.isArray(formData.payslipFiles) ? formData.payslipFiles : [];
      const merged = [...existing];
      for (const f of fileList) {
        if (!merged.some(x => x.name === f.name && x.size === f.size && x.type === f.type)) merged.push(f);
      }
      updateFormData({ payslipFiles: merged });
    } else {
      updateFormData({ [name]: fileList });
    }

    if (errors[name] && touchedFields[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <div className="space-y-1">
      {/* Section Header */}
      <div className="pb-1">
        <h3 className="text-lg font-semibold text-gray-900">Education & Experience</h3>

      </div>

      {/* Education Section */}
      <div className="space-y-2 ">
        <h4 className="text-md font-medium text-gray-900">Education</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          <FormField
            label="Highest Degree"
            type="select"
            name="degree"
            value={formData.degree || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            options={[{ value: '', label: 'Select Highest Degree', isDisabled: false }, ...degreeOptions]}
            required={true}
            error={errors.degree}
            spacingClass="mb-2"
          />
          <FormField
            label="Specialization / Field of Study"
            name="specialization"
            value={formData.specialization || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="e.g., Computer Science, Business Administration"
            error={errors.specialization}
            spacingClass="mb-2"
          />
        </div>
      </div>

      {/* Work Experience Section */}
      <div className="space-y-2">
        <h4 className="text-md font-medium text-gray-900">Work Experience</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {/* Years of Experience */}
            <FormField
              label="Years of Experience"
              type="select"
              name="yearsOfExperience"
              value={formData.yearsOfExperience || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              options={[{ value: '', label: 'Select Experience', isDisabled: false }, ...experienceOptions]}
              error={errors.yearsOfExperience}
              spacingClass="mb-2"
            />

            {/* Conditionally show when experience > 0 */}
            {Number(formData.yearsOfExperience) > 0 && (
              <>
                <FormField
                  label="Last Company Name"
                  name="lastCompany"
                  value={formData.lastCompany || ''}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Previous employer"
                  error={errors.lastCompany}
                  spacingClass="mb-2"
                />
                <FormField
                  label="More Experience Details"
                  type="textarea"
                  name="experienceDetails"
                  value={formData.experienceDetails || ''}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Describe your work experience"
                  rows={1}
                  error={errors.experienceDetails}
                  spacingClass="mb-2"
                />
              </>
            )}

            {/* Aadhaar Section – always visible */}
            <FormField
              label="Aadhaar Number"
              name="aadhaarNumber"
              value={formData.aadhaarNumber || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter Aadhaar number"
              error={errors.aadhaarNumber}
              spacingClass="mb-2"
            />
            {/* Aadhaar Front & Back (separate single-file fields) */}
            <FormField
              label="Aadhaar Front"
              type="file"
              name="aadhaarFront"
              onChange={handleFileChange}
              onBlur={handleBlur}
              accept="image/*,application/pdf"
              multiple={false}
              // Wrap single file into array for preview
              files={formData.aadhaarFront ? [formData.aadhaarFront] : []}
              onViewFile={() => handleViewAadhaarFront()}
              onDeleteFile={() => handleDeleteAadhaarFront()}
              showAddButton={false}
              error={errors.aadhaarFront}
              spacingClass="mb-2"
            />
            <FormField
              label="Aadhaar Back"
              type="file"
              name="aadhaarBack"
              onChange={handleFileChange}
              onBlur={handleBlur}
              accept="image/*,application/pdf"
              multiple={false}
              files={formData.aadhaarBack ? [formData.aadhaarBack] : []}
              onViewFile={() => handleViewAadhaarBack()}
              onDeleteFile={() => handleDeleteAadhaarBack()}
              showAddButton={false}
              error={errors.aadhaarBack}
              spacingClass="mb-2"
            />

            {/* PAN Section – always visible */}
            <FormField
              label="PAN Card Number"
              name="panNumber"
              value={formData.panNumber || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter PAN"
              error={errors.panNumber}
              spacingClass="mb-2"
            />
            <FormField
              label="Upload PAN Card"
              type="file"
              name="panFiles"
              onChange={handleFileChange}
              onBlur={handleBlur}
              accept="image/*,application/pdf"
              multiple={true}
              files={formData.panFiles || []}
              onViewFile={handleViewPAN}
              onDeleteFile={handleDeletePAN}
              showAddButton={false}
              error={errors.panFiles}
              spacingClass="mb-2"
            />

            {/* Additional uploads only for experienced candidates */}
            {Number(formData.yearsOfExperience) > 0 && (
              <>
                <FormField
                  label="Previous Company Offer Letter"
                  type="file"
                  name="offerLetterFiles"
                  onChange={handleFileChange}
                  onBlur={handleBlur}
                  accept="image/*,application/pdf"
                  multiple={true}
                  files={formData.offerLetterFiles || []}
                  onViewFile={handleViewOffer}
                  onDeleteFile={handleDeleteOffer}
                  showAddButton={false}
                  error={errors.offerLetter}
                  spacingClass="mb-2"
                />
                <FormField
                  label="Relieving Letter"
                  type="file"
                  name="relievingLetterFiles"
                  onChange={handleFileChange}
                  onBlur={handleBlur}
                  accept="image/*,application/pdf"
                  multiple={true}
                  files={formData.relievingLetterFiles || []}
                  onViewFile={handleViewRelieving}
                  onDeleteFile={handleDeleteRelieving}
                  showAddButton={false}
                  error={errors.relievingLetter}
                  spacingClass="mb-2"
                />
                <FormField
                  label="Payslip"
                  type="file"
                  name="payslipFiles"
                  onChange={handleFileChange}
                  onBlur={handleBlur}
                  accept="image/*,application/pdf"
                  multiple={true}
                  files={formData.payslipFiles || []}
                  onViewFile={handleViewPayslip}
                  onDeleteFile={handleDeletePayslip}
                  showAddButton={false}
                  error={errors.payslip}
                  spacingClass="mb-2"
                />
              </>
            )}
          </div>

       
      </div>
    </div>
  );
};

export default EducationExperienceStep;