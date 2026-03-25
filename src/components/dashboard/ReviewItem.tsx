import React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar"

interface ReviewItemProps {
  avatar: string
  name: string
  text: string
  rating: string
}

export default function ReviewItem({ avatar, name, text, rating }: ReviewItemProps) {
  return (
    <div className="flex md:items-center justify-between py-6 border-b border-white/5 last:border-0 gap-4 group">
      <div className="flex items-center gap-4 flex-1">
        <Avatar className="w-10 h-10 rounded-full border border-white/10 shrink-0">
          <AvatarImage src={avatar} alt={name} />
          <AvatarFallback>{name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-white/90">{name}</span>
          <p className="text-sm text-white/60 leading-relaxed max-w-2xl">{text}</p>
        </div>
      </div>
      
      <div className="flex flex-col items-end shrink-0 pt-1 md:pt-0">
        <span className="text-xs text-white/40 mb-0.5 font-medium">Rating</span>
        <span className="text-base text-white font-bold">{rating}/5</span>
      </div>
    </div>
  )
}
