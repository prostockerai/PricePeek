require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');

// Import scrapers
const DarazScraper = require('./scrapers/daraz');
const StarTechScraper = require('./scrapers/startech');
const RyansScraper = require('./scrapers/ryans');
const PickabooScraper = require('./scrapers/pickaboo');

const app = express();
const PORT = process.env.PORT || 3000;

// Cache setup (15 minutes TTL)
const cache = new NodeCache({ stdTTL: 900, checkperiod: 120 });

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
    origin: ['http://localhost:3001', 'http://127.0.0.1:5500', 'http://localhost:5500', '*'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(morgan('combined'));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Initialize scrapers
const scrapers = {
    daraz: new DarazScraper(),
    startech: new StarTechScraper(),
    ryans: new RyansScraper(),
    pickaboo: new PickabooScraper(),
};

// ============ API ROUTES ============

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        scrapers: Object.keys(scrapers)
    });
});

// Search across all marketplaces
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        const marketplace = req.query.marketplace || 'all';
        const forceRefresh = req.query.refresh === 'true';

        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        // Check cache first
        const cacheKey = `search:${query}:${marketplace}`;
        if (!forceRefresh) {
            const cachedResult = cache.get(cacheKey);
            if (cachedResult) {
                console.log(`[Cache] Serving cached result for: ${query}`);
                return res.json({
                    success: true,
                    cached: true,
                    query: query,
                    ...cachedResult
                });
            }
        }

        console.log(`[Search] Searching for: ${query}`);

        let results = [];
        let errors = [];
        const searchPromises = [];

        // Determine which scrapers to use
        const scrapersToUse = marketplace === 'all' 
            ? Object.values(scrapers)
            : [scrapers[marketplace.toLowerCase()]].filter(Boolean);

        if (scrapersToUse.length === 0) {
            return res.status(400).json({ 
                error: `Invalid marketplace: ${marketplace}`,
                available: Object.keys(scrapers)
            });
        }

        // Run all scrapers in parallel
        for (const scraper of scrapersToUse) {
            searchPromises.push(
                scraper.search(query)
                    .then(products => {
                        results.push(...products);
                        console.log(`[${scraper.marketplace}] Found ${products.length} products`);
                    })
                    .catch(error => {
                        console.error(`[${scraper.marketplace}] Error:`, error.message);
                        errors.push({
                            marketplace: scraper.marketplace,
                            error: error.message
                        });
                    })
            );
        }

        await Promise.allSettled(searchPromises);

        // Remove duplicates
        const uniqueResults = results.filter((product, index, self) =>
            index === self.findIndex(p => 
                p.name === product.name && p.marketplace === product.marketplace
            )
        );

        // Sort by price
        uniqueResults.sort((a, b) => (a.price || Infinity) - (b.price || Infinity));

        const response = {
            success: true,
            cached: false,
            query: query,
            total: uniqueResults.length,
            products: uniqueResults,
            errors: errors.length > 0 ? errors : undefined,
            timestamp: new Date().toISOString()
        };

        // Cache the result
        cache.set(cacheKey, {
            total: uniqueResults.length,
            products: uniqueResults,
            errors: errors.length > 0 ? errors : undefined
        });

        res.json(response);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Search single marketplace
app.get('/api/search/:marketplace', async (req, res) => {
    try {
        const { marketplace } = req.params;
        const query = req.query.q;

        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const scraper = scrapers[marketplace.toLowerCase()];
        if (!scraper) {
            return res.status(400).json({
                error: `Invalid marketplace: ${marketplace}`,
                available: Object.keys(scrapers)
            });
        }

        const products = await scraper.search(query);
        
        res.json({
            success: true,
            marketplace: marketplace,
            query: query,
            total: products.length,
            products: products
        });
    } catch (error) {
        console.error(`Search error for ${req.params.marketplace}:`, error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get coupons for a marketplace
app.get('/api/coupons/:marketplace', async (req, res) => {
    try {
        const { marketplace } = req.params;
        const scraper = scrapers[marketplace.toLowerCase()];
        
        if (!scraper) {
            return res.status(400).json({ error: 'Invalid marketplace' });
        }

        const coupons = await scraper.getCoupons();
        res.json({
            success: true,
            marketplace: marketplace,
            coupons: coupons
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get cashback offers
app.get('/api/cashback', (req, res) => {
    const marketplace = req.query.marketplace;
    
    let offers = [
        { provider: 'bKash', marketplace: 'Daraz', percentage: 10, maxAmount: 500, minPurchase: 2000 },
        { provider: 'Nagad', marketplace: 'Daraz', percentage: 15, maxAmount: 250, minPurchase: 1500 },
        { provider: 'Rocket', marketplace: 'Daraz', percentage: 5, maxAmount: 200, minPurchase: 1000 },
        { provider: 'Visa', marketplace: 'StarTech', percentage: 5, maxAmount: 1000, minPurchase: 5000 },
        { provider: 'Mastercard', marketplace: 'StarTech', percentage: 7, maxAmount: 800, minPurchase: 3000 },
        { provider: 'bKash', marketplace: 'Ryans', percentage: 10, maxAmount: 300, minPurchase: 2000 },
        { provider: 'Nagad', marketplace: 'Pickaboo', percentage: 15, maxAmount: 300, minPurchase: 1500 },
        { provider: 'bKash', marketplace: 'Gadget&Gear', percentage: 10, maxAmount: 500, minPurchase: 3000 },
    ];

    if (marketplace) {
        offers = offers.filter(o => o.marketplace.toLowerCase() === marketplace.toLowerCase());
    }

    res.json({
        success: true,
        offers: offers
    });
});

// Clear cache
app.post('/api/cache/clear', (req, res) => {
    const keys = cache.keys();
    cache.del(keys);
    res.json({
        success: true,
        message: `Cleared ${keys.length} cached items`
    });
});

// Get cache stats
app.get('/api/cache/stats', (req, res) => {
    res.json({
        success: true,
        stats: cache.getStats(),
        keys: cache.keys().length
    });
});

// Compare products
app.post('/api/compare', async (req, res) => {
    try {
        const { urls } = req.body;
        
        if (!urls || !Array.isArray(urls) || urls.length < 2) {
            return res.status(400).json({ error: 'At least 2 product URLs are required' });
        }

        if (urls.length > 5) {
            return res.status(400).json({ error: 'Maximum 5 products can be compared' });
        }

        const products = [];
        for (const url of urls) {
            // Determine which scraper to use based on URL
            let scraper = null;
            if (url.includes('daraz.com.bd')) scraper = scrapers.daraz;
            else if (url.includes('startech.com.bd')) scraper = scrapers.startech;
            else if (url.includes('ryanscomputers.com')) scraper = scrapers.ryans;
            else if (url.includes('pickaboo.com')) scraper = scrapers.pickaboo;
            
            if (scraper) {
                const details = await scraper.getProductDetails(url);
                if (details) products.push(details);
            }
        }

        res.json({
            success: true,
            products: products
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Route ${req.method} ${req.url} not found`
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Start server
app.listen(PORT, () => {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║     🛒 SmartShop BD - Backend Server     ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  Server running on: http://localhost:${PORT} ║`);
    console.log('║  API Endpoint: /api/search?q=product     ║');
    console.log('║  Health: /api/health                      ║');
    console.log('║  Cache: /api/cache/stats                  ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log(`\n📋 Available scrapers: ${Object.keys(scrapers).join(', ')}`);
    console.log('✅ Ready to scrape!\n');
});

module.exports = app;