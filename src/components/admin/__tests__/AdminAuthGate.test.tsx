// @vitest-environment jsdom
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AdminAuthGate } from '../AdminAuthGate';

describe('AdminAuthGate', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    vi.stubEnv('NODE_ENV', originalNodeEnv ?? 'test');
  });

  it('renders loading spinner with role="status" when loading is true', () => {
    render(
      <AdminAuthGate
        loading={true}
        user={null}
        isAdmin={false}
        onSignIn={vi.fn()}
        onSignOut={vi.fn()}
      >
        <div>Protected Content</div>
      </AdminAuthGate>
    );

    expect(screen.getByRole('status', { name: /Loading authentication/i })).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders Admin Access Portal sign-in UI when user is null and calls onSignIn', () => {
    const onSignIn = vi.fn();
    render(
      <AdminAuthGate
        loading={false}
        user={null}
        isAdmin={false}
        onSignIn={onSignIn}
        onSignOut={vi.fn()}
        signInDescription="Custom sign-in instructions."
      >
        <div>Protected Content</div>
      </AdminAuthGate>
    );

    expect(screen.getByRole('heading', { name: /Admin Access Portal/i })).toBeInTheDocument();
    expect(screen.getByText('Custom sign-in instructions.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Sign In with Google/i }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders Access Denied UI for signed-in non-admin users and calls onSignOut', () => {
    const onSignOut = vi.fn();
    render(
      <AdminAuthGate
        loading={false}
        user={{ email: 'visitor@example.com' }}
        isAdmin={false}
        onSignIn={vi.fn()}
        onSignOut={onSignOut}
      >
        <div>Protected Content</div>
      </AdminAuthGate>
    );

    expect(screen.getByRole('heading', { name: /Access Denied/i })).toBeInTheDocument();
    expect(screen.getByText('visitor@example.com')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Sign Out & Switch Account/i }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated as admin', () => {
    render(
      <AdminAuthGate
        loading={false}
        user={{ email: 'aicodevibes@gmail.com' }}
        isAdmin={true}
        onSignIn={vi.fn()}
        onSignOut={vi.fn()}
      >
        <div>Protected Content</div>
      </AdminAuthGate>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
