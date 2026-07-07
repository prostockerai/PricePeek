// lib/pickaboo.js (সম্পূর্ণ ফাইনাল)
const BaseScraper = require('./baseScraper');

class PickabooScraper extends BaseScraper {
  constructor() {
    super('Pickaboo', 'https://www.pickaboo.com');
  }

  // কীওয়ার্ড সার্চ কাজ করে না (ক্লায়েন্ট-রেন্ডারিং)
  async search(query) {
    return [];
  }

  async getProductFromUrl(url) {
    try {
      const html = await this.fetchPage(url);
      if (!html) return null;
      const $ = this.loadHTML(html);

      // ---------------------- নাম ----------------------
      // প্রথমে h1.title (সাধারণত পরিষ্কার নাম থাকে)
      let rawName = $('h1.title, h1.product-name, .product-title').first().text().trim();
      // যদি h1 না পাওয়া যায় বা তাতে "Buy..." থাকে, তাহলে মেটা ট্যাগ থেকে নেওয়া
      if (!rawName || /buy\s+/i.test(rawName)) {
        rawName = $('meta[property="og:title"]').attr('content') || rawName;
      }

      // "Buy ... at Best Price in BD" মুছে ফেলা
      rawName = rawName
        .replace(/^buy\s+/i, '')                          // শুরুর "Buy " সরানো
        .replace(/\s+at\s+best\s+price\s+in\s+BD\s*$/i, '') // শেষের "at Best Price in BD" সরানো
        .replace(/\s*\|\s*Pickaboo\s*$/i, '')             // "| Pickaboo" সরানো
        .trim();

      const name = this.cleanProductName(rawName);
      if (!name || name.length < 2) {
        console.error('[Pickaboo] Could not extract a valid product name');
        return null;
      }

      // ---------------------- ছবি ----------------------
      const image = $('meta[property="og:image"]').attr('content') ||
                    $('.dsn__main-image-container img').attr('src') ||
                    $('.product-image img').first().attr('src');

      // ---------------------- দাম ----------------------
      let price = null;
      // প্রথমে price-view কন্টেইনারের ভিতর থেকে নির্দিষ্ট স্টাইলের h2 খোঁজা
      $('.price-view h2').each((i, el) => {
        const $el = $(el);
        const color = $el.attr('color');
        const fontSize = $el.attr('font-size');
        if (color === '#1B5DD5' && fontSize === '24') {
          const p = this.parsePrice($el.text());
          if (p) { price = p; return false; }
        }
      });
      // যদি না পাই, পুরো DOM-এ একই সিলেক্টর দিয়ে খোঁজা
      if (!price) {
        $('h2[color="#1B5DD5"][font-size="24"]').each((i, el) => {
          const p = this.parsePrice($(el).text());
          if (p) { price = p; return false; }
        });
      }
      // তারপরও না পেলে সাধারণ প্রাইস সিলেক্টর
      if (!price) {
        price = this.parsePrice(
          $('.product-price .price, .special-price .price, .price-box .price').first().text()
        );
      }

      // ---------------------- পুরনো দাম ----------------------
      const originalPrice = this.parsePrice(
        $('.old-price .price, .regular-price .price, .price-box .old-price').text()
      );

      // ---------------------- স্টক ----------------------
      const inStock = !$('body').text().includes('Out of Stock');

      // ---------------------- রেটিং ----------------------
      let rating = null;
      let reviewCount = null;
      const ratingDiv = $('.add-rating .rating-div span').first().text();
      if (ratingDiv) rating = parseFloat(ratingDiv);
      const reviewText = $('.add-rating h2[font-size="14"]').first().text();
      if (reviewText) reviewCount = parseInt(reviewText.replace(/[()]/g, '')) || null;

      return {
        name,
        price,
        originalPrice: originalPrice || price,
        image,
        url,
        marketplace: this.marketplace,
        inStock,
        rating,
        reviewCount,
        soldCount: null,
        coupons: [],
        cashback: [],
      };
    } catch (err) {
      console.error('[Pickaboo] getProductFromUrl error:', err.message);
      return null;
    }
  }
}

module.exports = PickabooScraper;
