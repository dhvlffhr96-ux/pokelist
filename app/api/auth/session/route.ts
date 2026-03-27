import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/service";

export async function GET(request: Request) {
  try {
    return NextResponse.json({
      data: {
        userId: getSessionUserId(request),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "세션 조회에 실패했습니다.",
      },
      { status: 400 },
    );
  }
}
