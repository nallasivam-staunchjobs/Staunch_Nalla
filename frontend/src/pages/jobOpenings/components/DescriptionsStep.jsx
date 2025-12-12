import React from 'react';
import MDEditor from '@uiw/react-md-editor';

const DescriptionsStep = ({ formData, updateFormData }) => {
  const handleChange = (field, value) => {
    updateFormData({ [field]: value });
  };

  return (
    <div>
      <h3 className="text-2xl font-semibold text-gray-800 mb-6">Job Descriptions</h3>
      <p className="text-gray-600 mb-8">Provide detailed information about the job role and responsibilities.</p>

      <div className="space-y-6">
        {/* Short Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Short Description *
          </label>
          <textarea
            value={formData.shortDescription}
            onChange={(e) => handleChange('shortDescription', e.target.value)}
            placeholder="A brief summary of the job position (2-3 lines)"
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <p className="mt-1 text-sm text-gray-500">
            This will be shown in job listings and search results.
          </p>
        </div>

        {/* Job Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Detailed Job Description *
          </label>
          <div data-color-mode="light" className="border border-gray-300 rounded-md p-2">
            <MDEditor
              value={formData.jobDescription}
              onChange={(value) => handleChange('jobDescription', value)}
              height={200}
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Use markdown to format your job description with **bold**, _italic_, `code`, lists, and more.
          </p>
        </div>

        {/* Tips */}
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">💡 Tips for a great job description:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Start with an engaging overview of your company</li>
            <li>• Clearly outline the role and responsibilities</li>
            <li>• List specific qualifications and skills required</li>
            <li>• Mention benefits, perks, and growth opportunities</li>
            <li>• Include information about the work environment</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DescriptionsStep;
