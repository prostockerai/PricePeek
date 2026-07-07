// lib/rokomari.js
const BaseScraper = require('./baseScraper');

class RokomariScraper extends BaseScraper {
  constructor() {
    super('Rokomari', 'https://www.rokomari.com');
  }

  async search(query) {
    const products = [];
    try {
      // Rokomari-র সার্চ URL (প্রকৃতপক্ষে /search?q=...)
      const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;
      console.log(`[Rokomari] Fetching: ${url}`);
      const html = await this.fetchPage(url);
      if (!html) return products;
      const $ = this.loadHTML(html);

      // বর্তমান ডিজাইনে প্রোডাক্ট কার্ডগুলো .book-list-wrapper-এর ভিতরে .book-card
      $('.book-list-wrapper .book-card, .product-list .product-item, .search-result-item').each((i, el) => {
        if (i >= 15) return false;
        try {
          const $el = $(el);

          // নাম
          const name = this.cleanProductName(
            $el.find('.book-title, .product-name, .title, h3 a').first().text()
          );

          // বর্তমান দাম (প্রায়ই <span class="current-price"> বা <div class="price">-এ থাকে)
          const price = this.parsePrice(
            $el.find('.book-price .current-price, .price .new-price, .product-price, .price').first().text()
          );

          // পুরনো দাম
          const originalPrice = this.parsePrice(
            $el.find('.book-price .old-price, .price .regular-price, .original-price').text()
          );

          // ছবি
          const image = $el.find('img').attr('src') || $el.find('img').attr('data-src');

          // লিংক
          const link = $el.find('a').first().attr('href') || '';
          const fullUrl = link.startsWith('http') ? link : this.baseUrl + link;

          // স্টক
          const inStock = !$el.text().includes('Out of Stock');

          if (name && price) {
            products.push({
              id: `rokomari_${Date.now()}_${i}`,
              name,
              marketplace: this.marketplace,
              price,
              originalPrice: originalPrice || price,
              discount: this.parseDiscount(price, originalPrice),
              image,
              url: fullUrl,
              inStock,
              isOfficial: false,
              rating: null,
              reviewCount: null,
              soldCount: null,
              coupons: [],
              cashback: [],
            });
          }
        } catch (e) {}
      });

      console.log(`[Rokomari] Found ${products.length} products`);
    } catch (err) {
      console.error('[Rokomari] search error:', err.message);
    }
    return products;
  }

  async getProductFromUrl(url) {
    try {
      const html = await this.fetchPage(url);
      if (!html) return null;
      const $ = this.loadHTML(html);

      const name = this.cleanProductName(
        $('h1.product-title, .product-name, .book-title').first().text()
      );
      const price = this.parsePrice(
        $('.product-price .current-price, .price .new-price, .price').first().text()
      );
      const originalPrice = this.parsePrice(
        $('.product-price .old-price, .price .regular-price').text()
      );
      const image = $('.product-image img, .book-image img').first().attr('src');
      const inStock = !$('body').text().includes('Out of Stock');

      return {
        name,
        price,
        originalPrice: originalPrice || price,
        image,
        url,
        marketplace: this.marketplace,
        inStock,
      };
    } catch (err) {
      console.error('[Rokomari] getProductFromUrl error:', err.message);
      return null;
    }
  }
}

module.exports = RokomariScraper;
