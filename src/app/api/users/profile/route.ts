import { NextRequest, NextResponse } from "next/server";

interface ProfileUpdateRequest {
  displayName: string;
  bio: string;
  profileImageUrl: string;
  ratePerSecond: string;
  skillTags: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ProfileUpdateRequest;

    // Validate required fields
    if (!body.displayName?.trim()) {
      return NextResponse.json(
        { error: "Display name is required" },
        { status: 400 }
      );
    }

    if (!body.ratePerSecond || parseFloat(body.ratePerSecond) <= 0) {
      return NextResponse.json(
        { error: "Rate per second must be greater than 0" },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.skillTags) || body.skillTags.length === 0) {
      return NextResponse.json(
        { error: "At least one skill tag is required" },
        { status: 400 }
      );
    }

    if (body.skillTags.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 skill tags allowed" },
        { status: 400 }
      );
    }

    // TODO: Save profile to database
    // This would typically involve:
    // 1. Getting the user from session/auth
    // 2. Validating the data
    // 3. Saving to database
    // 4. Returning the updated profile

    const updatedProfile = {
      id: "user-123",
      ...body,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(updatedProfile, { status: 200 });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // TODO: Fetch user profile from database
    // This would typically involve:
    // 1. Getting the user from session/auth
    // 2. Fetching their profile
    // 3. Returning the profile data

    const mockProfile = {
      id: "user-123",
      displayName: "Expert Name",
      bio: "Experienced developer and consultant",
      profileImageUrl: "",
      ratePerSecond: "0.001",
      skillTags: ["React", "TypeScript", "Node.js"],
    };

    return NextResponse.json(mockProfile, { status: 200 });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
