import { z } from "zod";
import { getAppEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import {
  isConflictStorageError,
  isMissingBucketError,
  isMissingObjectError,
} from "@/lib/supabase/storage-errors";

const userAccountFileSchema = z.object({
  version: z.literal(1),
  userId: z.string(),
  passwordAlgorithm: z.literal("scrypt"),
  passwordSalt: z.string(),
  passwordHash: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

type UserAccountFile = z.infer<typeof userAccountFileSchema>;

function nowIso() {
  return new Date().toISOString();
}

export class StorageUserAccountRepository {
  private getBucketName() {
    return getAppEnv().userCollectionBucket;
  }

  private getObjectPath(userId: string) {
    return `auth/${userId}.json`;
  }

  async readUserAccount(userId: string): Promise<UserAccountFile | null> {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .storage
      .from(this.getBucketName())
      .download(this.getObjectPath(userId));

    if (error) {
      if (isMissingBucketError(error)) {
        throw new Error(`Supabase Storage 버킷 "${this.getBucketName()}"를 찾지 못했습니다.`);
      }

      if (isMissingObjectError(error)) {
        return null;
      }

      throw new Error("사용자 계정 정보를 스토리지에서 읽지 못했습니다.");
    }

    if (!data) {
      throw new Error("사용자 계정 정보를 스토리지에서 읽지 못했습니다.");
    }

    try {
      const raw = await data.text();
      const parsed = userAccountFileSchema.parse(JSON.parse(raw));

      if (parsed.userId !== userId) {
        throw new Error("사용자 ID와 저장된 계정 문서가 일치하지 않습니다.");
      }

      return parsed;
    } catch {
      throw new Error("사용자 계정 문서 형식이 올바르지 않습니다.");
    }
  }

  async createUserAccount(input: {
    userId: string;
    passwordAlgorithm: "scrypt";
    passwordSalt: string;
    passwordHash: string;
  }) {
    const supabase = createSupabaseAdminClient();
    const timestamp = nowIso();
    const payload: UserAccountFile = {
      version: 1,
      userId: input.userId,
      passwordAlgorithm: input.passwordAlgorithm,
      passwordSalt: input.passwordSalt,
      passwordHash: input.passwordHash,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const body = `${JSON.stringify(payload, null, 2)}\n`;
    const { error } = await supabase
      .storage
      .from(this.getBucketName())
      .upload(
        this.getObjectPath(input.userId),
        new Blob([body], { type: "application/json; charset=utf-8" }),
        {
          contentType: "application/json; charset=utf-8",
          cacheControl: "0",
          upsert: false,
        },
      );

    if (error) {
      if (isMissingBucketError(error)) {
        throw new Error(`Supabase Storage 버킷 "${this.getBucketName()}"를 찾지 못했습니다.`);
      }

      if (isConflictStorageError(error)) {
        throw new Error("이미 사용 중인 사용자 ID입니다.");
      }

      throw new Error("사용자 계정을 스토리지에 저장하지 못했습니다.");
    }

    return payload;
  }
}
