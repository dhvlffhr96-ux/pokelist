import { NextResponse } from "next/server";
import { deleteOwnedCard, updateOwnedCard } from "@/lib/cards/service";
import { parseCollectionFormInput } from "@/lib/cards/schema";

type RouteContext = {
  params:
    | Promise<{ userId: string; itemId: string }>
    | { userId: string; itemId: string };
};

async function getRouteParams(context: RouteContext) {
  return Promise.resolve(context.params);
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { userId, itemId } = await getRouteParams(context);
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

    const item = await updateOwnedCard(userId, itemId, parsed.data);

    return NextResponse.json({ data: item });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "사용자 카드 수정에 실패했습니다.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { userId, itemId } = await getRouteParams(context);
    await deleteOwnedCard(userId, itemId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "사용자 카드 삭제에 실패했습니다.",
      },
      { status: 400 },
    );
  }
}
