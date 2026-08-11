import { describe, it, expect } from 'vitest';
import { SYNTHETIC_PGA_FIELD } from '../eventHelpers';

describe('SYNTHETIC_PGA_FIELD real ESPN IDs & Headshot mapping', () => {
  it('maps real ESPN IDs to PGA Tour golfers so headshots match names', () => {
    const scheffler = SYNTHETIC_PGA_FIELD.find((c) => c.athlete?.displayName === 'Scottie Scheffler');
    const mcIlroy = SYNTHETIC_PGA_FIELD.find((c) => c.athlete?.displayName === 'Rory McIlroy');
    const schauffele = SYNTHETIC_PGA_FIELD.find((c) => c.athlete?.displayName === 'Xander Schauffele');
    const morikawa = SYNTHETIC_PGA_FIELD.find((c) => c.athlete?.displayName === 'Collin Morikawa');

    expect(scheffler?.id).toBe('9478');
    expect(mcIlroy?.id).toBe('3470');
    expect(schauffele?.id).toBe('10140');
    expect(morikawa?.id).toBe('10592');

    expect(scheffler?.athlete?.headshot?.href).toBe('https://a.espncdn.com/i/headshots/golf/players/full/9478.png');
    expect(mcIlroy?.athlete?.headshot?.href).toBe('https://a.espncdn.com/i/headshots/golf/players/full/3470.png');
    expect(schauffele?.athlete?.headshot?.href).toBe('https://a.espncdn.com/i/headshots/golf/players/full/10140.png');
    expect(morikawa?.athlete?.headshot?.href).toBe('https://a.espncdn.com/i/headshots/golf/players/full/10592.png');
  });
});
