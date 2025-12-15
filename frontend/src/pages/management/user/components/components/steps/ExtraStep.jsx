import React from 'react';
import { FileText } from 'lucide-react';
import FormField from '../FormField';

const ExtraStep = ({ formData = {}, updateFormData = () => {}, errors = {} }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    // Special handling: IFSC to uppercase
    if (name === 'ifscCode') {
      updateFormData({ [name]: value.toUpperCase() });
    } else {
      updateFormData({ [name]: value });
    }
  };

  return (
    <div className="space-y-2">
      {/* Bank Details */}
      <div className="space-y-4">
        <h4 className="text-base font-medium text-gray-800">Bank Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <FormField
            label="Bank Name"
            type="text"
            name="bankName"
            value={formData.bankName || ''}
            onChange={handleChange}
            placeholder="Enter bank name"
            error={errors.bankName}
          />
          <FormField
            label="Account Holder Name"
            type="text"
            name="accountHolderName"
            value={formData.accountHolderName || ''}
            onChange={handleChange}
            placeholder="Enter account holder name"
            error={errors.accountHolderName}
          />
          <FormField
            label="Account Number"
            type="text"
            name="accountNumber"
            value={formData.accountNumber || ''}
            onChange={handleChange}
            placeholder="Enter account number"
            error={errors.accountNumber}
          />
          <FormField
            label="IFSC Code"
            type="text"
            name="ifscCode"
            value={formData.ifscCode || ''}
            onChange={handleChange}
            placeholder="e.g., HDFC0001234"
            error={errors.ifscCode}
          />
          <FormField
            label="UPI Number"
            type="text"
            name="upiNumber"
            value={formData.upiNumber || ''}
            onChange={handleChange}
            placeholder="e.g., username@bank"
            error={errors.upiNumber}
          />
        </div>
      </div>

      <div className="pb-2">
        <h3 className="text-lg font-semibold text-gray-900">
          Additional Information
        </h3>
      </div>

      {/* Remarks */}
      <div>
        <FormField
          label="Remarks"
          type="textarea"
          name="remarks"
          value={formData.remarks || ''}
          onChange={handleChange}
          placeholder="Add any additional notes, special requirements, or comments for admin use..."
          rows={3}
          error={errors.remarks}
          icon={<FileText size={16} className="text-gray-500" />}
        />
      </div>
    </div>
  );
};

export default ExtraStep;
