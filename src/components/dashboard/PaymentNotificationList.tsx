import React from "react"
import PaymentNotificationItem, { PaymentNotificationItemProps } from "./PaymentNotificationItem"

interface PaymentNotificationListProps {
  payments: PaymentNotificationItemProps[]
}

export default function PaymentNotificationList({ payments }: PaymentNotificationListProps) {
  if (payments.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400">
        No payment notifications to display.
      </div>
    )
  }

  return (
    <div className="flex flex-col divide-y divide-white/10">
      {payments.map((paymentData) => (
        <PaymentNotificationItem
          key={paymentData.id}
          {...paymentData}
          className="py-6"
        />
      ))}
    </div>
  )
}
