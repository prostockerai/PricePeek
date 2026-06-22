const BaseScraper = require('./baseScraper');

class PickabooScraper extends BaseScraper {
  constructor() { super('Pickaboo', 'https://www.pickaboo.com'); }

  async search(query) {
    const products = [];
    try {
      const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;
      const html = await this.fetchPage(url);
      if (!html) return products;
      const $ = this.loadHTML(html);

      $('.product-item, .product').each((i, el) => {
        if (i >= 10) return false;
        try {
          const $el = $(el);
          const name = this.cleanProductName($el.find('.product-name, .name, h3').text());
          const price = this.parsePrice($el.find('.product-price, .price').first().text());
          const originalPrice = this.parsePrice($el.find('.old-price').text());
          const image = $el.find('img').attr('src');
          const link = $el.find('a').first().attr('href') || '';
          const fullUrl = link.startsWith('http') ? link : this.baseUrl + link;
          const inStock = !$el.text().includes('Out of Stock');

          if (name && price) {
            products.push({
              id: `pickaboo_${Date.now()}_${i}`,
              name, marketplace: this.marketplace, price,
              originalPrice: originalPrice || price,
              discount: this.parseDiscount(price, originalPrice),
              image, url: fullUrl, inStock,
              isOfficial: false, coupons: this.getCoupons(price),
              cashback: this.getCashback(),
            });
          }
        } catch (e) {}
      });
    } catch (err) { console.error('[Pickaboo]', err.message); }
    return products;
  }

  getCoupons(price) {
    const coupons = [];
    if (price > 5000) coupons.push({ code: 'PICKA500', discount: 500, type: 'fixed' });
    return coupons;
  }
  getCashback() {
    return [{ provider: 'Nagad', percentage: 15, maxAmount: 300 }];
  }
}

module.exports = PickabooScraper;
