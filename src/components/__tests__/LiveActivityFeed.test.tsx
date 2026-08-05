import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LiveActivityFeed } from '../LiveActivityFeed';
import { Participant, ContestConfig } from '@/types/contest';
import { ESPNCompetitor } from '@/types/espn';

describe('LiveActivityFeed Component', () => {
  const sampleConfig: ContestConfig = {
    espnEventId: '401811961',
    eventName: 'Wyndham Championship',
    season: 2026,
    mainPayouts: [500, 300, 200, 100],
    dayMoneyPool: 100,
    coursePar: 70,
  };

  const sampleParticipants: Participant[] = [
    { id: 'p1', name: 'Pat', draftedPlayerIds: ['g1'] },
  ];

  const sampleCompetitors: ESPNCompetitor[] = [
    {
      id: 'g1',
      athlete: { id: 'g1', displayName: 'Justin Rose' },
      linescores: [{ period: 1, value: 65 }],
      score: '-5',
    },
  ];

  it('renders title "Live Activity Feed"', () => {
    render(
      <LiveActivityFeed
        participants={sampleParticipants}
        competitors={sampleCompetitors}
        contestConfig={sampleConfig}
      />
    );
    expect(screen.getByText('Live Activity Feed')).toBeDefined();
  });

  it('renders loading state when loading prop is true', () => {
    const { container } = render(<LiveActivityFeed loading={true} />);
    expect(container.querySelector('.animate-pulse')).toBeDefined();
  });

  it('renders empty state when no events are found', () => {
    render(<LiveActivityFeed participants={[]} competitors={[]} />);
    expect(screen.getByText('No Activity Events')).toBeDefined();
  });

  it('allows filtering events by category button click', () => {
    render(
      <LiveActivityFeed
        participants={sampleParticipants}
        competitors={sampleCompetitors}
        contestConfig={sampleConfig}
      />
    );

    const dayMoneyBtn = screen.getByRole('button', { name: /Day Money/i });
    fireEvent.click(dayMoneyBtn);

    // Button should be active
    expect(dayMoneyBtn.className).toContain('bg-primary');
  });
});
