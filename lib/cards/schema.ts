import { z } from "zod";
import {
  CARD_CONDITIONS,
  type CardCondition,
  type OwnedCardItem,
  type UpdateOwnedCardInput,
} from "@/lib/cards/types";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const userIdPattern = /^[A-Za-z0-9_-]+$/;

const collectionFormSchema = z.object({
  quantity: z.coerce
    .number()
    .int("수량은 정수여야 합니다.")
    .min(1, "수량은 1 이상이어야 합니다.")
    .max(999, "수량은 999 이하로 입력해 주세요."),
  condition: z.enum(CARD_CONDITIONS, {
    error: "지원하지 않는 카드 상태입니다.",
  }),
  memo: z.string().trim().max(500, "메모는 500자 이하로 입력해 주세요."),
  acquiredAt: z
    .string()
    .trim()
    .refine((value) => value === "" || datePattern.test(value), {
      message: "구매일은 YYYY-MM-DD 형식이어야 합니다.",
    }),
});

export const userIdSchema = z
  .string()
  .trim()
  .min(3, "사용자 ID는 3자 이상이어야 합니다.")
  .max(40, "사용자 ID는 40자 이하로 입력해 주세요.")
  .regex(userIdPattern, "사용자 ID는 영문, 숫자, `_`, `-`만 사용할 수 있습니다.");

export const catalogQuerySchema = z.object({
  q: z.string().trim().max(80, "검색어는 80자 이하로 입력해 주세요.").default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(20).default(10),
  setId: z.coerce.number().int().positive().optional(),
  rarities: z.array(z.string().trim().max(50)).optional(),
});

export const catalogSetQuerySchema = z.object({
  seriesName: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const catalogSeriesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const catalogRarityQuerySchema = z.object({
  setId: z.coerce.number().int().positive().optional(),
});

export type CollectionFormValues = {
  quantity: string;
  condition: CardCondition;
  memo: string;
  acquiredAt: string;
};

export type CollectionFieldErrors = Partial<Record<keyof CollectionFormValues, string>>;

export const emptyCollectionFormValues: CollectionFormValues = {
  quantity: "1",
  condition: "MINT",
  memo: "",
  acquiredAt: "",
};

export function toCollectionFormValues(item: OwnedCardItem): CollectionFormValues {
  return {
    quantity: String(item.quantity),
    condition: item.condition,
    memo: item.memo ?? "",
    acquiredAt: item.acquiredAt ?? "",
  };
}

function emptyToUndefined(value: string) {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseCollectionFormInput(raw: unknown):
  | { success: true; data: UpdateOwnedCardInput }
  | { success: false; formError: string; fieldErrors: CollectionFieldErrors } {
  const parsed = collectionFormSchema.safeParse(raw);

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    const fieldErrors = Object.fromEntries(
      Object.entries(flattened)
        .filter((entry): entry is [keyof CollectionFieldErrors, string[]] => entry[1] !== undefined)
        .map(([key, value]) => [key, value[0] ?? "입력값을 확인해 주세요."]),
    ) as CollectionFieldErrors;

    return {
      success: false,
      formError: "입력값을 다시 확인해 주세요.",
      fieldErrors,
    };
  }

  const { memo, acquiredAt, ...rest } = parsed.data;

  return {
    success: true,
    data: {
      ...rest,
      memo: emptyToUndefined(memo),
      acquiredAt: emptyToUndefined(acquiredAt),
    },
  };
}
