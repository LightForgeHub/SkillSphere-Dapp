export interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export const faqsData: FAQ[] = [
  {
    id: "enroll-course",
    question: "How do I enroll in a course?",
    answer: "To enroll in a course, navigate to the Marketplace, select your desired course, and click the 'Enroll' button. You can pay using your connected Web3 wallet.",
  },
  {
    id: "contact-tutor",
    question: "How do I contact a tutor?",
    answer: "Once enrolled in a course, you can message the tutor directly through the platform's messaging system available on the course dashboard.",
  },
  {
    id: "reset-password",
    question: "How do I reset my password?",
    answer: "SkillSphere uses Web3 wallet authentication, so there are no passwords to reset. Simply ensure you have access to your connected wallet (e.g., MetaMask, Lobe, or Freighter).",
  },
  {
    id: "access-courses",
    question: "Can I access courses after purchase?",
    answer: "Yes! Once you purchase a course, you have lifetime access to the materials unless specified otherwise by the instructor.",
  },
  {
    id: "become-instructor",
    question: "How do I become an instructor?",
    answer: "To become an instructor, go to the 'Explore Experts' or 'Dashboard' section and look for the 'Apply as Instructor' button. You will need to fill out a brief form detailing your expertise.",
  }
];
