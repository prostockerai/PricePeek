// lib/pickaboo.js
const BaseScraper = require('./baseScraper');

class PickabooScraper extends BaseScraper {
  constructor() {
    super('Pickaboo', 'https://www.pickaboo.com');
  }

  async search(query) {
    const products = [];
    try {
      // নতুন সার্চ URL (তোমার দেওয়া)
      const url = `${this.baseUrl}/search-result/${encodeURIComponent(query)}`;
      console.log(`[Pickaboo] Fetching: ${url}`);
      const html = await this.fetchPage(url);
      if (!html) return products;
      const $ = this.loadHTML(html);

      // Pickaboo-র প্রোডাক্ট কার্ড সিলেক্টর (নতুন + পুরনো)
      const selectors = [
        '.product-item',
        '.product',
        '.product__card',
        '.product-card',
        '.item-box',
        '.product-layout',
        '.c-product-card',
        '.search-result__product',
        '.product-box'
      ];

      for (const sel of selectors) {
        $(sel).each((i, el) => {
          if (i >= 15) return false;
          try {
            const $el = $(el);

            const name = this.cleanProductName(
              $el.find('.product-name, .name, h3, .product-title, .product-item-name, .product__title').text()
            );

            const price = this.parsePrice(
              $el.find('.product-price, .price, .special-price, .price-box .price, .product__price').first().text()
            );

            const originalPrice = this.parsePrice(
              $el.find('.old-price, .regular-price, .price-box .old-price').text()
            );

            const image = $el.find('img').attr('src') || $el.find('img').attr('data-src');

            const link = $el.find('a').first().attr('href') || '';
            const fullUrl = link.startsWith('http') ? link : this.baseUrl + link;

            const inStock = !$el.text().includes('Out of Stock') &&
                           !$el.find('.out-of-stock, .sold-out').length;

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
                rating: null,
                reviewCount: null,
                soldCount: null,
                coupons: [],
                cashback: [],
              });
            }
          } catch (e) {}
        });
        if (products.length > 0) break;
      }

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
        $('h1.product-name, .product-title, .product-detail-name, .product-info__title').first().text()
      );
      const price = this.parsePrice(
        $('.product-price, .special-price, .price-box .price, .product-info__price').first().text()
      );
      const originalPrice = this.parsePrice(
        $('.old-price, .regular-price, .price-box .old-price').text()
      );
      const image = $('.product-image img, .gallery img, .product-detail-image img').first().attr('src');
      const inStock = !$('.stock-status, .product-info__stock').text().includes('Out of Stock');

      if (!name) return null;

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
