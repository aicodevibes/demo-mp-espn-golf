import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from '../Header';

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

    expect(screen.getByText('PGA Championship')).toBeInTheDocument();
    expect(screen.getByText(/Live/)).toBeInTheDocument();
    expect(screen.queryByTestId('header-event-skeleton')).not.toBeInTheDocument();
  });
});
