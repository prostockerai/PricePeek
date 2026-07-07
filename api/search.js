// api/search.js (পরিষ্কার ভার্সন)
const DarazScraper = require('../lib/daraz');
const StarTechScraper = require('../lib/startech');
//const RyansScraper = require('../lib/ryans');
const PickabooScraper = require('../lib/pickaboo');
const productMatcher = require('../lib/matcher');

const scrapers = [
  new DarazScraper(),
  new StarTechScraper(),
  //new RyansScraper(),
  new PickabooScraper(),
];

const cache = new Map();
const CACHE_TTL = 15 * 60 * 1000;

function extractProductNameFromUrl(url) {
  try {
    const { pathname } = new URL(url);
    const lastSegment = pathname.split('/').filter(Boolean).pop();
    if (!lastSegment) return '';
    const cleaned = lastSegment.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned;
  } catch (e) {
    return '';
  }
}

module.exports = async (req, res) => {
  const { q, url } = req.query;

  // --- URL মোড ---
  if (url) {
    try {
      const decodedUrl = decodeURIComponent(url);
      let sourceProduct = null;

      for (const scraper of scrapers) {
        const baseHost = scraper.baseUrl.replace('https://', '').replace('http://', '');
        if (decodedUrl.includes(baseHost)) {
          sourceProduct = await scraper.getProductFromUrl(decodedUrl);
          break;
        }
      }

      if (!sourceProduct || !sourceProduct.name) {
        const productNameFromUrl = extractProductNameFromUrl(decodedUrl);
        if (!productNameFromUrl) {
          return res.json({ products: [], errors: [{ message: 'URL থেকে পণ্যের নাম বের করা যায়নি' }] });
        }

        let marketplaceGuess = 'Unknown';
        try {
          const host = new URL(decodedUrl).hostname.replace('www.', '');
          const parts = host.split('.');
          if (parts.length >= 2) marketplaceGuess = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        } catch (e) {}

        sourceProduct = {
          name: productNameFromUrl,
          url: decodedUrl,
          marketplace: marketplaceGuess,
          price: null,
          originalPrice: null,
          image: null,
          inStock: true,
          coupons: [],
          cashback: [],
        };
      }

      const searchQuery = productMatcher.extractSearchKey(sourceProduct.name);
      console.log(`[URL] Using search key: "${searchQuery}"`);

      const results = [];
      const errors = [];
      for (const scraper of scrapers) {
        try {
          const prods = await scraper.search(searchQuery);
          results.push(...prods);
          console.log(`[${scraper.marketplace}] Found ${prods.length} products`);
        } catch (err) {
          errors.push({ marketplace: scraper.marketplace, error: err.message });
        }
      }

      if (results.length === 0 && sourceProduct) {
        results.push(sourceProduct);
      }

      const originalQuery = sourceProduct.name.toLowerCase().trim();
      const scored = results.map(p => {
        const pName = (p.name || '').toLowerCase();
        const tokens = originalQuery.split(/\s+/);
        const matchCount = tokens.filter(t => pName.includes(t)).length;
        return { ...p, _sim: matchCount / tokens.length };
      });
      scored.sort((a, b) => b._sim - a._sim);
      const finalProducts = scored.map(({ _sim, ...p }) => p);

      return res.json({
        products: finalProducts,
        sourceProduct,
        errors: errors.length > 0 ? errors : undefined,
        cached: false,
      });
    } catch (err) {
      console.error('[URL] Error:', err);
      return res.status(500).json({ error: 'URL প্রক্রিয়াকরণে সমস্যা' });
    }
  }

  // --- সাধারণ সার্চ (q) ---
  if (!q) return res.status(400).json({ error: 'q or url parameter required' });

  const cacheKey = `search:${q}`;
  const cachedEntry = cache.get(cacheKey);
  if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL) {
    return res.json({ products: cachedEntry.data, cached: true });
  }

  const searchQuery = productMatcher.extractSearchKey(q) || q;
  console.log(`Original: "${q}" -> Searching: "${searchQuery}"`);

  const results = [];
  const errors = [];
  for (const scraper of scrapers) {
    try {
      const prods = await scraper.search(searchQuery);
      results.push(...prods);
    } catch (err) {
      errors.push({ marketplace: scraper.marketplace, error: err.message });
    }
  }

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
  res.json({ products: finalProducts, errors: errors.length ? errors : undefined, cached: false });
};
