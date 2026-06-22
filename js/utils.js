// ============ UTILITY FUNCTIONS ============

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function formatPrice(price) {
    if (!price) return 'N/A';
    return '৳' + Number(price).toLocaleString('en-BD');
}

function getMarketplaceClass(marketplace) {
    return 'marketplace-' + marketplace.toLowerCase().replace(/[^a-z]/g, '');
}

function scrollToSearch() {
    document.getElementById('heroSection').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('searchInput').focus();
}

function quickSearch(query) {
    document.getElementById('searchInput').value = query;
    performSearch();
    setTimeout(() => {
        document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
    }, 300);
}

function calculateDiscount(price, originalPrice) {
    if (!originalPrice || !price || originalPrice <= price) return 0;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Coupon copied: ' + text, 'success');
    }).catch(() => {
        showNotification('Failed to copy coupon', 'error');
    });
}

function refreshResults() {
    const query = document.getElementById('searchInput').value.trim();
    if (query) {
        performSearch(true);
    } else {
        showDealsPage(true);
    }
}

function updateLastUpdated() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-BD', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('lastUpdated').textContent = 'Last updated: ' + timeString;
}