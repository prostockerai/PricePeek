const BaseScraper = require('./baseScraper');

class DarazScraper extends BaseScraper {
  constructor() { super('Daraz', 'https://www.daraz.com.bd'); }

  async search(query) {
    const products = [];
    try {
      const url = `${this.baseUrl}/catalog/?q=${encodeURIComponent(query)}`;
      const html = await this.fetchPage(url);
      if (!html) return products;
      const $ = this.loadHTML(html);

      $('[data-qa-locator="product-item"], .Bm3ON, .gridItem--Yd0sa, .buTCk').each((i, el) => {
        if (i >= 15) return false;
        try {
          const $el = $(el);
          const name = this.cleanProductName(
            $el.find('.title--wFj93, .RfADt a, .title-wrapper--IaQ0m a').text()
          );
          const price = this.parsePrice($el.find('.price--NVB62, .ooOxS, .price-wrapper--Ii6aY').text());
          const originalPrice = this.parsePrice($el.find('.originalPrice--aY4fQ, .crossPrice').text());
          const image = $el.find('img').attr('src') || $el.find('img').attr('data-src');
          const link = $el.find('a').attr('href') || '';
          const fullUrl = link.startsWith('http') ? link : this.baseUrl + link;

          if (name && price) {
            products.push({
              id: `daraz_${Date.now()}_${i}`,
              name, marketplace: this.marketplace, price,
              originalPrice: originalPrice || price,
              discount: this.parseDiscount(price, originalPrice),
              image, url: fullUrl, inStock: true,
              isOfficial: $el.text().includes('Mall'),
              coupons: this.getCoupons(price),
              cashback: this.getCashback(),
            });
          }
        } catch (e) {}
      });
    } catch (err) { console.error('[Daraz]', err.message); }
    return products;
  }

  getCoupons(price) {
    const coupons = [];
    if (price > 10000) coupons.push({ code: 'BDSALE500', discount: 500, type: 'fixed' });
    if (price > 5000) coupons.push({ code: 'SAVE200', discount: 200, type: 'fixed' });
    return coupons;
  }
  getCashback() {
    return [{ provider: 'bKash', percentage: 10, maxAmount: 500 }];
  }
}

module.exports = DarazScraper;
