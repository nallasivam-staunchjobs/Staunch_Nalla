import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  users: [],
  roles: [],
  permissions: [],
  selectedUser: null,
  loading: false,
  error: null,
  searchQuery: '',
  filterRole: 'all',
  filterStatus: 'all',
  currentPage: 1,
  itemsPerPage: 10,
  totalUsers: 0,
  isEditMode: false,
  showDeleteModal: false,
  userToDelete: null,
};

const userManagementSlice = createSlice({
  name: 'userManagement',
  initialState,
  reducers: {
    // Users
    setUsers: (state, action) => {
      state.users = action.payload;
      state.totalUsers = action.payload.length;
    },
    addUser: (state, action) => {
      state.users.push(action.payload);
      state.totalUsers += 1;
    },
    updateUser: (state, action) => {
      const { id, ...updateData } = action.payload;
      const index = state.users.findIndex(user => user.id === id);
      if (index !== -1) {
        state.users[index] = { ...state.users[index], ...updateData };
      }
    },
    deleteUser: (state, action) => {
      state.users = state.users.filter(user => user.id !== action.payload);
      state.totalUsers -= 1;
    },
    setSelectedUser: (state, action) => {
      state.selectedUser = action.payload;
    },

    // Roles
    setRoles: (state, action) => {
      state.roles = action.payload;
    },
    addRole: (state, action) => {
      state.roles.push(action.payload);
    },
    updateRole: (state, action) => {
      const { id, ...updateData } = action.payload;
      const index = state.roles.findIndex(role => role.id === id);
      if (index !== -1) {
        state.roles[index] = { ...state.roles[index], ...updateData };
      }
    },
    deleteRole: (state, action) => {
      state.roles = state.roles.filter(role => role.id !== action.payload);
    },

    // Permissions
    setPermissions: (state, action) => {
      state.permissions = action.payload;
    },
    addPermission: (state, action) => {
      state.permissions.push(action.payload);
    },
    updatePermission: (state, action) => {
      const { id, ...updateData } = action.payload;
      const index = state.permissions.findIndex(permission => permission.id === id);
      if (index !== -1) {
        state.permissions[index] = { ...state.permissions[index], ...updateData };
      }
    },
    deletePermission: (state, action) => {
      state.permissions = state.permissions.filter(permission => permission.id !== action.payload);
    },

    // User Status Management
    activateUser: (state, action) => {
      const index = state.users.findIndex(user => user.id === action.payload);
      if (index !== -1) {
        state.users[index].status = 'active';
      }
    },
    deactivateUser: (state, action) => {
      const index = state.users.findIndex(user => user.id === action.payload);
      if (index !== -1) {
        state.users[index].status = 'inactive';
      }
    },
    suspendUser: (state, action) => {
      const index = state.users.findIndex(user => user.id === action.payload);
      if (index !== -1) {
        state.users[index].status = 'suspended';
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
      state.currentPage = 1; // Reset to first page when searching
    },
    setFilterRole: (state, action) => {
      state.filterRole = action.payload;
      state.currentPage = 1;
    },
    setFilterStatus: (state, action) => {
      state.filterStatus = action.payload;
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
    setUserToDelete: (state, action) => {
      state.userToDelete = action.payload;
    },

    // Bulk Operations
    bulkActivateUsers: (state, action) => {
      const userIds = action.payload;
      state.users.forEach(user => {
        if (userIds.includes(user.id)) {
          user.status = 'active';
        }
      });
    },
    bulkDeactivateUsers: (state, action) => {
      const userIds = action.payload;
      state.users.forEach(user => {
        if (userIds.includes(user.id)) {
          user.status = 'inactive';
        }
      });
    },
    bulkDeleteUsers: (state, action) => {
      const userIds = action.payload;
      state.users = state.users.filter(user => !userIds.includes(user.id));
      state.totalUsers -= userIds.length;
    },

    // Reset
    resetUserManagement: (state) => {
      state.selectedUser = null;
      state.isEditMode = false;
      state.searchQuery = '';
      state.filterRole = 'all';
      state.filterStatus = 'all';
      state.currentPage = 1;
      state.error = null;
      state.showDeleteModal = false;
      state.userToDelete = null;
    },
  },
});

export const {
  // Users
  setUsers,
  addUser,
  updateUser,
  deleteUser,
  setSelectedUser,
  
  // Roles
  setRoles,
  addRole,
  updateRole,
  deleteRole,
  
  // Permissions
  setPermissions,
  addPermission,
  updatePermission,
  deletePermission,
  
  // User Status
  activateUser,
  deactivateUser,
  suspendUser,
  
  // UI State
  setLoading,
  setError,
  setSearchQuery,
  setFilterRole,
  setFilterStatus,
  setCurrentPage,
  setItemsPerPage,
  setIsEditMode,
  setShowDeleteModal,
  setUserToDelete,
  
  // Bulk Operations
  bulkActivateUsers,
  bulkDeactivateUsers,
  bulkDeleteUsers,
  
  // Reset
  resetUserManagement,
} = userManagementSlice.actions;

export default userManagementSlice.reducer; 