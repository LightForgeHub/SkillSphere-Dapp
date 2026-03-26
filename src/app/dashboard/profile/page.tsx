"use client"

import React from "react"
import CourseCard from "@/components/dashboard/CourseCard"
import ReviewItem from "@/components/dashboard/ReviewItem"
import ProfileHeader from "@/components/dashboard/ProfileHeader"

const COURSES = [
  {
    thumbnail: "/prod.svg",
    title: "Design made simple",
    description: "Video/Note guides available",
    enrollment: "20 Learners",
    rating: "4.5",
    status: "Published" as const,
  }
]

const REVIEWS = [
  {
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop",
    name: "Benedict",
    text: "The course is a must take for anyone looking to start their tech journey in design. A solid 5/5 rating for me",
    rating: "5",
  }
]

export default function ProfilePage() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Profile Header */}
      <ProfileHeader
        name="Miss Flora Osatuyi"
        role="Product Designer"
        avatarUrl="/newProfile.svg"
        walletAddress="0x411ad3c6d3c6d3c6d3c6d3c6d3c6d3c6d3c6d3c6"
      />

      {/* Bio Box */}
      <div className="bg-[#1C1129]/50 border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-sm mb-12">
        <p className="text-white/70 text-sm md:text-base leading-relaxed">
          Flora is a talented product designer with 3+ years of experience creating functional, visually polished (FPV) designs. She also tutors aspiring designers, simplifying UI and product design concepts through hands-on learning. Passionate about blending creativity and usability, Flora helps her students and projects thrive in today&apos;s fast-paced digital world.
        </p>
      </div>

      {/* Courses Offered */}
      <section className="mb-16">
        <h2 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
          Courses Offered
        </h2>
        <div className="space-y-6">
          {COURSES.map((course, index) => (
            <CourseCard key={index} {...course} />
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section>
        <h2 className="text-xl font-bold text-white mb-2">Reviews</h2>
        <div className="divide-y divide-white/5">
          {REVIEWS.map((review, index) => (
            <ReviewItem key={index} {...review} />
          ))}
        </div>
      </section>
    </div>
  )
}
