export interface Disaster {
  id: number;
  name: string;
  type: "flood" | "fire" | "storm" | "gas_leak" | "earthquake";
  severity: 1 | 2 | 3;
  lat: number;
  lon: number;
  radiusMeters: number;
}

export interface CirclePolygon {
  type: "Feature";
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
}
