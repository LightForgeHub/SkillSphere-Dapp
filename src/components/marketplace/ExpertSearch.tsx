"use client";

import React, { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { Search, X, Tag } from "lucide-react";

// ── Tag database ──────────────────────────────────────────────────────────────
// In production this would be fetched from the API; for now it is a static list
// covering the most common skill tags on the platform.
const ALL_TAGS = [
  "React", "Next.js", "TypeScript", "JavaScript", "Node.js",
  "Rust", "Solidity", "Stellar", "Soroban", "Blockchain",
  "Python", "Django", "FastAPI", "Machine Learning", "AI",
  "Web3", "Smart Contracts", "DeFi", "NFT", "Tokenomics",
  "UI/UX Design", "Figma", "Tailwind CSS", "GraphQL", "REST API",
  "Docker", "Kubernetes", "AWS", "DevOps", "CI/CD",
  "Go", "Rust Systems", "C++", "WebAssembly", "WASM",
  "Product Management", "Agile", "Scrum", "Data Engineering",
  "PostgreSQL", "MongoDB", "Redis", "Prisma", "SQL",
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface ExpertSearchProps {
  /** Called whenever the active tag filter list changes */
  onTagsChange?: (tags: string[]) => void;
  /** Called when the text query changes (non-tag search) */
  onQueryChange?: (query: string) => void;
  /** Placeholder text for the input */
  placeholder?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ExpertSearch({
  onTagsChange,
  onQueryChange,
  placeholder = 'Search experts or add tags (e.g. "React", "Stellar")…',
}: ExpertSearchProps) {
  const [inputValue, setInputValue] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Derive suggestions from current input ──────────────────────────────────
  useEffect(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    const lower = trimmed.toLowerCase();
    const matches = ALL_TAGS.filter(
      (tag) =>
        tag.toLowerCase().includes(lower) && !activeTags.includes(tag)
    ).slice(0, 8); // cap at 8 suggestions
    setSuggestions(matches);
    setHighlightedIndex(-1);
    setIsOpen(matches.length > 0);
  }, [inputValue, activeTags]);

  // ── Close dropdown when clicking outside ──────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Notify parent of tag changes ──────────────────────────────────────────
  useEffect(() => {
    onTagsChange?.(activeTags);
  }, [activeTags, onTagsChange]);

  // ── Notify parent of query changes ───────────────────────────────────────
  useEffect(() => {
    onQueryChange?.(inputValue);
  }, [inputValue, onQueryChange]);

  // ── Add a tag to the active filter list ──────────────────────────────────
  const addTag = useCallback(
    (tag: string) => {
      if (!activeTags.includes(tag)) {
        setActiveTags((prev) => [...prev, tag]);
      }
      setInputValue("");
      setIsOpen(false);
      inputRef.current?.focus();
    },
    [activeTags]
  );

  // ── Remove a tag ──────────────────────────────────────────────────────────
  const removeTag = useCallback((tag: string) => {
    setActiveTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  // ── Keyboard navigation ───────────────────────────────────────────────────
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        addTag(suggestions[highlightedIndex]);
      } else if (inputValue.trim()) {
        // If no suggestion selected, add the raw text as a tag if it matches
        const exactMatch = ALL_TAGS.find(
          (t) => t.toLowerCase() === inputValue.trim().toLowerCase()
        );
        if (exactMatch) {
          addTag(exactMatch);
        }
        // Otherwise treat as a free-text query — just close suggestions
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "Backspace" && inputValue === "" && activeTags.length > 0) {
      // Backspace on empty input removes the last tag
      setActiveTags((prev) => prev.slice(0, -1));
    }
  };

  // ── Scroll highlighted suggestion into view ──────────────────────────────
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  const clearAll = () => {
    setActiveTags([]);
    setInputValue("");
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full" role="search">
      {/* Input pill container */}
      <div
        className={`flex flex-wrap items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600/10 to-pink-600/10 border rounded-xl transition-all duration-200 cursor-text ${
          isOpen
            ? "border-purple-500/60 shadow-lg shadow-purple-500/10"
            : "border-purple-500/30 hover:border-purple-500/50"
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        <Search size={18} className="text-gray-500 flex-shrink-0" />

        {/* Active tag pills */}
        {activeTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-600/30 border border-purple-500/50 rounded-full text-sm font-medium text-purple-200"
          >
            <Tag size={12} className="flex-shrink-0" />
            {tag}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              aria-label={`Remove tag ${tag}`}
              className="ml-0.5 text-purple-300 hover:text-white transition-colors"
            >
              <X size={13} />
            </button>
          </span>
        ))}

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={activeTags.length === 0 ? placeholder : "Add another tag…"}
          aria-label="Search experts or enter tags"
          aria-autocomplete="list"
          aria-controls={isOpen ? "tag-suggestions" : undefined}
          aria-activedescendant={
            highlightedIndex >= 0 ? `suggestion-${highlightedIndex}` : undefined
          }
          aria-expanded={isOpen}
          role="combobox"
          className="flex-1 min-w-[160px] bg-transparent outline-none text-sm placeholder-gray-500 text-white"
        />

        {/* Clear all */}
        {(activeTags.length > 0 || inputValue) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearAll();
            }}
            aria-label="Clear all filters"
            className="ml-auto text-gray-500 hover:text-white transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {isOpen && (
        <ul
          id="tag-suggestions"
          ref={listRef}
          role="listbox"
          aria-label="Tag suggestions"
          className="absolute z-50 w-full mt-2 bg-[#1a0f2e] border border-purple-500/30 rounded-xl shadow-2xl shadow-black/40 overflow-hidden max-h-56 overflow-y-auto"
        >
          {suggestions.map((tag, i) => {
            const lower = inputValue.trim().toLowerCase();
            const matchStart = tag.toLowerCase().indexOf(lower);
            const before = tag.slice(0, matchStart);
            const match = tag.slice(matchStart, matchStart + lower.length);
            const after = tag.slice(matchStart + lower.length);

            return (
              <li
                key={tag}
                id={`suggestion-${i}`}
                role="option"
                aria-selected={i === highlightedIndex}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent input blur
                  addTag(tag);
                }}
                onMouseEnter={() => setHighlightedIndex(i)}
                className={`flex items-center gap-2 px-4 py-2.5 cursor-pointer text-sm transition-colors ${
                  i === highlightedIndex
                    ? "bg-purple-600/30 text-white"
                    : "text-gray-300 hover:bg-white/5"
                }`}
              >
                <Tag size={13} className="text-purple-400 flex-shrink-0" />
                <span>
                  {before}
                  <strong className="text-purple-300 font-semibold">{match}</strong>
                  {after}
                </span>
                <span className="ml-auto text-xs text-gray-600">↵ to add</span>
              </li>
            );
          })}
        </ul>
      )}

      {/* Active tag summary (below input) */}
      {activeTags.length > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          Filtering by{" "}
          <span className="text-purple-400 font-medium">
            {activeTags.join(", ")}
          </span>
          {" "}—{" "}
          <button
            onClick={clearAll}
            className="text-gray-400 hover:text-white underline transition-colors"
          >
            clear all
          </button>
        </p>
      )}
    </div>
  );
}
