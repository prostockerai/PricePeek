// lib/pickaboo.js
const BaseScraper = require('./baseScraper');

class PickabooScraper extends BaseScraper {
  constructor() {
    super('Pickaboo', 'https://www.pickaboo.com');
  }

  // সাধারণ সার্চ (কীওয়ার্ড দিয়ে) – Pickaboo ক্লায়েন্ট-রেন্ডার করায় কাজ নাও করতে পারে
  async search(query) {
    const products = [];
    try {
      // Pickaboo-র নতুন সার্চ URL (তবে এটি জাভাস্ক্রিপ্ট দিয়ে লোড হয়)
      const url = `${this.baseUrl}/search-result/${encodeURIComponent(query)}`;
      console.log(`[Pickaboo] Fetching: ${url}`);
      const html = await this.fetchPage(url);
      if (!html) return products;
      const $ = this.loadHTML(html);

      // সম্ভাব্য সিলেক্টর (বর্তমানে ক্লায়েন্ট-রেন্ডার হওয়ায় সাধারণত খালি আসবে)
      $('.product-item, .product, .product__card, .product-card, .item-box, .product-layout').each((i, el) => {
        if (i >= 15) return false;
        // ... (পূর্বের মতো)
      });
      console.log(`[Pickaboo] Keyword search found ${products.length} products`);
    } catch (err) {
      console.error('[Pickaboo] search error:', err.message);
    }
    return products;
  }

  // ইউজার কোনো Pickaboo পণ্যের URL দিলে সম্পূর্ণ তথ্য বের করা
  async getProductFromUrl(url) {
    try {
      const html = await this.fetchPage(url);
      if (!html) return null;
      const $ = this.loadHTML(html);

      // ১. পণ্যের নাম – h1.title থেকে (তোমার দেওয়া HTML অনুযায়ী)
      const name = this.cleanProductName(
        $('h1.title, h1.product-name, .product-title, .product-detail-name').first().text()
      );

      // ২. বর্তমান মূল্য – যে h2-এর color="#1B5DD5" এবং font-size="24" (একাধিক হতে পারে, প্রথমটি নেব)
      const price = this.parsePrice(
        $('h2[color="#1B5DD5"][font-size="24"]').first().text() ||
        $('.product-price .price, .special-price .price, .price-box .price').first().text()
      );

      // ৩. পুরনো মূল্য (থাকলে)
      const originalPrice = this.parsePrice(
        $('.old-price .price, .regular-price .price, .price-box .old-price').text()
      );

      // ৪. ছবি – প্রধান ইমেজ
      const image = $('.dsn__main-image-container img').attr('src') ||
                    $('.product-image img, .gallery img').first().attr('src');

      // ৫. স্টক – "Out of Stock" টেক্সট না থাকলে স্টকে আছে
      const inStock = !$('body').text().includes('Out of Stock');

      // ৬. রেটিং ও রিভিউ (যদি থাকে)
      let rating = null;
      let reviewCount = null;
      const ratingDiv = $('.add-rating .rating-div span').first().text(); // "4.6"
      if (ratingDiv) {
        rating = parseFloat(ratingDiv);
      }
      const reviewText = $('.add-rating h2[font-size="14"]').first().text(); // "(21)"
      if (reviewText) {
        reviewCount = parseInt(reviewText.replace(/[()]/g, '')) || null;
      }

      if (!name) return null; // নাম না পেলে ফিরিয়ে দাও

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
