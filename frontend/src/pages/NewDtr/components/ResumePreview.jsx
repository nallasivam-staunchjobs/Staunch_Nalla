
import { memo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAppContext, useAppActions } from '../../../context/AppContext';
import { useApi } from '../hooks/useApi';
import { validateFile } from '../utils/apiHelpers';

const ResumePreview = memo(() => {
  const { state } = useAppContext();
  const actions = useAppActions();
  const { resumePreview, resumeFile, isParsingResume } = state.formData;
  const fileInputRef = useRef(null);
  const [fileType, setFileType] = useState(resumeFile?.type || "");
  const [isDragOver, setIsDragOver] = useState(false);

  const api = useApi();

  // Field mapping from parsed resume data to form fields
  const mapResumeDataToFormFields = (resumeData) => {
    const mappedData = {};

    try {
      // Basic Information
      if (resumeData.name) {
        mappedData.candidateName = resumeData.name;
      }

      if (resumeData.email) {
        mappedData.email = resumeData.email;
      }

      // Handle phone/mobile numbers - try both fields
      if (resumeData.phone) {
        mappedData.mobile1 = resumeData.phone;
      } else if (resumeData.mobile) {
        mappedData.mobile1 = resumeData.mobile;
      }

      // If we have both phone and mobile, use mobile for secondary
      if (resumeData.phone && resumeData.mobile && resumeData.phone !== resumeData.mobile) {
        mappedData.mobile2 = resumeData.mobile;
      }

      if (resumeData.date_of_birth || resumeData.dob) {
        mappedData.dob = resumeData.date_of_birth || resumeData.dob;
      }

      // Location Information
      if (resumeData.location || resumeData.address) {
        mappedData.address = resumeData.location || resumeData.address;
      }

      if (resumeData.city) {
        mappedData.city = resumeData.city;
      }

      if (resumeData.state) {
        mappedData.state = resumeData.state;
      }

      if (resumeData.pincode || resumeData.zip_code) {
        mappedData.pincode = resumeData.pincode || resumeData.zip_code;
      }

      // Experience Information
      if (resumeData.total_experience) {
        mappedData.experience = resumeData.total_experience;
      }

      // Skills
      if (resumeData.skills) {
        mappedData.skills = Array.isArray(resumeData.skills)
          ? resumeData.skills
          : resumeData.skills.split(',').map(skill => skill.trim());
      }

      // Languages - handle both old format and new format
      if (resumeData.languages) {
        mappedData.languages = Array.isArray(resumeData.languages)
          ? resumeData.languages
          : resumeData.languages.split(',').map(lang => lang.trim());
      } else if (resumeData.language) {
        mappedData.languages = Array.isArray(resumeData.language)
          ? resumeData.language
          : resumeData.language.split(',').map(lang => lang.trim());
      }

      // Education Information
      if (resumeData.education) {
        if (typeof resumeData.education === 'object') {
          // New enhanced format
          if (resumeData.education.college_name && resumeData.education.college_name !== "Not extracted") {
            mappedData.education = resumeData.education.college_name;
          }
          if (resumeData.education.degree && resumeData.education.degree !== "Not extracted") {
            mappedData.education = mappedData.education
              ? `${mappedData.education} - ${resumeData.education.degree}`
              : resumeData.education.degree;
          }
        } else {
          // Simple string format
          mappedData.education = resumeData.education;
        }
      }

      // Experience Information
      if (resumeData.experience) {
        if (typeof resumeData.experience === 'object') {
          // New enhanced format
          let experienceText = '';

          if (resumeData.experience.designation && resumeData.experience.designation !== "Not extracted") {
            experienceText = resumeData.experience.designation;
          }

          if (resumeData.experience.total_experience && resumeData.experience.total_experience !== "0 years") {
            experienceText = experienceText
              ? `${experienceText} (${resumeData.experience.total_experience})`
              : resumeData.experience.total_experience;
          }

          if (resumeData.experience.company_names && resumeData.experience.company_names.length > 0) {
            const companies = resumeData.experience.company_names.join(', ');
            experienceText = experienceText
              ? `${experienceText} at ${companies}`
              : companies;
          }

          if (experienceText) {
            mappedData.experience = experienceText;
          }
        } else {
          // Simple string/number format
          mappedData.experience = resumeData.experience.toString();
        }
      }

      // Education
      if (resumeData.education) {
        if (typeof resumeData.education === 'string') {
          mappedData.education = resumeData.education;
        } else if (Array.isArray(resumeData.education)) {
          mappedData.education = resumeData.education.join(', ');
        } else if (typeof resumeData.education === 'object') {
          // Handle structured education data
          const educationParts = [];
          if (resumeData.education.degree) educationParts.push(resumeData.education.degree);
          if (resumeData.education.institution) educationParts.push(resumeData.education.institution);
          if (resumeData.education.year) educationParts.push(resumeData.education.year);
          mappedData.education = educationParts.join(' - ');
        }
      }

      return mappedData;
    } catch (error) {
      console.error('Error mapping resume data:', error);
      toast.error('Error processing parsed resume data');
      return {};
    }
  };

  const processFile = async (file) => {
    if (!file) return;

    // Validate file using the utility function
    const validationError = validateFile(file, {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['.pdf', '.doc', '.docx'],
      required: true
    });

    if (validationError) {
      toast.error(validationError);
      return;
    }

    // Set file and preview immediately
    actions.setResumeFile(file);
    actions.setResumePreview(URL.createObjectURL(file));
    setFileType(file.type);

    // Start parsing process
    actions.setParsingResume(true);
    toast.loading('Parsing resume...', { id: 'resume-parsing' });

    try {
      // Call the resume parsing API
      const response = await api.resume.parse(file);

      if (response && response.success && response.data) {
        const parsedData = response.data;

        // Map parsed data to form fields
        const mappedFields = mapResumeDataToFormFields(parsedData);

        // Set flag to indicate resume parsing is happening
        if (window.FormStep1Instance) {
          window.FormStep1Instance.setIsResumeParsing(true);
        }

        // Auto-fill form fields
        let successCount = 0;
        Object.keys(mappedFields).forEach(field => {
          if (mappedFields[field]) {
            actions.updateFormField(field, mappedFields[field]);
            successCount++;
          }
        });

        toast.success('Resume parsed and fields auto-filled successfully!', { id: 'resume-parsing' });

        // Show success message with auto-filled fields
        const filledFields = Object.keys(mappedFields).filter(field => mappedFields[field]);
        if (filledFields.length > 0) {
          // Auto-filled fields detected - toast removed per user request
        }
        toast.success('Resume parsed and fields auto-filled successfully!', { id: 'resume-parsing' });
        actions.setParsedResumeData(parsedData);
        
        // Clear the resume parsing flag after a delay to allow form updates to complete
        setTimeout(() => {
          if (window.FormStep1Instance) {
            window.FormStep1Instance.setIsResumeParsing(false);
          }
        }, 2000);
      } else {
        toast.error('Failed to parse resume', { id: 'resume-parsing' });
        if (window.FormStep1Instance) {
          window.FormStep1Instance.setIsResumeParsing(false);
        }
      }
    } catch (error) {
      console.error('Resume parsing error:', error);
      toast.error('Error parsing resume', { id: 'resume-parsing' });
      if (window.FormStep1Instance) {
        window.FormStep1Instance.setIsResumeParsing(false);
      }
    } finally {
      actions.setParsingResume(false);
    }
  };

  const handleFileInputChange = async (e) => {
    const file = e.target.files[0];
    await processFile(file);
  };

  // Drag and Drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set drag over to false if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      await processFile(file);
    }
  };


  const handleRemoveResume = () => {
    actions.setResumePreview(null);
    actions.setResumeFile(null);
    // Clear the parsed data when the resume is removed
    actions.setParsedResumeData(null);
    localStorage.removeItem("candidateResumeFile");
    localStorage.removeItem("candidateResumeFileName");
    localStorage.removeItem("candidateResumeFileType");
    setFileType("");
    toast.success("Resume removed");
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col h-[550px]">
      <div className="p-4 flex-1 flex flex-col">
        {isParsingResume ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Parsing resume...</p>
            </div>
          </div>
        ) : resumePreview ? (
          <div className="flex-1 flex flex-col space-y-2">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-semibold text-gray-700">
                Uploaded: {resumeFile?.name || "resume file"}
              </h4>
              <button
                onClick={handleRemoveResume}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>

            <div className="flex-1 border border-gray-200 rounded-md bg-gray-50 overflow-hidden">
              {fileType === "application/pdf" || resumePreview.startsWith("blob:") || resumePreview.startsWith("data:") ? (
                <iframe
                  src={resumePreview}
                  title="Resume Preview"
                  className="w-full h-full border-0"
                />
              ) : (
                <div className="p-4 text-sm text-center text-gray-600">
                  <p className="mb-2">Preview not available for Word files.</p>
                  <a
                    href={resumePreview}
                    download={resumeFile?.name}
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    Download and open resume
                  </a>
                </div>
              )}
            </div>

           
          </div>
        ) : (
          <div
            className={`flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-6 transition-all duration-200 ${isDragOver
              ? 'border-blue-500 bg-blue-50 scale-105'
              : 'border-gray-300 hover:border-gray-400'
              }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
          >
            <svg
              className={`w-10 h-10 mb-3 transition-colors duration-200 ${isDragOver ? 'text-blue-500' : 'text-gray-400'
                }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className={`text-sm mb-1 transition-colors duration-200 ${isDragOver ? 'text-blue-700 font-semibold' : 'text-gray-600'
              }`}>
              {isDragOver ? (
                <span className="font-medium">Drop resume here!</span>
              ) : (
                <>
                  <span className="font-medium">Drag and drop</span> or click to upload resume
                </>
              )}
            </p>
            <p className={`text-xs transition-colors duration-200 ${isDragOver ? 'text-blue-600' : 'text-gray-400'
              }`}>
              PDF, DOCX, DOC – Max 10MB
            </p>
            <p className="text-xs text-blue-600 mt-1">✨ Auto-fills form fields after upload</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current.click();
              }}
              className={`mt-3 px-4 py-1.5 text-xs rounded-md transition-all duration-200 ${isDragOver
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
            >
              {isDragOver ? 'Drop Here' : 'Upload Resume'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        )}
      </div>
    </div>
  );
});

ResumePreview.displayName = 'ResumePreview';
export default ResumePreview;