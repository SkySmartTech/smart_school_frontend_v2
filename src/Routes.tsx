import React, { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./components/Layout/MainLayout";
import PageLoader from "./components/PageLoader";
import ProtectedRoute from "./components/ProtectedRoute";
import UserAccessManagementSystem from "./views/UserAccessManagementSystem";
import ManagementStaff from "./views/Reports/ManagementStaffReport";
import ClassTeacherReport from "./views/Reports/ClassTeacherReport";
import AddClassTeacher from "./views/AddClassTeacher";
import HelpPage from "./views/HelpPage";
import ParentReportForTeacher from "./views/Reports/ParentReportForTeacher";
import ParentReportForPrincipal from "./views/Reports/ParentReportForPrincipal";
import AddStudent from "./views/AddStudent";
import MarksChecking from "./views/MarksChecking";

// Public pages
const LoginPage = React.lazy(() => import("./views/LoginPage/Login"));
const RegistrationPage = React.lazy(() => import("./views/RegistrationPage/Register"));

// Dashboard pages
const AddMarks = React.lazy(() => import("./views/Dashboard/AddMarks"));
const EditMarks = React.lazy(() => import("./views/EditMarks"));
const SystemManagementPage = React.lazy(() => import("./views/SystemMangementPage"));
const UserProfile = React.lazy(() => import("./views/UserProfile"));

// // Administration pages

const UserManagement = React.lazy(() => import("./views/UserManagement/UserManagement"));

const ParentReport = React.lazy(() => import("../src/views/Reports/ParentReport"));


function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegistrationPage />} />
      {/* Removed UnauthorizedPage - redirecting unknown routes to login */}

      {/* Protected routes */}
      <Route element={<MainLayout />}>


        <Route
          path="/userprofile"
          element={
            <ProtectedRoute permission="userProfile">
              <Suspense fallback={<PageLoader />}>
                <UserProfile />
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="/addmarks"
          element={
            <ProtectedRoute permission="addMarks">
              <Suspense fallback={<PageLoader />}>
                <AddMarks />
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="/addClassTeacher"
          element={
            <ProtectedRoute permission="addClassTeacher">
              <Suspense fallback={<PageLoader />}>
                <AddClassTeacher />
              </Suspense>
            </ProtectedRoute>
          }

        />
        <Route
          path="/addStudent"
          element={
            <ProtectedRoute permission="addStudent">
              <Suspense fallback={<PageLoader />}>
                <AddStudent />
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="/editMarks"
          element={
            <ProtectedRoute permission="editMarks">
              <Suspense fallback={<PageLoader />}>
                <EditMarks />
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="/userManagement"
          element={
            <ProtectedRoute permission="userManagement">
              <Suspense fallback={<PageLoader />}>
                <UserManagement />
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="/userAccessManagement"
          element={
            <ProtectedRoute permission="userAccessManagement">
              <Suspense fallback={<PageLoader />}>
                <UserAccessManagementSystem />
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="/managementStaffReport"
          element={
            <ProtectedRoute permission="managementStaffReport">
              <Suspense fallback={<PageLoader />}>
                <ManagementStaff />
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="/classTeacherReport"
          element={
            <ProtectedRoute permission="classTeacherReport">
              <Suspense fallback={<PageLoader />}>
                <ClassTeacherReport />
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="/parentReport"
          element={
            <ProtectedRoute permission="parentReport">
              <Suspense fallback={<PageLoader />}>
                <ParentReport />
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="/marksChecking"
          element={
            <ProtectedRoute permission="marksChecking">
              <Suspense fallback={<PageLoader />}>
                <MarksChecking />
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="/parentTeacherReport"
          element={
            <ProtectedRoute permission="parentTeacherReport">
              <Suspense fallback={<PageLoader />}>
                <ParentReportForTeacher />
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="/parentPrincipalReport"
          element={
            <ProtectedRoute permission="parentPrincipalReport">
              <Suspense fallback={<PageLoader />}>
                <ParentReportForPrincipal />
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="/systemManagement"
          element={
            <ProtectedRoute permission="systemManagement">
              <Suspense fallback={<PageLoader />}>
                <SystemManagementPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
         <Route
          path="/help"
          element={
            <ProtectedRoute permission="help">
              <Suspense fallback={<PageLoader />}>
                <HelpPage />
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="/userProfile"
          element={
            <ProtectedRoute permission="userProfile">
              <Suspense fallback={<PageLoader />}>
                <UserProfile />
              </Suspense>
            </ProtectedRoute>
          }
        />
      </Route>
      
      



      {/* Redirect root to dashboard if authenticated */}
      <Route
        path="/"
        element={
          <Navigate to="/dashboard" replace />
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRoutes;
