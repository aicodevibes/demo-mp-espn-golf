// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from '../Header';
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

describe('Header Component', () => {
  it('renders skeleton loader pulse when loading prop is true', () => {
    render(<Header loading={true} />);
    expect(screen.getByTestId('header-event-skeleton')).toBeInTheDocument();
  });

  it('renders live event title, dates, and live status badge when event data is provided', () => {
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
    render(<Header eventName="PGA Championship" eventObj={mockEvent} />);

    expect(screen.getByText(/PGA Championship/)).toBeInTheDocument();
    expect(screen.getByText(/Live/)).toBeInTheDocument();
    expect(screen.queryByTestId('header-event-skeleton')).not.toBeInTheDocument();
  });

  it('renders Event Selector dropdown and triggers onSelectEvent without side effects on global active event', () => {
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
});


