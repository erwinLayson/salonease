import { Section, SectionHeading } from "./Section";

const VALUES = [
    {
        title: "Skilled professionals",
        body: "Our stylists keep their craft sharp with ongoing training in cuts, colour and make-up artistry.",
    },
    {
        title: "Quality products",
        body: "We work with trusted hair and skin products chosen for performance and gentle, lasting results.",
    },
    {
        title: "Booking made simple",
        body: "Reserve your slot online in under a minute — pick a service, a stylist and a time, and you're done.",
    },
];

/** Landing page "About us" section. */
export function About() {
    return (
        <Section id="about">
            <SectionHeading
                eyebrow="About us"
                title="Your neighbourhood beauty studio"
                subtitle="Professional hair, make-up and beauty care — with online booking that fits your schedule."
            />

            <div className="grid gap-10 lg:grid-cols-2">
                <div className="space-y-4 text-sm leading-relaxed opacity-80">
                    <p>
                        Raheem Make Up Studio and Salon is a full-service beauty studio offering
                        haircuts, styling, colouring, make-up, facials, manicures and pedicures.
                        Whether it's a quick trim or a full bridal transformation, every visit is
                        tailored to you.
                    </p>
                    <p>
                        We believe great results start with listening. Tell us the look you're
                        after, and our team will guide you through the options — no pressure, no
                        surprises on the bill.
                    </p>
                    <p>
                        Booking is completely online and account-free. Choose your service,
                        choose your stylist (or let us match you with the first available), and
                        pick a time. We'll confirm everything instantly, and you can manage or
                        cancel through a private link any time.
                    </p>

                    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
                        <h3 className="text-sm font-semibold">Opening hours</h3>
                        <dl className="mt-2 space-y-1 text-sm opacity-70">
                            <div className="flex justify-between">
                                <dt>Monday – Saturday</dt>
                                <dd>9:00 AM – 6:00 PM</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt>Sunday</dt>
                                <dd>Closed</dd>
                            </div>
                        </dl>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-1">
                    {VALUES.map((value) => (
                        <div
                            key={value.title}
                            className="rounded-xl border border-border bg-surface p-5 shadow-sm transition hover:border-primary hover:bg-primary-light/30"
                        >
                            <div className="flex items-start gap-3">
                                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-dark text-sm font-semibold text-white">
                                    ✓
                                </span>
                                <div>
                                    <h3 className="text-sm font-semibold">{value.title}</h3>
                                    <p className="mt-1 text-sm opacity-70">{value.body}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Section>
    );
}
