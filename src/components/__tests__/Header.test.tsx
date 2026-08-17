// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header, formatRelativeTime } from '../Header';
import { ESPNEvent } from '@/types/espn';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    isAdmin: false,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }),
}));

describe('formatRelativeTime helper', () => {
  it('formats relative times correctly', () => {
    const now = new Date('2026-08-17T12:00:00Z');
    expect(formatRelativeTime(null, now)).toBe('');
    expect(formatRelativeTime(new Date('2026-08-17T11:59:45Z'), now)).toBe('just now');
    expect(formatRelativeTime(new Date('2026-08-17T11:58:00Z'), now)).toBe('2m ago');
    expect(formatRelativeTime(new Date('2026-08-17T10:00:00Z'), now)).toBe('2h ago');
    expect(formatRelativeTime(new Date('2026-08-15T12:00:00Z'), now)).toBe('2d ago');
  });
});

describe('Header Component', () => {
  const mockEvent = {
    id: '401580384',
    name: 'PGA Championship',
    date: '2026-05-14T12:00Z',
    endDate: '2026-05-17T23:00Z',
    status: {
      type: {
        name: 'STATUS_IN_PROGRESS',
        description: 'In Progress',
        detail: 'Round 3 - In Progress',
        state: 'in',
      },
    },
  };

  it('renders skeleton loader pulse when loading prop is true', () => {
    render(<Header loading={true} />);
    expect(screen.getByTestId('header-event-skeleton')).toBeInTheDocument();
  });

  it('renders live event title, dates, and live status badge when event data is provided', () => {
    render(<Header eventName="PGA Championship" eventObj={mockEvent} />);

    expect(screen.getByText(/PGA Championship/)).toBeInTheDocument();
    expect(screen.getByText(/Live/)).toBeInTheDocument();
    expect(screen.queryByTestId('header-event-skeleton')).not.toBeInTheDocument();
  });

  it('renders Event Selector dropdown and triggers onSelectEvent without side effects', () => {
    const mockEvents: ESPNEvent[] = [
      { id: '401580384', name: 'PGA Championship' },
      { id: '401580354', name: 'Masters Tournament' },
    ];
    const onSelectEvent = vi.fn();

    render(
      <Header
        eventName="PGA Championship"
        events={mockEvents}
        selectedEventId="401580384"
        onSelectEvent={onSelectEvent}
      />
    );

    const selector = screen.getByTestId('header-event-selector') as HTMLSelectElement;
    expect(selector).toBeInTheDocument();
    expect(screen.getByText('Masters Tournament')).toBeInTheDocument();

    fireEvent.change(selector, { target: { value: '401580354' } });
    expect(onSelectEvent).toHaveBeenCalledWith('401580354');
  });

  it('renders live refresh control and triggers onRefresh when clicked', () => {
    const onRefresh = vi.fn();
    const lastRefreshedAt = new Date();

    render(
      <Header
        eventName="PGA Championship"
        eventObj={mockEvent}
        lastRefreshedAt={lastRefreshedAt}
        onRefresh={onRefresh}
      />
    );

    const refreshBtn = screen.getByTestId('header-refresh-button');
    expect(refreshBtn).toBeInTheDocument();
    expect(refreshBtn).toHaveAttribute('aria-label', 'Refresh leaderboard data');
    expect(screen.getByTestId('header-refresh-time')).toHaveTextContent('Refreshed just now');

    fireEvent.click(refreshBtn);
    expect(onRefresh).toHaveBeenCalledWith({ force: true });
  });

  it('disables refresh button and displays spinning animation when isRefreshing is true', () => {
    const onRefresh = vi.fn();

    render(
      <Header
        eventName="PGA Championship"
        eventObj={mockEvent}
        isRefreshing={true}
        onRefresh={onRefresh}
      />
    );

    const refreshBtn = screen.getByTestId('header-refresh-button');
    expect(refreshBtn).toBeDisabled();
    const icon = refreshBtn.querySelector('svg');
    expect(icon).toHaveClass('animate-spin');
  });
});
