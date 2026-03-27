import { NextResponse } from "next/server";
import { applySessionCookie } from "@/lib/auth/session";
import { loginUserAccount } from "@/lib/auth/service";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = await loginUserAccount(payload);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.formError,
          fieldErrors: result.fieldErrors,
        },
        { status: 400 },
      );
    }

    const response = NextResponse.json({
      data: result.data,
    });
    applySessionCookie(response, result.data.userId);

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "로그인에 실패했습니다.",
      },
      { status: 400 },
    );
  }
}
