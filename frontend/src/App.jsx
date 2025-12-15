import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from './Redux/hooks';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import LoginPage from "./pages/login/LoginPage";
import HomePage from "./pages/Home";
import Layout from "./layouts/Layout";
import Source from "./pages/master/Source";
import Industry from "./pages/master/Industry";
import Remarks from "./pages/master/Remarks";
import Department from "./pages/master/Department";
import Designation from "./pages/master/Designation";
import EmpReg from "./pages/management/user/NewEmpReg";
import EmployeeDataTableBro from "./pages/management/user/EmployeeDataTable";
import UpdateVendorBro from "./pages/management/vendor/updatedvendor/UpdateVendor";
import Events from "./pages/calendar/Events";
import PlanEventsReport from "./pages/calendar/PlanEventsReport";
import BranchEventsReport from "./pages/calendar/BranchEventsReport";
import CandidateTableReport from "./pages/calendar/CandidateTableReport";
import JobRowsReport from "./pages/calendar/JobRowsReport";
import AddOpenings from "./pages/jobOpenings/AddOpenings";
import Duplicate from "./pages/NewDtr/components/NewDtr";
import Education from "./pages/master/Education";
import Communication from "./pages/master/Communication";
import Position from "./pages/master/Position";
import Branch from "./pages/master/Branch";
import Workmode from "./pages/master/Workmode";
import Gender from "./pages/master/Gender";
import MaterialStatus from "./pages/master/MaritalStatus";
import BloodGroup from "./pages/master/BloodGroup";
import Experience from "./pages/master/Experience";
import ItbrView from "./pages/invoice/ItbrView";
import InvoicePage from "./pages/invoice/InvoicePage";
import EditRevenuePage from "./pages/RevvenueUpdate/EditRevenuePage";
import InvoiceView from "./pages/invoice/InvoiceView";
import ViewOpenings from "./pages/jobOpenings/ViewOpeningss";
import DailyTellyReport from './pages/DailyTellyReport';
import DailyTellyReportDetails from './pages/DailyTellyReportDetails';
import CalendarView from './pages/calendar/CalendarView';
import CalendarDetailsList from './pages/calendar/CalendarDetailsList';
import DataBank from './pages/Reports/DataBank';
import FDTR from './pages/Reports/DailyReport/f-dtr';
import TDTR from './pages/Reports/DailyReport/t-dtr';
import ProfileIn from './pages/Reports/ProfileIn';
import ProfileOut from './pages/Reports/ProfileOut';
import IFPSReport from './pages/Reports/DailyReport/if-ps-report';
import ViewCandidate from './pages/NewDtr/components/ViewCandidate';
import ClientwiseReport from './pages/calendar/Clientwisereport';
import Team from'./pages/master/team';
import RevenueStatusPage from './pages/RevvenueUpdate/RevenueStatusPage';

// Unauthorized Page
const Unauthorized = () => {
  const { logout } = useAuth();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center p-8 bg-white shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied!</h2>
        <p className="text-gray-700 mb-6">You do not have permission to view this page.</p>
        <button
          onClick={logout}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Go to Login
        </button>
      </div>
    </div>
  );
};

// PrivateRoute wrapper
const PrivateRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, userRole } = useAuth();

  // normalize
  const normalizedRole = userRole?.toLowerCase();


  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(normalizedRole)) {
    return <Unauthorized />;
  }
  return children;
};

function App() {
  const { isAuthenticated } = useAuth();

  // Redirect Guard
  if (!isAuthenticated && window.location.pathname !== "/") {
    return <Navigate to="/" replace />;
  }

  //  Roles
  const allRoles = ['ceo', 'rm', 'bm', 'tl', 'employee'];   // everyone
  const fullAccess = ['ceo', 'rm'];                         // CEO + RM only (Masters)
  // const nonMasterRoles = ['bm', 'tl', 'employee'];         // no Masters

  return (
    <Routes>
      {/* Root = Login */}
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/home" /> : <LoginPage />}
      />

      {/* Layout wrapper for all authenticated routes */}
      <Route
        element={
          <PrivateRoute allowedRoles={allRoles}>
            <Layout />
          </PrivateRoute>
        }
      >
        {/* Home Route */}
        <Route path="/home" element={<HomePage />} />

        {/*  Masters - restricted to CEO & RM */}
        <Route path="/source" element={<PrivateRoute allowedRoles={fullAccess}><Source /></PrivateRoute>} />
        <Route path="/industry" element={<PrivateRoute allowedRoles={fullAccess}><Industry /></PrivateRoute>} />
        <Route path="/remarks" element={<PrivateRoute allowedRoles={fullAccess}><Remarks /></PrivateRoute>} />
        <Route path="/department" element={<PrivateRoute allowedRoles={fullAccess}><Department /></PrivateRoute>} />
        <Route path="/designation" element={<PrivateRoute allowedRoles={fullAccess}><Designation /></PrivateRoute>} />
        <Route path="/education" element={<PrivateRoute allowedRoles={fullAccess}><Education /></PrivateRoute>} />
        <Route path="/experience" element={<PrivateRoute allowedRoles={fullAccess}><Experience /></PrivateRoute>} />
        <Route path="/communication" element={<PrivateRoute allowedRoles={fullAccess}><Communication /></PrivateRoute>} />
        <Route path="/position" element={<PrivateRoute allowedRoles={fullAccess}><Position /></PrivateRoute>} />
        <Route path="/branch" element={<PrivateRoute allowedRoles={fullAccess}><Branch /></PrivateRoute>} />
        <Route path="/workmode" element={<PrivateRoute allowedRoles={fullAccess}><Workmode /></PrivateRoute>} />
        <Route path="/gender" element={<PrivateRoute allowedRoles={fullAccess}><Gender /></PrivateRoute>} />
        <Route path="/materialstatus" element={<PrivateRoute allowedRoles={fullAccess}><MaterialStatus /></PrivateRoute>} />
        <Route path="/bloodgroup" element={<PrivateRoute allowedRoles={fullAccess}><BloodGroup /></PrivateRoute>} />
        <Route path="/team" element={<PrivateRoute allowedRoles={fullAccess}><Team/></PrivateRoute>} />

        {/*  Other Pages - all roles */}
        <Route path="/add-user" element={<PrivateRoute allowedRoles={allRoles}><EmpReg /></PrivateRoute>} />
        <Route path="/view-users" element={<PrivateRoute allowedRoles={allRoles}><EmployeeDataTableBro /></PrivateRoute>} />
        <Route path="/add-vendor" element={<PrivateRoute allowedRoles={allRoles}><UpdateVendorBro /></PrivateRoute>} />
        <Route path="/events" element={<PrivateRoute allowedRoles={allRoles}><Events /></PrivateRoute>} />
        <Route path="/plan-events-report" element={<PrivateRoute allowedRoles={allRoles}><PlanEventsReport /></PrivateRoute>} />
        <Route path="/branch-events-report" element={<PrivateRoute allowedRoles={allRoles}><BranchEventsReport /></PrivateRoute>} />
        <Route path="/candidate-table-report" element={<PrivateRoute allowedRoles={allRoles}><CandidateTableReport /></PrivateRoute>} />
        <Route path="/add-openings" element={<PrivateRoute allowedRoles={allRoles}><AddOpenings /></PrivateRoute>} />
        <Route path='/view-openings' element={<PrivateRoute allowedRoles={allRoles}><ViewOpenings /></PrivateRoute>} />
        <Route path="/duplicate-check" element={<PrivateRoute allowedRoles={allRoles}><Duplicate /></PrivateRoute>} />
        <Route path="/itbrview" element={<PrivateRoute allowedRoles={allRoles}><ItbrView /></PrivateRoute>} />
        <Route path="/edit-revenue/:id" element={<PrivateRoute allowedRoles={allRoles}><EditRevenuePage /></PrivateRoute>} />
        <Route path='/invoice' element={<PrivateRoute allowedRoles={allRoles}><InvoicePage /></PrivateRoute>} />
        <Route path='/listview' element={<PrivateRoute allowedRoles={allRoles}><InvoiceView /></PrivateRoute>} />
        <Route path='daily-telly-report' element={<PrivateRoute allowedRoles={allRoles}><DailyTellyReport /></PrivateRoute>} />
        <Route path='daily-telly-report/details/:id' element={<PrivateRoute allowedRoles={allRoles}><DailyTellyReportDetails /></PrivateRoute>} />
        <Route path='day-plans' element={<PrivateRoute allowedRoles={allRoles}><CalendarView /></PrivateRoute>} />
        <Route path='calendar-details' element={<PrivateRoute allowedRoles={allRoles}><CalendarDetailsList /></PrivateRoute>} />
        <Route path="/f-dtr-report" element={<PrivateRoute allowedRoles={allRoles}><FDTR /></PrivateRoute>} />
        <Route path="/t-dtr-report" element={<PrivateRoute allowedRoles={allRoles}><TDTR /></PrivateRoute>} />
        <Route path='databank' element={<PrivateRoute allowedRoles={allRoles}><DataBank /></PrivateRoute>} />
        <Route path='databank/details/:remark/:fromDate/:toDate' element={<PrivateRoute allowedRoles={allRoles}><DataBank /></PrivateRoute>} />
        <Route path='/profile-in' element={<PrivateRoute allowedRoles={allRoles}><ProfileIn /></PrivateRoute>} />
        <Route path='/profile-out' element={<PrivateRoute allowedRoles={allRoles}><ProfileOut /></PrivateRoute>} />
        <Route path='/if/ps-report' element={<PrivateRoute allowedRoles={allRoles}><IFPSReport /></PrivateRoute>} />
        <Route path='/clientwise-report' element={<PrivateRoute allowedRoles={allRoles}><ClientwiseReport /></PrivateRoute>} />
        <Route path='/revenue-status/:candidateId' element={<PrivateRoute allowedRoles={allRoles}><RevenueStatusPage /></PrivateRoute>} />
        <Route
          path="/job-rows-report"
          element={<PrivateRoute allowedRoles={allRoles}><JobRowsReport /></PrivateRoute>}
        />
      </Route>

      {/* View Candidate in new tab - Outside Layout (no sidebar) */}
      <Route 
        path='/view-candidate/:candidateId' 
        element={
          <PrivateRoute allowedRoles={allRoles}>
            <ViewCandidate />
          </PrivateRoute>
        } 
      />

     

      {/* Catch all */}
      <Route
        path="*"
        element={isAuthenticated ? <Navigate to="/home" /> : <Navigate to="/" />}
      />
    </Routes>
  );
}

export default App;
