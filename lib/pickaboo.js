// lib/pickaboo.js
const BaseScraper = require('./baseScraper');

class PickabooScraper extends BaseScraper {
  constructor() {
    super('Pickaboo', 'https://www.pickaboo.com');
  }

  async search(query) {
    const products = [];
    // Pickaboo-তে দুটি সাধারণ সার্চ URL
    const urlsToTry = [
      `${this.baseUrl}/catalogsearch/result/?q=${encodeURIComponent(query)}`,
      `${this.baseUrl}/search?q=${encodeURIComponent(query)}`,
    ];

    for (const url of urlsToTry) {
      try {
        console.log(`[Pickaboo] Trying URL: ${url}`);
        const html = await this.fetchPage(url);
        if (!html) continue;
        const $ = this.loadHTML(html);

        // সম্ভাব্য প্রোডাক্ট কার্ড সিলেক্টর
        const selectors = [
          '.product-item',
          '.product',
          '.item-box',
          '.product-card',
          '.product__card',
          '.product-layout',
          '.c-product-card'
        ];

        let found = false;
        for (const sel of selectors) {
          $(sel).each((i, el) => {
            if (i >= 15) return false;
            try {
              const $el = $(el);
              const name = this.cleanProductName(
                $el.find('.product-name, .name, h3, .product-title').text()
              );
              const price = this.parsePrice(
                $el.find('.product-price, .price, .special-price, .price-box .price').first().text()
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
          if (products.length > 0) {
            found = true;
            break;
          }
        }
        if (found) {
          console.log(`[Pickaboo] Found ${products.length} products using ${url}`);
          break;
        }
      } catch (err) {
        console.error(`[Pickaboo] Error with URL ${url}:`, err.message);
      }
    }

    if (products.length === 0) {
      console.log('[Pickaboo] No products found');
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
