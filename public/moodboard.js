// Moodboard functionality with semantic search (fallback to text-based similarity)
class MoodboardManager {
    constructor() {
        this.moodboardData = [];
        this.skeletonCount = 12;
        this.isSearching = false;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadMoodboard();
    }

    bindEvents() {
        const modal = document.getElementById('imageModal');
        const closeBtn = document.getElementById('closeImageModal');
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');

        if (closeBtn) closeBtn.addEventListener('click', () => this.hideModal());
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.hideModal();
            });
        }

        // Search functionality
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        }

        if (searchButton) {
            searchButton.addEventListener('click', () => this.performSearch());
        }
    }

    async performSearch() {
        if (this.isSearching) return;

        const searchInput = document.getElementById('searchInput');
        const query = searchInput?.value?.trim();
        
        if (!query) {
            // If no query, show all items in original order
            await this.renderGrid(this.moodboardData);
            return;
        }

        this.isSearching = true;
        const searchButton = document.getElementById('searchButton');
        if (searchButton) {
            searchButton.textContent = 'Searching...';
            searchButton.disabled = true;
        }

        try {
            console.log(`🔍 Searching for: "${query}"`);
            
            // Calculate similarity scores for all items using text-based similarity
            const scoredItems = this.calculateTextSimilarity(query);
            
            // Sort by relevance score (highest first)
            scoredItems.sort((a, b) => b.score - a.score);
            
            // Log results
            console.log('📊 Search Results:');
            scoredItems.forEach(item => {
                console.log(`${item.name} - Similarity Score: ${item.score.toFixed(3)}`);
            });
            
            // Re-render grid with sorted items
            await this.renderGrid(scoredItems);
            
        } catch (error) {
            console.error('❌ Search failed:', error);
        } finally {
            this.isSearching = false;
            if (searchButton) {
                searchButton.textContent = 'Search';
                searchButton.disabled = false;
            }
        }
    }

    parseKeywords(keywordsString) {
        if (!keywordsString) return [];
        return keywordsString.split(',')
            .map(keyword => keyword.trim().toLowerCase())
            .filter(keyword => keyword.length > 0);
    }

    calculateTextSimilarity(query) {
        const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 0);
        const scoredItems = [];

        for (const item of this.moodboardData) {
            const keywords = this.parseKeywords(item.keywords);
            if (keywords.length === 0) {
                // Items without keywords get a score of 0
                scoredItems.push({ ...item, score: 0 });
                continue;
            }

            let totalSimilarity = 0;
            let matchCount = 0;

            // Calculate similarity for each query word
            for (const queryWord of queryWords) {
                let bestMatch = 0;
                
                // Find the best matching keyword for this query word
                for (const keyword of keywords) {
                    const similarity = this.calculateWordSimilarity(queryWord, keyword);
                    bestMatch = Math.max(bestMatch, similarity);
                }
                
                totalSimilarity += bestMatch;
                if (bestMatch > 0.3) { // Threshold for considering it a match
                    matchCount++;
                }
            }

            // Calculate final score: average similarity + bonus for multiple matches
            const avgSimilarity = queryWords.length > 0 ? totalSimilarity / queryWords.length : 0;
            const matchBonus = (matchCount / queryWords.length) * 0.2; // Bonus for matching multiple words
            const finalScore = avgSimilarity + matchBonus;

            scoredItems.push({ ...item, score: finalScore });
        }

        return scoredItems;
    }

    calculateWordSimilarity(word1, word2) {
        // Exact match
        if (word1 === word2) return 1.0;
        
        // Contains match (one word contains the other)
        if (word1.includes(word2) || word2.includes(word1)) return 0.8;
        
        // Levenshtein distance for fuzzy matching
        const distance = this.levenshteinDistance(word1, word2);
        const maxLength = Math.max(word1.length, word2.length);
        const similarity = 1 - (distance / maxLength);
        
        // Only return similarity if it's above a threshold
        return similarity > 0.6 ? similarity : 0;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    async loadMoodboard() {
        try {
            this.showLoading(true);
            const response = await fetch('/api/moodboard');
            if (!response.ok) throw new Error('Failed to fetch moodboard');
            const data = await response.json();
            this.moodboardData = Array.isArray(data) ? data : [];
            await new Promise(r => setTimeout(r, 250)); // brief delay to show skeleton
            await this.renderGrid(this.moodboardData);
        } catch (e) {
            console.error(e);
            this.showError('Failed to load moodboard');
        } finally {
            this.showLoading(false);
        }
    }

    async renderGrid(items) {
        const grid = document.getElementById('moodboardGrid');
        if (!grid) return;

        grid.classList.add('moodboard-grid');
        grid.innerHTML = '';

        if (!items || items.length === 0) {
            this.showEmptyState();
            return;
        }

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'mood-card';

            const wrap = document.createElement('div');
            wrap.className = 'mood-card-imgwrap';
            wrap.style.position = 'relative';
            wrap.style.overflow = 'hidden';

            // Skeleton overlay
            const skImage = document.createElement('div');
            skImage.className = 'skeleton-image';
            skImage.style.position = 'absolute';
            skImage.style.top = '0';
            skImage.style.left = '0';
            skImage.style.width = '100%';
            skImage.style.height = '100%';
            skImage.style.zIndex = '6';

            const img = document.createElement('img');
            img.className = 'moodboard-image';
            img.alt = item.name || 'Moodboard image';
            img.loading = 'lazy';
            img.decoding = 'async';
            img.style.opacity = '0';
            img.style.transition = 'opacity 220ms ease';

            let cityBadge = null;
            if (item.city) {
                cityBadge = document.createElement('div');
                cityBadge.className = 'city-badge';
                cityBadge.textContent = item.city;
                cityBadge.style.opacity = '0';
                cityBadge.style.transition = 'opacity 200ms ease';
                cityBadge.style.zIndex = '12';
                card.appendChild(cityBadge);
            }

            const reveal = () => {
                if (skImage.parentNode) skImage.parentNode.removeChild(skImage);
                img.style.opacity = '1';
                if (cityBadge) cityBadge.style.opacity = '1';
            };

            img.addEventListener('load', reveal, { once: true });
            img.addEventListener('error', () => {
                if (skImage.parentNode) skImage.parentNode.removeChild(skImage);
                img.style.opacity = '1';
                img.alt = 'Image failed to load';
                if (cityBadge) cityBadge.style.opacity = '1';
            }, { once: true });

            // Delay src assignment to ensure skeleton paints first
            requestAnimationFrame(() => {
                img.src = item.imageUrl || '';
            });

            wrap.appendChild(img);
            wrap.appendChild(skImage);
            card.appendChild(wrap);

            card.addEventListener('click', () => this.openModal(item));
            grid.appendChild(card);
        });

        this.hideEmptyState();
    }

    openModal(item) {
        const modal = document.getElementById('imageModal');
        const img = document.getElementById('modalImage');
        const name = document.getElementById('modalName');
        const meta = document.getElementById('modalMeta');
        const city = document.getElementById('modalCity');

        if (!modal) return;
        if (img) {
            img.loading = 'eager';
            img.decoding = 'async';
            img.src = item.imageUrl || '';
            img.alt = item.name || 'Moodboard image';
        }
        if (name) name.textContent = item.name || '';
        if (city) city.textContent = item.city || '';

        if (meta) {
            meta.innerHTML = `
                ${item.designer ? `<div>DESIGNER: ${item.designer}</div>` : ''}
                ${item.year ? `<div>YEAR: ${item.year}</div>` : ''}
                ${item.client ? `<div>CLIENT: ${item.client}</div>` : ''}
                ${item.link ? `<div><a href="${item.link}" target="_blank" rel="noopener noreferrer">WEBSITE</a></div>` : ''}
            `;
        }

        modal.style.display = 'flex';
    }

    hideModal() {
        const modal = document.getElementById('imageModal');
        if (modal) modal.style.display = 'none';
    }

    renderSkeletons() {
        const grid = document.getElementById('moodboardGrid');
        if (!grid) return;
        grid.innerHTML = '';
        grid.classList.add('moodboard-grid');
        for (let i = 0; i < this.skeletonCount; i++) {
            const skCard = document.createElement('div');
            skCard.className = 'skeleton-card mood-card';

            const skWrap = document.createElement('div');
            skWrap.className = 'mood-card-imgwrap';
            skWrap.style.position = 'relative';

            const skImg = document.createElement('div');
            skImg.className = 'skeleton-image';
            skImg.style.width = '100%';
            skImg.style.height = '250px';
            skImg.style.minHeight = '250px';

            skWrap.appendChild(skImg);
            skCard.appendChild(skWrap);

            const skContent = document.createElement('div');
            skContent.className = 'skeleton-content';
            const skCity = document.createElement('div');
            skCity.className = 'skeleton skeleton-city';
            const skName = document.createElement('div');
            skName.className = 'skeleton skeleton-name';
            skContent.appendChild(skCity);
            skContent.appendChild(skName);
            skCard.appendChild(skContent);

            grid.appendChild(skCard);
        }
    }

    clearSkeletons() {
        const grid = document.getElementById('moodboardGrid');
        if (!grid) return;
        grid.querySelectorAll('.skeleton-card, .skeleton-image, .skeleton').forEach(n => n.remove());
    }

    showLoading(show) {
        const loadingContainer = document.getElementById('loadingContainer');
        if (loadingContainer) loadingContainer.style.display = 'none';
        if (show) {
            this.renderSkeletons();
        } else {
            this.clearSkeletons();
        }
    }

    showEmptyState() {
        const emptyState = document.getElementById('emptyState');
        const grid = document.getElementById('moodboardGrid');
        if (emptyState) emptyState.style.display = 'block';
        if (grid) grid.style.display = 'none';
    }

    hideEmptyState() {
        const emptyState = document.getElementById('emptyState');
        if (emptyState) emptyState.style.display = 'none';
    }

    showError(message) {
        console.error(message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MoodboardManager();
});