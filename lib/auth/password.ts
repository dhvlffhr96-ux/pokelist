import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;

  return {
    algorithm: "scrypt" as const,
    salt,
    hash: hash.toString("hex"),
  };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const actualBuffer = (await scrypt(password, salt, expectedBuffer.length)) as Buffer;

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}
