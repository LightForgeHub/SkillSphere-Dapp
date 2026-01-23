import Image from "next/image";

interface NFTCardProps {
  image: string;
  title: string;
  creatorName: string;
  creatorAvatar: string;
  price: string;
  highestBid: string;
}

export function NFTCard({
  image,
  title,
  creatorName,
  creatorAvatar,
  price,
  highestBid,
}: NFTCardProps) {
  return (
    <div
      className="bg-[#22172b] flex flex-col flex-1 min-w-[260px] rounded-[20px] overflow-hidden hover:scale-105 transition-transform duration-300 cursor-pointer group"
      role="article"
      aria-label={`NFT: ${title} by ${creatorName}`}
    >
      {/* Image Section */}
      <div className="relative w-full h-[295px]">
        <Image
          fill
          alt={`${title} NFT artwork`}
          className="w-full h-full object-cover"
          src={image}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
      </div>

      {/* Info Section */}
      <div className="flex flex-col gap-[25px] p-[30px] pb-[25px]">
        {/* Title and Creator */}
        <div className="flex flex-col gap-[5px]">
          <h3 className="font-work font-semibold text-[22px] leading-[1.4] text-white capitalize">
            {title}
          </h3>
          <div className="flex gap-[12px] items-center">
            <div className="w-[24px] h-[24px] rounded-full overflow-hidden">
              <Image
                width={30}
                height={30}
                alt={creatorName}
                className="w-full h-full object-cover"
                src={creatorAvatar}
              />
            </div>
            <p className="font-mono text-[16px] leading-[1.4] text-white">
              {creatorName}
            </p>
          </div>
        </div>

        {/* Price and Bid */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-[8px] flex-1">
            <p className="font-mono text-[12px] leading-[1.1] text-[#858584]">
              Price
            </p>
            <p className="font-mono text-[16px] leading-[1.4] text-white">
              {price}
            </p>
          </div>
          <div className="flex flex-col gap-[8px] flex-1 text-right">
            <p className="font-mono text-[12px] leading-[1.1] text-[#858584]">
              Highest Bid
            </p>
            <p className="font-mono text-[16px] leading-[1.4] text-white">
              {highestBid}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


// Skeleton component for loading states
export function NFTCardSkeleton() {
  return (
    <div className="bg-[#22172b] flex flex-col flex-1 min-w-[260px] rounded-[20px] overflow-hidden animate-pulse">
      <div className="w-full h-[295px] bg-[#2d1f38]" />
      <div className="flex flex-col gap-[25px] p-[30px] pb-[25px]">
        <div className="flex flex-col gap-[5px]">
          <div className="h-[30px] bg-[#2d1f38] rounded w-3/4" />
          <div className="flex gap-[12px] items-center">
            <div className="w-[24px] h-[24px] rounded-full bg-[#2d1f38]" />
            <div className="h-[22px] bg-[#2d1f38] rounded w-[100px]" />
          </div>
        </div>
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-[8px] flex-1">
            <div className="h-[14px] bg-[#2d1f38] rounded w-[40px]" />
            <div className="h-[22px] bg-[#2d1f38] rounded w-[80px]" />
          </div>
          <div className="flex flex-col gap-[8px] flex-1">
            <div className="h-[14px] bg-[#2d1f38] rounded w-[80px] ml-auto" />
            <div className="h-[22px] bg-[#2d1f38] rounded w-[90px] ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
