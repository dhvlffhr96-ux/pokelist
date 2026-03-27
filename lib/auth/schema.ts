import { z } from "zod";
import { userIdSchema } from "@/lib/cards/schema";

const passwordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 합니다.")
  .max(72, "비밀번호는 72자 이하로 입력해 주세요.");

const registerSchema = z
  .object({
    userId: userIdSchema,
    password: passwordSchema,
    passwordConfirm: z.string(),
  })
  .superRefine((data, context) => {
    if (data.password !== data.passwordConfirm) {
      context.addIssue({
        code: "custom",
        path: ["passwordConfirm"],
        message: "비밀번호 확인이 일치하지 않습니다.",
      });
    }
  });

const loginSchema = z.object({
  userId: userIdSchema,
  password: passwordSchema,
});

export type AuthFieldErrors = Partial<
  Record<"userId" | "password" | "passwordConfirm", string>
>;

function toFieldErrors(error: z.ZodError): AuthFieldErrors {
  const flattened = error.flatten().fieldErrors;

  return Object.fromEntries(
    Object.entries(flattened)
      .filter((entry): entry is [keyof AuthFieldErrors, string[]] => entry[1] !== undefined)
      .map(([key, value]) => [key, value[0] ?? "입력값을 확인해 주세요."]),
  ) as AuthFieldErrors;
}

export function parseRegisterInput(raw: unknown):
  | {
      success: true;
      data: {
        userId: string;
        password: string;
      };
    }
  | {
      success: false;
      formError: string;
      fieldErrors: AuthFieldErrors;
    } {
  const parsed = registerSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      formError: "입력값을 다시 확인해 주세요.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  return {
    success: true,
    data: {
      userId: parsed.data.userId,
      password: parsed.data.password,
    },
  };
}

export function parseLoginInput(raw: unknown):
  | {
      success: true;
      data: {
        userId: string;
        password: string;
      };
    }
  | {
      success: false;
      formError: string;
      fieldErrors: AuthFieldErrors;
    } {
  const parsed = loginSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      formError: "입력값을 다시 확인해 주세요.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  return {
    success: true,
    data: parsed.data,
  };
}
