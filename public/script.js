import { iconMap } from './icons.js';

document.addEventListener('DOMContentLoaded', function() {
    // Initialize markers array and view state
    let markers = [];
    let currentView = 'list'; // 'list' or 'grid'
    let designersData = []; // Store processed data for view switching
    let currentCity = 'Milan'; // Track current city

    // Request guard to avoid race conditions
    let latestFetchId = 0;

    // City configurations - tightened realistic bounds
    const cityConfigs = {
        Milan: {
            center: [45.4642, 9.19],
            zoom: 13,
            // tighter bounds focused on central Milan
            bounds: {
                southWest: [45.44, 9.16],
                northEast: [45.485, 9.22]
            }
        },
        Seoul: {
            center: [37.5665, 126.9784],
            zoom: 13,
            // much tighter bounds focused on central Seoul
            bounds: {
                southWest: [37.52, 126.95],
                northEast: [37.60, 127.00]
            }
        }
    };

    // Map initialization (only once!)
    var map = L.map('map', {
        center: cityConfigs.Milan.center,
        zoom: cityConfigs.Milan.zoom,
        minZoom: 10,
        maxZoom: 18,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        tap: true,
        tapTolerance: 15,
        inertia: false
    });

    // Conditionally enable scroll wheel zoom (enabled on desktop, disabled on touch devices)
    if (!('ontouchstart' in window)) {
        // enable using API so Leaflet registers properly
        if (map.scrollWheelZoom) map.scrollWheelZoom.enable();
        else map.options.scrollWheelZoom = true;
    } else {
        if (map.scrollWheelZoom) map.scrollWheelZoom.disable();
        else map.options.scrollWheelZoom = false;
    }

    // Create pane for tiles and apply filter
    map.createPane('baseTiles');
    map.getPane('baseTiles').style.zIndex = 200;
    map.getPane('baseTiles').style.filter = 'brightness(3)';

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
        pane: 'baseTiles'
    }).addTo(map);

    // Function to update map bounds for the current city
    function updateMapBounds() {
        const config = cityConfigs[currentCity];
        const southWest = L.latLng(config.bounds.southWest[0], config.bounds.southWest[1]);
        const northEast = L.latLng(config.bounds.northEast[0], config.bounds.northEast[1]);
        const bounds = L.latLngBounds(southWest, northEast);

        // Apply realistic bounds with controlled zoom and panning
        const paddedBounds = bounds.pad(0.12);
        map.fitBounds(paddedBounds);
        map.setMaxBounds(paddedBounds);
        map.options.minZoom = map.getZoom(); // prevent zooming out beyond current fit
        map.options.maxBoundsViscosity = 1.0; // enforce boundaries smoothly

        // Remove any previous custom drag handlers if they exist
        map.off('drag');
        map.off('dragend');
    }

    // Initialize bounds for Milan
    updateMapBounds();


    // Instagram SVG icon
    const instagramSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 106 106" fill="none">
<rect x="3.5" y="3.5" width="99" height="99" stroke="white" stroke-width="7"/>
<circle cx="53" cy="61" r="22.5" stroke="white" stroke-width="7"/>
<circle cx="79" cy="25" r="6.5" fill="white" stroke="white"/>
</svg>`;

    // Function that creates a divIcon from the initial
    function getIconForPlace(name) {
        if (!name || typeof name !== 'string') {
            name = 'DEFAULT';
        }
        var firstLetter = name.trim().charAt(0).toUpperCase();
        var svg = iconMap[firstLetter] || iconMap['DEFAULT'];
        return L.divIcon({
            html: svg,
            className: 'custom-div-icon',
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -15]
        });
    }

    // Function to create skeleton cards for loading
    function createSkeletonCards(count = 6) {
        const gridContainer = document.getElementById('grid-container');
        if (!gridContainer) return;
        gridContainer.innerHTML = '';

        for (let i = 0; i < count; i++) {
            const skeletonCard = document.createElement('div');
            skeletonCard.className = 'skeleton-card';
            skeletonCard.innerHTML = `
                <div class="skeleton-image"></div>
                <div class="skeleton-content">
                    <div class="skeleton skeleton-city"></div>
                    <div class="skeleton skeleton-name"></div>
                    <div class="skeleton skeleton-website"></div>
                    <div class="skeleton skeleton-email"></div>
                </div>
            `;
            gridContainer.appendChild(skeletonCard);
        }
    }

    // Function to create designer card for grid view
    function createDesignerCard(designer) {
        const card = document.createElement('div');
        card.className = 'designer-card';
        card.setAttribute('data-lat', designer.Latitude || '');
        card.setAttribute('data-lon', designer.Longitude || '');
        card.setAttribute('data-name', designer.Name);

        let emailLinksHTML = '';
        if (designer.Email || designer.Email2) {
            const emails = [];

            if (designer.Email) {
                emails.push(`<a href="mailto:${designer.Email}" onclick="event.stopPropagation()">${designer.Email}</a>`);
            }

            if (designer.Email2) {
                emails.push(`<a href="mailto:${designer.Email2}" onclick="event.stopPropagation()">${designer.Email2}</a>`);
            }

            emailLinksHTML = emails.join('<br>');
        }

        const imageUrl = designer.Cover || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjM0EzQTNBIi8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2IiBmb250LXNpemU9IjE0Ij5ObyBJbWFnZTwvdGV4dD4KICAKPC9zdmc+Cg==';

        card.innerHTML = `
            <img src="${imageUrl}" alt="${designer.Name}" class="card-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjM0EzQTNBIi8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2IiBmb250LXNpemU9IjE0Ij5ObyBJbWFnZTwvdGV4dD4KICAKPC9zdmc+Cg=='">
            <div class="card-content">
                <div class="card-city">${designer.City || ''}</div>
                <div class="card-name">${designer.Name}</div>
                <div class="card-website">
                    ${designer.Website ? `<a href="${designer.Website}" target="_blank" onclick="event.stopPropagation()">${designer.Website}</a>` : ''}
                </div>
                <div class="card-bottom">
                    <div class="card-email">${emailLinksHTML}</div>
                    ${designer.IG ? `<a href="${designer.IG}" target="_blank" onclick="event.stopPropagation()" class="instagram-link">${instagramSVG}</a>` : ''}
                </div>
            </div>
        `;

        // Add click event to focus on map
        card.addEventListener('click', function() {
            const lat = parseFloat(card.getAttribute('data-lat'));
            const lon = parseFloat(card.getAttribute('data-lon'));
            if (!isNaN(lat) && !isNaN(lon)) {
                map.setView([lat, lon], 16);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });

        return card;
    }

    // Function to render list view
    function renderListView(designers) {
        const placesList = document.getElementById('places-list');
        if (!placesList) return;
        placesList.innerHTML = '';

        designers.forEach(function(designer) {
            const listItem = document.createElement('li');
            listItem.setAttribute('data-lat', designer.Latitude || '');
            listItem.setAttribute('data-lon', designer.Longitude || '');
            listItem.setAttribute('data-name', designer.Name);
            listItem.textContent = designer.Name;
            placesList.appendChild(listItem);
        });
    }

    // Function to render grid view
    function renderGridView(designers) {
        const gridContainer = document.getElementById('grid-container');
        if (!gridContainer) return;
        gridContainer.innerHTML = '';

        designers.forEach(function(designer) {
            const card = createDesignerCard(designer);
            gridContainer.appendChild(card);
        });
    }

    // Function to toggle between views
    function toggleView() {
        const listView = document.getElementById('list-view');
        const gridView = document.getElementById('grid-view');
        const toggleButton = document.getElementById('view-toggle');

        if (currentView === 'list') {
            // Switch to grid
            currentView = 'grid';
            if (listView) listView.classList.add('hidden');
            if (gridView) gridView.classList.remove('hidden');
            if (toggleButton) toggleButton.textContent = '[list]';

            createSkeletonCards();
            // Small delay to show skeleton, then render actual content
            setTimeout(() => {
                renderGridView(designersData);
            }, 300);
        } else {
            // Switch to list
            currentView = 'list';
            if (gridView) gridView.classList.add('hidden');
            if (listView) listView.classList.remove('hidden');
            if (toggleButton) toggleButton.textContent = '[grid]';
        }

        // Re-attach event listeners for the current view
        attachViewEventListeners();
    }

    // Function to attach event listeners based on current view
    function attachViewEventListeners() {
        if (currentView === 'list') {
            document.querySelectorAll('#sidebar li').forEach(function(li) {
                // Remove previous handlers to prevent duplicates
                li.replaceWith(li.cloneNode(true));
            });

            document.querySelectorAll('#sidebar li').forEach(function(li) {
                li.addEventListener('click', function() {
                    const lat = parseFloat(li.dataset.lat);
                    const lon = parseFloat(li.dataset.lon);
                    if (!isNaN(lat) && !isNaN(lon)) {
                        map.setView([lat, lon], 16);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                });
            });
        }
        // Grid view listeners are attached when cards are created
    }

    // Add toggle event listener
    const viewToggleEl = document.getElementById('view-toggle');
    if (viewToggleEl) viewToggleEl.addEventListener('click', toggleView);

    // City toggle functionality
    const cityToggle = document.getElementById('cityToggle');
    const mapLoadingSpinner = document.getElementById('mapLoadingSpinner');

    // Keep one instance and fix logic inside as requested
    if (cityToggle) {
        cityToggle.addEventListener('change', async function() {
            const newCity = cityToggle.value;
            if (newCity === currentCity) return;

            currentCity = newCity;

            // Show loading indicators
            if (mapLoadingSpinner) mapLoadingSpinner.classList.remove('hidden');

            if (currentView === 'grid') {
                createSkeletonCards();
            }

            // Update map view and bounds
            const config = cityConfigs[currentCity];
            if (config) {
                // setView first, then update bounds
                map.setView(config.center, config.zoom);
                updateMapBounds();

                // invalidate size after a short delay to ensure map redraw on layout change
                setTimeout(() => {
                    try { map.invalidateSize(); } catch (e) { /* ignore */ }
                }, 250);
            }

            // Increment fetch id and capture locally to avoid race conditions
            const fetchId = ++latestFetchId;

            // Fetch new data
            await fetchData(fetchId);

            // Hide loading spinner only if this is the latest fetch cycle
            if (mapLoadingSpinner && fetchId === latestFetchId) {
                mapLoadingSpinner.classList.add('hidden');
            }
        });
    }

    // Suggest a Studio modal logic
    const suggestBtn = document.getElementById('suggestStudioBtn');
    const modal = document.getElementById('suggestStudioModal');
    const closeBtn = modal ? modal.querySelector('.suggest-close') : null;
    const cancelBtn = modal ? document.getElementById('cancelSuggest') : null;
    const form = modal ? document.getElementById('suggestStudioForm') : null;
    const hasAddressSelect = modal ? document.getElementById('hasAddress') : null;
    const addressGroup = modal ? document.getElementById('addressGroup') : null;
    const addressInput = modal ? document.getElementById('studioAddress') : null;
    const formMessage = modal ? document.getElementById('formMessage') : null;
    const submitBtn = modal ? document.getElementById('submitSuggest') : null;

    function openModal() {
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        form?.reset();
        if (addressGroup) addressGroup.style.display = 'none';
        if (formMessage) {
            formMessage.textContent = '';
            formMessage.className = 'form-message';
        }
    }

    function closeModal() {
        if (!modal) return;
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
    }

    if (suggestBtn) {
        suggestBtn.addEventListener('click', openModal);
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }
    if (hasAddressSelect && addressGroup && addressInput) {
        hasAddressSelect.addEventListener('change', () => {
            const value = hasAddressSelect.value;
            if (value === 'yes') {
                addressGroup.style.display = '';
            } else {
                addressGroup.style.display = 'none';
                addressInput.value = '';
            }
        });
    }

    async function submitSuggestion(event) {
        event.preventDefault();
        if (!form || !formMessage || !submitBtn) return;

        const name = (document.getElementById('studioName').value || '').trim();
        const website = (document.getElementById('studioWebsite').value || '').trim();
        const instagram = (document.getElementById('studioInstagram').value || '').trim();
        const city = (document.getElementById('studioCity').value || '').trim();
        const hasAddress = (document.getElementById('hasAddress').value || '').trim();
        const address = (document.getElementById('studioAddress').value || '').trim();

        // Validation
        if (!name) {
            formMessage.textContent = 'Studio Name is required.';
            formMessage.className = 'form-message error';
            return;
        }
        if (!city) {
            formMessage.textContent = 'City is required.';
            formMessage.className = 'form-message error';
            return;
        }
        if (!hasAddress) {
            formMessage.textContent = 'Please specify if it has an address.';
            formMessage.className = 'form-message error';
            return;
        }
        if (hasAddress === 'yes' && !address) {
            formMessage.textContent = 'Street Address is required when selecting Yes.';
            formMessage.className = 'form-message error';
            return;
        }

        // Submit
        formMessage.textContent = 'Submitting...';
        formMessage.className = 'form-message loading';
        submitBtn.disabled = true;

        try {
            const res = await fetch('/api/suggest-studio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    website,
                    instagram,
                    city,
                    hasAddress,
                    address
                })
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Request failed with ${res.status}`);
            }

            formMessage.textContent = 'Thanks! Your suggestion was sent.';
            formMessage.className = 'form-message success';
            setTimeout(() => {
                closeModal();
            }, 2000);
        } catch (err) {
            formMessage.textContent = err.message || 'Submission failed. Please try again later.';
            formMessage.className = 'form-message error';
        } finally {
            submitBtn.disabled = false;
        }
    }

    if (form) {
        form.addEventListener('submit', submitSuggestion);
    }

    // fetchData now accepts an optional fetchId for race safety
    async function fetchData(fetchId = null) {
        try {
            // Capture a local id if none passed
            const localFetchId = (typeof fetchId === 'number') ? fetchId : ++latestFetchId;
            const cityParam = encodeURIComponent(currentCity);
            // Fetch data for the current city
            const res = await fetch(`/data?city=${cityParam}`);

            // If another fetch started meanwhile, ignore this response
            if (localFetchId !== latestFetchId) {
                // discard result
                return;
            }

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const items = await res.json();

            // verify still latest after async json parse
            if (localFetchId !== latestFetchId) return;

            console.log("Raw Notion data:", items);

            // Clear existing markers
            markers.forEach(marker => {
                try { map.removeLayer(marker); } catch (e) { /* ignore */ }
            });
            markers = [];

            // Check if items is an array
            if (!Array.isArray(items)) {
                console.error("Expected an array but got:", typeof items, items);
                return;
            }

            // Extract properties from Notion page objects
            const processedItems = items.map(page => {
                const props = page.properties || {};

                // Helper function to extract values from Notion properties
                const getValue = (property) => {
                    if (!property) return null;

                    switch (property.type) {
                        case 'title':
                            return property.title?.[0]?.plain_text || '';
                        case 'rich_text':
                            return property.rich_text?.[0]?.plain_text || '';
                        case 'url':
                            return property.url || '';
                        case 'email':
                            return property.email || '';
                        case 'phone_number':
                            return property.phone_number || '';
                        case 'number':
                            return property.number || '';
                        case 'select':
                            return property.select?.name || '';
                        case 'status':
                            return property.status?.name || '';
                        case 'files':
                            return property.files?.[0]?.file?.url || property.files?.[0]?.external?.url || '';
                        default:
                            return property[property.type] || '';
                    }
                };

                return {
                    Status: getValue(props.Status),
                    Name: getValue(props.Name),
                    Number: getValue(props.Number),
                    City: getValue(props.City),
                    Cover: getValue(props.Cover),
                    Website: getValue(props['Website URL']),
                    IG: getValue(props.IG),
                    Email: getValue(props.Email),
                    Email2: getValue(props['Email 2']),
                    Phone: getValue(props.Phone),
                    Address: getValue(props.Address),
                    Latitude: getValue(props.Latitude),
                    Longitude: getValue(props.Longitude)
                };
            });

            console.log("Processed items:", processedItems);

            // Filter only published items and those matching current city
            const publishedItems = processedItems.filter(item =>
                item &&
                item.Status === "Published" &&
                item.City === currentCity
            );

            // Sort alphabetically by name
            publishedItems.sort((a, b) => a.Name.localeCompare(b.Name));

            // Store processed data globally
            designersData = publishedItems;

            // Render current view
            if (currentView === 'list') {
                renderListView(publishedItems);
            } else {
                renderGridView(publishedItems);
            }

            // Process markers - only for items with coordinates
            const itemsWithCoordinates = publishedItems.filter(item =>
                item.Latitude && item.Longitude
            );

            itemsWithCoordinates.forEach(function(item) {
                const lat = parseFloat(item.Latitude);
                const lon = parseFloat(item.Longitude);
                if (isNaN(lat) || isNaN(lon)) return;

                // Create marker with custom icon
                const marker = L.marker([lat, lon], {
                    icon: getIconForPlace(item.Name)
                }).addTo(map);

                // Create popup content with address if available
                let popupContent = `<strong>${item.Name}</strong>`;
                if (item.Address) {
                    popupContent += `<br>${item.Address}`;
                }

                marker.bindPopup(popupContent);

                // Add click event to center map
                marker.on('click', function() {
                    map.setView(marker.getLatLng(), 16);
                });

                // Store marker reference
                markers.push(marker);
            });

            // Attach event listeners
            attachViewEventListeners();

        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }

    // Fetch on load
    fetchData();

    // Refresh every 30 seconds with race guard
    setInterval(() => {
        // start a new fetch that will be guarded by latestFetchId
        fetchData(++latestFetchId);
    }, 30000);

    // Search functionality - works for both views
    const searchInput = document.querySelector('.toolbar input');
    if (searchInput) {
        searchInput.addEventListener('keyup', function() {
            const filter = searchInput.value.toLowerCase();

            if (currentView === 'list') {
                document.querySelectorAll('#sidebar li').forEach(function(li) {
                    const text = li.textContent.toLowerCase();
                    li.style.display = text.includes(filter) ? '' : 'none';
                });
            } else {
                document.querySelectorAll('.designer-card').forEach(function(card) {
                    const name = (card.getAttribute('data-name') || '').toLowerCase();
                    card.style.display = name.includes(filter) ? '' : 'none';
                });
            }
        });
    }

    // Reset button
    const resetButton = document.querySelector('.toolbar .reset');
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            if (searchInput) {
                searchInput.value = '';
                const event = new Event('keyup');
                searchInput.dispatchEvent(event);
            }
        });
    }
});
