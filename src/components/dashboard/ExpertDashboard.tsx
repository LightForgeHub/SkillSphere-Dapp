"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  TrendingUp,
  Award,
  Zap,
  Star,
  MessageSquare,
  Clock,
  Users,
} from "lucide-react"
import { Card } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import AvailabilityToggle from "./AvailabilityToggle"
import { mockSessions, mockExperts } from "../../../utils/data/mock-data"

export default function ExpertDashboard() {
  const router = useRouter()
  const [isAvailable, setIsAvailable] = useState(true)

  // Get current expert (for demo purposes, using the first expert)
  const currentExpert = mockExperts[0]

  // Calculate stats
  const totalSessions = mockSessions.length
  const completedSessions = mockSessions.filter(s => s.status === 'completed').length
  const totalEarnings = "$12,750" // Mock data
  const stakedAmount = "$5,000" // Mock data
  const averageRating = currentExpert.rating

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Expert Dashboard</h1>
        <p className="text-slate-400">
          Welcome back, {currentExpert.name}! Here's your session and earnings overview.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Earnings */}
        <Card className="p-6 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-2">Total Earnings</p>
              <h3 className="text-2xl font-bold text-white">{totalEarnings}</h3>
              <p className="text-xs text-cyan-400 mt-2">↑ 12% from last month</p>
            </div>
            <div className="p-3 rounded-lg bg-cyan-500/20">
              <TrendingUp className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
        </Card>

        {/* Staked Amount */}
        <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 hover:border-purple-500/40 transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-2">Staked Amount</p>
              <h3 className="text-2xl font-bold text-white">{stakedAmount}</h3>
              <p className="text-xs text-purple-400 mt-2">Earning rewards</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/20">
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </Card>

        {/* Average Rating */}
        <Card className="p-6 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20 hover:border-yellow-500/40 transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-2">Average Rating</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold text-white">{averageRating}</h3>
                <span className="text-sm text-slate-400">/5.0</span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < Math.round(averageRating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-slate-600"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500/20">
              <Award className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </Card>

        {/* Total Sessions */}
        <Card className="p-6 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-2">Total Sessions</p>
              <h3 className="text-2xl font-bold text-white">{totalSessions}</h3>
              <p className="text-xs text-emerald-400 mt-2">
                {completedSessions} completed
              </p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/20">
              <Users className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Availability Toggle */}
      <AvailabilityToggle
        initialAvailable={isAvailable}
        onChange={setIsAvailable}
      />

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button
            className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30"
            onClick={() => router.push("/dashboard/earnings")}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            View Detailed Earnings
          </Button>
          <Button
            className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30"
            onClick={() => router.push("/dashboard/learners")}
          >
            <Users className="w-4 h-4 mr-2" />
            View Learners
          </Button>
          <Button
            className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30"
            onClick={() => router.push("/dashboard/messages")}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Messages
          </Button>
        </div>
      </div>

      {/* Recent Sessions */}
      {mockSessions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Sessions</h3>
            <Button
              variant="ghost"
              className="text-slate-400 hover:text-white"
              onClick={() => router.push("/dashboard")}
            >
              View All →
            </Button>
          </div>

          <div className="space-y-3">
            {mockSessions.slice(0, 3).map(session => (
              <Card
                key={session.id}
                className="p-4 hover:border-white/20 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">
                      {session.title}
                    </h4>
                    <div className="flex items-center gap-3 flex-wrap text-sm text-slate-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {session.date}
                      </div>
                      <div>{session.time}</div>
                      <Badge className="text-xs capitalize bg-white/5">
                        {session.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-cyan-400">{session.price}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {session.duration}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Expert Stats Summary */}
      <Card className="p-6 bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">
          Performance Summary
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-400 mb-2">Response Time</p>
            <p className="text-xl font-bold text-white">5m avg</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-2">Session Completion</p>
            <p className="text-xl font-bold text-white">{Math.round((completedSessions / totalSessions) * 100)}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-2">Repeat Clients</p>
            <p className="text-xl font-bold text-white">12</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-2">Revenue This Month</p>
            <p className="text-xl font-bold text-white">$3,200</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
