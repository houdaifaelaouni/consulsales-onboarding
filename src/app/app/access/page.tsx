"use client";

import { AccessBoard } from "@/components/access/access-board";
import { PreviewNote } from "@/components/shell/preview-note";
import type { AccessStates } from "@/lib/access/logic";

// TODO(backend): read connection rows and store credentials in Supabase Vault.
const INITIAL: AccessStates = {};

export default function ClientAccess() {
  return (<><PreviewNote /><AccessBoard initial={INITIAL} /></>);
}
