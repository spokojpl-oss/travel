import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSearch } from "@/components/features/HeroSearch";
import {
  PopularDestinationsSection,
  WhyUsSection,
} from "@/components/features/landing-sections";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-white">
      <Header variant="public" />
      <main className="flex-1">
        <HeroSearch />
        <WhyUsSection />
        <PopularDestinationsSection />
        <section className="border-t border-border-default bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 text-center lg:px-8">
            <h2 className="font-display text-2xl font-bold text-text-primary">
              Gotowy na planowanie?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-text-secondary">
              Zaloguj się i zacznij od wyboru aktywności — reszta przyjdzie sama.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex rounded-xl bg-accent-500 px-8 py-4 text-base font-bold text-white shadow-md transition-all hover:bg-accent-600 active:scale-[0.99]"
            >
              Zaloguj się i planuj →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
