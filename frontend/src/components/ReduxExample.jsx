import React, { useState, useEffect } from 'react';
import { useAuth, useUI, useForm, useMasterData, useUserManagement, useLoading } from '../Redux/hooks';

const ReduxExample = () => {
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState({ email: '', password: '' });
  const [newIndustry, setNewIndustry] = useState('');
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'user' });

  // Using custom Redux hooks
  const { 
    user, 
    isAuthenticated,
    login, 
    logout, 
    hasPermission 
  } = useAuth();
  
  const { 
    currentView, 
    setCurrentView, 
    searchTerm, 
    setSearchTerm 
  } = useUI();
  
  const { 
    formData, 
    updateFormData, 
    resetForm 
  } = useForm();
  
  const { 
    industries, 
    addIndustry, 
    updateIndustry, 
    deleteIndustry,
    loading: masterDataLoading 
  } = useMasterData();
  
  const { 
    users, 
    addUser, 
    updateUser, 
    deleteUser,
    loading: userLoading 
  } = useUserManagement();
  
  const { isAnyLoading, anyError } = useLoading();

  // Handle login
  const handleLogin = (e) => {
    e.preventDefault();
    login(loginCredentials);
    setShowLoginForm(false);
    setLoginCredentials({ email: '', password: '' });
  };

  // Handle industry operations
  const handleAddIndustry = (e) => {
    e.preventDefault();
    if (newIndustry.trim()) {
      addIndustry({ id: Date.now(), name: newIndustry.trim() });
      setNewIndustry('');
    }
  };

  // Handle user operations
  const handleAddUser = (e) => {
    e.preventDefault();
    if (newUser.name && newUser.email) {
      addUser({ ...newUser, id: Date.now(), status: 'active' });
      setNewUser({ name: '', email: '', role: 'user' });
    }
  };

  // Auto-login for demo purposes
  useEffect(() => {
    if (!isAuthenticated) {
      login({ email: 'admin@example.com', password: 'password' });
    }
  }, [isAuthenticated, login]);

  if (isAnyLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (anyError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">Error: {anyError}</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Redux State Management Example</h1>

      {/* Authentication Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Authentication</h2>
        {isAuthenticated ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg">Welcome, {user?.name || 'User'}!</p>
                <p className="text-sm text-gray-600">Email: {user?.email}</p>
                <p className="text-sm text-gray-600">
                  Permissions: {user?.permissions?.join(', ') || 'None'}
                </p>
              </div>
              <button
                onClick={logout}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Logout
              </button>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`px-4 py-2 rounded ${
                  currentView === 'dashboard' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('users')}
                className={`px-4 py-2 rounded ${
                  currentView === 'users' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Users
              </button>
              <button
                onClick={() => setCurrentView('master')}
                className={`px-4 py-2 rounded ${
                  currentView === 'master' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Master Data
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="mb-4">Please log in to continue</p>
            <button
              onClick={() => setShowLoginForm(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Login
            </button>
          </div>
        )}
      </div>

      {/* Login Form Modal */}
      {showLoginForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-xl font-semibold mb-4">Login</h3>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  name="login-email"
                  id="login-email"
                  value={loginCredentials.email}
                  onChange={(e) => setLoginCredentials({
                    ...loginCredentials,
                    email: e.target.value
                  })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label htmlFor="login-password" className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  name="login-password"
                  id="login-password"
                  value={loginCredentials.password}
                  autoComplete="current-password"
                  onChange={(e) => setLoginCredentials({
                    ...loginCredentials,
                    password: e.target.value
                  })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setShowLoginForm(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UI State Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">UI State Management</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="ui-search-term" className="block text-sm font-medium mb-1">Search Term</label>
            <input
              type="text"
              name="ui-search-term"
              id="ui-search-term"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter search term..."
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div>
            <p className="text-sm text-gray-600">
              Current View: <span className="font-medium">{currentView}</span>
            </p>
            <p className="text-sm text-gray-600">
              Search Term: <span className="font-medium">{searchTerm || 'None'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Master Data Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Master Data Management</h2>
        <div className="space-y-6">
          {/* Add Industry Form */}
          <div>
            <h3 className="text-lg font-medium mb-2">Add Industry</h3>
            <form onSubmit={handleAddIndustry} className="flex space-x-2">
              <input
                type="text"
                name="industry-name"
                id="industry-name"
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
                placeholder="Enter industry name..."
                className="flex-1 border border-gray-300 rounded px-3 py-2"
              />
              <button
                type="submit"
                disabled={masterDataLoading}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
              >
                {masterDataLoading ? 'Adding...' : 'Add Industry'}
              </button>
            </form>
          </div>

          {/* Industries List */}
          <div>
            <h3 className="text-lg font-medium mb-2">Industries ({industries.length})</h3>
            <div className="space-y-2">
              {industries.map((industry) => (
                <div
                  key={industry.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded"
                >
                  <span>{industry.name}</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => updateIndustry({
                        id: industry.id,
                        name: prompt('Enter new name:', industry.name) || industry.name
                      })}
                      className="bg-yellow-500 text-white px-2 py-1 rounded text-sm hover:bg-yellow-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteIndustry(industry.id)}
                      className="bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {industries.length === 0 && (
                <p className="text-gray-500 text-center py-4">No industries found</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Management Section */}
      {hasPermission('admin') && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">User Management</h2>
          <div className="space-y-6">
            {/* Add User Form */}
            <div>
              <h3 className="text-lg font-medium mb-2">Add User</h3>
              <form onSubmit={handleAddUser} className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input
                    type="text"
                    name="user-name"
                    id="user-name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Name"
                    className="border border-gray-300 rounded px-3 py-2"
                  />
                  <input
                    type="email"
                    name="user-email"
                    id="user-email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="Email"
                    className="border border-gray-300 rounded px-3 py-2"
                  />
                  <select
                    name="user-role"
                    id="user-role"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={userLoading}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
                >
                  {userLoading ? 'Adding...' : 'Add User'}
                </button>
              </form>
            </div>

            {/* Users List */}
            <div>
              <h3 className="text-lg font-medium mb-2">Users ({users.length})</h3>
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded"
                  >
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <p className="text-xs text-gray-500">Role: {user.role}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => updateUser({
                          id: user.id,
                          status: user.status === 'active' ? 'inactive' : 'active'
                        })}
                        className={`px-2 py-1 rounded text-sm ${
                          user.status === 'active'
                            ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                            : 'bg-green-500 text-white hover:bg-green-600'
                        }`}
                      >
                        {user.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No users found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Data Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Form Data Management</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="profile-number" className="block text-sm font-medium mb-1">Profile Number</label>
            <input
              type="text"
              name="profile-number"
              id="profile-number"
              value={formData.profileNumber || ''}
              onChange={(e) => updateFormData({ profileNumber: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="candidate-name" className="block text-sm font-medium mb-1">Candidate Name</label>
            <input
              type="text"
              name="candidate-name"
              id="candidate-name"
              value={formData.candidateName || ''}
              onChange={(e) => updateFormData({ candidateName: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={resetForm}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Reset Form
            </button>
            <button
              onClick={() => updateFormData({
                profileNumber: `PROF-${Math.floor(1000 + Math.random() * 9000)}`,
                candidateName: 'John Doe',
                email: 'john@example.com',
                mobile1: '+1234567890'
              })}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Fill Sample Data
            </button>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <h4 className="font-medium mb-2">Current Form Data:</h4>
            <pre className="text-sm text-gray-700 overflow-auto">
              {JSON.stringify(formData, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {/* State Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">State Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-medium text-gray-700">Authentication</h3>
            <p className="text-2xl font-bold text-blue-600">
              {isAuthenticated ? 'Logged In' : 'Logged Out'}
            </p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-medium text-gray-700">Industries</h3>
            <p className="text-2xl font-bold text-green-600">{industries.length}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-medium text-gray-700">Users</h3>
            <p className="text-2xl font-bold text-purple-600">{users.length}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-medium text-gray-700">Current View</h3>
            <p className="text-2xl font-bold text-orange-600">{currentView}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReduxExample; 