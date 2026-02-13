import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import SuperAdminRoute from "@/components/SuperAdminRoute";
import Index from "./pages/Index";
import MarketingHome from "./pages/MarketingHome";
import DoctorsIndex from "./pages/Directory/DoctorsIndex";
import DoctorsSpecialty from "./pages/Directory/DoctorsSpecialty";
import DoctorsCity from "./pages/Directory/DoctorsCity";
import DoctorsArea from "./pages/Directory/DoctorsArea";
import Privacy from "./pages/Legal/Privacy";
import Terms from "./pages/Legal/Terms";
import Contact from "./pages/Legal/Contact";
import Login from "./pages/Login";
import ClinicOnboarding from "./pages/ClinicOnboarding";
import Console from "./pages/Console";
import PatientQueue from "./pages/PatientQueue";
import ClinicProfile from "./pages/ClinicProfile";
import QueueSettings from "./pages/QueueSettings";
import OwnerLogin from "./pages/OwnerPortal/OwnerLogin";
import OwnerDashboard from "./pages/OwnerPortal/OwnerDashboard";
import MarketerManagement from "./pages/OwnerPortal/MarketerManagement";
import MarketerProfile from "./pages/OwnerPortal/MarketerProfile";
import ClinicApprovals from "./pages/OwnerPortal/ClinicApprovals";
import OwnerAnalytics from "./pages/OwnerPortal/OwnerAnalytics";
import UserManagement from "./pages/OwnerPortal/UserManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route index element={<MarketingHome />} />
            <Route path="app" element={<Index />} />
            <Route path="login" element={<Login />} />
            <Route
              path="onboarding"
              element={
                <ProtectedRoute skipOnboardingCheck skipProfileCheck>
                  <ClinicOnboarding />
                </ProtectedRoute>
              }
            />
            <Route path="doctors" element={<DoctorsIndex />} />
            <Route path="doctors/:specialty" element={<DoctorsSpecialty />} />
            <Route path="doctors/:specialty/:city" element={<DoctorsCity />} />
            <Route path="doctors/:specialty/:city/:area" element={<DoctorsArea />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="terms" element={<Terms />} />
            <Route path="contact" element={<Contact />} />
            <Route
              path="console"
              element={
                <ProtectedRoute>
                  <Console />
                </ProtectedRoute>
              }
            />
            <Route
              path="clinic-profile"
              element={
                <ProtectedRoute skipProfileCheck>
                  <ClinicProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="queue-settings"
              element={
                <ProtectedRoute>
                  <QueueSettings />
                </ProtectedRoute>
              }
            />
            <Route path="q/:token" element={<PatientQueue />} />
            <Route path="ad/login" element={<OwnerLogin />} />
            <Route
              path="ad"
              element={
                <SuperAdminRoute>
                  <OwnerDashboard />
                </SuperAdminRoute>
              }
            />
            <Route
              path="ad/marketers"
              element={
                <SuperAdminRoute>
                  <MarketerManagement />
                </SuperAdminRoute>
              }
            />
            <Route
              path="ad/marketers/:id"
              element={
                <SuperAdminRoute>
                  <MarketerProfile />
                </SuperAdminRoute>
              }
            />
            <Route
              path="ad/approvals"
              element={
                <SuperAdminRoute>
                  <ClinicApprovals />
                </SuperAdminRoute>
              }
            />
            <Route
              path="ad/analytics"
              element={
                <SuperAdminRoute>
                  <OwnerAnalytics />
                </SuperAdminRoute>
              }
            />
            <Route
              path="ad/users"
              element={
                <SuperAdminRoute>
                  <UserManagement />
                </SuperAdminRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
