import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/config';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import OwnerDashboard from "./pages/dashboard/OwnerDashboard";
import InfluencerDashboard from "./pages/dashboard/InfluencerDashboard";
import CreateCampaign from "./pages/dashboard/owner/CreateCampaign";
import CampaignDetail from "./pages/dashboard/owner/CampaignDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
            <Route 
              path="/dashboard/owner" 
              element={
                <ProtectedRoute requiredRole="owner">
                  <OwnerDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/owner/campaigns/new" 
              element={
                <ProtectedRoute requiredRole="owner">
                  <CreateCampaign />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/owner/campaigns/:id" 
              element={
                <ProtectedRoute requiredRole="owner">
                  <CampaignDetail />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard/influencer" 
              element={
                <ProtectedRoute requiredRole="influencer">
                  <InfluencerDashboard />
                </ProtectedRoute>
              } 
            />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </I18nextProvider>
  </QueryClientProvider>
);

export default App;
