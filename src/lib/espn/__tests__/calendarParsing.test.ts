import { describe, it, expect } from 'vitest';

export function parseESPNScoreboardResponse(data: any) {
  const liveEvents = data.events || [];
  const liveEventsMap = new Map(liveEvents.map((e: any) => [e.id, e]));

  const calendarItems = data.leagues?.[0]?.calendar || [];
  const calendarEvents = calendarItems.map((item: any) => {
    if (liveEventsMap.has(item.id)) {
      return liveEventsMap.get(item.id);
    }
    return {
      id: item.id,
      name: item.label || item.name || 'PGA Event',
      shortName: item.label || item.name,
      date: item.startDate || item.date,
      endDate: item.endDate,
      status: {
        type: {
          name: 'STATUS_SCHEDULED',
          description: 'Scheduled',
          detail: '',
          state: 'pre',
        },
      },
    };
  });

  return calendarEvents.length > 0 ? calendarEvents : liveEvents;
}

describe('parseESPNScoreboardResponse', () => {
  it('extracts full calendar list when live events only contains 1 current event', () => {
    const mockESPNPayload = {
      events: [
        {
          id: '401811961',
          name: 'Wyndham Championship',
          date: '2026-08-06T04:00Z',
          status: { type: { name: 'STATUS_IN_PROGRESS', state: 'in' } },
        },
      ],
      leagues: [
        {
          calendar: [
            { id: '401811957', label: 'The Open', startDate: '2026-07-16T07:00Z', endDate: '2026-07-19T07:00Z' },
            { id: '401811961', label: 'Wyndham Championship', startDate: '2026-08-06T07:00Z', endDate: '2026-08-09T07:00Z' },
            { id: '401811962', label: 'FedEx St. Jude Championship', startDate: '2026-08-13T07:00Z', endDate: '2026-08-16T07:00Z' },
          ],
        },
      ],
    };

    const parsed = parseESPNScoreboardResponse(mockESPNPayload);

    expect(parsed).toHaveLength(3);
    expect(parsed[0].name).toBe('The Open');
    expect(parsed[0].id).toBe('401811957');

    // Live event details preserved
    expect(parsed[1].id).toBe('401811961');
    expect(parsed[1].status?.type?.name).toBe('STATUS_IN_PROGRESS');

    expect(parsed[2].name).toBe('FedEx St. Jude Championship');
    expect(parsed[2].id).toBe('401811962');
  });

  it('falls back to events array if calendar is absent', () => {
    const mockPayload = {
      events: [{ id: '123', name: 'Standalone Event' }],
    };

    const parsed = parseESPNScoreboardResponse(mockPayload);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('Standalone Event');
  });
});
