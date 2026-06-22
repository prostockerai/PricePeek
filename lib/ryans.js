const BaseScraper = require('./baseScraper');

class RyansScraper extends BaseScraper {
  constructor() { super('Ryans', 'https://www.ryanscomputers.com'); }

  async search(query) {
    const products = [];
    try {
      const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;
      const html = await this.fetchPage(url);
      if (!html) return products;
      const $ = this.loadHTML(html);

      $('.product-card, .product-item').each((i, el) => {
        if (i >= 10) return false;
        try {
          const $el = $(el);
          const name = this.cleanProductName($el.find('.product-title, .card-title, h2 a').text());
          const price = this.parsePrice($el.find('.product-price, .price').first().text());
          const originalPrice = this.parsePrice($el.find('.old-price').text());
          const image = $el.find('img').attr('src');
          const link = $el.find('a').first().attr('href') || '';
          const fullUrl = link.startsWith('http') ? link : this.baseUrl + link;
          const inStock = !$el.text().includes('Stock Out');

          if (name && price) {
            products.push({
              id: `ryans_${Date.now()}_${i}`,
              name, marketplace: this.marketplace, price,
              originalPrice: originalPrice || price,
              discount: this.parseDiscount(price, originalPrice),
              image, url: fullUrl, inStock,
              isOfficial: true, coupons: this.getCoupons(price),
              cashback: this.getCashback(),
            });
          }
        } catch (e) {}
      });
    } catch (err) { console.error('[Ryans]', err.message); }
    return products;
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
