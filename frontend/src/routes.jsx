// src/routes.jsx
import React from 'react'; // Import React for JSX
import { Route } from 'react-router-dom';
import Layout from './layouts/Layout'; // Adjusted path if Layout is in 'layouts'
import HomePage from './pages/Home'; // Renamed from Home to HomePage for clarity
import Source from './pages/master/Source';
import Industry from './pages/master/Industry';
import Remarks from './pages/master/Remarks';
import Department from './pages/master/Department';
import Designation from './pages/master/Designation';
import EmpReg from './pages/management/user/NewEmpReg';
import EmployeeDataTableBro from './pages/management/user/EmployeeDataTable';
import UpdateVendorBro from './pages/management/vendor/updatedvendor/UpdateVendor';
import Events from './pages/calendar/Events';
import AddOpenings from './pages/jobOpenings/AddOpenings';
import Duplicate from './pages/NewDtr/components/NewDtr';
import Education from './pages/master/Education';
import Communication from './pages/master/Communication';
import Position from './pages/master/Position';
import Branch from './pages/master/Branch';
import Workmode from './pages/master/Workmode';
import Gender from './pages/master/Gender';
import MaterialStatus from './pages/master/MaritalStatus';
import BloodGroup from './pages/master/BloodGroup';
import Experience from './pages/master/Experience';
import ItbrView from './pages/invoice/ItbrView';
import InvoicePage from './pages/invoice/InvoicePage';
import InvoiceView from './pages/invoice/InvoiceView';
import ViewOpenings from './pages/jobOpenings/ViewOpeningss';
import ViewCandidatePage from './pages/ViewCandidate/ViewCandidatePage';
import { ProfileInfoPage } from './pages/Profile/ProfileInfoPage'; // Correct named import


// Define a function that returns the routes so we can pass props or context if needed
// For simplicity, we directly return the Route tree here.
const AppRoutes = (
  <Route path="/" element={<Layout />}>
    <Route index element={<HomePage />} /> {/* Changed to HomePage */}
    <Route path="source" element={<Source />} />
    <Route path="industry" element={<Industry />} />
    <Route path="remarks" element={<Remarks />} />
    <Route path="department" element={<Department />} />
    <Route path="designation" element={<Designation />} />
    <Route path="education" element={<Education />} />
    <Route path="experience" element={<Experience />} />
    <Route path="communication" element={<Communication />} />
    <Route path="position" element={<Position />} />
    <Route path="branch" element={<Branch />} />
    <Route path="workmode" element={<Workmode />} />
    <Route path="gender" element={<Gender />} />
    <Route path="materialstatus" element={<MaterialStatus />} />
    <Route path="bloodgroup" element={<BloodGroup />} />
    <Route path="add-user" element={<EmpReg />} />
    <Route path="view-users" element={<EmployeeDataTableBro />} />
    <Route path="add-vendor" element={<UpdateVendorBro />} />
    <Route path='events' element={<Events />} />
    <Route path='add-openings' element={<AddOpenings />} />
    <Route path='view-openings' element={<ViewOpenings />}/>
    <Route path='duplicate-check' element={<Duplicate />} />
    <Route path='itbrview' element={<ItbrView />} />
    <Route path='invoice' element={<InvoicePage />} />
    <Route path='listview' element={<InvoiceView />} />
    <Route path='view-candidate' element={<ViewCandidatePage />} />
    <Route path="my-profile" element={<ProfileInfoPage />} /> {/* Ensure this matches data.js */}
  </Route>
);

export default AppRoutes;