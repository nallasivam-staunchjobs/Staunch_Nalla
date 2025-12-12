import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../../context/AppContext';
import { candidates } from '../../../api/api';
import { mapClientJobToFormData, mapCandidateToFormData } from '../utils';
import CandidateDetailsModal from './ViewModal';
import { toast, Toaster } from 'react-hot-toast';
import Loading from '../../../components/Loading';

const ViewCandidate = () => {
  const { candidateId, jobId } = useParams();
  const navigate = useNavigate();
  const { state } = useAppContext();
  const [candidate, setCandidate] = useState(null);
  const [clientJob, setClientJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCandidateData = async () => {
      try {
        setLoading(true);
        const candidateData = await candidates.getById(candidateId);
        
        if (candidateData) {
          setCandidate(candidateData);
          
          // Find the specific client job if jobId is provided
          if (jobId && candidateData.client_jobs) {
            const job = candidateData.client_jobs.find(job => job.id.toString() === jobId);
            if (job) {
              setClientJob(job);
            }
          } else if (candidateData.client_jobs && candidateData.client_jobs.length > 0) {
            // Use the first job if no specific jobId is provided
            setClientJob(candidateData.client_jobs[0]);
          }
        } else {
          toast.error('Candidate not found');
          navigate(-1); // Go back if candidate not found
        }
      } catch (error) {
        console.error('Error fetching candidate:', error);
        toast.error('Error loading candidate details');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    if (candidateId) {
      fetchCandidateData();
    }
  }, [candidateId, jobId, navigate]);

  const handleClose = () => {
    // Try to close the tab first (works if opened via window.open or target="_blank")
    window.close();
    // If window.close() doesn't work (tab wasn't opened by script), navigate back
    setTimeout(() => {
      navigate(-1);
    }, 100);
  };

  if (loading) {
    return null;
  }

  if (!candidate) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700">Candidate not found</h2>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Prepare the candidate data for the modal
  const candidateForModal = {
    ...candidate,
    id: candidate.id,
    candidateId: candidate.id,
    name: candidate.name || `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim(),
    email: candidate.email,
    phone: candidate.phone || candidate.mobile1,
    // Add other candidate fields as needed
  };

  // Prepare client job data if available
  const clientJobData = clientJob ? mapClientJobToFormData(clientJob) : null;

  return (
    <div className="bg-gray-50 min-h-screen">
      <Toaster position="top-center" />
      <CandidateDetailsModal
        isOpen={true}
        onClose={handleClose}
        candidate={candidateForModal}
        clientJob={clientJobData}
      />
    </div>
  );
};

export default ViewCandidate;
