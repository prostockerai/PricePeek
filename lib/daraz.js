const BaseScraper = require('./baseScraper');
const axios = require('axios'); // অতিরিক্ত axios ইম্পোর্ট

class DarazScraper extends BaseScraper {
  constructor() { super('Daraz', 'https://www.daraz.com.bd'); }

  async search(query) {
    // প্রথমে JSON API চেষ্টা করি (দ্রুত ও নির্ভরযোগ্য)
    try {
      const jsonUrl = `${this.baseUrl}/catalog/?ajax=true&q=${encodeURIComponent(query)}`;
      console.log(`[Daraz] Trying JSON API: ${jsonUrl}`);
      const response = await axios.get(jsonUrl, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
        },
        timeout: 10000,
      });
      const data = response.data;
      if (data && data.mods && data.mods.listItems) {
        const products = [];
        data.mods.listItems.forEach((item, i) => {
          if (i >= 15) return;
          const name = item.name || '';
          const price = this.parsePrice(item.priceShow || item.price);
          const originalPrice = this.parsePrice(item.originalPriceShow || item.originalPrice);
          const image = item.image || '';
          const url = item.productUrl || (item.itemUrl ? this.baseUrl + item.itemUrl : '');
          if (name && price) {
            products.push({
              id: `daraz_json_${item.itemId || i}`,
              name: this.cleanProductName(name),
              marketplace: this.marketplace,
              price,
              originalPrice: originalPrice || price,
              discount: this.parseDiscount(price, originalPrice),
              image,
              url,
              inStock: true,
              isOfficial: item.sellerName && item.sellerName.toLowerCase().includes('official'),
              coupons: this.getCoupons(price),
              cashback: this.getCashback(),
            });
          }
        });
        if (products.length > 0) return products;
      }
    } catch (err) {
      console.log('[Daraz] JSON API failed, trying HTML fallback');
    }

    // JSON ব্যর্থ হলে HTML স্ক্র‍্যাপিং
    return await this.searchViaHTML(query);
  }

  async searchViaHTML(query) {
    const products = [];
    try {
      const url = `${this.baseUrl}/catalog/?q=${encodeURIComponent(query)}`;
      const html = await this.fetchPage(url);
      if (!html) return products;
      const $ = this.loadHTML(html);

      // পুরোনো + নতুন সব সিলেক্টর
      const selectors = [
        '[data-qa-locator="product-item"]',
        '.Bm3ON',
        '.gridItem--Yd0sa',
        '.buTCk',
        '.RfADt',
        '.c2prKC',   // নতুন ক্লাস (প্রায়ই বদলায়)
        '.product-card'
      ];
      
      for (const selector of selectors) {
        $(selector).each((i, el) => {
          if (i >= 15) return false;
          try {
            const $el = $(el);
            const name = this.cleanProductName(
              $el.find('.title--wFj93, .RfADt a, .title-wrapper--IaQ0m a, .c16H9d a').text()
            );
            const price = this.parsePrice(
              $el.find('.price--NVB62, .ooOxS, .price-wrapper--Ii6aY, .c13VH6').text()
            );
            const originalPrice = this.parsePrice(
              $el.find('.originalPrice--aY4fQ, .crossPrice').text()
            );
            const image = $el.find('img').attr('src') || $el.find('img').attr('data-src');
            const link = $el.find('a').attr('href') || '';
            const fullUrl = link.startsWith('http') ? link : this.baseUrl + link;

            if (name && price) {
              products.push({
                id: `daraz_html_${Date.now()}_${i}`,
                name,
                marketplace: this.marketplace,
                price,
                originalPrice: originalPrice || price,
                discount: this.parseDiscount(price, originalPrice),
                image,
                url: fullUrl,
                inStock: true,
                isOfficial: $el.text().includes('Mall'),
                coupons: this.getCoupons(price),
                cashback: this.getCashback(),
              });
            }
          } catch (e) {}
        });
        if (products.length > 0) break; // কোনো একটাতে পেয়ে গেলে লুপ থামাও
      }
    } catch (err) { console.error('[Daraz] HTML fallback error:', err.message); }
    return products;
  }

  // getCoupons, getCashback আগের মতো
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
