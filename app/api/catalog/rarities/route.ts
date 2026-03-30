import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { listCatalogRarities, listCatalogRarityMeta } from "@/lib/cards/service";

export async function GET(request: NextRequest) {
  try {
    const scope = request.nextUrl.searchParams.get("scope") ?? "";

    if (scope === "meta") {
      const rarities = await listCatalogRarityMeta();

      return NextResponse.json({ data: rarities });
    }

    const query = request.nextUrl.searchParams.get("q") ?? "";
    const seriesName = request.nextUrl.searchParams.get("seriesName") ?? "";
    const setId = request.nextUrl.searchParams.get("setId");
    const rarities = await listCatalogRarities({
      query: query || undefined,
      seriesName: seriesName || undefined,
      setId: setId ? Number(setId) : undefined,
    });

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
