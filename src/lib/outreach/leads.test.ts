import { describe, expect, it } from "vitest";
import { MAX_ROWS, normalizeLinkedin, parseCsv, parseLeadsCsv } from "./leads";

describe("normalizeLinkedin", () => {
  it("reduces any profile address to a lower-case key and a clean url", () => {
    for (const raw of ["https://www.linkedin.com/in/Ana-Costa/", "linkedin.com/in/ana-costa", "http://de.linkedin.com/in/ana-costa/?trk=abc#x", "  https://uk.linkedin.com/in/ana-costa/details/experience  "]) {
      expect(normalizeLinkedin(raw)).toEqual({ key: "ana-costa", url: "https://www.linkedin.com/in/ana-costa/" });
    }
  });
  it("keeps encoded characters and long ids", () => {
    expect(normalizeLinkedin("https://www.linkedin.com/in/jos%C3%A9-pe%C3%B1a-12/")?.key).toBe("josé-peña-12");
    expect(normalizeLinkedin("https://www.linkedin.com/in/ACoAABcdEfGh")?.key).toBe("acoaabcdefgh");
  });
  it("refuses company pages, Sales Navigator, other sites, and junk", () => {
    for (const raw of ["https://www.linkedin.com/company/acme/", "https://www.linkedin.com/sales/lead/ACwAAB", "https://example.com/in/ana", "https://linkedin.com.evil.com/in/ana", "not a url", "", "https://www.linkedin.com/in/"]) {
      expect(normalizeLinkedin(raw)).toBeNull();
    }
  });
});

describe("parseCsv", () => {
  it("handles quotes, doubled quotes, line breaks in quotes, CRLF and a BOM", () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n"line\nbreak",z')).toEqual([["a", "b"], ["x, y", 'say "hi"'], ["line\nbreak", "z"]]);
  });
  it("guesses semicolon and tab delimiters", () => {
    expect(parseCsv("a;b\n1;2")).toEqual([["a", "b"], ["1", "2"]]);
    expect(parseCsv("a\tb\n1\t2")).toEqual([["a", "b"], ["1", "2"]]);
  });
  it("drops blank lines", () => expect(parseCsv("a,b\n\n1,2\n\n")).toEqual([["a", "b"], ["1", "2"]]));
});

describe("parseLeadsCsv", () => {
  const csv = (body: string) => parseLeadsCsv(`Name,Job Title,Company,LinkedIn URL\n${body}`);
  it("reads a normal file and cleans the profile address", () => {
    const r = csv("Ana Costa,Founder,Nova,https://www.linkedin.com/in/Ana-Costa/?x=1");
    expect(r.error).toBeNull();
    expect(r.rows).toEqual([{ full_name: "Ana Costa", title: "Founder", company: "Nova", linkedin_key: "ana-costa", linkedin_url: "https://www.linkedin.com/in/ana-costa/" }]);
  });
  it("joins first and last name when there is no full name column", () => {
    const r = parseLeadsCsv("First Name,Last Name,Profile URL\nMarc,Dubois,linkedin.com/in/marc-dubois");
    expect(r.rows[0]).toMatchObject({ full_name: "Marc Dubois", linkedin_key: "marc-dubois", title: "", company: "" });
  });
  it("skips rows with no name, no profile, a non-profile, or a repeat, and says which line", () => {
    const r = csv(",CEO,Acme,https://www.linkedin.com/in/a\nBob,CEO,Acme,\nCy,CEO,Acme,https://www.linkedin.com/company/acme\nDee,CEO,Acme,https://www.linkedin.com/in/dee\nDee Two,CEO,Acme,linkedin.com/in/DEE");
    expect(r.rows.map((x) => x.linkedin_key)).toEqual(["dee"]);
    expect(r.skipped).toEqual([{ line: 2, reason: "no_name" }, { line: 3, reason: "no_profile" }, { line: 4, reason: "not_a_profile" }, { line: 6, reason: "duplicate_in_file" }]);
  });
  it("reports a file with no usable columns, no rows, too many rows, or too big", () => {
    expect(parseLeadsCsv("Foo,Bar\n1,2").error).toBe("no_columns");
    expect(parseLeadsCsv("Name,LinkedIn URL\n").error).toBe("empty");
    expect(parseLeadsCsv("").error).toBe("empty");
    const many = "Name,LinkedIn URL\n" + Array.from({ length: MAX_ROWS + 1 }, (_, i) => `P${i},linkedin.com/in/p${i}`).join("\n");
    expect(parseLeadsCsv(many).error).toBe("too_many");
    expect(parseLeadsCsv("x".repeat(1_000_001)).error).toBe("too_big");
  });
  it("trims long fields to what the database accepts", () => {
    const r = csv(`${"N".repeat(300)},${"T".repeat(300)},${"C".repeat(300)},linkedin.com/in/long`);
    expect(r.rows[0].full_name).toHaveLength(120);
    expect(r.rows[0].title).toHaveLength(160);
    expect(r.rows[0].company).toHaveLength(160);
  });
});
