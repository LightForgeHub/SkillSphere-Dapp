import { NextRequest, NextResponse } from "next/server";

interface NotesSyncState {
  seekerContent: string;
  expertContent: string;
  seekerTimestamp: number;
  expertTimestamp: number;
}

const globalNotes = global as unknown as {
  sessionNotesSync?: Record<string, NotesSyncState>;
};

if (!globalNotes.sessionNotesSync) {
  globalNotes.sessionNotesSync = {};
}

function getSyncState(id: string): NotesSyncState {
  if (!globalNotes.sessionNotesSync) {
    globalNotes.sessionNotesSync = {};
  }
  if (!globalNotes.sessionNotesSync[id]) {
    globalNotes.sessionNotesSync[id] = {
      seekerContent: "",
      expertContent: "",
      seekerTimestamp: 0,
      expertTimestamp: 0,
    };
  }
  return globalNotes.sessionNotesSync[id];
}

// POST /api/session/[id]/notes
// Body: { content: string, role?: "seeker" | "expert" }
// Persists finalized session notes. When role is provided also syncs for real-time sharing.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const content = typeof body?.content === "string" ? body.content : "";
  const role = body?.role;

  if (!content.trim()) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  if (role === "seeker" || role === "expert") {
    const state = getSyncState(id);
    const now = Date.now();
    if (role === "seeker") {
      state.seekerContent = content;
      state.seekerTimestamp = now;
    } else {
      state.expertContent = content;
      state.expertTimestamp = now;
    }
  }

  // --- IPFS / storage stub ---
  const cid = `bafybeistub-${id}-${Date.now()}`;

  return NextResponse.json({ sessionId: id, cid }, { status: 200 });
}

// GET /api/session/[id]/notes?role=seeker|expert&since=timestamp
// Poll for notes updates from the other participant.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");
  const sinceStr = searchParams.get("since");
  const since = sinceStr ? parseInt(sinceStr, 10) : 0;

  if (!role || (role !== "seeker" && role !== "expert")) {
    return NextResponse.json(
      { error: "role query param must be 'seeker' or 'expert'" },
      { status: 400 }
    );
  }

  const state = getSyncState(id);
  const otherRole = role === "seeker" ? "expert" : "seeker";
  const otherTimestamp =
    otherRole === "seeker" ? state.seekerTimestamp : state.expertTimestamp;
  const otherContent =
    otherRole === "seeker" ? state.seekerContent : state.expertContent;

  if (otherTimestamp > since) {
    return NextResponse.json({
      content: otherContent,
      timestamp: otherTimestamp,
    });
  }

  return NextResponse.json({ content: null, timestamp: since });
}
