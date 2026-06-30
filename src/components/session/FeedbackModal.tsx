"use client";

import { useState } from "react";
import { Star, Loader2, X } from "lucide-react";

interface FeedbackFormData {
  communication: number;
  accuracy: number;
  value: number;
  review: string;
}

interface FeedbackModalProps {
  expertName: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (feedback: FeedbackFormData) => Promise<void>;
}

const RATING_CATEGORIES = [
  {
    key: "communication" as const,
    label: "Communication",
    description: "How clear was the expert in explaining concepts?",
  },
  {
    key: "accuracy" as const,
    label: "Accuracy",
    description: "How accurate was the information provided?",
  },
  {
    key: "value" as const,
    label: "Value",
    description: "Did the session provide good value for the time spent?",
  },
];

export default function FeedbackModal({
  expertName,
  isOpen,
  onClose,
  onSubmit,
}: FeedbackModalProps) {
  const [formData, setFormData] = useState<FeedbackFormData>({
    communication: 0,
    accuracy: 0,
    value: 0,
    review: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleRating = (category: keyof FeedbackFormData, rating: number) => {
    setFormData((prev) => ({
      ...prev,
      [category]: rating,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      formData.communication === 0 ||
      formData.accuracy === 0 ||
      formData.value === 0
    ) {
      setError("Please rate all categories");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (onSubmit) {
        await onSubmit(formData);
      }
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setFormData({
          communication: 0,
          accuracy: 0,
          value: 0,
          review: "",
        });
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = ({
    rating,
    onChange,
  }: {
    rating: number;
    onChange: (value: number) => void;
  }) => (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className="transition-transform hover:scale-110"
          aria-label={`Rate ${value} stars`}
        >
          <Star
            className={`h-6 w-6 ${
              value <= rating
                ? "fill-amber-400 text-amber-400"
                : "text-zinc-600"
            }`}
          />
        </button>
      ))}
      <span className="ml-2 text-sm font-medium text-zinc-300">
        {rating > 0 ? `${rating}/5` : "Not rated"}
      </span>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="border-b border-zinc-800 px-6 py-4">
            <h2 className="text-lg font-bold text-zinc-100">
              Rate Your Session with {expertName}
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Your feedback helps maintain marketplace quality
            </p>
          </div>

          {/* Success message */}
          {success && (
            <div className="bg-emerald-500/20 border-b border-emerald-500/30 px-6 py-3">
              <p className="text-sm text-emerald-400">
                Thank you! Your feedback has been submitted.
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5 px-6 py-4">
            {/* Rating Categories */}
            {RATING_CATEGORIES.map((category) => (
              <div key={category.key} className="space-y-2">
                <div>
                  <label className="block text-sm font-semibold text-zinc-200">
                    {category.label}
                  </label>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {category.description}
                  </p>
                </div>
                <StarRating
                  rating={formData[category.key]}
                  onChange={(value) => handleRating(category.key, value)}
                />
              </div>
            ))}

            {/* Review textarea */}
            <div className="space-y-2">
              <label
                htmlFor="review"
                className="block text-sm font-semibold text-zinc-200"
              >
                Your Review
              </label>
              <textarea
                id="review"
                value={formData.review}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    review: e.target.value,
                  }))
                }
                placeholder="Share your experience with this expert (optional)"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 transition-colors hover:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
                rows={4}
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 border-t border-zinc-800 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-800/40 text-sm font-medium text-zinc-300 hover:bg-zinc-800/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || success}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-violet-600/80 hover:bg-violet-600 text-sm font-medium text-violet-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : success ? (
                  "Submitted"
                ) : (
                  "Submit Feedback"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
