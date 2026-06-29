import { NextResponse } from "next/server";
import { mockExperts } from "@/utils/data/mock-data";

export async function GET() {
  return NextResponse.json(mockExperts);
}
