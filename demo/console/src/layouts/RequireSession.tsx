import { Navigate, Outlet, useLocation } from "react-router-dom";
import { hasSession } from "../lib/session";

export function RequireSession() {
  const location = useLocation();
  if (!hasSession()) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }
  return <Outlet />;
}
