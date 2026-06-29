import { NextRequest, NextResponse } from "next/server";

// POST /api/session/[id]/notes
// Body: { content: string }
// Persists finalized session notes. In production, swap the stub with
// an IPFS pinning call (e.g. web3.storage / Pinata) or a DB write.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let content: string;
  try {
    const body = await request.json();
    content = typeof body?.content === "string" ? body.content : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!content.trim()) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  // --- IPFS / storage stub ---
  // Replace this block with a real pinning call, e.g.:
  //   const cid = await pinToIPFS(content);
  //   return NextResponse.json({ cid }, { status: 200 });
  const cid = `bafybeistub-${id}-${Date.now()}`;

  return NextResponse.json({ sessionId: id, cid }, { status: 200 });
}
