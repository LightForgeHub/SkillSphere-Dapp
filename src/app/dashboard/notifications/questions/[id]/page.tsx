import QuestionAnswerChat, { QuestionData } from "@/components/dashboard/chat/QuestionAnswerChat"

// Mock question data — replace with real data fetching by id
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
    <div className="w-full">
      <QuestionAnswerChat questionData={questionData} />
    </div>
  )
}
