import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";
import { ThemeProvider } from "@/components/theme-provider";
import { DensityProvider } from "@/components/density-provider";
import { BrandingProvider } from "@/context/BrandingContext";
import { AuthProvider } from "@/context/AuthContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system">
        <DensityProvider defaultDensity="dense">
          <BrandingProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrandingProvider>
        </DensityProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
