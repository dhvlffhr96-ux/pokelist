import { CatalogRepository } from "@/lib/cards/catalog-repository";
import { FileCollectionRepository } from "@/lib/cards/file-collection-repository";
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
const fileCollectionRepository = new FileCollectionRepository();

export async function searchCatalogCards(params: {
  query?: string;
  page?: number;
  pageSize?: number;
  setId?: number;
}) {
  const parsed = catalogQuerySchema.parse({
    q: params.query,
    page: params.page,
    pageSize: params.pageSize,
    setId: params.setId,
  });

  return catalogRepository.searchCards({
    query: parsed.q,
    page: parsed.page,
    pageSize: parsed.pageSize,
    setId: parsed.setId,
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

export async function listUserCollection(userId: string) {
  const normalizedUserId = userIdSchema.parse(userId);
  const collection = await fileCollectionRepository.readUserCollection(normalizedUserId);

  return {
    ...collection,
    storagePath: fileCollectionRepository.getStoragePath(normalizedUserId),
  };
}

export async function addOwnedCard(userId: string, input: CreateOwnedCardInput) {
  const normalizedUserId = userIdSchema.parse(userId);
  const card = await catalogRepository.getCardById(input.cardId);

  if (!card) {
    throw new Error("선택한 마스터 카드를 찾지 못했습니다.");
  }

  return fileCollectionRepository.upsertOwnedCard(normalizedUserId, card, input);
}

export async function updateOwnedCard(
  userId: string,
  itemId: string,
  input: UpdateOwnedCardInput,
) {
  const normalizedUserId = userIdSchema.parse(userId);

  return fileCollectionRepository.updateOwnedCard(normalizedUserId, itemId, input);
}

export async function deleteOwnedCard(userId: string, itemId: string) {
  const normalizedUserId = userIdSchema.parse(userId);

  return fileCollectionRepository.deleteOwnedCard(normalizedUserId, itemId);
}
