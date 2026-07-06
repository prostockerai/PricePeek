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
const CACHE_TTL = 15 * 60 * 1000; // ১৫ মিনিট

module.exports = async (req, res) => {
  const { q, url } = req.query;

  // --- URL দিয়ে সার্চ ---
  if (url) {
    try {
      const decodedUrl = decodeURIComponent(url);
      let sourceProduct = null;

      // ১. URL কোন মার্কেটপ্লেসের তা খুঁজে বের করা
      for (const scraper of scrapers) {
        // baseUrl থেকে https:// বাদ দিয়ে মিলানো (যাতে https://www.startech.com.bd মেলে)
        const baseHost = scraper.baseUrl.replace('https://', '').replace('http://', '');
        if (decodedUrl.includes(baseHost)) {
          sourceProduct = await scraper.getProductFromUrl(decodedUrl);
          break;
        }
      }

      // ২. সোর্স প্রোডাক্ট না পেলে ফিরিয়ে দেওয়া
      if (!sourceProduct || !sourceProduct.name) {
        return res.json({
          products: [],
          errors: [{ message: 'এই URL থেকে পণ্য খুঁজে পাওয়া যায়নি। দয়া করে সঠিক পণ্যের লিংক দিন।' }]
        });
      }

      // ৩. সোর্স পণ্যের নাম থেকে গুরুত্বপূর্ণ কীওয়ার্ড বের করা
      const searchQuery = productMatcher.extractSearchKey(sourceProduct.name);
      console.log(`[URL] পণ্য পেয়েছি: "${sourceProduct.name}" → সার্চ কী: "${searchQuery}"`);

      // ৪. সব মার্কেটপ্লেসে সেই কীওয়ার্ড দিয়ে সার্চ
      const results = [];
      const errors = [];
      for (const scraper of scrapers) {
        try {
          const prods = await scraper.search(searchQuery);
          results.push(...prods);
          console.log(`[${scraper.marketplace}] ${prods.length} পণ্য পাওয়া গেছে`);
        } catch (err) {
          console.error(`[${scraper.marketplace}] ত্রুটি:`, err.message);
          errors.push({ marketplace: scraper.marketplace, error: err.message });
        }
      }

      // ৫. যদি কোনো ফলাফল না আসে, অন্তত সোর্স পণ্যটি দেখানো (অন্যান্য মার্কেটপ্লেসে না পাওয়া গেলে)
      if (results.length === 0) {
        results.push(sourceProduct);
      }

      // ৬. মূল ইউজারের দেয়া URL-এর পণ্যের সাথে মিল রেখে সাজানো (অপশনাল)
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
        sourceProduct: sourceProduct,    // ফ্রন্টএন্ড চাইলে "অরিজিনাল প্রোডাক্ট" হাইলাইট করতে পারে
        errors: errors.length > 0 ? errors : undefined,
        cached: false,
      });
    } catch (err) {
      console.error('[URL] গুরুতর ত্রুটি:', err);
      return res.status(500).json({ error: 'URL প্রক্রিয়াকরণে সমস্যা হয়েছে' });
    }
  }

  // --- সাধারণ কীওয়ার্ড সার্চ ---
  if (!q) {
    return res.status(400).json({ error: 'q বা url প্যারামিটার দিতে হবে' });
  }

  const cacheKey = `search:${q}`;
  const cachedEntry = cache.get(cacheKey);
  if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL) {
    return res.json({ products: cachedEntry.data, cached: true });
  }

  // লম্বা নামকে ছোট কীওয়ার্ডে রূপান্তর
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

  // সাদৃশ্য অনুযায়ী সাজানো
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
