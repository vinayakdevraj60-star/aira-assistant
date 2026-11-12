const https = require('https');

class CricketService {
  constructor() {
    this.cache = {
      html: '',
      timestamp: 0
    };
    this.matchDetailsCache = new Map();
  }

  isCricketQuery(prompt) {
    if (!prompt) return false;
    const lower = prompt.toLowerCase();
    const cricketKeywords = [
      'cricket', 'match', 'score', 'scorecard', 'innings', 'wicket', 'overs',
      'who won', 'today\'s match', 'yesterday\'s match', 'live score',
      'india vs', 'ind vs', 'nz vs', 'new zealand', 'aus vs', 'australia vs',
      'pak vs', 'pakistan vs', 'eng vs', 'england vs', 'sa vs', 'south africa',
      't20', 'odi', 'test match', 'ipl', 'bcci', 'icc'
    ];
    return cricketKeywords.some(k => lower.includes(k));
  }

  fetchUrl(url) {
    return new Promise((resolve, reject) => {
      const req = https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.setTimeout(6000, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });
  }

  async getLiveScoresHtml() {
    const now = Date.now();
    if (this.cache.html && (now - this.cache.timestamp < 60000)) {
      return this.cache.html;
    }
    try {
      const html = await this.fetchUrl('https://www.cricbuzz.com/cricket-match/live-scores');
      this.cache.html = html;
      this.cache.timestamp = now;
      return html;
    } catch (e) {
      console.warn('[CricketService] Error fetching live scores index:', e.message);
      return this.cache.html || '';
    }
  }

  async getLiveCricketContext(prompt = '') {
    try {
      const html = await this.getLiveScoresHtml();
      if (!html) return '';

      const matchRegex = /href="(\/live-cricket-scores\/(\d+)\/([^"]+))"/g;
      let m;
      const matches = [];
      const seenIds = new Set();

      while ((m = matchRegex.exec(html)) !== null) {
        const fullUrl = m[1];
        const matchId = m[2];
        const slug = m[3];
        if (!seenIds.has(matchId)) {
          seenIds.add(matchId);
          matches.push({ fullUrl, matchId, slug });
        }
      }

      if (matches.length === 0) return '';

      // Determine if a specific team is requested
      const lower = prompt.toLowerCase();
      let targetMatches = matches;
      if (lower.includes('ind') || lower.includes('india') || lower.includes('nz') || lower.includes('new zealand') || lower.includes('newzland')) {
        const matched = matches.filter(x => x.slug.includes('ind') || x.slug.includes('nz') || x.slug.includes('india') || x.slug.includes('zealand'));
        if (matched.length > 0) targetMatches = matched;
      } else if (lower.includes('aus') || lower.includes('australia')) {
        const matched = matches.filter(x => x.slug.includes('aus'));
        if (matched.length > 0) targetMatches = matched;
      } else if (lower.includes('pak') || lower.includes('pakistan')) {
        const matched = matches.filter(x => x.slug.includes('pak'));
        if (matched.length > 0) targetMatches = matched;
      }

      // Fetch score details for target matches (up to top 3)
      const detailsList = [];
      for (const tm of targetMatches.slice(0, 2)) {
        try {
          const detail = await this.fetchMatchDetail(tm.matchId, tm.slug);
          if (detail) detailsList.push(detail);
        } catch (e) {
          console.warn('[CricketService] Error parsing match:', tm.slug, e.message);
        }
      }

      if (detailsList.length === 0) return '';

      return `\n\n[LIVE VERIFIED REAL-TIME CRICKET DATA AS OF TODAY (${new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })})]:\n` + detailsList.join('\n\n');
    } catch (err) {
      console.warn('[CricketService] Live cricket fetch error:', err.message);
      return '';
    }
  }

  async fetchMatchDetail(matchId, slug) {
    const cached = this.matchDetailsCache.get(matchId);
    if (cached && (Date.now() - cached.time < 60000)) {
      return cached.text;
    }

    const url = `https://www.cricbuzz.com/live-cricket-scores/${matchId}/${slug}`;
    const html = await this.fetchUrl(url);

    const clean = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
                      .replace(/<[^>]+>/g, '\n')
                      .split('\n')
                      .map(l => l.trim())
                      .filter(l => l.length > 0);

    let matchTitle = slug.replace(/-/g, ' ').toUpperCase();
    let result = '';
    let scores = [];

    for (let i = 0; i < clean.length; i++) {
      const line = clean[i];
      if (line.includes('won by') || line.includes('tied') || line.includes('drawn') || line.includes('opt to bat') || line.includes('opt to bowl') || line.includes('Match scheduled to begin')) {
        if (!result) result = line;
      }
      // Detect lines like "India won by 5 wkts"
      if (result && i < 200) {
        // Collect score lines
        if (/^[A-Z]{2,4}$/.test(line) && clean[i+1] && /^\d+/.test(clean[i+1])) {
          let scoreLine = `${line}: ${clean[i+1]}`;
          if (clean[i+2] === '/' && clean[i+3]) {
            scoreLine += `/${clean[i+3]}`;
            if (clean[i+4] === '(' && clean[i+5]) {
              scoreLine += ` (${clean[i+5]} ov)`;
            }
          } else if (clean[i+2] === '(' && clean[i+3]) {
            scoreLine += ` (${clean[i+3]} ov)`;
          }
          if (!scores.includes(scoreLine)) scores.push(scoreLine);
        }
      }
    }

    let summary = `* Match: ${matchTitle}\n`;
    if (result) summary += `* Status/Result: ${result}\n`;
    if (scores.length > 0) summary += `* Scores: ${scores.join(' | ')}\n`;

    this.matchDetailsCache.set(matchId, { text: summary, time: Date.now() });
    return summary;
  }
}

module.exports = new CricketService();
