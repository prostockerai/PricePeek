const BaseScraper = require('./baseScraper');

class RyansScraper extends BaseScraper {
    constructor() {
        super('Ryans', 'https://www.ryanscomputers.com');
    }

    async search(query) {
        const products = [];
        
        try {
            const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;
            const html = await this.fetchPage(searchUrl);
            
            if (!html) return products;
            
            const $ = this.loadHTML(html);
            
            // Ryans product selectors
            $('.product-card, .product-item, .category-product, .product-box').each((index, element) => {
                if (index >= 20) return false;
                
                try {
                    const $el = $(element);
                    
                    const name = this.cleanProductName(
                        $el.find('.product-title, .card-title, .product-name, h2 a, h3 a').text()
                    );
                    
                    const priceText = $el.find('.product-price, .price, .prc, .special-price').first().text();
                    const price = this.parsePrice(priceText);
                    
                    const originalPriceText = $el.find('.old-price, .regular-price, .price-old').text();
                    const originalPrice = this.parsePrice(originalPriceText);
                    
                    const discount = this.parseDiscount(price, originalPrice);
                    
                    const imageUrl = $el.find('img').attr('src') || $el.find('img').attr('data-src');
                    
                    const productUrl = $el.find('a').first().attr('href');
                    const fullUrl = productUrl ? 
                        (productUrl.startsWith('http') ? productUrl : this.baseUrl + productUrl) : 
                        searchUrl;
                    
                    const inStock = !$el.text().includes('Stock Out') && 
                                   !$el.text().includes('Out of Stock') &&
                                   !$el.find('.out-of-stock').length;
                    
                    if (name && price) {
                        products.push({
                            id: `ryans_${Date.now()}_${index}`,
                            name: name,
                            marketplace: this.marketplace,
                            price: price,
                            originalPrice: originalPrice || price,
                            discount: discount,
                            image: imageUrl,
                            url: fullUrl,
                            inStock: inStock,
                            isOfficial: true,
                            rating: null,
                            coupons: this.getActiveCoupons(price),
                            cashback: this.getActiveCashback(),
                            scrapedAt: new Date().toISOString()
                        });
                    }
                } catch (err) {
                    console.warn(`[Ryans] Parse error at index ${index}:`, err.message);
                }
            });
            
        } catch (error) {
            console.error(`[Ryans] Search error:`, error.message);
        }
        
        return products;
    }

    async getProductDetails(url) {
        try {
            const html = await this.fetchPage(url);
            if (!html) return null;
            
            const $ = this.loadHTML(html);
            
            const name = this.cleanProductName($('h1.product-title, .product-name').first().text());
            const price = this.parsePrice($('.product-price, .price, .special-price').text());
            const originalPrice = this.parsePrice($('.old-price, .regular-price').text());
            const image = $('.product-image img, .main-image img').attr('src');
            const inStock = !$('.product-stock').text().includes('Out of Stock');
            
            return {
                name,
                price,
                originalPrice,
                image,
                url,
                marketplace: this.marketplace,
                inStock,
                scrapedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error(`[Ryans] Product detail error:`, error.message);
            return null;
        }
    }

    getActiveCoupons(price) {
        const coupons = [];
        
        if (price > 20000) {
            coupons.push({ code: 'RYANS2000', discount: 2000, type: 'fixed', description: 'Save ৳2,000 on orders above ৳20,000' });
        }
        if (price > 10000) {
            coupons.push({ code: 'RYANS1000', discount: 1000, type: 'fixed', description: 'Save ৳1,000 on orders above ৳10,000' });
        }
        if (price > 5000) {
            coupons.push({ code: 'RYANS500', discount: 500, type: 'fixed', description: 'Save ৳500 on orders above ৳5,000' });
        }
        
        return coupons;
    }

    getActiveCashback() {
        return [
            { provider: 'bKash', percentage: 10, maxAmount: 300, minPurchase: 2000, description: '10% cashback up to ৳300' },
        ];
    }
}

module.exports = RyansScraper;