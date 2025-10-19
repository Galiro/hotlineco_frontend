import { useAuth } from '../../lib/hooks/useAuth';
import { useUserStore } from '../../lib/stores/userStore';

interface MembershipGuardProps {
  children: React.ReactNode;
}

export function MembershipGuard({ children }: MembershipGuardProps) {
  // Selective store subscription - only subscribe to fields we need
  const user = useUserStore((state) => state.user);
  const hasActiveSubscription = useUserStore((state) => state.hasActiveSubscription);
  const loading = useUserStore((state) => state.loading);
  const subscriptionLoading = useUserStore((state) => state.subscriptionLoading);
  const initialLoadComplete = useUserStore((state) => state.initialLoadComplete);

  const isLoading = loading || subscriptionLoading;

  console.log('MembershipGuard render:', { 
    user: user?.id, 
    hasActiveSubscription, 
    isLoading, 
    initialLoadComplete 
  });

  // If user is not authenticated, let the auth system handle it
  if (!user) {
    return <>{children}</>;
  }

  // Show loading while checking membership or initial load not complete
  if (isLoading || !initialLoadComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Checking membership...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated and has active subscription, show children
  if (hasActiveSubscription) {
    console.log('User has active subscription, showing protected content');
    return <>{children}</>;
  }

  // If user is authenticated but no active subscription, redirect to membership
  console.log('User has no active subscription, redirecting to membership');
  window.location.href = '/membership';
  return null;
}
