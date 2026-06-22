class ProductMatcher {
  extractSearchKey(productName) {
    // মডেল নম্বর ও ব্র্যান্ড বের করে গুরুত্বপূর্ণ অংশ নেওয়া
    const cleaned = productName.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const tokens = cleaned.split(' ');
    // কমপক্ষে ২ ক্যারেক্টারের টোকেন, সংখ্যা বা বড় হাতের অক্ষর থাকলে বেশি প্রাধান্য
    const meaningful = tokens.filter(t => t.length > 1);
    // যদি অনেক টোকেন হয় তবে প্রথম ৫টি নেব
    return meaningful.slice(0, 5).join(' ');
  }

  groupByProduct(products, sourceProductName) {
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

  similarity(a, b) {
    const setA = new Set(a.split(' '));
    const setB = new Set(b.split(' '));
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
  }
}

module.exports = new ProductMatcher();
