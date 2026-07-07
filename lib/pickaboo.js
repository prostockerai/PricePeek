// lib/pickaboo.js
const BaseScraper = require('./baseScraper');

class PickabooScraper extends BaseScraper {
  constructor() {
    super('Pickaboo', 'https://www.pickaboo.com');
  }

  async search(query) {
    const products = [];
    const urlsToTry = [
      `${this.baseUrl}/catalogsearch/result/?q=${encodeURIComponent(query)}`,
      `${this.baseUrl}/search?q=${encodeURIComponent(query)}`,
    ];

    for (const url of urlsToTry) {
      try {
        console.log(`[Pickaboo] Searching: ${url}`);
        const html = await this.fetchPage(url);
        if (!html) continue;
        const $ = this.loadHTML(html);

        // Pickaboo-র নতুন/পুরনো সব সম্ভাব্য সিলেক্টর
        const selectors = [
          '.product-item',
          '.product',
          '.product__card',
          '.product-card',
          '.item-box',
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
                $el.find('.product-name, .name, h3, .product-title, .product-item-name').text()
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
          console.log(`[Pickaboo] Found ${products.length} products via ${url}`);
          break;
        }
      } catch (err) {
        console.error(`[Pickaboo] Error with ${url}:`, err.message);
      }
    }

    if (products.length === 0) console.log('[Pickaboo] No products found');
    return products;
  }

  async getProductFromUrl(url) {
    try {
      const html = await this.fetchPage(url);
      if (!html) return null;
      const $ = this.loadHTML(html);

      // Pickaboo পণ্য পাতা থেকে তথ্য বের করা (নতুন ডিজাইনের জন্য)
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

      if (!name) return null; // নাম না পেলে কিছুই করা যাবে না

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
