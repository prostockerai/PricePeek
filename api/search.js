const DarazScraper = require('../lib/daraz');
const StarTechScraper = require('../lib/startech');
const RyansScraper = require('../lib/ryans');
const PickabooScraper = require('../lib/pickaboo');
const productMatcher = require('../lib/matcher');

const scrapers = [
  new DarazScraper(),
  new StarTechScraper(),
  new RyansScraper(),
  new PickabooScraper(),
];

const cache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // ১৫ মিনিট ক্যাশ

module.exports = async (req, res) => {
  const { q, url } = req.query;

  if (!q && !url) return res.status(400).json({ error: 'q or url parameter required' });

  if (url) {
    return res.json({ products: [], message: 'URL search is being upgraded' });
  }

  const cacheKey = `search:${q}`;
  const cachedEntry = cache.get(cacheKey);
  if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL) {
    return res.json({ products: cachedEntry.data, cached: true });
  }

  // গুরুত্বপূর্ণ: লম্বা নাম থেকে ছোট কীওয়ার্ড তৈরি
  const searchQuery = productMatcher.extractSearchKey(q) || q;
  console.log(`Original: "${q}" → Searching: "${searchQuery}"`);

  const results = [];
  const errors = [];

  for (const scraper of scrapers) {
    try {
      const prods = await scraper.search(searchQuery);
      results.push(...prods);
      console.log(`[${scraper.marketplace}] Found ${prods.length} products`);
    } catch (err) {
      console.error(`[${scraper.marketplace}] Error:`, err.message);
      errors.push({ marketplace: scraper.marketplace, error: err.message });
    }
  }

  // মূল সার্চ টার্মের সাথে সাদৃশ্য অনুযায়ী সাজানো (অপশনাল)
  const originalQuery = q.toLowerCase().trim();
  const scored = results.map(p => {
    const pName = (p.name || '').toLowerCase();
    const tokens = originalQuery.split(/\s+/);
    const matchCount = tokens.filter(t => pName.includes(t)).length;
    return { ...p, _sim: matchCount / tokens.length };
  });
  scored.sort((a, b) => b._sim - a._sim);
  const finalProducts = scored.map(({ _sim, ...p }) => p);

  cache.set(cacheKey, { data: finalProducts, timestamp: Date.now() });
  res.json({ products: finalProducts, errors, cached: false });
};
