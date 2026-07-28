import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import PlaceholderPage from "@/pages/PlaceholderPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* App shell + nested pages */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route
            path="/design-system/components"
            element={<PlaceholderPage />}
          />
          <Route
            path="/design-system/blocks/sidebar"
            element={<PlaceholderPage />}
          />
          <Route
            path="/design-system/blocks/login"
            element={<PlaceholderPage />}
          />
          <Route
            path="/design-system/blocks/forgot"
            element={<PlaceholderPage />}
          />
          <Route
            path="/design-system/charts/area"
            element={<PlaceholderPage />}
          />
          <Route
            path="/design-system/charts/bar"
            element={<PlaceholderPage />}
          />
          <Route
            path="/design-system/charts/line"
            element={<PlaceholderPage />}
          />
          <Route
            path="/design-system/charts/pie"
            element={<PlaceholderPage />}
          />
          <Route
            path="/design-system/charts/radar"
            element={<PlaceholderPage />}
          />
          <Route
            path="/design-system/charts/radial"
            element={<PlaceholderPage />}
          />
          <Route
            path="/design-system/charts/tooltips"
            element={<PlaceholderPage />}
          />
        </Route>

        {/* Standalone auth page */}
        <Route path="/login" element={<LoginPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
