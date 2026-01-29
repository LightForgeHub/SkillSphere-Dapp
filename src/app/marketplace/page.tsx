import HottestCollections from "@/components/marketplace/HottestCollections";
import NFTGrid from "@/components/marketplace/NFTGrid";
import TrendingExpert from "@/components/marketplace/trendingExpert";

export default function MarketplacePage() {
    return (
        <div className="bg-background">
            <TrendingExpert />
            <HottestCollections />
            <NFTGrid />
        </div>
    )
}