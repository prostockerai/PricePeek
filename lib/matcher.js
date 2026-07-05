class ProductMatcher {
  extractSearchKey(productName) {
    if (!productName) return '';
    // স্পেশাল ক্যারেকটার মুছে, স্পেস দিয়ে রিপ্লেস
    let cleaned = productName.replace(/[^a-zA-Z0-9\s]/g, ' ')
                             .replace(/\s+/g, ' ')
                             .trim();
    const tokens = cleaned.split(' ');
    // অপ্রয়োজনীয় শব্দ বাদ দিন
    const stopWords = ['the', 'with', 'for', 'and', 'inch', 'ips', 'fhd', 'hd', 'led', 'lcd', 'hz', 'new', 'latest', 'original', 'genuine', 'rgb', 'gaming', 'chair'];
    const meaningful = tokens.filter(t => t.length > 1 && !stopWords.includes(t.toLowerCase()));
    // ব্র্যান্ড ও মডেল নম্বর প্রাধান্য পাবে
    const brandTokens = meaningful.filter(t => /^[A-Z]/.test(t));
    const modelTokens = meaningful.filter(t => /\d/.test(t));
    const combined = [...new Set([...brandTokens, ...modelTokens, ...meaningful])];
    return combined.slice(0, 4).join(' ');
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
    return union.size === 0 ? 0 : intersection.size / union.size;
  }
}

module.exports = new ProductMatcher();
