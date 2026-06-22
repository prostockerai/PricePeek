// ============ LIVE WEB SCRAPER SYSTEM ============

class WebScraper {
    constructor() {
        this.proxyUrl = 'https://api.allorigins.win/raw?url=';
        this.cacheExpiry = 15 * 60 * 1000; // 15 minutes
        this.cache = new Map();
    }

    async fetchWithProxy(url) {
        const cacheKey = url;
        const cached = this.cache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
            console.log(`[Cache] Using cached data for: ${url}`);
            return cached.data;
        }

        try {
            // Using AllOrigins proxy to bypass CORS
            const proxyUrl = this.proxyUrl + encodeURIComponent(url);
            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.text();
            
            // Cache the response
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });
            
            return data;
        } catch (error) {
            console.error(`[Scraper Error] ${url}:`, error.message);
            return null;
        }
    }

    parsePrice(priceText) {
        if (!priceText) return null;
        const cleaned = priceText.replace(/[^\d.]/g, '');
        const price = parseFloat(cleaned);
        return isNaN(price) ? null : price;
    }

    extractProductName(title) {
        if (!title) return '';
        return title.replace(/\s+/g, ' ').trim();
    }
}

// ============ DARAZ SCRAPER ============
class DarazScraper extends WebScraper {
    constructor() {
        super();
        this.marketplace = 'Daraz';
        this.baseUrl = 'https://www.daraz.com.bd';
    }

    async search(query) {
        try {
            const searchUrl = `${this.baseUrl}/catalog/?q=${encodeURIComponent(query)}`;
            const html = await this.fetchWithProxy(searchUrl);
            
            if (!html) return this.getFallbackData(query);
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const products = [];

            // Daraz product selectors
            const productCards = doc.querySelectorAll('[data-qa-locator="product-item"], .gridItem--Yd0sa, .Bm3ON');
            
            productCards.forEach((card, index) => {
                if (index >= 10) return; // Limit to 10 products
                
                try {
                    const nameEl = card.querySelector('.title--wFj93, .RfADt, a');
                    const priceEl = card.querySelector('.price--NVB62, .ooOxS');
                    const origPriceEl = card.querySelector('.originalPrice--aY4fQ, .crossPrice');
                    const imgEl = card.querySelector('img');
                    const linkEl = card.querySelector('a');
                    const discountEl = card.querySelector('.discount--HADrg, .discount');

                    if (nameEl && priceEl) {
                        const price = this.parsePrice(priceEl.textContent);
                        const originalPrice = this.parsePrice(origPriceEl?.textContent);
                        const discount = discountEl ? this.parsePrice(discountEl.textContent) : 
                                       calculateDiscount(price, originalPrice);

                        products.push({
                            id: 'daraz_' + Date.now() + '_' + index,
                            name: this.extractProductName(nameEl.textContent),
                            marketplace: this.marketplace,
                            price: price,
                            originalPrice: originalPrice,
                            discount: discount,
                            image: imgEl?.src || null,
                            url: linkEl?.href || searchUrl,
                            inStock: true,
                            isOfficial: card.textContent.includes('Official') || card.textContent.includes('Mall'),
                            rating: null,
                            coupons: this.getActiveCoupons(price),
                            cashback: this.getActiveCashback(),
                            scrapedAt: new Date().toISOString()
                        });
                    }
                } catch (err) {
                    console.warn('Daraz product parse error:', err);
                }
            });

            return products.length > 0 ? products : this.getFallbackData(query);
        } catch (error) {
            console.error('Daraz scraper error:', error);
            return this.getFallbackData(query);
        }
    }

    getActiveCoupons(price) {
        const coupons = [];
        if (price > 10000) coupons.push({ code: 'BDSALE500', discount: 500, type: 'fixed' });
        if (price > 5000) coupons.push({ code: 'SAVE200', discount: 200, type: 'fixed' });
        coupons.push({ code: 'NEWUSER10', discount: 10, type: 'percentage' });
        return coupons;
    }

    getActiveCashback() {
        return [
            { provider: 'bKash', percentage: 10, maxAmount: 500 },
            { provider: 'Nagad', percentage: 15, maxAmount: 250 },
        ];
    }

    getFallbackData(query) {
        // Fallback data when scraping fails
        return [];
    }
}

// ============ STARTECH SCRAPER ============
class StarTechScraper extends WebScraper {
    constructor() {
        super();
        this.marketplace = 'StarTech';
        this.baseUrl = 'https://www.startech.com.bd';
    }

    async search(query) {
        try {
            const searchUrl = `${this.baseUrl}/product/search?search=${encodeURIComponent(query)}`;
            const html = await this.fetchWithProxy(searchUrl);
            
            if (!html) return [];
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const products = [];

            const productCards = doc.querySelectorAll('.product-item, .p-item, .product-layout');
            
            productCards.forEach((card, index) => {
                if (index >= 10) return;
                
                try {
                    const nameEl = card.querySelector('.p-item-name, .product-name, h4');
                    const priceEl = card.querySelector('.p-item-price, .price-new, .product-price');
                    const origPriceEl = card.querySelector('.price-old, .product-price-old');
                    const imgEl = card.querySelector('img');
                    const linkEl = card.querySelector('a');

                    if (nameEl && priceEl) {
                        const price = this.parsePrice(priceEl.textContent);
                        const originalPrice = this.parsePrice(origPriceEl?.textContent);
                        
                        products.push({
                            id: 'startech_' + Date.now() + '_' + index,
                            name: this.extractProductName(nameEl.textContent),
                            marketplace: this.marketplace,
                            price: price,
                            originalPrice: originalPrice,
                            discount: calculateDiscount(price, originalPrice),
                            image: imgEl?.src || null,
                            url: linkEl?.href || searchUrl,
                            inStock: !card.textContent.includes('Out of Stock'),
                            isOfficial: true,
                            rating: null,
                            coupons: [],
                            cashback: [{ provider: 'Visa', percentage: 5, maxAmount: 1000 }],
                            scrapedAt: new Date().toISOString()
                        });
                    }
                } catch (err) {
                    console.warn('StarTech product parse error:', err);
                }
            });

            return products;
        } catch (error) {
            console.error('StarTech scraper error:', error);
            return [];
        }
    }
}

// ============ RYANS SCRAPER ============
class RyansScraper extends WebScraper {
    constructor() {
        super();
        this.marketplace = 'Ryans';
        this.baseUrl = 'https://www.ryanscomputers.com';
    }

    async search(query) {
        try {
            const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;
            const html = await this.fetchWithProxy(searchUrl);
            
            if (!html) return [];
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const products = [];

            const productCards = doc.querySelectorAll('.product-card, .product-item, .card-body');
            
            productCards.forEach((card, index) => {
                if (index >= 10) return;
                
                try {
                    const nameEl = card.querySelector('.product-title, .card-title, h2');
                    const priceEl = card.querySelector('.product-price, .price, .prc');
                    const origPriceEl = card.querySelector('.old-price, .regular-price');
                    const imgEl = card.querySelector('img');
                    const linkEl = card.querySelector('a');

                    if (nameEl && priceEl) {
                        const price = this.parsePrice(priceEl.textContent);
                        const originalPrice = this.parsePrice(origPriceEl?.textContent);
                        
                        products.push({
                            id: 'ryans_' + Date.now() + '_' + index,
                            name: this.extractProductName(nameEl.textContent),
                            marketplace: this.marketplace,
                            price: price,
                            originalPrice: originalPrice,
                            discount: calculateDiscount(price, originalPrice),
                            image: imgEl?.src || null,
                            url: linkEl?.href || searchUrl,
                            inStock: !card.textContent.includes('Stock Out'),
                            isOfficial: true,
                            rating: null,
                            coupons: price > 5000 ? [{ code: 'RYANS500', discount: 500, type: 'fixed' }] : [],
                            cashback: [],
                            scrapedAt: new Date().toISOString()
                        });
                    }
                } catch (err) {
                    console.warn('Ryans product parse error:', err);
                }
            });

            return products;
        } catch (error) {
            console.error('Ryans scraper error:', error);
            return [];
        }
    }
}

// ============ PICKABOO SCRAPER ============
class PickabooScraper extends WebScraper {
    constructor() {
        super();
        this.marketplace = 'Pickaboo';
        this.baseUrl = 'https://www.pickaboo.com';
    }

    async search(query) {
        try {
            const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;
            const html = await this.fetchWithProxy(searchUrl);
            
            if (!html) return [];
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const products = [];

            const productCards = doc.querySelectorAll('.product-item, .product, .item-box');
            
            productCards.forEach((card, index) => {
                if (index >= 10) return;
                
                try {
                    const nameEl = card.querySelector('.product-name, .name, h3');
                    const priceEl = card.querySelector('.product-price, .price, .special-price');
                    const origPriceEl = card.querySelector('.old-price, .regular-price');
                    const imgEl = card.querySelector('img');
                    const linkEl = card.querySelector('a');

                    if (nameEl && priceEl) {
                        const price = this.parsePrice(priceEl.textContent);
                        const originalPrice = this.parsePrice(origPriceEl?.textContent);
                        
                        products.push({
                            id: 'pickaboo_' + Date.now() + '_' + index,
                            name: this.extractProductName(nameEl.textContent),
                            marketplace: this.marketplace,
                            price: price,
                            originalPrice: originalPrice,
                            discount: calculateDiscount(price, originalPrice),
                            image: imgEl?.src || null,
                            url: linkEl?.href || searchUrl,
                            inStock: true,
                            isOfficial: false,
                            rating: null,
                            coupons: [],
                            cashback: [{ provider: 'Nagad', percentage: 15, maxAmount: 300 }],
                            scrapedAt: new Date().toISOString()
                        });
                    }
                } catch (err) {
                    console.warn('Pickaboo product parse error:', err);
                }
            });

            return products;
        } catch (error) {
            console.error('Pickaboo scraper error:', error);
            return [];
        }
    }
}

// ============ SCRAPER MANAGER ============
class ScraperManager {
    constructor() {
        this.scrapers = [
            new DarazScraper(),
            new StarTechScraper(),
            new RyansScraper(),
            new PickabooScraper(),
        ];
    }

    async searchAll(query) {
        const results = [];
        const errors = [];
        
        const promises = this.scrapers.map(async (scraper) => {
            try {
                const products = await scraper.search(query);
                results.push(...products);
                console.log(`[${scraper.marketplace}] Found ${products.length} products`);
            } catch (error) {
                console.error(`[${scraper.marketplace}] Error:`, error);
                errors.push({ marketplace: scraper.marketplace, error: error.message });
            }
        });

        await Promise.allSettled(promises);
        
        return { products: results, errors };
    }
}

// Initialize scraper manager
const scraperManager = new ScraperManager();