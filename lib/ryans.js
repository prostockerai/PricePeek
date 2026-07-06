// lib/ryans.js
const BaseScraper = require('./baseScraper');

class RyansScraper extends BaseScraper {
  constructor() {
    super('Ryans', 'https://www.ryans.com');
  }

  async search(query) {
    const products = [];
    try {
      const url = `${this.baseUrl}/search?search=${encodeURIComponent(query)}`;
      console.log(`[Ryans] Fetching: ${url}`);
      const html = await this.fetchPage(url);
      if (!html) return products;

      const $ = this.loadHTML(html);

      // প্রতিটি প্রোডাক্ট কার্ড (তোমার পাঠানো HTML অনুযায়ী)
      $('.category-single-product').each((i, el) => {
        if (i >= 15) return false;
        try {
          const $card = $(el);

          // ১. নাম
          const name = this.cleanProductName(
            $card.find('h4.product-title a').text()
          );

          // ২. বর্তমান (স্পেশাল) দাম
          const price = this.parsePrice(
            $card.find('.pr-text.cat-sp-text').text()
          );

          // ৩. পুরনো (রেগুলার) দাম – মোডাল থেকে নেওয়া (যেখানে সম্ভব)
          let originalPrice = null;
          // প্রোডাক্ট আইডি বের করা (মোডালের জন্য)
          const modalId = $card.find('.modal.product_view').attr('id') || '';
          if (modalId) {
            const $modal = $(`#${modalId}`);
            const regularPriceText = $modal.find('.new-reg-text').text();
            originalPrice = this.parsePrice(regularPriceText);
          }
          if (!originalPrice) {
            // মোডাল না পেলে “Save Tk XX” থেকে বের করার চেষ্টা
            const saveText = $card.find('.fs-text').text(); // "Save Tk 50 on online order"
            const saveAmount = this.parsePrice(saveText);
            if (saveAmount && price) {
              originalPrice = price + saveAmount;
            }
          }

          // ৪. ছবি
          const image = $card.find('.image-box img').attr('src') || $card.find('.card-img-top').attr('src');

          // ৫. লিংক
          const link = $card.find('.image-box a').attr('href') || $card.find('h4.product-title a').attr('href') || '';
          const fullUrl = link.startsWith('http') ? link : this.baseUrl + link;

          // ৬. স্টক (কার্ডে “Out of Stock” লেখা না থাকলে স্টকে আছে)
          const inStock = !$card.text().includes('Out of Stock');

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
        } catch (e) {
          console.warn('[Ryans] Product parse error:', e.message);
        }
      });

      console.log(`[Ryans] Found ${products.length} products`);
    } catch (err) {
      console.error('[Ryans] search error:', err.message);
    }
    return products;
  }

  async getProductFromUrl(url) {
    // পূর্বের মতো (ইমপ্লিমেন্ট থাকলে, না থাকলে null)
    return null;
  }
}

module.exports = RyansScraper;
