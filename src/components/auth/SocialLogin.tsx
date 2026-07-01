"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface SocialLoginProps {
  /** Called after a successful sign-in before the redirect fires */
  onSuccess?: () => void;
  /** Destination to redirect after successful Google sign-in. Defaults to /marketplace */
  callbackUrl?: string;
  /** Optional extra class names for the outer wrapper */
  className?: string;
}

/**
 * Renders social login options (currently Google) for the login/sign-up pages.
 * Uses next-auth `signIn` to initiate the OAuth flow.
 */
export default function SocialLogin({
  onSuccess,
  callbackUrl = "/marketplace",
  className = "",
}: SocialLoginProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { status } = useSession();
  const router = useRouter();

  // If the user is already authenticated, redirect immediately
  if (status === "authenticated") {
    router.replace(callbackUrl);
    return null;
  }

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await signIn("google", {
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        setError("Sign in failed. Please try again.");
        return;
      }

      if (result?.ok) {
        onSuccess?.();
        router.push(result.url ?? callbackUrl);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col items-center gap-3 w-full ${className}`}>
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        aria-label="Continue with Google"
        className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all text-white font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          /* Spinner */
          <svg
            className="animate-spin h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          /* Google logo */
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        )}
        {loading ? "Signing in…" : "Continue with Google"}
      </button>

      {error && (
        <p role="alert" className="text-red-400 text-xs text-center mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
