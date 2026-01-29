'use client';

import { useState } from 'react';
import * as React from 'react';
import { FilterDropdown } from './FilterDropdown';
import { NFT, NFTCard } from './NFTCard';



const nftData: NFT[] = [
    {
        id: 1,
        title: 'Science Lab',
        timeLeft: '23+hrs',
        rating: 4.7,
        reviews: 4.7,
        creator: 'Spaceone',
        creatorRole: 'BlockchainExplorer',
        price: '1.63',
        image: '/nft4.svg',
        avatar: '/nftAvatar3.png',
    },
    {
        id: 2,
        title: 'Aoen.Net',
        timeLeft: '23+hrs',
        rating: 4.7,
        reviews: 4.7,
        creator: 'Spaceone',
        creatorRole: 'BlockchainExplorer',
        price: '2.45',
        image: '/nft7.svg',
        avatar: '/nftAvatar3.png',
    },
    {
        id: 3,
        title: 'Flow Dymenisty',
        timeLeft: '23+hrs',
        rating: 4.7,
        reviews: 4.7,
        creator: 'Spaceone',
        creatorRole: 'BlockchainExplorer',
        price: '0.89',
        image: '/nft8.svg',
        avatar: '/nftAvatar3.png',
    },
    {
        id: 4,
        title: 'Centry Networks',
        timeLeft: '23+hrs',
        rating: 4.7,
        reviews: 4.7,
        creator: 'Spaceone',
        creatorRole: 'BlockchainExplorer',
        price: '3.21',
        image: '/nft6.svg',
        avatar: '/nftAvatar3.png',
    },
    {
        id: 5,
        title: 'Centry Networks',
        timeLeft: '23+hrs',
        rating: 4.8,
        reviews: 4.8,
        creator: 'Jane Anderson',
        creatorRole: 'BlockchainExplorer',
        price: '1.99',
        image: '/nft8.svg',
        avatar: '/nftAvatar3.png',
    },
    {
        id: 6,
        title: 'Flow Dymenisty',
        timeLeft: '23+hrs',
        rating: 4.6,
        reviews: 4.6,
        creator: 'Spaceone',
        creatorRole: 'BlockchainExplorer',
        price: '1.35',
        image: '/nft-lab.svg',
        avatar: '/nftAvatar3.png',
    },
    {
        id: 7,
        title: 'Aoen.Net',
        timeLeft: '23+hrs',
        rating: 4.9,
        reviews: 4.9,
        creator: 'Spaceone',
        creatorRole: 'BlockchainExplorer',
        price: '2.75',
        image: '/nft6.svg',
        avatar: '/nftAvatar3.png',
    },
    {
        id: 8,
        title: 'Science Lab',
        timeLeft: '23+hrs',
        rating: 4.5,
        reviews: 4.5,
        creator: 'Spaceone',
        creatorRole: 'BlockchainExplorer',
        price: '0.75',
        image: '/nft4.svg',
        avatar: '/nftAvatar3.png',
    },
    {
        id: 9,
        title: 'Aoen.Net',
        timeLeft: '23+hrs',
        rating: 4.7,
        reviews: 4.7,
        creator: 'Spaceone',
        creatorRole: 'BlockchainExplorer',
        price: '1.85',
        image: '/nft6.svg',
        avatar: '/nftAvatar3.png',
    },
    {
        id: 10,
        title: 'Flow Dymenisty',
        timeLeft: '23+hrs',
        rating: 4.8,
        reviews: 4.8,
        creator: 'Spaceone',
        creatorRole: 'BlockchainExplorer',
        price: '3.50',
        image: '/nft-neon.svg',
        avatar: '/nftAvatar3.png',
    },
    {
        id: 11,
        title: 'Centry Networks',
        timeLeft: '23+hrs',
        rating: 4.6,
        reviews: 4.6,
        creator: 'Spaceone',
        creatorRole: 'BlockchainExplorer',
        price: '2.10',
        image: '/nft4.svg',
        avatar: '/nftAvatar3.png',
    },
    {
        id: 12,
        title: 'Science Lab',
        timeLeft: '23+hrs',
        rating: 4.9,
        reviews: 4.9,
        creator: 'Spaceone',
        creatorRole: 'BlockchainExplorer',
        price: '1.20',
        image: '/nft4.svg',
        avatar: '/nftAvatar3.png',
    },
];




export default function NFTGrid() {
    const [category, setCategory] = useState('All Categories');
    const [sortBy, setSortBy] = useState('Popular');
    const [priceFilter, setPriceFilter] = useState('Price');
    const [filteredNFTs, setFilteredNFTs] = useState(nftData);

    const categoryOptions = ['All Categories', 'Science Lab', 'Aoen.Net', 'Flow Dymenisty', 'Centry Networks'];
    const sortOptions = ['Popular', 'Recent', 'Price: Low to High', 'Price: High to Low', 'Most Liked'];
    const priceOptions = ['Price', 'Under 1 ETH', '1-2 ETH', '2-3 ETH', 'Above 3 ETH'];

    // Apply filters
    React.useEffect(() => {
        let result = [...nftData];

        // Filter by category
        if (category !== 'All Categories') {
            result = result.filter(nft => nft.title === category);
        }

        // Filter by price range
        if (priceFilter === 'Under 1 ETH') {
            result = result.filter(nft => parseFloat(nft.price) < 1);
        } else if (priceFilter === '1-2 ETH') {
            result = result.filter(nft => parseFloat(nft.price) >= 1 && parseFloat(nft.price) < 2);
        } else if (priceFilter === '2-3 ETH') {
            result = result.filter(nft => parseFloat(nft.price) >= 2 && parseFloat(nft.price) < 3);
        } else if (priceFilter === 'Above 3 ETH') {
            result = result.filter(nft => parseFloat(nft.price) >= 3);
        }

        // Sort
        if (sortBy === 'Price: Low to High') {
            result.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        } else if (sortBy === 'Price: High to Low') {
            result.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        } else if (sortBy === 'Most Liked') {
            result.sort((a, b) => b.rating - a.rating);
        }

        setFilteredNFTs(result);
    }, [category, sortBy, priceFilter]);

    return (
        <section className="w-full px-4 py-12 md:px-8 lg:px-16 xl:px-24">
            <div className="max-w-[1400px] mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-10 gap-6">
                    <h1 className="text-3xl md:text-4xl font-space-grotesk font-bold dark:text-white">NFTS</h1>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        <FilterDropdown value={category} options={categoryOptions} onChange={setCategory} />
                        <FilterDropdown value={sortBy} options={sortOptions} onChange={setSortBy} />
                        <FilterDropdown value={priceFilter} options={priceOptions} onChange={setPriceFilter} />
                    </div>
                </div>

                {/* NFT Grid */}
                {filteredNFTs.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredNFTs.map((nft) => (
                            <NFTCard key={nft.id} nft={nft} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <p className="text-gray-400 text-lg">No NFTs found matching your filters.</p>
                        <button
                            onClick={() => {
                                setCategory('All Categories');
                                setPriceFilter('Price');
                                setSortBy('Popular');
                            }}
                            className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                        >
                            Reset Filters
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}