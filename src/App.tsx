import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/config';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import OwnerDashboard from './pages/dashboard/OwnerDashboard';
import InfluencerDashboard from './pages/dashboard/InfluencerDashboard';
import CreateCampaign from './pages/dashboard/owner/CreateCampaign';
import CampaignDetail from './pages/dashboard/owner/CampaignDetail';
import OwnerOnboarding from './pages/onboarding/OwnerOnboarding';
import InfluencerOnboarding from './pages/onboarding/InfluencerOnboarding';
import OwnerProfile from './pages/settings/OwnerProfile';
import InfluencerProfile from './pages/settings/InfluencerProfile';
import PendingApproval from './pages/PendingApproval';
import NotFound from './pages/NotFound';
import AdminDashboard from './pages/admin/AdminDashboard';
import InfluencersApproval from './pages/admin/InfluencersApproval';
import CampaignsManagement from './pages/admin/CampaignsManagement';
import AdminCampaignDetail from './pages/admin/AdminCampaignDetail';
import DeveloperTracking from './pages/admin/DeveloperTracking';
import FinancialManagement from './pages/admin/FinancialManagement';
import OwnersManagement from './pages/admin/OwnersManagement';

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
            <Route path="/pending-approval" element={<ProtectedRoute><PendingApproval /></ProtectedRoute>} />
            <Route path="/onboarding/owner" element={<ProtectedRoute><OwnerOnboarding /></ProtectedRoute>} />
            <Route path="/onboarding/influencer" element={<ProtectedRoute><InfluencerOnboarding /></ProtectedRoute>} />
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
            <Route 
              path="/settings/owner" 
              element={
                <ProtectedRoute requiredRole="owner">
                  <OwnerProfile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings/influencer" 
              element={
                <ProtectedRoute requiredRole="influencer">
                  <InfluencerProfile />
                </ProtectedRoute>
              } 
            />
            {/* Admin Routes */}
            <Route 
              path="/admin" 
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/influencers" 
              element={
                <AdminRoute>
                  <InfluencersApproval />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/campaigns" 
              element={
                <AdminRoute>
                  <CampaignsManagement />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/campaigns/:id" 
              element={
                <AdminRoute>
                  <AdminCampaignDetail />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/developer-tracking" 
              element={
                <AdminRoute>
                  <DeveloperTracking />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/financial" 
              element={
                <AdminRoute>
                  <FinancialManagement />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/owners" 
              element={
                <AdminRoute>
                  <OwnersManagement />
                </AdminRoute>
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
