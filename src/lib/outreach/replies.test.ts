import { describe, expect, it } from "vitest";
import { parseIncoming, parseRelation } from "./replies";

const relation = {
  event: "new_relation", account_id: "acc1", account_type: "LINKEDIN", webhook_name: "",
  user_full_name: "Satya Nadella", user_provider_id: "ACoAAA1", user_public_identifier: "satyanadella",
};

const message = {
  event: "message_received", account_id: "acc1", account_type: "LINKEDIN", chat_id: "chat1",
  message_id: "m1", message: "Sounds good", timestamp: "2026-11-24T09:41:07.000Z",
  account_info: { type: "LINKEDIN", feature: "classic", user_id: "ACoOWN" },
  sender: { attendee_id: "a1", attendee_name: "Ana", attendee_provider_id: "ACoLEAD", attendee_public_identifier: "ana-costa" },
};

describe("parseRelation", () => {
  it("reads the account and the person who accepted", () => {
    expect(parseRelation(relation)).toEqual({ accountId: "acc1", providerId: "ACoAAA1", publicIdentifier: "satyanadella" });
  });
  it("ignores other events and payloads without an account or a person", () => {
    expect(parseRelation({ ...relation, event: "message_received" })).toBeNull();
    expect(parseRelation({ ...relation, account_id: "" })).toBeNull();
    expect(parseRelation({ event: "new_relation" })).toBeNull();
    expect(parseRelation(null)).toBeNull();
  });
});

describe("parseIncoming", () => {
  it("reads a message written by the lead", () => {
    expect(parseIncoming(message)).toMatchObject({
      accountId: "acc1", chatId: "chat1", text: "Sounds good", contactProviderId: "ACoLEAD", contactKey: "ana-costa", fromContact: true,
    });
  });
  it("ignores a message we sent ourselves (Unipile sends those here too)", () => {
    expect(parseIncoming({ ...message, sender: { ...message.sender, attendee_provider_id: "ACoOWN" } })).toBeNull();
  });
  it("ignores other events, groups without a chat and payloads without a sender", () => {
    expect(parseIncoming({ ...message, event: "message_read" })).toBeNull();
    expect(parseIncoming({ ...message, chat_id: undefined })).toBeNull();
    expect(parseIncoming({ ...message, sender: undefined })).toBeNull();
    expect(parseIncoming("nope")).toBeNull();
  });
});
