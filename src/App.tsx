import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
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
import Console from "./pages/Console";
import PatientQueue from "./pages/PatientQueue";
import ClinicProfile from "./pages/ClinicProfile";
import QueueSettings from "./pages/QueueSettings";
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
            <Route path="/" element={<MarketingHome />} />
            <Route path="/app" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/doctors" element={<DoctorsIndex />} />
            <Route path="/doctors/:specialty" element={<DoctorsSpecialty />} />
            <Route path="/doctors/:specialty/:city" element={<DoctorsCity />} />
            <Route path="/doctors/:specialty/:city/:area" element={<DoctorsArea />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/contact" element={<Contact />} />
            <Route
              path="/console"
              element={
                <ProtectedRoute>
                  <Console />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clinic-profile"
              element={
                <ProtectedRoute>
                  <ClinicProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/queue-settings"
              element={
                <ProtectedRoute>
                  <QueueSettings />
                </ProtectedRoute>
              }
            />
            {/* Patient queue page - no auth required */}
            <Route path="/q/:token" element={<PatientQueue />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
