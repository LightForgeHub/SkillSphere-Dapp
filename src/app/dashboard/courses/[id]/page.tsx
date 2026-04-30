"use client";

import React, { useState } from "react";
import OverviewTabContent from "@/components/dashboard/OverviewTabContent";
import SummaryTabContent from "@/components/dashboard/SummaryTabContent";
import ResourcesTabContent from "@/components/dashboard/ResourcesTabContent";
import TaskTabContent from "@/components/dashboard/TaskTabContent";
import CourseContentTrackerSidebar from "@/components/dashboard/CourseContentTrackerSidebar";
import CourseVideoPlayer from "@/components/dashboard/CourseVideoPlayer";
import { Checkbox } from "@/components/ui/Checkbox";
import image1 from "../../../../../public/Image (1).png";

type TabId = "overview" | "resources" | "tasks" | "summary";

const LESSONS = [
  { id: 1, title: "Lesson 1: Intro to Digital Technology", duration: "5 min" },
  { id: 2, title: "Lesson 2: Blockchain Basics", duration: "5 min" },
  { id: 3, title: "Lesson 3: Smart Contracts", duration: "5 min" },
  { id: 4, title: "Lesson 4: DeFi Fundamentals", duration: "5 min" },
  { id: 5, title: "Lesson 5: Web3 Wallets", duration: "5 min" },
  { id: 6, title: "Lesson 6: dApp Development", duration: "5 min" },
  { id: 7, title: "Lesson 7: Token Standards", duration: "5 min" },
];

interface Params {
  id: string;
}

const COURSE_DATA: Record<
  string,
  {
    title: string;
    currentLesson: string;
    image: string;
    overview: string;
    learningPoints: string[];
    targetAudience: string[];
    summary: string;
    keyTakeaways: string[];
    courseOutcomes: string[];
  }
> = {
  "1": {
    title: "Become a Web3 Developer: A beginners approach",
    currentLesson: "Intro to Digital Technology",
    image: image1.src,
    overview:
      "This comprehensive course introduces you to Web3 development fundamentals. Learn blockchain concepts, smart contracts, and decentralized application development from industry experts.",
    learningPoints: [
      "Understand blockchain architecture and consensus mechanisms",
      "Write and deploy smart contracts",
      "Build decentralized applications (dApps)",
      "Work with Web3 libraries and frameworks",
      "Implement security best practices in blockchain",
    ],
    targetAudience: [
      "Developers interested in blockchain and Web3 technologies",
      "Software engineers looking to transition into decentralized systems",
      "Entrepreneurs building blockchain-based products",
      "Technology enthusiasts wanting to understand Web3 deeply",
    ],
    summary:
      "This course provides a complete pathway from blockchain fundamentals to building production-ready Web3 applications. Through hands-on projects, you will gain practical experience and industry insights.",
    keyTakeaways: [
      "Master blockchain technology and its applications",
      "Develop smart contracts with Solidity",
      "Build full-stack dApps",
      "Understand Web3 security and best practices",
      "Deploy projects to live networks",
    ],
    courseOutcomes: [
      "Successfully build Web3 applications",
      "Understand blockchain ecosystems",
      "Implement secure smart contracts",
      "Deploy and manage decentralized systems",
      "Join Web3 developer communities",
    ],
  },
  "2": {
    title: "Design made simple",
    currentLesson: "Fundamentals of Visual Design",
    image: image1.src,
    overview:
      "A complete guide to modern interface design principles and practices. Learn how to create beautiful, functional, and user-centered digital experiences.",
    learningPoints: [
      "Master design fundamentals and color theory",
      "Create wireframes and prototypes",
      "Implement responsive design principles",
      "Understand user experience and user interface design",
      "Use industry-standard design tools effectively",
    ],
    targetAudience: [
      "Aspiring UX/UI designers",
      "Web developers wanting design skills",
      "Product managers improving design literacy",
      "Anyone interested in digital design",
    ],
    summary:
      "Learn modern design practices that create exceptional user experiences. From concept to implementation, master the tools and techniques used by leading design teams.",
    keyTakeaways: [
      "Design thinking and problem-solving",
      "Visual hierarchy and composition",
      "Prototyping and user testing",
      "Design systems and components",
      "Accessibility and inclusive design",
    ],
    courseOutcomes: [
      "Create professional design portfolio pieces",
      "Understand design thinking methodology",
      "Build responsive designs",
      "Conduct user research",
      "Lead design projects",
    ],
  },
};

export default function CourseDetailsPage({ params }: { params: Params }) {
  const courseData = COURSE_DATA[params.id];
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [currentLesson, setCurrentLesson] = useState(0);
  const [completed, setCompleted] = useState(false);

  if (!courseData) {
    return (
      <div className="text-center text-white py-12">
        <h1 className="text-2xl font-bold">Course not found</h1>
      </div>
    );
  }

  const handlePrevious = () =>
    setCurrentLesson((prev) => Math.max(0, prev - 1));
  const handleNext = () =>
    setCurrentLesson((prev) => Math.min(LESSONS.length - 1, prev + 1));

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb */}
      <div className="bg-[#1A1520] border border-[#1D1D1C] rounded-xl px-5 py-3 flex items-center gap-3 text-sm">
        <span className="text-white/60 truncate">{courseData.title}</span>
        <span className="text-white/30 shrink-0">|</span>
        <span className="text-white font-medium truncate">
          {LESSONS[currentLesson].title}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: video + tabs */}
        <div className="lg:col-span-2 space-y-4">
          <CourseVideoPlayer
            thumbnailSrc={courseData.image}
            thumbnailAlt={LESSONS[currentLesson].title}
            onPrevious={handlePrevious}
            onNext={handleNext}
          />

          {/* Completed checkbox */}
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <Checkbox
              checked={completed}
              onCheckedChange={(val) => setCompleted(Boolean(val))}
              shape="square"
              className="border-white/30 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
            />
            <span className="text-sm text-white/80 select-none">Completed</span>
          </label>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-[#1D1D1C] overflow-x-auto">
            {[
              { id: "overview" as const, label: "Overview" },
              { id: "resources" as const, label: "Resources" },
              { id: "tasks" as const, label: "Task" },
              { id: "summary" as const, label: "Summary" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-white text-white"
                    : "border-transparent text-white/60 hover:text-white/80"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div>
            {activeTab === "overview" && (
              <OverviewTabContent
                overview={courseData.overview}
                learningPoints={courseData.learningPoints}
                targetAudience={courseData.targetAudience}
              />
            )}
            {activeTab === "resources" && <ResourcesTabContent />}
            {activeTab === "tasks" && <TaskTabContent />}
            {activeTab === "summary" && (
              <SummaryTabContent
                courseSummary={courseData.summary}
                keyTakeaways={courseData.keyTakeaways}
                courseOutcomes={courseData.courseOutcomes}
              />
            )}
          </div>
        </div>

        {/* Right: tutor + content tracker */}
        <div className="lg:col-span-1">
          <CourseContentTrackerSidebar
            lessons={LESSONS.map((l) => ({
              id: l.id,
              title: l.title,
              duration: l.duration,
            }))}
            tutorInfo={{
              name: "Satoshi Nakamoto",
              role: "Front-End Developer",
              avatar: "/avatarPlaceholder1.jpg",
            }}
          />
        </div>
      </div>
    </div>
  );
}
