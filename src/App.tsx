import { useEffect, useState } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";

// Constants
import { ROLES } from "./constant/users";
import type { SessionUser } from "./types";
import { AUTH_CHANGED_EVENT, getCurrentUser } from "./lib/auth";

// Layout
import AdminLayout from "./components/layout/AdminLayout";
import { Splash } from "./components/layout/Splash";
import { ToastViewport } from "./components/ui/Toast";

// Route guards
import ProtectedRoutes from "./routes/ProtectedRoutes";

// Pages
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import ManagePage from "./pages/ManagePage";
import BookingPage from "./pages/BookingPage";
import AccountPage from "./pages/AccountPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import NotFoundPage from "./pages/NotFoundPage";

// Admin Pages (owner + staff)
import OwnerDashboard from "./pages/owner/ownerDashboard";
import SchedulePage from "./pages/owner/SchedulePage";
import ServicesPage from "./pages/owner/ServicesPage";
import StaffPage from "./pages/owner/StaffPage";
import TransactionsPage from "./pages/owner/TransactionsPage";
import ReportsPage from "./pages/owner/ReportsPage";
import StaffDashboard from "./pages/staff/staffDashboard";
import StaffTransactionsPage from "./pages/staff/TransactionsPage";

function App() {
    const [user, setUser] = useState<SessionUser | null>(null);
    const [ready, setReady] = useState(false);

    // Resolve the current session once on mount.
    useEffect(() => {
        void getCurrentUser().then((u) => {
            setUser(u);
            setReady(true);
        });
    }, []);

    // Re-fetch the session after credentials change (e.g. a username update).
    useEffect(() => {
        const refresh = () => {
            void getCurrentUser().then((u) => {
                // Only a failed probe should keep the current state — the event
                // fires right after a successful update, so null means a
                // transient failure, not a signed-out session.
                if (u) setUser(u);
            });
        };
        window.addEventListener(AUTH_CHANGED_EVENT, refresh);
        return () => window.removeEventListener(AUTH_CHANGED_EVENT, refresh);
    }, []);

    return (
        <Router>
            <ToastViewport />
            {!ready ? (
                <Splash />
            ) : (
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/book" element={<BookingPage />} />
                    <Route path="/manage" element={<ManagePage />} />
                    <Route
                        path="/login"
                        element={
                            user ? (
                                <Navigate
                                    to={
                                        user.role === "owner"
                                            ? "/owner/appointments"
                                            : "/staff/appointments"
                                    }
                                    replace
                                />
                            ) : (
                                <LoginPage onLoggedIn={setUser} />
                            )
                        }
                    />
                    {/* Target of ProtectedRoutes when a role lacks access. */}
                    <Route path="/unauthorized" element={<UnauthorizedPage />} />

                    {/* Master Layout */}
                    <Route
                        element={
                            <AdminLayout user={user} onSignedOut={() => setUser(null)} />
                        }
                    >
                        {/* Owner Routes */}
                        <Route
                            element={
                                <ProtectedRoutes user={user} allowedRoles={[ROLES.OWNER]} />
                            }
                        >
                            <Route
                                path="/owner"
                                element={<Navigate to="/owner/appointments" replace />}
                            />
                            <Route path="/owner/appointments" element={<OwnerDashboard />} />
                            <Route
                                path="/owner/schedule"
                                element={<SchedulePage scope="owner" />}
                            />
                            <Route path="/owner/staff" element={<StaffPage />} />
                            <Route
                                path="/owner/services"
                                element={<ServicesPage />}
                            />
                            <Route
                                path="/owner/transactions"
                                element={<TransactionsPage />}
                            />
                            <Route
                                path="/owner/reports"
                                element={<ReportsPage />}
                            />
                        </Route>

                        {/* Staff Routes */}
                        <Route
                            element={
                                <ProtectedRoutes user={user} allowedRoles={[ROLES.STAFF]} />
                            }
                        >
                            <Route
                                path="/staff"
                                element={<Navigate to="/staff/appointments" replace />}
                            />
                            <Route path="/staff/appointments" element={<StaffDashboard />} />
                            <Route
                                path="/staff/transactions"
                                element={<StaffTransactionsPage />}
                            />
                            {/* The staff schedule merged into My Appointments. */}
                            <Route
                                path="/staff/schedule"
                                element={<Navigate to="/staff/appointments" replace />}
                            />
                        </Route>

                        {/* Shared Routes (owner + staff) */}
                        <Route
                            element={
                                <ProtectedRoutes
                                    user={user}
                                    allowedRoles={[ROLES.OWNER, ROLES.STAFF]}
                                />
                            }
                        >
                            <Route path="/account" element={<AccountPage />} />
                        </Route>
                    </Route>

                    {/* Catch-all: unknown URLs render the 404 page instead of nothing. */}
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            )}
        </Router>
    );
}

export default App;
