// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { GolferHeadshot, getGolferInitials } from '../GolferHeadshot';

describe('GolferHeadshot & Initials Fallback', () => {
  it('extracts initials correctly from golfer names', () => {
    expect(getGolferInitials('Scottie Scheffler')).toBe('SS');
    expect(getGolferInitials('Rory McIlroy')).toBe('RM');
    expect(getGolferInitials('Tiger')).toBe('TI');
    expect(getGolferInitials('')).toBe('PGA');
  });

  it('renders image component when headshot URL is provided', () => {
    render(
      <GolferHeadshot
        name="Scottie Scheffler"
        src="https://a.espncdn.com/i/headshots/golf/players/full/3470.png"
        size={48}
      />
    );

    const img = screen.getByAltText('Scottie Scheffler');
    expect(img).toBeInTheDocument();
  });

  it('renders initials badge fallback when no valid image src is provided', () => {
    render(
      <GolferHeadshot
        name="Rory McIlroy"
        src=""
        size={40}
      />
    );

    expect(screen.getByText('RM')).toBeInTheDocument();
    expect(screen.queryByAltText('Rory McIlroy')).not.toBeInTheDocument();
  });
});
