"use client";

/**
 * OnboardingTour
 *
 * A fully custom, zero-dependency interactive tour.
 * It reads `data-tour` attributes from the DOM to anchor tooltips
 * next to the relevant UI elements.
 *
 * Steps are defined in OnboardingProvider › TOUR_STEPS.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { TOUR_STEPS, useOnboarding } from "@/providers/OnboardingProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TooltipPosition {
  top: number;
  left: number;
  placement: "top" | "bottom" | "left" | "right";
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOOLTIP_WIDTH = 320;
const TOOLTIP_OFFSET = 14; // px gap between target and tooltip
const SPOTLIGHT_PADDING = 8; // px padding around the highlighted element

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcPosition(
  targetRect: DOMRect,
  placement: "top" | "bottom" | "left" | "right"
): TooltipPosition {
  const { innerWidth: vw, innerHeight: vh } = window;
  let top = 0;
  let left = 0;
  let actualPlacement = placement;

  switch (placement) {
    case "bottom":
      top = targetRect.bottom + TOOLTIP_OFFSET;
      left = targetRect.left + targetRect.width / 2 - TOOLTIP_WIDTH / 2;
      // Flip to top if overflows bottom
      if (top + 180 > vh) {
        top = targetRect.top - 180 - TOOLTIP_OFFSET;
        actualPlacement = "top";
      }
      break;
    case "top":
      top = targetRect.top - 180 - TOOLTIP_OFFSET;
      left = targetRect.left + targetRect.width / 2 - TOOLTIP_WIDTH / 2;
      // Flip to bottom if overflows top
      if (top < 8) {
        top = targetRect.bottom + TOOLTIP_OFFSET;
        actualPlacement = "bottom";
      }
      break;
    case "right":
      top = targetRect.top + targetRect.height / 2 - 90;
      left = targetRect.right + TOOLTIP_OFFSET;
      if (left + TOOLTIP_WIDTH > vw - 8) {
        left = targetRect.left - TOOLTIP_WIDTH - TOOLTIP_OFFSET;
        actualPlacement = "left";
      }
      break;
    case "left":
      top = targetRect.top + targetRect.height / 2 - 90;
      left = targetRect.left - TOOLTIP_WIDTH - TOOLTIP_OFFSET;
      if (left < 8) {
        left = targetRect.right + TOOLTIP_OFFSET;
        actualPlacement = "right";
      }
      break;
  }

  // Clamp horizontally
  left = Math.max(8, Math.min(left, vw - TOOLTIP_WIDTH - 8));
  // Clamp vertically
  top = Math.max(8, top);

  return { top, left, placement: actualPlacement };
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

interface TooltipProps {
  position: TooltipPosition;
  step: (typeof TOUR_STEPS)[0];
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

function Tooltip({
  position,
  step,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
}: TooltipProps) {
  const isLast = stepIndex === totalSteps - 1;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={`Onboarding step ${stepIndex + 1} of ${totalSteps}: ${step.title}`}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: TOOLTIP_WIDTH,
        zIndex: 10000,
      }}
      className="rounded-xl border border-violet-500/40 bg-zinc-900/95 shadow-2xl backdrop-blur-sm"
    >
      {/* Arrow indicator */}
      <ArrowIndicator placement={position.placement} />

      <div className="p-4">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-violet-400" aria-hidden />
            <h3 className="text-sm font-semibold text-zinc-100 leading-snug">
              {step.title}
            </h3>
          </div>
          <button
            onClick={onSkip}
            className="shrink-0 rounded p-1 text-zinc-500 transition-colors hover:text-zinc-300"
            aria-label="Skip onboarding tour"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body */}
        <p className="mb-4 text-xs leading-relaxed text-zinc-400">
          {step.content}
        </p>

        {/* Progress dots */}
        <div className="mb-4 flex items-center justify-center gap-1.5" aria-hidden>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={`block h-1.5 rounded-full transition-all ${
                i === stepIndex
                  ? "w-4 bg-violet-500"
                  : "w-1.5 bg-zinc-700"
              }`}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onSkip}
            className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-300 transition-colors"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                onClick={onPrev}
                className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                Back
              </button>
            )}
            <button
              onClick={onNext}
              className="flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-500"
            >
              {isLast ? "Finish" : "Next"}
              {!isLast && <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Arrow ────────────────────────────────────────────────────────────────────

function ArrowIndicator({ placement }: { placement: TooltipPosition["placement"] }) {
  const base = "absolute w-2.5 h-2.5 rotate-45 border bg-zinc-900 border-violet-500/40";

  const positionMap = {
    bottom: "top-[-5px] left-1/2 -translate-x-1/2 border-r-transparent border-b-transparent",
    top: "bottom-[-5px] left-1/2 -translate-x-1/2 border-l-transparent border-t-transparent",
    right: "left-[-5px] top-1/2 -translate-y-1/2 border-r-transparent border-t-transparent",
    left: "right-[-5px] top-1/2 -translate-y-1/2 border-l-transparent border-b-transparent",
  };

  return <span aria-hidden className={`${base} ${positionMap[placement]}`} />;
}

// ─── Spotlight overlay ────────────────────────────────────────────────────────

function SpotlightOverlay({
  spotlight,
  onSkip,
}: {
  spotlight: SpotlightRect | null;
  onSkip: () => void;
}) {
  if (!spotlight) {
    // Full dark overlay when target not found
    return (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[1px]"
        style={{ zIndex: 9998 }}
        onClick={onSkip}
        aria-hidden
      />
    );
  }

  const { top, left, width, height } = spotlight;

  // We create four rectangles that surround the highlighted element
  const rects = {
    top: { top: 0, left: 0, width: "100%", height: top },
    bottom: { top: top + height, left: 0, width: "100%", height: `calc(100vh - ${top + height}px)` },
    left: { top, left: 0, width: left, height },
    right: { top, left: left + width, width: `calc(100vw - ${left + width}px)`, height },
  } as const;

  return (
    <>
      {(Object.keys(rects) as Array<keyof typeof rects>).map((side) => (
        <div
          key={side}
          aria-hidden
          style={{
            position: "fixed",
            ...rects[side],
            backgroundColor: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(1px)",
            zIndex: 9998,
          }}
          onClick={onSkip}
        />
      ))}
      {/* Highlight ring around the target */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: top - SPOTLIGHT_PADDING,
          left: left - SPOTLIGHT_PADDING,
          width: width + SPOTLIGHT_PADDING * 2,
          height: height + SPOTLIGHT_PADDING * 2,
          borderRadius: 10,
          boxShadow: "0 0 0 2px rgba(139,92,246,0.7), 0 0 24px 4px rgba(139,92,246,0.25)",
          zIndex: 9999,
          pointerEvents: "none",
        }}
      />
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingTour() {
  const { isTourActive, currentStep, totalSteps, nextStep, prevStep, skipTour } =
    useOnboarding();

  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const rafRef = useRef<number | null>(null);

  // Ensure portal only renders on client
  useEffect(() => {
    setMounted(true);
  }, []);

  const positionForStep = useCallback((stepIndex: number) => {
    const step = TOUR_STEPS[stepIndex];
    if (!step) return;

    const target = document.querySelector<HTMLElement>(step.target);
    if (!target) {
      setSpotlight(null);
      // Centre the tooltip in the viewport when target isn't found
      setTooltipPos({
        top: window.innerHeight / 2 - 100,
        left: window.innerWidth / 2 - TOOLTIP_WIDTH / 2,
        placement: "bottom",
      });
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "center" });

    // Use RAF so layout has settled after scroll
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = target.getBoundingClientRect();
      setSpotlight({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
      setTooltipPos(calcPosition(rect, step.placement ?? "bottom"));
    });
  }, []);

  useEffect(() => {
    if (!isTourActive) {
      setTooltipPos(null);
      setSpotlight(null);
      return;
    }
    positionForStep(currentStep);
  }, [isTourActive, currentStep, positionForStep]);

  // Re-calculate on window resize
  useEffect(() => {
    if (!isTourActive) return;
    const handler = () => positionForStep(currentStep);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [isTourActive, currentStep, positionForStep]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!mounted || !isTourActive || !tooltipPos) return null;

  const step = TOUR_STEPS[currentStep];

  return createPortal(
    <>
      <SpotlightOverlay spotlight={spotlight} onSkip={skipTour} />
      <Tooltip
        position={tooltipPos}
        step={step}
        stepIndex={currentStep}
        totalSteps={totalSteps}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={skipTour}
      />
    </>,
    document.body
  );
}
