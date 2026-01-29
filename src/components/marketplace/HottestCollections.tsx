'use client';

import { useState, useEffect } from 'react'; // Added useEffect
import Image from 'next/image';
import { Flame } from 'lucide-react';
import { FilterDropdown } from './FilterDropdown';

interface Collection {
    id: number;
    name: string;
    items: number;
    price: string;
    image: string;
    avatar: string;
}

const collections: Collection[] = [
    {
        id: 1,
        name: 'Spaceone',
        items: 4,
        price: '1.63',
        image: '/nft3.svg',
        avatar: '/nftAvatar3.png',
    },
    {
        id: 2,
        name: 'Spaceone',
        items: 3,
        price: '1.63',
        image: '/nft1.svg',
        avatar: '/nftAvatar3.png',
    },
    {
        id: 3,
        name: 'Spaceone',
        items: 5,
        price: '1.63',
        image: '/nft2.svg',
        avatar: '/nftAvatar3.png',
    },
];

const CollectionRow = ({ collection }: { collection: Collection }) => {
    return (
        <div className="group hover:bg-white/10 transition-all duration-200 md:max-h-[220px] border border-gray-600/20 rounded-2xl">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-6 md:gap-8 p-6 items-center">
                {/* Collection Info */}
                <div className="flex flex-wrap md:flex-nowrap items-center gap-4">
                    <div className="flex justify-start relative w-full md:max-w-[320px] h-[175px] rounded-md my-auto flex-shrink-0 mr-8">
                        <Image
                            src={collection.image}
                            alt={collection.name}
                            fill
                            sizes="(max-width: 768px) 100vw, 320px"
                            className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                            <Image
                                src={collection.avatar}
                                alt={collection.name}
                                width={40}
                                height={40}
                                className="w-10 h-10 object-contain"
                            />
                        </div>
                        <span className="dark:text-white font-medium font-mono text-lg">{collection.name}</span>
                    </div>
                </div>

                {/* Number of Items */}
                <div className="flex md:justify-end">
                    <span className="dark:text-white text-base md:min-w-[120px] md:text-center">
                        <span className="md:hidden font-mono dark:text-gray-400 mr-2">Items:</span>
                        {collection.items}
                    </span>
                </div>

                {/* Starting Price */}
                <div className="flex md:justify-end">
                    <span className="dark:text-white text-base md:min-w-[120px] md:text-right">
                        <span className="md:hidden font-mono dark:text-gray-400 mr-2">Starting price:</span>
                        <span className='font-space-grotesk'>{collection.price} ETH</span>
                    </span>
                </div>
            </div>
        </div>
    );
};

export default function HottestCollections() {
    const [sortBy, setSortBy] = useState('Popular');
    const [priceFilter, setPriceFilter] = useState('Price');
    const [dayFilter, setDayFilter] = useState('Day');
    const [filteredCollections, setFilteredCollections] = useState(collections);

    const sortOptions = ['Popular', 'Trending', 'Recent', 'Top Rated'];
    const priceOptions = ['Price', 'Low to High', 'High to Low'];
    const dayOptions = ['Day', 'Week', 'Month', 'All Time'];

    useEffect(() => {
        const result = [...collections];

        // Apply price filter
        if (priceFilter === 'Low to High') {
            result.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        } else if (priceFilter === 'High to Low') {
            result.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        }

        // Apply sort filter
        if (sortBy === 'Top Rated') {
            result.sort((a, b) => b.items - a.items);
        } else if (sortBy === 'Recent') {
            // Assuming newer collections have higher IDs
            result.sort((a, b) => b.id - a.id);
        } else if (sortBy === 'Popular') {
            result.sort((a, b) => b.items - a.items);
        }

        // Apply day filter (if you have dates)
        if (dayFilter !== 'Day') {
            // For now, it just returns all collections
        }

        setFilteredCollections(result);
    }, [sortBy, priceFilter, dayFilter]);

    return (
        <section className="w-full px-4 py-12 md:px-8 lg:px-16 xl:px-24">
            <div className="max-w-[1400px] mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#9B59FF1F] rounded-xl flex items-center justify-center flex-shrink-0">
                            <Flame color='#9B59FF' />
                        </div>
                        <h1 className="text-3xl font-space-grotesk md:text-4xl font-bold">
                            Hottest Collections {/* Fixed typo: "Hotest" to "Hottest" */}
                        </h1>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        <FilterDropdown
                            value={sortBy}
                            options={sortOptions}
                            onChange={setSortBy}
                        />
                        <FilterDropdown
                            value={priceFilter}
                            options={priceOptions}
                            onChange={setPriceFilter}
                        />
                        <FilterDropdown
                            value={dayFilter}
                            options={dayOptions}
                            onChange={setDayFilter}
                        />
                    </div>
                </div>

                {/* Table Header - Desktop Only */}
                <div className="hidden md:grid font-inter md:grid-cols-[1fr_auto_auto] gap-8 px-6 py-4 text-sm dark:text-[#F5F3FF]/60 border-b-2 border-[#222122] mb-0">
                    <div>Collections</div>
                    <div className="text-center min-w-[120px]">Number of items</div>
                    <div className="text-right min-w-[120px]">Starting price</div>
                </div>

                {/* Collections List */}
                <div className="flex flex-col gap-8 rounded-xl mt-8">
                    {filteredCollections.length > 0 ? (
                        filteredCollections.map((collection) => (
                            <CollectionRow key={collection.id} collection={collection} />
                        ))
                    ) : (
                        <div className="text-center py-12 text-gray-400">
                            No collections found with the current filters.
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}