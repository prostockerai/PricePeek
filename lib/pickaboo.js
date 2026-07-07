// lib/pickaboo.js
const BaseScraper = require('./baseScraper');

class PickabooScraper extends BaseScraper {
  constructor() {
    super('Pickaboo', 'https://www.pickaboo.com');
  }

  // কীওয়ার্ড সার্চ – Pickaboo ক্লায়েন্ট-রেন্ডার করায় কাজ করবে না
  async search(query) {
    return [];
  }

  // পণ্যের বিস্তারিত পাতা থেকে সম্পূর্ণ তথ্য
  async getProductFromUrl(url) {
    try {
      const html = await this.fetchPage(url);
      if (!html) return null;
      const $ = this.loadHTML(html);

      // ১. নাম: মেটা og:title থেকে নেব, তারপর অপ্রয়োজনীয় অংশ বাদ দেব
      let rawName = $('meta[property="og:title"]').attr('content') ||
                    $('h1.title, h1.product-name, .product-title').first().text();
      
      // "Buy ... at Best" বা "| Pickaboo" ইত্যাদি সরিয়ে ফেলা
      rawName = rawName
        .replace(/buy\s+.*?\s+at\s+best\s*$/i, '')
        .replace(/\s*\|\s*Pickaboo\s*$/i, '')
        .trim();
      
      const name = this.cleanProductName(rawName);

      // ২. ছবি: মেটা og:image (সবচেয়ে নির্ভরযোগ্য)
      const image = $('meta[property="og:image"]').attr('content') ||
                    $('.dsn__main-image-container img').attr('src') ||
                    $('.product-image img, .gallery img').first().attr('src');

      // ৩. দাম: price-view ভিতরের h2 (যেকোনো h2 যার color="#1B5DD5" এবং font-size="24")
      let price = null;
      // প্রথমে price-view কন্টেইনারের ভিতরে h2 খোঁজা
      const $priceContainer = $('.price-view');
      if ($priceContainer.length) {
        $priceContainer.find('h2').each((i, el) => {
          const $el = $(el);
          const color = $el.attr('color');
          const fontSize = $el.attr('font-size');
          if (color === '#1B5DD5' && fontSize === '24') {
            const text = $el.text().trim();
            const parsed = this.parsePrice(text);
            if (parsed) price = parsed;
            return false; // break loop
          }
        });
      }
      // যদি না পাই, পুরো DOM-এ খোঁজা
      if (!price) {
        $('h2[color="#1B5DD5"][font-size="24"]').each((i, el) => {
          const text = $(el).text().trim();
          const parsed = this.parsePrice(text);
          if (parsed) {
            price = parsed;
            return false;
          }
        });
      }
      // শেষ চেষ্টা: সাধারণ প্রাইস সিলেক্টর
      if (!price) {
        price = this.parsePrice(
          $('.product-price .price, .special-price .price, .price-box .price').first().text()
        );
      }

      // ৪. পুরনো দাম (থাকলে)
      const originalPrice = this.parsePrice(
        $('.old-price .price, .regular-price .price, .price-box .old-price').text()
      );

      // ৫. স্টক
      const inStock = !$('body').text().includes('Out of Stock');

      // ৬. রেটিং ও রিভিউ
      let rating = null;
      let reviewCount = null;
      const ratingDiv = $('.add-rating .rating-div span').first().text();
      if (ratingDiv) rating = parseFloat(ratingDiv);
      const reviewText = $('.add-rating h2[font-size="14"]').first().text();
      if (reviewText) reviewCount = parseInt(reviewText.replace(/[()]/g, '')) || null;

      if (!name) {
        console.error('[Pickaboo] Could not extract product name');
        return null;
      }

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
