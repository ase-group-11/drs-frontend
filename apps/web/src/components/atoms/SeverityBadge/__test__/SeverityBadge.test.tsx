import React from 'react';
import { render, screen } from '@testing-library/react';
import SeverityBadge, { SEVERITY_CONFIG } from '../SeverityBadge';

describe('SeverityBadge — label rendering', () => {
  const levels = ['critical', 'high', 'medium', 'low', 'info'] as const;

  levels.forEach((level) => {
    it(`renders the correct label for severity "${level}"`, () => {
      render(<SeverityBadge severity={level} />);
      expect(screen.getByText(SEVERITY_CONFIG[level].label)).toBeInTheDocument();
    });
  });
});

describe('SeverityBadge — SEVERITY_CONFIG contract', () => {
  it('has exactly 5 severity levels defined', () => {
    expect(Object.keys(SEVERITY_CONFIG)).toHaveLength(5);
  });

  it('every level has a non-empty label, color, bg, and border', () => {
    Object.values(SEVERITY_CONFIG).forEach((cfg) => {
      expect(cfg.label.length).toBeGreaterThan(0);
      expect(cfg.color.length).toBeGreaterThan(0);
      expect(cfg.bg.length).toBeGreaterThan(0);
      expect(cfg.border.length).toBeGreaterThan(0);
    });
  });

  it('critical has the highest-urgency colour (red family)', () => {
    expect(SEVERITY_CONFIG.critical.color).toMatch(/#ef4444/i);
  });

  it('info has a calm colour (green family)', () => {
    expect(SEVERITY_CONFIG.info.color).toMatch(/#22c55e/i);
  });
});

describe('SeverityBadge — size prop', () => {
  it('renders without crashing at default size (sm)', () => {
    const { container } = render(<SeverityBadge severity="high" />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders without crashing at size md', () => {
    const { container } = render(<SeverityBadge severity="critical" size="md" />);
    expect(container.firstChild).not.toBeNull();
  });
});
