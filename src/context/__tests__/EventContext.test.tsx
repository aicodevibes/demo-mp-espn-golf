import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EventContextProvider, useEventContext } from '../EventContext';

describe('EventContext Provider Domain Seam', () => {
  it('provides default fallback context state when loading', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <EventContextProvider initialEventId="401705663">{children}</EventContextProvider>
    );

    const { result } = renderHook(() => useEventContext(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current.activeEventId).toBe('401705663');
    expect(Array.isArray(result.current.participants)).toBe(true);
  });
});
