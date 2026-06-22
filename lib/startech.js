const BaseScraper = require('./baseScraper');

class StarTechScraper extends BaseScraper {
  constructor() { super('StarTech', 'https://www.startech.com.bd'); }

  async search(query) {
    const products = [];
    try {
      const url = `${this.baseUrl}/product/search?search=${encodeURIComponent(query)}`;
      const html = await this.fetchPage(url);
      if (!html) return products;
      const $ = this.loadHTML(html);

      $('.product-thumb, .product-layout').each((i, el) => {
        if (i >= 10) return false;
        try {
          const $el = $(el);
          const name = this.cleanProductName($el.find('.p-item-name a, .product-name a').text());
          const price = this.parsePrice($el.find('.p-item-price span, .price-new').first().text());
          const originalPrice = this.parsePrice($el.find('.price-old').text());
          const image = $el.find('img').attr('src');
          const link = $el.find('a').first().attr('href') || '';
          const fullUrl = link.startsWith('http') ? link : this.baseUrl + link;
          const inStock = !$el.text().includes('Out of Stock');

          if (name && price) {
            products.push({
              id: `startech_${Date.now()}_${i}`,
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
    } catch (err) { console.error('[StarTech]', err.message); }
    return products;
  }

  getCoupons(price) {
    const coupons = [];
    if (price > 50000) coupons.push({ code: 'STARTECH5000', discount: 5000, type: 'fixed' });
    return coupons;
  }
  getCashback() {
    return [{ provider: 'Visa', percentage: 5, maxAmount: 1000 }];
  }
}

module.exports = StarTechScraper;
