import { NextResponse } from "next/server";
import { mockExperts } from "@/utils/data/mock-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const expert = mockExperts.find((e) => e.id === id);
  if (!expert) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(expert);
}
