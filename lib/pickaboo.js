// lib/pickaboo.js
const BaseScraper = require('./baseScraper');

class PickabooScraper extends BaseScraper {
  constructor() {
    super('Pickaboo', 'https://www.pickaboo.com');
  }

  async search(query) {
    const products = [];
    try {
      const url = `${this.baseUrl}/catalogsearch/result/?q=${encodeURIComponent(query)}`;
      console.log(`[Pickaboo] Fetching: ${url}`);
      const html = await this.fetchPage(url);
      if (!html) return products;
      const $ = this.loadHTML(html);

      // Pickaboo-র প্রোডাক্ট কার্ড সিলেক্টর (সাধারণত এগুলো)
      $('.product-item, .product, .item-box, .product-card').each((i, el) => {
        if (i >= 15) return false;
        try {
          const $el = $(el);

          // নাম
          const name = this.cleanProductName(
            $el.find('.product-name, .name, h3, .product-title').text()
          );

          // বর্তমান মূল্য
          const price = this.parsePrice(
            $el.find('.product-price, .price, .special-price, .price-box .price').first().text()
          );

          // পুরনো মূল্য (ছাড় থাকলে)
          const originalPrice = this.parsePrice(
            $el.find('.old-price, .regular-price, .price-box .old-price').text()
          );

          // ছবি
          const image = $el.find('img').attr('src') || $el.find('img').attr('data-src');

          // লিংক
          const link = $el.find('a').first().attr('href') || '';
          const fullUrl = link.startsWith('http') ? link : this.baseUrl + link;

          // স্টক
          const inStock = !$el.text().includes('Out of Stock') &&
                         !$el.find('.out-of-stock, .sold-out').length;

          // রেটিং/রিভিউ (Pickaboo-তে সাধারণত থাকে না)
          const rating = null;
          const reviewCount = null;
          const soldCount = null;

          if (name && price) {
            products.push({
              id: `pickaboo_${Date.now()}_${i}`,
              name,
              marketplace: this.marketplace,
              price,
              originalPrice: originalPrice || price,
              discount: this.parseDiscount(price, originalPrice),
              image,
              url: fullUrl,
              inStock,
              isOfficial: false,
              rating,
              reviewCount,
              soldCount,
              coupons: [],
              cashback: [],
            });
          }
        } catch (e) {}
      });

      console.log(`[Pickaboo] Found ${products.length} products`);
    } catch (err) {
      console.error('[Pickaboo] search error:', err.message);
    }
    return products;
  }

  async getProductFromUrl(url) {
    try {
      const html = await this.fetchPage(url);
      if (!html) return null;
      const $ = this.loadHTML(html);

      const name = this.cleanProductName(
        $('h1.product-name, .product-title, .name').first().text()
      );
      const price = this.parsePrice(
        $('.product-price, .special-price, .price-box .price').first().text()
      );
      const originalPrice = this.parsePrice(
        $('.old-price, .regular-price').text()
      );
      const image = $('.product-image img, .gallery img').first().attr('src');
      const inStock = !$('.stock-status').text().includes('Out of Stock');

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
      console.error('[Pickaboo] getProductFromUrl error:', err.message);
      return null;
    }
  }
}

module.exports = PickabooScraper;
