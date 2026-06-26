"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/ui/utils";

interface LiveCounterProps {
  ratePerSecond: number;
  onTotalChange?: (total: number) => void;
  className?: string;
}

export function LiveCounter({
  ratePerSecond,
  onTotalChange,
  className,
}: LiveCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const totalRef = useRef(0);
  const startRef = useRef(Date.now());
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    startRef.current = Date.now();
    totalRef.current = 0;

    const tick = () => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const total = elapsed * ratePerSecond;
      totalRef.current = total;
      setDisplayValue(total);
      onTotalChange?.(total);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [ratePerSecond, onTotalChange]);

  const formatXLM = (value: number): string => {
    if (value < 0.00001) return value.toFixed(10);
    if (value < 0.01) return value.toFixed(7);
    if (value < 1) return value.toFixed(5);
    return value.toFixed(4);
  };

  const parts = formatXLM(displayValue).split(".");

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <p className="text-sm font-medium text-white/50 tracking-wide uppercase">
        Streaming
      </p>

      <div className="flex items-baseline gap-0.5 font-mono tracking-tighter tabular-nums">
        <span className="text-6xl font-bold text-white">{parts[0]}</span>
        {parts[1] && (
          <span className="text-4xl font-semibold text-white/60">.{parts[1]}</span>
        )}
        <span className="text-lg font-medium text-white/40 ml-1">XLM</span>
      </div>

      <div className="flex items-center gap-2 text-sm text-white/50">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
        <span className="text-white/30">|</span>
        <span>
          {ratePerSecond < 0.00001
            ? `${(ratePerSecond * 1_000_000).toFixed(2)} µXLM/s`
            : `${ratePerSecond.toFixed(7)} XLM/s`}
        </span>
      </div>
    </div>
  );
}
