import { describe, it, expect } from 'vitest';

const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST;
const PROJECT_ID = 'fir-demo-mp';
const DATABASE_ID = 'fir-demo-mp';

function makeEmulatorJwt(claims: {
  uid: string;
  email: string;
  email_verified: boolean;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: `https://securetoken.google.com/${PROJECT_ID}`,
      aud: PROJECT_ID,
      auth_time: now,
      user_id: claims.uid,
      sub: claims.uid,
      iat: now,
      exp: now + 3600,
      email: claims.email,
      email_verified: claims.email_verified,
      firebase: {
        identities: { email: [claims.email] },
        sign_in_provider: 'google.com',
      },
    })
  ).toString('base64url');
  return `${header}.${payload}.`;
}

function docUrl(path: string): string {
  return `http://${EMULATOR_HOST}/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${path}`;
}

async function firestoreGet(path: string, token?: string): Promise<Response> {
  return fetch(docUrl(path), {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

async function firestorePatch(
  path: string,
  fields: Record<string, unknown>,
  token?: string,
  updateMask?: string[]
): Promise<Response> {
  const url = new URL(docUrl(path));
  if (updateMask) {
    for (const field of updateMask) {
      url.searchParams.append('updateMask.fieldPaths', field);
    }
  }
  return fetch(url.toString(), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ fields }),
  });
}

async function firestoreDelete(path: string, token?: string): Promise<Response> {
  return fetch(docUrl(path), {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

const ADMIN_TOKEN = makeEmulatorJwt({
  uid: 'admin-uid',
  email: 'aicodevibes@gmail.com',
  email_verified: true,
});

const UNVERIFIED_ADMIN_TOKEN = makeEmulatorJwt({
  uid: 'unverified-admin-uid',
  email: 'aicodevibes@gmail.com',
  email_verified: false,
});

const NON_ADMIN_TOKEN = makeEmulatorJwt({
  uid: 'visitor-uid',
  email: 'visitor@example.com',
  email_verified: true,
});

describe.runIf(Boolean(EMULATOR_HOST))('Firestore Security Rules (Emulator)', () => {
  it('allows public reads on allowed collections and denies unknown collections', async () => {
    const allowedPaths = [
      'config/app',
      'trackedEvents/evt1',
      'trackedPlayers/3470',
      'players/3470',
      'participants/p1',
      'events/evt1',
      'events/evt1/contestConfig/default',
      'events/evt1/participants/p1',
    ];

    for (const path of allowedPaths) {
      const res = await firestoreGet(path);
      expect([200, 404]).toContain(res.status);
    }

    const deniedRes = await firestoreGet('secrets/private', ADMIN_TOKEN);
    expect(deniedRes.status).toBe(403);
  });

  it('rejects unauthenticated, non-admin, and unverified-admin writes across all collections', async () => {
    const validConfigFields = {
      activeEventId: { stringValue: '401705663' },
      activeSeason: { integerValue: '2026' },
      updatedBy: { stringValue: 'aicodevibes@gmail.com' },
    };

    const validParticipantFields = {
      id: { stringValue: 'p-pat' },
      name: { stringValue: 'Pat' },
      draftedPlayerIds: { arrayValue: { values: [{ stringValue: '3470' }] } },
    };

    const validPlayerFields = {
      id: { stringValue: '3470' },
      name: { stringValue: 'Scottie Scheffler' },
    };

    const targets: Array<[string, Record<string, unknown>]> = [
      ['config/app', validConfigFields],
      ['events/401705663/participants/p-pat', validParticipantFields],
      ['participants/p-pat', validParticipantFields],
      ['players/3470', validPlayerFields],
      [
        'trackedPlayers/3470',
        { playerId: { stringValue: '3470' }, name: { stringValue: 'Scottie Scheffler' } },
      ],
      ['trackedEvents/401705663', { name: { stringValue: 'Masters' } }],
      ['events/401705663', { name: { stringValue: 'Masters' } }],
    ];

    for (const [path, fields] of targets) {
      expect((await firestorePatch(path, fields)).status).toBe(403);
      expect((await firestorePatch(path, fields, NON_ADMIN_TOKEN)).status).toBe(403);
      expect((await firestorePatch(path, fields, UNVERIFIED_ADMIN_TOKEN)).status).toBe(403);
    }
  });

  it('allows verified admin writes matching collection schemas and rejects invalid payloads', async () => {
    // 1. config/app valid & invalid
    const cfgOk = await firestorePatch(
      'config/app',
      {
        activeEventId: { stringValue: '401705663' },
        activeSeason: { integerValue: '2026' },
        updatedAt: { timestampValue: new Date().toISOString() },
        updatedBy: { stringValue: 'aicodevibes@gmail.com' },
      },
      ADMIN_TOKEN
    );
    expect(cfgOk.status).toBe(200);

    const cfgExtraField = await firestorePatch(
      'config/app',
      {
        activeEventId: { stringValue: '401705663' },
        activeSeason: { integerValue: '2026' },
        rogueField: { booleanValue: true },
      },
      ADMIN_TOKEN
    );
    expect(cfgExtraField.status).toBe(403);

    // 2. events/{eventId}/contestConfig/default create, partial merge update, invalid, delete
    const contestCreateOk = await firestorePatch(
      'events/401705663/contestConfig/default',
      {
        espnEventId: { stringValue: '401705663' },
        eventName: { stringValue: 'Masters Tournament' },
        season: { integerValue: '2026' },
        entryFee: { integerValue: '50' },
        greedyEntryFee: { integerValue: '25' },
        mainPayouts: {
          arrayValue: { values: [{ integerValue: '600' }, { integerValue: '320' }] },
        },
        dayMoneyPool: { integerValue: '75' },
        coursePar: { nullValue: null },
        hasCut: { booleanValue: true },
        isFinalized: { booleanValue: false },
        createdAt: { timestampValue: new Date().toISOString() },
        updatedAt: { timestampValue: new Date().toISOString() },
        updatedBy: { stringValue: 'aicodevibes@gmail.com' },
      },
      ADMIN_TOKEN
    );
    expect(contestCreateOk.status).toBe(200);

    const contestUpdateOk = await firestorePatch(
      'events/401705663/contestConfig/default',
      {
        isFinalized: { booleanValue: true },
        updatedAt: { timestampValue: new Date().toISOString() },
      },
      ADMIN_TOKEN,
      ['isFinalized', 'updatedAt']
    );
    expect(contestUpdateOk.status).toBe(200);

    const contestBadEventId = await firestorePatch(
      'events/401705663/contestConfig/other',
      {
        espnEventId: { stringValue: '999999' },
        eventName: { stringValue: 'Mismatch' },
        season: { integerValue: '2026' },
        mainPayouts: { arrayValue: { values: [{ integerValue: '100' }] } },
        dayMoneyPool: { integerValue: '50' },
      },
      ADMIN_TOKEN
    );
    expect(contestBadEventId.status).toBe(403);

    expect(
      (await firestoreDelete('events/401705663/contestConfig/default', ADMIN_TOKEN)).status
    ).toBe(200);

    // 3. participants valid, invalid, delete
    const participantOk = await firestorePatch(
      'events/401705663/participants/p-pat',
      {
        id: { stringValue: 'p-pat' },
        name: { stringValue: 'Pat' },
        draftedPlayerIds: {
          arrayValue: { values: [{ stringValue: '3470' }, { stringValue: '9478' }] },
        },
        isGreedyParticipant: { booleanValue: false },
        greedyPlayerId: { nullValue: null },
        hasPaidEntry: { booleanValue: true },
        hasPaidGreedy: { booleanValue: false },
      },
      ADMIN_TOKEN
    );
    expect(participantOk.status).toBe(200);

    const participantMismatch = await firestorePatch(
      'events/401705663/participants/p-pat',
      {
        id: { stringValue: 'p-other' },
        name: { stringValue: 'Pat' },
        draftedPlayerIds: { arrayValue: { values: [] } },
      },
      ADMIN_TOKEN
    );
    expect(participantMismatch.status).toBe(403);

    expect(
      (await firestoreDelete('events/401705663/participants/p-pat', ADMIN_TOKEN)).status
    ).toBe(200);

    // 4. players valid & invalid URL
    const playerOk = await firestorePatch(
      'players/3470',
      {
        id: { stringValue: '3470' },
        name: { stringValue: 'Scottie Scheffler' },
        headshotUrl: {
          stringValue: 'https://a.espncdn.com/i/headshots/golf/players/full/3470.png',
        },
        country: { stringValue: 'USA' },
        countryFlag: { stringValue: '' },
        lastUpdated: { timestampValue: new Date().toISOString() },
      },
      ADMIN_TOKEN
    );
    expect(playerOk.status).toBe(200);

    const playerBadUrl = await firestorePatch(
      'players/3470',
      {
        id: { stringValue: '3470' },
        name: { stringValue: 'Scottie Scheffler' },
        headshotUrl: { stringValue: 'javascript:alert(1)' },
      },
      ADMIN_TOKEN
    );
    expect(playerBadUrl.status).toBe(403);

    // 5. trackedPlayers valid & invalid
    const trackedOk = await firestorePatch(
      'trackedPlayers/3470',
      {
        playerId: { stringValue: '3470' },
        name: { stringValue: 'Scottie Scheffler' },
        displayOrder: { integerValue: '1' },
        addedAt: { timestampValue: new Date().toISOString() },
      },
      ADMIN_TOKEN
    );
    expect(trackedOk.status).toBe(200);

    // 6. Unknown subcollection under events/{eventId} denied even for admin
    const unknownSub = await firestorePatch(
      'events/401705663/unknownSub/doc1',
      { foo: { stringValue: 'bar' } },
      ADMIN_TOKEN
    );
    expect(unknownSub.status).toBe(403);

    // 7. trackedEvents/{eventId} valid & invalid payloads
    expect(
      (
        await firestorePatch(
          'trackedEvents/401705663',
          { name: { stringValue: 'Masters' } },
          ADMIN_TOKEN
        )
      ).status
    ).toBe(200);

    expect(
      (
        await firestorePatch(
          'trackedEvents/401705663',
          {
            name: { stringValue: 'Masters Tournament' },
            eventId: { stringValue: '401705663' },
            espnEventId: { stringValue: '401705663' },
            season: { integerValue: '2026' },
            date: { stringValue: '2026-04-09' },
            isActive: { booleanValue: true },
            updatedAt: { timestampValue: new Date().toISOString() },
            updatedBy: { stringValue: 'aicodevibes@gmail.com' },
          },
          ADMIN_TOKEN
        )
      ).status
    ).toBe(200);

    // Reject missing name, rogue fields, mismatched eventId, oversized name
    expect(
      (
        await firestorePatch(
          'trackedEvents/401705663',
          { season: { integerValue: '2026' } },
          ADMIN_TOKEN
        )
      ).status
    ).toBe(403);
    expect(
      (
        await firestorePatch(
          'trackedEvents/401705663',
          { name: { stringValue: 'Masters' }, rogue: { booleanValue: true } },
          ADMIN_TOKEN
        )
      ).status
    ).toBe(403);
    expect(
      (
        await firestorePatch(
          'trackedEvents/401705663',
          { name: { stringValue: 'Masters' }, eventId: { stringValue: '999' } },
          ADMIN_TOKEN
        )
      ).status
    ).toBe(403);
    expect(
      (
        await firestorePatch(
          'trackedEvents/401705663',
          { name: { stringValue: 'x'.repeat(201) } },
          ADMIN_TOKEN
        )
      ).status
    ).toBe(403);
    expect((await firestoreDelete('trackedEvents/401705663', ADMIN_TOKEN)).status).toBe(200);

    // 8. events/{eventId} valid & invalid payloads
    expect(
      (
        await firestorePatch(
          'events/401705663',
          {
            id: { stringValue: '401705663' },
            espnEventId: { stringValue: '401705663' },
            name: { stringValue: 'Masters Tournament' },
            season: { integerValue: '2026' },
          },
          ADMIN_TOKEN
        )
      ).status
    ).toBe(200);

    expect(
      (
        await firestorePatch(
          'events/401705664',
          { eventName: { stringValue: 'PGA Championship' } },
          ADMIN_TOKEN
        )
      ).status
    ).toBe(200);

    // Reject empty map, rogue field, mismatched id, out-of-range season
    expect((await firestorePatch('events/401705665', {}, ADMIN_TOKEN)).status).toBe(403);
    expect(
      (
        await firestorePatch(
          'events/401705663',
          { name: { stringValue: 'Masters' }, rogue: { stringValue: 'bad' } },
          ADMIN_TOKEN
        )
      ).status
    ).toBe(403);
    expect(
      (
        await firestorePatch(
          'events/401705663',
          { id: { stringValue: 'wrong-id' }, name: { stringValue: 'Masters' } },
          ADMIN_TOKEN
        )
      ).status
    ).toBe(403);
    expect(
      (
        await firestorePatch(
          'events/401705663',
          { name: { stringValue: 'Masters' }, season: { integerValue: '1900' } },
          ADMIN_TOKEN
        )
      ).status
    ).toBe(403);
    expect((await firestoreDelete('events/401705663', ADMIN_TOKEN)).status).toBe(200);
    expect((await firestoreDelete('events/401705664', ADMIN_TOKEN)).status).toBe(200);
  });
});
