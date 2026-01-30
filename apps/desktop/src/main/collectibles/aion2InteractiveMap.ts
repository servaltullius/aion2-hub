import type { CollectibleFaction, CollectibleKind, CollectibleItemRow, DesktopDb } from "../storage/db.js";

type GithubContentEntry = {
  name: string;
  type: "file" | "dir";
  download_url: string | null;
};

type Aion2ImMarker = {
  category?: string;
  id?: string;
  name?: string;
  region?: string;
  subtype?: string;
  x?: number;
  y?: number;
};

const MARKERS_DIR_API =
  "https://api.github.com/repos/aion2-interactive-map/aion2-interactive-map/contents/public/data/markers?ref=master";

export async function syncCollectiblesFromAion2InteractiveMap(db: DesktopDb) {
  const entries = await fetchJson<GithubContentEntry[]>(MARKERS_DIR_API);
  const files = Array.isArray(entries)
    ? entries.filter((e) => e.type === "file" && typeof e.download_url === "string" && e.download_url.endsWith(".yaml"))
    : [];

  const items: Array<Omit<CollectibleItemRow, "createdAt" | "updatedAt">> = [];

  for (const f of files) {
    if (!f.download_url) continue;
    const map = f.name.replace(/\\.ya?ml$/i, "");
    const text = await fetchText(f.download_url);
    const markers = parseMarkersYaml(text);

    for (const m of markers) {
      const category = (m.category ?? "").trim();
      const subtype = (m.subtype ?? "").trim();
      const id = (m.id ?? "").trim();
      if (!id) continue;

      let kind: CollectibleKind | null = null;
      if (category === "location" && subtype === "seal") kind = "TRACE";
      if (category === "collection" && subtype === "monolithMaterial") kind = "MATERIAL";
      if (category === "collection" && subtype === "hiddenCube") kind = "CUBE";
      if (!kind) continue;

      const x = typeof m.x === "number" && Number.isFinite(m.x) ? m.x : null;
      const y = typeof m.y === "number" && Number.isFinite(m.y) ? m.y : null;
      const region = typeof m.region === "string" && m.region.trim() ? m.region.trim() : null;
      const upstreamName = typeof m.name === "string" ? m.name.trim() : "";

      const fullId = `aion2im:${id}`;
      const name = kind === "CUBE" ? fullId : upstreamName || fullId;

      items.push({
        id: fullId,
        kind,
        map,
        faction: factionFromMap(map),
        region,
        name,
        note: null,
        x,
        y,
        source: "aion2-interactive-map"
      });
    }
  }

  const result = db.importCollectibleItems({ items, defaultSource: "aion2-interactive-map" });
  return { ...result, fetchedFiles: files.length };
}

function factionFromMap(map: string): CollectibleFaction | null {
  const m = map.trim();
  if (!m) return null;
  if (m.startsWith("World_L_")) return "ELYOS";
  if (m.startsWith("World_D_")) return "ASMO";
  if (m.startsWith("Abyss_")) return "BOTH";
  return null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "AION2-HUB"
    }
  });
  if (!res.ok) throw new Error(`fetch_failed:${res.status}`);
  return (await res.json()) as T;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "AION2-HUB"
    }
  });
  if (!res.ok) throw new Error(`fetch_failed:${res.status}`);
  return await res.text();
}

function parseMarkersYaml(text: string): Aion2ImMarker[] {
  const out: Aion2ImMarker[] = [];
  let inMarkers = false;
  let current: Aion2ImMarker | null = null;

  const lines = text.split(/\\r?\\n/);
  for (const rawLine of lines) {
    const line = rawLine.replaceAll("\\t", "  ");
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (!inMarkers) {
      if (trimmed === "markers:" || trimmed.startsWith("markers:")) inMarkers = true;
      continue;
    }

    if (line.startsWith("- ")) {
      if (current) out.push(current);
      current = {};
      parseKeyValue(line.slice(2), current);
      continue;
    }

    if (!current) continue;

    // Ignore nested lists (e.g., images).
    if (line.startsWith("  -")) continue;
    if (!line.startsWith("  ")) continue;
    parseKeyValue(trimmed, current);
  }

  if (current) out.push(current);
  return out;
}

function parseKeyValue(line: string, target: Aion2ImMarker) {
  const idx = line.indexOf(":");
  if (idx === -1) return;
  const key = line.slice(0, idx).trim();
  const raw = line.slice(idx + 1).trim();
  const value = parseYamlScalar(raw);

  if (key === "category" && typeof value === "string") target.category = value;
  else if (key === "id" && typeof value === "string") target.id = value;
  else if (key === "name" && typeof value === "string") target.name = value;
  else if (key === "region" && typeof value === "string") target.region = value;
  else if (key === "subtype" && typeof value === "string") target.subtype = value;
  else if (key === "x" && typeof value === "number") target.x = value;
  else if (key === "y" && typeof value === "number") target.y = value;
}

function parseYamlScalar(value: string): unknown {
  if (!value) return "";
  if (value === "null" || value === "~") return null;

  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  if (value.startsWith("\"") && value.endsWith("\"")) {
    return value.slice(1, -1);
  }

  if (/^-?\\d+(?:\\.\\d+)?$/.test(value)) {
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  }

  return value;
}
