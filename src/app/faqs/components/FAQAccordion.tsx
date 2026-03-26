"use client";

import { useState } from "react";
import { FAQItem } from "./FAQItem";
import { type FAQ } from "../data/faqs";

interface FAQAccordionProps {
  faqs: FAQ[];
}

export function FAQAccordion({ faqs }: FAQAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  if (faqs.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        No questions found matching your search.
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-2">
      {faqs.map((faq) => (
        <FAQItem
          key={faq.id}
          question={faq.question}
          answer={faq.answer}
          isOpen={openId === faq.id}
          onClick={() => toggleItem(faq.id)}
        />
      ))}
    </div>
  );
}
