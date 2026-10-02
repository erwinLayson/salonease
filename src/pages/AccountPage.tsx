import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import { api, errorMessage } from "../lib/api";
import { getCurrentUser, AUTH_CHANGED_EVENT } from "../lib/auth";
import { toast } from "../lib/toast";
import { fileToAvatarDataUrl } from "../lib/image";
import { formatDateTime } from "../lib/utils";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { Field } from "../components/ui/Field";
import type { OwnerStaff, SessionUser } from "../types";

const MIN_PASSWORD_LENGTH = 8;

type FieldName = "username" | "currentPassword" | "newPassword" | "confirmPassword";

interface ProfileForm {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    address: string;
    profilePhoto: string;
}

type ProfileFieldName = "firstName" | "lastName" | "email";

const toProfileForm = (staff: OwnerStaff): ProfileForm => ({
    firstName: staff.first_name,
    lastName: staff.last_name,
    phone: staff.phone ?? "",
    email: staff.email ?? "",
    address: staff.address ?? "",
    profilePhoto: staff.profile_photo ?? "",
});

const formatDate = (value: string): string =>
    new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" });

/** Password strength estimate: a 1–4 segment meter with a label. */
interface PasswordStrength {
    level: 1 | 2 | 3 | 4;
    label: string;
    color: string;
}

const passwordStrength = (password: string): PasswordStrength | null => {
    if (!password) {
        return null;
    }

    let score = 0;
    if (password.length >= MIN_PASSWORD_LENGTH) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) {
        return { level: 1, label: "Weak", color: "bg-danger" };
    }
    if (score === 2) {
        return { level: 2, label: "Fair", color: "bg-warning" };
    }
    if (score === 3) {
        return { level: 3, label: "Good", color: "bg-info" };
    }
    return { level: 4, label: "Strong", color: "bg-success" };
};

/** A read-only account detail row. */
function OverviewRow(props: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                {props.label}
            </dt>
            <dd className="mt-1 text-sm text-charcoal">{props.value}</dd>
        </div>
    );
}

/**
 * Shared account page. Both roles can update the credentials they sign in
 * with (username + password); staff additionally manage their own personal
 * information — name, contact number, email, address and avatar.
 */
export default function AccountPage() {
    const [user, setUser] = useState<SessionUser | null>(null);
    const [username, setUsername] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Staff-only personal information.
    const [profile, setProfile] = useState<OwnerStaff | null>(null);
    const [profileForm, setProfileForm] = useState<ProfileForm | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [profileFieldErrors, setProfileFieldErrors] = useState<
        Partial<Record<ProfileFieldName, string>>
    >({});
    const [photoBusy, setPhotoBusy] = useState(false);

    const usernameRef = useRef<HTMLInputElement | null>(null);
    const currentPasswordRef = useRef<HTMLInputElement | null>(null);
    const newPasswordRef = useRef<HTMLInputElement | null>(null);
    const confirmPasswordRef = useRef<HTMLInputElement | null>(null);
    const firstNameRef = useRef<HTMLInputElement | null>(null);
    const lastNameRef = useRef<HTMLInputElement | null>(null);

    // Prefill the username once from the session.
    useEffect(() => {
        const load = async () => {
            const current = await getCurrentUser();
            if (current) {
                setUser(current);
                setUsername(current.username);
            }
        };
        void load();
    }, []);

    // Staff load their own profile for the personal information card.
    useEffect(() => {
        if (user?.role !== "staff") {
            return;
        }
        const load = async () => {
            setProfileLoading(true);
            try {
                const res = await api.get<{ data: OwnerStaff }>("/staff/profile");
                setProfile(res.data.data);
                setProfileForm(toProfileForm(res.data.data));
            } catch {
                // Failures surface as a toast via the axios error interceptor;
                // a staff account without a profile shows the empty state.
            } finally {
                setProfileLoading(false);
            }
        };
        void load();
    }, [user?.role]);

    const focusFirstError = (next: Partial<Record<FieldName, string>>) => {
        if (next.currentPassword) currentPasswordRef.current?.focus();
        else if (next.username) usernameRef.current?.focus();
        else if (next.newPassword) newPasswordRef.current?.focus();
        else if (next.confirmPassword) confirmPasswordRef.current?.focus();
    };

    /** Revert the credentials form to the last-saved state. */
    const discardCredentials = () => {
        if (!user) return;
        setUsername(user.username);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setErrors({});
        setFormError(null);
    };

    /** Revert the personal information form to the last-saved state. */
    const discardProfile = () => {
        if (!profile) return;
        setProfileForm(toProfileForm(profile));
        setProfileFieldErrors({});
        setProfileError(null);
    };

    const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError(null);

        if (!user) return;

        const trimmedUsername = username.trim();
        const usernameChanged = trimmedUsername !== user.username;

        if (!usernameChanged && newPassword === "") {
            setFormError("Enter a new username or password to update.");
            return;
        }

        const next: Partial<Record<FieldName, string>> = {};
        if (!currentPassword) {
            next.currentPassword = "Enter your current password";
        }
        if (usernameChanged && trimmedUsername.length < 3) {
            next.username = "Username must be at least 3 characters";
        }
        if (newPassword && newPassword.length < MIN_PASSWORD_LENGTH) {
            next.newPassword = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
        }
        if (newPassword && confirmPassword !== newPassword) {
            next.confirmPassword = "Passwords do not match";
        }

        setErrors(next);
        if (Object.keys(next).length > 0) {
            focusFirstError(next);
            return;
        }

        setSaving(true);
        try {
            const payload: { currentPassword: string; username?: string; password?: string } = {
                currentPassword,
            };
            if (usernameChanged) payload.username = trimmedUsername;
            if (newPassword) payload.password = newPassword;

            const res = await api.put<{ user: SessionUser }>("/auth/me", payload, {
                skipErrorToast: true,
            });

            // Keep the account summary (email, member-since) from the session.
            setUser({ ...user, ...res.data.user });
            setUsername(res.data.user.username);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setErrors({});
            toast.success("Login credentials updated.");
            // Let the layout re-fetch /auth/me so the sidebar shows the new username.
            window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
        } catch (error) {
            const status = axios.isAxiosError(error) ? error.response?.status : undefined;
            const message = errorMessage(error);

            if (status === 401) {
                setErrors({ currentPassword: message });
                currentPasswordRef.current?.focus();
            } else if (status === 409) {
                setErrors({ username: message });
                usernameRef.current?.focus();
            } else {
                setFormError(message);
            }
        } finally {
            setSaving(false);
        }
    };

    const updateProfileForm = (patch: Partial<ProfileForm>) =>
        setProfileForm((current) => (current ? { ...current, ...patch } : current));

    const onPhotoChange = async (file: File | undefined) => {
        if (!file) {
            return;
        }
        setPhotoBusy(true);
        try {
            const dataUrl = await fileToAvatarDataUrl(file);
            updateProfileForm({ profilePhoto: dataUrl });
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Could not process that image."
            );
        } finally {
            setPhotoBusy(false);
        }
    };

    const onSubmitProfile = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!profileForm) return;

        setProfileError(null);
        const next: Partial<Record<ProfileFieldName, string>> = {};
        if (!profileForm.firstName.trim()) {
            next.firstName = "First name is required";
        }
        if (!profileForm.lastName.trim()) {
            next.lastName = "Last name is required";
        }
        if (
            profileForm.email.trim() &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email.trim())
        ) {
            next.email = "Enter a valid email address";
        }

        setProfileFieldErrors(next);
        if (next.firstName) {
            firstNameRef.current?.focus();
            return;
        }
        if (next.lastName) {
            lastNameRef.current?.focus();
            return;
        }
        if (Object.keys(next).length > 0) {
            return;
        }

        setProfileSaving(true);
        try {
            const res = await api.put<{ data: OwnerStaff }>(
                "/staff/profile",
                {
                    firstName: profileForm.firstName.trim(),
                    lastName: profileForm.lastName.trim(),
                    phone: profileForm.phone.trim() || null,
                    email: profileForm.email.trim() || null,
                    address: profileForm.address.trim() || null,
                    profilePhoto: profileForm.profilePhoto || null,
                },
                { skipErrorToast: true }
            );
            setProfile(res.data.data);
            setProfileForm(toProfileForm(res.data.data));
            toast.success("Personal information updated.");
        } catch (error) {
            setProfileError(errorMessage(error));
        } finally {
            setProfileSaving(false);
        }
    };

    // --- Derived state -----------------------------------------------------

    const isStaff = user?.role === "staff";

    // Live identity for the header (staff preview their own edits).
    const displayName =
        isStaff && profileForm
            ? `${profileForm.firstName} ${profileForm.lastName}`.trim() ||
              user?.username ||
              "Account"
            : user?.username ?? "Account";

    const avatarPhoto = isStaff && profileForm?.profilePhoto
        ? profileForm.profilePhoto
        : null;

    const initials =
        isStaff && profileForm
            ? `${profileForm.firstName.charAt(0)}${profileForm.lastName.charAt(0)}`.toUpperCase() ||
              "?"
            : (user?.username ?? "?").slice(0, 2).toUpperCase();

    const memberSince = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString(undefined, {
              month: "short",
              year: "numeric",
          })
        : null;

    // A form is "dirty" once it holds an unsaved change.
    const usernameChanged = user !== null && username.trim() !== user.username;
    const credentialsDirty = usernameChanged || newPassword !== "";
    const strength = passwordStrength(newPassword);

    const profileDirty =
        profile !== null &&
        profileForm !== null &&
        (profileForm.firstName !== profile.first_name ||
            profileForm.lastName !== profile.last_name ||
            profileForm.phone !== (profile.phone ?? "") ||
            profileForm.email !== (profile.email ?? "") ||
            profileForm.address !== (profile.address ?? "") ||
            profileForm.profilePhoto !== (profile.profile_photo ?? ""));

    const dirtyHint = "Make a change to enable saving";

    return (
        <div className="grid gap-6">
            <header>
                <div className="flex flex-wrap items-center gap-4">
                    <span className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-light text-2xl font-semibold text-primary-dark ring-2 ring-border">
                        {avatarPhoto ? (
                            <img
                                src={avatarPhoto}
                                alt="Your profile photo"
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            initials
                        )}
                    </span>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-semibold tracking-tight">
                                {displayName}
                            </h1>
                            <span className="rounded-full bg-primary-light/40 px-2.5 py-0.5 text-xs font-semibold capitalize text-primary-dark">
                                {user?.role ?? "…"}
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-muted">
                            @{user?.username ?? "…"}
                            {isStaff && profile?.position
                                ? ` · ${profile.position}`
                                : ""}
                            {memberSince ? ` · member since ${memberSince}` : ""}
                        </p>
                    </div>
                </div>
                <p className="mt-3 text-sm text-muted">
                    {isStaff
                        ? "Manage your personal information and the credentials you sign in with."
                        : "Update the username and password you sign in with. Your current password is required for any change."}
                </p>
            </header>

            <div className="grid items-start gap-6 xl:grid-cols-2">
                {isStaff ? (
                    <Card
                        title="Personal information"
                        className="max-w-xl"
                        actions={
                            profile ? (
                                <span
                                    title="Managed by the salon owner"
                                    className="rounded-full bg-charcoal/5 px-2.5 py-1 text-xs font-medium text-muted"
                                >
                                    {profile.position ?? "Staff"}
                                </span>
                            ) : undefined
                        }
                    >
                        {profileLoading ? (
                            <p className="text-sm text-muted">Loading…</p>
                        ) : !profile || !profileForm ? (
                            <p className="text-sm text-muted">
                                No staff profile is linked to your account. Ask the owner to
                                set one up.
                            </p>
                        ) : (
                            <form
                                onSubmit={(event) => void onSubmitProfile(event)}
                                noValidate
                                className="grid gap-4"
                            >
                                <ErrorBanner message={profileError} />

                                <div className="flex flex-wrap items-center gap-4">
                                    <label
                                        title="Change profile photo"
                                        className={`group relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-light text-lg font-semibold text-primary-dark ring-primary transition focus-within:ring-2 ${
                                            photoBusy
                                                ? "cursor-wait"
                                                : "cursor-pointer"
                                        }`}
                                    >
                                        {profileForm.profilePhoto ? (
                                            <img
                                                src={profileForm.profilePhoto}
                                                alt="Your profile photo"
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            `${profileForm.firstName.charAt(0)}${profileForm.lastName.charAt(0)}`.toUpperCase() ||
                                            "?"
                                        )}
                                        <span
                                            aria-hidden
                                            className="absolute inset-0 grid place-items-center bg-charcoal/50 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                                        >
                                            {photoBusy ? "Processing…" : "Change"}
                                        </span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="sr-only"
                                            disabled={photoBusy}
                                            aria-label="Change profile photo"
                                            onChange={(event) => {
                                                void onPhotoChange(event.target.files?.[0]);
                                                // Clear so picking the same file again re-triggers.
                                                event.target.value = "";
                                            }}
                                        />
                                    </label>
                                    <div className="flex flex-col items-start gap-2">
                                        <p className="text-xs text-muted">
                                            Click your photo to{" "}
                                            {profileForm.profilePhoto ? "change it" : "upload one"}. It is
                                            resized to a small avatar automatically.
                                        </p>
                                        {profileForm.profilePhoto && (
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={() =>
                                                    updateProfileForm({ profilePhoto: "" })
                                                }
                                            >
                                                Remove photo
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Field
                                        label="First name"
                                        value={profileForm.firstName}
                                        onChange={(value) => {
                                            updateProfileForm({ firstName: value });
                                            if (profileFieldErrors.firstName) {
                                                setProfileFieldErrors((prev) => ({
                                                    ...prev,
                                                    firstName: undefined,
                                                }));
                                            }
                                        }}
                                        setInputRef={(element) => {
                                            firstNameRef.current = element;
                                        }}
                                        error={profileFieldErrors.firstName ?? null}
                                    />
                                    <Field
                                        label="Last name"
                                        value={profileForm.lastName}
                                        onChange={(value) => {
                                            updateProfileForm({ lastName: value });
                                            if (profileFieldErrors.lastName) {
                                                setProfileFieldErrors((prev) => ({
                                                    ...prev,
                                                    lastName: undefined,
                                                }));
                                            }
                                        }}
                                        setInputRef={(element) => {
                                            lastNameRef.current = element;
                                        }}
                                        error={profileFieldErrors.lastName ?? null}
                                    />
                                </div>

                                <Field
                                    label="Contact number"
                                    type="tel"
                                    value={profileForm.phone}
                                    onChange={(value) => updateProfileForm({ phone: value })}
                                    placeholder="e.g. 0917 123 4567"
                                />
                                <Field
                                    label="Email"
                                    type="email"
                                    value={profileForm.email}
                                    onChange={(value) => {
                                        updateProfileForm({ email: value });
                                        if (profileFieldErrors.email) {
                                            setProfileFieldErrors((prev) => ({
                                                ...prev,
                                                email: undefined,
                                            }));
                                        }
                                    }}
                                    error={profileFieldErrors.email ?? null}
                                    placeholder="you@example.com"
                                />
                                <Field
                                    label="Address"
                                    value={profileForm.address}
                                    onChange={(value) => updateProfileForm({ address: value })}
                                    placeholder="House, street, city"
                                />

                                <div className="mt-1 flex flex-wrap items-center gap-3">
                                    <Button
                                        type="submit"
                                        loading={profileSaving}
                                        disabled={!profileDirty}
                                        title={profileDirty ? undefined : dirtyHint}
                                    >
                                        Save profile
                                    </Button>
                                    {profileDirty && (
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={discardProfile}
                                        >
                                            Discard
                                        </Button>
                                    )}
                                </div>
                            </form>
                        )}
                    </Card>
                ) : (
                    <Card title="Account overview" className="max-w-xl">
                        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                            <OverviewRow label="Role" value="Owner" />
                            <OverviewRow label="Username" value={user?.username ?? "—"} />
                            <OverviewRow label="Email" value={user?.email ?? "Not set"} />
                            <OverviewRow
                                label="Member since"
                                value={user?.createdAt ? formatDate(user.createdAt) : "—"}
                            />
                            <OverviewRow
                                label="Last sign in"
                                value={
                                    user?.lastLoginAt
                                        ? formatDateTime(user.lastLoginAt)
                                        : "Never"
                                }
                            />
                        </dl>
                        <p className="mt-5 border-t border-border pt-4 text-xs text-muted">
                            Your email, role and sign-in details are set up at the salon
                            level — contact the system administrator to change them.
                        </p>
                    </Card>
                )}

                <Card
                    title="Login credentials"
                    className="max-w-xl"
                    actions={
                        user?.lastLoginAt ? (
                            <span className="rounded-full bg-charcoal/5 px-2.5 py-1 text-xs font-medium text-muted">
                                Last sign in {formatDateTime(user.lastLoginAt)}
                            </span>
                        ) : undefined
                    }
                >
                    <ErrorBanner message={formError} />
                    <form onSubmit={(event) => void onSubmit(event)} noValidate className="grid gap-4">
                        <Field
                            label="Username"
                            value={username}
                            onChange={setUsername}
                            setInputRef={(element) => {
                                usernameRef.current = element;
                            }}
                            error={errors.username ?? null}
                            placeholder="The name you sign in with"
                        />
                        <Field
                            label="Current password"
                            type="password"
                            value={currentPassword}
                            onChange={setCurrentPassword}
                            setInputRef={(element) => {
                                currentPasswordRef.current = element;
                            }}
                            error={errors.currentPassword ?? null}
                            placeholder="Required to confirm it's you"
                        />
                        <div>
                            <Field
                                label="New password"
                                type="password"
                                value={newPassword}
                                onChange={(value) => {
                                    setNewPassword(value);
                                    if (errors.newPassword || errors.confirmPassword) {
                                        setErrors((prev) => ({
                                            ...prev,
                                            newPassword: undefined,
                                            confirmPassword: undefined,
                                        }));
                                    }
                                }}
                                setInputRef={(element) => {
                                    newPasswordRef.current = element;
                                }}
                                error={errors.newPassword ?? null}
                                placeholder="Leave blank to keep your current password"
                            />
                            <p className="mt-1.5 text-xs text-muted">
                                At least {MIN_PASSWORD_LENGTH} characters.
                            </p>
                            {strength && (
                                <div className="mt-2">
                                    <div className="flex gap-1" aria-hidden="true">
                                        {[1, 2, 3, 4].map((segment) => (
                                            <span
                                                key={segment}
                                                className={`h-1.5 flex-1 rounded-full transition-colors ${
                                                    segment <= strength.level
                                                        ? strength.color
                                                        : "bg-border"
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <p className="mt-1.5 text-xs text-muted" aria-live="polite">
                                        Password strength:{" "}
                                        <span className="font-medium text-charcoal">
                                            {strength.label}
                                        </span>
                                    </p>
                                </div>
                            )}
                        </div>
                        <Field
                            label="Confirm new password"
                            type="password"
                            value={confirmPassword}
                            onChange={(value) => {
                                setConfirmPassword(value);
                                if (errors.confirmPassword) {
                                    setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                                }
                            }}
                            setInputRef={(element) => {
                                confirmPasswordRef.current = element;
                            }}
                            error={errors.confirmPassword ?? null}
                            placeholder="Re-enter the new password"
                        />

                        <div className="mt-1 flex flex-wrap items-center gap-3">
                            <Button
                                type="submit"
                                loading={saving}
                                disabled={!user || !credentialsDirty}
                                title={credentialsDirty ? undefined : dirtyHint}
                            >
                                Save changes
                            </Button>
                            {credentialsDirty && (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={discardCredentials}
                                >
                                    Discard
                                </Button>
                            )}
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}
