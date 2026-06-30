"use client"
import { useRouter } from "next/navigation"
import { Clock, CheckCircle2, AlertCircle, Search, DollarSign } from "lucide-react"
import { Card } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { mockSessions } from "../../../utils/data/mock-data"
import { Session } from "../../../utils/types/types"

export default function SeekerOverview() {
  const router = useRouter()

  // Separate sessions by status
  const activeSessions = mockSessions.filter(s => s.status === 'active')
  const upcomingSessions = mockSessions.filter(s => s.status === 'upcoming')
  const completedSessions = mockSessions.filter(s => s.status === 'completed')

  const getStatusIcon = (status: Session['status']) => {
    switch (status) {
      case 'active':
        return <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      case 'upcoming':
        return <Clock className="w-4 h-4 text-blue-400" />
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-red-400" />
      default:
        return null
    }
  }

  const getStatusColor = (status: Session['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-400'
      case 'upcoming':
        return 'bg-blue-500/10 text-blue-400'
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-400'
      case 'cancelled':
        return 'bg-red-500/10 text-red-400'
      default:
        return 'bg-gray-500/10 text-gray-400'
    }
  }

  const SessionCard = ({ session }: { session: Session }) => (
    <Card className="p-4 hover:border-white/20 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-foreground mb-1">{session.title}</h4>
          <p className="text-sm text-slate-400">{session.expertName}</p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon(session.status)}
          <Badge className={`capitalize ${getStatusColor(session.status)}`}>
            {session.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
        <div className="flex items-center gap-1 text-slate-400">
          <Clock className="w-3 h-3" />
          <span>{session.date}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <Clock className="w-3 h-3" />
          <span>{session.time}</span>
        </div>
        <div className="text-slate-400">{session.duration}</div>
        <div className="flex items-center gap-1 text-cyan-400 font-medium">
          <DollarSign className="w-3 h-3" />
          {session.price}
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 text-xs bg-white/5 hover:bg-white/10"
          onClick={() => router.push(`/dashboard/sessions/${session.id}`)}
        >
          View Details
        </Button>
        {session.status === 'upcoming' && (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 text-xs bg-white/5 hover:bg-white/10"
          >
            Join Now
          </Button>
        )}
      </div>
    </Card>
  )

  return (
    <div className="space-y-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Active Sessions</p>
              <p className="text-3xl font-bold text-foreground">{activeSessions.length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Upcoming Sessions</p>
              <p className="text-3xl font-bold text-foreground">{upcomingSessions.length}</p>
            </div>
            <Clock className="w-12 h-12 text-blue-400 opacity-30" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Completed Sessions</p>
              <p className="text-3xl font-bold text-foreground">{completedSessions.length}</p>
            </div>
            <CheckCircle2 className="w-12 h-12 text-emerald-400 opacity-30" />
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button
            className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30"
            onClick={() => router.push("/explore-experts")}
          >
            <Search className="w-4 h-4 mr-2" />
            Find Expert
          </Button>
          <Button
            className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30"
            onClick={() => console.log("Fund Session clicked")}
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Fund Session
          </Button>
        </div>
      </div>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Active Sessions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSessions.map(session => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            Upcoming Sessions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingSessions.map(session => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}

      {/* Past Sessions */}
      {completedSessions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Past Sessions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedSessions.map(session => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {mockSessions.length === 0 && (
        <Card className="p-12 text-center">
          <Clock className="w-12 h-12 text-slate-400 mx-auto mb-4 opacity-50" />
          <p className="text-slate-400 mb-4">No sessions scheduled yet</p>
          <Button
            onClick={() => router.push("/explore-experts")}
            className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30"
          >
            <Search className="w-4 h-4 mr-2" />
            Browse Experts
          </Button>
        </Card>
      )}
    </div>
  )
}
