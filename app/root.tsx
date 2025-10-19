import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./app.css";
import Landing from "./routes/landing";
import SupabaseExample from "./routes/supabase-example";
import SignIn from "./routes/signin";
import SignUp from "./routes/signup";
import Dashboard from "./routes/dashboard";
import Membership from "./routes/membership";
import { ProtectedRoute } from "./components/ProtectedRoute";

export default function App() {

  return (
    <div className="scanlines">
      <div className="scanlines__content">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/supabase-example" element={<SupabaseExample />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route
              path="/membership"
              element={
                <ProtectedRoute>
                  <Membership />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </div>
    </div>
  );
}
