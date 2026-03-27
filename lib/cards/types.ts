export const CARD_CONDITIONS = ["SEALED", "MINT", "GOOD", "PLAYED"] as const;

export type CardCondition = (typeof CARD_CONDITIONS)[number];
export type CardType = "pokemon" | "trainer" | "energy";

export const CARD_CONDITION_LABELS: Record<CardCondition, string> = {
  SEALED: "미개봉",
  MINT: "민트급",
  GOOD: "양호",
  PLAYED: "사용감 있음",
};

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
  rarityName: string;
  rarityCode: string | null;
  displayNameKo: string | null;
  displayNameEn: string | null;
  sortOrder: number | null;
  badgeTone: string | null;
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
  setNameKo: string;
  setCode: string | null;
  seriesName: string | null;
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

export interface UpdateOwnedCardInput {
  quantity: number;
  condition: CardCondition;
  memo?: string;
  acquiredAt?: string;
}
