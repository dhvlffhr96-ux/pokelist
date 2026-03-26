import { NextResponse } from "next/server";
import { searchCatalogSets } from "@/lib/cards/service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const seriesName = searchParams.get("seriesName") ?? "";
    const limit = searchParams.get("limit") ?? "10";
    const sets = await searchCatalogSets(seriesName, Number(limit));

    return NextResponse.json({ data: sets });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "카드 세트 조회에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}
