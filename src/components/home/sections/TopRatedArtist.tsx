import { CreatorCard } from "../ui/CreatorCard";
import { Rocket } from "lucide-react";

const creators = [
  {
    id: 1,
    avatar: "/avatarPlaceholder1.jpg",
    name: "Keepitreal",
    sales: "34.53 ETH",
  },
  {
    id: 2,
    avatar: "/avatarPlaceholder2.png",
    name: "DigiLab",
    sales: "34.53 ETH",
  },
  {
    id: 3,
    avatar: "/avatarPlaceholder3.png",
    name: "GravityOne",
    sales: "34.53 ETH",
  },
  {
    id: 4,
    avatar: "/avatarPlaceholder4.png",
    name: "Juanie",
    sales: "34.53 ETH",
  },
  {
    id: 5,
    avatar: "/avatarPlaceholder5.jpg",
    name: "BlueWhale",
    sales: "34.53 ETH",
  },
  {
    id: 6,
    avatar: "/avatarPlaceholder6.png",
    name: "Mr Fox",
    sales: "34.53 ETH",
  },
  {
    id: 7,
    avatar: "/avatarPlaceholder7.jpg",
    name: "Shroomie",
    sales: "34.53 ETH",
  },
  {
    id: 8,
    avatar: "/avatarPlaceholder8.jpg",
    name: "Robotica",
    sales: "34.53 ETH",
  },
  {
    id: 9,
    avatar: "/avatarPlaceholder9.png",
    name: "RustyRobot",
    sales: "34.53 ETH",
  },
  {
    id: 10,
    avatar: "/avatarPlaceholder10.jpg",
    name: "Animakid",
    sales: "34.53 ETH",
  },
  {
    id: 11,
    avatar: "/avatarPlaceholder11.png",
    name: "Dotgu",
    sales: "34.53 ETH",
  },
  {
    id: 12,
    avatar: "/avatarPlaceholder12.png",
    name: "Ghiblier",
    sales: "34.53 ETH",
  },
];

export function TopRatedArtist() {
  return (
    <section className="relative w-full py-[60px] md:py-20 px-4 md:px-8 lg:px-[60px] bg-background">

      <div className="max-w-[1320px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-[60px]">
          <div className="flex flex-col gap-2.5 max-w-[703px]">
            <h2 className="font-work font-semibold text-[32px] md:text-[38px] leading-[1.2] text-foreground capitalize">
              Top creators
            </h2>
            <p className="font-work text-lg md:text-[22px] leading-[1.6] text-foreground capitalize">
              Checkout Top Rated Creators on the NFT Marketplace
            </p>
          </div>
          <div className="p-[2px] rounded-lg bg-[linear-gradient(135deg,#A259FF,#C397FD,#C194FA,#613599,#B184EA,#9854F0)]">
            <div className="rounded-lg bg-black">
              <button className="flex items-center gap-3 group h-[60px] px-[50px] self-start md:self-auto hover:cursor-pointer  hover:bg-[#a259ff] transition-colors">
                <Rocket className="text-[#9B59FF] h-5 w-5 group-hover:text-white" />
                <span className="font-work font-semibold text-base leading-[1.4] text-white">
                  View Rankings
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[30px]">
          {creators.map((creator, index) => (
            <CreatorCard
              key={creator.id}
              rank={index + 1}
              avatar={creator.avatar}
              name={creator.name}
              totalSales={creator.sales}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
