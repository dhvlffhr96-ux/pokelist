import { NextResponse } from "next/server";
import { listCatalogSeries } from "@/lib/cards/service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ?? "100";
    const series = await listCatalogSeries(Number(limit));

    return NextResponse.json({ data: series });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "카드 시리즈 조회에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}
