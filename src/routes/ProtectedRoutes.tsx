import { Navigate, Outlet } from "react-router-dom";
import type { Role, SessionUser } from "../types";

/**
 * Guards nested routes by role:
 *   no session               → /login
 *   role not in allowedRoles → /unauthorized
 *   otherwise                → render the matched child routes
 */
export default function ProtectedRoutes(props: {
    user: SessionUser | null;
    allowedRoles: Role[];
}) {
    if (!props.user) {
        return <Navigate to="/login" replace />;
    }
    if (!props.allowedRoles.includes(props.user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }
    return <Outlet />;
}
