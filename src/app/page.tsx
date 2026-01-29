import { HeroSection } from "@/components/home/sections/HeroSection";
import { CTASection } from "@/components/home/sections/CTASection";
import { DiscoverNFTsSection } from "@/components/home/sections/DiscoverNFTsSection";
import { TopRatedArtist } from "@/components/home/sections/TopRatedArtist";

export default function Home() {
  return (
    <>
      <HeroSection />
      <DiscoverNFTsSection />
      <TopRatedArtist />
      <CTASection />
    </>
  );
}
