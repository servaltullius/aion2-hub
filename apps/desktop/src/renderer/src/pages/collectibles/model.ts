import { isObject } from "../../lib/guards.js";

export type CollectibleKind = "TRACE" | "CUBE" | "MATERIAL";
export type CollectibleScope = "ACCOUNT" | "CHARACTER";
export type CollectibleFaction = "ELYOS" | "ASMO" | "BOTH";

export type CollectibleListItem = {
  id: string;
  kind: CollectibleKind;
  map: string;
  faction: CollectibleFaction | null;
  region: string | null;
  name: string;
  note: string | null;
  x: number | null;
  y: number | null;
  source: string | null;
  done: boolean;
};

export type CollectibleMap = {
  name: string;
  order: number;
  type: string | null;
  tileWidth: number;
  tileHeight: number;
  tilesCountX: number;
  tilesCountY: number;
  width: number;
  height: number;
  source: string | null;
};

export function asCollectibleList(value: unknown): CollectibleListItem[] | null {
  if (!Array.isArray(value)) return null;
  const out: CollectibleListItem[] = [];
  for (const v of value) {
    if (!isObject(v)) return null;
    const obj = v as Record<string, unknown>;
    const id = typeof obj.id === "string" ? obj.id : "";
    const kind = obj.kind === "TRACE" || obj.kind === "CUBE" || obj.kind === "MATERIAL" ? (obj.kind as CollectibleKind) : null;
    const map = typeof obj.map === "string" ? obj.map : "";
    const name = typeof obj.name === "string" ? obj.name : "";
    if (!id || !kind || !map || !name) return null;

    const faction = obj.faction === "ELYOS" || obj.faction === "ASMO" || obj.faction === "BOTH" ? (obj.faction as CollectibleFaction) : null;
    const region = obj.region === null || typeof obj.region === "string" ? (obj.region as string | null) : null;
    const note = obj.note === null || typeof obj.note === "string" ? (obj.note as string | null) : null;
    const x = obj.x === null || typeof obj.x === "number" ? (obj.x as number | null) : null;
    const y = obj.y === null || typeof obj.y === "number" ? (obj.y as number | null) : null;
    const source = obj.source === null || typeof obj.source === "string" ? (obj.source as string | null) : null;
    const done = Boolean(obj.done);
    out.push({ id, kind, map, faction, region, name, note, x, y, source, done });
  }
  return out;
}

export function asCollectibleMaps(value: unknown): CollectibleMap[] | null {
  if (!Array.isArray(value)) return null;
  const out: CollectibleMap[] = [];
  for (const v of value) {
    if (!isObject(v)) return null;
    const obj = v as Record<string, unknown>;
    const name = typeof obj.name === "string" ? obj.name : "";
    const order = typeof obj.order === "number" ? obj.order : 999;
    const type = obj.type === null || typeof obj.type === "string" ? (obj.type as string | null) : null;

    const tileWidth = typeof obj.tileWidth === "number" ? obj.tileWidth : 0;
    const tileHeight = typeof obj.tileHeight === "number" ? obj.tileHeight : 0;
    const tilesCountX = typeof obj.tilesCountX === "number" ? obj.tilesCountX : 0;
    const tilesCountY = typeof obj.tilesCountY === "number" ? obj.tilesCountY : 0;
    const width = typeof obj.width === "number" ? obj.width : 0;
    const height = typeof obj.height === "number" ? obj.height : 0;

    if (!name || tileWidth <= 0 || tileHeight <= 0 || tilesCountX <= 0 || tilesCountY <= 0 || width <= 0 || height <= 0) return null;

    const source = obj.source === null || typeof obj.source === "string" ? (obj.source as string | null) : null;
    out.push({ name, order, type, tileWidth, tileHeight, tilesCountX, tilesCountY, width, height, source });
  }
  return out.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

export function humanizeToken(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll(/\\s+/g, " ")
    .trim();
}

export function displayName(item: CollectibleListItem) {
  const raw = item.name.trim();
  if (!raw) return item.kind === "CUBE" ? "Hidden Cube" : item.kind === "MATERIAL" ? "Monolith Material" : "Trace";
  if (raw.startsWith("aion2im:")) return item.kind === "CUBE" ? "Hidden Cube" : item.kind === "MATERIAL" ? "Monolith Material" : raw;
  if (item.kind === "MATERIAL" && /^[0-9]+$/.test(raw)) return `Monolith Material #${raw}`;
  if (/^[A-Za-z0-9_:-]+$/.test(raw)) return humanizeToken(raw);
  return raw;
}
