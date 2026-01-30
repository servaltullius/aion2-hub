import { createHash } from "node:crypto";

import * as cheerio from "cheerio";

function normalizeNewlines(value: string) {
  return value.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function normalizeWhitespace(value: string) {
  return (
    value
      .replaceAll("\u00a0", " ")
      // collapse horizontal whitespace
      .replaceAll(/[ \t]+/g, " ")
      // trim each line
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      // collapse excessive blank lines
      .replaceAll(/\n{3,}/g, "\n\n")
      .trim()
  );
}

export function normalizeNoticeHtmlToText(contentHtml: string) {
  // Preserve some structure before extracting text.
  const htmlWithBreaks = contentHtml.replaceAll(/<br\s*\/?>/gi, "\n");

  const $ = cheerio.load(htmlWithBreaks);
  $("script,style,noscript").remove();

  // The PlayNC editor wraps text in many <div data-contents-type="text"> blocks.
  $('[data-contents-type="text"]').each((_, el) => {
    $(el).append("\n");
  });

  const text = $.root().text();
  return normalizeWhitespace(normalizeNewlines(text));
}

export function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeAndHashNoticeHtml(contentHtml: string) {
  const normalizedText = normalizeNoticeHtmlToText(contentHtml);
  const contentHash = sha256Hex(normalizedText);
  return { normalizedText, contentHash };
}
