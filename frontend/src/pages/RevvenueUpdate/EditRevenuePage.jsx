import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import EditRevenueForm from './EditRevenueForm';
import { candidates } from '../../api/api';

const EditRevenuePage = () => {
  const { id } = useParams();
  const navigate = useNavigate(); 
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState(null);
  const [profileStatus, setProfileStatus] = useState(null);

  const handleClose = (shouldRefresh = false) => {
    // When opened via normal navigation, go back; if opened directly/new tab, close it
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      window.close();
    }
  };

  const getHeaderBgClass = () => {
    const status =
      profileStatus ||
      candidate?.backendData?.profilestatus ||
      candidate?.backendData?.profile_status ||
      candidate?.profilestatus ||
      candidate?.profile_status ||
      '';

    const normalizedStatus = String(status).trim().toLowerCase();

    if (normalizedStatus === 'joined') {
      return 'from-green-500 to-emerald-500';
    }

    if (normalizedStatus === 'abscond') {
      return 'from-red-500 to-rose-500';
    }

    return 'from-blue-500 to-indigo-500';
  };

  useEffect(() => {
    const fetchCandidate = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        // Extract the numeric ID part from the candidate ID if needed
        const numericId = id.split(/[\/-]/)[0];
        const data = await candidates.getById(numericId);
        setCandidate({
          ...data,
          backendData: data // Pass the data in the expected format
        });

        const backendStatus = data.profilestatus || data.profile_status || null;
        setProfileStatus(backendStatus || 'Joined');
      } catch (error) {
        console.error('Error fetching candidate:', error);
        toast.error('Failed to load candidate data');
      } finally {
        setLoading(false);
      }
    };

    fetchCandidate();
  }, [id]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!candidate) {
    return <div className="p-4">Candidate not found</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-desktop p-2.5 bg-gray-100">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className={`bg-gradient-to-r ${getHeaderBgClass()} p-4 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Edit Revenue</h1>
              <p className="text-sm opacity-90">
                {candidate.candidate_name} - {candidate.profile_number || 'N/A'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-2">
          <EditRevenueForm
            candidate={candidate}
            onClose={handleClose}
            onStatusChange={setProfileStatus}
          />
        </div>
      </div>
    </div>
  );
};

export default EditRevenuePage;
