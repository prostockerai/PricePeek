const BaseScraper = require('./baseScraper');
const axios = require('axios');

class PickabooScraper extends BaseScraper {
  constructor() {
    super('Pickaboo', 'https://www.pickaboo.com');
  }

  async search(query) {
    try {
      const url = `https://www.pickaboo.com/search/ajax/getresults?api_key=6W7Z0N7U0T&q=${encodeURIComponent(query)}&startIndex=0`;
      console.log(`[Pickaboo] API call: ${url}`);
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 15000,
      });

      if (!data?.items?.length) {
        console.log('[Pickaboo] API returned no items');
        return [];
      }

      const products = data.items.slice(0, 20).map((item, i) => ({
        id: `pickaboo_${Date.now()}_${i}`,
        name: this.cleanProductName(item.title),
        price: this.parsePrice(item.price),                // ✅ parsePrice ঠিক করবে কমা
        originalPrice: this.parsePrice(item.list_price) || null,
        discount: this.parseDiscount(
          this.parsePrice(item.price),
          this.parsePrice(item.list_price)
        ),
        image: item.image_link,
        url: item.link,
        marketplace: this.marketplace,
        inStock: true,
        rating: item.reviews_average_score ? Number(item.reviews_average_score) : null,
        reviewCount: item.total_reviews ? Number(item.total_reviews) : 0,
        soldCount: null,
        coupons: [],
        cashback: [],
      }));

      console.log(`[Pickaboo] API found ${products.length} products`);
      return products;
    } catch (err) {
      console.error('[Pickaboo] search error:', err.message);
      return [];
    }
  }

  async getProductFromUrl(url) {
    try {
      const html = await this.fetchPage(url);
      if (!html) return null;
      const $ = this.loadHTML(html);

      let rawName = $('h1.title, h1.product-name, .product-title').first().text().trim();
      if (!rawName || /buy\s+/i.test(rawName)) {
        rawName = $('meta[property="og:title"]').attr('content') || rawName;
      }
      rawName = rawName
        .replace(/^buy\s+/i, '')
        .replace(/\s+at\s+best\s+price\s+in\s+BD\s*$/i, '')
        .replace(/\s*\|\s*Pickaboo\s*$/i, '')
        .trim();
      const name = this.cleanProductName(rawName);
      if (!name || name.length < 2) return null;

      const image = $('meta[property="og:image"]').attr('content') ||
                    $('.dsn__main-image-container img').attr('src') ||
                    $('.product-image img').first().attr('src');

      let price = null;
      const priceText = $('.price-view').text().trim();
      if (priceText) {
        const match = priceText.match(/৳\s*([\d,]+)/);
        if (match) price = this.parsePrice(match[0]);
      }
      if (!price) {
        $('h2[color="#1B5DD5"][font-size="24"]').each((i, el) => {
          const p = this.parsePrice($(el).text());
          if (p) { price = p; return false; }
        });
      }
      if (!price) {
        price = this.parsePrice(
          $('.product-price .price, .special-price .price').first().text()
        );
      }

      const originalPrice = this.parsePrice(
        $('.old-price .price, .regular-price .price').text()
      );

      const inStock = !$('body').text().includes('Out of Stock');
      let rating = null, reviewCount = null;
      const ratingDiv = $('.add-rating .rating-div span').first().text();
      if (ratingDiv) rating = parseFloat(ratingDiv);
      const reviewText = $('.add-rating h2[font-size="14"]').first().text();
      if (reviewText) reviewCount = parseInt(reviewText.replace(/[()]/g, '')) || null;

      return {
        id: `pickaboo_url_${Date.now()}`,
        name,
        price,
        originalPrice: originalPrice || price,
        image,
        url,
        marketplace: this.marketplace,
        inStock,
        rating,
        reviewCount,
        soldCount: null,
        coupons: [],
        cashback: [],
      };
    } catch (err) {
      console.error('[Pickaboo] getProductFromUrl error:', err.message);
      return null;
    }
  }
}

module.exports = PickabooScraper;
