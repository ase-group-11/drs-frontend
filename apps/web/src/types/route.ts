export interface RouteCoordinate {
  lon: number;
  lat: number;
}

export interface RouteGeometry {
  type: "LineString";
  coordinates: number[][];
}

export interface MapboxRoute {
  geometry: RouteGeometry;
  distance: number;
  duration: number;
}

export interface RoutePolygon {
  type: "Feature";
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
  properties: Record<string, any>;
}
