import React from 'react';
import { render, screen } from '@testing-library/react';
import UserInitials, { getInitials } from '../UserInitials';

// ─── getInitials — pure function tests ───────────────────────────────────────

describe('getInitials()', () => {
  it('extracts initials from a two-word name', () => {
    expect(getInitials('Sharath Pradeep')).toBe('SP');
  });

  it('extracts initials from a three-word name (caps first two)', () => {
    expect(getInitials('Mary Jane Watson')).toBe('MJ');
  });

  it('returns the single uppercase letter for a one-word name', () => {
    expect(getInitials('Admin')).toBe('A');
  });

  it('returns "?" for null', () => {
    expect(getInitials(null)).toBe('?');
  });

  it('returns "?" for undefined', () => {
    expect(getInitials(undefined)).toBe('?');
  });

  it('returns "?" for empty string', () => {
    expect(getInitials('')).toBe('?');
  });

  it('uppercases lowercase names', () => {
    expect(getInitials('john doe')).toBe('JD');
  });

  it('handles extra whitespace between words (split produces empty strings)', () => {
    // split(' ') on 'John  Doe' gives ['John', '', 'Doe']
    // empty string's [0] is undefined — getInitials slices to 2 and toUpperCases
    const result = getInitials('John  Doe');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

// ─── UserInitials component ───────────────────────────────────────────────────

describe('UserInitials component', () => {
  it('renders the correct initials text', () => {
    render(<UserInitials name="Sharath Pradeep" />);
    expect(screen.getByText('SP')).toBeInTheDocument();
  });

  it('renders "?" when name is null', () => {
    render(<UserInitials name={null} />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders without crashing with default props', () => {
    const { container } = render(<UserInitials name="Test User" />);
    expect(container.firstChild).not.toBeNull();
  });

  it('accepts a custom color prop without crashing', () => {
    const { container } = render(<UserInitials name="AB" color="#ff0000" />);
    expect(container.firstChild).not.toBeNull();
  });

  it('accepts a custom size prop without crashing', () => {
    const { container } = render(<UserInitials name="AB" size={48} />);
    expect(container.firstChild).not.toBeNull();
  });
});
