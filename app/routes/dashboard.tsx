import { useAuth } from "../lib/hooks/useAuth";
import { useDashboard } from "../lib/hooks/useDashboard";
import { MembershipGuard } from "../components/auth/MembershipGuard";
import { ErrorDisplay } from "../components/dashboard/ErrorDisplay";
import { OrganizationInfo } from "../components/dashboard/OrganizationInfo";
import { HotlineCreationForm } from "../components/dashboard/HotlineCreationForm";
import { HotlineList } from "../components/dashboard/HotlineList";
import { AvailablePhoneNumbers } from "../components/dashboard/AvailablePhoneNumbers";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { currentOrg, loading, error, phoneNumbers, hotlines, hotlineAudioFiles } = useDashboard();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your organization...</p>
        </div>
      </div>
    );
  }

  return (
    <MembershipGuard>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Dashboard</p>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {currentOrg?.name ?? "HotlineCo"}
            </h1>
            {user?.email && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Signed in as {user.email}
              </p>
            )}
          </div>
          <button
            onClick={() => void signOut()}
            className="self-start sm:self-auto px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            Sign out
          </button>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to HotlineCo! 🎉
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Your organization is ready to go
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Organization Details
          </h2>

            <ErrorDisplay error={error} />
          
          {currentOrg ? (
            <div className="space-y-4">
                <OrganizationInfo currentOrg={currentOrg} user={user} />
                
                <HotlineCreationForm 
                  phoneNumbers={phoneNumbers}
                  hotlines={hotlines}
                  currentOrg={currentOrg}
                />

              {/* Display Created Items */}
              {(phoneNumbers.length > 0 || hotlines.length > 0) && (
                <div className="mt-8 space-y-6">
                    <HotlineList 
                      hotlines={hotlines}
                      hotlineAudioFiles={hotlineAudioFiles}
                    />

                    <AvailablePhoneNumbers 
                      phoneNumbers={phoneNumbers}
                      hotlines={hotlines}
                    />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">
                No organization found. This shouldn't happen - please contact support.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
    </MembershipGuard>
  );
}
