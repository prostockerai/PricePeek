const DarazScraper = require('../lib/daraz');
const StarTechScraper = require('../lib/startech');
// const RyansScraper = require('../lib/ryans');   // Ryans সাময়িকভাবে বন্ধ
const PickabooScraper = require('../lib/pickaboo');
const productMatcher = require('../lib/matcher');

const scrapers = [
  new DarazScraper(),
  new StarTechScraper(),
  // new RyansScraper(),
  new PickabooScraper(),   // Pickaboo শুধু URL সার্চে কাজ করে, কীওয়ার্ডে নয়
];

const cache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // ১৫ মিনিট

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







  // ----- অস্থায়ী ডিবাগ: Pickaboo পণ্যের পেজ ফেচ -----
  if (req.query.debug === 'pickaboo-product' && req.query.url) {
    const axios = require('axios');
    const testUrl = decodeURIComponent(req.query.url);
    try {
      const response = await axios.get(testUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        timeout: 15000,
      });
      const html = response.data;
      const snippet = html.substring(0, 3000);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(
        `Status: ${response.status}\n` +
        `HTML Length: ${html.length}\n` +
        `Contains "dsn__main-image-container": ${html.includes('dsn__main-image-container')}\n` +
        `Contains "price-view": ${html.includes('price-view')}\n` +
        `First 3000 chars:\n${snippet}`
      );
    } catch (err) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(`Error: ${err.message}`);
    }
  }
  // ---------------------------------------------------






  
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

      // ৩. সোর্স পণ্যের নাম থেকে কীওয়ার্ড তৈরি (অন্য মার্কেটপ্লেসে সার্চ করার জন্য)
      const searchQuery = productMatcher.extractSearchKey(sourceProduct.name);
      console.log(`[URL] Using search key: "${searchQuery}"`);

      // ৪. সব মার্কেটপ্লেসে সার্চ
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

      // ৫. সোর্স প্রোডাক্ট সবসময় শুরুতে যোগ করা (যদি না থাকে)
      if (sourceProduct && sourceProduct.name) {
        const alreadyExists = results.some(p => p.url === sourceProduct.url);
        if (!alreadyExists) {
          results.unshift(sourceProduct);
        }
      }

      // ৬. মূল পণ্যের সাথে সাদৃশ্য অনুযায়ী সাজানো (সোর্স প্রোডাক্ট উপরে)
      if (sourceProduct) sourceProduct._sim = 1;
      const originalQuery = sourceProduct ? sourceProduct.name.toLowerCase().trim() : '';
      results.forEach(p => {
        if (p._sim !== undefined) return;
        const pName = (p.name || '').toLowerCase();
        const tokens = originalQuery.split(/\s+/);
        const matchCount = tokens.filter(t => pName.includes(t)).length;
        p._sim = tokens.length ? matchCount / tokens.length : 0;
      });
      results.sort((a, b) => b._sim - a._sim);
      const finalProducts = results.map(({ _sim, ...p }) => p);

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

  // ইউজার যা লিখেছে, সরাসরি তাই পাঠানো (কোনো সংক্ষেপণ নয়)
  console.log(`Original query: "${q}"`);

  const results = [];
  const errors = [];
  for (const scraper of scrapers) {
    try {
      const prods = await scraper.search(q);
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
