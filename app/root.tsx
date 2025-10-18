import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./app.css";
import Home from "./routes/home";
import SupabaseExample from "./routes/supabase-example";
import SignIn from "./routes/signin";
import SignUp from "./routes/signup";
import Dashboard from "./routes/dashboard";
import { ProtectedRoute } from "./components/ProtectedRoute";

export default function App() {
  return (
    <div className="scanlines">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/supabase-example" element={<SupabaseExample />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
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
  );
}
