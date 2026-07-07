// lib/pickaboo.js
const BaseScraper = require('./baseScraper');

class PickabooScraper extends BaseScraper {
  constructor() {
    super('Pickaboo', 'https://www.pickaboo.com');
  }

  async search(query) { return []; }

  async getProductFromUrl(url) {
    try {
      const html = await this.fetchPage(url);
      if (!html) return null;
      const $ = this.loadHTML(html);

      // ---------- নাম ----------
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

      // ---------- ছবি ----------
      const image = $('meta[property="og:image"]').attr('content') ||
                    $('.dsn__main-image-container img').attr('src') ||
                    $('.product-image img').first().attr('src');

      // ---------- দাম (সহজ ও নির্ভরযোগ্য) ----------
      let price = null;
      // প্রথমে price-view কন্টেইনারের ভিতরে '৳' চিহ্নযুক্ত যেকোনো টেক্সট নেওয়া
      const priceText = $('.price-view').text().trim();
      if (priceText) {
        const match = priceText.match(/৳\s*([\d,]+)/);
        if (match) {
          price = this.parsePrice(match[0]);   // match[0] পুরো "৳ 17,999" দিলে parsePrice সংখ্যা বের করবে
        }
      }
      // দ্বিতীয় চেষ্টা: নির্দিষ্ট h2 (যদি ওপরেরটা কাজ না করে)
      if (!price) {
        $('h2[color="#1B5DD5"][font-size="24"]').each((i, el) => {
          const p = this.parsePrice($(el).text());
          if (p) { price = p; return false; }
        });
      }
      // তৃতীয় চেষ্টা: সাধারণ প্রাইস সিলেক্টর
      if (!price) {
        price = this.parsePrice(
          $('.product-price .price, .special-price .price').first().text()
        );
      }

      // ---------- পুরনো দাম ----------
      const originalPrice = this.parsePrice(
        $('.old-price .price, .regular-price .price').text()
      );

      // ---------- স্টক, রেটিং ----------
      const inStock = !$('body').text().includes('Out of Stock');
      let rating = null, reviewCount = null;
      const ratingDiv = $('.add-rating .rating-div span').first().text();
      if (ratingDiv) rating = parseFloat(ratingDiv);
      const reviewText = $('.add-rating h2[font-size="14"]').first().text();
      if (reviewText) reviewCount = parseInt(reviewText.replace(/[()]/g, '')) || null;

      return {
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
