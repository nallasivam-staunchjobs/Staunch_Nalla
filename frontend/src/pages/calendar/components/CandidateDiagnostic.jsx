import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Database, Users } from 'lucide-react';
import { candidates as candidatesAPI } from '../../../api/api';
import toast from 'react-hot-toast';

const CandidateDiagnostic = () => {
  const [diagnosticData, setDiagnosticData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Run diagnostic check
  const runDiagnostic = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await candidatesAPI.diagnoseMissingIds();
      
      setDiagnosticData(result);
      
      if (result.missing_count > 0) {
        toast.error(`Found ${result.missing_count} missing candidate IDs`);
      } else {
        toast.success('No missing candidate IDs found');
      }
      
    } catch (err) {
      setError(err.message || 'Failed to run diagnostic');
      toast.error('Failed to run diagnostic check');
    } finally {
      setLoading(false);
    }
  };

  // Auto-run diagnostic on component mount
  useEffect(() => {
    runDiagnostic();
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Database className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Candidate Database Diagnostic</h3>
        </div>
        <button
          onClick={runDiagnostic}
          disabled={loading}
          className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Running...' : 'Run Diagnostic'}</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2 text-blue-600">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Running diagnostic check...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <div>
              <h4 className="font-medium text-red-800">Diagnostic Failed</h4>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {diagnosticData && !loading && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Call Details */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Call Details</p>
                  <p className="text-lg font-bold text-blue-900">{diagnosticData.call_details_count || 0}</p>
                </div>
              </div>
            </div>

            {/* Referenced IDs */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Referenced IDs</p>
                  <p className="text-lg font-bold text-yellow-900">{diagnosticData.unique_referenced_ids || 0}</p>
                </div>
              </div>
            </div>

            {/* Missing IDs */}
            <div className={`${diagnosticData.missing_count > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} border rounded-lg p-4`}>
              <div className="flex items-center space-x-2">
                {diagnosticData.missing_count > 0 ? (
                  <XCircle className="w-5 h-5 text-red-600" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
                <div>
                  <p className={`text-sm font-medium ${diagnosticData.missing_count > 0 ? 'text-red-800' : 'text-green-800'}`}>
                    Missing IDs
                  </p>
                  <p className={`text-lg font-bold ${diagnosticData.missing_count > 0 ? 'text-red-900' : 'text-green-900'}`}>
                    {diagnosticData.missing_count || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Message */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
            <p className="text-sm text-gray-600">
              {diagnosticData.summary || 'Diagnostic completed successfully.'}
            </p>
            {diagnosticData.recommendation && (
              <p className="text-sm text-blue-600 mt-2">
                <strong>Recommendation:</strong> {diagnosticData.recommendation}
              </p>
            )}
          </div>

          {/* Missing IDs List */}
          {diagnosticData.missing_ids && diagnosticData.missing_ids.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Missing Candidate IDs</h4>
              <div className="max-h-40 overflow-y-auto">
                <div className="grid grid-cols-8 gap-2">
                  {diagnosticData.missing_ids.map((id, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded font-mono"
                    >
                      {id}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                These IDs are referenced in call details but don't exist in the candidates table.
              </p>
            </div>
          )}

          {/* Existing IDs (if any) */}
          {diagnosticData.existing_ids && diagnosticData.existing_ids.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">
                Valid Candidate IDs ({diagnosticData.existing_candidates || 0})
              </h4>
              <p className="text-sm text-gray-600">
                {diagnosticData.existing_candidates || 0} candidate IDs are properly referenced and exist in the database.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CandidateDiagnostic;
