import { describe, it, expect } from 'vitest';
import {
  EspnTournamentAdapter,
  normalizeTournamentSnapshot,
  getGolferCardViewModel,
  type NormalizedTournament,
  type NormalizedCompetitor,
} from '../adapter';
import { ESPNEvent, ESPNCompetitor } from '@/types/espn';

describe('EspnTournamentAdapter', () => {
  describe('normalizeTournamentSnapshot', () => {
    it('handles null/empty raw payloads gracefully with synthetic fallbacks', () => {
      const snapshot = normalizeTournamentSnapshot(null, null);
      expect(snapshot).toBeDefined();
      expect(snapshot.id).toBeDefined();
      expect(snapshot.competitors.length).toBeGreaterThan(0);
      expect(snapshot.competitorMap).toBeInstanceOf(Map);
      expect(snapshot.competitorMap.size).toBe(snapshot.competitors.length);
    });

    it('correctly normalizes a pre-event scheduled tournament', () => {
      const preEventScoreboard = {
        events: [
          {
            id: '401580340',
            name: 'Masters Tournament',
            shortName: 'Masters',
            date: '2025-04-10T12:00:00Z',
            endDate: '2025-04-13T23:00:00Z',
            status: {
              type: {
                name: 'STATUS_SCHEDULED',
                description: 'Scheduled',
                detail: 'Scheduled',
                state: 'pre',
                completed: false,
              },
              period: 0,
            },
            competitions: [
              {
                id: '401580340',
                competitors: [
                  {
                    id: '4604625',
                    order: 1,
                    score: '-',
                    status: {
                      thru: 0,
                      position: { displayName: '-' },
                      type: { state: 'pre', completed: false, description: 'Scheduled' },
                    },
                    athlete: {
                      id: '4604625',
                      displayName: 'Scottie Scheffler',
                      country: { abbreviation: 'USA' },
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const snapshot = normalizeTournamentSnapshot(preEventScoreboard);
      expect(snapshot.id).toBe('401580340');
      expect(snapshot.name).toBe('Masters Tournament');
      expect(snapshot.statusState).toBe('pre');
      expect(snapshot.isCompleted).toBe(false);
      expect(snapshot.datesFormatted).toContain('Apr');

      const comp = snapshot.competitors[0];
      expect(comp.id).toBe('4604625');
      expect(comp.athlete.displayName).toBe('Scottie Scheffler');
      expect(comp.scoreDisplay).toBe('-');
      expect(comp.thruDisplay).toBe('-');
      expect(comp.statusInfo.isCut).toBe(false);
      expect(comp.statusInfo.isWinner).toBe(false);
      expect(comp.headshotUrls.length).toBeGreaterThan(0);
      expect(comp.headshotUrls[0]).toContain('4604625');
    });

    it('automatically hydrates synthetic competitors from player directory when scheduled event has no competitors', () => {
      const scheduledEventWithoutCompetitors = {
        events: [
          {
            id: '401580340',
            name: 'Future PGA Championship',
            status: {
              type: {
                name: 'STATUS_SCHEDULED',
                description: 'Scheduled',
                state: 'pre',
                completed: false,
              },
              period: 0,
            },
            competitions: [
              {
                id: '401580340',
                competitors: [],
              },
            ],
          },
        ],
      };

      const customDir = {
        '4604625': { id: '4604625', name: 'Scottie Scheffler', headshotUrl: 'https://example.com/scottie.png' },
        '3448': { id: '3448', name: 'Rory McIlroy', headshotUrl: 'https://example.com/rory.png' },
      };

      const snapshot = normalizeTournamentSnapshot(scheduledEventWithoutCompetitors, null, {
        playerDirectoryMap: customDir,
      });

      expect(snapshot.competitors.length).toBe(2);
      const scheffler = snapshot.competitorMap.get('4604625');
      expect(scheffler).toBeDefined();
      expect(scheffler?.athlete.displayName).toBe('Scottie Scheffler');
      expect(scheffler?.scoreDisplay).toBe('-');
      expect(scheffler?.thruDisplay).toBe('-');
      expect(scheffler?.headshotUrls).toContain('https://example.com/scottie.png');
    });

    it('correctly normalizes a live round 2 in-progress tournament', () => {
      const liveRound2Payload = {
        events: [
          {
            id: '401580341',
            name: 'PGA Championship',
            status: {
              type: {
                name: 'STATUS_IN_PROGRESS',
                description: 'In Progress',
                detail: 'Round 2 - In Progress',
                state: 'in',
                completed: false,
              },
              period: 2,
            },
            competitions: [
              {
                id: '401580341',
                competitors: [
                  {
                    id: '4604625',
                    order: 1,
                    score: '-6',
                    status: {
                      thru: 14,
                      position: { displayName: '1' },
                      type: { state: 'in', completed: false },
                    },
                    linescores: [
                      { period: 1, value: 68, displayValue: '-4' },
                      { period: 2, value: 34, displayValue: '-2' },
                    ],
                    athlete: {
                      id: '4604625',
                      displayName: 'Scottie Scheffler',
                      country: { abbreviation: 'USA' },
                    },
                  },
                  {
                    id: '3448',
                    order: 2,
                    score: '+1',
                    status: {
                      thru: 18,
                      position: { displayName: 'T25' },
                      type: { state: 'in', completed: false },
                    },
                    linescores: [
                      { period: 1, value: 73, displayValue: '+1' },
                      { period: 2, value: 72, displayValue: 'E' },
                    ],
                    athlete: {
                      id: '3448',
                      displayName: 'Rory McIlroy',
                      country: { abbreviation: 'NIR' },
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const snapshot = normalizeTournamentSnapshot(liveRound2Payload);
      expect(snapshot.statusState).toBe('in');
      expect(snapshot.period).toBe(2);
      expect(snapshot.competitors.length).toBe(2);

      const scheffler = snapshot.competitorMap.get('4604625');
      expect(scheffler).toBeDefined();
      expect(scheffler?.scoreDisplay).toBe('-6');
      expect(scheffler?.thruDisplay).toBe('14');
      expect(scheffler?.scoreToPar).toBe(-6);

      const rory = snapshot.competitorMap.get('3448');
      expect(rory).toBeDefined();
      expect(rory?.scoreDisplay).toBe('+1');
      expect(rory?.thruDisplay).toBe('F');
      expect(rory?.scoreToPar).toBe(1);
    });

    it('correctly detects 36-hole cut in Round 3 (linescores.length === 2)', () => {
      const round3PostCutPayload = {
        events: [
          {
            id: '401580342',
            name: 'U.S. Open',
            status: {
              type: {
                name: 'STATUS_IN_PROGRESS',
                description: 'In Progress',
                detail: 'Round 3',
                state: 'in',
                completed: false,
              },
              period: 3,
            },
            competitions: [
              {
                id: '401580342',
                competitors: [
                  {
                    id: '4604625',
                    order: 1,
                    score: '-8',
                    status: {
                      thru: 8,
                      position: { displayName: '1' },
                      type: { state: 'in' },
                    },
                    linescores: [
                      { period: 1, value: 68 },
                      { period: 2, value: 67 },
                      { period: 3, value: 27 },
                    ],
                    athlete: {
                      id: '4604625',
                      displayName: 'Scottie Scheffler',
                    },
                  },
                  {
                    id: '1234',
                    order: 80,
                    score: '+8',
                    status: {
                      // ESPN leaves status null/empty for cut players
                      position: { displayName: 'CUT' },
                    },
                    linescores: [
                      { period: 1, value: 76 },
                      { period: 2, value: 76 },
                    ],
                    athlete: {
                      id: '1234',
                      displayName: 'Cut Golfer',
                    },
                  },
                  {
                    id: '5678',
                    order: 81,
                    score: '+9',
                    status: {}, // ESPN blank status test
                    linescores: [
                      { period: 1, value: 77 },
                      { period: 2, value: 76 },
                    ],
                    athlete: {
                      id: '5678',
                      displayName: 'Cut Golfer No Status Field',
                    },
                  },
                  {
                    id: '9999',
                    order: 82,
                    score: '+2',
                    status: {
                      position: { displayName: 'WD' },
                      type: { name: 'STATUS_WITHDRAWN', detail: 'Withdrawn' },
                    },
                    linescores: [{ period: 1, value: 74 }],
                    athlete: {
                      id: '9999',
                      displayName: 'Withdrawn Golfer',
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const snapshot = normalizeTournamentSnapshot(round3PostCutPayload);
      const cut1 = snapshot.competitorMap.get('1234');
      const cut2 = snapshot.competitorMap.get('5678');
      const wd = snapshot.competitorMap.get('9999');
      const active = snapshot.competitorMap.get('4604625');

      expect(active?.statusInfo.isCut).toBe(false);
      expect(active?.thruDisplay).toBe('8');

      expect(cut1?.statusInfo.isCut).toBe(true);
      expect(cut1?.statusInfo.badgeLabel).toBe('CUT');
      expect(cut1?.thruDisplay).toBe('CUT');

      expect(cut2?.statusInfo.isCut).toBe(true);
      expect(cut2?.statusInfo.badgeLabel).toBe('CUT');
      expect(cut2?.thruDisplay).toBe('CUT');

      expect(wd?.statusInfo.isWD).toBe(true);
      expect(wd?.statusInfo.isCut).toBe(false);
      expect(wd?.statusInfo.badgeLabel).toBe('WD');
      expect(wd?.thruDisplay).toBe('WD');
    });

    it('correctly normalizes a completed playoff tournament with winner badges', () => {
      const playoffFinalPayload = {
        events: [
          {
            id: '401580343',
            name: 'The Open Championship',
            status: {
              type: {
                name: 'STATUS_FINAL',
                description: 'Final',
                detail: 'Final - Playoff',
                state: 'post',
                completed: true,
              },
              period: 4,
            },
            competitions: [
              {
                id: '401580343',
                competitors: [
                  {
                    id: '4604625',
                    order: 1,
                    score: '-12',
                    status: {
                      thru: 18,
                      position: { displayName: '1' },
                      type: { state: 'post', completed: true },
                    },
                    linescores: [
                      { period: 1, value: 68 },
                      { period: 2, value: 68 },
                      { period: 3, value: 68 },
                      { period: 4, value: 68 },
                    ],
                    athlete: {
                      id: '4604625',
                      displayName: 'Scottie Scheffler',
                    },
                  },
                  {
                    id: '3448',
                    order: 2,
                    score: '-12',
                    status: {
                      thru: 18,
                      position: { displayName: 'P2' },
                      type: { state: 'post', completed: true },
                    },
                    linescores: [
                      { period: 1, value: 68 },
                      { period: 2, value: 68 },
                      { period: 3, value: 68 },
                      { period: 4, value: 68 },
                    ],
                    athlete: {
                      id: '3448',
                      displayName: 'Rory McIlroy',
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const snapshot = normalizeTournamentSnapshot(playoffFinalPayload);
      expect(snapshot.isCompleted).toBe(true);
      expect(snapshot.isPlayoff).toBe(true);

      const winner = snapshot.competitorMap.get('4604625');
      expect(winner?.statusInfo.isWinner).toBe(true);
      expect(winner?.statusInfo.isPlayoff).toBe(true);
      expect(winner?.statusInfo.badgeLabel).toBe('🏆 Champion (Playoff)');

      const runnerUp = snapshot.competitorMap.get('3448');
      expect(runnerUp?.statusInfo.isWinner).toBe(false);
      expect(runnerUp?.statusInfo.isPlayoff).toBe(true);
      expect(runnerUp?.statusInfo.badgeLabel).toBe('2nd (Playoff)');
    });
  });

  describe('getGolferCardViewModel', () => {
    it('transforms normalized competitor to UI card view model', () => {
      const mockComp: NormalizedCompetitor = {
        id: '4604625',
        order: 1,
        score: '-10',
        scoreDisplay: '-10',
        scoreToPar: -10,
        scoreMeta: { formattedScore: '-10', isUnderPar: true, isOverPar: false },
        thruDisplay: '16',
        initials: 'SS',
        headshotUrls: [
          'https://a.espncdn.com/i/headshots/golf/players/full/4604625.png',
          'https://a.espncdn.com/combiner/i?img=/i/headshots/golf/players/full/4604625.png&w=120&h=120&scale=crop',
        ],
        countryFlagUrl: 'https://a.espncdn.com/i/teamlogos/countries/500/usa.png',
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
          firstName: 'Scottie',
          lastName: 'Scheffler',
        },
      };

      const vm = getGolferCardViewModel(mockComp, undefined, { '4604625': 1 }, ['Alice', 'Bob']);
      expect(vm.id).toBe('4604625');
      expect(vm.displayName).toBe('Scottie Scheffler');
      expect(vm.shortName).toBe('S. Scheffler');
      expect(vm.initials).toBe('SS');
      expect(vm.rankDisplay).toBe('1st');
      expect(vm.scoreDisplay).toBe('-10');
      expect(vm.isUnderPar).toBe(true);
      expect(vm.thruDisplay).toBe('16');
      expect(vm.draftedBy).toEqual(['Alice', 'Bob']);
      expect(vm.headshotUrls.length).toBe(2);
    });
  });

  describe('normalizePlayerSummary', () => {
    it('transforms raw hole-by-hole linescores into structured 18-hole scorecards with pars, totals, and badge types', () => {
      const mockRawSummary = {
        athlete: {
          id: '4604625',
          displayName: 'Scottie Scheffler',
          headshot: { href: 'https://a.espncdn.com/i/headshots/golf/players/full/4604625.png' },
        },
        rounds: [
          {
            period: 1,
            value: 68,
            displayValue: '-4',
            linescores: [
              { period: 1, value: 4, par: 4, scoreType: { displayValue: '0' } }, // par
              { period: 2, value: 4, par: 5, scoreType: { displayValue: '-1' } }, // birdie
              { period: 3, value: 3, par: 5, scoreType: { displayValue: '-2' } }, // eagle
              { period: 4, value: 5, par: 4, scoreType: { displayValue: '1' } }, // bogey
              { period: 5, value: 6, par: 4, scoreType: { displayValue: '2' } }, // double
              { period: 6, value: 4, par: 4, scoreType: { displayValue: '0' } },
              { period: 7, value: 3, par: 3, scoreType: { displayValue: '0' } },
              { period: 8, value: 4, par: 4, scoreType: { displayValue: '0' } },
              { period: 9, value: 4, par: 4, scoreType: { displayValue: '0' } },
              // Back nine
              { period: 10, value: 4, par: 4, scoreType: { displayValue: '0' } },
              { period: 11, value: 3, par: 3, scoreType: { displayValue: '0' } },
              { period: 12, value: 4, par: 4, scoreType: { displayValue: '0' } },
              { period: 13, value: 4, par: 5, scoreType: { displayValue: '-1' } },
              { period: 14, value: 4, par: 4, scoreType: { displayValue: '0' } },
              { period: 15, value: 4, par: 4, scoreType: { displayValue: '0' } },
              { period: 16, value: 3, par: 3, scoreType: { displayValue: '0' } },
              { period: 17, value: 4, par: 4, scoreType: { displayValue: '0' } },
              { period: 18, value: 4, par: 4, scoreType: { displayValue: '0' } },
            ],
          },
        ],
      };

      const summary = EspnTournamentAdapter.normalizePlayerSummary(mockRawSummary);
      expect(summary).toBeDefined();
      expect(summary.player.id).toBe('4604625');
      expect(summary.player.displayName).toBe('Scottie Scheffler');
      expect(summary.player.headshotUrls.length).toBeGreaterThan(0);
      expect(summary.player.initials).toBe('SS');

      expect(summary.rounds.length).toBe(1);
      const r1 = summary.rounds[0];
      expect(r1.period).toBe(1);
      expect(r1.frontPar).toBe(37);
      expect(r1.frontStrokes).toBe(37);
      expect(r1.backPar).toBe(35);
      expect(r1.backStrokes).toBe(34);
      expect(r1.totalPar).toBe(72);
      expect(r1.totalStrokes).toBe(71);
      expect(r1.holes.length).toBe(18);

      expect(r1.holes[0].scoreType).toBe('par');
      expect(r1.holes[1].scoreType).toBe('birdie');
      expect(r1.holes[2].scoreType).toBe('eagle');
      expect(r1.holes[3].scoreType).toBe('bogey');
      expect(r1.holes[4].scoreType).toBe('double');
    });
  });

  describe('EspnTournamentAdapter static methods', () => {
    it('exposes normalizeTournamentSnapshot, normalizePlayerSummary, and getGolferCardViewModel directly', () => {
      expect(typeof EspnTournamentAdapter.normalizeTournamentSnapshot).toBe('function');
      expect(typeof EspnTournamentAdapter.normalizePlayerSummary).toBe('function');
      expect(typeof EspnTournamentAdapter.getGolferCardViewModel).toBe('function');
      expect(typeof EspnTournamentAdapter.getCachedScoreboard).toBe('function');
      expect(typeof EspnTournamentAdapter.cacheScoreboard).toBe('function');
    });
  });
});
