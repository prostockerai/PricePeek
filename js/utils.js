function quickSearch(query) {
    const input = document.getElementById('mainSearch');  // searchInput → mainSearch
    if (input) input.value = query;
    performSearch();  // এখন performSearch mainSearch থেকেই মান পড়বে
    setTimeout(() => {
        const results = document.getElementById('resultsSection');
        if (results) results.scrollIntoView({ behavior: 'smooth' });
    }, 300);
}
