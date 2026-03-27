import { CatalogRepository } from "@/lib/cards/catalog-repository";
import { StorageCollectionRepository } from "@/lib/cards/storage-collection-repository";
import {
  catalogQuerySchema,
  catalogSeriesQuerySchema,
  catalogSetQuerySchema,
  userIdSchema,
} from "@/lib/cards/schema";
import type {
  CreateOwnedCardInput,
  UpdateOwnedCardInput,
} from "@/lib/cards/types";

const catalogRepository = new CatalogRepository();
const storageCollectionRepository = new StorageCollectionRepository();

export async function searchCatalogCards(params: {
  query?: string;
  page?: number;
  pageSize?: number;
  setId?: number;
  rarity?: string;
  rarityCode?: string;
}) {
  const parsed = catalogQuerySchema.parse({
    q: params.query,
    page: params.page,
    pageSize: params.pageSize,
    setId: params.setId,
    rarity: params.rarity,
    rarityCode: params.rarityCode,
  });

  return catalogRepository.searchCards({
    query: parsed.q,
    page: parsed.page,
    pageSize: parsed.pageSize,
    setId: parsed.setId,
    rarity: parsed.rarity,
    rarityCode: parsed.rarityCode,
  });
}

export async function searchCatalogSets(query: string, limit = 10) {
  const parsed = catalogSetQuerySchema.parse({
    seriesName: query || undefined,
    limit,
  });

  return catalogRepository.searchCardSets(parsed.seriesName, parsed.limit);
}

export async function listCatalogSeries(limit = 100) {
  const parsed = catalogSeriesQuerySchema.parse({ limit });

  return catalogRepository.listCardSeries(parsed.limit);
}

export async function listCatalogRarities() {
  return catalogRepository.listCardRarities();
}

export async function listUserCollection(userId: string) {
  const normalizedUserId = userIdSchema.parse(userId);
  const collection = await storageCollectionRepository.readUserCollection(normalizedUserId);

  return {
    ...collection,
    storagePath: storageCollectionRepository.getStoragePath(normalizedUserId),
  };
}

export async function addOwnedCard(userId: string, input: CreateOwnedCardInput) {
  const normalizedUserId = userIdSchema.parse(userId);
  const card = await catalogRepository.getCardById(input.cardId);

  if (!card) {
    throw new Error("선택한 마스터 카드를 찾지 못했습니다.");
  }

  return storageCollectionRepository.upsertOwnedCard(normalizedUserId, card, input);
}

export async function updateOwnedCard(
  userId: string,
  itemId: string,
  input: UpdateOwnedCardInput,
) {
  const normalizedUserId = userIdSchema.parse(userId);

  return storageCollectionRepository.updateOwnedCard(normalizedUserId, itemId, input);
}

export async function deleteOwnedCard(userId: string, itemId: string) {
  const normalizedUserId = userIdSchema.parse(userId);

  return storageCollectionRepository.deleteOwnedCard(normalizedUserId, itemId);
}
