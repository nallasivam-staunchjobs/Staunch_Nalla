import React, { useState, useEffect } from 'react';
import VendorLeadForm from './components/VendorLeadForm';
import VendorConversionForm from './components/VendorConversionFormActive';
import VendorLeadsList from './components/VendorLeadsList';
import VendorsList from './components/VendorsList';
import { Users, UserPlus, Building2, Filter } from 'lucide-react';
import './index.css';
import vendorService from '../../../../api/vendorService';

function UpdateVendor() {
  const [activeTab, setActiveTab] = useState('leads');
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showConversionForm, setShowConversionForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [editingVendor, setEditingVendor] = useState(null);
  const [convertingLead, setConvertingLead] = useState(null);
  const [vendorLeads, setVendorLeads] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch data from backend on component mount
  useEffect(() => {
    fetchVendorLeads();
    fetchVendors();
  }, []);

  const fetchVendorLeads = async () => {
    try {
      setLoading(true);
      const data = await vendorService.getAllVendorLeads();
      setVendorLeads(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching vendor leads:', error);
      setError('Failed to fetch vendor leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const data = await vendorService.getAllVendors();
      setVendors(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setError('Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleLeadSubmit = async (leadData) => {
    try {
      setLoading(true);
      if (editingLead) {
        await vendorService.updateVendorLead(editingLead.id, leadData);
      } else {
        await vendorService.createVendorLead(leadData);
      }
      await fetchVendorLeads();
      setShowLeadForm(false);
      setEditingLead(null);
      setError(null);
    } catch (error) {
      console.error('Error saving lead:', error);
      setError('Failed to save vendor lead');
    } finally {
      setLoading(false);
    }
  };

  const handleVendorSubmit = async (vendorData) => {
    try {
      setLoading(true);
      if (convertingLead) {
        await vendorService.convertLeadToVendor(convertingLead.id, vendorData);
        await fetchVendorLeads();
        setConvertingLead(null);
      } else if (editingVendor) {
        await vendorService.updateVendor(editingVendor.id, vendorData);
      } else {
        await vendorService.createVendor(vendorData);
      }
      await fetchVendors();
      setShowConversionForm(false);
      setEditingVendor(null);
      setError(null);
    } catch (error) {
      console.error('Error saving vendor:', error);
      setError('Failed to save vendor');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLead = async (id) => {
    try {
      setLoading(true);
      await vendorService.deleteVendorLead(id);
      await fetchVendorLeads();
      setError(null);
    } catch (error) {
      console.error('Error deleting lead:', error);
      setError('Failed to delete vendor lead');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVendor = async (id) => {
    try {
      setLoading(true);
      await vendorService.deleteVendor(id);
      await fetchVendors();
      setError(null);
    } catch (error) {
      console.error('Error deleting vendor:', error);
      setError('Failed to delete vendor');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertLead = (lead) => {
    setConvertingLead(lead);
    setShowConversionForm(true);
  };

  const handleEditLead = (lead) => {
    setEditingLead(lead);
    setShowLeadForm(true);
  };

  const handleEditVendor = (vendor) => {
    setEditingVendor(vendor);
    setShowConversionForm(true);
  };

  const handleUpdateLeadStatus = async (id, status) => {
    try {
      setLoading(true);
      await vendorService.updateVendorLeadStatus(id, status);
      await fetchVendorLeads();
      setError(null);
    } catch (error) {
      console.error('Error updating lead status:', error);
      setError('Failed to update lead status');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVendorStatus = async (id, status) => {
    try {
      setLoading(true);
      await vendorService.updateVendorStatus(id, status);
      await fetchVendors();
      setError(null);
    } catch (error) {
      console.error('Error updating vendor status:', error);
      setError('Failed to update vendor status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 ">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 mx-4 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="inline-flex text-red-400 hover:text-red-600"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-700">Processing...</span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100 ">
        <div className="max-w-9xl mx-auto px-2 sm:px-6 lg:px-3">
          <div className="flex justify-between items-center py-2">
            <div className="flex items-center space-x-3">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-bold text-gray-900">Vendor Management System</h1>
            </div>
            <div className="flex items-center ">
              <button
                onClick={() => {
                  if (activeTab === 'leads') {
                    setEditingLead(null);
                    setShowLeadForm(true);
                  } else {
                    setEditingVendor(null);
                    setConvertingLead(null);
                    setShowConversionForm(true);
                  }
                }}
                className="btn-blue flex items-center gap-1.5 "
              >
                <UserPlus className="w-3 h-3" />
                <span className="text-xs">
                  {activeTab === 'leads' ? 'Add Lead' : 'Add Vendor'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-9xl mx-auto px-2 sm:px-6 lg:px-2 mt-2">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('leads')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'leads'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Vendor Leads ({vendorLeads.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('vendors')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'vendors'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4" />
                <span>Vendors ({vendors.length})</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-9xl mx-auto sm:px-6 lg:px-2 p-2">
        {activeTab === 'leads' && (
          <VendorLeadsList
            leads={vendorLeads}
            onEdit={handleEditLead}
            onDelete={handleDeleteLead}
            onConvert={handleConvertLead}
            onUpdateStatus={handleUpdateLeadStatus}
          />
        )}

        {activeTab === 'vendors' && (
          <VendorsList
            vendors={vendors}
            onEdit={handleEditVendor}
            onDelete={handleDeleteVendor}
            onUpdateStatus={handleUpdateVendorStatus}
          />
        )}
      </div>

      {/* Modals */}
      {showLeadForm && (
        <VendorLeadForm
          lead={editingLead}
          onSubmit={handleLeadSubmit}
          onCancel={() => {
            setShowLeadForm(false);
            setEditingLead(null);
          }}
        />
      )}

      {showConversionForm && (
        <VendorConversionForm
          vendor={editingVendor}
          leadData={convertingLead}
          onSubmit={handleVendorSubmit}
          onCancel={() => {
            setShowConversionForm(false);
            setEditingVendor(null);
            setConvertingLead(null);
          }}
        />
      )}
    </div>
  );
}

export default UpdateVendor;

