import { NFTCard } from "../ui/NFTCard";
import { Eye } from "lucide-react"

const nftData = [
  {
    id: 1,
    image: "/imagePlaceholder1.png",
    title: "Distant Galaxy",
    creatorName: "MoonDancer",
    creatorAvatar: "/nftAvatar1.png",
    price: "1.63 ETH",
    highestBid: "0.33 wETH",
  },
  {
    id: 2,
    image: "/imagePlaceholder2.png",
    title: "Life On Edena",
    creatorName: "NebulaKid",
    creatorAvatar: "/nftAvatar2.png",
    price: "1.63 ETH",
    highestBid: "0.33 wETH",
  },
  {
    id: 3,
    image: "/imagePlaceholder3.png",
    title: "AstroFiction",
    creatorName: "Spaceone",
    creatorAvatar: "/nftAvatar3.png",
    price: "1.63 ETH",
    highestBid: "0.33 wETH",
  },
];

export function DiscoverNFTsSection() {
  return (
    <section className="bg-[#0e0516] w-full py-[60px] md:py-[80px] px-4 md:px-8 lg:px-[60px]">
      <div className="max-w-[1320px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 md:gap-[100px] mb-[60px]">
          <div className="flex flex-col gap-[10px] flex-1 min-w-0">
            <h2 className="font-semibold text-[32px] md:text-[38px] leading-[1.2] text-white capitalize">
              Discover More NFTs
            </h2>
            <p className="font-normal text-[18px] md:text-[22px] leading-[1.6] text-white">
              Explore new trending NFTs
            </p>
          </div>

          <button className="flex items-center group justify-center gap-[12px] h-[60px] px-[50px] rounded-[20px] hover:cursor-pointer border-2 border-[#9b59ff] hover:bg-[#9b59ff] transition-colors duration-300 shrink-0">
            <Eye className="w-5 h-5 text-[#9b59ff] group-hover:text-white" />
            <span className="font-semibold text-[16px] leading-[1.4] text-white">
              See All
            </span>
          </button>
        </div>

        {/* NFT Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[30px]">
          {nftData.map((nft) => (
            <NFTCard key={nft.id} {...nft} />
          ))}
        </div>
      </div>
    </section>
  );
}
