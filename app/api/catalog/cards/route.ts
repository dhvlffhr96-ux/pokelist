import { NextResponse } from "next/server";
import { searchCatalogCards } from "@/lib/cards/service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const page = searchParams.get("page") ?? "1";
    const pageSize = searchParams.get("pageSize") ?? "24";
    const sort = searchParams.get("sort") ?? "default";
    const seriesName = searchParams.get("seriesName") ?? "";
    const rarities = searchParams.getAll("rarity").filter(Boolean);
    const cards = await searchCatalogCards({
      query,
      page: Number(page),
      pageSize: Number(pageSize),
      sort: sort === "latest" || sort === "oldest" ? sort : "default",
      seriesName: seriesName || undefined,
      rarities: rarities.length > 0 ? rarities : undefined,
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
