// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackedPlayerHeroGrid } from '../TrackedPlayerHeroGrid';
import { CompetitorRow } from '../CompetitorRow';
import { NormalizedCompetitor } from '@/lib/espn';

describe('Leaderboard Views with Normalized Competitors', () => {
  const mockNormalizedCompetitor: NormalizedCompetitor = {
    id: '4604625',
    order: 1,
    score: '-8',
    scoreDisplay: '-8',
    scoreToPar: -8,
    scoreMeta: { formattedScore: '-8', isUnderPar: true, isOverPar: false },
    thruDisplay: '14',
    initials: 'SS',
    headshotUrls: [
      'https://a.espncdn.com/i/headshots/golf/players/full/4604625.png',
    ],
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
      country: { abbreviation: 'USA' },
    },
  };

  const mockCutCompetitor: NormalizedCompetitor = {
    id: '1234',
    order: 80,
    score: '+7',
    scoreDisplay: '+7',
    scoreToPar: 7,
    scoreMeta: { formattedScore: '+7', isUnderPar: false, isOverPar: true },
    thruDisplay: 'CUT',
    initials: 'CG',
    headshotUrls: [
      'https://a.espncdn.com/i/headshots/golf/players/full/1234.png',
    ],
    statusInfo: {
      isCut: true,
      isWD: false,
      isDQ: false,
      isMDF: false,
      isInactive: true,
      isWinner: false,
      isPlayoff: false,
      badgeLabel: 'CUT',
      statusBadge: 'CUT',
    },
    athlete: {
      id: '1234',
      displayName: 'Cut Golfer',
    },
  };

  describe('TrackedPlayerHeroGrid', () => {
    it('renders normalized competitor cards with pre-evaluated scores, thru, and badges', () => {
      const onSelectPlayer = vi.fn();
      render(
        <TrackedPlayerHeroGrid
          trackedCompetitors={[mockNormalizedCompetitor, mockCutCompetitor]}
          selectedPlayerId="4604625"
          onSelectPlayer={onSelectPlayer}
        />
      );

      expect(screen.getByText('Scottie Scheffler')).toBeDefined();
      expect(screen.getByText('-8')).toBeDefined();
      expect(screen.getByText('14')).toBeDefined();

      expect(screen.getByText('Cut Golfer')).toBeDefined();
      expect(screen.getByText('Missed Cut')).toBeDefined();

      fireEvent.click(screen.getByText('Cut Golfer'));
      expect(onSelectPlayer).toHaveBeenCalledWith('1234');
    });

    it('renders empty fallback message when no competitors are provided', () => {
      render(<TrackedPlayerHeroGrid trackedCompetitors={[]} />);
      expect(screen.getByText('No Golfers Displayed')).toBeDefined();
    });
  });

  describe('CompetitorRow', () => {
    it('renders pre-evaluated properties when supplied with NormalizedCompetitor', () => {
      const onSelect = vi.fn();
      render(
        <CompetitorRow
          competitor={mockNormalizedCompetitor}
          rankDisplay="1st"
          draftedBy={['Alice', 'Bob']}
          isSelected={true}
          onSelectPlayer={onSelect}
        />
      );

      expect(screen.getByText('Scottie Scheffler')).toBeDefined();
      expect(screen.getByText('1st')).toBeDefined();
      expect(screen.getByText('Drafted by Alice, Bob')).toBeDefined();
      expect(screen.getByText('-8')).toBeDefined();
      expect(screen.getByText('14')).toBeDefined();

      fireEvent.click(screen.getByText('Scottie Scheffler'));
      expect(onSelect).toHaveBeenCalledWith('4604625');
    });
  });
});
