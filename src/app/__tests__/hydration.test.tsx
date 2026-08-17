// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Header } from '@/components/Header';
import { SCOREBOARD_CACHE_KEY } from '@/lib/espn';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    isAdmin: false,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }),
}));

import { hydrateRoot } from 'react-dom/client';
import { act } from '@testing-library/react';

describe('Header SSR and Hydration Consistency', () => {
  it('hydrates without console errors when server and client data initialize', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // 1. SSR HTML generated on server (empty event data during SSR)
    const ssrHtml = renderToString(
      <Header
        loading={true}
        eventName={undefined}
        eventObj={undefined}
        events={[]}
        selectedEventId=""
      />
    );

    const container = document.createElement('div');
    container.innerHTML = ssrHtml;
    document.body.appendChild(container);

    // 2. Client hydrates with cached data immediately available on client
    act(() => {
      hydrateRoot(
        container,
        <Header
          loading={false}
          eventName="The Sentry"
          eventObj={{ id: '401811927', name: 'The Sentry' } as any}
          events={[{ id: '401811927', name: 'The Sentry' } as any]}
          selectedEventId="401811927"
        />
      );
    });

    const hydrationErrors = errorSpy.mock.calls.filter((call) =>
      call.some((arg) => typeof arg === 'string' && (arg.includes('Hydration') || arg.includes('did not match')))
    );

    expect(hydrationErrors).toHaveLength(0);

    document.body.removeChild(container);
    errorSpy.mockRestore();
  });
});

