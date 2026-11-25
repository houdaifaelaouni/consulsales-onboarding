/** Turning a client's CSV into leads. Pure, so every rule is tested. The database re-checks lengths and removes duplicates. */
export const MAX_ROWS = 5000;
export const MAX_FILE_BYTES = 1_000_000;

export interface ParsedLead {
  full_name: string; title: string; company: string; linkedin_key: string; linkedin_url: string;
  first_name?: string; last_name?: string; email?: string; phone?: string; company_domain?: string; location?: string;
}
export type SkipReason = "no_name" | "no_profile" | "not_a_profile" | "duplicate_in_file";
export interface ParseResult {
  rows: ParsedLead[];
  skipped: Array<{ line: number; reason: SkipReason }>;
  error: "empty" | "too_big" | "too_many" | "no_columns" | null;
}

/** "https://de.linkedin.com/in/Ana-Costa/?trk=x" gives { key: "ana-costa", url: "https://www.linkedin.com/in/ana-costa/" }. Anything that is not a personal profile gives null. */
export function normalizeLinkedin(raw: string): { key: string; url: string } | null {
  let s = raw.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  let u: URL;
  try { u = new URL(s); } catch { return null; }
  if (!/(^|\.)linkedin\.com$/i.test(u.hostname)) return null;
  const m = u.pathname.match(/^\/in\/([^/]+)\/?/i);
  if (!m) return null;
  let id: string;
  try { id = decodeURIComponent(m[1]); } catch { return null; }
  id = id.trim().toLowerCase();
  if (!id || id.length > 100 || /[\s/?#]/.test(id)) return null;
  return { key: id, url: `https://www.linkedin.com/in/${encodeURIComponent(id)}/` };
}

/** RFC 4180 style: quoted fields, doubled quotes, line breaks inside quotes, CRLF, a leading BOM. The delimiter is guessed from the header. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const count = (c: string) => firstLine.split(c).length - 1;
  const delim = [";", "\t", ","].reduce((best, c) => (count(c) > count(best) ? c : best), ",");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === delim) { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");
const ALIASES: Record<"name" | "first" | "last" | "title" | "company" | "url" | "email" | "phone" | "domain" | "location", string[]> = {
  name: ["name", "fullname", "contactname", "person"],
  first: ["firstname", "first", "givenname"],
  last: ["lastname", "last", "surname", "familyname"],
  title: ["title", "jobtitle", "position", "role", "headline"],
  company: ["company", "companyname", "organization", "organisation", "employer"],
  url: ["linkedin", "linkedinurl", "linkedinprofile", "linkedinprofileurl", "profileurl", "profile", "url", "personlinkedinurl"],
  email: ["email", "emailaddress", "workemail", "mail", "e-mail"],
  phone: ["phone", "phonenumber", "mobile", "mobilenumber", "tel", "telephone"],
  domain: ["companydomain", "domain", "website", "companywebsite", "companyurl"],
  location: ["location", "city", "country", "region", "locationcity"],
};

export function parseLeadsCsv(text: string): ParseResult {
  const fail = (error: ParseResult["error"]): ParseResult => ({ rows: [], skipped: [], error });
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES) return fail("too_big");
  const table = parseCsv(text);
  if (table.length < 2) return fail("empty");
  const header = table[0].map(norm);
  const col = (k: keyof typeof ALIASES) => header.findIndex((h) => ALIASES[k].includes(h));
  const idx = {
    name: col("name"), first: col("first"), last: col("last"), title: col("title"), company: col("company"), url: col("url"),
    email: col("email"), phone: col("phone"), domain: col("domain"), location: col("location"),
  };
  if (idx.url < 0 || (idx.name < 0 && idx.first < 0)) return fail("no_columns");
  if (table.length - 1 > MAX_ROWS) return fail("too_many");

  const rows: ParsedLead[] = [];
  const skipped: ParseResult["skipped"] = [];
  const seen = new Set<string>();
  table.slice(1).forEach((cells, i) => {
    const line = i + 2;
    const get = (n: number) => (n >= 0 ? (cells[n] ?? "").trim() : "");
    const full = idx.name >= 0 ? get(idx.name) : `${get(idx.first)} ${get(idx.last)}`.trim();
    if (!full) { skipped.push({ line, reason: "no_name" }); return; }
    const rawUrl = get(idx.url);
    if (!rawUrl) { skipped.push({ line, reason: "no_profile" }); return; }
    const p = normalizeLinkedin(rawUrl);
    if (!p) { skipped.push({ line, reason: "not_a_profile" }); return; }
    if (seen.has(p.key)) { skipped.push({ line, reason: "duplicate_in_file" }); return; }
    seen.add(p.key);
    // Extra columns are kept only when the file has them, so an older list still imports the same five fields.
    const extra: Partial<ParsedLead> = {};
    if (get(idx.first)) extra.first_name = get(idx.first).slice(0, 80);
    if (get(idx.last)) extra.last_name = get(idx.last).slice(0, 80);
    if (get(idx.email)) extra.email = get(idx.email).slice(0, 200);
    if (get(idx.phone)) extra.phone = get(idx.phone).slice(0, 40);
    if (get(idx.domain)) extra.company_domain = get(idx.domain).slice(0, 160);
    if (get(idx.location)) extra.location = get(idx.location).slice(0, 160);
    rows.push({ full_name: full.slice(0, 120), title: get(idx.title).slice(0, 160), company: get(idx.company).slice(0, 160), linkedin_key: p.key, linkedin_url: p.url, ...extra });
  });
  return { rows, skipped, error: rows.length === 0 ? "empty" : null };
}
