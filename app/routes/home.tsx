import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/useAuth";
import { useOrg } from "../lib/useOrg";

export default function Home() {
  const { isAuthenticated, user, signOut, loading } = useAuth();
  const { currentOrg } = useOrg();

  useEffect(() => {
    document.title = "HotlineCo";
  }, []);

  return (
    <div>
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                HotlineCo
              </h1>
            </div>
            <div className="flex items-center gap-4">
              {loading ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    Dashboard
                  </Link>
                  {currentOrg && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {currentOrg.name}
                    </span>
                  )}
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {user?.email}
                  </span>
                  <button
                    onClick={() => signOut()}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/signin"
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/signup"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
