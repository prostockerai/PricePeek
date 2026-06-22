// js/scrapers.js
class PricePeekAPI {
  async searchAll(query) {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    return { products: data.products || [], errors: data.errors || [] };
  }

  async searchByUrl(url) {
    const res = await fetch(`/api/search?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    return data; // returns { products, matchedGroups, sourceProduct, errors }
  }
}

const scraperManager = new PricePeekAPI();
