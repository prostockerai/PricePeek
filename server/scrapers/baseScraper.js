const axios = require('axios');
const cheerio = require('cheerio');

class BaseScraper {
    constructor(name, baseUrl) {
        this.name = name;
        this.marketplace = name;
        this.baseUrl = baseUrl;
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/119.0',
        ];
        this.delay = 2000; // 2 seconds between requests
    }

    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    async delayRequest() {
        const wait = this.delay + Math.random() * 1000;
        return new Promise(resolve => setTimeout(resolve, wait));
    }

    async fetchPage(url) {
        try {
            const headers = {
                'User-Agent': this.getRandomUserAgent(),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
            };

            const response = await axios.get(url, {
                headers,
                timeout: 30000,
                maxRedirects: 5,
            });

            return response.data;
        } catch (error) {
            console.error(`[${this.name}] Fetch error for ${url}:`, error.message);
            
            if (error.response && error.response.status === 429) {
                console.log(`[${this.name}] Rate limited. Waiting 30 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 30000));
                return this.fetchPage(url); // Retry
            }
            
            return null;
        }
    }

    loadHTML(html) {
        return cheerio.load(html);
    }

    parsePrice(priceText) {
        if (!priceText) return null;
        
        // Remove all non-numeric characters except decimal point
        let cleaned = priceText.replace(/[^\d.]/g, '');
        
        // Handle multiple decimal points
        const parts = cleaned.split('.');
        if (parts.length > 2) {
            cleaned = parts[0] + '.' + parts.slice(1).join('');
        }
        
        const price = parseFloat(cleaned);
        return isNaN(price) ? null : price;
    }

    parseDiscount(price, originalPrice) {
        if (!originalPrice || !price || originalPrice <= price) return 0;
        return Math.round(((originalPrice - price) / originalPrice) * 100);
    }

    cleanProductName(name) {
        if (!name) return '';
        return name
            .replace(/\s+/g, ' ')
            .replace(/[\n\r\t]/g, '')
            .trim();
    }

    // To be implemented by child classes
    async search(query) {
        throw new Error('search() method must be implemented by child class');
    }

    async getProductDetails(url) {
        throw new Error('getProductDetails() method must be implemented by child class');
    }

    async getCoupons() {
        return []; // Default implementation
    }
}

module.exports = BaseScraper;