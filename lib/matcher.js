class ProductMatcher {
  // লম্বা নাম থেকে গুরুত্বপূর্ণ কীওয়ার্ড বের করে (ব্র্যান্ড + মডেল নম্বর)
  extractSearchKey(productName) {
    if (!productName) return '';
    let cleaned = productName.replace(/[^a-zA-Z0-9\s]/g, ' ')
                             .replace(/\s+/g, ' ')
                             .trim();
    const tokens = cleaned.split(' ');
    // স্টপওয়ার্ড – এই শব্দগুলো বাদ দেব
    const stopWords = ['the', 'with', 'for', 'and', 'inch', 'ips', 'fhd', 'hd', 'led', 'lcd', 'hz', 'new', 'latest', 'original', 'genuine', 'rgb', 'gaming', 'chair', 'mouse', 'keyboard', 'monitor'];
    const meaningful = tokens.filter(t => t.length > 1 && !stopWords.includes(t.toLowerCase()));
    // ব্র্যান্ড (বড় হাতের অক্ষর দিয়ে শুরু) ও মডেল নম্বর (যেকোনো সংখ্যা) প্রাধান্য পাবে
    const brandTokens = meaningful.filter(t => /^[A-Z]/.test(t));
    const modelTokens = meaningful.filter(t => /\d/.test(t));
    const combined = [...new Set([...brandTokens, ...modelTokens, ...meaningful])];
    return combined.slice(0, 4).join(' '); // সর্বোচ্চ ৪টি টোকেন
  }

  // প্রোডাক্ট গ্রুপিং
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

  // জ্যাকার্ড সিমিলারিটি
  similarity(a, b) {
    const setA = new Set(a.split(' ').filter(t => t.length > 0));
    const setB = new Set(b.split(' ').filter(t => t.length > 0));
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  }
}

module.exports = new ProductMatcher();
