// js/scrapers.js (API-র মাধ্যমে ডাটা আনার ক্লায়েন্ট)
class PricePeekAPI {
  async searchAll(query) {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    return { products: data.products || [], errors: data.errors || [] };
  }
}
const scraperManager = new PricePeekAPI();
