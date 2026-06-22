const BaseScraper = require('./baseScraper');

class RyansScraper extends BaseScraper {
  constructor() {
    super('Ryans', 'https://www.ryanscomputers.com');
  }

  async search(query) {
    const products = [];
    try {
      const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;
      const html = await this.fetchPage(url);
      if (!html) return products;
      const $ = this.loadHTML(html);

      $('.product-card, .product-item').each((i, el) => {
        if (i >= 15) return false;
        try {
          const $el = $(el);
          const name = this.cleanProductName($el.find('.product-title, .card-title, h2 a').text());
          const price = this.parsePrice($el.find('.product-price, .price, .prc').first().text());
          const originalPrice = this.parsePrice($el.find('.old-price').text());
          const image = $el.find('img').attr('src');
          const link = $el.find('a').first().attr('href') || '';
          const fullUrl = link.startsWith('http') ? link : this.baseUrl + link;
          const inStock = !$el.text().includes('Stock Out');

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
              coupons: this.getCoupons(price),
              cashback: this.getCashback(),
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
      const name = this.cleanProductName($('h1.product-title, .product-name').first().text());
      const price = this.parsePrice($('.product-price, .price, .special-price').text());
      const originalPrice = this.parsePrice($('.old-price, .regular-price').text());
      const image = $('.product-image img, .main-image img').attr('src');
      return { name, price, originalPrice, image, url, marketplace: this.marketplace };
    } catch (e) {
      return null;
    }
  }

  getCoupons(price) {
    const coupons = [];
    if (price > 10000) coupons.push({ code: 'RYANS1000', discount: 1000, type: 'fixed' });
    return coupons;
  }

  getCashback() {
    return [{ provider: 'bKash', percentage: 10, maxAmount: 300 }];
  }
}

module.exports = RyansScraper;
