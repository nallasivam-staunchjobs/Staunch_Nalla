import React, { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

const WordToPdfConverter = ({ onPdfConverted, onError }) => {
  const [isConverting, setIsConverting] = useState(false);

  const convertWordToPdf = useCallback(async (wordFile) => {
    setIsConverting(true);
    
    try {
      const formData = new FormData();
      formData.append('file', wordFile);

      const response = await fetch('/api/candidate/convert-word-to-pdf/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to convert Word document to PDF');
      }

      // Get the PDF blob from response
      const pdfBlob = await response.blob();
      
      // Create a File object from the blob
      const pdfFileName = wordFile.name.replace(/\.(doc|docx)$/i, '.pdf');
      const pdfFile = new File([pdfBlob], pdfFileName, { type: 'application/pdf' });
      
      // Create object URL for preview
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Call the callback with converted PDF data
      onPdfConverted({
        file: pdfFile,
        url: pdfUrl,
        originalFileName: wordFile.name,
        convertedFileName: pdfFileName
      });

      toast.success(`Word document converted to PDF: ${pdfFileName}`);
      
    } catch (error) {
      console.error('Word to PDF conversion error:', error);
      toast.error(`Conversion failed: ${error.message}`);
      onError && onError(error);
    } finally {
      setIsConverting(false);
    }
  }, [onPdfConverted, onError]);

  return {
    convertWordToPdf,
    isConverting
  };
};

export default WordToPdfConverter;
