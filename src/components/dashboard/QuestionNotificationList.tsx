import React from "react"
import QuestionNotificationItem, { QuestionNotificationItemProps } from "./QuestionNotificationItem"

interface QuestionNotificationListProps {
  questions: QuestionNotificationItemProps[]
}

export default function QuestionNotificationList({ questions }: QuestionNotificationListProps) {
  if (questions.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400">
        No questions to display.
      </div>
    )
  }

  return (
    <div className="flex flex-col divide-y divide-white/10">
      {questions.map((questionData) => (
        <QuestionNotificationItem
          key={questionData.id}
          {...questionData}
          className="py-4"
        />
      ))}
    </div>
  )
}
