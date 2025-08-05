import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/nextAuthOptions";
import { Area } from "@prisma/client";

export async function GET() {
  try {
    const session = await getAuthSession();

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userAreas: Area[] = session.user.areas || [];

    return NextResponse.json(userAreas);
  } catch (error) {
    console.error("[USER_AREAS_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
