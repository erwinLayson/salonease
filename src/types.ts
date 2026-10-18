export type ServiceCategory =
    | "hair"
    | "makeup"
    | "nails"
    | "skin"
    | "bridal"
    | "event"
    | "package"
    | "other";

export interface Service {
    id: number;
    name: string;
    description: string | null;
    category?: ServiceCategory;
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

/** Day-level availability for one staff member. */
export type SlotAvailabilityStatus = "available" | "busy" | "unavailable";

export interface StaffSlots {
    staffId: number;
    staffName: string;
    slots: string[];
    status: SlotAvailabilityStatus;
    reason: string | null;
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

/** Eligible staff for a service (owner walk-in flow), with day status. */
export interface StaffForService {
    staffId: number;
    staffName: string;
    position: string | null;
    schedule: StaffScheduleSlot[];
    status: SlotAvailabilityStatus;
    reason: string | null;
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
    category: ServiceCategory;
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

// --- Leave requests (staff request, owner decides) ---

export type LeaveRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

/** GET /staff/leave-requests and GET /owner/leave-requests row. */
export interface LeaveRequest {
    id: number;
    staffId: number;
    staffName: string;
    /** `YYYY-MM-DD`, inclusive. */
    startDate: string;
    /** `YYYY-MM-DD`, inclusive. */
    endDate: string;
    /** Inclusive day count. */
    days: number;
    reason: string | null;
    status: LeaveRequestStatus;
    decisionNote: string | null;
    decidedAt: string | null;
    requestedAt: string;
}

/**
 * GET /staff/leave-requests/coverage — whose leave (pending or approved)
 * overlaps the queried range. Names, dates and status only: never reasons.
 */
export interface LeaveCoverage {
    id: number;
    staffId: number;
    staffName: string;
    startDate: string;
    endDate: string;
    status: LeaveRequestStatus;
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

// --- Walk-in queue ---

export type QueueStatus =
    | "waiting"
    | "called"
    | "in_service"
    | "completed"
    | "cancelled"
    | "no_show";

export interface QueueTicket {
    id: number;
    queueDate: string;
    ticketNumber: number;
    customerName: string;
    customerPhone: string | null;
    service: { id: number; name: string; durationMinutes: number };
    preferredStaff: { id: number; name: string } | null;
    assignedStaff: { id: number; name: string } | null;
    status: QueueStatus;
    checkedInAt: string;
    calledAt: string | null;
    startedAt: string | null;
    completedAt: string | null;
    estimatedWaitMinutes: number | null;
    appointmentId: number | null;
    notes: string | null;
}

// --- In-app notifications ---

export type InAppNotificationType =
    | "low_stock"
    | "event_assigned"
    | "event_changed"
    | "commission_ready"
    | "system";

export interface InAppNotification {
    id: number;
    type: InAppNotificationType;
    severity: "info" | "warning" | "critical";
    title: string;
    body: string;
    link: string | null;
    readAt: string | null;
    createdAt: string;
}

export interface NotificationInbox {
    items: InAppNotification[];
    unread: number;
}

// --- Events ---

export type EventStatus =
    | "inquiry"
    | "confirmed"
    | "in_progress"
    | "completed"
    | "cancelled";

export type EventType =
    | "wedding"
    | "debut"
    | "corporate"
    | "photoshoot"
    | "other";

export type EventAssignmentRole =
    | "lead"
    | "assistant"
    | "makeup"
    | "hair"
    | "coordinator";

export interface Venue {
    id: number;
    name: string;
    address: string;
    contactName: string | null;
    contactPhone: string | null;
    notes: string | null;
    isActive: boolean;
}

export interface EventAssignment {
    id: number;
    staffId: number;
    staffName: string;
    role: EventAssignmentRole;
    callTime: string;
    releaseTime: string;
    travelRequired: boolean;
    status: string;
    commissionSharePercent: number | null;
    notes: string | null;
    conflict: string | null;
}

export interface EventTravelSegment {
    id: number;
    staffId: number | null;
    staffName: string | null;
    sequence: number;
    from: string;
    to: string;
    departAt: string;
    arriveAt: string;
    mode: string;
    notes: string | null;
}

export interface EventSupplyLine {
    supplyId: number;
    name: string;
    unit: string;
    plannedQuantity: number;
    issuedQuantity: number;
    returnedQuantity: number;
    consumedQuantity: number;
    status: string;
}

export interface EventDetail {
    id: number;
    reference: string;
    customer: {
        id: number;
        name: string;
        phone: string | null;
        email: string | null;
    };
    venue: { id: number; name: string } | null;
    title: string;
    eventType: EventType;
    eventDate: string;
    startAt: string;
    endAt: string;
    status: EventStatus;
    travelBufferMinutes: number;
    notes: string | null;
    total: number;
    services: Array<{
        serviceId: number;
        name: string;
        quantity: number;
        price: number;
    }>;
    assignments: EventAssignment[];
    itinerary: EventTravelSegment[];
    supplies: EventSupplyLine[];
}

export interface StaffEvent {
    eventId: number;
    reference: string;
    title: string;
    eventDate: string;
    startAt: string;
    endAt: string;
    venueName: string | null;
    role: EventAssignmentRole;
    callTime: string;
    releaseTime: string;
    travelRequired: boolean;
    status: string;
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

// --- Finance: commissions and daily close ---

export type CommissionRateType = "percent" | "fixed";
export type CommissionEntryStatus = "accrued" | "approved" | "paid" | "void";
export type PayoutStatus = "draft" | "approved" | "paid" | "void";

/** A commission rule row. `staffId`/`serviceId` null mean "all". */
export interface CommissionRule {
    id: number;
    staffId: number | null;
    serviceId: number | null;
    serviceCategory: ServiceCategory | null;
    rateType: CommissionRateType;
    rateValue: number;
    effectiveFrom: string;
    effectiveTo: string | null;
    priority: number;
    isActive: boolean;
    notes: string | null;
}

export interface CommissionEntry {
    id: number;
    sourceType: "appointment" | "event";
    sourceId: number;
    transactionId: number | null;
    transactionReference: string | null;
    eventId: number | null;
    eventReference: string | null;
    staffId: number;
    staffName: string;
    serviceId: number | null;
    serviceName: string | null;
    baseAmount: number;
    rateType: CommissionRateType;
    rateValue: number;
    commissionAmount: number;
    status: CommissionEntryStatus;
    payoutId: number | null;
    accruedAt: string;
}

export interface CommissionPayout {
    id: number;
    staffId: number;
    staffName: string;
    periodStart: string;
    periodEnd: string;
    totalAmount: number;
    status: PayoutStatus;
    paymentMethod: PaymentMethod | null;
    paidAt: string | null;
    notes: string | null;
}

export interface CommissionPreview {
    baseAmount: number;
    rule: {
        id: number;
        staffId: number | null;
        serviceId: number | null;
        serviceCategory: string | null;
        rateType: CommissionRateType;
        rateValue: number;
        effectiveFrom: string;
        effectiveTo: string | null;
        priority: number;
        isActive: boolean;
    } | null;
    commissionAmount: number;
}

export type ClosureStatus = "open" | "closed" | "reopened";

export interface DailyTotals {
    transactionCount: number;
    grossSales: number;
    paidTotal: number;
    unpaidTotal: number;
    waivedTotal: number;
    cashTotal: number;
    gcashTotal: number;
    cardTotal: number;
    otherTotal: number;
    commissionTotal: number;
    inventoryCostTotal: number;
}

/** GET /api/owner/closures/:date — the stored close plus today's live totals. */
export interface DaySummary extends DailyTotals {
    id: number;
    businessDate: string;
    discounts: number;
    netSales: number;
    cashCounted: number | null;
    cashVariance: number | null;
    status: ClosureStatus;
    notes: string | null;
    closedAt: string | null;
    reopenedAt: string | null;
    reopenReason: string | null;
    live: DailyTotals;
}

export type SalesGroupBy = "day" | "week" | "month" | "staff" | "service" | "method";

export interface SalesReportRow {
    bucket: string;
    staff_id: number | null;
    staff_name: string | null;
    service_id: number | null;
    service_name: string | null;
    payment_method: PaymentMethod | null;
    transactions: number;
    gross: number;
    paid: number;
    commission: number;
}

export interface WaitTimeMetrics {
    tickets: number;
    served: number;
    avgWaitMinutes: number;
    longestWaitMinutes: number;
}

export interface WaitTimeReport {
    from: string;
    to: string;
    overall: WaitTimeMetrics;
    days: Array<WaitTimeMetrics & { date: string }>;
    staff: Array<WaitTimeMetrics & { staffId: number | null; staffName: string }>;
}

export interface ReconciliationReport {
    from: string;
    to: string;
    missingTransactions: Array<{
        kind: "appointment" | "event";
        id: number;
        reference: string;
        occurredAt: string;
        customerName: string;
        staffName: string;
        serviceName: string | null;
        amount: number;
    }>;
    missingCommissions: Array<{
        id: number;
        reference: string;
        completedAt: string;
        staffName: string;
        subtotal: number;
        appointmentId: number | null;
        eventId: number | null;
    }>;
    commissionMismatches: Array<{
        id: number;
        reference: string;
        completedAt: string;
        storedTotal: number;
        ledgerTotal: number;
    }>;
    counts: {
        missingTransactions: number;
        missingCommissions: number;
        commissionMismatches: number;
    };
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
