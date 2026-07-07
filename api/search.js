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













// ----- Pickaboo ডিবাগ (HTML দেখার জন্য) -----
  if (req.query.debug === 'pickaboo' && q) {
    const axios = require('axios');
    const debugUrl = `https://www.pickaboo.com/catalogsearch/result/?q=${encodeURIComponent(q)}`;
    try {
      const response = await axios.get(debugUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        timeout: 15000,
      });
      const html = response.data;
      const snippet = html.substring(0, 2000); // প্রথম ২০০০ অক্ষর
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(
        `Status: ${response.status}\n` +
        `HTML Length: ${html.length}\n` +
        `First 2000 chars:\n${snippet}`
      );
    } catch (err) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(`Error: ${err.message}`);
    }
  }
  // ---------------------------------------------------













  
  // --- URL মোড (আপডেটেড) ---
  if (url) {
    try {
      const decodedUrl = decodeURIComponent(url);
      let sourceProduct = null;

      // ১. প্রথমে URL-এর ডোমেইন দেখে সংশ্লিষ্ট স্ক্র‍্যাপার দিয়ে পণ্যের সম্পূর্ণ তথ্য আনা
      for (const scraper of scrapers) {
        const baseHost = scraper.baseUrl.replace('https://', '').replace('http://', '');
        if (decodedUrl.includes(baseHost)) {
          sourceProduct = await scraper.getProductFromUrl(decodedUrl);
          break;
        }
      }

      // ২. যদি scraper ব্যর্থ হয়, তবে URL থেকে নাম নিয়ে একটি ন্যূনতম অবজেক্ট তৈরি
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

      // ৩. সোর্স পণ্যের নাম থেকে সার্চ কীওয়ার্ড তৈরি
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

      // ৫. যদি কোনো পণ্য না পাওয়া যায়, অন্তত সোর্স প্রোডাক্টটি রেজাল্টে যোগ করো
      if (results.length === 0 && sourceProduct) {
        results.push(sourceProduct);
      }

      // ৬. মূল পণ্যের সাথে সাদৃশ্য অনুযায়ী সাজানো (অপশনাল)
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
