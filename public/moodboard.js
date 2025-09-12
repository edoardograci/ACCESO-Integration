// Moodboard functionality (fixed skeleton animation)
class MoodboardManager {
    constructor() {
        this.moodboardData = [];
        this.skeletonCount = 12;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadMoodboard();
    }

    bindEvents() {
        const modal = document.getElementById('imageModal');
        const closeBtn = document.getElementById('closeImageModal');
        if (closeBtn) closeBtn.addEventListener('click', () => this.hideModal());
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.hideModal();
            });
        }
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
