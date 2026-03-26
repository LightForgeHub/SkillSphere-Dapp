import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";

interface FAQSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function FAQSearch({ value, onChange }: FAQSearchProps) {
  return (
    <div className="w-full max-w-xl mx-auto mb-10">
      <Input
        type="text"
        placeholder="Search for answers..."
        className="h-12 text-base rounded-full shadow-sm bg-card"
        leftIcon={<Search className="h-5 w-5" />}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
