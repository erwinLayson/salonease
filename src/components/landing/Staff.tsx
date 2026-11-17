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

function TeamCard(props: {
    member: TeamMember;
    photo: string | null;
    duplicate?: boolean;
}) {
    const { member } = props;
    return (
        <article className="flex w-[85vw] shrink-0 flex-col rounded-card border border-border bg-surface p-6 shadow-card sm:w-96 motion-reduce:w-full motion-reduce:shrink sm:motion-reduce:w-1/2">
            <div className="flex items-center gap-4">
                {props.photo ? (
                    <img
                        src={props.photo}
                        alt={`Profile photo of ${member.name}`}
                        className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-gold/40"
                    />
                ) : (
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary font-display text-xl font-semibold text-white ring-2 ring-gold/40">
                        {initials(member.name)}
                    </span>
                )}
                <div>
                    <h3 className="text-2xl leading-tight text-charcoal">{member.name}</h3>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-deep">
                        {member.position}
                    </p>
                </div>
            </div>

            <p className="mt-5 text-sm leading-relaxed text-muted">{member.bio}</p>

            <ul className="mt-5 flex flex-wrap gap-2">
                {member.specialties.map((specialty) => (
                    <li
                        key={specialty}
                        className="rounded-full border border-gold/30 bg-gold-soft/50 px-3 py-1 text-[11px] font-medium text-charcoal"
                    >
                        {specialty}
                    </li>
                ))}
            </ul>

            <div className="mt-auto flex items-center justify-between border-t border-border pt-5">
                <span className="text-xs text-muted">
                    {member.yearsExperience} years experience
                </span>
                <a
                    href="/book"
                    tabIndex={props.duplicate ? -1 : undefined}
                    className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
                >
                    Book with {member.name.split(" ")[0]}
                </a>
            </div>
        </article>
    );
}

export function Staff() {
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
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

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
