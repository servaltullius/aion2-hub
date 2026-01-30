export type BuiltinCollectibleMapType = "light" | "dark" | "abyss";

export type BuiltinCollectibleMap = {
  name: string;
  order: number;
  isVisible: boolean;
  tileWidth: number;
  tileHeight: number;
  tilesCountX: number;
  tilesCountY: number;
  type: BuiltinCollectibleMapType;
  source: string;
};

// Source: aion2-interactive-map/aion2-interactive-map (public/data/maps.yaml)
export const builtinCollectibleMaps: BuiltinCollectibleMap[] = [
  {
    name: "World_L_A",
    order: 0,
    isVisible: true,
    tileWidth: 1024,
    tileHeight: 1024,
    tilesCountX: 8,
    tilesCountY: 8,
    type: "light",
    source: "aion2-interactive-map"
  },
  {
    name: "World_D_A",
    order: 1,
    isVisible: true,
    tileWidth: 1024,
    tileHeight: 1024,
    tilesCountX: 8,
    tilesCountY: 8,
    type: "dark",
    source: "aion2-interactive-map"
  },
  {
    name: "World_L_B",
    order: 2,
    isVisible: false,
    tileWidth: 1024,
    tileHeight: 1024,
    tilesCountX: 6,
    tilesCountY: 6,
    type: "light",
    source: "aion2-interactive-map"
  },
  {
    name: "World_D_B",
    order: 3,
    isVisible: false,
    tileWidth: 1024,
    tileHeight: 1024,
    tilesCountX: 8,
    tilesCountY: 8,
    type: "dark",
    source: "aion2-interactive-map"
  },
  {
    name: "World_L_Starter",
    order: 4,
    isVisible: true,
    tileWidth: 1024,
    tileHeight: 1024,
    tilesCountX: 4,
    tilesCountY: 4,
    type: "light",
    source: "aion2-interactive-map"
  },
  {
    name: "World_D_Starter",
    order: 5,
    isVisible: true,
    tileWidth: 1024,
    tileHeight: 1024,
    tilesCountX: 5,
    tilesCountY: 5,
    type: "dark",
    source: "aion2-interactive-map"
  },
  {
    name: "Abyss_Reshanta_A",
    order: 6,
    isVisible: true,
    tileWidth: 1024,
    tileHeight: 1024,
    tilesCountX: 4,
    tilesCountY: 4,
    type: "abyss",
    source: "aion2-interactive-map"
  },
  {
    name: "Abyss_Reshanta_B",
    order: 7,
    isVisible: true,
    tileWidth: 1024,
    tileHeight: 1024,
    tilesCountX: 2,
    tilesCountY: 2,
    type: "abyss",
    source: "aion2-interactive-map"
  }
];

export function findBuiltinCollectibleMap(name: string) {
  return builtinCollectibleMaps.find((m) => m.name === name) ?? null;
}

export function mapPixelSize(map: { tileWidth: number; tileHeight: number; tilesCountX: number; tilesCountY: number }) {
  return {
    width: map.tileWidth * map.tilesCountX,
    height: map.tileHeight * map.tilesCountY
  };
}

