import { Outlet } from "react-router";
import LoginGate from "@/components/auth/LoginGate";
import { useAuth } from "@/lib/auth/authContext";

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <LoginGate />;
}
