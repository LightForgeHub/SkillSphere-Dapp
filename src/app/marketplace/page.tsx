import HottestCollections from "@/components/marketplace/HottestCollections";
import NFTGrid from "@/components/marketplace/NFTGrid";

export default function MarketplacePage() {
    return (
        <div className="bg-radial from-[#481F66]/30 to bg-[#0A050E]">
            <HottestCollections />
            <NFTGrid />
        </div>
    )
}