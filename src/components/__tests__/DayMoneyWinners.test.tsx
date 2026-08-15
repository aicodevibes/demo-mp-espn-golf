// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DayMoneyWinners } from '../DayMoneyWinners';
import { DayMoneyRoundResult, ContestConfig } from '@/types/contest';

describe('DayMoneyWinners Component Rendering', () => {
  const contestConfig: ContestConfig = {
    espnEventId: '401580344',
    eventName: 'US Open',
    season: 2026,
    coursePar: 72,
    dayMoneyPool: 100,
    entryFee: 50,
    mainPayouts: [600, 320, 180, 100],
  };

  it('renders completed round with "Low: 68(-4)", payout "$100.00", and "Winner"', () => {
    const dayMoneyResults: DayMoneyRoundResult[] = [
      {
        round: 1,
        lowScore: '68(-4)',
        totalPool: 100,
        isCompleted: true,
        winners: [
          {
            participantId: 'p1',
            participantName: 'Pat',
            golferId: 'g1',
            golferName: 'Sam Burns',
            dailyScore: '68(-4)',
            payout: 100,
            thru: 'F',
            isCompleted: true,
          },
        ],
      },
      { round: 2, lowScore: null, totalPool: 100, isCompleted: false, winners: [] },
      { round: 3, lowScore: null, totalPool: 100, isCompleted: false, winners: [] },
      { round: 4, lowScore: null, totalPool: 100, isCompleted: false, winners: [] },
    ];

    render(
      <DayMoneyWinners
        dayMoneyResults={dayMoneyResults}
        contestConfig={contestConfig}
      />
    );

    expect(screen.getByText(/Low: 68\(-4\)/i)).toBeDefined();
    expect(screen.getByText('$100.00')).toBeDefined();
    expect(screen.getByText('Winner')).toBeDefined();
  });

  it('renders in-progress round with "Current Low: -3", suppressed payout "—", and "Current Leader"', () => {
    const dayMoneyResults: DayMoneyRoundResult[] = [
      {
        round: 1,
        lowScore: '-3',
        totalPool: 100,
        isCompleted: false,
        winners: [
          {
            participantId: 'p2',
            participantName: 'Greg',
            golferId: 'g2',
            golferName: 'Cameron Young',
            dailyScore: '-3',
            payout: 0,
            thru: '14',
            isCompleted: false,
          },
        ],
      },
      { round: 2, lowScore: null, totalPool: 100, isCompleted: false, winners: [] },
      { round: 3, lowScore: null, totalPool: 100, isCompleted: false, winners: [] },
      { round: 4, lowScore: null, totalPool: 100, isCompleted: false, winners: [] },
    ];

    render(
      <DayMoneyWinners
        dayMoneyResults={dayMoneyResults}
        contestConfig={contestConfig}
      />
    );

    expect(screen.getByText(/Current Low: -3/i)).toBeDefined();
    expect(screen.getByText('Current Leader')).toBeDefined();
    expect(screen.getByText('—')).toBeDefined();
    expect(screen.queryByText('$0.00')).toBeNull();
  });

  it('renders in-progress tie with "Co-Leader"', () => {
    const dayMoneyResults: DayMoneyRoundResult[] = [
      {
        round: 1,
        lowScore: '-3',
        totalPool: 100,
        isCompleted: false,
        winners: [
          {
            participantId: 'p1',
            participantName: 'Pat',
            golferId: 'g1',
            golferName: 'Sam Burns',
            dailyScore: '-3',
            payout: 0,
            thru: '15',
            isCompleted: false,
          },
          {
            participantId: 'p2',
            participantName: 'Greg',
            golferId: 'g2',
            golferName: 'Cameron Young',
            dailyScore: '-3',
            payout: 0,
            thru: '12',
            isCompleted: false,
          },
        ],
      },
      { round: 2, lowScore: null, totalPool: 100, isCompleted: false, winners: [] },
      { round: 3, lowScore: null, totalPool: 100, isCompleted: false, winners: [] },
      { round: 4, lowScore: null, totalPool: 100, isCompleted: false, winners: [] },
    ];

    render(
      <DayMoneyWinners
        dayMoneyResults={dayMoneyResults}
        contestConfig={contestConfig}
      />
    );

    const coLeaders = screen.getAllByText('Co-Leader');
    expect(coLeaders).toHaveLength(2);
  });
});
