const fs = require('fs');
const path = require('path');

async function extractAllGolfers() {
  console.log('Fetching ESPN PGA Calendar events...');
  const calendarUrl = 'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  try {
    const res = await fetch(calendarUrl, { headers });
    if (!res.ok) {
      console.error('Failed to fetch calendar:', res.status);
      return;
    }
    const data = await res.json();
    
    // Collect all event IDs from calendar
    const eventIds = new Set();
    if (data.leagues?.[0]?.calendar) {
      data.leagues[0].calendar.forEach((item) => {
        if (item.id) eventIds.add(item.id);
        if (item.entries && Array.isArray(item.entries)) {
          item.entries.forEach((e) => {
            if (e.id) eventIds.add(e.id);
          });
        }
      });
    }

    // Also add known event IDs like 401580354 (Wyndham)
    eventIds.add('401580354');

    console.log(`Found ${eventIds.size} PGA Tour events to query! Extracting golfer profiles...`);

    const golferMap = new Map();

    // Process event IDs
    for (const eventId of Array.from(eventIds).slice(0, 15)) {
      try {
        const evtUrl = `https://site.web.api.espn.com/apis/site/v2/sports/golf/leaderboard?event=${eventId}`;
        const evtRes = await fetch(evtUrl, { headers });
        if (!evtRes.ok) continue;
        const evtData = await evtRes.json();
        const eventObj = evtData.events?.[0];
        const comps = eventObj?.competitions?.[0]?.competitors || [];

        comps.forEach((comp) => {
          const athlete = comp.athlete;
          const id = athlete?.id || comp.id;
          const displayName = athlete?.displayName;
          const headshotUrl = athlete?.headshot?.href;

          if (id && displayName && headshotUrl) {
            golferMap.set(String(id), {
              id: String(id),
              name: displayName,
              headshotUrl: headshotUrl,
              country: athlete?.country?.abbreviation || '',
              flag: athlete?.flag?.href || '',
            });
          }
        });
        console.log(`Event ${eventId} (${eventObj?.name || 'Golf Event'}): extracted competitors. Total unique golfers now: ${golferMap.size}`);
      } catch (err) {
        // Skip failed event fetch
      }
    }

    const golferList = Array.from(golferMap.values());
    console.log(`\nExtracted TOTAL ${golferList.length} authentic ESPN PGA Tour golfers!`);

    const outputPath = path.join(__dirname, '../src/lib/espn/espnPlayerDirectory.json');
    fs.writeFileSync(outputPath, JSON.stringify(golferList, null, 2));
    console.log(`Successfully written authentic ESPN PGA Player Directory to ${outputPath}`);
  } catch (err) {
    console.error('Fatal error extracting golfers:', err);
  }
}

extractAllGolfers();
