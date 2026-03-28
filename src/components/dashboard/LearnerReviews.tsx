"use client"

import { cn } from "@/components/ui/utils"
import ReviewItem from "./ReviewItem"

export interface Review {
  name: string
  review: string
  rating: string
  avatar?: string
}

interface LearnerReviewsProps {
  reviews?: Review[]
  className?: string
}

const mockReviews: Review[] = [
  {
    name: "Benedict",
    review: "The course is a must take for anyone looking to start their tech journey in design. A solid 5/5 rating for me",
    rating: "5/5",
    avatar: "/avatarPlaceholder1.jpg",
  },
  {
    name: "Flora",
    review: "The course is a must take for anyone looking to start their tech journey in design. A solid 5/5 rating for me",
    rating: "5/5",
    avatar: "/avatarPlaceholder2.png",
  },
]

export default function LearnerReviews({
  reviews = mockReviews,
  className,
}: LearnerReviewsProps) {
  return (
    <div className={cn("flex flex-col items-start gap-3 w-full", className)}>
      {/* Title */}
      <h2 className="text-lg font-semibold text-white">Learners Reviews</h2>

      {/* Reviews List */}
      <div className="w-full bg-[#110719] rounded-lg border border-white/10 p-4 md:p-6">
        {reviews.map((review, index) => (
          <ReviewItem
            key={`${review.name}-${index}`}
            avatar={review.avatar || ""}
            name={review.name}
            text={review.review}
            rating={review.rating}
          />
        ))}
      </div>
    </div>
  )
}
