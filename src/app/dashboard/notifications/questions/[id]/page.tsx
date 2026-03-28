import QuestionAnswerChat, { QuestionData } from "@/components/dashboard/chat/QuestionAnswerChat"
import QuestionsSidebar from "@/components/dashboard/chat/QuestionsSidebar"

const mockQuestions: QuestionData[] = [
  {
    id: "q1",
    learnerName: "Mia Johnson",
    learnerAvatarUrl: "/mia.svg",
    category: "Design",
    question: "What videos and materials can you recommend for a beginner started web design",
    timestamp: "15 mins ago",
  },
  {
    id: "q2",
    learnerName: "John Doe",
    category: "Development",
    question: "How do I ensure my smart contract is secure against reentrancy attacks?",
    timestamp: "2 hrs ago",
  },
  {
    id: "q3",
    learnerName: "Harper Lee",
    learnerAvatarUrl: "/harper.svg",
    category: "Design",
    question: "What is the difference between UI and UX design and where should I start?",
    timestamp: "4 hrs ago",
  },
  {
    id: "q4",
    learnerName: "Jane Smith",
    learnerAvatarUrl: "/jane.svg",
    category: "Development",
    question: "Can you explain how gas fees work on Ethereum and how to optimize them?",
    timestamp: "1 day ago",
  },
]

export default async function QuestionAnswerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const questionData = mockQuestions.find((q) => q.id === id) ?? {
    id,
    learnerName: "Learner",
    category: "General",
    question: "Question not found.",
    timestamp: "",
  }

  return (
    <div className="flex gap-4 w-full h-[calc(100vh-220px)] min-h-[480px]">
      {/* Left: questions list */}
      <aside className="hidden lg:flex flex-col w-72 shrink-0">
        <QuestionsSidebar questions={mockQuestions} activeId={id} />
      </aside>

      {/* Right: chat */}
      <div className="flex-1 min-w-0">
        <QuestionAnswerChat questionData={questionData} />
      </div>
    </div>
  )
}
