"use client";

import { useState } from "react";
import { CreateCourseCTA } from "@/components/dashboard/CreateCourseCTA";
import CourseCard from "@/components/dashboard/CourseCard";
import image1 from "../../../../public/Image (1).png";
import image2 from "../../../../public/Image (2).png"; 

const COURES_DATA = [
  {
    id: 1,
    title: "Become a Web3 Developer: A beginners approach",
    thumbnail: image1.src,
    description: "Learn the fundamentals of blockchain development.",
    enrollment: "20 Learners",
    rating: "4.5",
    status: "Published" as const,
  },
  {
    id: 2,
    title: "Design made simple",
    thumbnail: image2.src,
    description: "A complete guide to modern interface design.",
    enrollment: "15 Learners",
    rating: "N/A",
    status: "Draft" as const,
  },
  {
    id: 3,
    title: "Smart Contract Security",
    thumbnail: image1.src,
    description: "Advanced techniques for auditing smart contracts.",
    enrollment: "45 Learners",
    rating: "4.8",
    status: "Published" as const,
  },
  {
    id: 4,
    title: "Frontend Excellence with React",
    thumbnail: image2.src,
    description: "Master React patterns and hooks for scalable apps.",
    enrollment: "32 Learners",
    rating: "4.2",
    status: "Published" as const,
  },
  {
    id: 5,
    title: "Introduction to Blockchain",
    thumbnail: image1.src,
    description: "Understand the technology behind decentralization.",
    enrollment: "50 Learners",
    rating: "4.9",
    status: "Published" as const,
  },
  {
    id: 6,
    title: "Advanced UI/UX Patterns",
    thumbnail: image2.src,
    description: "Deep dive into user behavior and interface logic.",
    enrollment: "25 Learners",
    rating: "4.6",
    status: "Draft" as const,
  },
];

const INITIAL_VISIBLE_COUNT = 2;
const LOAD_MORE_INCREMENT = 2;

export default function CoursesPage() {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  const handleLoadMore = () => {
    setVisibleCount(prev => Math.min(prev + LOAD_MORE_INCREMENT, COURES_DATA.length));
  };

  const handleViewLess = () => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  };

  const hasMore = visibleCount < COURES_DATA.length;
  const showViewLess = visibleCount >= COURES_DATA.length && COURES_DATA.length > INITIAL_VISIBLE_COUNT;

  return (
    <div className="space-y-12 pb-12">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">My Courses</h3>
        </div>

        <div className="space-y-4">
          {COURES_DATA.slice(0, visibleCount).map((course) => (
            <CourseCard key={course.id} {...course} />
          ))}
        </div>

        <div className="flex justify-end mt-4">
          {hasMore ? (
            <button 
              onClick={handleLoadMore}
              className="text-sm font-medium text-[#94a3b8] hover:text-white transition-colors"
            >
              View More
            </button>
          ) : showViewLess ? (
            <button 
              onClick={handleViewLess}
              className="text-sm font-medium text-[#94a3b8] hover:text-white transition-colors"
            >
              View Less
            </button>
          ) : null}
        </div>
      </div>

      <CreateCourseCTA />
    </div>
  )
}


