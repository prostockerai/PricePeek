// api/search.js
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
const CACHE_TTL = 15 * 60 * 1000;

module.exports = async (req, res) => {
  const { q, url } = req.query;

  if (url) {
    // … (previous url handling code)
    return res.json({ products: [], errors: [{ message: 'URL search not fully ready yet' }] });
  }

  if (!q) return res.status(400).json({ error: 'q parameter required' });

  const cacheKey = `search:${q}`;
  const cachedEntry = cache.get(cacheKey);
  if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL) {
    return res.json({ products: cachedEntry.data, cached: true });
  }

  const results = [];
  const errors = [];

  // Run scrapers one by one (easier to debug)
  for (const scraper of scrapers) {
    try {
      console.log(`[${scraper.marketplace}] Searching for: ${q}`);
      const prods = await scraper.search(q);
      results.push(...prods);
      console.log(`[${scraper.marketplace}] Found ${prods.length} products`);
    } catch (err) {
      console.error(`[${scraper.marketplace}] Error:`, err.message);
      errors.push({ marketplace: scraper.marketplace, error: err.message });
    }
  }

  // --- TEMPORARY: Always add a test product to check API connection ---
  if (results.length === 0) {
    results.push({
      id: 'test_001',
      name: `🔧 Test Product – API is working for "${q}"`,
      marketplace: 'System',
      price: 9999,
      originalPrice: 12000,
      discount: 16,
      inStock: true,
      image: null,
      url: '#',
      coupons: [],
      cashback: [],
    });
  }
  // --------------------------------------------------------------------

  cache.set(cacheKey, { data: results, timestamp: Date.now() });
  res.json({ products: results, errors, cached: false });
};
