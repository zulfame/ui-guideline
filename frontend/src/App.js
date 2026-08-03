import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import LoginPage from "@/pages/LoginPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
import AccountPage from "@/pages/AccountPage";
import SettingsPage from "@/pages/SettingsPage";
import DashboardPage from "@/pages/DashboardPage";
import PlaceholderPage from "@/pages/PlaceholderPage";
import OfficesPage from "@/pages/app/OfficesPage";
import RolesPage from "@/pages/app/RolesPage";
import UsersPage from "@/pages/app/UsersPage";
import UserFormPage from "@/pages/app/UserFormPage";
import OfficeFormPage from "@/pages/app/OfficeFormPage";
import RoleFormPage from "@/pages/app/RoleFormPage";
import AuditLogPage from "@/pages/app/AuditLogPage";
import DatabasePage from "@/pages/app/DatabasePage";
import BroadcastPage from "@/pages/app/BroadcastPage";
import PushNotificationsPage from "@/pages/app/PushNotificationsPage";
import EmailTemplatesPage from "@/pages/app/EmailTemplatesPage";
import BrandingPage from "@/pages/app/BrandingPage";
import ClientsPage from "@/pages/app/ClientsPage";
import LoginSecurityPage from "@/pages/app/LoginSecurityPage";
import SessionsPage from "@/pages/app/SessionsPage";
import ComponentsPage from "@/pages/ComponentsPage";
import DesignTokensPage from "@/pages/DesignTokensPage";
import DevelopmentOverviewPage from "@/pages/development/DevelopmentOverviewPage";
import DevelopmentGuidelinePage from "@/pages/development/DevelopmentGuidelinePage";
import DataTableLayoutPage from "@/pages/layouts/DataTableLayoutPage";
import FormElementsPage from "@/pages/layouts/FormElementsPage";
import FormLayoutPage from "@/pages/layouts/FormLayoutPage";
import SidebarBlockPage from "@/pages/blocks/SidebarBlockPage";
import LoginBlockPage from "@/pages/blocks/LoginBlockPage";
import ForgotBlockPage from "@/pages/blocks/ForgotBlockPage";
import ProfileBlockPage from "@/pages/blocks/ProfileBlockPage";
import WizardBlockPage from "@/pages/blocks/WizardBlockPage";
import EmptyStatesBlockPage from "@/pages/blocks/EmptyStatesBlockPage";
import PermissionsBlockPage from "@/pages/blocks/PermissionsBlockPage";
import DataDisplayBlockPage from "@/pages/blocks/DataDisplayBlockPage";
import AreaChartsPage from "@/pages/charts/AreaChartsPage";
import BarChartsPage from "@/pages/charts/BarChartsPage";
import LineChartsPage from "@/pages/charts/LineChartsPage";
import PieChartsPage from "@/pages/charts/PieChartsPage";
import RadarChartsPage from "@/pages/charts/RadarChartsPage";
import RadialChartsPage from "@/pages/charts/RadialChartsPage";
import TooltipsChartsPage from "@/pages/charts/TooltipsChartsPage";

function App() {
  const FullscreenLoader = () => (
    <div className="flex h-svh items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
    </div>
  );

  const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, initializing, user } = useAuth();
    const location = useLocation();
    if (initializing) return <FullscreenLoader />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (user?.must_change_password && location.pathname !== "/change-password")
      return <Navigate to="/change-password" replace />;
    return children;
  };

  const PublicOnlyRoute = ({ children }) => {
    const { isAuthenticated, initializing } = useAuth();
    if (initializing) return <FullscreenLoader />;
    if (isAuthenticated) return <Navigate to="/" replace />;
    return children;
  };

  const ChangePasswordGuard = ({ children }) => {
    const { isAuthenticated, initializing } = useAuth();
    if (initializing) return <FullscreenLoader />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return children;
  };

  const AdminRoute = ({ children }) => {
    const { isAdmin } = useAuth();
    if (!isAdmin) return <Navigate to="/" replace />;
    return children;
  };

  return (
    <ErrorBoundary>
      <BrowserRouter>
      <Routes>
        {/* App shell + nested pages (auth required) */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/users/new" element={<AdminRoute><UserFormPage /></AdminRoute>} />
          <Route path="/users/:id/edit" element={<AdminRoute><UserFormPage /></AdminRoute>} />
          <Route path="/roles" element={<RolesPage />} />
          <Route path="/roles/new" element={<AdminRoute><RoleFormPage /></AdminRoute>} />
          <Route path="/roles/:id/edit" element={<AdminRoute><RoleFormPage /></AdminRoute>} />
          <Route path="/offices" element={<OfficesPage />} />
          <Route path="/offices/new" element={<AdminRoute><OfficeFormPage /></AdminRoute>} />
          <Route path="/offices/:id/edit" element={<AdminRoute><OfficeFormPage /></AdminRoute>} />
          <Route path="/clients" element={<AdminRoute><ClientsPage /></AdminRoute>} />
          <Route path="/branding" element={<AdminRoute><BrandingPage /></AdminRoute>} />
          <Route path="/broadcast" element={<AdminRoute><BroadcastPage /></AdminRoute>} />
          <Route path="/push-notifications" element={<AdminRoute><PushNotificationsPage /></AdminRoute>} />
          <Route path="/email-templates" element={<AdminRoute><EmailTemplatesPage /></AdminRoute>} />
          <Route path="/database" element={<AdminRoute><DatabasePage /></AdminRoute>} />
          <Route path="/login-security" element={<AdminRoute><LoginSecurityPage /></AdminRoute>} />
          <Route path="/sessions" element={<AdminRoute><SessionsPage /></AdminRoute>} />
          <Route path="/audit-log" element={<AuditLogPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/dev-guidelines" element={<DevelopmentOverviewPage />} />
          <Route
            path="/dev-guidelines/:groupId"
            element={<DevelopmentGuidelinePage />}
          />
          <Route
            path="/design-system/components"
            element={<ComponentsPage />}
          />
          <Route
            path="/design-system/tokens"
            element={<DesignTokensPage />}
          />
          <Route
            path="/design-system/components/base"
            element={<Navigate to="/design-system/components" replace />}
          />
          <Route
            path="/design-system/components/composite"
            element={<Navigate to="/design-system/components" replace />}
          />
          <Route
            path="/design-system/layouts/datatable"
            element={<DataTableLayoutPage />}
          />
          <Route
            path="/design-system/layouts/form-elements"
            element={<FormElementsPage />}
          />
          <Route
            path="/design-system/layouts/form-layout"
            element={<FormLayoutPage />}
          />
          <Route
            path="/design-system/blocks/sidebar"
            element={<SidebarBlockPage />}
          />
          <Route
            path="/design-system/blocks/login"
            element={<LoginBlockPage />}
          />
          <Route
            path="/design-system/blocks/forgot"
            element={<ForgotBlockPage />}
          />
          <Route
            path="/design-system/blocks/profile"
            element={<ProfileBlockPage />}
          />
          <Route
            path="/design-system/blocks/wizard"
            element={<WizardBlockPage />}
          />
          <Route
            path="/design-system/blocks/empty-states"
            element={<EmptyStatesBlockPage />}
          />
          <Route
            path="/design-system/blocks/permissions"
            element={<PermissionsBlockPage />}
          />
          <Route
            path="/design-system/blocks/data-display"
            element={<DataDisplayBlockPage />}
          />
          <Route
            path="/design-system/charts/area"
            element={<AreaChartsPage />}
          />
          <Route
            path="/design-system/charts/bar"
            element={<BarChartsPage />}
          />
          <Route
            path="/design-system/charts/line"
            element={<LineChartsPage />}
          />
          <Route
            path="/design-system/charts/pie"
            element={<PieChartsPage />}
          />
          <Route
            path="/design-system/charts/radar"
            element={<RadarChartsPage />}
          />
          <Route
            path="/design-system/charts/radial"
            element={<RadialChartsPage />}
          />
          <Route
            path="/design-system/charts/tooltips"
            element={<TooltipsChartsPage />}
          />
        </Route>

        {/* Standalone auth pages */}
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/change-password"
          element={
            <ChangePasswordGuard>
              <ChangePasswordPage />
            </ChangePasswordGuard>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
