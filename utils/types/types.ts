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
    expertId: string;
    expertAvatar: string;
    seekerName: string;
    seekerAvatar: string;
    date: string;
    time: string;
    duration: string;
    status: "active" | "upcoming" | "completed" | "cancelled";
    price: string;
    category: string;
    transactionHash?: string;
    network?: 'testnet' | 'mainnet';
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
    is_busy?: boolean;
    bio?: string;
    skills?: string[];
    pastReviews?: Review[];
    responseTime?: string;
    totalSessions?: number;
    walletAddress?: string;
}

export interface Review {
    id: string;
    reviewer: string;
    reviewerAvatar: string;
    rating: number;
    comment: string;
    date: string;
}

export interface Transaction {
    id: string;
    hash: string;
    type: 'deposit' | 'settlement' | 'withdrawal';
    amount: string;
    date: string;
    status: 'completed' | 'pending' | 'failed';
    network: 'testnet' | 'mainnet';
    sessionId?: string;
}