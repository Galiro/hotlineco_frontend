import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/hooks/useAuth";
import { useMembership } from "../lib/hooks/useMembership";
import { AuthGuard } from "../components/auth/AuthGuard";
import { MembershipPricingCard } from "../components/membership/MembershipPricingCard";
import { ErrorDisplay } from "../components/dashboard/ErrorDisplay";

export default function Membership() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { 
    pricingPlans, 
    loading, 
    error, 
    selectMembership,
    isSelecting
  } = useMembership();
  
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Handle URL parameters for success/cancelled states
  useEffect(() => {
    const cancelled = searchParams.get('cancelled');
    if (cancelled === 'true') {
      setStatusMessage('Payment was cancelled. You can try again anytime.');
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading membership plans...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Choose Your Plan
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Select the perfect plan for your hotline needs. Start with our free plan or upgrade anytime.
            </p>
          </div>

          <ErrorDisplay error={error} />

          {/* Status Message */}
          {statusMessage && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    {statusMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Billing Cycle Toggle */}
          <div className="flex justify-center mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    billingCycle === 'monthly'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    billingCycle === 'yearly'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Yearly
                </button>
              </div>
            </div>
          </div>

          <div className={`grid gap-8 mb-12 ${
            pricingPlans.length === 1 
              ? 'grid-cols-1 max-w-md mx-auto' 
              : pricingPlans.length === 2 
              ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto'
              : pricingPlans.length === 3
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }`}>
            {pricingPlans.map((plan) => (
              <MembershipPricingCard
                key={plan.id}
                plan={plan}
                onSelect={() => selectMembership(plan.id, billingCycle)}
                isSelecting={isSelecting}
                isPopular={plan.name === 'Starter'}
                billingCycle={billingCycle}
              />
            ))}
          </div>

          <div className="text-center">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Why Choose HotlineCo?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Easy Setup
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Get your hotline up and running in minutes with our simple setup process.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Reliable Service
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Built on Twilio's infrastructure for 99.9% uptime and crystal clear calls.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Powerful Features
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Audio uploads, TTS, analytics, and more to make your hotline professional.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
