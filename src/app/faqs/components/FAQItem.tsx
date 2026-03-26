import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}

export function FAQItem({ question, answer, isOpen, onClick }: FAQItemProps) {
  return (
    <div className="border border-border rounded-lg bg-card mb-4 overflow-hidden transition-all hover:border-primary/50">
      <button
        type="button"
        className="flex w-full items-center justify-between p-5 text-left font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        onClick={onClick}
        aria-expanded={isOpen}
      >
        <span className="text-lg text-foreground">{question}</span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300",
            isOpen && "rotate-180 text-primary"
          )}
        />
      </button>
      
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="p-5 pt-0 text-base text-muted-foreground leading-relaxed">
            {answer}
          </div>
        </div>
      </div>
    </div>
  );
}
