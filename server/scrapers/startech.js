const BaseScraper = require('./baseScraper');

class StarTechScraper extends BaseScraper {
    constructor() {
        super('StarTech', 'https://www.startech.com.bd');
    }

    async search(query) {
        const products = [];
        
        try {
            const searchUrl = `${this.baseUrl}/product/search?search=${encodeURIComponent(query)}`;
            const html = await this.fetchPage(searchUrl);
            
            if (!html) return products;
            
            const $ = this.loadHTML(html);
            
            // StarTech product selectors
            $('.product-thumb, .product-layout, .p-item').each((index, element) => {
                if (index >= 20) return false;
                
                try {
                    const $el = $(element);
                    
                    const name = this.cleanProductName(
                        $el.find('.p-item-name a, .product-name a, .name a, h4 a').text()
                    );
                    
                    const priceText = $el.find('.p-item-price span, .price-new, .product-price').first().text();
                    const price = this.parsePrice(priceText);
                    
                    const originalPriceText = $el.find('.price-old, .product-price-old').text();
                    const originalPrice = this.parsePrice(originalPriceText);
                    
                    const discount = this.parseDiscount(price, originalPrice);
                    
                    const imageUrl = $el.find('img').attr('src') || $el.find('img').attr('data-src');
                    
                    const productUrl = $el.find('a').first().attr('href');
                    const fullUrl = productUrl ? 
                        (productUrl.startsWith('http') ? productUrl : this.baseUrl + productUrl) : 
                        searchUrl;
                    
                    const inStock = !$el.text().includes('Out of Stock') && 
                                   !$el.text().includes('Stock Out') &&
                                   !$el.find('.out-of-stock').length;
                    
                    if (name && price) {
                        products.push({
                            id: `startech_${Date.now()}_${index}`,
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
                    console.warn(`[StarTech] Parse error at index ${index}:`, err.message);
                }
            });
            
        } catch (error) {
            console.error(`[StarTech] Search error:`, error.message);
        }
        
        return products;
    }

    async getProductDetails(url) {
        try {
            const html = await this.fetchPage(url);
            if (!html) return null;
            
            const $ = this.loadHTML(html);
            
            const name = this.cleanProductName($('h1.product-title, .product-name').first().text());
            const price = this.parsePrice($('.product-price-new, .price-new').text());
            const originalPrice = this.parsePrice($('.product-price-old, .price-old').text());
            const image = $('.product-image img, .main-image img').attr('src');
            const inStock = $('.product-stock').text().includes('In Stock');
            
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
            console.error(`[StarTech] Product detail error:`, error.message);
            return null;
        }
    }

    getActiveCoupons(price) {
        const coupons = [];
        
        if (price > 50000) {
            coupons.push({ code: 'STARTECH5000', discount: 5000, type: 'fixed', description: 'Save ৳5,000 on orders above ৳50,000' });
        }
        if (price > 20000) {
            coupons.push({ code: 'TECH2000', discount: 2000, type: 'fixed', description: 'Save ৳2,000 on orders above ৳20,000' });
        }
        
        return coupons;
    }

    getActiveCashback() {
        return [
            { provider: 'Visa', percentage: 5, maxAmount: 1000, minPurchase: 5000, description: '5% cashback up to ৳1,000 on Visa cards' },
            { provider: 'Mastercard', percentage: 7, maxAmount: 800, minPurchase: 3000, description: '7% cashback up to ৳800 on Mastercard' },
        ];
    }
}

module.exports = StarTechScraper;