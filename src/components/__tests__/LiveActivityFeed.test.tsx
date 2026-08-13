// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LiveActivityFeed } from '../LiveActivityFeed';
import { Participant, ContestConfig } from '@/types/contest';
import { ESPNCompetitor } from '@/types/espn';
import { ActivityEvent } from '@/lib/activityFeed';

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
      order: 1,
      athlete: { id: 'g1', displayName: 'Justin Rose' },
      linescores: [{ period: 1, value: 65 }],
      score: '-5',
    },
  ];

  const mockEvents: ActivityEvent[] = [
    { id: 'e1', type: 'day_money', icon: 'DollarSign', title: 'Day Money 1', subtitle: 'Sub 1', timestamp: 'R1' },
    { id: 'e2', type: 'drafted_leader', icon: 'Trophy', title: 'Leader 1', subtitle: 'Sub 2', timestamp: 'R1' },
    { id: 'e3', type: 'eagle', icon: 'Flame', title: 'Eagle 1', subtitle: 'Sub 3', timestamp: 'R1' },
    { id: 'e4', type: 'eagle', icon: 'Flame', title: 'Eagle 2', subtitle: 'Sub 4', timestamp: 'R1' },
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
        events={mockEvents}
      />
    );

    const dayMoneyBtn = screen.getByRole('button', { name: /Day Money/i });
    fireEvent.click(dayMoneyBtn);

    expect(dayMoneyBtn.className).toContain('bg-primary');
    expect(screen.getByText('Day Money 1')).toBeDefined();
  });

  it('limits default display to top 3 items and toggles expansion', () => {
    render(
      <LiveActivityFeed
        events={mockEvents}
      />
    );

    // Initial view shows 3 items
    expect(screen.getByText('Day Money 1')).toBeDefined();
    expect(screen.getByText('Leader 1')).toBeDefined();
    expect(screen.getByText('Eagle 1')).toBeDefined();
    expect(screen.queryByText('Eagle 2')).toBeNull();

    // Click Show All button
    const toggleBtn = screen.getByRole('button', { name: /Show All \(4\)/i });
    fireEvent.click(toggleBtn);

    // 4th item should now be visible
    expect(screen.getByText('Eagle 2')).toBeDefined();

    // Click Show Less
    const showLessBtn = screen.getByRole('button', { name: /Show Less/i });
    fireEvent.click(showLessBtn);
    expect(screen.queryByText('Eagle 2')).toBeNull();
  });
});
