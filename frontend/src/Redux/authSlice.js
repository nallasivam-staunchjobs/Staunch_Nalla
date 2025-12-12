import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API from "../api/api";

// Function to get initial state from localStorage
const getInitialState = () => {
  const token = localStorage.getItem("token");
  const firstName = localStorage.getItem("firstName");
  const employeeCode = localStorage.getItem("employeeCode");
  const phone = localStorage.getItem("phone");
  const userRole = localStorage.getItem("userRole");

  // Check if all necessary items exist in localStorage
  if (token && (phone || employeeCode) && userRole) {
    return {
      isAuthenticated: true,
      token: token,
      firstName: firstName,
      employeeCode: employeeCode,
      phone: phone,
      userRole: userRole,
      loading: false,
      error: null,
    };
  }

  // If not, return the default initial state
  return {
    isAuthenticated: false,
    token: null,
    firstName: null,
    employeeCode: null,
    phone: null,
    userRole: null,
    loading: false,
    error: null,
  };
};

const initialState = getInitialState();

export const login = createAsyncThunk(
  "auth/login",
  async ({ phone, employeeCode, password }, { rejectWithValue }) => {
    try {
      // Send either phone or employeeCode (whichever is provided)
      const loginData = { password };
      if (phone) {
        loginData.phone = phone;
      } else if (employeeCode) {
        loginData.employeeCode = employeeCode;
      }
      
      const response = await API.post("login/", loginData);
      const { token, firstName, employeeCode: empCode, phone: phoneNumber, role } = response.data;

      // >>> ADD THIS CONSOLE LOG to inspect the received data <<<
      console.log("Login API Response Data:", response.data);
      console.log("Extracted FirstName from API:", firstName);
      console.log("Extracted EmployeeCode from API:", empCode);
      console.log("Extracted Phone from API:", phoneNumber);

      // Save to localStorage on successful login
      localStorage.setItem("token", token);
      localStorage.setItem("firstName", firstName);
      localStorage.setItem("employeeCode", empCode);
      localStorage.setItem("phone", phoneNumber);
      localStorage.setItem("userRole", role);

      return { token, firstName, employeeCode: empCode, phone: phoneNumber, userRole: role };
    } catch (error) {
      if (error.response?.data?.error) {
        return rejectWithValue(error.response.data.error);
      }
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      console.log("Redux logout action dispatched! Clearing localStorage + state.");
      localStorage.removeItem("token");
      localStorage.removeItem("firstName");
      localStorage.removeItem("employeeCode");
      localStorage.removeItem("phone");
      localStorage.removeItem("userRole");
      state.isAuthenticated = false;
      state.token = null;
      state.firstName = null;
      state.employeeCode = null;
      state.phone = null;
      state.userRole = null;
      state.loading = false;
      state.error = null;
      
      // Refresh page after logout to clear all application state
      setTimeout(() => {
        window.location.reload();
      }, 100);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.firstName = action.payload.firstName;
        state.employeeCode = action.payload.employeeCode;
        state.phone = action.payload.phone;
        state.userRole = action.payload.userRole;
        // >>> OPTIONAL: Add a console log here to see what's being set in Redux state <<<
        console.log("Redux state updated with firstName:", action.payload.firstName);
        console.log("Redux state updated with employeeCode:", action.payload.employeeCode);
        console.log("Redux state updated with phone:", action.payload.phone);
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.token = null;
        state.firstName = null;
        state.employeeCode = null;
        state.phone = null;
        state.userRole = null;
        state.error = action.payload || "Login failed. Please check credentials.";
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
