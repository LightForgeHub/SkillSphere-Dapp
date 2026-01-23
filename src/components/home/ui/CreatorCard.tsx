import Image from "next/image";

interface CreatorCardProps {
  avatar: string;
  name: string;
  totalSales: string;
  rank: number;
}

export function CreatorCard({
  avatar,
  name,
  totalSales,
  rank,
}: CreatorCardProps) {
  return (
    <div
      className="bg-gradient-to-b from-[#170f1e] to-[#100817] rounded-[20px] p-[20px] relative flex flex-col items-center gap-[20px] flex-1 min-w-[240px] hover:scale-105 transition-transform duration-300 cursor-pointer group"
      role="article"
      aria-label={`Creator rank ${rank}: ${name} with ${totalSales} in total sales`}
    >
      {/* Ranking Number */}
      <div className="absolute left-[20px] top-[18px] bg-[#241c3f] rounded-[20px] w-[30px] h-[30px] flex items-center justify-center">
        <p
          className="font-mono text-[16px] leading-[1.4] text-foreground"
          aria-label={`Rank ${rank}`}
        >
          {rank}
        </p>
      </div>

      {/* Avatar */}
      <div className="relative w-[120px] h-[120px] rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-[#9b59ff] transition-all duration-300">
        <Image
          alt={name}
          className="w-full h-full object-cover"
          src={avatar}
          fill
        />
      </div>

      {/* Creator Info */}
      <div className="flex flex-col gap-[5px] items-center w-full">
        <h3 className="font-work font-semibold text-[22px] leading-[1.4] text-white text-center capitalize">
          {name}
        </h3>
        <div className="flex gap-[10px] items-center justify-center w-full text-[16px]">
          <p className="font-work font-normal text-foreground">
            Total Sales:
          </p>
          <p className="font-mono text-white">{totalSales}</p>
        </div>
      </div>
    </div>
  );
}

// Skeleton component for loading states
export function CreatorCardSkeleton() {
  return (
    <div className="bg-gradient-to-b from-[#170f1e] to-[#100817] rounded-[20px] p-[20px] relative flex flex-col items-center gap-[20px] flex-1 min-w-[240px] animate-pulse">
      <div className="absolute left-[20px] top-[18px] bg-[#241c3f] rounded-[20px] w-[30px] h-[30px]" />
      <div className="w-[120px] h-[120px] rounded-full bg-[#241c3f]" />
      <div className="flex flex-col gap-[5px] items-center w-full">
        <div className="h-[30px] bg-[#241c3f] rounded w-[140px]" />
        <div className="h-[22px] bg-[#241c3f] rounded w-[180px]" />
      </div>
    </div>
  );
}
