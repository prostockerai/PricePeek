// lib/pickaboo.js
const BaseScraper = require('./baseScraper');

class PickabooScraper extends BaseScraper {
  constructor() {
    super('Pickaboo', 'https://www.pickaboo.com');
  }

  // কীওয়ার্ড সার্চ – Pickaboo ক্লায়েন্ট-রেন্ডার করায় কাজ করবে না
  async search(query) {
    return [];
  }

  // পণ্যের বিস্তারিত পাতা থেকে সম্পূর্ণ তথ্য
  async getProductFromUrl(url) {
    try {
      const html = await this.fetchPage(url);
      if (!html) return null;
      const $ = this.loadHTML(html);

      // ১. নাম: আগে মেটা og:title, তারপর h1.title
      const name = this.cleanProductName(
        $('meta[property="og:title"]').attr('content') ||
        $('h1.title, h1.product-name, .product-title, .product-detail-name').first().text()
      );

      // ২. ছবি: আগে মেটা og:image, তারপর .dsn__main-image-container img
      const image = $('meta[property="og:image"]').attr('content') ||
                    $('.dsn__main-image-container img').attr('src') ||
                    $('.product-image img, .gallery img').first().attr('src');

      // ৩. দাম: h2 যার color="#1B5DD5" এবং font-size="24"
      const price = this.parsePrice(
        $('h2[color="#1B5DD5"][font-size="24"]').first().text() ||
        $('.product-price .price, .special-price .price, .price-box .price').first().text()
      );

      // ৪. পুরনো দাম (থাকলে)
      const originalPrice = this.parsePrice(
        $('.old-price .price, .regular-price .price, .price-box .old-price').text()
      );

      // ৫. স্টক – "Out of Stock" লেখা না থাকলে স্টকে আছে
      const inStock = !$('body').text().includes('Out of Stock');

      // ৬. রেটিং ও রিভিউ
      let rating = null;
      let reviewCount = null;
      const ratingDiv = $('.add-rating .rating-div span').first().text();
      if (ratingDiv) rating = parseFloat(ratingDiv);
      const reviewText = $('.add-rating h2[font-size="14"]').first().text();
      if (reviewText) reviewCount = parseInt(reviewText.replace(/[()]/g, '')) || null;

      if (!name) {
        console.error('[Pickaboo] Could not extract product name');
        return null;
      }

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
