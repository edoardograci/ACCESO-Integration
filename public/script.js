import { iconMap } from './icons.js';

document.addEventListener('DOMContentLoaded', function() {
    // Initialize markers array and view state
    let markers = [];
    let currentView = 'list'; // 'list' or 'grid'
    let designersData = []; // Store processed data for view switching
    
    // Map initialization (only once!)
    var map = L.map('map', {
        center: [45.4642, 9.19],
        zoom: 13,
        minZoom: 12,
        maxZoom: 18
    });

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

    // Define bounds for Milan
    var southWest = L.latLng(45.4, 9.04);
    var northEast = L.latLng(45.535, 9.278);
    var bounds = L.latLngBounds(southWest, northEast);

    map.setMaxBounds(bounds);
    map.on('drag', function() {
        map.panInsideBounds(bounds, { animate: false });
    });

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
        card.setAttribute('data-lat', designer.Latitude);
        card.setAttribute('data-lon', designer.Longitude);
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
                
                // Join emails with a separator (you can change this to <br> for line break)
                emailLinksHTML = emails.join('<br>');
        }
        const imageUrl = designer.Cover || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjM0EzQTNBIi8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2IiBmb250LXNpemU9IjE0Ij5ObyBJbWFnZTwvdGV4dD4KICA8L3N2Zz4K';
        
        card.innerHTML = `
            <img src="${imageUrl}" alt="${designer.Name}" class="card-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjM0EzQTNBIi8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2IiBmb250LXNpemU9IjE0Ij5ObyBJbWFnZTwvdGV4dD4KICA8L3N2Zz4K'">
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
            map.setView([lat, lon], 16);
        });

        return card;
    }

    // Function to render list view
    function renderListView(designers) {
        const placesList = document.getElementById('places-list');
        placesList.innerHTML = '';
        
        designers.forEach(function(designer) {
            const listItem = document.createElement('li');
            listItem.setAttribute('data-lat', designer.Latitude);
            listItem.setAttribute('data-lon', designer.Longitude);
            listItem.setAttribute('data-name', designer.Name);
            listItem.textContent = designer.Name;
            placesList.appendChild(listItem);
        });
    }

    // Function to render grid view
    function renderGridView(designers) {
        const gridContainer = document.getElementById('grid-container');
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
            listView.classList.add('hidden');
            gridView.classList.remove('hidden');
            toggleButton.textContent = '[list]';
            
            if (currentView === 'grid') {
                createSkeletonCards();
                // Small delay to show skeleton, then render actual content
                setTimeout(() => {
                    renderGridView(designersData);
                }, 300);
            }
        } else {
            // Switch to list
            currentView = 'list';
            gridView.classList.add('hidden');
            listView.classList.remove('hidden');
            toggleButton.textContent = '[grid]';
        }
        
        // Re-attach event listeners for the current view
        attachViewEventListeners();
    }

    // Function to attach event listeners based on current view
    function attachViewEventListeners() {
        if (currentView === 'list') {
            document.querySelectorAll('#sidebar li').forEach(function(li) {
                li.addEventListener('click', function() {
                    const lat = parseFloat(li.dataset.lat);
                    const lon = parseFloat(li.dataset.lon);
                    map.setView([lat, lon], 16);
                });
            });
        }
        // Grid view listeners are attached when cards are created
    }

    // Add toggle event listener
    document.getElementById('view-toggle').addEventListener('click', toggleView);

    async function fetchData() {
        try {
            // Replace with your actual API endpoint
            const res = await fetch("/data");
            
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const items = await res.json();

            console.log("Raw Notion data:", items);
            
            // Clear existing markers
            markers.forEach(marker => map.removeLayer(marker));
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
            
            // Filter only published items and those with coordinates
            const publishedItems = processedItems.filter(item => 
                item && 
                item.Status === "Published" && 
                item.Latitude && 
                item.Longitude
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
            
            // Process markers
            publishedItems.forEach(function(item) {
                // Create marker with custom icon
                const marker = L.marker([parseFloat(item.Latitude), parseFloat(item.Longitude)], { 
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

    // Refresh every 30 seconds
    setInterval(fetchData, 30000);

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
                    const name = card.getAttribute('data-name').toLowerCase();
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