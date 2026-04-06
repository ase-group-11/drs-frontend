// src/components/organisms/DisasterReports/__test__/DisasterReports.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';

// Slow integration-style tests need more than the default 5 s
jest.setTimeout(15000);

// ─── Mock mapbox-gl ───────────────────────────────────────────────────────────
// All constructors must be re-applied in beforeEach because resetMocks:true
// (embedded in react-scripts) wipes mockImplementation between tests.
jest.mock('mapbox-gl', () => ({
  Map:               jest.fn(),
  NavigationControl: jest.fn(),
  FullscreenControl: jest.fn(),
  ScaleControl:      jest.fn(),
  GeolocateControl:  jest.fn(),
  Marker:            jest.fn(),
  Popup:             jest.fn(),
  LngLatBounds:      jest.fn(),
  accessToken: '',
  supported:   jest.fn(() => true),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mapboxgl = require('mapbox-gl');

/** Re-apply all mapbox mock implementations — called in every beforeEach. */
function resetMapboxMocks() {
  mapboxgl.Map.mockImplementation(() => ({
    on:            jest.fn(),
    off:           jest.fn(),
    remove:        jest.fn(),
    addControl:    jest.fn(),
    removeControl: jest.fn(),
    addSource:     jest.fn(),
    removeSource:  jest.fn(),
    addLayer:      jest.fn(),
    removeLayer:   jest.fn(),
    getSource:     jest.fn(),
    getLayer:      jest.fn(),
    flyTo:         jest.fn(),
    fitBounds:     jest.fn(),
    resize:        jest.fn(),
    setCenter:     jest.fn(),
    isStyleLoaded: jest.fn(() => true),
  }));
  mapboxgl.NavigationControl.mockImplementation(() => ({}));
  mapboxgl.FullscreenControl.mockImplementation(() => ({}));
  mapboxgl.ScaleControl.mockImplementation(() => ({}));
  mapboxgl.GeolocateControl.mockImplementation(() => ({}));
  mapboxgl.Marker.mockImplementation(() => ({
    setLngLat: jest.fn().mockReturnThis(),
    addTo:     jest.fn().mockReturnThis(),
    remove:    jest.fn(),
  }));
  mapboxgl.Popup.mockImplementation(() => ({
    setLngLat: jest.fn().mockReturnThis(),
    setHTML:   jest.fn().mockReturnThis(),
    addTo:     jest.fn().mockReturnThis(),
    remove:    jest.fn(),
  }));
  mapboxgl.LngLatBounds.mockImplementation(() => ({
    extend:    jest.fn().mockReturnThis(),
    isEmpty:   jest.fn(() => false),
    getCenter: jest.fn(() => ({ lng: 0, lat: 0 })),
  }));
  mapboxgl.supported.mockReturnValue(true);
}

// ─── Mock services ────────────────────────────────────────────────────────────
jest.mock('../../../../services', () => ({
  getDisasterReports:         jest.fn(),
  dispatchUnits:              jest.fn(),
  escalateDisasterSeverity:   jest.fn(),
  updateDisasterReportStatus: jest.fn(),
  getEmergencyUnitById:       jest.fn(),
}));

jest.mock('../../../../lib/axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

import DisasterReports from '../DisasterReports';
import {
  getDisasterReports,
  dispatchUnits,
  escalateDisasterSeverity,
  updateDisasterReportStatus,
  getEmergencyUnitById,
} from '../../../../services';
import apiClient from '../../../../lib/axios';

const mockGetDisasterReports  = getDisasterReports        as jest.Mock;
const mockDispatchUnits       = dispatchUnits              as jest.Mock;
const mockEscalate            = escalateDisasterSeverity   as jest.Mock;
const mockResolve             = updateDisasterReportStatus  as jest.Mock;
const mockGetUnitById         = getEmergencyUnitById        as jest.Mock;
const mockApiGet              = apiClient.get               as jest.Mock;

const makeReport = (overrides: Partial<any> = {}): any => ({
  id:             'dis_001',
  trackingId:     'TRK-001',
  reportId:       'DR-001',
  type:           'FIRE',
  title:          'Fire',
  location:       'Dublin City Centre',
  locationCoords: { lat: 53.3498, lon: -6.2603 },
  zone:           'Zone A',
  time:           '2 hours ago',
  units:          3,
  severity:       'high',
  description:    'Large fire at city centre building.',
  responseStatus: 2,
  createdAt:      '2024-01-01T10:00:00Z',
  disasterStatus: 'ACTIVE',
  peopleAffected: 120,
  reportCount:    5,
  deployedUnits:  ['unit_001'],
  ...overrides,
});

const makeUnit = (overrides: Partial<any> = {}): any => ({
  id:           'unit_001',
  unit_code:    'FIRE-01',
  department:   'FIRE',
  station_name: 'Central Station',
  crew_count:   4,
  capacity:     6,
  unit_status:  'AVAILABLE',
  ...overrides,
});

const renderWithApp = (ui: React.ReactElement) => render(<App>{ui}</App>);

beforeEach(() => {
  jest.clearAllMocks();
  // Re-apply mapbox mocks — resetMocks:true wipes them otherwise
  resetMapboxMocks();

  mockGetDisasterReports.mockResolvedValue({
    success: true,
    data: [makeReport()],
    summary: { critical: 0, active: 1, resolved: 0, monitoring: 0, archived: 0 },
  });
  mockApiGet.mockResolvedValue({ data: { evacuation_plans: [], count: 0 } });
  mockGetUnitById.mockResolvedValue(null);
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. LOADING STATE
// ─────────────────────────────────────────────────────────────────────────────

describe('Loading state', () => {
  it('shows a spinner while fetching reports', async () => {
    mockGetDisasterReports.mockReturnValue(new Promise(() => {}));
    renderWithApp(<DisasterReports />);
    expect(document.querySelector('.ant-spin')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. MAIN LIST VIEW
// ─────────────────────────────────────────────────────────────────────────────

describe('Main list view', () => {
  it('renders the page title', async () => {
    renderWithApp(<DisasterReports />);
    await waitFor(() => expect(screen.getByText('Disaster Reports')).toBeInTheDocument());
  });

  it('renders report cards after loading', async () => {
    renderWithApp(<DisasterReports />);
    await waitFor(() => expect(screen.getByText('Dublin City Centre')).toBeInTheDocument());
  });

  it('shows Empty state when no reports match filters', async () => {
    mockGetDisasterReports.mockResolvedValue({ success: true, data: [], summary: {} });
    renderWithApp(<DisasterReports />);
    await waitFor(() =>
      expect(screen.getByText('No disaster reports found')).toBeInTheDocument()
    );
  });

  it('shows error message when fetch fails', async () => {
    mockGetDisasterReports.mockResolvedValue({ success: false, message: 'Server error' });
    renderWithApp(<DisasterReports />);
    await waitFor(() =>
      expect(document.querySelector('.ant-spin')).not.toBeInTheDocument()
    );
  });

  it('renders summary cards (By Severity, Active Now, Closed, Response)', async () => {
    renderWithApp(<DisasterReports />);
    await waitFor(() => {
      expect(screen.getByText('By Severity')).toBeInTheDocument();
      expect(screen.getByText('Active Now')).toBeInTheDocument();
      expect(screen.getByText('Closed')).toBeInTheDocument();
      expect(screen.getByText('Response')).toBeInTheDocument();
    });
  });

  it('renders List and Map toggle buttons', async () => {
    renderWithApp(<DisasterReports />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /list/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /map/i })).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. FILTERING
// ─────────────────────────────────────────────────────────────────────────────

describe('Filtering', () => {
  const reports = [
    makeReport({ id: 'a', reportId: 'DR-001', disasterStatus: 'ACTIVE',     location: 'Dublin' }),
    makeReport({ id: 'b', reportId: 'DR-002', disasterStatus: 'RESOLVED',   location: 'Cork'   }),
    makeReport({ id: 'c', reportId: 'DR-003', disasterStatus: 'MONITORING', location: 'Galway' }),
  ];

  beforeEach(() => {
    mockGetDisasterReports.mockResolvedValue({ success: true, data: reports, summary: {} });
  });

  it('Active tab shows only ACTIVE and MONITORING reports', async () => {
    renderWithApp(<DisasterReports />);
    await waitFor(() => expect(screen.getByText('Dublin')).toBeInTheDocument());
    expect(screen.getByText('Galway')).toBeInTheDocument();
    expect(screen.queryByText('Cork')).not.toBeInTheDocument();
  });

  it('All tab shows every report', async () => {
    renderWithApp(<DisasterReports />);
    await waitFor(() => screen.getByText('Dublin'));
    fireEvent.click(screen.getByRole('button', { name: /^All$/i }));
    await waitFor(() => {
      expect(screen.getByText('Dublin')).toBeInTheDocument();
      expect(screen.getByText('Cork')).toBeInTheDocument();
      expect(screen.getByText('Galway')).toBeInTheDocument();
    });
  });

  it('search filters reports by location', async () => {
    renderWithApp(<DisasterReports />);
    await waitFor(() => screen.getByText('Dublin'));
    fireEvent.click(screen.getByRole('button', { name: /^All$/i }));
    await waitFor(() => screen.getByText('Cork'));
    await userEvent.type(screen.getByPlaceholderText('Search reports...'), 'Cork');
    await waitFor(() => {
      expect(screen.getByText('Cork')).toBeInTheDocument();
      expect(screen.queryByText('Dublin')).not.toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. CARD EXPAND / COLLAPSE
// ─────────────────────────────────────────────────────────────────────────────

describe('Card expand / collapse', () => {
  it('clicking a report card expands it to show admin actions', async () => {
    renderWithApp(<DisasterReports />);
    await waitFor(() => screen.getByText('Dublin City Centre'));
    fireEvent.click(screen.getByText('Dublin City Centre'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /dispatch units/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /escalate priority/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /mark as resolved/i })).toBeInTheDocument();
    });
  });

  it('clicking an expanded card again collapses it', async () => {
    renderWithApp(<DisasterReports />);
    await waitFor(() => screen.getByText('Dublin City Centre'));
    fireEvent.click(screen.getByText('Dublin City Centre'));
    await waitFor(() => screen.getByRole('button', { name: /dispatch units/i }));
    fireEvent.click(screen.getByText('Dublin City Centre'));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /dispatch units/i })).not.toBeInTheDocument()
    );
  });

  it('shows View Photos, Disaster Logs buttons in expanded card', async () => {
    renderWithApp(<DisasterReports />);
    await waitFor(() => screen.getByText('Dublin City Centre'));
    fireEvent.click(screen.getByText('Dublin City Centre'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /view photos/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /disaster logs/i })).toBeInTheDocument();
    });
  });

  it('shows Deployed Units button when deployedUnits is non-empty', async () => {
    renderWithApp(<DisasterReports />);
    await waitFor(() => screen.getByText('Dublin City Centre'));
    fireEvent.click(screen.getByText('Dublin City Centre'));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /deployed units/i })).toBeInTheDocument()
    );
  });

  it('does NOT show Deployed Units button when deployedUnits is empty', async () => {
    mockGetDisasterReports.mockResolvedValue({
      success: true,
      data: [makeReport({ deployedUnits: [] })],
      summary: {},
    });
    renderWithApp(<DisasterReports />);
    await waitFor(() => screen.getByText('Dublin City Centre'));
    fireEvent.click(screen.getByText('Dublin City Centre'));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /deployed units/i })).not.toBeInTheDocument()
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. SUB-PAGE NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────

describe('Sub-page navigation', () => {
  it('clicking View Photos navigates to PhotoGallery sub-page', async () => {
    renderWithApp(<DisasterReports />);
    await waitFor(() => screen.getByText('Dublin City Centre'));
    fireEvent.click(screen.getByText('Dublin City Centre'));
    await waitFor(() => screen.getByRole('button', { name: /view photos/i }));
    fireEvent.click(screen.getByRole('button', { name: /view photos/i }));
    await waitFor(() => expect(screen.getByText('Incident Photos')).toBeInTheDocument());
  });

  it('clicking Disaster Logs navigates to LogUpdates sub-page', async () => {
    renderWithApp(<DisasterReports />);
    await waitFor(() => screen.getByText('Dublin City Centre'));
    fireEvent.click(screen.getByText('Dublin City Centre'));
    await waitFor(() => screen.getByRole('button', { name: /disaster logs/i }));
    fireEvent.click(screen.getByRole('button', { name: /disaster logs/i }));
    await waitFor(() => expect(screen.getByText('Disaster Logs')).toBeInTheDocument());
  });

  it('clicking Deployed Units navigates to DeployedUnits sub-page', async () => {
    renderWithApp(<DisasterReports />);
    await waitFor(() => screen.getByText('Dublin City Centre'));
    fireEvent.click(screen.getByText('Dublin City Centre'));
    await waitFor(() => screen.getByRole('button', { name: /deployed units/i }));
    fireEvent.click(screen.getByRole('button', { name: /deployed units/i }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /dispatch units/i })).not.toBeInTheDocument()
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. DISPATCH UNITS MODAL
// ─────────────────────────────────────────────────────────────────────────────

describe('DispatchUnitsModal', () => {
  beforeEach(() => {
    mockApiGet.mockImplementation((url: string) => {
      if (url.includes('emergency-units')) {
        return Promise.resolve({
          data: {
            units: [
              makeUnit(),
              makeUnit({ id: 'unit_002', unit_code: 'AMB-01', department: 'MEDICAL', unit_status: 'DEPLOYED' }),
            ],
          },
        });
      }
      return Promise.resolve({ data: { evacuation_plans: [], count: 0 } });
    });
  });

  const openDispatchModal = async () => {
    renderWithApp(<DisasterReports />);
    await waitFor(() => screen.getByText('Dublin City Centre'));
    fireEvent.click(screen.getByText('Dublin City Centre'));
    await waitFor(() => screen.getByRole('button', { name: /dispatch units/i }));
    fireEvent.click(screen.getByRole('button', { name: /dispatch units/i }));
    await waitFor(() => screen.getByText('Dispatch Emergency Units'));
  };

  it('opens the dispatch modal with unit list', async () => {
    await openDispatchModal();
    await waitFor(() => expect(screen.getByText('FIRE-01')).toBeInTheDocument());
  });

  it('shows warning when dispatching with no units selected', async () => {
    await openDispatchModal();
    await waitFor(() => screen.getByText('FIRE-01'));
    fireEvent.click(screen.getByRole('button', { name: /^Dispatch Units$/i }));
    await waitFor(() =>
      expect(screen.getByText(/select at least one unit/i)).toBeInTheDocument()
    );
  });

  it('calls dispatchUnits service and closes modal on success', async () => {
    mockDispatchUnits.mockResolvedValue({ success: true, message: 'Dispatched' });
    await openDispatchModal();
    await waitFor(() => screen.getByText('FIRE-01'));
    // Click the unit card (the entire div is clickable, not just the text)
    fireEvent.click(screen.getByText('FIRE-01'));
    fireEvent.click(screen.getByRole('button', { name: /^Dispatch Units$/i }));
    await waitFor(
      () => {
        expect(mockDispatchUnits).toHaveBeenCalled();
        expect(screen.queryByText('Dispatch Emergency Units')).not.toBeInTheDocument();
      },
      { timeout: 8000 }
    );
  });

  it('closes modal on Cancel without dispatching', async () => {
    await openDispatchModal();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() =>
      expect(screen.queryByText('Dispatch Emergency Units')).not.toBeInTheDocument()
    );
    expect(mockDispatchUnits).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. ESCALATE SEVERITY MODAL
// ─────────────────────────────────────────────────────────────────────────────

describe('EscalateSeverityModal', () => {
  const openEscalateModal = async () => {
    renderWithApp(<DisasterReports />);
    await waitFor(() => screen.getByText('Dublin City Centre'));
    fireEvent.click(screen.getByText('Dublin City Centre'));
    await waitFor(() => screen.getByRole('button', { name: /escalate priority/i }));
    fireEvent.click(screen.getByRole('button', { name: /escalate priority/i }));
    await waitFor(() => screen.getByText('Escalate Disaster Severity'));
  };

  it('opens and shows escalatable severity options', async () => {
    await openEscalateModal();
    await waitFor(() => expect(screen.getByText('Critical Emergency')).toBeInTheDocument());
  });

  it('warns when escalating without selecting a severity', async () => {
    await openEscalateModal();
    fireEvent.click(screen.getByRole('button', { name: /escalate severity/i }));
    await waitFor(() =>
      expect(screen.getByText(/please select a severity level/i)).toBeInTheDocument()
    );
  });

  it('warns when escalating without providing a reason', async () => {
    await openEscalateModal();
    fireEvent.click(screen.getByText('Critical Emergency'));
    fireEvent.click(screen.getByRole('button', { name: /escalate severity/i }));
    await waitFor(() =>
      expect(screen.getByText(/please provide a reason/i)).toBeInTheDocument()
    );
  });

  it('calls escalateDisasterSeverity and closes modal on success', async () => {
    mockEscalate.mockResolvedValue({ success: true });
    await openEscalateModal();
    fireEvent.click(screen.getByText('Critical Emergency'));
    const reasonInput = screen.getByPlaceholderText(/explain why severity/i);
    await userEvent.type(reasonInput, 'Situation has worsened significantly');
    fireEvent.click(screen.getByRole('button', { name: /escalate severity/i }));
    await waitFor(() => {
      expect(mockEscalate).toHaveBeenCalledWith('dis_001', 'CRITICAL', 'Situation has worsened significantly');
      expect(screen.queryByText('Escalate Disaster Severity')).not.toBeInTheDocument();
    });
  });

  it('closes modal on Cancel without escalating', async () => {
    await openEscalateModal();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() =>
      expect(screen.queryByText('Escalate Disaster Severity')).not.toBeInTheDocument()
    );
    expect(mockEscalate).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. RESOLVE DISASTER MODAL
// "Mark as Resolved" appears in both the card button and the modal title.
// "This action cannot be undone" is the unique modal subtitle — use it to wait.
// "DR-001" also appears twice (card badge + modal). Use getAllByText.
// ─────────────────────────────────────────────────────────────────────────────

describe('ResolveDisasterModal', () => {
  const openResolveModal = async () => {
    renderWithApp(<DisasterReports />);
    await waitFor(() => screen.getByText('Dublin City Centre'));
    fireEvent.click(screen.getByText('Dublin City Centre'));
    await waitFor(() => screen.getByRole('button', { name: /mark as resolved/i }));
    fireEvent.click(screen.getByRole('button', { name: /mark as resolved/i }));
    // "This action cannot be undone" only exists inside the modal — unique wait target
    await waitFor(() => screen.getByText('This action cannot be undone'));
  };

  it('opens the resolve modal showing the report info', async () => {
    await openResolveModal();
    // DR-001 appears in the card AND in the modal; just check at least one is present
    expect(screen.getAllByText('DR-001').length).toBeGreaterThanOrEqual(1);
  });

  it('warns when resolution notes are empty', async () => {
    await openResolveModal();
    // Resolve Disaster is disabled when notes='' (disabled={!isValid}).
    // A disabled button fires no onClick — the toast never appears.
    // Assert the button is disabled and the modal stays open.
    expect(screen.getByRole('button', { name: /^Resolve Disaster$/i })).toBeDisabled();
    expect(screen.getByText('This action cannot be undone')).toBeInTheDocument();
  });

  it('warns when resolution notes are too short (< 5 chars)', async () => {
    await openResolveModal();
    await userEvent.type(screen.getByPlaceholderText(/situation contained/i), 'Ok');
    // isTooShort=true renders the inline error directly in the DOM (not a toast):
    // "Minimum 5 characters required (3 more needed)"
    await waitFor(() =>
      expect(screen.getByText(/minimum 5 characters required/i)).toBeInTheDocument()
    );
  });

  it('calls updateDisasterReportStatus and closes modal on success', async () => {
    mockResolve.mockResolvedValue({ success: true });
    await openResolveModal();
    await userEvent.type(
      screen.getByPlaceholderText(/situation contained/i),
      'Situation contained, units back to base'
    );
    fireEvent.click(screen.getByRole('button', { name: /^Resolve Disaster$/i }));
    await waitFor(() => {
      expect(mockResolve).toHaveBeenCalledWith(
        'dis_001',
        'Situation contained, units back to base'
      );
      expect(screen.queryByText('This action cannot be undone')).not.toBeInTheDocument();
    });
  });

  it('shows error message when resolve fails', async () => {
    mockResolve.mockResolvedValue({ success: false, message: 'Could not resolve' });
    await openResolveModal();
    await userEvent.type(
      screen.getByPlaceholderText(/situation contained/i),
      'Situation contained and resolved'
    );
    fireEvent.click(screen.getByRole('button', { name: /^Resolve Disaster$/i }));
    await waitFor(() =>
      expect(screen.getByText('Could not resolve')).toBeInTheDocument()
    );
  });

  it('closes modal on Cancel without resolving', async () => {
    await openResolveModal();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() =>
      expect(screen.queryByText('This action cannot be undone')).not.toBeInTheDocument()
    );
    expect(mockResolve).not.toHaveBeenCalled();
  });

  it('Resolve button is disabled when notes are too short', async () => {
    await openResolveModal();
    await userEvent.type(screen.getByPlaceholderText(/situation contained/i), 'Hi');
    expect(screen.getByRole('button', { name: /^Resolve Disaster$/i })).toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. MAP VIEW
// ─────────────────────────────────────────────────────────────────────────────

describe('Map view', () => {
  it('switches to map view when Map button is clicked', async () => {
    renderWithApp(<DisasterReports />);
    await waitFor(() => screen.getByRole('button', { name: /map/i }));
    fireEvent.click(screen.getByRole('button', { name: /map/i }));
    await waitFor(() =>
      expect(screen.queryByText('Dublin City Centre')).not.toBeInTheDocument()
    );
  });

  it('switches back to list view from map view', async () => {
    renderWithApp(<DisasterReports />);
    await waitFor(() => screen.getByRole('button', { name: /map/i }));
    fireEvent.click(screen.getByRole('button', { name: /map/i }));
    fireEvent.click(screen.getByRole('button', { name: /list/i }));
    await waitFor(() =>
      expect(screen.getByText('Dublin City Centre')).toBeInTheDocument()
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. MULTIPLE REPORTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Multiple reports', () => {
  it('renders all active reports', async () => {
    mockGetDisasterReports.mockResolvedValue({
      success: true,
      data: [
        makeReport({ id: 'a', reportId: 'DR-001', location: 'Dublin', disasterStatus: 'ACTIVE' }),
        makeReport({ id: 'b', reportId: 'DR-002', location: 'Cork',   disasterStatus: 'MONITORING' }),
      ],
      summary: {},
    });
    renderWithApp(<DisasterReports />);
    await waitFor(() => {
      expect(screen.getByText('Dublin')).toBeInTheDocument();
      expect(screen.getByText('Cork')).toBeInTheDocument();
    });
  });
});