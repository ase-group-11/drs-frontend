// src/__mocks__/mapbox-gl.ts
// Manual mock for mapbox-gl — jsdom has no WebGL so mapbox crashes without this.

const mapboxgl: any = {
  Map: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    off: jest.fn(),
    remove: jest.fn(),
    addControl: jest.fn(),
    removeControl: jest.fn(),
    addSource: jest.fn(),
    removeSource: jest.fn(),
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
    getSource: jest.fn(),
    getLayer: jest.fn(),
    flyTo: jest.fn(),
    fitBounds: jest.fn(),
    resize: jest.fn(),
    setCenter: jest.fn(),
    setZoom: jest.fn(),
    getCanvas: jest.fn(() => ({ style: {} })),
  })),
  Marker: jest.fn().mockImplementation(() => ({
    setLngLat: jest.fn().mockReturnThis(),
    setPopup: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
    remove: jest.fn(),
    getElement: jest.fn(() => document.createElement('div')),
  })),
  Popup: jest.fn().mockImplementation(() => ({
    setHTML: jest.fn().mockReturnThis(),
    setLngLat: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
    remove: jest.fn(),
    on: jest.fn(),
  })),
  NavigationControl: jest.fn(),
  accessToken: '',
  supported: jest.fn(() => true),
};

export default mapboxgl;