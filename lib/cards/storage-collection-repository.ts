import { z } from "zod";
import { getAppEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import type { Database } from "@/lib/supabase/database.types";
import {
  isMissingBucketError,
  isMissingObjectError,
} from "@/lib/supabase/storage-errors";
import type {
  BulkCreateOwnedCardInput,
  CardMaster,
  CreateOwnedCardInput,
  OwnedCardItem,
  OwnedCardSnapshot,
  UpdateOwnedCardInput,
  UserCollectionFile,
} from "@/lib/cards/types";

type CardReleaseLookupRow = Pick<Database["public"]["Tables"]["cards"]["Row"], "id"> & {
  card_sets: Pick<Database["public"]["Tables"]["card_sets"]["Row"], "release_date"> | null;
};

const cardSnapshotSchema = z.object({
  cardId: z.number().int().positive(),
  cardNo: z.string(),
  localCode: z.string().nullable(),
  cardNameKo: z.string(),
  cardNameEn: z.string().nullable(),
  rarity: z.string(),
  cardType: z.enum(["pokemon", "trainer", "energy"]),
  language: z.string(),
  thumbnailUrl: z.string().nullable(),
  imageUrl: z.string().nullable(),
  setNameKo: z.string(),
  setCode: z.string().nullable(),
  seriesName: z.string().nullable(),
  releaseDate: z.string().nullable().optional().default(null),
});

const ownedCardItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  quantity: z.number().int().min(1).max(999),
  condition: z.enum(["SEALED", "MINT", "GOOD", "PLAYED"]),
  memo: z.string().nullable(),
  acquiredAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  card: cardSnapshotSchema,
});

const userCollectionFileSchema = z.object({
  version: z.literal(1),
  userId: z.string(),
  items: z.array(ownedCardItemSchema),
});

function nowIso() {
  return new Date().toISOString();
}

function sortItems(items: OwnedCardItem[]) {
  return [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function toCardSnapshot(card: CardMaster): OwnedCardSnapshot {
  return {
    cardId: card.id,
    cardNo: card.cardNo,
    localCode: card.localCode,
    cardNameKo: card.cardNameKo,
    cardNameEn: card.cardNameEn,
    rarity: card.rarity,
    cardType: card.cardType,
    language: card.language,
    thumbnailUrl: card.thumbnailUrl,
    imageUrl: card.imageUrl,
    setNameKo: card.set.setNameKo,
    setCode: card.set.setCode,
    seriesName: card.set.seriesName,
    releaseDate: card.set.releaseDate,
  };
}

function buildCreatedItem(userId: string, card: CardMaster, input: CreateOwnedCardInput, timestamp: string): OwnedCardItem {
  return {
    id: crypto.randomUUID(),
    userId,
    quantity: input.quantity,
    condition: input.condition,
    memo: input.memo ?? null,
    acquiredAt: input.acquiredAt ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
    card: toCardSnapshot(card),
  };
}

function createEmptyCollection(userId: string): UserCollectionFile {
  return {
    version: 1,
    userId,
    items: [],
  };
}

export class StorageCollectionRepository {
  private async backfillLegacyReleaseDates(collection: UserCollectionFile) {
    const missingCardIds = [...new Set(
      collection.items
        .filter((item) => !item.card.releaseDate)
        .map((item) => item.card.cardId),
    )];

    if (missingCardIds.length === 0) {
      return collection;
    }

    const supabase = createSupabaseAdminClient();
    const releaseDateByCardId = new Map<number, string | null>();
    const chunkSize = 200;

    try {
      for (let index = 0; index < missingCardIds.length; index += chunkSize) {
        const chunk = missingCardIds.slice(index, index + chunkSize);
        const { data, error } = await supabase
          .from("cards")
          .select(`
            id,
            card_sets (
              release_date
            )
          `)
          .in("id", chunk);

        if (error) {
          throw new Error(error.message);
        }

        for (const row of (data as CardReleaseLookupRow[]) ?? []) {
          releaseDateByCardId.set(row.id, row.card_sets?.release_date ?? null);
        }
      }
    } catch {
      return collection;
    }

    if (releaseDateByCardId.size === 0) {
      return collection;
    }

    let didHydrate = false;
    const nextCollection: UserCollectionFile = {
      ...collection,
      items: sortItems(collection.items.map((item) => {
        if (item.card.releaseDate) {
          return item;
        }

        const releaseDate = releaseDateByCardId.get(item.card.cardId) ?? null;

        if (!releaseDate) {
          return item;
        }

        didHydrate = true;

        return {
          ...item,
          card: {
            ...item.card,
            releaseDate,
          },
        };
      })),
    };

    if (!didHydrate) {
      return collection;
    }

    try {
      await this.writeUserCollection(nextCollection);
    } catch {
      return nextCollection;
    }

    return nextCollection;
  }

  private getBucketName() {
    return getAppEnv().userCollectionBucket;
  }

  private getObjectPath(userId: string) {
    return `${userId}.json`;
  }

  getStoragePath(userId: string) {
    return `supabase://${this.getBucketName()}/${this.getObjectPath(userId)}`;
  }

  createEmptyUserCollection(userId: string) {
    return createEmptyCollection(userId);
  }

  async findUserCollection(userId: string) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .storage
      .from(this.getBucketName())
      .download(this.getObjectPath(userId));

    if (error) {
      if (isMissingBucketError(error)) {
        throw new Error(
          `Supabase Storage 버킷 "${this.getBucketName()}"를 찾지 못했습니다.`,
        );
      }

      if (isMissingObjectError(error)) {
        return null;
      }

      throw new Error("사용자 카드 목록을 스토리지에서 읽지 못했습니다.");
    }

    if (!data) {
      throw new Error("사용자 카드 목록을 스토리지에서 읽지 못했습니다.");
    }

    try {
      const raw = await data.text();
      const parsed = userCollectionFileSchema.parse(JSON.parse(raw));

      if (parsed.userId !== userId) {
        throw new Error("사용자 ID와 저장된 문서가 일치하지 않습니다.");
      }

      const normalizedCollection = {
        ...parsed,
        items: sortItems(parsed.items),
      };

      return this.backfillLegacyReleaseDates(normalizedCollection);
    } catch {
      throw new Error("사용자 카드 목록 문서 형식이 올바르지 않습니다.");
    }
  }

  async readUserCollection(userId: string) {
    const collection = await this.findUserCollection(userId);

    return collection ?? createEmptyCollection(userId);
  }

  async writeUserCollection(collection: UserCollectionFile) {
    const supabase = createSupabaseAdminClient();
    const normalized = {
      ...collection,
      items: sortItems(collection.items),
    };
    const payload = `${JSON.stringify(normalized, null, 2)}\n`;
    const { error } = await supabase
      .storage
      .from(this.getBucketName())
      .upload(
        this.getObjectPath(collection.userId),
        new Blob([payload], { type: "application/json; charset=utf-8" }),
        {
          contentType: "application/json; charset=utf-8",
          upsert: true,
          cacheControl: "0",
        },
      );

    if (error) {
      if (isMissingBucketError(error)) {
        throw new Error(
          `Supabase Storage 버킷 "${this.getBucketName()}"를 찾지 못했습니다.`,
        );
      }

      throw new Error("사용자 카드 목록을 스토리지에 저장하지 못했습니다.");
    }

    return normalized;
  }

  async upsertOwnedCard(userId: string, card: CardMaster, input: CreateOwnedCardInput) {
    const collection = await this.readUserCollection(userId);
    const existing = collection.items.find((item) => item.card.cardId === input.cardId);
    const timestamp = nowIso();

    if (existing) {
      const nextItems = collection.items.map((item) =>
        item.id === existing.id
          ? {
              ...item,
              quantity: Math.min(item.quantity + input.quantity, 999),
              condition: input.condition,
              memo: input.memo ?? null,
              acquiredAt: input.acquiredAt ?? null,
              updatedAt: timestamp,
              card: toCardSnapshot(card),
            }
          : item,
      );

      const saved = await this.writeUserCollection({
        ...collection,
        items: nextItems,
      });

      return saved.items.find((item) => item.id === existing.id)!;
    }

    const nextItem = buildCreatedItem(userId, card, input, timestamp);

    const saved = await this.writeUserCollection({
      ...collection,
      items: [nextItem, ...collection.items],
    });

    return saved.items.find((item) => item.id === nextItem.id)!;
  }

  async upsertOwnedCards(userId: string, cards: CardMaster[], input: BulkCreateOwnedCardInput) {
    const collection = await this.readUserCollection(userId);
    const timestamp = nowIso();
    const nextItems = [...collection.items];
    const touchedItemIds: string[] = [];

    for (const card of cards) {
      const existingIndex = nextItems.findIndex((item) => item.card.cardId === card.id);

      if (existingIndex >= 0) {
        const existingItem = nextItems[existingIndex];
        nextItems[existingIndex] = {
          ...existingItem,
          quantity: Math.min(existingItem.quantity + input.quantity, 999),
          condition: input.condition,
          memo: input.memo ?? null,
          acquiredAt: input.acquiredAt ?? null,
          updatedAt: timestamp,
          card: toCardSnapshot(card),
        };
        touchedItemIds.push(existingItem.id);
        continue;
      }

      const createdItem = buildCreatedItem(
        userId,
        card,
        {
          cardId: card.id,
          quantity: input.quantity,
          condition: input.condition,
          memo: input.memo,
          acquiredAt: input.acquiredAt,
        },
        timestamp,
      );

      nextItems.push(createdItem);
      touchedItemIds.push(createdItem.id);
    }

    const saved = await this.writeUserCollection({
      ...collection,
      items: nextItems,
    });

    return saved.items.filter((item) => touchedItemIds.includes(item.id));
  }

  async updateOwnedCard(userId: string, itemId: string, input: UpdateOwnedCardInput) {
    const collection = await this.readUserCollection(userId);
    const existing = collection.items.find((item) => item.id === itemId);

    if (!existing) {
      throw new Error("수정할 사용자 카드를 찾지 못했습니다.");
    }

    const timestamp = nowIso();
    const saved = await this.writeUserCollection({
      ...collection,
      items: collection.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: input.quantity,
              condition: input.condition,
              memo: input.memo ?? null,
              acquiredAt: input.acquiredAt ?? null,
              updatedAt: timestamp,
            }
          : item,
      ),
    });

    return saved.items.find((item) => item.id === itemId)!;
  }

  async deleteOwnedCard(userId: string, itemId: string) {
    const collection = await this.readUserCollection(userId);
    const exists = collection.items.some((item) => item.id === itemId);

    if (!exists) {
      throw new Error("삭제할 사용자 카드를 찾지 못했습니다.");
    }

    await this.writeUserCollection({
      ...collection,
      items: collection.items.filter((item) => item.id !== itemId),
    });
  }
}
