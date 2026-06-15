import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSearch } from "@/components/features/HeroSearch";
import {
  PopularDestinationsSection,
  WhyUsSection,
} from "@/components/features/landing-sections";
import { HomeCtaSection } from "@/components/features/HomeCtaSection";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-white">
      <Header variant="public" />
      <main className="flex-1">
        <HeroSearch />
        <WhyUsSection />
        <PopularDestinationsSection />
        <HomeCtaSection />
      </main>
      <Footer />
    </div>
  );
}
