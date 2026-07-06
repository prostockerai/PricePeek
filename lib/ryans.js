// lib/ryans.js
const BaseScraper = require('./baseScraper');

class RyansScraper extends BaseScraper {
  constructor() {
    super('Ryans', 'https://www.ryanscomputers.com');
  }

  async search(query) {
    const products = [];
    try {
      const url = `${this.baseUrl}/search?search=${encodeURIComponent(query)}`;
      const html = await this.fetchPage(url);
      if (!html) return products;
      const $ = this.loadHTML(html);

      // Ryans product card selectors
      $('.product-card, .product-item, .category-product, .product-box').each((i, el) => {
        if (i >= 15) return false;
        try {
          const $el = $(el);

          // নাম
          const name = this.cleanProductName(
            $el.find('.product-title, .card-title, h2 a, .product-name a, .name').text()
          );

          // বর্তমান মূল্য
          const price = this.parsePrice(
            $el.find('.product-price, .price, .prc, .special-price').first().text()
          );

          // পুরনো মূল্য (ছাড় থাকলে)
          const originalPrice = this.parsePrice(
            $el.find('.old-price, .regular-price').text()
          );

          // ছবি
          const image = $el.find('img').attr('src') || $el.find('img').attr('data-src');

          // লিংক
          const link = $el.find('a').first().attr('href') || '';
          const fullUrl = link.startsWith('http') ? link : this.baseUrl + link;

          // স্টক অবস্থা
          const inStock = !$el.text().includes('Stock Out') &&
                         !$el.text().includes('Out of Stock') &&
                         !$el.find('.out-of-stock').length;

          // রেটিং/রিভিউ (Ryans-এ সাধারণত থাকে না, তাই null)
          const rating = null;
          const reviewCount = null;
          const soldCount = null;

          if (name && price) {
            products.push({
              id: `ryans_${Date.now()}_${i}`,
              name,
              marketplace: this.marketplace,
              price,
              originalPrice: originalPrice || price,
              discount: this.parseDiscount(price, originalPrice),
              image,
              url: fullUrl,
              inStock,
              isOfficial: true,
              rating,
              reviewCount,
              soldCount,
              coupons: [],
              cashback: [],
            });
          }
        } catch (e) {}
      });
    } catch (err) {
      console.error('[Ryans] search error:', err.message);
    }
    return products;
  }

  async getProductFromUrl(url) {
    try {
      const html = await this.fetchPage(url);
      if (!html) return null;
      const $ = this.loadHTML(html);

      const name = this.cleanProductName(
        $('h1.product-title, .product-name, .product-info h1').first().text()
      );
      const price = this.parsePrice(
        $('.product-price, .price, .special-price').first().text()
      );
      const originalPrice = this.parsePrice(
        $('.old-price, .regular-price').text()
      );
      const image = $('.product-image img, .main-image img').first().attr('src');
      const inStock = !$('.product-stock, .stock-status').text().includes('Out of Stock');

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
      console.error('[Ryans] getProductFromUrl error:', err.message);
      return null;
    }
  }
}

module.exports = RyansScraper;
