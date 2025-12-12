
import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

const DeleteModal = ({ isOpen, employee, onClose, onConfirm }) => {
  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Delete Employee
              </h3>
              <p className="text-sm text-gray-600">This action cannot be undone</p>
            </div>
          </div>

          <p className="text-gray-700 mb-6 break-words text-sm">
            Are you sure you want to delete{' '}
            <strong className="text-black">
              {employee.firstName} {employee.lastName}
            </strong>
            ?
          </p>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-4 text-gray-700 border border-red-300 rounded-lg hover:bg-red-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
