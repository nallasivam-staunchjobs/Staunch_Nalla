import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import EnhancedStatusForm from '../RevvenueUpdate/EnhancedStatusForm';
import { candidates } from '../../api/api';

const RevenueStatusPage = () => {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileStatus, setProfileStatus] = useState(null);

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
      if (!candidateId) {
        setLoading(false);
        return;
      }

      try {
        // Extract the numeric ID part from the candidate ID (handle both formats: '123-456' or '123/456')
        const numericId = candidateId.split(/[\/-]/)[0];
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
  }, [candidateId]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!candidate) {
    return <div className="p-4">Candidate not found</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-desktop p-2.5 bg-gray-100">
      <Toaster position="top-center" />
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className={`bg-gradient-to-r ${getHeaderBgClass()} p-4 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Revenue Status</h1>
              <p className="text-sm opacity-90">
                {candidate.candidate_name} - {candidate.profile_number}
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-2">
          <EnhancedStatusForm
            candidate={candidate}
            onClose={() => navigate(-1)}
            onStatusChange={setProfileStatus}
          />
        </div>
      </div>
    </div>
  );
};

export default RevenueStatusPage;
