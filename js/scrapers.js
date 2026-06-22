// js/scrapers.js
class PricePeekAPI {
  async searchAll(query) {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    return { products: data.products || [], errors: data.errors || [] };
  }
}
const scraperManager = new PricePeekAPI();
