"use client"

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export const FilterDropdown = ({
    value,
    options,
    onChange
}: {
    value: string;
    options: string[];
    onChange: (value: string) => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-3 py-2 bg-[#1E0D2B] font-bold rounded-lg hover:border-gray-600 transition-colors text-sm text-[#F3F4F6]/70"
            >
                <span>{value}</span>
                {!isOpen ? <ChevronDown fontWeight={600} className='w-5 h-5 font-bold' /> : <ChevronUp fontWeight={600} className='w-5 h-5 font-bold' />}

            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute left-0 right-0 mt-2 p-2 w-[180px] bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-20 py-1">
                        {options.map((option) => (
                            <button
                                key={option}
                                onClick={() => {
                                    onChange(option);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 mb-2 text-sm transition-colors rounded-md ${value === option
                                    ? 'bg-gray-600/60 text-purple-400'
                                    : 'text-gray-300 hover:bg-gray-800'
                                    }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
