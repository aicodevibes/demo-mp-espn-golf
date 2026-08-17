// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Header } from '@/components/Header';
import { TrackedPlayerHeroGrid } from '@/components/TrackedPlayerHeroGrid';
import { EventContextProvider } from '@/context/EventContext';
import { SCOREBOARD_CACHE_KEY, NormalizedCompetitor } from '@/lib/espn';
import { hydrateRoot } from 'react-dom/client';
import { act } from '@testing-library/react';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    isAdmin: false,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn(),
  collection: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()),
}));

describe('SSR and Hydration Consistency', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ events: [], competitors: [] }),
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('hydrates Header without console errors when server and client data initialize', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // 1. SSR HTML generated on server
    const ssrHtml = renderToString(
      <Header
        loading={true}
        eventName={undefined}
        eventObj={undefined}
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

  it('hydrates TrackedPlayerHeroGrid consistently when rankDisplayMap is populated', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mockCompetitor: NormalizedCompetitor = {
      id: '4604625',
      order: 1,
      score: '-10',
      scoreDisplay: '-10',
      scoreToPar: -10,
      scoreMeta: { formattedScore: '-10', isUnderPar: true, isOverPar: false },
      thruDisplay: 'F',
      initials: 'SS',
      headshotUrls: [],
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
      },
      status: {
        position: { displayName: 'T1' },
      },
    };

    const rankMap = new Map([['4604625', 'T1']]);

    // 1. SSR render
    const ssrHtml = renderToString(
      <TrackedPlayerHeroGrid
        trackedCompetitors={[mockCompetitor]}
        rankDisplayMap={rankMap}
      />
    );

    const container = document.createElement('div');
    container.innerHTML = ssrHtml;
    document.body.appendChild(container);

    // 2. Client hydrate
    act(() => {
      hydrateRoot(
        container,
        <TrackedPlayerHeroGrid
          trackedCompetitors={[mockCompetitor]}
          rankDisplayMap={rankMap}
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

  it('hydrates EventContextProvider without SSR mismatch when localStorage cache is present', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    localStorage.setItem(
      SCOREBOARD_CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        events: [{ id: '401811927', name: 'The Sentry' }],
        lastActiveEventId: '401811927',
      })
    );

    // 1. SSR HTML
    const ssrHtml = renderToString(
      <EventContextProvider>
        <div data-testid="child-element">Loaded</div>
      </EventContextProvider>
    );

    const container = document.createElement('div');
    container.innerHTML = ssrHtml;
    document.body.appendChild(container);

    // 2. Client Hydrate
    act(() => {
      hydrateRoot(
        container,
        <EventContextProvider>
          <div data-testid="child-element">Loaded</div>
        </EventContextProvider>
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
