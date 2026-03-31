import { NextResponse } from "next/server";
import { AuthAccessError, requireAuthorizedUser } from "@/lib/auth/service";
import { addOwnedCards } from "@/lib/cards/service";
import { parseBulkCollectionFormInput } from "@/lib/cards/schema";

type RouteContext = {
  params: Promise<{ userId: string }> | { userId: string };
};

async function getUserId(context: RouteContext) {
  const params = await Promise.resolve(context.params);

  return params.userId;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const userId = await getUserId(context);
    requireAuthorizedUser(request, userId);
    const payload = await request.json();
    const parsed = parseBulkCollectionFormInput(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.formError,
          fieldErrors: parsed.fieldErrors,
        },
        { status: 400 },
      );
    }

    const items = await addOwnedCards(userId, parsed.data);

    return NextResponse.json({ data: items }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthAccessError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "사용자 카드 일괄 저장에 실패했습니다.",
      },
      { status: 400 },
    );
  }
}
