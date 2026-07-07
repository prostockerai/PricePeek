// api/search.js
const DarazScraper = require('../lib/daraz');
const StarTechScraper = require('../lib/startech');
//const RyansScraper = require('../lib/ryans');   // Ryans সাময়িকভাবে বন্ধ
const PickabooScraper = require('../lib/pickaboo');
const productMatcher = require('../lib/matcher');

const scrapers = [
  new DarazScraper(),
  new StarTechScraper(),
  //new RyansScraper(),
  new PickabooScraper(),
];

const cache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // ১৫ মিনিট ক্যাশ

// URL থেকে পণ্যের নাম বের করার সহায়ক ফাংশন
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

  // ================== URL মোড ==================
  if (url) {
    try {
      const decodedUrl = decodeURIComponent(url);
      let sourceProduct = null;

      // ১. পণ্যের পেজ থেকে সম্পূর্ণ তথ্য আনার চেষ্টা (সংশ্লিষ্ট স্ক্র‍্যাপার দিয়ে)
      for (const scraper of scrapers) {
        const baseHost = scraper.baseUrl.replace('https://', '').replace('http://', '');
        if (decodedUrl.includes(baseHost)) {
          sourceProduct = await scraper.getProductFromUrl(decodedUrl);
          break;
        }
      }

      // ২. যদি scraper ব্যর্থ হয়, তাহলে URL থেকেই নাম নিয়ে ন্যূনতম অবজেক্ট তৈরি
      if (!sourceProduct || !sourceProduct.name) {
        const productNameFromUrl = extractProductNameFromUrl(decodedUrl);
        if (!productNameFromUrl) {
          return res.json({ products: [], errors: [{ message: 'URL থেকে পণ্যের নাম বের করা যায়নি' }] });
        }

        // ডোমেইন থেকে মার্কেটপ্লেসের নাম অনুমান
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

      // ৩. সোর্স পণ্যের নাম থেকে সার্চ কীওয়ার্ড তৈরি (URL-র জন্য সংক্ষেপণ করা ভালো)
      const searchQuery = productMatcher.extractSearchKey(sourceProduct.name);
      console.log(`[URL] Using search key: "${searchQuery}"`);

      // ৪. সব মার্কেটপ্লেসে সেই কীওয়ার্ড দিয়ে সার্চ
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

      // ৫. যদি কোনো ফলাফল না আসে, অন্তত সোর্স প্রোডাক্টটি যোগ করো
      if (results.length === 0 && sourceProduct) {
        results.push(sourceProduct);
      }

      // ৬. মূল পণ্যের সাথে সাদৃশ্য অনুযায়ী সাজানো (বেশি মিল উপরে)
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

  // ================== সাধারণ কীওয়ার্ড সার্চ ==================
  if (!q) return res.status(400).json({ error: 'q or url parameter required' });

  const cacheKey = `search:${q}`;
  const cachedEntry = cache.get(cacheKey);
  if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL) {
    return res.json({ products: cachedEntry.data, cached: true });
  }

  // 🔥 গুরুত্বপূর্ণ: কীওয়ার্ড সার্চে ইউজারের পুরো শব্দই ব্যবহার করা হবে (কোনো ছাঁটাই নয়)
  const searchQuery = q;
  console.log(`Original query: "${q}"`);

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

  // প্রাপ্ত ফলাফলকে মূল সার্চ টার্মের সাথে সাদৃশ্য অনুযায়ী সাজানো (বেশি মিল উপরে)
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
