async function testFetch() {
  const wyndhamUrl = 'https://site.web.api.espn.com/apis/site/v2/sports/golf/leaderboard?event=401580354';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  try {
    const res = await fetch(wyndhamUrl, { headers });
    if (!res.ok) {
      console.log('Wyndham fetch status:', res.status);
      return;
    }
    const data = await res.json();
    const event = data.events?.[0];
    const comps = event?.competitions?.[0]?.competitors || [];
    console.log(`Wyndham Championship found ${comps.length} competitors!`);
    
    // Sample first 10 competitors
    comps.slice(0, 10).forEach((c) => {
      console.log(`ID: ${c.athlete?.id || c.id} | Name: ${c.athlete?.displayName} | Headshot: ${c.athlete?.headshot?.href}`);
    });
  } catch (err) {
    console.error('Error fetching Wyndham:', err);
  }
}

testFetch();
