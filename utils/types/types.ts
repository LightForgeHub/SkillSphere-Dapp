export interface ExpertCollection {
    id: string;
    title: string;
    creator: {
        name: string;
        avatar: string;
    };
    description: string;
    image: string;
    price: string;
    highestBid: string;
}

export interface Collection {
    id: number;
    name: string;
    items: number;
    price: string;
    image: string;
    avatar: string;
}


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

export interface Session {
    id: string;
    title: string;
    expertName: string;
    expertAvatar: string;
    date: string;
    time: string;
    duration: string;
    status: "active" | "upcoming" | "completed" | "cancelled";
    price: string;
    category: string;
}

export interface Expert {
    id: string;
    name: string;
    avatar: string;
    category: string;
    rating: number;
    reviews: number;
    hourlyRate: string;
    availability: boolean;
}