import { Star, Users } from "lucide-react";
import Image from "next/image";

export interface NFT {
    id: number;
    title: string;
    timeLeft: string;
    rating: number;
    reviews: number;
    creator: string;
    creatorRole: string;
    price: string;
    image: string;
    avatar: string;
}

export const NFTCard = ({ nft }: { nft: NFT }) => {
    return (
        <div className="group bg-[#0F0313] p-3 rounded-2xl overflow-hidden border-2 border-[#747474]/30 hover:border-purple-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10">
            {/* Image */}
            <div className="relative w-full aspect-[4/3] overflow-hidden ">
                <Image
                    src={nft.image}
                    alt={nft.title}
                    fill
                    className="object-cover rounded-2xl group-hover:scale-110 transition-transform duration-500"
                />
            </div>

            {/* Content */}
            <div className="bg-[#0F031300]">
                {/* Title and Time */}
                <div className="flex items-start justify-between mt-3 mb-2">
                    <h3 className="text-white font-semibold text-lg">{nft.title}</h3>

                </div>

                {/* Rating */}
                <div className="flex font-inter justify-between items-center">
                    <span className="text-white font-semibold bg-[#F5F3FF1A] flex items-center rounded-md px-4 md:h-6 text-sm">{nft.timeLeft}</span>
                    <div className="flex h-full items-center gap-3 py-4">
                        <div className="flex items-center gap-1">
                            <Star fill='#C7A7F7' color='#C7A7F7' className='w-3 h-3' />
                            <span className="text-white text-xs font-medium">{nft.rating}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Users fill='#C7A7F7' color='#C7A7F7' className='w-3 h-3' />
                            <span className="text-white text-xs font-medium">{nft.reviews}</span>
                        </div>
                    </div>
                </div>

                {/* Creator */}
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full overflow-hidden border border-purple-500/50 flex-shrink-0">
                        <Image
                            src={nft.avatar}
                            alt={nft.creator}
                            width={24}
                            height={24}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex gap-1.5 min-w-0">
                        <p className="text-white text-xs font-mono font-medium truncate">{nft.creator} </p>
                        <p className="text-gray-500 text-[10px] font-mono truncate">: {nft.creatorRole}</p>
                    </div>
                </div>

                {/* Price and Button */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col">
                        <span className="text-white font-space-grotesk font-semibold text-sm">{nft.price} ETH</span>
                    </div>
                    <button className="px-6 py-2 bg-[#9B59FF] hover:from-purple-500 hover:to-pink-500 text-white text-sm font-semibold rounded-lg transition-all duration-200 whitespace-nowrap">
                        Buy now
                    </button>
                </div>
            </div>
        </div>
    );
};
