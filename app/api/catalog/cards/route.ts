import { NextResponse } from "next/server";
import { searchCatalogCards } from "@/lib/cards/service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const page = searchParams.get("page") ?? "1";
    const pageSize = searchParams.get("pageSize") ?? "10";
    const setId = searchParams.get("setId");
    const rarity = searchParams.get("rarity") ?? "";
    const cards = await searchCatalogCards({
      query,
      page: Number(page),
      pageSize: Number(pageSize),
      setId: setId ? Number(setId) : undefined,
      rarity: rarity || undefined,
    });

    return NextResponse.json({ data: cards });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "카드 마스터 검색에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}
