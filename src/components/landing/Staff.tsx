import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { TEAM } from "../../data/team";
import type { PublicTeamMember, TeamMember } from "../../types";
import { Section, SectionHeading } from "./Section";

const initials = (name: string): string =>
    name
        .split(" ")
        .map((part) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase();

/**
 * One team profile card. The marquee renders it twice; the second
 * copy is `duplicate` — hidden from screen readers and keyboard
 * focus so the loop doesn't repeat the content for assistive tech.
 */
function TeamCard(props: {
    member: TeamMember;
    photo: string | null;
    duplicate?: boolean;
}) {
    const { member } = props;
    return (
        <article className="flex w-[85vw] shrink-0 flex-col rounded-xl border border-border bg-surface p-6 shadow-sm sm:w-96 motion-reduce:w-full motion-reduce:shrink sm:motion-reduce:w-1/2">
            <div className="flex items-center gap-4">
                {props.photo ? (
                    <img
                        src={props.photo}
                        alt={`Profile photo of ${member.name}`}
                        className="h-14 w-14 shrink-0 rounded-full object-cover"
                    />
                ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-dark text-lg font-semibold text-white">
                        {initials(member.name)}
                    </span>
                )}
                <div>
                    <h3 className="text-lg font-semibold tracking-tight">
                        {member.name}
                    </h3>
                    <p className="text-sm text-primary-dark">
                        {member.position}
                    </p>
                </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed opacity-70">{member.bio}</p>

            <ul className="mt-4 flex flex-wrap gap-2">
                {member.specialties.map((specialty) => (
                    <li
                        key={specialty}
                        className="rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-charcoal"
                    >
                        {specialty}
                    </li>
                ))}
            </ul>

            <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
                <span className="text-xs opacity-70">
                    {member.yearsExperience} years experience
                </span>
                <a
                    href="/book"
                    tabIndex={props.duplicate ? -1 : undefined}
                    className="inline-flex min-h-11 items-center rounded-md bg-primary-dark px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-press"
                >
                    Book with {member.name.split(" ")[0]}
                </a>
            </div>
        </article>
    );
}

/**
 * Landing page "Meet the team" section: an infinite marquee.
 *
 * The track holds two copies of the same list and glides left by
 * exactly one copy width (translateX(-50%)), so the loop has no
 * visible reset. Reduced-motion users get the original static grid
 * instead (copy two hidden, cards wrap at full/half width).
 */
export function Staff() {
    // Real roster avatars from the API, matched onto the curated
    // profiles below (which keep the bios the API doesn't store).
    const [team, setTeam] = useState<PublicTeamMember[]>([]);

    useEffect(() => {
        let cancelled = false;
        api
            .get<{ success: true; data: PublicTeamMember[] }>("/public/team", {
                skipErrorToast: true,
            })
            .then((response) => {
                if (!cancelled) setTeam(response.data.data);
            })
            .catch(() => {
                // Avatars are progressive enhancement — cards keep initials.
            });
        return () => {
            cancelled = true;
        };
    }, []);

    /** Staff id first, full name as a fallback when ids shift. */
    const photoFor = (member: TeamMember): string | null =>
        team.find((m) => m.id === member.id)?.profilePhoto ??
        team.find((m) => m.name.toLowerCase() === member.name.toLowerCase())
            ?.profilePhoto ??
        null;

    return (
        <Section id="team">
            <SectionHeading
                eyebrow="Our team"
                title="Meet the team"
                subtitle="Experienced stylists and artists who treat every appointment like it's their own look."
            />

            {/* Viewport clips the moving row so the page never scrolls sideways. */}
            <div className="overflow-hidden">
                <div className="team-marquee flex w-max motion-reduce:w-full">
                    {[false, true].map((duplicate) => (
                        <div
                            key={String(duplicate)}
                            aria-hidden={duplicate || undefined}
                            className={`flex gap-6 pr-6 motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:pr-0 ${
                                duplicate ? "motion-reduce:hidden" : ""
                            }`}
                        >
                            {TEAM.map((member) => (
                                <TeamCard
                                    key={member.id}
                                    member={member}
                                    photo={photoFor(member)}
                                    duplicate={duplicate}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </Section>
    );
}
