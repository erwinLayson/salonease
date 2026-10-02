import type {
    AppointmentStatus,
    ScheduleAppointment,
    ScheduleView,
} from "../types";

/** An appointment flattened together with the staff member assigned to it. */
export interface DayAppointment extends ScheduleAppointment {
    staffName: string;
}

/** Statuses that count as scheduled: confirmed or completed. */
const SCHEDULE_STATUSES: AppointmentStatus[] = ["confirmed", "completed"];

/** True when an appointment is on the schedule (confirmed/completed). */
export const isScheduledStatus = (status: AppointmentStatus): boolean =>
    SCHEDULE_STATUSES.includes(status);

/**
 * Every scheduled (confirmed or completed) appointment on a date,
 * flattened across staff and sorted chronologically. Both the day key
 * and its `HH:mm` times come from the API in salon-local time, so
 * plain string comparison keeps slots on their own calendar date —
 * no `Date` conversion can shift a slot to a neighbouring day.
 */
export const getAppointmentsByDate = (
    view: ScheduleView | null,
    date: string
): DayAppointment[] => {
    if (!view) {
        return [];
    }
    const appointments: DayAppointment[] = [];
    for (const member of view.staff) {
        const day = member.days.find((entry) => entry.date === date);
        if (!day) {
            continue;
        }
        for (const appointment of day.appointments) {
            if (!isScheduledStatus(appointment.status)) {
                continue;
            }
            appointments.push({ ...appointment, staffName: member.staffName });
        }
    }
    return appointments.sort((a, b) => a.startTime.localeCompare(b.startTime));
};
