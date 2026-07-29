import { NextRequest, NextResponse } from "next/server";

interface SignalMessage {
  id: string;
  sender: "seeker" | "expert";
  type: "offer" | "answer" | "candidate" | "status";
  data: any;
  timestamp: number;
}

const globalSignals = global as unknown as {
  sessionSignals?: Record<string, SignalMessage[]>;
};

if (!globalSignals.sessionSignals) {
  globalSignals.sessionSignals = {};
}

// POST /api/session/[id]/signal
// Body: { sender: 'seeker' | 'expert', type: 'offer' | 'answer' | 'candidate' | 'status', data: any }
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

  const { sender, type, data } = body;
  if (!sender || !type || !data) {
    return NextResponse.json(
      { error: "Missing required fields: sender, type, data" },
      { status: 400 }
    );
  }

  if (sender !== "seeker" && sender !== "expert") {
    return NextResponse.json(
      { error: "sender must be 'seeker' or 'expert'" },
      { status: 400 }
    );
  }

  if (!globalSignals.sessionSignals) {
    globalSignals.sessionSignals = {};
  }

  if (!globalSignals.sessionSignals[id]) {
    globalSignals.sessionSignals[id] = [];
  }

  const newSignal: SignalMessage = {
    id: Math.random().toString(36).substring(2, 9),
    sender,
    type,
    data,
    timestamp: Date.now(),
  };

  globalSignals.sessionSignals[id].push(newSignal);

  // Keep array small to prevent memory leak
  if (globalSignals.sessionSignals[id].length > 200) {
    globalSignals.sessionSignals[id] = globalSignals.sessionSignals[id].slice(-200);
  }

  return NextResponse.json({ success: true, signal: newSignal }, { status: 200 });
}

// GET /api/session/[id]/signal?role=seeker|expert&since=timestamp
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

  if (!globalSignals.sessionSignals || !globalSignals.sessionSignals[id]) {
    return NextResponse.json({ signals: [] }, { status: 200 });
  }

  // Get signals sent by the OTHER peer after the since timestamp
  const otherRole = role === "seeker" ? "expert" : "seeker";
  const signals = globalSignals.sessionSignals[id].filter(
    (sig) => sig.sender === otherRole && sig.timestamp > since
  );

  return NextResponse.json({ signals }, { status: 200 });
}

// DELETE /api/session/[id]/signal
// Clears all signals for this session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (globalSignals.sessionSignals && globalSignals.sessionSignals[id]) {
    delete globalSignals.sessionSignals[id];
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
