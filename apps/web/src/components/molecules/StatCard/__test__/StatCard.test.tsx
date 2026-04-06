import React from 'react';
import { render, screen } from '@testing-library/react';
import StatCard from '../StatCard';

describe('StatCard — content rendering', () => {
  it('renders the label text', () => {
    render(<StatCard label="Total Incidents" value={42} />);
    expect(screen.getByText('Total Incidents')).toBeInTheDocument();
  });

  it('renders a numeric value', () => {
    render(<StatCard label="Teams" value={8} />);
    // toLocaleString of 8 is '8'
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('renders a zero value', () => {
    render(<StatCard label="Alerts" value={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders a large number (formatted by toLocaleString)', () => {
    render(<StatCard label="Reports" value={1000} />);
    // toLocaleString(1000) → '1,000' in en-US / '1,000' in en-IE
    const el = screen.getByText(/1.000|1,000/);
    expect(el).toBeInTheDocument();
  });

  it('renders the sub text when provided', () => {
    render(<StatCard label="Users" value={5} sub="Active this month" />);
    expect(screen.getByText('Active this month')).toBeInTheDocument();
  });

  it('does not render sub text when omitted', () => {
    render(<StatCard label="Users" value={5} />);
    expect(screen.queryByText(/Active this month/)).not.toBeInTheDocument();
  });

  it('renders without crashing when value is a string number', () => {
    const { container } = render(<StatCard label="Count" value="99" />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders without crashing with a custom color prop', () => {
    const { container } = render(<StatCard label="X" value={1} color="#ef4444" />);
    expect(container.firstChild).not.toBeNull();
  });
});
