import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { getAppEnv } from "@/lib/env";
import type {
  CardMaster,
  CreateOwnedCardInput,
  OwnedCardItem,
  OwnedCardSnapshot,
  UpdateOwnedCardInput,
  UserCollectionFile,
} from "@/lib/cards/types";

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
  };
}

function createEmptyCollection(userId: string): UserCollectionFile {
  return {
    version: 1,
    userId,
    items: [],
  };
}

export class FileCollectionRepository {
  private getStorageRoot() {
    return path.join(
      /* turbopackIgnore: true */ process.cwd(),
      getAppEnv().userListStorageDir,
    );
  }

  private async ensureStorageRoot() {
    await mkdir(this.getStorageRoot(), { recursive: true });
  }

  private getFilePath(userId: string) {
    return path.join(this.getStorageRoot(), `${userId}.txt`);
  }

  getStoragePath(userId: string) {
    return this.getFilePath(userId);
  }

  async readUserCollection(userId: string) {
    await this.ensureStorageRoot();
    const filePath = this.getFilePath(userId);

    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = userCollectionFileSchema.parse(JSON.parse(raw));

      return {
        ...parsed,
        items: sortItems(parsed.items),
      };
    } catch (error) {
      if (isMissingFileError(error)) {
        return createEmptyCollection(userId);
      }

      throw new Error("사용자 카드 파일을 읽지 못했습니다.");
    }
  }

  async writeUserCollection(collection: UserCollectionFile) {
    await this.ensureStorageRoot();

    const filePath = this.getFilePath(collection.userId);
    const tempPath = `${filePath}.tmp`;
    const normalized = {
      ...collection,
      items: sortItems(collection.items),
    };

    await writeFile(tempPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
    await rename(tempPath, filePath);

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

    const nextItem: OwnedCardItem = {
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

    const saved = await this.writeUserCollection({
      ...collection,
      items: [nextItem, ...collection.items],
    });

    return saved.items.find((item) => item.id === nextItem.id)!;
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

function isMissingFileError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
