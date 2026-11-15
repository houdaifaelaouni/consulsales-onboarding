import { randomBytes } from "node:crypto";

/** A strong random secret for keys the founder just needs to exist (for example the scheduled-jobs secret). Server only. */
export const makeSecret = (bytes = 32): string => randomBytes(bytes).toString("base64url");
