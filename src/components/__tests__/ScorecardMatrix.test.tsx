// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScorecardMatrix } from '../ScorecardMatrix';
import { NormalizedPlayerSummary, NormalizedCompetitor } from '@/lib/espn';

describe('ScorecardMatrix Component', () => {
  const mockNormalizedSummary: NormalizedPlayerSummary = {
    player: {
      id: '4604625',
      displayName: 'Scottie Scheffler',
      shortName: 'S. Scheffler',
      initials: 'SS',
      headshotUrls: ['https://a.espncdn.com/i/headshots/golf/players/full/4604625.png'],
    },
    rounds: [
      {
        period: 1,
        displayValue: '67',
        scoreToPar: -5,
        formattedScore: '-5',
        frontPar: 36,
        frontStrokes: 33,
        backPar: 36,
        backStrokes: 34,
        totalPar: 72,
        totalStrokes: 67,
        holes: [
          { hole: 1, par: 4, strokes: 3, diff: -1, scoreType: 'birdie', badgeClass: 'bg-tertiary/15 text-tertiary border border-tertiary font-bold', isPlayed: true },
          { hole: 2, par: 5, strokes: 3, diff: -2, scoreType: 'eagle', badgeClass: 'bg-amber-500 text-amber-950 border border-amber-400 font-black', isPlayed: true },
          { hole: 3, par: 4, strokes: 4, diff: 0, scoreType: 'par', badgeClass: 'text-on-surface font-semibold', isPlayed: true },
          { hole: 4, par: 3, strokes: 4, diff: 1, scoreType: 'bogey', badgeClass: 'bg-error/10 text-error border border-error/30 font-semibold', isPlayed: true },
          { hole: 5, par: 4, strokes: 6, diff: 2, scoreType: 'double', badgeClass: 'bg-error text-on-error border border-error font-bold', isPlayed: true },
          { hole: 6, par: 4, strokes: 4, diff: 0, scoreType: 'par', badgeClass: 'text-on-surface font-semibold', isPlayed: true },
          { hole: 7, par: 4, strokes: 4, diff: 0, scoreType: 'par', badgeClass: 'text-on-surface font-semibold', isPlayed: true },
          { hole: 8, par: 3, strokes: 3, diff: 0, scoreType: 'par', badgeClass: 'text-on-surface font-semibold', isPlayed: true },
          { hole: 9, par: 5, strokes: 5, diff: 0, scoreType: 'par', badgeClass: 'text-on-surface font-semibold', isPlayed: true },
          { hole: 10, par: 4, strokes: 4, diff: 0, scoreType: 'par', badgeClass: 'text-on-surface font-semibold', isPlayed: true },
          { hole: 11, par: 4, strokes: 4, diff: 0, scoreType: 'par', badgeClass: 'text-on-surface font-semibold', isPlayed: true },
          { hole: 12, par: 3, strokes: 3, diff: 0, scoreType: 'par', badgeClass: 'text-on-surface font-semibold', isPlayed: true },
          { hole: 13, par: 5, strokes: 4, diff: -1, scoreType: 'birdie', badgeClass: 'bg-tertiary/15 text-tertiary border border-tertiary font-bold', isPlayed: true },
          { hole: 14, par: 4, strokes: 4, diff: 0, scoreType: 'par', badgeClass: 'text-on-surface font-semibold', isPlayed: true },
          { hole: 15, par: 4, strokes: 4, diff: 0, scoreType: 'par', badgeClass: 'text-on-surface font-semibold', isPlayed: true },
          { hole: 16, par: 3, strokes: 3, diff: 0, scoreType: 'par', badgeClass: 'text-on-surface font-semibold', isPlayed: true },
          { hole: 17, par: 4, strokes: 4, diff: 0, scoreType: 'par', badgeClass: 'text-on-surface font-semibold', isPlayed: true },
          { hole: 18, par: 5, strokes: 4, diff: -1, scoreType: 'birdie', badgeClass: 'bg-tertiary/15 text-tertiary border border-tertiary font-bold', isPlayed: true },
        ],
      },
      {
        period: 2,
        displayValue: '70',
        scoreToPar: -2,
        formattedScore: '-2',
        frontPar: 36,
        frontStrokes: 35,
        backPar: 36,
        backStrokes: 35,
        totalPar: 72,
        totalStrokes: 70,
        holes: Array.from({ length: 18 }, (_, i) => ({
          hole: i + 1,
          par: 4,
          strokes: 4,
          diff: 0,
          scoreType: 'par',
          badgeClass: 'text-on-surface font-semibold',
          isPlayed: true,
        })),
      },
    ],
  };

  const mockCompetitor: NormalizedCompetitor = {
    id: '4604625',
    order: 1,
    score: '-7',
    scoreDisplay: '-7',
    scoreToPar: -7,
    scoreMeta: { formattedScore: '-7', isUnderPar: true, isOverPar: false },
    thruDisplay: 'F',
    initials: 'SS',
    headshotUrls: ['https://a.espncdn.com/i/headshots/golf/players/full/4604625.png'],
    statusInfo: {
      isCut: false,
      isWD: false,
      isDQ: false,
      isMDF: false,
      isInactive: false,
      isWinner: false,
      isPlayoff: false,
      badgeLabel: '',
      statusBadge: '',
    },
    athlete: {
      id: '4604625',
      displayName: 'Scottie Scheffler',
    },
  };

  it('renders 18-hole matrix, OUT/IN/TOT par, strokes, and round tabs', () => {
    render(
      <ScorecardMatrix
        playerSummary={mockNormalizedSummary}
        competitor={mockCompetitor}
        playerName="Scottie Scheffler"
      />
    );

    expect(screen.getByText("Scottie Scheffler's Scorecard")).toBeInTheDocument();
    expect(screen.getByText('R1 (-5)')).toBeInTheDocument();
    expect(screen.getByText('R2 (-2)')).toBeInTheDocument();

    // OUT and IN headers
    expect(screen.getByText('OUT')).toBeInTheDocument();
    expect(screen.getByText('IN')).toBeInTheDocument();
    expect(screen.getByText('TOT')).toBeInTheDocument();

    // Front/Back/Total strokes
    expect(screen.getByText('33')).toBeInTheDocument();
    expect(screen.getByText('34')).toBeInTheDocument();
    expect(screen.getByText('67')).toBeInTheDocument();
  });

  it('switches active round when clicking round tab', () => {
    render(
      <ScorecardMatrix
        playerSummary={mockNormalizedSummary}
        competitor={mockCompetitor}
        playerName="Scottie Scheffler"
      />
    );

    fireEvent.click(screen.getByText('R2 (-2)'));
    expect(screen.getByText('70')).toBeInTheDocument();
  });

  it('renders missed cut banner when competitor is cut', () => {
    const cutComp: NormalizedCompetitor = {
      ...mockCompetitor,
      statusInfo: {
        ...mockCompetitor.statusInfo,
        isCut: true,
        badgeLabel: 'CUT',
      },
    };

    render(
      <ScorecardMatrix
        playerSummary={mockNormalizedSummary}
        competitor={cutComp}
        playerName="Scottie Scheffler"
      />
    );

    expect(screen.getByText('Missed 36-Hole Cut')).toBeInTheDocument();
  });
});
