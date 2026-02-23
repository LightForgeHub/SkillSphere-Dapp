"use client"
import React from "react"
import { cn } from "@/components/ui/utils"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"

// Note: Framer motion is not in package.json, so I'll use CSS transitions instead
// to stick to the existing tech stack as much as possible, or I can try to use 
// Radix UI if I want to be more standard, but the user requested a reusable SupportAccordion.
// I'll stick to a clean implementation with React state and CSS.

interface SupportAccordionItemProps {
    title: string
    subtitle: string
    content: React.ReactNode
    isOpen: boolean
    onToggle: () => void
}

export const SupportAccordionItem: React.FC<SupportAccordionItemProps> = ({
    title,
    subtitle,
    content,
    isOpen,
    onToggle,
}) => {
    return (
        <div className="border-b border-[#2D2E2D]">
            <div
                className={cn(
                    "flex items-center justify-between py-[12px] px-[24px] cursor-pointer transition-colors duration-200 group hover:bg-[#1A1A1A]",
                    isOpen && "bg-[#1A1A1A]/50"
                )}
                onClick={onToggle}
            >
                <div className="flex flex-col gap-[4px] flex-1 mr-4">
                    <div className="flex items-center gap-2">
                        <span className="text-[14px] font-medium text-[#CCCCCC] font-ubuntu leading-[17px]">
                            {title}
                            <span className="text-[#888888] ml-2 font-normal">({subtitle})</span>
                        </span>
                    </div>
                </div>

                <button
                    className={cn(
                        "flex items-center justify-center px-[12px] py-[6px] rounded-[48px] border border-[#2D2E2D] min-w-[64px] h-[26px] transition-all duration-200 hover:border-[#444444]",
                        isOpen && "bg-white border-white"
                    )}
                >
                    <span
                        className={cn(
                            "text-[12px] font-normal leading-[14px]",
                            isOpen ? "text-black" : "text-white"
                        )}
                    >
                        {isOpen ? "Close" : "Expand"}
                    </span>
                </button>
            </div>

            <div
                className={cn(
                    "grid transition-all duration-300 ease-in-out overflow-hidden",
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
            >
                <div className="overflow-hidden">
                    <div className="px-[24px] pb-[16px] text-[#A0A0A0] text-[14px] leading-relaxed">
                        {content}
                    </div>
                </div>
            </div>
        </div>
    )
}
