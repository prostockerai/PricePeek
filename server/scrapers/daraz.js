const BaseScraper = require('./baseScraper');

class DarazScraper extends BaseScraper {
    constructor() {
        super('Daraz', 'https://www.daraz.com.bd');
    }

    async search(query) {
        const products = [];
        
        try {
            const searchUrl = `${this.baseUrl}/catalog/?q=${encodeURIComponent(query)}`;
            const html = await this.fetchPage(searchUrl);
            
            if (!html) return products;
            
            const $ = this.loadHTML(html);
            
            // Daraz product selectors
            $('[data-qa-locator="product-item"], .gridItem--Yd0sa, .Bm3ON').each((index, element) => {
                if (index >= 20) return false; // Limit to 20 products
                
                try {
                    const $el = $(element);
                    
                    const name = this.cleanProductName(
                        $el.find('.title--wFj93, .RfADt a, .title-wrapper--IaQ0m').text()
                    );
                    
                    const priceText = $el.find('.price--NVB62, .ooOxS, .price-wrapper--Ii6aY').text();
                    const price = this.parsePrice(priceText);
                    
                    const originalPriceText = $el.find('.originalPrice--aY4fQ, .crossPrice, .price-old').text();
                    const originalPrice = this.parsePrice(originalPriceText);
                    
                    const discountText = $el.find('.discount--HADrg').text();
                    const discount = this.parsePrice(discountText) || this.parseDiscount(price, originalPrice);
                    
                    const imageUrl = $el.find('img').attr('src') || $el.find('img').attr('data-src');
                    
                    const productUrl = $el.find('a').attr('href');
                    const fullUrl = productUrl ? 
                        (productUrl.startsWith('http') ? productUrl : this.baseUrl + productUrl) : 
                        searchUrl;
                    
                    const isOfficial = $el.text().includes('Official') || 
                                      $el.text().includes('Mall') ||
                                      $el.find('.icon-mall').length > 0;
                    
                    const ratingText = $el.find('.rating__number, .ratig--aY4fQ').text();
                    const rating = parseFloat(ratingText) || null;
                    
                    if (name && price) {
                        products.push({
                            id: `daraz_${Date.now()}_${index}`,
                            name: name,
                            marketplace: this.marketplace,
                            price: price,
                            originalPrice: originalPrice || price,
                            discount: discount,
                            image: imageUrl,
                            url: fullUrl,
                            inStock: true,
                            isOfficial: isOfficial,
                            rating: rating,
                            coupons: this.getActiveCoupons(price),
                            cashback: this.getActiveCashback(),
                            scrapedAt: new Date().toISOString()
                        });
                    }
                } catch (err) {
                    console.warn(`[Daraz] Parse error at index ${index}:`, err.message);
                }
            });

            // If no products found with primary selectors, try alternative
            if (products.length === 0) {
                $('.product-card, .card--q0AqW, .product-item').each((index, element) => {
                    if (index >= 10) return false;
                    
                    try {
                        const $el = $(element);
                        const name = this.cleanProductName($el.find('a').text() || $el.find('.title').text());
                        const priceText = $el.find('.price').text();
                        const price = this.parsePrice(priceText);
                        
                        if (name && price) {
                            products.push({
                                id: `daraz_alt_${Date.now()}_${index}`,
                                name: name,
                                marketplace: this.marketplace,
                                price: price,
                                originalPrice: price,
                                discount: 0,
                                image: $el.find('img').attr('src'),
                                url: $el.find('a').attr('href') || searchUrl,
                                inStock: true,
                                isOfficial: false,
                                rating: null,
                                coupons: [],
                                cashback: [],
                                scrapedAt: new Date().toISOString()
                            });
                        }
                    } catch (err) {
                        // Skip parsing errors
                    }
                });
            }
            
        } catch (error) {
            console.error(`[Daraz] Search error:`, error.message);
        }
        
        return products;
    }

    async getProductDetails(url) {
        try {
            const html = await this.fetchPage(url);
            if (!html) return null;
            
            const $ = this.loadHTML(html);
            
            const name = this.cleanProductName($('.pdp-mod-product-badge-title').text() || $('h1').first().text());
            const price = this.parsePrice($('.pdp-price_color_orange').text() || $('.pdp-price').text());
            const originalPrice = this.parsePrice($('.pdp-price_color_lightgray').text() || $('.pdp-price-del').text());
            const image = $('.pdp-mod-common-image img').attr('src') || $('.gallery-preview-panel img').attr('src');
            const inStock = !$('.add-to-cart-buy-now-btn').hasClass('disabled');
            
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
            console.error(`[Daraz] Product detail error:`, error.message);
            return null;
        }
    }

    getActiveCoupons(price) {
        const coupons = [];
        
        // Daraz coupons based on price thresholds
        if (price > 10000) {
            coupons.push({ code: 'BDSALE500', discount: 500, type: 'fixed', description: 'Save ৳500 on orders above ৳10,000' });
        }
        if (price > 5000) {
            coupons.push({ code: 'SAVE200', discount: 200, type: 'fixed', description: 'Save ৳200 on orders above ৳5,000' });
        }
        if (price > 3000) {
            coupons.push({ code: 'NEWUSER10', discount: 10, type: 'percentage', description: '10% off for new users' });
        }
        if (price > 2000) {
            coupons.push({ code: 'FREESHIP', discount: 60, type: 'fixed', description: 'Free shipping worth ৳60' });
        }
        
        return coupons;
    }

    getActiveCashback() {
        return [
            { provider: 'bKash', percentage: 10, maxAmount: 500, minPurchase: 2000, description: '10% cashback up to ৳500' },
            { provider: 'Nagad', percentage: 15, maxAmount: 250, minPurchase: 1500, description: '15% cashback up to ৳250' },
            { provider: 'Rocket', percentage: 5, maxAmount: 200, minPurchase: 1000, description: '5% cashback up to ৳200' },
            { provider: 'Visa', percentage: 5, maxAmount: 1000, minPurchase: 5000, description: '5% cashback up to ৳1,000 on Visa cards' },
        ];
    }
}

module.exports = DarazScraper;