import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '~/lib/supabase';

export default function SupabaseExample() {
  useEffect(() => {
    document.title = 'Supabase Example';
  }, []);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignUp = async () => {
    const { data, error } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'password123',
    });
    
    if (error) {
      console.error('Error signing up:', error.message);
    } else {
      console.log('Signed up successfully:', data);
    }
  };

  const handleSignIn = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password123',
    });
    
    if (error) {
      console.error('Error signing in:', error.message);
    } else {
      console.log('Signed in successfully:', data);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error signing out:', error.message);
    } else {
      console.log('Signed out successfully');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Supabase Integration Example
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Authentication Status
          </h2>
          
          {user ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <p className="text-green-800 font-medium">
                  ✓ Authenticated
                </p>
                <p className="text-sm text-green-600 mt-2">
                  Email: {user.email}
                </p>
                <p className="text-sm text-green-600">
                  User ID: {user.id}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded p-4">
                <p className="text-gray-800 font-medium">
                  Not authenticated
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleSignIn}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={handleSignUp}
                  className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  Sign Up
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Quick Start Guide
          </h2>
          
          <div className="space-y-4 text-gray-700">
            <div>
              <h3 className="font-semibold text-lg mb-2">1. Set up your environment variables</h3>
              <p className="text-sm">
                Edit your <code className="bg-gray-100 px-2 py-1 rounded">.env</code> file with your Supabase credentials:
              </p>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded mt-2 overflow-x-auto text-sm">
{`VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">2. Import the Supabase client</h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded mt-2 overflow-x-auto text-sm">
{`import { supabase } from '~/lib/supabase';`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">3. Use it in your components</h3>
              <p className="text-sm mb-2">
                Check <code className="bg-gray-100 px-2 py-1 rounded">SUPABASE_SETUP.md</code> for detailed examples.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

