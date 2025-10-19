import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/hooks/useAuth';
import Home from './home';

export default function Landing() {
  const { user, loading, initialLoadComplete } = useAuth();

  console.log('Landing page:', {
    user: user?.id,
    loading,
    initialLoadComplete,
  });

  // Wait for initial load to complete before making routing decision
  if (!user && (loading || !initialLoadComplete)) {
    console.log('Landing: Still loading, showing home...');
    return <Home />;
  }

  if (user) {
    console.log('Landing: User detected, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // Show home page for non-logged-in users
  console.log('Landing: No user, showing home');
  return <Home />;
}
