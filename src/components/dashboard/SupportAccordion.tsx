"use client"
import React, { useState } from "react"
import { SupportAccordionItem } from "./SupportAccordionItem"

export interface FAQItem {
    id: string
    title: string
    subtitle: string
    content: React.ReactNode
}

interface SupportAccordionProps {
    items: FAQItem[]
    defaultOpenId?: string
}

/** Single-open FAQ accordion container rendering {@link SupportAccordionItem} entries. */
export const SupportAccordion: React.FC<SupportAccordionProps> = ({
    items,
    defaultOpenId,
}) => {
    const [openId, setOpenId] = useState<string | null>(defaultOpenId || null)

    const handleToggle = (id: string) => {
        setOpenId((prev) => (prev === id ? null : id))
    }

    return (
        <div className="flex flex-col w-full bg-background rounded-xl border border-border overflow-hidden">
            {items.map((item) => (
                <SupportAccordionItem
                    key={item.id}
                    title={item.title}
                    subtitle={item.subtitle}
                    content={item.content}
                    isOpen={openId === item.id}
                    onToggle={() => handleToggle(item.id)}
                />
            ))}
        </div>
    )
}
