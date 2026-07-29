import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";
import LoginPage from "@/pages/LoginPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import PlaceholderPage from "@/pages/PlaceholderPage";
import ComponentsPage from "@/pages/ComponentsPage";
import DesignTokensPage from "@/pages/DesignTokensPage";
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
  return (
    <ErrorBoundary>
      <BrowserRouter>
      <Routes>
        {/* App shell + nested pages */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/users" element={<PlaceholderPage />} />
          <Route path="/roles" element={<PlaceholderPage />} />
          <Route path="/offices" element={<PlaceholderPage />} />
          <Route path="/account" element={<PlaceholderPage />} />
          <Route path="/settings" element={<PlaceholderPage />} />
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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
