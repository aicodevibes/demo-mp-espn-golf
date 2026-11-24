// @vitest-environment jsdom
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminPlayerGalleryPage from '../page';

const mockUseAuth = vi.fn();

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/lib/firebase/firestore', () => ({
  useAllPlayers: () => ({
    playerMap: {},
    loading: false,
  }),
}));

describe('AdminPlayerGalleryPage Auth Gate & Headshot Loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading spinner while auth state is loading without exposing gallery', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      isAdmin: false,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    });

    render(<AdminPlayerGalleryPage />);

    expect(
      screen.queryByText(/PGA Golfer Directory & Headshots Reference Gallery/i)
    ).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders Admin Access Portal sign-in UI for unauthenticated visitors', () => {
    const signInWithGoogle = vi.fn();
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isAdmin: false,
      signInWithGoogle,
      signOut: vi.fn(),
    });

    render(<AdminPlayerGalleryPage />);

    expect(
      screen.queryByText(/PGA Golfer Directory & Headshots Reference Gallery/i)
    ).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Admin Access Portal/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Sign In with Google/i }));
    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('renders Access Denied UI for signed-in non-admin users', () => {
    const signOut = vi.fn();
    mockUseAuth.mockReturnValue({
      user: { email: 'visitor@example.com' },
      loading: false,
      isAdmin: false,
      signInWithGoogle: vi.fn(),
      signOut,
    });

    render(<AdminPlayerGalleryPage />);

    expect(
      screen.queryByText(/PGA Golfer Directory & Headshots Reference Gallery/i)
    ).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Access Denied/i })).toBeInTheDocument();
    expect(screen.getByText('visitor@example.com')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Sign Out & Switch Account/i }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('renders gallery for verified admin without priority={true} on bulk headshots', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'aicodevibes@gmail.com' },
      loading: false,
      isAdmin: true,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    });

    render(<AdminPlayerGalleryPage />);

    expect(
      screen.getByText(/PGA Golfer Directory & Headshots Reference Gallery/i)
    ).toBeInTheDocument();

    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThan(0);
    for (const img of images.slice(0, 10)) {
      expect(img).toHaveAttribute('loading', 'lazy');
      expect(img).not.toHaveAttribute('fetchpriority', 'high');
    }
  });
});
