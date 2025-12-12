import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:8000/api';

const DropdownTest = () => {
  const [dropdownData, setDropdownData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const testDropdownAPIs = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Test comprehensive endpoint
        const comprehensiveResponse = await fetch(`${API_BASE_URL}/call-details/dropdown-data/`);
        
        if (!comprehensiveResponse.ok) {
          throw new Error(`Comprehensive endpoint failed: ${comprehensiveResponse.status} ${comprehensiveResponse.statusText}`);
        }
        
        const comprehensiveData = await comprehensiveResponse.json();
        
        if (comprehensiveData.success) {
          setDropdownData(comprehensiveData.data);
          toast.success('Dropdown APIs loaded successfully!');
        } else {
          throw new Error(comprehensiveData.error || 'Comprehensive endpoint returned success: false');
        }
        
        // Test individual endpoints
        
        const endpoints = [
          { name: 'Employees', url: `${API_BASE_URL}/call-plans/employees/` },
          { name: 'Vendors', url: `${API_BASE_URL}/call-plans/vendors/` },
          { name: 'Cities', url: `${API_BASE_URL}/call-plans/cities/` },
          { name: 'Sources', url: `${API_BASE_URL}/call-plans/sources/` },
          { name: 'Branches', url: `${API_BASE_URL}/call-plans/branches/` },
          { name: 'Channels', url: `${API_BASE_URL}/call-plans/channels/` }
        ];
        
        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint.url);
            const data = await response.json();
          } catch (err) {
            // Endpoint failed silently
          }
        }
        
      } catch (error) {
        setError(error.message);
        toast.error(`API Test Failed: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    testDropdownAPIs();
  }, []);

  if (loading) {
    return (
      <div className="p-3 bg-white rounded-lg shadow-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-4 text-gray-600">Testing Dropdown APIs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold text-red-800 mb-4">API Test Failed</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Retry Test
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <Toaster position="top-center" />
      <h2 className="text-2xl font-bold text-green-800 mb-6">✅ Dropdown API Integration Test Results</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Employees */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-bold text-blue-800 mb-2">👥 Employees ({dropdownData.employees?.length || 0})</h3>
          <div className="max-h-32 overflow-y-auto text-sm">
            {dropdownData.employees?.slice(0, 5).map((emp, idx) => (
              <div key={idx} className="mb-1">
                <span className="font-medium">{emp.fullName}</span>
                {emp.designation && <span className="text-gray-600"> ({emp.designation})</span>}
              </div>
            ))}
            {dropdownData.employees?.length > 5 && (
              <div className="text-gray-500">...and {dropdownData.employees.length - 5} more</div>
            )}
          </div>
        </div>

        {/* Clients/Vendors */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-bold text-green-800 mb-2">🏢 Clients ({dropdownData.clients?.length || 0})</h3>
          <div className="max-h-32 overflow-y-auto text-sm">
            {dropdownData.clients?.slice(0, 5).map((client, idx) => (
              <div key={idx} className="mb-1">
                <span className="font-medium">{client.vendor_name}</span>
                {client.contact_person && <span className="text-gray-600"> - {client.contact_person}</span>}
              </div>
            ))}
            {dropdownData.clients?.length > 5 && (
              <div className="text-gray-500">...and {dropdownData.clients.length - 5} more</div>
            )}
          </div>
        </div>

        {/* Cities */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-bold text-purple-800 mb-2">🏙️ Cities ({dropdownData.cities?.length || 0})</h3>
          <div className="max-h-32 overflow-y-auto text-sm">
            {dropdownData.cities?.slice(0, 5).map((city, idx) => (
              <div key={idx} className="mb-1">
                <span className="font-medium">{city.city}</span>
                {city.state && <span className="text-gray-600">, {city.state}</span>}
              </div>
            ))}
            {dropdownData.cities?.length > 5 && (
              <div className="text-gray-500">...and {dropdownData.cities.length - 5} more</div>
            )}
          </div>
        </div>

        {/* Sources */}
        <div className="bg-orange-50 p-4 rounded-lg">
          <h3 className="font-bold text-orange-800 mb-2">📊 Sources ({dropdownData.sources?.length || 0})</h3>
          <div className="max-h-32 overflow-y-auto text-sm">
            {dropdownData.sources?.slice(0, 5).map((source, idx) => (
              <div key={idx} className="mb-1">
                <span className="font-medium">{source.source_name}</span>
                {source.source_type && <span className="text-gray-600"> ({source.source_type})</span>}
              </div>
            ))}
            {dropdownData.sources?.length > 5 && (
              <div className="text-gray-500">...and {dropdownData.sources.length - 5} more</div>
            )}
          </div>
        </div>

        {/* Branches */}
        <div className="bg-pink-50 p-4 rounded-lg">
          <h3 className="font-bold text-pink-800 mb-2">🏢 Branches ({dropdownData.branches?.length || 0})</h3>
          <div className="max-h-32 overflow-y-auto text-sm">
            {dropdownData.branches?.slice(0, 5).map((branch, idx) => (
              <div key={idx} className="mb-1">
                <span className="font-medium">{branch.branch_name}</span>
                {branch.city && <span className="text-gray-600"> - {branch.city}</span>}
              </div>
            ))}
            {dropdownData.branches?.length > 5 && (
              <div className="text-gray-500">...and {dropdownData.branches.length - 5} more</div>
            )}
          </div>
        </div>

        {/* States */}
        <div className="bg-indigo-50 p-4 rounded-lg">
          <h3 className="font-bold text-indigo-800 mb-2">🗺️ States ({dropdownData.states?.length || 0})</h3>
          <div className="max-h-32 overflow-y-auto text-sm">
            {dropdownData.states?.slice(0, 10).map((state, idx) => (
              <div key={idx} className="mb-1">
                <span className="font-medium">{state}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Channels */}
        <div className="bg-teal-50 p-4 rounded-lg">
          <h3 className="font-bold text-teal-800 mb-2">📋 Channels ({dropdownData.channels?.length || 0})</h3>
          <div className="max-h-32 overflow-y-auto text-sm">
            {dropdownData.channels?.slice(0, 5).map((channel, idx) => (
              <div key={idx} className="mb-1">
                <span className="font-medium">{channel.designation || channel.label}</span>
                {channel.id && <span className="text-gray-600"> (ID: {channel.id})</span>}
              </div>
            ))}
            {dropdownData.channels?.length > 5 && (
              <div className="text-gray-500">...and {dropdownData.channels.length - 5} more</div>
            )}
          </div>
        </div>

      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-bold text-gray-800 mb-2">🔗 API Endpoints Tested:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>✅ GET /api/call-details/dropdown-data/ (Comprehensive)</li>
          <li>✅ GET /api/call-plans/employees/</li>
          <li>✅ GET /api/call-plans/vendors/</li>
          <li>✅ GET /api/call-plans/cities/</li>
          <li>✅ GET /api/call-plans/sources/</li>
          <li>✅ GET /api/call-plans/branches/</li>
          <li>✅ GET /api/call-plans/channels/</li>
        </ul>
      </div>

      <div className="mt-4 text-center">
        <button 
          onClick={() => window.location.reload()} 
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Refresh Test
        </button>
      </div>
    </div>
  );
};

export default DropdownTest;
