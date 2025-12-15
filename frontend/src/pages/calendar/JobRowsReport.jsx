import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { candidates as candidatesAPI } from '../../api/api';
import CandidateTable from './components/CandidateTable';
import FeedbackModal from '../NewDtr/components/FeedbackModal';

const JobRowsReport = () => {
  const [searchParams] = useSearchParams();
  const [allRows, setAllRows] = useState([]);
  const [activeRows, setActiveRows] = useState([]);
  const [inactiveRows, setInactiveRows] = useState([]);
  const [activeCandidates, setActiveCandidates] = useState([]);
  const [inactiveCandidates, setInactiveCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('Active');

  // Feedback modal state (reuse shared FeedbackModal component)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [selectedCandidateForFeedback, setSelectedCandidateForFeedback] = useState(null);

  // Base filters used for data fetch (omit transfer_status so we can get both sets at once)
  const baseFilters = useMemo(() => {
    const f = {};
    for (const [k, v] of searchParams.entries()) {
      if (k === 'transfer_status') continue;
      if (v !== undefined && v !== null && String(v).trim() !== '') f[k] = v;
    }
    f.all = 'true';
    return f;
  }, [searchParams]);

  // Initialize active tab from URL
  useEffect(() => {
    const ts = (searchParams.get('transfer_status') || '').toLowerCase();
    if (ts === 'inactive') setActiveTab('Inactive');
    else setActiveTab('Active');
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        // Fetch all job rows (both statuses) using base filters
        const resp = await candidatesAPI.getClientJobRows(baseFilters);
        const r = Array.isArray(resp?.results) ? resp.results : [];
        if (!mounted) return;
        setAllRows(r);

        // Split by status
        const ar = r.filter(x => String(x.transfer_status || '').toLowerCase() === 'active');
        const ir = r.filter(x => String(x.transfer_status || '').toLowerCase() === 'inactive');
        setActiveRows(ar);
        setInactiveRows(ir);

        // Bulk fetch candidate details once for union of candidate IDs
        const candidateIds = Array.from(new Set(r.map(x => x.candidate_id).filter(Boolean)));
        let found = [];
        if (candidateIds.length) {
          const bulk = await candidatesAPI.bulkFetch(candidateIds, true);
          found = bulk?.found || [];
        }
        const mapById = new Map();
        found.forEach(c => {
          const key = c.candidate_id || c.id;
          if (key !== null && key !== undefined) mapById.set(key, c);
        });

        // Helper: merge one job row with base candidate into CandidateTable friendly shape
        const toCandidateRow = (row) => {
          const base = mapById.get(row.candidate_id) || {};
          const candidateId = row.candidate_id || base.candidate_id || base.id;
          const candidateName = row.candidate_name || base.candidate_name || base.candidateName;
          const city = row.city || base.city;
          const state = row.state || base.state;
          const email = base.email || row.email;
          const mobile1 = base.mobile1 || base.phone_number || row.mobile1;
          const candidateRow = {
            ...base,
            // Standardized candidate fields
            candidateId: candidateId,
            candidate_id: candidateId,
            candidateName: candidateName || 'Unknown',
            candidate_name: candidateName || 'Unknown',
            email: email || base.email || '-',
            mobile1: mobile1,
            phone_number: mobile1,
            contactNumber1: mobile1,
            city: city || base.city || 'N/A',
            state: state || base.state || 'N/A',
            cityState: `${city || base.city || 'N/A'}, ${state || base.state || 'N/A'}`,
            executive_name: row.executive_name || base.executive_name,
            executive_display: base.executive_display,
            created_at: base.created_at,
            updated_at: row.updated_at || base.updated_at,
            // Previous owners list from backend (codes)
            previousOwners: Array.isArray(row.previous_owners) ? row.previous_owners : [],
            // Previous owner names resolved from backend
            previousOwnerNames: Array.isArray(row.previous_owner_names) ? row.previous_owner_names : [],
            // Attend flag for Attended column
            attendFlag: typeof row.attend === 'boolean' ? row.attend : (String(row.attend).toLowerCase() === 'true' || String(row.attend) === '1'),
            // Transfer mapping fields
            transferFromCode: row.assigned_from || null,
            transferToCode: row.assign_to || null,
            transferFromName: row.assigned_from_name || null,
            transferToName: row.assign_to_name || null,
            // Selected client job built from row
            selectedClientJob: {
              ...(base.selectedClientJob || {}),
              client_name: row.client_name || base.selectedClientJob?.client_name,
              clientName: row.client_name || base.selectedClientJob?.clientName,
              designation: row.designation || base.selectedClientJob?.designation,
              remarks: row.remarks || base.selectedClientJob?.remarks,
              next_follow_up_date: row.next_follow_up_date || base.selectedClientJob?.next_follow_up_date,
              expected_joining_date: row.expected_joining_date || base.selectedClientJob?.expected_joining_date,
              interview_fixed_date: row.interview_fixed_date || base.selectedClientJob?.interview_fixed_date,
              current_ctc: row.current_ctc || base.selectedClientJob?.current_ctc,
              expected_ctc: row.expected_ctc || base.selectedClientJob?.expected_ctc,
              source_of_candidate: row.source || row.source_name || base.selectedClientJob?.source_of_candidate,
            },
            // Direct job fields fallback
            client_name: row.client_name || base.client_name,
            designation: row.designation || base.designation,
            remarks: row.remarks || base.remarks,
          };

          // Ensure FeedbackModal has consistent client job context
          // Attach a simple clientJob object with id for easier access
          return {
            ...candidateRow,
            clientJob: {
              id: row.client_job_id || row.id || candidateRow.selectedClientJob?.id || null,
              client_name: candidateRow.selectedClientJob?.client_name || candidateRow.client_name,
              designation: candidateRow.selectedClientJob?.designation || candidateRow.designation,
              remarks: candidateRow.selectedClientJob?.remarks || candidateRow.remarks,
              next_follow_up_date: candidateRow.selectedClientJob?.next_follow_up_date,
              expected_joining_date: candidateRow.selectedClientJob?.expected_joining_date,
              interview_fixed_date: candidateRow.selectedClientJob?.interview_fixed_date,
            }
          };
        };

        setActiveCandidates(ar.map(toCandidateRow));
        setInactiveCandidates(ir.map(toCandidateRow));

      } catch (e) {
        if (!mounted) return;
        setError(e?.response?.data?.detail || e.message || 'Failed to load data');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [baseFilters]);

  const title = useMemo(() => {
    const client = searchParams.get('client') || 'All Clients';
    const tsLabel = activeTab === 'Active' ? 'Ongoing' : 'Transfer';
    const from = searchParams.get('from_date') || '';
    const to = searchParams.get('to_date') || '';
    const stat = searchParams.get('profile_submission') === '1' ? 'Profile Submitted' : (searchParams.get('attend') === '1' ? 'Attended' : 'Jobs');
  	return `${client} — ${stat} (${tsLabel}) ${from && to ? `| ${from} to ${to}` : ''}`;
  }, [searchParams, activeTab]);

  // Handle tab change and sync URL transfer_status
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('transfer_status', tab);
    // useSearchParams setter replaces history; prefer pushing by setting window.location.search
    const qs = newParams.toString();
    window.history.replaceState(null, '', `${window.location.pathname}?${qs}`);
  };

  const currentCandidates = activeTab === 'Active' ? activeCandidates : inactiveCandidates;
  const activeCount = activeCandidates.length;
  const inactiveCount = inactiveCandidates.length;

  // Open FeedbackModal for a candidate row
  const handleCandidateNameClick = (candidate) => {
    if (!candidate) return;

    // Derive clientJobId from flattened row data
    const clientJobId = candidate.selectedClientJob?.id || candidate.clientJob?.id || candidate.client_job_id || candidate.clientJobId;

    const candidateForFeedback = {
      ...candidate,
      // Core IDs that FeedbackModal expects
      id: candidate.candidateId || candidate.candidate_id || candidate.id,
      candidateId: candidate.candidateId || candidate.candidate_id || candidate.id,

      // Basic identity fields
      name: candidate.candidateName || candidate.candidate_name || candidate.name,
      candidateName: candidate.candidateName || candidate.candidate_name || candidate.name,

      // Contact info
      phone: candidate.mobile1 || candidate.phone_number || candidate.phoneNumber || candidate.contactNumber1,
      mobile1: candidate.mobile1 || candidate.phone_number || candidate.phoneNumber || candidate.contactNumber1,
      contactNumber1: candidate.mobile1 || candidate.phone_number || candidate.phoneNumber || candidate.contactNumber1,
      email: candidate.email,

      // Executive info
      executiveName: candidate.executive_display || candidate.executive_name || candidate.employeeName,
      executive_name: candidate.executive_display || candidate.executive_name || candidate.employeeName,

      // Client job context
      clientJobId: clientJobId,
      selectedClientJob: candidate.selectedClientJob || candidate.clientJob || null,
      clientName: candidate.selectedClientJob?.client_name || candidate.selectedClientJob?.clientName || candidate.client_name || candidate.clientName,

      // Backend-style data bundle
      backendData: candidate.backendData || {
        id: candidate.candidateId || candidate.candidate_id || candidate.id,
        candidate_name: candidate.candidateName || candidate.candidate_name || candidate.name,
        executive_name: candidate.executive_display || candidate.executive_name || candidate.employeeName,
        mobile1: candidate.mobile1 || candidate.phone_number || candidate.phoneNumber || candidate.contactNumber1,
        email: candidate.email,
        city: candidate.city,
      },

      // Source marker for debugging
      _source: 'JobRowsReport',
      _forceRefresh: Date.now(),
    };

    setSelectedCandidateForFeedback(candidateForFeedback);
    setIsFeedbackModalOpen(true);
  };

  const handleCloseFeedbackModal = () => {
    setIsFeedbackModalOpen(false);
    setSelectedCandidateForFeedback(null);
  };

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-base font-semibold text-slate-800">{title}</h1>
        <div className="text-xs text-slate-500">Rows: {activeTab === 'Active' ? activeCount : inactiveCount}</div>
      </div>

      {/* Tabs */}
      <div className="mb-3">
        <div className="inline-flex rounded-md border border-gray-200 bg-white overflow-hidden">
          <button
            className={`px-3 py-1 text-xs font-medium ${activeTab === 'Active' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
            onClick={() => handleTabChange('Active')}
          >
            Ongoing <span className="ml-1 inline-block px-1.5 py-0.5 rounded bg-white/20 text-white">{activeCount}</span>
          </button>
          <button
            className={`px-3 py-1 text-xs font-medium border-l border-gray-200 ${activeTab === 'Inactive' ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
            onClick={() => handleTabChange('Inactive')}
          >
            Transfer <span className="ml-1 inline-block px-1.5 py-0.5 rounded bg-white/20 text-white">{inactiveCount}</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-slate-600">Loading...</div>
      )}
      {error && (
        <div className="text-sm text-red-600 mb-2">{error}</div>
      )}

      {!loading && !error && (
        <div className="bg-white">
          <CandidateTable
            candidates={currentCandidates}
            candidateIds={[]}
            fetchMode="direct"
            title={title}
            entriesPerPage={10}
            showActions={true}
            emptyMessage="No rows found for the selected filters"
            showTransferDate={false}
            showPreviousOwners={activeTab === 'Inactive'}
            // Open shared FeedbackModal when user clicks candidate name / view action
            onCandidateNameClick={handleCandidateNameClick}
            onViewFeedback={handleCandidateNameClick}
          />
        </div>
      )}
      {/* Feedback Modal for JobRowsReport */}
      {isFeedbackModalOpen && selectedCandidateForFeedback && (
        <FeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={handleCloseFeedbackModal}
          candidate={selectedCandidateForFeedback}
          clientJobId={selectedCandidateForFeedback?.clientJobId || selectedCandidateForFeedback?.selectedClientJob?.id || null}
        />
      )}
    </div>
  );
};

export default JobRowsReport;
