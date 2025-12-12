import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  PhoneOff,
  Calendar,
  MapPin,
  Building,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Download,
  Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import Loading from '../components/Loading';

const DailyTellyReportDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type');

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get data from sessionStorage
    const storedData = sessionStorage.getItem('tellyReportDetail');
    if (storedData) {
      const data = JSON.parse(storedData);
      setReportData(data);
    }
    setLoading(false);
  }, [id]);

  const exportDetailToCSV = () => {
    if (!reportData) return;

    const headers = ['S.No', 'Executive Name', 'Candidate Name', 'Mobile', 'Client Name', 'Location', 'Remark', 'Notes'];
    const csvData = reportData.drillDownData.map((detail, index) => [
      index + 1,
      detail.executiveName,
      detail.candidateName,
      detail.mobile,
      detail.clientName,
      detail.location,
      detail.remark,
      detail.notes
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telly_report_details_${reportData.executiveName.replace(' ', '_')}_${reportData.date}_${type}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Detail report exported successfully!');
  };

  if (loading) {
    return null;
  }

  if (!reportData) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Report Not Found</h2>
          <p className="text-gray-600 mb-4">The requested report details could not be loaded.</p>
          <button
            onClick={() => navigate('/daily-telly-report')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Reports
          </button>
        </div>
      </div>
    );
  }

  const getRemarkIcon = (remark) => {
    if (['Interested', 'Selected', 'Joined', 'Golden Egg'].includes(remark)) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else if (['Interview Fixed', 'Next Round'].includes(remark)) {
      return <Clock className="w-4 h-4 text-blue-600" />;
    } else if (['Think and Get Back', 'Profile Validation'].includes(remark)) {
      return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    } else {
      return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getRemarkColor = (remark) => {
    if (['Interested', 'Selected', 'Joined', 'Golden Egg'].includes(remark)) {
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (['Interview Fixed', 'Next Round'].includes(remark)) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    } else if (['Think and Get Back', 'Profile Validation'].includes(remark)) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    } else {
      return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  return (
    <>
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-2">
        <div className="px-3 py-1 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/daily-telly-report')}
                className="p-1 hover:bg-red-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-red-600" />
              </button>
              <div className="p-2 bg-blue-600 rounded-lg">
                <Phone className="w-3 h-3 text-white" />
              </div>
              <div>
                <h1 className="text-md font-bold text-gray-900">
                  {type === 'answered' ? 'Calls Answered Details' : 'Calls Not Answered Details'}
                </h1>
                <p className="text-xs text-gray-600 flex items-center space-x-2">
                  {reportData.executiveName} - {new Date(reportData.date).toLocaleDateString('en-GB')} - {reportData.branch} - <Phone className='w-4 h-4 text-green-500'/> <span className='text-green-500 font-bold'>{reportData.drillDownData.length}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={exportDetailToCSV}
                className="px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2 text-xs"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>


        {/* Report Summary */}
        {/* <div className="p-3">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-xs">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <div>
                <span className="font-medium text-gray-600">Date:</span>
                <div className="text-gray-900">{new Date(reportData.date).toLocaleDateString('en-IN')}</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-500" />
              <div>
                <span className="font-medium text-gray-600">Executive:</span>
                <div className="text-gray-900">{reportData.executiveName}</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <div>
                <span className="font-medium text-gray-600">Branch:</span>
                <div className="text-gray-900">{reportData.branch}</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Building className="w-4 h-4 text-gray-500" />
              <div>
                <span className="font-medium text-gray-600">Client:</span>
                <div className="text-gray-900">{reportData.client}</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {type === 'answered' ? (
                <Phone className="w-4 h-4 text-green-500" />
              ) : (
                <PhoneOff className="w-4 h-4 text-red-500" />
              )}
              <div>
                <span className="font-medium text-gray-600">Count:</span>
                <div className={`font-bold ${type === 'answered' ? 'text-green-600' : 'text-red-600'}`}>
                  {reportData.drillDownData.length}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${reportData.role === 'CEO' ? 'bg-purple-100 text-purple-800' :
                  reportData.role === 'RM' ? 'bg-indigo-100 text-indigo-800' :
                    reportData.role === 'BM' ? 'bg-blue-100 text-blue-800' :
                      reportData.role === 'TL' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                }`}>
                {reportData.role}
              </span>
            </div>
          </div>
        </div> */}
      </div>

      {/* Remarks Distribution Cards */}
      {reportData.drillDownData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-2">
          <div className="px-2 py-1 border-b border-gray-200">
            <h2 className="text-md font-semibold text-gray-900 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-blue-600" />
              Remarks Distribution
            </h2>
          </div>
          <div className="p-2">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(
                reportData.drillDownData.reduce((acc, detail) => {
                  acc[detail.remark] = (acc[detail.remark] || 0) + 1;
                  return acc;
                }, {})
              ).map(([remark, count]) => (
                <div key={remark} className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getRemarkIcon(remark)}
                      <div>
                        <p className="text-xs font-medium text-gray-900">{remark}</p>
                        <p className="text-md font-bold text-gray-900">{count}</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 font-medium">
                      {((count / reportData.drillDownData.length) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Answered Calls Details Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-2 py-1 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-md font-semibold text-gray-900">
              {type === 'answered' ? 'Answered Calls Details' : 'Not Answered Calls Details'}
            </h2>
            <div className="text-xs text-gray-600">
              {reportData.drillDownData.length} records
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  S.NO
                </th>
                <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CANDIDATE NAME
                </th>
                <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  MOBILE
                </th>
                <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CLIENT
                </th>
                <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  LOCATION
                </th>
                <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  REMARK
                </th>
                <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  STATUS
                </th>
                <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.drillDownData.length > 0 ? (
                reportData.drillDownData.map((detail, index) => (
                  <tr key={detail.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-xs">
                          {detail.candidateName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="ml-3">
                          <div className="text-xs font-medium text-gray-900">{detail.candidateName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <div className="flex items-center text-blue-600">
                        <Phone className="w-4 h-4 mr-2" />
                        <a href={`tel:${detail.mobile}`} className="hover:text-blue-800 text-xs font-medium">
                          {detail.mobile}
                        </a>
                      </div>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {detail.clientName}
                      </span>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <div className="flex items-center text-gray-600">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span className="text-xs">{detail.location}</span>
                      </div>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getRemarkIcon(detail.remark)}
                        <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${getRemarkColor(detail.remark)}`}>
                          {detail.remark}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <div className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        <span className="text-xs font-medium text-green-600">
                          {type === 'answered' ? 'Answered' : 'Not Answered'}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/view-candidate?candidateId=${detail.id}&name=${detail.candidateName}`)}
                        className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 hover:text-blue-700 transition-colors"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      {type === 'answered' ? (
                        <Phone className="w-12 h-12 text-gray-400" />
                      ) : (
                        <PhoneOff className="w-12 h-12 text-gray-400" />
                      )}
                      <p className="text-gray-500 text-md">No call details available</p>
                      <p className="text-gray-400 text-xs">
                        No {type === 'answered' ? 'answered' : 'unanswered'} calls found for this report
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        {reportData.drillDownData.length > 0 && (
          <div className="px-2 py-1 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs">
              <div className="text-gray-600">
                Total {type === 'answered' ? 'answered' : 'not answered'} calls: 
                <span className="font-semibold ml-1">{reportData.drillDownData.length}</span>
              </div>
              <div className="text-gray-600">
                Report Date: <span className="font-semibold">{new Date(reportData.date).toLocaleDateString('en-GB')}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default DailyTellyReportDetails;
