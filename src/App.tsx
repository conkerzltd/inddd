import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Console from "./pages/Console";
import PatientQueue from "./pages/PatientQueue";
import ClinicProfile from "./pages/ClinicProfile";
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
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
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
