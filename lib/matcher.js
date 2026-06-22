class ProductMatcher {
    // প্রোডাক্টের নাম থেকে গুরুত্বপূর্ণ কীওয়ার্ড বের করা
    extractSearchKey(productName) {
        if (!productName) return '';
        const cleaned = productName.replace(/[^a-zA-Z0-9\s]/g, ' ')
                                 .replace(/\s+/g, ' ')
                                 .trim();
        const tokens = cleaned.split(' ');
        const meaningful = tokens.filter(t => t.length > 1);
        return meaningful.slice(0, 5).join(' ');
    }

    // একটি মূল প্রোডাক্টের সাথে মিল থাকা প্রোডাক্টগুলোকে গ্রুপ করা
    groupByProduct(products, sourceProductName) {
        if (!sourceProductName) return [];
        const sourceKey = this.extractSearchKey(sourceProductName).toLowerCase();
        const groups = [];
        const used = new Set();
        for (const p of products) {
            if (used.has(p.id)) continue;
            const pKey = this.extractSearchKey(p.name).toLowerCase();
            if (this.similarity(sourceKey, pKey) > 0.6) {
                groups.push(p);
                used.add(p.id);
            }
        }
        return groups;
    }

    // জ্যাকার্ড সিমিলারিটি (টোকেন ভিত্তিক)
    similarity(a, b) {
        const setA = new Set(a.split(' '));
        const setB = new Set(b.split(' '));
        const intersection = new Set([...setA].filter(x => setB.has(x)));
        const union = new Set([...setA, ...setB]);
        return union.size === 0 ? 0 : intersection.size / union.size;
    }
}

module.exports = new ProductMatcher();
