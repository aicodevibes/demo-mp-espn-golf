import { describe, it, expect } from 'vitest';
import { getGolferProfile, getGolferInitials, searchGolferProfiles } from '../golferDirectory';
import { ESPNCompetitor } from '@/types/espn';
import { Participant } from '@/types/contest';

describe('GolferDirectory Evaluator Domain Seam', () => {
  const sampleCompetitors: ESPNCompetitor[] = [
    {
      id: '3470',
      athlete: {
        id: '3470',
        displayName: 'Scottie Scheffler',
        shortName: 'S. Scheffler',
        firstName: 'Scottie',
        lastName: 'Scheffler',
        headshot: { href: 'https://a.espncdn.com/i/headshots/golf/players/full/3470.png' },
      },
    },
    {
      id: '4587',
      athlete: {
        id: '4587',
        displayName: 'Jon Rahm',
        shortName: 'J. Rahm',
        firstName: 'Jon',
        lastName: 'Rahm',
      },
    },
  ];

  const sampleParticipants: Participant[] = [
    {
      id: 'p1',
      name: 'Texas Longhorns',
      draftedPlayerIds: ['3470'],
    },
    {
      id: 'p2',
      name: 'Florida Gators',
      draftedPlayerIds: ['4587'],
    },
  ];

  it('resolves a golfer profile by ESPN athlete ID with complete headshot fallback chain', () => {
    const profile = getGolferProfile('3470', { competitors: sampleCompetitors, participants: sampleParticipants });
    expect(profile).toBeDefined();
    expect(profile.id).toBe('3470');
    expect(profile.name).toBe('Scottie Scheffler');
    expect(profile.draftedBy).toEqual(['Texas Longhorns']);
    expect(profile.headshotUrls.length).toBeGreaterThanOrEqual(2);
    expect(profile.headshotUrls[0]).toBe('https://a.espncdn.com/i/headshots/golf/players/full/3470.png');
  });

  it('resolves a golfer profile by fuzzy display name or short name', () => {
    const profile = getGolferProfile('J. Rahm', { competitors: sampleCompetitors, participants: sampleParticipants });
    expect(profile).toBeDefined();
    expect(profile.id).toBe('4587');
    expect(profile.name).toBe('Jon Rahm');
    expect(profile.draftedBy).toEqual(['Florida Gators']);
  });

  it('falls back gracefully to player directory map when competitor is not in ESPN payload', () => {
    // 9478 is Scottie Scheffler in DEFAULT_PLAYER_DIRECTORY_MAP / directory catalog
    const profile = getGolferProfile('9478');
    expect(profile).toBeDefined();
    expect(profile.name).toBe('Scottie Scheffler');
    expect(profile.headshotUrls.length).toBeGreaterThan(0);
  });


  it('derives golfer initials correctly', () => {
    expect(getGolferInitials('Scottie Scheffler')).toBe('SS');
    expect(getGolferInitials('Tiger')).toBe('TI');
    expect(getGolferInitials('')).toBe('PGA');
  });

  it('searches golfer profiles and returns ordered matches with profiles', () => {
    const results = searchGolferProfiles('Scheffler', { competitors: sampleCompetitors, participants: sampleParticipants });
    expect(results.length).toBe(1);
    expect(results[0].profile.name).toBe('Scottie Scheffler');
    expect(results[0].profile.draftedBy).toEqual(['Texas Longhorns']);
  });
});
