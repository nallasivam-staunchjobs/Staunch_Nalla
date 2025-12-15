import React, { memo, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAppContext, useAppActions } from '../../../context/AppContext';
import WordToPdfConverter from './WordToPdfConverter';

const EnhancedResumePreview = memo(() => {
  const { state } = useAppContext();
  const actions = useAppActions();
  const { resumePreview, isParsingResume } = state.formData;
  const { resumeFile } = state;
  const fileInputRef = useRef(null);
  const [fileType, setFileType] = useState(resumeFile?.type || "");
  const [isConverting, setIsConverting] = useState(false);
  const [originalFileName, setOriginalFileName] = useState("");

  const { convertWordToPdf } = WordToPdfConverter({
    onPdfConverted: handlePdfConverted,
    onError: handleConversionError
  });

  function handlePdfConverted(pdfData) {
    // Set the converted PDF as the resume file
    actions.setResumeFile(pdfData.file);
    actions.setResumePreview(pdfData.url);
    setFileType('application/pdf');
    setOriginalFileName(pdfData.originalFileName);
    setIsConverting(false);
    
    // Automatically start parsing the converted PDF
    handleResumeParsingAfterConversion(pdfData.file);
  }

  function handleConversionError(error) {
    console.error('PDF conversion failed:', error);
    setIsConverting(false);
  }

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Only PDF, DOC, or DOCX files are supported.");
      return;
    }

    // Check if it's a Word document that needs conversion
    const wordTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (wordTypes.includes(file.type)) {
      // Convert Word document to PDF first
      setIsConverting(true);
      toast.loading('Converting Word document to PDF...', { id: 'word-conversion' });
      
      try {
        await convertWordToPdf(file);
        toast.success('Word document converted to PDF successfully!', { id: 'word-conversion' });
      } catch (error) {
        toast.error('Failed to convert Word document', { id: 'word-conversion' });
        setIsConverting(false);
      }
    } else {
      // Handle PDF files directly
      actions.setResumeFile(file);
      actions.setResumePreview(URL.createObjectURL(file));
      setFileType(file.type);
      setOriginalFileName(file.name);
      toast.success("Resume uploaded successfully");
      
      // Start parsing immediately for PDF files
      handleResumeParsingAfterConversion(file);
    }
  };

  const handleResumeParsingAfterConversion = async (file) => {
    actions.setParsingResume(true);
    toast.loading('Parsing resume...', { id: 'resume-parsing' });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/candidate/parse-resume/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse resume');
      }

      const parsedData = await response.json();

      if (parsedData) {
        // Map parsed data to form fields (you'll need to implement this mapping)
        const mappedFields = mapResumeDataToFormFields(parsedData);

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
      } else {
        toast.error('Failed to parse resume. Please try again.', { id: 'resume-parsing' });
      }
    } catch (error) {
      console.error('Resume parsing error:', error);
      toast.error(`Resume parsing failed: ${error.message}`, { id: 'resume-parsing' });
    } finally {
      actions.setParsingResume(false);
    }
  };

  // Basic field mapping function - you may need to customize this based on your form structure
  const mapResumeDataToFormFields = (resumeData) => {
    return {
      candidateName: resumeData.name || resumeData.candidate_name,
      email: resumeData.email,
      mobile1: resumeData.mobile || resumeData.phone,
      experience: resumeData.experience,
      skills: Array.isArray(resumeData.skills) ? resumeData.skills.join(', ') : resumeData.skills,
      // Add more field mappings as needed
    };
  };

  const handleRemoveResume = () => {
    actions.setResumePreview(null);
    actions.setResumeFile(null);
    localStorage.removeItem("candidateResumeFile");
    localStorage.removeItem("candidateResumeFileName");
    localStorage.removeItem("candidateResumeFileType");
    setFileType("");
    setOriginalFileName("");
    toast.success("Resume removed");
  };

  const isProcessing = isParsingResume || isConverting;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col h-[550px]">
      <div className="p-4 flex-1 flex flex-col">
        {isProcessing ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">
                {isConverting ? 'Converting Word to PDF...' : 'Parsing resume...'}
              </p>
            </div>
          </div>
        ) : resumePreview ? (
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Resume Preview</span>
                {originalFileName && (
                  <span className="text-xs text-gray-500">
                    {originalFileName !== resumeFile?.name ? `(Converted from: ${originalFileName})` : ''}
                  </span>
                )}
              </div>
              <button
                onClick={handleRemoveResume}
                className="text-red-500 hover:text-red-700 text-sm font-medium"
              >
                Remove
              </button>
            </div>
            
            <div className="flex-1 border border-gray-300 rounded-lg overflow-hidden">
              {fileType === 'application/pdf' ? (
                <iframe
                  src={resumePreview}
                  className="w-full h-full"
                  title="Resume Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-50">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📄</div>
                    <p className="text-sm text-gray-600">
                      {resumeFile?.name || 'Document uploaded'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Preview available after conversion to PDF
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">Upload Resume</h3>
              <p className="text-xs text-gray-500 mb-4">
                Support for PDF, DOC, and DOCX files
                <br />
                Word documents will be automatically converted to PDF
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
              >
                Choose File
              </button>
            </div>
          </div>
        )}
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleResumeUpload}
        className="hidden"
      />
    </div>
  );
});

EnhancedResumePreview.displayName = 'EnhancedResumePreview';

export default EnhancedResumePreview;
