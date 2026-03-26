import { NextResponse } from "next/server";
import { addOwnedCard, listUserCollection } from "@/lib/cards/service";
import { parseCollectionFormInput } from "@/lib/cards/schema";

type RouteContext = {
  params: Promise<{ userId: string }> | { userId: string };
};

async function getUserId(context: RouteContext) {
  const params = await Promise.resolve(context.params);

  return params.userId;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const userId = await getUserId(context);
    const collection = await listUserCollection(userId);

    return NextResponse.json({ data: collection });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "사용자 카드 목록 조회에 실패했습니다.",
      },
      { status: 400 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const userId = await getUserId(context);
    const payload = await request.json();
    const parsed = parseCollectionFormInput(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.formError,
          fieldErrors: parsed.fieldErrors,
        },
        { status: 400 },
      );
    }

    if (typeof payload.cardId !== "number") {
      return NextResponse.json(
        {
          error: "마스터 카드 ID가 필요합니다.",
        },
        { status: 400 },
      );
    }

    const item = await addOwnedCard(userId, {
      cardId: payload.cardId,
      ...parsed.data,
    });

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "사용자 카드 저장에 실패했습니다.",
      },
      { status: 400 },
    );
  }
}
