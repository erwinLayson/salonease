import { Footer } from "../components/layout/Footer";
import { Navbar } from "../components/layout/Navbar";
import { About } from "../components/landing/About";
import { CtaBand } from "../components/landing/CtaBand";
import { Hero } from "../components/landing/Hero";
import { Services } from "../components/landing/Services";
import { Staff } from "../components/landing/Staff";

/** Public landing page: hero, about us, services & offers, and the team. */
export default function LandingPage() {
    return (
        <div className="flex min-h-svh flex-col">
            <Navbar active="home" />
            <main className="flex-1">
                <Hero />
                <About />
                <Services />
                <Staff />
                <CtaBand />
            </main>
            <Footer />
        </div>
    );
}
