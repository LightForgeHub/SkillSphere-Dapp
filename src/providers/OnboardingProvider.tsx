"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const STORAGE_KEY = "skillsphere_onboarding_done";

export interface TourStep {
  /** CSS selector or data-tour attribute value used to anchor the tooltip */
  target: string;
  title: string;
  content: string;
  /** Preferred placement of the tooltip relative to the target */
  placement?: "top" | "bottom" | "left" | "right";
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: "[data-tour='wallet-connect']",
    title: "Connect Your Freighter Wallet",
    content:
      "Click here to connect your Freighter browser extension. Freighter is a non-custodial Stellar wallet — you keep full control of your keys.",
    placement: "bottom",
  },
  {
    target: "[data-tour='expert-search']",
    title: "Find an Expert",
    content:
      "Browse and search for verified experts by skill, rating, or availability. Filter by technology stack or hourly rate to narrow down the perfect match.",
    placement: "bottom",
  },
  {
    target: "[data-tour='escrow-flow']",
    title: "Escrow Funding Flow",
    content:
      "Your payment is held in a secure on-chain escrow contract during the session. Funds are only released to the expert once you confirm the session was completed successfully.",
    placement: "top",
  },
];

interface OnboardingContextValue {
  isTourActive: boolean;
  currentStep: number;
  totalSteps: number;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Auto-start the tour on first visit
  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // Small delay so the page has time to paint
      const t = setTimeout(() => setIsTourActive(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const skipTour = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsTourActive(false);
    setCurrentStep(0);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((s) => {
      const next = s + 1;
      if (next >= TOUR_STEPS.length) {
        localStorage.setItem(STORAGE_KEY, "true");
        setIsTourActive(false);
        return 0;
      }
      return next;
    });
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  const startTour = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentStep(0);
    setIsTourActive(true);
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        isTourActive,
        currentStep,
        totalSteps: TOUR_STEPS.length,
        startTour,
        nextStep,
        prevStep,
        skipTour,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used inside <OnboardingProvider>");
  }
  return ctx;
}
