export const CARD_CONDITIONS = ["SEALED", "TOP", "HIGH", "MID", "LOW", "POOR"] as const;
export const LEGACY_CARD_CONDITIONS = ["MINT", "GOOD", "PLAYED"] as const;

export type CardCondition = (typeof CARD_CONDITIONS)[number];
type LegacyCardCondition = (typeof LEGACY_CARD_CONDITIONS)[number];
export type CardType = "pokemon" | "trainer" | "energy";
export type CatalogSortOrder = "default" | "latest" | "oldest";
export type OwnedCardSortOrder =
  | "registered_latest"
  | "registered_oldest"
  | "release_latest"
  | "release_oldest";

export const CARD_CONDITION_LABELS: Record<CardCondition, string> = {
  SEALED: "미개봉",
  TOP: "최상",
  HIGH: "상",
  MID: "중",
  LOW: "하",
  POOR: "최하",
};

export const CARD_CONDITION_DESCRIPTIONS: Record<CardCondition, string> = {
  SEALED: "미개봉상품(비닐 및 포장상태 확인)",
  TOP: "생활 기스 및 하자가 없는 물품",
  HIGH: "카드를 입수한 뒤, 실드에 넣고 사용한 것(생활 기스 있을 수 있음, 큰 손상 없음)",
  MID: "카드를 입수한 뒤, 실드에 넣지 않고 사용한 것(테두리 손상, 생활 기스 이상의 손상 등)",
  LOW: "카드에 손상이 확인되나, 사용하기에 무리는 없는 것(접힘, 뒷면 손상 등)",
  POOR: "카드의 손상이 심각한 경우(C급의 손상 내용+기스, 벗겨짐, 얼룩 등)",
};

const LEGACY_CARD_CONDITION_MAP: Record<LegacyCardCondition | "SEALED", CardCondition> = {
  SEALED: "SEALED",
  MINT: "TOP",
  GOOD: "MID",
  PLAYED: "POOR",
};

export function normalizeStoredCardCondition(value: string): CardCondition | null {
  if ((CARD_CONDITIONS as readonly string[]).includes(value)) {
    return value as CardCondition;
  }

  if (value in LEGACY_CARD_CONDITION_MAP) {
    return LEGACY_CARD_CONDITION_MAP[value as keyof typeof LEGACY_CARD_CONDITION_MAP];
  }

  return null;
}

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  pokemon: "포켓몬",
  trainer: "트레이너",
  energy: "에너지",
};

export interface CardSetSummary {
  id: number;
  setCode: string | null;
  setNameKo: string;
  setNameEn: string | null;
  seriesName: string | null;
  releaseDate: string | null;
  totalCards?: number | null;
}

export interface CardSeriesSummary {
  name: string;
  setCount: number;
}

export interface CardRarityMeta {
  filterKey: string;
  rarityName: string;
  rarityCode: string | null;
  displayNameKo: string | null;
  displayNameEn: string | null;
  sortOrder: number | null;
  badgeTone: string | null;
  filterValues: string[];
}

export interface CardMaster {
  id: number;
  game: string;
  language: string;
  setId: number;
  cardNo: string;
  localCode: string | null;
  cardNameKo: string;
  cardNameEn: string | null;
  cardNameJp: string | null;
  rarity: string;
  cardType: CardType;
  subtypes: string[];
  hp: number | null;
  elementTypes: string[];
  regulationMark: string | null;
  artist: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  set: CardSetSummary;
}

export interface OwnedCardSnapshot {
  cardId: number;
  cardNo: string;
  localCode: string | null;
  cardNameKo: string;
  cardNameEn: string | null;
  rarity: string;
  cardType: CardType;
  language: string;
  thumbnailUrl: string | null;
  imageUrl: string | null;
  setNameKo?: string | null;
  setCode?: string | null;
  seriesName: string | null;
  releaseDate: string | null;
}

export interface OwnedCardItem {
  id: string;
  userId: string;
  quantity: number;
  condition: CardCondition;
  memo: string | null;
  acquiredAt: string | null;
  createdAt: string;
  updatedAt: string;
  card: OwnedCardSnapshot;
}

export interface UserCollectionFile {
  version: 1;
  userId: string;
  items: OwnedCardItem[];
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface CreateOwnedCardInput {
  cardId: number;
  quantity: number;
  condition: CardCondition;
  memo?: string;
  acquiredAt?: string;
}

export interface BulkCreateOwnedCardInput {
  cardIds: number[];
  quantity: number;
  condition: CardCondition;
  memo?: string;
  acquiredAt?: string;
}

export interface UpdateOwnedCardInput {
  quantity: number;
  condition: CardCondition;
  memo?: string;
  acquiredAt?: string;
}
