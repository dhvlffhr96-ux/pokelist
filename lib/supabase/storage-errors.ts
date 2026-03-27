export function isMissingObjectError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const statusCode =
    "statusCode" in error && error.statusCode !== null ? String(error.statusCode) : "";
  const message =
    "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";

  return (
    statusCode === "404" ||
    message.includes("not found") ||
    message.includes("no such object")
  );
}

export function isMissingBucketError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message =
    "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";

  return message.includes("bucket") && message.includes("not found");
}

export function isConflictStorageError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const statusCode =
    "statusCode" in error && error.statusCode !== null ? String(error.statusCode) : "";
  const message =
    "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";

  return statusCode === "409" || message.includes("already exists");
}
