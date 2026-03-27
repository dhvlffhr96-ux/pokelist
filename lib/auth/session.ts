import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";
import { getAppEnv } from "@/lib/env";
import { userIdSchema } from "@/lib/cards/schema";

const SESSION_COOKIE_NAME = "pokelist_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 14;

type SessionPayload = {
  userId: string;
  exp: number;
};

function getSessionSecret() {
  const secret = getAppEnv().sessionSecret;

  if (!secret) {
    throw new Error("APP_SESSION_SECRET 환경변수가 비어 있습니다.");
  }

  return secret;
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf-8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf-8");
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function parseCookies(cookieHeader: string | null) {
  if (!cookieHeader) {
    return new Map<string, string>();
  }

  return new Map(
    cookieHeader
      .split(";")
      .map((segment) => segment.trim())
      .filter(Boolean)
      .map((segment) => {
        const index = segment.indexOf("=");

        if (index === -1) {
          return [segment, ""];
        }

        return [segment.slice(0, index), decodeURIComponent(segment.slice(index + 1))];
      }),
  );
}

export function createSessionToken(userId: string) {
  const payload: SessionPayload = {
    userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  };
  const body = encodeBase64Url(JSON.stringify(payload));
  const signature = sign(body);

  return `${body}.${signature}`;
}

export function readSessionUserIdFromToken(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  const [body, signature] = token.split(".");

  if (!body || !signature) {
    return null;
  }

  const expectedSignature = sign(body);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(body)) as SessionPayload;
    const parsedUserId = userIdSchema.safeParse(payload.userId);

    if (!parsedUserId.success || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return parsedUserId.data;
  } catch {
    return null;
  }
}

export function readSessionUserIdFromRequest(request: Request) {
  const cookies = parseCookies(request.headers.get("cookie"));

  return readSessionUserIdFromToken(cookies.get(SESSION_COOKIE_NAME));
}

export function applySessionCookie(response: NextResponse, userId: string) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: createSessionToken(userId),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}
