
import React from 'react';
import { useSelector } from 'react-redux';

const ContactDetailsStep = () => {
  const { formData } = useSelector(state => state.jobPosting);


  return (
    <div>


      <div className="space-y-2">


        {/* <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                <strong>Almost done!</strong> Review all the information and submit your job posting.
              </p>
            </div>
          </div>
        </div> */}

        <div className="bg-white border border-gray-200 rounded-lg p-6 mt-8">
          <h4 className="text-lg font-medium text-gray-800 mb-4">Job Posting Summary</h4>

          {/* Job Information Section */}
          <div className="mb-6">
            <h5 className="font-semibold text-gray-700 mb-3 border-b pb-2">Job Information</h5>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Job Title:</span>
                <p className="text-gray-800">{formData.jobTitle || 'Not specified'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Company:</span>
                <p className="text-gray-800">{formData.companyName || 'Not specified'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Designation:</span>
                <p className="text-gray-800">{formData.designation || 'Not specified'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">CTC:</span>
                <p className="text-gray-800">{formData.ctc || 'Not specified'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Experience:</span>
                <p className="text-gray-800">{formData.experience || 'Not specified'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Location:</span>
                <p className="text-gray-800">{formData.city && formData.state ? `${formData.city}, ${formData.state}` : 'Not specified'}</p>
              </div>
            </div>
          </div>

          {/* Skills & Requirements Section */}
          <div className="mb-6">
            <h5 className="font-semibold text-gray-700 mb-3 border-b pb-2">Skills & Requirements</h5>
            <div className="grid grid-cols-1 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Required Skills:</span>
                <p className="text-gray-800">{formData.skills?.length > 0 ? formData.skills.join(', ') : 'Not specified'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Languages:</span>
                <p className="text-gray-800">{formData.languages?.length > 0 ? formData.languages.join(', ') : 'Not specified'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Short Description:</span>
                <p className="text-gray-800">{formData.shortDescription || 'Not specified'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Job Description:</span>
                <p className="text-gray-800 max-h-20 overflow-y-auto">{formData.jobDescription || 'Not specified'}</p>
              </div>
            </div>
          </div>

          {/* Contact Details Section */}
          <div className="mb-4">
            <h5 className="font-semibold text-gray-700 mb-3 border-b pb-2">Contact Information</h5>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Contact Person:</span>
                <p className="text-gray-800">{formData.contactPerson || 'Not specified'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Contact Number:</span>
                <p className="text-gray-800">{formData.contactNumber || 'Not specified'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactDetailsStep;