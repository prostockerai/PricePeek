// lib/pickaboo.js
const BaseScraper = require('./baseScraper');

class PickabooScraper extends BaseScraper {
  constructor() {
    super('Pickaboo', 'https://www.pickaboo.com');
  }

  // কীওয়ার্ড সার্চ – কাজ করে না (ক্লায়েন্ট-রেন্ডারিং)
  async search(query) {
    return [];
  }

  // পণ্যের URL থেকে সম্পূর্ণ তথ্য আনা
  async getProductFromUrl(url) {
    try {
      const html = await this.fetchPage(url);
      if (!html) return null;
      const $ = this.loadHTML(html);

      // নাম
      const name = this.cleanProductName(
        $('h1.title, h1.product-name, .product-title, .product-detail-name').first().text()
      );

      // ছবি – meta og:image থেকে (সবচেয়ে নির্ভরযোগ্য), না পেলে .dsn__main-image-container img
      const image = $('meta[property="og:image"]').attr('content') ||
                    $('.dsn__main-image-container img').attr('src') ||
                    $('.product-image img, .gallery img').first().attr('src');

      // দাম – h2[color="#1B5DD5"][font-size="24"] সিলেক্টর, অথবা অন্য সাধারণ সিলেক্টর
      const price = this.parsePrice(
        $('h2[color="#1B5DD5"][font-size="24"]').first().text() ||
        $('.product-price .price, .special-price .price, .price-box .price').first().text()
      );

      // পুরনো দাম
      const originalPrice = this.parsePrice(
        $('.old-price .price, .regular-price .price, .price-box .old-price').text()
      );

      // স্টক
      const inStock = !$('body').text().includes('Out of Stock');

      // রেটিং ও রিভিউ
      let rating = null;
      let reviewCount = null;
      const ratingDiv = $('.add-rating .rating-div span').first().text();
      if (ratingDiv) rating = parseFloat(ratingDiv);
      const reviewText = $('.add-rating h2[font-size="14"]').first().text();
      if (reviewText) reviewCount = parseInt(reviewText.replace(/[()]/g, '')) || null;

      if (!name) return null;

      return {
        name,
        price,
        originalPrice: originalPrice || price,
        image,
        url,
        marketplace: this.marketplace,   // 'Pickaboo'
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
