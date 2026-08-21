import { HeroSection } from "@/components/home/sections/HeroSection";
import { FeaturedExpertsSection } from "@/components/home/sections/FeaturedExpertsSection";
import { HowItWorksSection } from "@/components/home/sections/HowItWorksSection";
import { ValuePillarsSection } from "@/components/home/sections/ValuePillarsSection";
import { CTASection } from "@/components/home/sections/CTASection";

export default function Home() {
  return (
    <>
      <HeroSection />
      <FeaturedExpertsSection />
      <HowItWorksSection />
      <ValuePillarsSection />
      <CTASection />
    </>
  );
}
