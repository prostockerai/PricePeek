class ProductMatcher {
  // আগের extractSearchKey-কে আরও কার্যকরী করা হলো
  extractSearchKey(productName) {
    if (!productName) return '';
    // সংখ্যা ও অক্ষর বাদে বাকি সব স্পেস দিয়ে রিপ্লেস
    let cleaned = productName.replace(/[^a-zA-Z0-9\s]/g, ' ')
                             .replace(/\s+/g, ' ')
                             .trim();
    const tokens = cleaned.split(' ');
    // অপ্রয়োজনীয় শব্দ বাদ দিন (স্টপওয়ার্ড)
    const stopWords = ['the', 'with', 'for', 'and', 'inch', 'ips', 'fhd', 'hd', 'led', 'lcd', 'hz', 'new', 'latest', 'original', 'genuine'];
    const meaningful = tokens.filter(t => t.length > 1 && !stopWords.includes(t.toLowerCase()));
    // ব্র্যান্ড ও মডেল নম্বর প্রায়োরিটি
    const brandTokens = meaningful.filter(t => /^[A-Z]/.test(t));
    const modelTokens = meaningful.filter(t => /\d/.test(t));
    const combined = [...new Set([...brandTokens, ...modelTokens, ...meaningful])];
    return combined.slice(0, 4).join(' ');
  }

  // আগের মতোই
  groupByProduct(products, sourceProductName) { /* ... */ }
  similarity(a, b) { /* ... */ }
}
module.exports = new ProductMatcher();
