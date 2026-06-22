const BaseScraper = require('./baseScraper');

class PickabooScraper extends BaseScraper {
    constructor() {
        super('Pickaboo', 'https://www.pickaboo.com');
    }

    async search(query) {
        const products = [];
        
        try {
            const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;
            const html = await this.fetchPage(searchUrl);
            
            if (!html) return products;
            
            const $ = this.loadHTML(html);
            
            // Pickaboo product selectors
            $('.product-item, .product, .item-box, .product-box').each((index, element) => {
                if (index >= 20) return false;
                
                try {
                    const $el = $(element);
                    
                    const name = this.cleanProductName(
                        $el.find('.product-name, .name, .item-name, h3').text()
                    );
                    
                    const priceText = $el.find('.product-price, .price, .special-price, .item-price').first().text();
                    const price = this.parsePrice(priceText);
                    
                    const originalPriceText = $el.find('.old-price, .regular-price, .price-old').text();
                    const originalPrice = this.parsePrice(originalPriceText);
                    
                    const discount = this.parseDiscount(price, originalPrice);
                    
                    const imageUrl = $el.find('img').attr('src') || $el.find('img').attr('data-src');
                    
                    const productUrl = $el.find('a').first().attr('href');
                    const fullUrl = productUrl ? 
                        (productUrl.startsWith('http') ? productUrl : this.baseUrl + productUrl) : 
                        searchUrl;
                    
                    const inStock = !$el.text().includes('Out of Stock') && 
                                   !$el.find('.out-of-stock, .sold-out').length;
                    
                    if (name && price) {
                        products.push({
                            id: `pickaboo_${Date.now()}_${index}`,
                            name: name,
                            marketplace: this.marketplace,
                            price: price,
                            originalPrice: originalPrice || price,
                            discount: discount,
                            image: imageUrl,
                            url: fullUrl,
                            inStock: inStock,
                            isOfficial: false,
                            rating: null,
                            coupons: this.getActiveCoupons(price),
                            cashback: this.getActiveCashback(),
                            scrapedAt: new Date().toISOString()
                        });
                    }
                } catch (err) {
                    console.warn(`[Pickaboo] Parse error at index ${index}:`, err.message);
                }
            });
            
        } catch (error) {
            console.error(`[Pickaboo] Search error:`, error.message);
        }
        
        return products;
    }

    async getProductDetails(url) {
        try {
            const html = await this.fetchPage(url);
            if (!html) return null;
            
            const $ = this.loadHTML(html);
            
            const name = this.cleanProductName($('h1.product-name, .product-title').first().text());
            const price = this.parsePrice($('.product-price, .special-price').text());
            const originalPrice = this.parsePrice($('.old-price, .regular-price').text());
            const image = $('.product-image img, .gallery img').first().attr('src');
            const inStock = !$('.stock-status').text().includes('Out of Stock');
            
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
            console.error(`[Pickaboo] Product detail error:`, error.message);
            return null;
        }
    }

    getActiveCoupons(price) {
        const coupons = [];
        
        if (price > 15000) {
            coupons.push({ code: 'PICKA1500', discount: 1500, type: 'fixed', description: 'Save ৳1,500 on orders above ৳15,000' });
        }
        if (price > 5000) {
            coupons.push({ code: 'PICKA500', discount: 500, type: 'fixed', description: 'Save ৳500 on orders above ৳5,000' });
        }
        
        return coupons;
    }

    getActiveCashback() {
        return [
            { provider: 'Nagad', percentage: 15, maxAmount: 300, minPurchase: 1500, description: '15% cashback up to ৳300' },
            { provider: 'bKash', percentage: 10, maxAmount: 200, minPurchase: 1000, description: '10% cashback up to ৳200' },
        ];
    }
}

module.exports = PickabooScraper;