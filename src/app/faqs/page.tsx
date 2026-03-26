"use client";

import { useState } from "react";
import { FAQSearch } from "./components/FAQSearch";
import { FAQAccordion } from "./components/FAQAccordion";
import { faqsData } from "./data/faqs";

export default function FAQsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFAQs = faqsData.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-16 md:py-24 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Find answers to common questions about using the platform.
        </p>
      </div>

      <FAQSearch value={searchQuery} onChange={setSearchQuery} />
      
      <div className="mt-8">
        <FAQAccordion faqs={filteredFAQs} />
      </div>
    </div>
  );
}
