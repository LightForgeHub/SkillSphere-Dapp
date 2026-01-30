"use client";

import React, { useState } from 'react';
import { mockExpert } from '../../../utils/data/mock-data';


export default function TrendingExpert() {
  const [activeSlide, setActiveSlide] = useState(0);

  return (
    <section className="py-12 bg-background dark:text-white px-4 md:px-8 lg:px-16 overflow-hidden">
      <div className="max-w-[1440px] mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h2 className="text-4xl font-bold mb-2">Trending Expert Collections</h2>
          <p className="text-gray-400 text-sm">Knowledge bundles created by top SkillSphere experts.</p>
        </div>

        {/* Desktop View: Horizontal Scroll with Fade */}
        <div className="hidden md:block relative group">
          <div
            className="flex space-x-6 overflow-x-auto no-scrollbar scroll-smooth pb-8"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              maskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)'
            }}
          >
            {mockExpert.map((collection, index) => (
              <div
                key={collection.id}
                className={`flex-shrink-0 relative rounded-3xl overflow-hidden group/card transition-all duration-300 ${index === 0 ? 'w-[600px] h-[450px]' : 'w-[400px] h-[450px]'
                  }`}
              >
                {/* Background Image */}
                <img
                  src={collection.image}
                  alt={collection.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                {/* Card Content */}
                <div className="absolute inset-0 p-8 flex flex-col justify-end">
                  <h3 className="text-4xl font-bold mb-4 text-white">{collection.title}</h3>

                  <div className="flex items-center space-x-3 mb-4">
                    <img
                      src={collection.creator.avatar}
                      alt={collection.creator.name}
                      className="w-8 h-8 rounded-full border border-gray-600"
                    />
                    <span className="text-sm font-medium text-white">{collection.creator.name}</span>
                  </div>

                  <p className="text-gray-300 text-sm mb-6 line-clamp-2 max-w-sm">
                    {collection.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <button className="px-6 py-2.5 text-white bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-sm font-medium hover:bg-white/20 transition-colors">
                      Buy now
                    </button>

                    <div className="flex space-x-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Price</span>
                        <span className="text-sm text-white font-bold">{collection.price}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Highest Bid</span>
                        <span className="text-sm text-white font-bold">{collection.highestBid}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Scroll Fade Overlay (Visual only, pointer events none) */}
          <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-black to-transparent pointer-events-none" />
        </div>

        {/* Mobile View: Swipable Slider with Pagination */}
        <div className="md:hidden">
          <div className="relative">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${activeSlide * 100}%)` }}
            >
              {mockExpert.map((collection) => (
                <div key={collection.id} className="w-full flex-shrink-0 px-2">
                  <div className="relative rounded-3xl overflow-hidden h-[500px]">
                    <img
                      src={collection.image}
                      alt={collection.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                    <div className="absolute inset-0 p-6 flex flex-col justify-end">
                      <h3 className="text-3xl font-bold mb-4">{collection.title}</h3>
                      <div className="flex items-center space-x-3 mb-4">
                        <img src={collection.creator.avatar} alt={collection.creator.name} className="w-8 h-8 rounded-full border border-gray-600" />
                        <span className="text-sm">{collection.creator.name}</span>
                      </div>
                      <p className="text-gray-300 text-xs mb-6 line-clamp-3">
                        {collection.description}
                      </p>
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 uppercase font-mono">Price</span>
                            <span className="text-sm font-bold">{collection.price}</span>
                          </div>
                          <div className="flex flex-col text-right">
                            <span className="text-[10px] text-gray-500 uppercase font-mono">Highest Bid</span>
                            <span className="text-sm font-bold">{collection.highestBid}</span>
                          </div>
                        </div>
                        <button className="w-full py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-sm font-bold">
                          Buy now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Dots */}
            <div className="flex justify-center mt-6 space-x-2">
              {mockExpert.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveSlide(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${activeSlide === index ? 'w-8 bg-purple-600' : 'w-2 bg-gray-600'
                    }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
