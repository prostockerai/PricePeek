// lib/ryans.js
const BaseScraper = require('./baseScraper');

class RyansScraper extends BaseScraper {
  constructor() {
    super('Ryans', 'https://www.ryanscomputers.com');
  }

  async search(query) {
    const products = [];
    try {
      // Ryans এর সার্চ URL (কখনো /search?q= , কখনো /search?search= কাজ করে)
      const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;
      console.log(`[Ryans] Fetching: ${url}`);
      const html = await this.fetchPage(url);

      if (!html) {
        console.log('[Ryans] HTML fetch failed — trying alternative URL');
        const altUrl = `${this.baseUrl}/search?search=${encodeURIComponent(query)}`;
        const altHtml = await this.fetchPage(altUrl);
        if (!altHtml) return products;
        return this.parseHTML(altHtml);
      }

      return this.parseHTML(html);
    } catch (err) {
      console.error('[Ryans] search error:', err.message);
    }
    return products;
  }

  parseHTML(html) {
    const products = [];
    const $ = this.loadHTML(html);

    // Ryans product card selectors (আরও বাড়ানো)
    const selectors = [
      '.product-card',
      '.product-item',
      '.category-product',
      '.product-box',
      '.product-layout',
      '.card-body'
    ];

    for (const sel of selectors) {
      $(sel).each((i, el) => {
        if (i >= 15) return false;
        try {
          const $el = $(el);

          const name = this.cleanProductName(
            $el.find('.product-title, .card-title, h2 a, .product-name a, .name, .p-item-name a').text()
          );

          const price = this.parsePrice(
            $el.find('.product-price, .price, .prc, .special-price, .p-item-price span').first().text()
          );

          const originalPrice = this.parsePrice(
            $el.find('.old-price, .regular-price, .price-old').text()
          );

          const image = $el.find('img').attr('src') || $el.find('img').attr('data-src');

          const link = $el.find('a').first().attr('href') || '';
          const fullUrl = link.startsWith('http') ? link : this.baseUrl + link;

          const inStock = !$el.text().includes('Stock Out') &&
                         !$el.text().includes('Out of Stock') &&
                         !$el.find('.out-of-stock').length;

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
              rating: null,
              reviewCount: null,
              soldCount: null,
              coupons: [],
              cashback: [],
            });
          }
        } catch (e) {}
      });
      if (products.length > 0) break;  // সিলেক্টর কাজ করলে আর চেক করার দরকার নেই
    }

    console.log(`[Ryans] Found ${products.length} products`);
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
