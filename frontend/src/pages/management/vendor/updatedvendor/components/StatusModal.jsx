import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const StatusModal = ({
  isOpen,
  onClose,
  currentStatus,
  onSubmit,
  type = 'lead',
}) => {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus || 'pending');

  useEffect(() => {
    // Keep selected status in sync when the modal opens for another lead
    setSelectedStatus(currentStatus || 'pending');
  }, [currentStatus, isOpen]);

  const leadStatuses = [
    {
      value: 'pending',
      label: 'Pending',
      color: 'bg-yellow-100 text-yellow-800',
    },
    {
      value: 'verified',
      label: 'Verified',
      color: 'bg-green-100 text-green-800',
    },
    {
      value: 'converted',
      label: 'Converted',
      color: 'bg-blue-100 text-blue-800',
    },
    { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
  ];

  const vendorStatuses = [
    { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
    {
      value: 'inactive',
      label: 'Inactive',
      color: 'bg-gray-100 text-gray-800',
    },
    {
      value: 'suspended',
      label: 'Suspended',
      color: 'bg-red-100 text-red-800',
    },
  ];

  const statuses = type === 'lead' ? leadStatuses : vendorStatuses;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(selectedStatus);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-3 border-b border-gray-100">
          <h2 className="text-md font-semibold text-gray-900">
            Change {type === 'lead' ? 'Lead' : 'Vendor'} Status
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-3">
            <div className="flex items-center space-x-3 flex-wrap">
              {statuses.map((status) => (
                <label
                  key={status.value}
                  className="flex items-center space-x-1 p-1 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="radio"
                    name="status"
                    value={status.value}
                    checked={selectedStatus === status.value}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}
                  >
                    {status.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-1 px-3 py-1 border-t border-gray-100 bg-gray-50">
            <button type="button" onClick={onClose} className="btn-secondary">
              <span className="text-sm">Cancel</span>
            </button>
            <button type="submit" className="btn-blue">
              <span className="text-sm">Update Status</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StatusModal;
