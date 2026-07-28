import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import PlaceholderPage from "@/pages/PlaceholderPage";
import AreaChartsPage from "@/pages/charts/AreaChartsPage";
import BarChartsPage from "@/pages/charts/BarChartsPage";
import LineChartsPage from "@/pages/charts/LineChartsPage";
import PieChartsPage from "@/pages/charts/PieChartsPage";
import RadarChartsPage from "@/pages/charts/RadarChartsPage";
import RadialChartsPage from "@/pages/charts/RadialChartsPage";
import TooltipsChartsPage from "@/pages/charts/TooltipsChartsPage";

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
