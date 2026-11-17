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

export function About() {
    return (
        <Section id="about">
            <SectionHeading
                eyebrow="About us"
                title="Your neighbourhood beauty studio"
                subtitle="Professional hair, make-up and beauty care — with online booking that fits your schedule."
            />

            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
                <div className="space-y-5 text-sm leading-[1.9] text-muted">
                    <p className="font-display text-3xl leading-snug text-charcoal">
                        Great results start with <span className="italic text-primary">listening.</span>
                    </p>
                    <p>
                        Raheem Make Up Studio and Salon is a full-service beauty studio offering
                        haircuts, styling, colouring, make-up, facials, manicures and pedicures.
                        Whether it's a quick trim or a full bridal transformation, every visit is
                        tailored to you.
                    </p>
                    <p>
                        Tell us the look you're after, and our team will guide you through the
                        options — no pressure, no surprises on the bill.
                    </p>
                    <p>
                        Booking is completely online and account-free. Choose your service,
                        choose your stylist (or let us match you with the first available), and
                        pick a time. You can manage or cancel through a private link any time.
                    </p>

                    <div className="rounded-card border border-border bg-surface p-6 shadow-card">
                        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-deep">
                            <span aria-hidden className="h-px w-5 bg-gold" />
                            Opening hours
                        </h3>
                        <dl className="mt-4 space-y-2.5 text-sm text-muted">
                            <div className="flex justify-between border-b border-dashed border-border pb-2">
                                <dt>Monday – Saturday</dt>
                                <dd className="font-semibold text-charcoal">9:00 AM – 6:00 PM</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt>Sunday</dt>
                                <dd className="font-semibold text-charcoal">Closed</dd>
                            </div>
                        </dl>
                    </div>
                </div>

                <div className="grid gap-4">
                    {VALUES.map((value, index) => (
                        <div
                            key={value.title}
                            className="group rounded-card border border-border bg-surface p-6 shadow-card transition-all hover:-translate-y-1 hover:border-gold/60 hover:shadow-lift"
                        >
                            <div className="flex items-start gap-4">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold-soft/50 font-display text-lg font-semibold text-primary">
                                    0{index + 1}
                                </span>
                                <div>
                                    <h3 className="text-xl text-charcoal">{value.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-muted">
                                        {value.body}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Section>
    );
}
