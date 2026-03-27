import { parseLoginInput, parseRegisterInput } from "@/lib/auth/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { readSessionUserIdFromRequest } from "@/lib/auth/session";
import { StorageUserAccountRepository } from "@/lib/auth/storage-user-account-repository";

const userAccountRepository = new StorageUserAccountRepository();

export class AuthAccessError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function registerUserAccount(raw: unknown) {
  const parsed = parseRegisterInput(raw);

  if (!parsed.success) {
    return parsed;
  }

  const existing = await userAccountRepository.readUserAccount(parsed.data.userId);

  if (existing) {
    return {
      success: false as const,
      formError: "이미 사용 중인 사용자 ID입니다.",
      fieldErrors: {
        userId: "이미 사용 중인 사용자 ID입니다.",
      },
    };
  }

  const hashed = await hashPassword(parsed.data.password);
  await userAccountRepository.createUserAccount({
    userId: parsed.data.userId,
    passwordAlgorithm: hashed.algorithm,
    passwordSalt: hashed.salt,
    passwordHash: hashed.hash,
  });

  return {
    success: true as const,
    data: {
      userId: parsed.data.userId,
    },
  };
}

export async function loginUserAccount(raw: unknown) {
  const parsed = parseLoginInput(raw);

  if (!parsed.success) {
    return parsed;
  }

  const account = await userAccountRepository.readUserAccount(parsed.data.userId);

  if (!account) {
    return {
      success: false as const,
      formError: "아이디 또는 비밀번호가 올바르지 않습니다.",
      fieldErrors: {
        userId: "아이디 또는 비밀번호가 올바르지 않습니다.",
      },
    };
  }

  const isValidPassword = await verifyPassword(
    parsed.data.password,
    account.passwordSalt,
    account.passwordHash,
  );

  if (!isValidPassword) {
    return {
      success: false as const,
      formError: "아이디 또는 비밀번호가 올바르지 않습니다.",
      fieldErrors: {
        password: "아이디 또는 비밀번호가 올바르지 않습니다.",
      },
    };
  }

  return {
    success: true as const,
    data: {
      userId: account.userId,
    },
  };
}

export function getSessionUserId(request: Request) {
  return readSessionUserIdFromRequest(request);
}

export function requireAuthorizedUser(request: Request, userId: string) {
  const sessionUserId = getSessionUserId(request);

  if (!sessionUserId) {
    throw new AuthAccessError("로그인이 필요합니다.", 401);
  }

  if (sessionUserId !== userId) {
    throw new AuthAccessError("로그인한 사용자 본인 목록만 수정할 수 있습니다.", 403);
  }

  return sessionUserId;
}
