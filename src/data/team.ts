import type { TeamMember } from "../types";

/**
 * Curated staff profiles for the landing page ("Meet the team").
 *
 * The public API has no bio field, so bios/specialties live here; avatars
 * are fetched from GET /api/public/team and matched by staff id/name.
 * `name` / `position` mirror the server seed (`server/src/seeds/seed.ts`) —
 * update both together when the roster changes.
 */
export const TEAM: TeamMember[] = [
    {
        id: 1,
        name: "Maria Santos",
        position: "Senior Stylist",
        bio: "Maria has spent over a decade behind the chair, specialising in precision cuts and colour transformations. She takes the time to understand your lifestyle so your look keeps working long after you leave the salon.",
        specialties: ["Haircuts", "Hair Styling", "Hair Coloring"],
        yearsExperience: 12,
    },
    {
        id: 2,
        name: "Ana Reyes",
        position: "Make-up Artist",
        bio: "Ana is our make-up specialist, known for flawless bridal looks and natural everyday glam. Her gentle, skin-first approach means you feel pampered from consultation to final touch-up.",
        specialties: ["Bridal Make-up", "Everyday Glam", "Facials"],
        yearsExperience: 8,
    },
];
