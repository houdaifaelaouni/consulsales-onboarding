/**
 * Reading Unipile's two relationship webhooks. Pure, so the parsing is tested without a network or a database.
 * Neither payload is signed beyond the shared secret we check in the route.
 */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

export interface Relation {
  accountId: string;
  providerId: string;
  publicIdentifier: string | null;
}

/** `new_relation`: someone accepted an invitation (or connected through another device). */
export function parseRelation(body: unknown): Relation | null {
  if (!isObj(body) || body.event !== "new_relation") return null;
  const accountId = str(body.account_id);
  const providerId = str(body.user_provider_id);
  if (!accountId || !providerId) return null;
  return { accountId, providerId, publicIdentifier: str(body.user_public_identifier) };
}

export interface Incoming {
  accountId: string;
  chatId: string;
  text: string;
  /** Provider id of whoever wrote, and their public address when Unipile sends one. */
  contactProviderId: string | null;
  contactKey: string | null;
  /** False when the message came from the connected account itself (sent from LinkedIn or through the API). */
  fromContact: boolean;
}

/** `message_received` covers both sides, so the sender is compared with the connected account's own id. */
export function parseIncoming(body: unknown): Incoming | null {
  if (!isObj(body) || body.event !== "message_received") return null;
  const accountId = str(body.account_id);
  const chatId = str(body.chat_id);
  const sender = isObj(body.sender) ? body.sender : null;
  if (!accountId || !chatId || !sender) return null;
  const contactProviderId = str(sender.attendee_provider_id);
  const contactKey = str(sender.attendee_public_identifier);
  const own = isObj(body.account_info) ? str(body.account_info.user_id) : null;
  const fromContact = !own || !contactProviderId || contactProviderId !== own;
  if (!fromContact) return null;
  return { accountId, chatId, text: str(body.message) ?? "", contactProviderId, contactKey, fromContact };
}
