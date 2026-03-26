import { NextResponse } from "next/server";
import { listCatalogRarities } from "@/lib/cards/service";

export async function GET() {
  try {
    const rarities = await listCatalogRarities();

    return NextResponse.json({ data: rarities });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "카드 레어도 조회에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}
