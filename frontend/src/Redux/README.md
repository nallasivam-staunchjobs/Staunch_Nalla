# Redux State Management Setup

This directory contains a comprehensive Redux setup for the HR Management System frontend application.

## Overview

The Redux setup is organized into multiple slices, each handling a specific domain of the application:

- **Authentication** (`authSlice.js`) - User authentication, session management, permissions
- **UI State** (`uiSlice.js`) - Global UI state, navigation, search, pagination
- **Form Management** (`formSlice.js`) - Form data, file uploads, validation
- **Candidates** (`candidatesSlice.js`) - Candidate management and search
- **Job Posting** (`jobPostingSlice.js`) - Job posting workflow and form data
- **Master Data** (`masterDataSlice.js`) - Industries, departments, designations, sources, remarks
- **User Management** (`userManagementSlice.js`) - User CRUD operations, roles, permissions
- **Vendor Management** (`vendorManagementSlice.js`) - Vendor management and contacts
- **DTR** (`dtrSlice.js`) - Daily Time Record, attendance tracking
- **Calendar** (`calendarSlice.js`) - Events, scheduling, calendar views
- **Dashboard** (`dashboardSlice.js`) - Analytics, charts, widgets, activities

## File Structure

```
Redux/
├── Store.js              # Main Redux store configuration
├── selectors.js          # Memoized selectors for state access
├── hooks.js              # Custom Redux hooks for components
├── authSlice.js          # Authentication state management
├── uiSlice.js            # UI state management
├── formSlice.js          # Form state management
├── candidatesSlice.js    # Candidates state management
├── jobPostingSlice.js    # Job posting state management
├── masterDataSlice.js    # Master data state management
├── userManagementSlice.js # User management state
├── vendorManagementSlice.js # Vendor management state
├── dtrSlice.js           # DTR state management
├── calendarSlice.js      # Calendar and events state
├── dashboardSlice.js     # Dashboard state management
└── README.md             # This documentation
```

## Usage

### 1. Using Custom Hooks (Recommended)

The easiest way to use Redux in your components is through the custom hooks:

```jsx
import { useAuth, useUI, useForm, useMasterData } from '../Redux/hooks';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  const { currentView, setCurrentView } = useUI();
  const { formData, updateFormData } = useForm();
  const { industries, addIndustry } = useMasterData();

  // Use the state and actions
  return (
    <div>
      {isAuthenticated ? (
        <button onClick={logout}>Logout</button>
      ) : (
        <button onClick={() => login({ email: 'user@example.com', password: 'pass' })}>
          Login
        </button>
      )}
    </div>
  );
}
```

### 2. Using Selectors Directly

For more complex state access, use the memoized selectors:

```jsx
import { useSelector, useDispatch } from 'react-redux';
import { selectFilteredUsers, selectUserManagementLoading } from '../Redux/selectors';
import { addUser, updateUser } from '../Redux/userManagementSlice';

function UserList() {
  const dispatch = useDispatch();
  const users = useSelector(selectFilteredUsers);
  const loading = useSelector(selectUserManagementLoading);

  const handleAddUser = (userData) => {
    dispatch(addUser(userData));
  };

  return (
    <div>
      {loading ? <p>Loading...</p> : (
        users.map(user => <UserCard key={user.id} user={user} />)
      )}
    </div>
  );
}
```

### 3. Using Actions Directly

For direct action dispatching:

```jsx
import { useDispatch } from 'react-redux';
import { addIndustry, updateIndustry } from '../Redux/masterDataSlice';

function IndustryForm() {
  const dispatch = useDispatch();

  const handleSubmit = (industryData) => {
    if (industryData.id) {
      dispatch(updateIndustry(industryData));
    } else {
      dispatch(addIndustry({ ...industryData, id: Date.now() }));
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

## Available Hooks

### Authentication
- `useAuth()` - User authentication, login/logout, permissions

### UI Management
- `useUI()` - Global UI state, navigation, search

### Form Management
- `useForm()` - Form data, file uploads, validation

### Data Management
- `useCandidates()` - Candidate management
- `useJobPosting()` - Job posting workflow
- `useMasterData()` - Master data (industries, departments, etc.)
- `useUserManagement()` - User management
- `useVendorManagement()` - Vendor management
- `useDTR()` - Daily Time Record
- `useCalendar()` - Calendar and events
- `useDashboard()` - Dashboard and analytics

### Utility
- `useLoading()` - Global loading and error states

## State Structure

### Authentication State
```javascript
{
  user: null | UserObject,
  token: string | null,
  isAuthenticated: boolean,
  permissions: string[],
  roles: string[],
  loading: boolean,
  error: string | null,
  // ... other auth properties
}
```

### UI State
```javascript
{
  currentView: string,
  currentStep: number,
  searchTerm: string,
  tableSearchQuery: string,
  entriesPerPage: number,
  isViewModalOpen: boolean,
  // ... other UI properties
}
```

### Master Data State
```javascript
{
  industries: Industry[],
  departments: Department[],
  designations: Designation[],
  sources: Source[],
  remarks: Remark[],
  loading: boolean,
  error: string | null,
  // ... other properties
}
```

## Best Practices

### 1. Use Custom Hooks
Always prefer custom hooks over direct `useSelector` and `useDispatch` for better code organization and reusability.

### 2. Use Memoized Selectors
Use the provided selectors for efficient state access and to prevent unnecessary re-renders.

### 3. Handle Loading States
Always check loading states before rendering data:

```jsx
const { loading, error, data } = useSomeData();

if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
return <DataDisplay data={data} />;
```

### 4. Optimize Performance
- Use `useCallback` for action creators in custom hooks
- Use memoized selectors for complex state calculations
- Avoid dispatching actions in render functions

### 5. Error Handling
Always handle errors gracefully:

```jsx
const { error, clearError } = useSomeData();

useEffect(() => {
  if (error) {
    // Show error notification
    showToast(error, 'error');
    clearError();
  }
}, [error, clearError]);
```

## Middleware Configuration

The store is configured with Redux Toolkit's default middleware and custom serialization checks for:

- File objects (resume uploads)
- Date objects (calendar events, DTR records)
- Authentication tokens and session data

## Persistence

Authentication tokens are automatically persisted to localStorage and restored on app initialization.

## Development Tools

The Redux DevTools extension is enabled for development. You can inspect state changes, time-travel debugging, and action history.

## Adding New Features

### 1. Create a New Slice
```javascript
// newFeatureSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  data: [],
  loading: false,
  error: null,
};

const newFeatureSlice = createSlice({
  name: 'newFeature',
  initialState,
  reducers: {
    setData: (state, action) => {
      state.data = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const { setData, setLoading, setError } = newFeatureSlice.actions;
export default newFeatureSlice.reducer;
```

### 2. Add to Store
```javascript
// Store.js
import newFeatureReducer from './newFeatureSlice';

export const store = configureStore({
  reducer: {
    // ... existing reducers
    newFeature: newFeatureReducer,
  },
});
```

### 3. Create Selectors
```javascript
// selectors.js
export const selectNewFeature = (state) => state.newFeature;
export const selectNewFeatureData = createSelector(
  [selectNewFeature],
  (newFeature) => newFeature.data
);
```

### 4. Create Custom Hook
```javascript
// hooks.js
export const useNewFeature = () => {
  const dispatch = useDispatch();
  const data = useSelector(selectNewFeatureData);
  const loading = useSelector(selectNewFeatureLoading);
  
  const setData = useCallback((data) => {
    dispatch(newFeatureActions.setData(data));
  }, [dispatch]);
  
  return { data, loading, setData };
};
```

## Troubleshooting

### Common Issues

1. **State not updating**: Check if you're using the correct selector
2. **Component not re-rendering**: Ensure you're using memoized selectors
3. **Performance issues**: Use `useCallback` for action creators and memoized selectors
4. **Serialization errors**: Add non-serializable data to the ignored paths in store configuration

### Debug Tips

1. Use Redux DevTools to inspect state changes
2. Add console.logs in selectors to debug state access
3. Check action payloads in Redux DevTools
4. Verify middleware configuration for non-serializable data

## Migration Guide

If you're migrating from local state to Redux:

1. Identify the state that needs to be shared across components
2. Create appropriate slices for the state
3. Replace `useState` with Redux state and custom hooks
4. Update components to use Redux selectors and actions
5. Test thoroughly to ensure state updates work correctly

## Performance Considerations

- Use `React.memo` for components that receive Redux state as props
- Implement pagination for large data sets
- Use debouncing for search inputs
- Consider using `react-window` for large lists
- Implement proper loading states to prevent UI blocking 