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
});
