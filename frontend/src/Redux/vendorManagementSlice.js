import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  vendors: [],
  selectedVendor: null,
  loading: false,
  error: null,
  searchQuery: '',
  filterStatus: 'all',
  filterType: 'all',
  currentPage: 1,
  itemsPerPage: 10,
  totalVendors: 0,
  isEditMode: false,
  showDeleteModal: false,
  vendorToDelete: null,
  showContactModal: false,
  selectedContact: null,
};

const vendorManagementSlice = createSlice({
  name: 'vendorManagement',
  initialState,
  reducers: {
    // Vendors
    setVendors: (state, action) => {
      state.vendors = action.payload;
      state.totalVendors = action.payload.length;
    },
    addVendor: (state, action) => {
      state.vendors.push(action.payload);
      state.totalVendors += 1;
    },
    updateVendor: (state, action) => {
      const { id, ...updateData } = action.payload;
      const index = state.vendors.findIndex(vendor => vendor.id === id);
      if (index !== -1) {
        state.vendors[index] = { ...state.vendors[index], ...updateData };
      }
    },
    deleteVendor: (state, action) => {
      state.vendors = state.vendors.filter(vendor => vendor.id !== action.payload);
      state.totalVendors -= 1;
    },
    setSelectedVendor: (state, action) => {
      state.selectedVendor = action.payload;
    },

    // Vendor Contacts
    addVendorContact: (state, action) => {
      const { vendorId, contact } = action.payload;
      const vendorIndex = state.vendors.findIndex(vendor => vendor.id === vendorId);
      if (vendorIndex !== -1) {
        if (!state.vendors[vendorIndex].contacts) {
          state.vendors[vendorIndex].contacts = [];
        }
        state.vendors[vendorIndex].contacts.push(contact);
      }
    },
    updateVendorContact: (state, action) => {
      const { vendorId, contactId, ...updateData } = action.payload;
      const vendorIndex = state.vendors.findIndex(vendor => vendor.id === vendorId);
      if (vendorIndex !== -1 && state.vendors[vendorIndex].contacts) {
        const contactIndex = state.vendors[vendorIndex].contacts.findIndex(
          contact => contact.id === contactId
        );
        if (contactIndex !== -1) {
          state.vendors[vendorIndex].contacts[contactIndex] = {
            ...state.vendors[vendorIndex].contacts[contactIndex],
            ...updateData
          };
        }
      }
    },
    deleteVendorContact: (state, action) => {
      const { vendorId, contactId } = action.payload;
      const vendorIndex = state.vendors.findIndex(vendor => vendor.id === vendorId);
      if (vendorIndex !== -1 && state.vendors[vendorIndex].contacts) {
        state.vendors[vendorIndex].contacts = state.vendors[vendorIndex].contacts.filter(
          contact => contact.id !== contactId
        );
      }
    },

    // Vendor Status Management
    activateVendor: (state, action) => {
      const index = state.vendors.findIndex(vendor => vendor.id === action.payload);
      if (index !== -1) {
        state.vendors[index].status = 'active';
      }
    },
    deactivateVendor: (state, action) => {
      const index = state.vendors.findIndex(vendor => vendor.id === action.payload);
      if (index !== -1) {
        state.vendors[index].status = 'inactive';
      }
    },
    suspendVendor: (state, action) => {
      const index = state.vendors.findIndex(vendor => vendor.id === action.payload);
      if (index !== -1) {
        state.vendors[index].status = 'suspended';
      }
    },

    // Vendor Documents
    addVendorDocument: (state, action) => {
      const { vendorId, document } = action.payload;
      const vendorIndex = state.vendors.findIndex(vendor => vendor.id === vendorId);
      if (vendorIndex !== -1) {
        if (!state.vendors[vendorIndex].documents) {
          state.vendors[vendorIndex].documents = [];
        }
        state.vendors[vendorIndex].documents.push(document);
      }
    },
    updateVendorDocument: (state, action) => {
      const { vendorId, documentId, ...updateData } = action.payload;
      const vendorIndex = state.vendors.findIndex(vendor => vendor.id === vendorId);
      if (vendorIndex !== -1 && state.vendors[vendorIndex].documents) {
        const documentIndex = state.vendors[vendorIndex].documents.findIndex(
          document => document.id === documentId
        );
        if (documentIndex !== -1) {
          state.vendors[vendorIndex].documents[documentIndex] = {
            ...state.vendors[vendorIndex].documents[documentIndex],
            ...updateData
          };
        }
      }
    },
    deleteVendorDocument: (state, action) => {
      const { vendorId, documentId } = action.payload;
      const vendorIndex = state.vendors.findIndex(vendor => vendor.id === vendorId);
      if (vendorIndex !== -1 && state.vendors[vendorIndex].documents) {
        state.vendors[vendorIndex].documents = state.vendors[vendorIndex].documents.filter(
          document => document.id !== documentId
        );
      }
    },

    // UI State
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
      state.currentPage = 1;
    },
    setFilterStatus: (state, action) => {
      state.filterStatus = action.payload;
      state.currentPage = 1;
    },
    setFilterType: (state, action) => {
      state.filterType = action.payload;
      state.currentPage = 1;
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
    setItemsPerPage: (state, action) => {
      state.itemsPerPage = action.payload;
      state.currentPage = 1;
    },
    setIsEditMode: (state, action) => {
      state.isEditMode = action.payload;
    },
    setShowDeleteModal: (state, action) => {
      state.showDeleteModal = action.payload;
    },
    setVendorToDelete: (state, action) => {
      state.vendorToDelete = action.payload;
    },
    setShowContactModal: (state, action) => {
      state.showContactModal = action.payload;
    },
    setSelectedContact: (state, action) => {
      state.selectedContact = action.payload;
    },

    // Bulk Operations
    bulkActivateVendors: (state, action) => {
      const vendorIds = action.payload;
      state.vendors.forEach(vendor => {
        if (vendorIds.includes(vendor.id)) {
          vendor.status = 'active';
        }
      });
    },
    bulkDeactivateVendors: (state, action) => {
      const vendorIds = action.payload;
      state.vendors.forEach(vendor => {
        if (vendorIds.includes(vendor.id)) {
          vendor.status = 'inactive';
        }
      });
    },
    bulkDeleteVendors: (state, action) => {
      const vendorIds = action.payload;
      state.vendors = state.vendors.filter(vendor => !vendorIds.includes(vendor.id));
      state.totalVendors -= vendorIds.length;
    },

    // Reset
    resetVendorManagement: (state) => {
      state.selectedVendor = null;
      state.isEditMode = false;
      state.searchQuery = '';
      state.filterStatus = 'all';
      state.filterType = 'all';
      state.currentPage = 1;
      state.error = null;
      state.showDeleteModal = false;
      state.vendorToDelete = null;
      state.showContactModal = false;
      state.selectedContact = null;
    },
  },
});

export const {
  // Vendors
  setVendors,
  addVendor,
  updateVendor,
  deleteVendor,
  setSelectedVendor,
  
  // Vendor Contacts
  addVendorContact,
  updateVendorContact,
  deleteVendorContact,
  
  // Vendor Status
  activateVendor,
  deactivateVendor,
  suspendVendor,
  
  // Vendor Documents
  addVendorDocument,
  updateVendorDocument,
  deleteVendorDocument,
  
  // UI State
  setLoading,
  setError,
  setSearchQuery,
  setFilterStatus,
  setFilterType,
  setCurrentPage,
  setItemsPerPage,
  setIsEditMode,
  setShowDeleteModal,
  setVendorToDelete,
  setShowContactModal,
  setSelectedContact,
  
  // Bulk Operations
  bulkActivateVendors,
  bulkDeactivateVendors,
  bulkDeleteVendors,
  
  // Reset
  resetVendorManagement,
} = vendorManagementSlice.actions;

export default vendorManagementSlice.reducer; 