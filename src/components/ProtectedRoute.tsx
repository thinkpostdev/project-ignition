import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'owner' | 'influencer';
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth/login');
      return;
    }

    if (user && requiredRole) {
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()
        .then(async ({ data, error }) => {
          if (error || !data) {
            navigate('/auth/login');
            return;
          }

          // Check approval status
          if (data.role === 'owner') {
            const { data: ownerProfile } = await supabase
              .from('owner_profiles')
              .select('is_approved')
              .eq('user_id', user.id)
              .single();

            if (ownerProfile && !ownerProfile.is_approved) {
              navigate('/pending-approval');
              return;
            }
          } else if (data.role === 'influencer') {
            const { data: influencerProfile } = await supabase
              .from('influencer_profiles')
              .select('is_approved')
              .eq('user_id', user.id)
              .single();

            if (influencerProfile && !influencerProfile.is_approved) {
              navigate('/pending-approval');
              return;
            }
          }

          // Check if role matches required role
          if (data.role !== requiredRole) {
            // Redirect to correct dashboard based on role
            if (data.role === 'owner') {
              navigate('/dashboard/owner');
            } else if (data.role === 'influencer') {
              navigate('/dashboard/influencer');
            }
          }
        });
    }
  }, [user, loading, requiredRole, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};
