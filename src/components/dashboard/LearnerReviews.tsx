"use client"

import { cn } from "@/components/ui/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar"

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

function ReviewItem({ name, review, rating, avatar }: Review) {
  return (
    <div className="flex items-center justify-between py-6 border-b border-white/5 last:border-0 gap-4">
      <div className="flex items-center gap-4 flex-1">
        <Avatar className="w-10 h-10 rounded-full border border-white/10 shrink-0">
          <AvatarImage src={avatar} alt={name} />
          <AvatarFallback>{name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-white/90">{name}</span>
          <p className="text-sm text-white/60 leading-relaxed max-w-2xl">{review}</p>
        </div>
      </div>
      
      <div className="flex flex-col items-end shrink-0 pt-1 md:pt-0">
        <span className="text-xs text-white/40 mb-0.5 font-medium">Rating</span>
        <span className="text-base text-white font-bold">{rating}</span>
      </div>
    </div>
  )
}

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
            name={review.name}
            review={review.review}
            rating={review.rating}
            avatar={review.avatar}
          />
        ))}
      </div>
    </div>
  )
}
