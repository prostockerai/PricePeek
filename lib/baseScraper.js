const axios = require('axios');
const cheerio = require('cheerio');

class BaseScraper {
  constructor(name, baseUrl) {
    this.name = name;
    this.marketplace = name;
    this.baseUrl = baseUrl;
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0',
    ];
  }

  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  async fetchPage(url) {
    try {
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
        },
        timeout: 15000,
      });
      return data;
    } catch (err) {
      console.error(`[${this.name}] fetch error: ${err.message}`);
      return null;
    }
  }

  loadHTML(html) { return cheerio.load(html); }

  parsePrice(text) {
    if (!text) return null;
    const cleaned = text.replace(/[^\d.]/g, '');
    const price = parseFloat(cleaned);
    return isNaN(price) ? null : price;
  }

  parseDiscount(price, originalPrice) {
    if (!originalPrice || !price || originalPrice <= price) return 0;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  }

  cleanProductName(name) {
    if (!name) return '';
    return name.replace(/\s+/g, ' ').trim();
  }

  // Override in child
  async search(query) { return []; }
  async getProductFromUrl(url) { return null; }
}

module.exports = BaseScraper;
