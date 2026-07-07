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

// URL থেকে পণ্যের নাম বের করার সহায়ক ফাংশন
function extractProductNameFromUrl(url) {
  try {
    const { pathname } = new URL(url);
    // শেষ অংশটি নিন, হাইফেন/আন্ডারস্কোর দিয়ে ভাগ করা শব্দগুলোকে জোড়া দিন
    const lastSegment = pathname.split('/').filter(Boolean).pop();
    if (!lastSegment) return '';
    // "-" এবং "_" সরিয়ে ক্লিন টেক্সট তৈরি
    const cleaned = lastSegment.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned;
  } catch (e) {
    return '';
  }
}

module.exports = async (req, res) => {
  const { q, url } = req.query;









    // ----- অস্থায়ী ডিবাগ (Ryans HTML ও ত্রুটি বিস্তারিত) -----
  if (req.query.debug === 'ryans' && q) {
    const axios = require('axios');
    const url = `https://www.ryans.com/search?search=${encodeURIComponent(q)}`;
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        timeout: 15000,
      });
      const html = response.data;
      const snippet = html.substring(0, 1000);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(
        `Status: ${response.status}\n` +
        `HTML Length: ${html.length}\n` +
        `First 1000 chars:\n${snippet}`
      );
    } catch (err) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(`Error: ${err.message}`);
    }
  }
  // --------------------------------------------------- 





  




  
  // --- URL মোড ---
  if (url) {
    try {
      const decodedUrl = decodeURIComponent(url);

      // প্রথমে URL থেকে পণ্যের নাম বের করার চেষ্টা
      const productNameFromUrl = extractProductNameFromUrl(decodedUrl);
      console.log(`[URL] Extracted name from URL: "${productNameFromUrl}"`);

      // পণ্যের নাম থেকে সার্চ কীওয়ার্ড তৈরি
      const searchQuery = productNameFromUrl 
        ? productMatcher.extractSearchKey(productNameFromUrl) 
        : '';

      if (!searchQuery) {
        return res.json({ products: [], errors: [{ message: 'URL থেকে পণ্যের নাম বের করা যায়নি' }] });
      }

      console.log(`[URL] Using search key: "${searchQuery}"`);

      // সব মার্কেটপ্লেসে সেই কীওয়ার্ড দিয়ে সার্চ
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

      // সোর্স প্রোডাক্ট হিসেবে একটি অবজেক্ট তৈরি করা (যাতে ফ্রন্টএন্ডে দেখানোর মতো কিছু থাকে)
      const sourceProduct = {
        name: productNameFromUrl,
        url: decodedUrl,
        marketplace: 'Unknown (from URL)',
        price: null,
        inStock: true,
      };

      return res.json({
        products: results,
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
