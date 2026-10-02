export interface Service {
    id: number;
    name: string;
    description: string | null;
    price: number;
    durationMinutes: number;
}

/** One weekly working block from `/public/staff` (`HH:mm`). */
export interface StaffScheduleSlot {
    weekday: number; // 0 = Sunday .. 6 = Saturday
    startTime: string;
    endTime: string;
}

export interface StaffOption {
    staffId: number;
    staffName: string;
    position: string | null;
    schedule?: StaffScheduleSlot[];
}

export interface StaffSlots {
    staffId: number;
    staffName: string;
    slots: string[];
}

/** Per-staff open-date counts for one month (calendar markers). */
export interface MonthStaffAvailability {
    staffId: number;
    staffName: string;
    dates: Record<string, number>;
}

export interface MonthAvailabilityResponse {
    month: string;
    staff: MonthStaffAvailability[];
}

export interface AvailabilityResponse {
    date: string;
    serviceId: number;
    serviceName: string;
    durationMinutes: number;
    bufferMinutes: number;
    staff: StaffSlots[];
}

export interface AppointmentView {
    reference: string;
    status: string;
    startAt: string;
    endAt: string;
    serviceName: string;
    staffName: string;
    customerName: string;
    price: number;
    canCancel: boolean;
    canReschedule: boolean;
}

// --- Admin (owner + staff) ---

export type Role = "owner" | "staff";

export type AppointmentStatus =
    | "pending"
    | "confirmed"
    | "completed"
    | "cancelled"
    | "no_show";

export interface SessionUser {
    id: number;
    username: string;
    role: Role;
    /** Account summary — present on GET /auth/me, absent on login/credential-change responses. */
    email?: string | null;
    lastLoginAt?: string | null;
    createdAt?: string | null;
}

/** Owner staff list row (joined with its login account). */
export interface OwnerStaff {
    id: number;
    first_name: string;
    last_name: string;
    position: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    /** Resized avatar as an image data URL, or null. */
    profile_photo: string | null;
    is_active: number;
    username: string | null;
}

/** A weekly working block: weekday 0 = Sunday .. 6 = Saturday. */
export interface ScheduleBlock {
    weekday: number;
    startTime: string; // "HH:mm"
    endTime: string; // "HH:mm"
}

/** A stored weekly schedule row (times come back as "HH:mm:ss"). */
export interface StaffScheduleRow {
    id: number;
    staff_id: number;
    weekday: number;
    start_time: string;
    end_time: string;
    is_active: number;
}

/** Service ids assigned to a staff member. */
export interface StaffServiceAssignment {
    staffId: number;
    serviceIds: number[];
}

/** Upcoming appointments affected by deactivating a staff member. */
export interface DeactivationImpact {
    staffId: number;
    staffName: string;
    futureAppointments: number;
    appointments: Array<{
        id: number;
        reference: string;
        start_at: string;
        status: string;
    }>;
}

/** Owner service list row. */
export interface OwnerService {
    id: number;
    name: string;
    description: string | null;
    price: number;
    duration_minutes: number;
    is_active: number;
}

/** Appointment with joined details (owner + staff views). */
export interface AppointmentDetail {
    id: number;
    reference: string;
    status: AppointmentStatus;
    /** Payment status of the linked transaction (null before completion). */
    paymentStatus: PaymentStatus | null;
    source: "online" | "manual";
    startAt: string;
    endAt: string;
    price: number;
    notes: string | null;
    customer: {
        id: number;
        name: string;
        phone: string | null;
        email: string | null;
    };
    staff: { id: number; name: string };
    service: { id: number; name: string; durationMinutes: number };
    createdAt: string;
    updatedAt: string | null;
}

export interface ScheduleAppointment {
    id: number;
    reference: string;
    status: AppointmentStatus;
    source: "online" | "manual";
    startAt: string;
    endAt: string;
    startTime: string;
    endTime: string;
    customerName: string;
    serviceName: string;
    price: number;
    notes: string | null;
}

export interface ScheduleDay {
    date: string;
    weekday: number;
    isWorkingDay: boolean;
    windows: Array<{ startTime: string; endTime: string }>;
    exceptions: Array<{ type: string; startTime: string; endTime: string; reason: string | null }>;
    appointments: ScheduleAppointment[];
}

export interface ScheduleStaff {
    staffId: number;
    staffName: string;
    position: string | null;
    days: ScheduleDay[];
}

/** A row from GET /api/owner/schedule-exceptions (owner block management). */
export interface ScheduleException {
    id: number;
    staff_id: number | null;
    type: "leave" | "closure";
    start_at: string;
    end_at: string;
    reason: string | null;
    created_by: number | null;
}

export interface ScheduleView {
    view: "day" | "week" | "month";
    from: string;
    to: string;
    staff: ScheduleStaff[];
}

// --- Landing page ---

/**
 * Curated team profile shown on the landing page's "Meet the team" section.
 * Content lives in the client (`src/data/team.ts`); names/positions mirror the
 * server seed data — keep both in sync.
 */
export interface TeamMember {
    id: number;
    name: string;
    position: string;
    bio: string;
    specialties: string[];
    yearsExperience: number;
}

/** GET /api/public/team row — active staff with their avatar. */
export interface PublicTeamMember {
    id: number;
    name: string;
    position: string | null;
    /** Resized avatar data URL, or null. */
    profilePhoto: string | null;
}

// --- Transactions (Phase 8) ---

export type PaymentMethod = "cash" | "gcash" | "card" | "other";
export type PaymentStatus = "paid" | "unpaid" | "waived";

export interface TransactionDetail {
    id: number;
    reference: string;
    appointmentId: number;
    appointmentReference: string;
    customer: {
        id: number;
        name: string;
        phone: string | null;
        email: string | null;
    };
    staff: { id: number; name: string };
    service: { id: number; name: string };
    subtotal: number;
    total: number;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    notes: string | null;
    completedAt: string;
    createdAt: string;
    updatedAt: string | null;
}

export interface DashboardSummary {
    count: number;
    total: number;
}

/** One month of the yearly report. */
export interface YearlyMonth {
    month: number;
    bookings: number;
    revenue: number;
}

/** One service's booking frequency in the yearly report. */
export interface YearlyTopService {
    serviceId: number;
    name: string;
    bookings: number;
    revenue: number;
}

/** GET /api/owner/reports/yearly response payload. */
export interface YearlyReport {
    year: number;
    months: YearlyMonth[];
    topServices: YearlyTopService[];
    years: number[];
    totalRevenue: number;
    totalBookings: number;
    averageTicket: number;
}
