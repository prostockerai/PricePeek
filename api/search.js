// api/search.js
const DarazScraper = require('../lib/daraz');
const StarTechScraper = require('../lib/startech');
const RyansScraper = require('../lib/ryans');
const PickabooScraper = require('../lib/pickaboo');

const scrapers = [
  new DarazScraper(),
  new StarTechScraper(),
  new RyansScraper(),
  new PickabooScraper(),
];

const cache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 মিনিট

module.exports = async (req, res) => {
  const { q } = req.query;
  if (!q) {
    res.status(400).json({ error: 'Query parameter q is required' });
    return;
  }

  const cacheKey = `search:${q}`;
  const cachedEntry = cache.get(cacheKey);
  if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL) {
    return res.json({ products: cachedEntry.data, cached: true });
  }

  const results = [];
  const errors = [];
  const promises = scrapers.map(scraper =>
    scraper.search(q)
      .then(prods => results.push(...prods))
      .catch(err => errors.push({ marketplace: scraper.marketplace, error: err.message }))
  );
  await Promise.allSettled(promises);

  // যদি কিছুই না পাওয়া যায়, ডেমো ডাটা দেখান
  if (results.length === 0) {
    results.push({
      id: 'demo1',
      name: 'Samsung 24" FHD Monitor (Demo)',
      marketplace: 'Demo',
      price: 14500,
      originalPrice: 16500,
      discount: 12,
      inStock: true,
      image: null,
      url: '#',
      coupons: [],
      cashback: [],
    });
  }

  cache.set(cacheKey, { data: results, timestamp: Date.now() });
  res.json({ products: results, errors, cached: false });
};
