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

  // URL পেস্ট করলে
  if (url) {
    try {
      const decodedUrl = decodeURIComponent(url);
      // URL থেকে প্রোডাক্ট বের করা
      let productInfo = null;
      for (const scraper of scrapers) {
        if (decodedUrl.includes(scraper.baseUrl)) {
          productInfo = await scraper.getProductFromUrl(decodedUrl);
          break;
        }
      }
      if (!productInfo) {
        return res.json({ products: [], errors: [{ message: 'URL থেকে পণ্য পাওয়া যায়নি' }] });
      }

      // সেই প্রোডাক্টের নাম/কীওয়ার্ড দিয়ে সব মার্কেটপ্লেসে খোঁজা
      const searchQuery = productMatcher.extractSearchKey(productInfo.name);
      const allProducts = [];
      const errors = [];
      const promises = scrapers.map(scraper =>
        scraper.search(searchQuery)
          .then(prods => allProducts.push(...prods))
          .catch(err => errors.push({ marketplace: scraper.marketplace, error: err.message }))
      );
      await Promise.allSettled(promises);

      // মিল থাকা প্রোডাক্টগুলোকে গ্রুপ করা
      const matchedGroups = productMatcher.groupByProduct(allProducts, productInfo.name);
      return res.json({
        products: allProducts,
        matchedGroups,
        sourceProduct: productInfo,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // সাধারণ সার্চ
  if (!q) {
    return res.status(400).json({ error: 'q or url parameter required' });
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

  cache.set(cacheKey, { data: results, timestamp: Date.now() });
  res.json({ products: results, errors: errors.length > 0 ? errors : undefined, cached: false });
};
