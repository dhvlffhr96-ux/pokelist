import { CatalogRepository } from "@/lib/cards/catalog-repository";
import { StorageUserAccountRepository } from "@/lib/auth/storage-user-account-repository";
import { StorageCollectionRepository } from "@/lib/cards/storage-collection-repository";
import {
  catalogQuerySchema,
  catalogRarityQuerySchema,
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
const userAccountRepository = new StorageUserAccountRepository();

export class UserCollectionLookupError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function searchCatalogCards(params: {
  query?: string;
  page?: number;
  pageSize?: number;
  seriesName?: string;
  setId?: number;
  rarities?: string[];
}) {
  const parsed = catalogQuerySchema.parse({
    q: params.query,
    page: params.page,
    pageSize: params.pageSize,
    seriesName: params.seriesName,
    setId: params.setId,
    rarities: params.rarities,
  });

  return catalogRepository.searchCards({
    query: parsed.q,
    page: parsed.page,
    pageSize: parsed.pageSize,
    seriesName: parsed.seriesName,
    setId: parsed.setId,
    rarities: parsed.rarities,
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

export async function listCatalogRarities(params?: {
  query?: string;
  seriesName?: string;
  setId?: number;
}) {
  const parsed = catalogRarityQuerySchema.parse({
    q: params?.query,
    seriesName: params?.seriesName,
    setId: params?.setId,
  });

  return catalogRepository.listCardRarities({
    query: parsed.q,
    seriesName: parsed.seriesName,
    setId: parsed.setId,
  });
}

export async function listUserCollection(userId: string) {
  const normalizedUserId = userIdSchema.parse(userId);
  const existingCollection =
    await storageCollectionRepository.findUserCollection(normalizedUserId);

  if (existingCollection) {
    return {
      ...existingCollection,
      storagePath: storageCollectionRepository.getStoragePath(normalizedUserId),
    };
  }

  const account = await userAccountRepository.readUserAccount(normalizedUserId);

  if (!account) {
    throw new UserCollectionLookupError("존재하지 않는 사용자 ID입니다.", 404);
  }

  return {
    ...storageCollectionRepository.createEmptyUserCollection(normalizedUserId),
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
