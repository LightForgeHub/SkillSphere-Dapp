import { HeroSection } from "@/components/home/sections/HeroSection";
import { CTASection } from "@/components/home/CTASection";
import Footer from "@/components/footer";
import { DiscoverNFTsSection } from "@/components/home/sections/DiscoverNFTsSection";
import { TopRatedArtist } from "@/components/home/sections/TopRatedArtist";

export default function Home() {
  return (
    <>
    <HeroSection />
    <CTASection />
    <Footer />
    <DiscoverNFTsSection />
    <TopRatedArtist />
    </>
  );
}
