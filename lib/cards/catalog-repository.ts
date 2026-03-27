import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import type { Database } from "@/lib/supabase/database.types";
import type {
  CardMaster,
  CardRarityMeta,
  CardSeriesSummary,
  CardSetSummary,
  PaginatedResult,
} from "@/lib/cards/types";

type CardRarityMetaRow = Database["public"]["Tables"]["card_rarity_meta"]["Row"];
type CardRow = Database["public"]["Tables"]["cards"]["Row"];
type CardSetRow = Database["public"]["Tables"]["card_sets"]["Row"];
type CatalogSearchRow = CardRow & {
  card_sets: CardSetRow | null;
};

const MASTER_SELECT = `
  id,
  game,
  language,
  set_id,
  card_no,
  local_code,
  card_name_ko,
  card_name_en,
  card_name_jp,
  rarity,
  card_type,
  subtypes,
  hp,
  element_types,
  regulation_mark,
  artist,
  image_url,
  thumbnail_url,
  card_sets (
    id,
    set_code,
    set_name_ko,
    set_name_en,
    series_name,
    release_date,
    total_cards,
    logo_url,
    symbol_url,
    is_active,
    created_at,
    updated_at,
    game,
    language
  )
`;

const SET_SELECT = `
  id,
  set_code,
  set_name_ko,
  set_name_en,
  series_name,
  release_date,
  total_cards
`;

function sanitizeSearchTerm(query: string) {
  return query.trim().replace(/[,%()]/g, " ").replace(/\s+/g, " ").slice(0, 80);
}

function normalizeMatchText(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase("ko-KR");
}

function compactMatchText(value: string | null | undefined) {
  return normalizeMatchText(value).replace(/\s+/g, "");
}

function getQueryScore(row: CatalogSearchRow, query: string) {
  if (!query) {
    return 0;
  }

  const normalizedQuery = normalizeMatchText(query);
  const compactQuery = compactMatchText(query);
  const koName = normalizeMatchText(row.card_name_ko);
  const enName = normalizeMatchText(row.card_name_en);
  const jpName = normalizeMatchText(row.card_name_jp);
  const cardNo = normalizeMatchText(row.card_no);
  const localCode = normalizeMatchText(row.local_code);
  const compactKoName = compactMatchText(row.card_name_ko);
  const compactEnName = compactMatchText(row.card_name_en);
  const compactJpName = compactMatchText(row.card_name_jp);

  if (koName === normalizedQuery) {
    return 0;
  }

  if (enName === normalizedQuery || jpName === normalizedQuery) {
    return 1;
  }

  if (cardNo === normalizedQuery || localCode === normalizedQuery) {
    return 2;
  }

  if (compactKoName === compactQuery) {
    return 3;
  }

  if (
    koName.startsWith(normalizedQuery) ||
    enName.startsWith(normalizedQuery) ||
    jpName.startsWith(normalizedQuery)
  ) {
    return 4;
  }

  if (
    compactKoName.startsWith(compactQuery) ||
    compactEnName.startsWith(compactQuery) ||
    compactJpName.startsWith(compactQuery)
  ) {
    return 5;
  }

  if (
    koName.includes(normalizedQuery) ||
    enName.includes(normalizedQuery) ||
    jpName.includes(normalizedQuery)
  ) {
    return 6;
  }

  if (
    compactKoName.includes(compactQuery) ||
    compactEnName.includes(compactQuery) ||
    compactJpName.includes(compactQuery)
  ) {
    return 7;
  }

  if (cardNo.includes(normalizedQuery) || localCode.includes(normalizedQuery)) {
    return 8;
  }

  return 9;
}

function compareRankedRows(left: CatalogSearchRow, right: CatalogSearchRow, query: string) {
  const scoreDiff = getQueryScore(left, query) - getQueryScore(right, query);

  if (scoreDiff !== 0) {
    return scoreDiff;
  }

  const leftNameLength = compactMatchText(left.card_name_ko).length;
  const rightNameLength = compactMatchText(right.card_name_ko).length;

  if (leftNameLength !== rightNameLength) {
    return leftNameLength - rightNameLength;
  }

  return left.id - right.id;
}

function mapRowToMaster(row: CatalogSearchRow): CardMaster {
  if (!row.card_sets) {
    throw new Error(`카드 ${row.id}에 연결된 세트 정보가 없습니다.`);
  }

  return {
    id: row.id,
    game: row.game,
    language: row.language,
    setId: row.set_id,
    cardNo: row.card_no,
    localCode: row.local_code,
    cardNameKo: row.card_name_ko,
    cardNameEn: row.card_name_en,
    cardNameJp: row.card_name_jp,
    rarity: row.rarity,
    cardType: row.card_type,
    subtypes: row.subtypes ?? [],
    hp: row.hp,
    elementTypes: row.element_types ?? [],
    regulationMark: row.regulation_mark,
    artist: row.artist,
    imageUrl: row.image_url,
    thumbnailUrl: row.thumbnail_url,
    set: {
      id: row.card_sets.id,
      setCode: row.card_sets.set_code,
      setNameKo: row.card_sets.set_name_ko,
      setNameEn: row.card_sets.set_name_en,
      seriesName: row.card_sets.series_name,
      releaseDate: row.card_sets.release_date,
      totalCards: row.card_sets.total_cards,
    },
  };
}

function mapSetRow(row: CardSetRow): CardSetSummary {
  return {
    id: row.id,
    setCode: row.set_code,
    setNameKo: row.set_name_ko,
    setNameEn: row.set_name_en,
    seriesName: row.series_name,
    releaseDate: row.release_date,
    totalCards: row.total_cards,
  };
}

function mapRarityMetaRow(row: CardRarityMetaRow): CardRarityMeta {
  return {
    filterKey: row.rarity_code?.trim() || row.rarity_name,
    rarityName: row.rarity_name,
    rarityCode: row.rarity_code,
    displayNameKo: row.display_name_ko,
    displayNameEn: row.display_name_en,
    sortOrder: row.sort_order,
    badgeTone: row.badge_tone,
    filterValues: [row.rarity_name, row.rarity_code].filter(
      (value): value is string => Boolean(value),
    ),
  };
}

function sortRarityMetas(left: CardRarityMeta, right: CardRarityMeta) {
  if (left.sortOrder !== null && right.sortOrder !== null && left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }

  if (left.sortOrder !== null && right.sortOrder === null) {
    return -1;
  }

  if (left.sortOrder === null && right.sortOrder !== null) {
    return 1;
  }

  const leftLabel = left.rarityCode ?? left.displayNameKo ?? left.displayNameEn ?? left.rarityName;
  const rightLabel =
    right.rarityCode ?? right.displayNameKo ?? right.displayNameEn ?? right.rarityName;

  return leftLabel.localeCompare(rightLabel, "ko-KR");
}

function groupRarityMetas(rows: CardRarityMeta[]) {
  const grouped = new Map<string, CardRarityMeta>();

  for (const row of rows) {
    const existing = grouped.get(row.filterKey);

    if (!existing) {
      grouped.set(row.filterKey, row);
      continue;
    }

    grouped.set(row.filterKey, {
      ...existing,
      rarityName: existing.rarityName || row.rarityName,
      rarityCode: existing.rarityCode ?? row.rarityCode,
      displayNameKo: existing.displayNameKo ?? row.displayNameKo,
      displayNameEn: existing.displayNameEn ?? row.displayNameEn,
      sortOrder:
        existing.sortOrder === null
          ? row.sortOrder
          : row.sortOrder === null
            ? existing.sortOrder
            : Math.min(existing.sortOrder, row.sortOrder),
      badgeTone: existing.badgeTone ?? row.badgeTone,
      filterValues: [...new Set([...existing.filterValues, ...row.filterValues])],
    });
  }

  return [...grouped.values()].sort(sortRarityMetas);
}

function createFallbackRarityMeta(value: string): CardRarityMeta {
  return {
    filterKey: value,
    rarityName: value,
    rarityCode: value,
    displayNameKo: null,
    displayNameEn: null,
    sortOrder: null,
    badgeTone: null,
    filterValues: [value],
  };
}

export class CatalogRepository {
  async listCardSeries(limit: number) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("card_sets")
      .select("series_name, release_date")
      .eq("game", "pokemon")
      .eq("language", "ko")
      .eq("is_active", true)
      .not("series_name", "is", null)
      .limit(5000);

    if (error) {
      throw new Error(`카드 시리즈 조회 실패: ${error.message}`);
    }

    const seriesStats = new Map<string, { setCount: number; latestReleaseDate: string | null }>();

    for (const row of data ?? []) {
      const seriesName = row.series_name;

      if (!seriesName) {
        continue;
      }

      const current = seriesStats.get(seriesName) ?? {
        setCount: 0,
        latestReleaseDate: null,
      };
      const nextReleaseDate =
        current.latestReleaseDate && row.release_date
          ? current.latestReleaseDate > row.release_date
            ? current.latestReleaseDate
            : row.release_date
          : current.latestReleaseDate ?? row.release_date;

      seriesStats.set(seriesName, {
        setCount: current.setCount + 1,
        latestReleaseDate: nextReleaseDate ?? null,
      });
    }

    return [...seriesStats.entries()]
      .map(
        ([name, stats]): CardSeriesSummary => ({
          name,
          setCount: stats.setCount,
        }),
      )
      .sort((left, right) => {
        const leftLatest = seriesStats.get(left.name)?.latestReleaseDate;
        const rightLatest = seriesStats.get(right.name)?.latestReleaseDate;

        if (leftLatest && rightLatest && leftLatest !== rightLatest) {
          return rightLatest.localeCompare(leftLatest, "ko-KR");
        }

        if (leftLatest && !rightLatest) {
          return -1;
        }

        if (!leftLatest && rightLatest) {
          return 1;
        }

        return left.name.localeCompare(right.name, "ko-KR");
      })
      .slice(0, limit);
  }

  async searchCardSets(seriesName: string | undefined, limit: number) {
    const supabase = createSupabaseAdminClient();

    let request = supabase
      .from("card_sets")
      .select(SET_SELECT)
      .eq("game", "pokemon")
      .eq("language", "ko")
      .eq("is_active", true)
      .order("release_date", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true })
      .limit(limit);

    if (seriesName) {
      request = request.eq("series_name", seriesName);
    }

    const { data, error } = await request;

    if (error) {
      throw new Error(`카드 세트 조회 실패: ${error.message}`);
    }

    return (data as CardSetRow[]).map(mapSetRow);
  }

  async listCardRarities(setId?: number) {
    const supabase = createSupabaseAdminClient();
    let rarityValueRequest = supabase
      .from("cards")
      .select("rarity")
      .eq("game", "pokemon")
      .eq("language", "ko")
      .eq("is_active", true);

    if (setId) {
      rarityValueRequest = rarityValueRequest.eq("set_id", setId);
    }

    const [{ data: rarityValueRows, error: rarityValueError }, { data, error }] =
      await Promise.all([
        rarityValueRequest,
        supabase
          .from("card_rarity_meta")
          .select(
            "rarity_name, rarity_code, display_name_ko, display_name_en, sort_order, badge_tone",
          )
          .order("sort_order", { ascending: true, nullsFirst: false })
          .order("display_name_ko", { ascending: true, nullsFirst: false })
          .order("rarity_name", { ascending: true }),
      ]);

    if (rarityValueError) {
      throw new Error(`카드 레어도 값 조회 실패: ${rarityValueError.message}`);
    }

    if (error) {
      throw new Error(`카드 레어도 메타 조회 실패: ${error.message}`);
    }

    const availableRarityValues = new Set(
      (rarityValueRows ?? [])
        .map((row) => row.rarity?.trim())
        .filter((value): value is string => Boolean(value)),
    );
    const grouped = groupRarityMetas((data as CardRarityMetaRow[]).map(mapRarityMetaRow));

    if (availableRarityValues.size === 0) {
      return grouped;
    }

    const filtered = grouped.filter((rarity) =>
      rarity.filterValues.some((value) => availableRarityValues.has(value)),
    );
    const coveredValues = new Set(filtered.flatMap((rarity) => rarity.filterValues));
    const fallback = [...availableRarityValues]
      .filter((value) => !coveredValues.has(value))
      .map(createFallbackRarityMeta);

    return [...filtered, ...fallback].sort(sortRarityMetas);
  }

  async searchCards({
    query,
    page,
    pageSize,
    setId,
    rarities,
  }: {
    query: string;
    page: number;
    pageSize: number;
    setId?: number;
    rarities?: string[];
  }): Promise<PaginatedResult<CardMaster>> {
    const supabase = createSupabaseAdminClient();
    const sanitizedQuery = sanitizeSearchTerm(query);
    const applyCommonFilters = <T>(request: T) => {
      let nextRequest = (request as any)
        .eq("game", "pokemon")
        .eq("language", "ko")
        .eq("is_active", true);

      if (setId) {
        nextRequest = nextRequest.eq("set_id", setId);
      }

      if (rarities && rarities.length > 1) {
        nextRequest = nextRequest.in("rarity", rarities);
      } else if (rarities && rarities.length === 1) {
        nextRequest = nextRequest.eq("rarity", rarities[0]);
      }

      if (sanitizedQuery) {
        const like = `%${sanitizedQuery}%`;
        nextRequest = nextRequest.or(
          [
            `card_name_ko.ilike.${like}`,
            `card_name_en.ilike.${like}`,
            `card_name_jp.ilike.${like}`,
            `card_no.ilike.${like}`,
            `local_code.ilike.${like}`,
          ].join(","),
        );
      }

      return nextRequest;
    };

    const buildCountRequest = () =>
      applyCommonFilters(
        supabase.from("cards").select("id", { count: "exact", head: true }),
      );

    const buildDataRequest = () =>
      applyCommonFilters(
        supabase.from("cards").select(MASTER_SELECT),
      );

    const { count, error: countError } = await buildCountRequest();

    if (countError) {
      throw new Error(`카드 마스터 조회 실패: ${countError.message}`);
    }

    const totalCount = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(page, totalPages);
    const candidateLimit = Math.min(
      Math.max(totalCount, safePage * pageSize * 20, 120),
      1000,
    );

    let request = buildDataRequest();

    if (sanitizedQuery) {
      request = request.order("updated_at", { ascending: false });
    } else if (setId) {
      request = request.order("card_no", {
        ascending: true,
      });
    } else {
      request = request.order("updated_at", { ascending: false });
    }

    request = request.limit(candidateLimit);

    const { data, error } = await request;

    if (error) {
      throw new Error(`카드 마스터 조회 실패: ${error.message}`);
    }

    const rows = data as CatalogSearchRow[];
    const rankedRows = sanitizedQuery
      ? [...rows].sort((left, right) => compareRankedRows(left, right, sanitizedQuery))
      : [...rows].sort((left, right) =>
          left.card_no.localeCompare(right.card_no, "ko-KR", {
            numeric: true,
            sensitivity: "base",
          }) || left.id - right.id,
        );

    const startIndex = (safePage - 1) * pageSize;
    const items = rankedRows.slice(startIndex, startIndex + pageSize).map(mapRowToMaster);

    return {
      items,
      page: safePage,
      pageSize,
      totalCount,
      totalPages,
    };
  }

  async getCardById(cardId: number) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("cards")
      .select(MASTER_SELECT)
      .eq("id", cardId)
      .eq("game", "pokemon")
      .eq("language", "ko")
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      throw new Error(`카드 마스터 단건 조회 실패: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return mapRowToMaster(data as CatalogSearchRow);
  }
}
