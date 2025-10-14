/* ==========================================================================
   Real OC — Map Handler (Leaflet Integration)
   ========================================================================== */

/**
 * Map Handler for Leaflet/OpenStreetMap Integration
 * Handles property markers, clustering, and map interactions
 */

class MapHandler {
  constructor() {
    this.map = null;
    this.markers = [];
    this.markerCluster = null;
    this.propertyMarkers = new Map(); // Map to store property data for each marker
    this.selectedProperty = null;
    this.isInitialized = false;
    
    // Orange County center coordinates
    this.defaultCenter = [33.7175, -117.8311];
    this.defaultZoom = 11;
  }

  /**
   * Initialize the map
   */
  initializeMap(containerId = 'propertyMap') {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Map container not found:', containerId);
      return false;
    }

    try {
      // Clear any existing placeholder content
      container.innerHTML = '';

      // Initialize Leaflet map
      this.map = L.map(containerId, {
        center: this.defaultCenter,
        zoom: this.defaultZoom,
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        dragging: true,
        keyboard: true,
        touchZoom: true
      });

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(this.map);

      // Initialize marker cluster group
      this.markerCluster = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 15
      });

      this.map.addLayer(this.markerCluster);

      // Add custom CSS for markers
      this.addCustomMarkerStyles();

      // Initialize map controls
      this.initializeMapControls();

      this.isInitialized = true;
      console.log('Map initialized successfully');
      return true;

    } catch (error) {
      console.error('Error initializing map:', error);
      this.showMapError(container);
      return false;
    }
  }

  /**
   * Add properties to the map
   */
  addProperties(properties) {
    if (!this.isInitialized || !this.map) {
      console.error('Map not initialized');
      return;
    }

    // Clear existing markers
    this.clearMarkers();

    if (!properties || properties.length === 0) {
      this.showNoPropertiesMessage();
      return;
    }

    // Add markers for each property
    properties.forEach((property, index) => {
      this.addPropertyMarker(property, index);
    });

    // Fit map to show all markers
    this.fitMapToMarkers();

    console.log(`Added ${properties.length} properties to map`);
  }

  /**
   * Add a single property marker
   */
  addPropertyMarker(property, index) {
    // Handle both old and new coordinate formats
    const lat = property.latitude || property.coordinates?.lat;
    const lng = property.longitude || property.coordinates?.lng;
    
    if (!lat || !lng) {
      console.warn('Property missing coordinates:', property);
      return;
    }

    // Create custom icon
    const icon = this.createPropertyIcon(property, index);

    // Create marker
    const marker = L.marker([lat, lng], { icon: icon });

    // Store property data
    this.propertyMarkers.set(marker._leaflet_id, property);

    // Add popup
    const popup = this.createPropertyPopup(property);
    marker.bindPopup(popup);

    // Add click event
    marker.on('click', () => {
      this.onMarkerClick(property, marker);
    });

    // Add to cluster group
    this.markerCluster.addLayer(marker);
    this.markers.push(marker);
  }

  /**
   * Create custom property icon
   */
  createPropertyIcon(property, index) {
    const isTop5 = index < 5;
    const price = this.formatPrice(property.price);
    
    // Create icon HTML
    const iconHtml = `
      <div class="custom-marker ${isTop5 ? 'top5' : ''}">
        <div class="marker-price">${price}</div>
        ${isTop5 ? `<div class="marker-rank">#${index + 1}</div>` : ''}
      </div>
    `;

    return L.divIcon({
      html: iconHtml,
      className: 'custom-div-icon',
      iconSize: [60, 30],
      iconAnchor: [30, 15],
      popupAnchor: [0, -15]
    });
  }

  /**
   * Create property popup content
   */
  createPropertyPopup(property) {
    const formatted = window.propertyAPI ? window.propertyAPI.formatPropertyForUI(property) : property;
    
    return `
      <div class="map-popup">
        <div class="popup-image" style="background-image: url('${formatted.image}')"></div>
        <div class="popup-content">
          <div class="popup-price">${formatted.price}</div>
          <div class="popup-address">${formatted.address}</div>
          <div class="popup-features">${formatted.beds} bed • ${formatted.baths} bath • ${formatted.sqft}</div>
          <div class="popup-actions">
            <button class="popup-btn view-details" onclick="window.location.href='${formatted.url}'">
              View Details
            </button>
            <button class="popup-btn book-showing" onclick="window.open('mailto:michaelrichard.re@gmail.com?subject=Book a Showing for ${formatted.address}', '_blank')">
              Book Showing
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Handle marker click
   */
  onMarkerClick(property, marker) {
    this.selectedProperty = property;
    
    // Highlight corresponding property card
    this.highlightPropertyCard(property);
    
    // Center map on marker
    this.map.setView([property.coordinates.lat, property.coordinates.lng], Math.max(this.map.getZoom(), 15));
    
    // Open popup
    marker.openPopup();
  }

  /**
   * Highlight property card in the results grid
   */
  highlightPropertyCard(property) {
    // Remove existing highlights
    document.querySelectorAll('.property-card.highlighted').forEach(card => {
      card.classList.remove('highlighted');
    });

    // Find and highlight the matching card
    const cards = document.querySelectorAll('.property-card');
    cards.forEach(card => {
      const address = card.querySelector('.property-address');
      if (address && address.textContent.includes(property.city)) {
        card.classList.add('highlighted');
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  /**
   * Center map on property
   */
  centerOnProperty(property) {
    if (!this.map) return;
    
    const lat = property.latitude || property.coordinates?.lat;
    const lng = property.longitude || property.coordinates?.lng;
    
    if (!lat || !lng) return;

    this.map.setView([lat, lng], 16);
    
    // Find and click the corresponding marker
    this.markers.forEach(marker => {
      const markerProperty = this.propertyMarkers.get(marker._leaflet_id);
      if (markerProperty && markerProperty.mlsNumber === property.mlsNumber) {
        marker.openPopup();
      }
    });
  }

  /**
   * Fit map to show all markers
   */
  fitMapToMarkers() {
    if (this.markers.length === 0) return;

    const group = new L.featureGroup(this.markers);
    this.map.fitBounds(group.getBounds().pad(0.1));
  }

  /**
   * Clear all markers
   */
  clearMarkers() {
    this.markerCluster.clearLayers();
    this.markers = [];
    this.propertyMarkers.clear();
  }

  /**
   * Show no properties message
   */
  showNoPropertiesMessage() {
    const container = document.getElementById('propertyMap');
    if (container) {
      container.innerHTML = `
        <div class="map-placeholder">
          <div class="map-icon">📍</div>
          <h4>No Properties Found</h4>
          <p>Try adjusting your search criteria</p>
          <div class="map-status">
            <span class="status-indicator"></span>
            <span>No properties to display on map</span>
          </div>
        </div>
      `;
    }
  }

  /**
   * Show map error
   */
  showMapError(container) {
    container.innerHTML = `
      <div class="map-placeholder">
        <div class="map-icon">⚠️</div>
        <h4>Map Error</h4>
        <p>Unable to load the interactive map</p>
        <div class="map-status">
          <span class="status-indicator"></span>
          <span>Please refresh the page or contact support</span>
        </div>
      </div>
    `;
  }

  /**
   * Initialize map controls
   */
  initializeMapControls() {
    // Center map button
    const centerBtn = document.getElementById('centerMap');
    if (centerBtn) {
      centerBtn.addEventListener('click', () => {
        this.fitMapToMarkers();
      });
    }

    // Toggle clusters button
    const toggleBtn = document.getElementById('toggleClusters');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.toggleClustering();
      });
    }

    // Fullscreen button
    const fullscreenBtn = document.getElementById('fullscreenMap');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        this.toggleFullscreen();
      });
    }
  }

  /**
   * Toggle marker clustering
   */
  toggleClustering() {
    if (!this.markerCluster) return;

    const isClustered = this.map.hasLayer(this.markerCluster);
    
    if (isClustered) {
      this.map.removeLayer(this.markerCluster);
      this.markers.forEach(marker => this.map.addLayer(marker));
    } else {
      this.markers.forEach(marker => this.map.removeLayer(marker));
      this.map.addLayer(this.markerCluster);
    }
  }

  /**
   * Toggle fullscreen map
   */
  toggleFullscreen() {
    const mapContainer = document.getElementById('propertyMap');
    if (!mapContainer) return;

    if (!document.fullscreenElement) {
      mapContainer.requestFullscreen().then(() => {
        setTimeout(() => this.map.invalidateSize(), 100);
      });
    } else {
      document.exitFullscreen().then(() => {
        setTimeout(() => this.map.invalidateSize(), 100);
      });
    }
  }

  /**
   * Add custom marker styles
   */
  addCustomMarkerStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .custom-div-icon {
        background: transparent !important;
        border: none !important;
      }
      
      .custom-marker {
        background: var(--gold);
        color: var(--navy-1);
        border: 2px solid var(--navy-1);
        border-radius: 8px;
        padding: 4px 8px;
        font-weight: 700;
        font-size: 0.8rem;
        text-align: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        position: relative;
        min-width: 50px;
      }
      
      .custom-marker.top5 {
        background: var(--gold);
        border-color: var(--navy-1);
        animation: pulse 2s infinite;
      }
      
      .marker-price {
        font-size: 0.75rem;
        line-height: 1.2;
      }
      
      .marker-rank {
        position: absolute;
        top: -8px;
        right: -8px;
        background: var(--navy-1);
        color: var(--gold);
        border-radius: 50%;
        width: 16px;
        height: 16px;
        font-size: 0.6rem;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
      }
      
      .map-popup {
        max-width: 300px;
      }
      
      .popup-image {
        height: 120px;
        background-size: cover;
        background-position: center;
        border-radius: 8px 8px 0 0;
        margin: -10px -10px 10px -10px;
      }
      
      .popup-content {
        padding: 0 10px 10px 10px;
      }
      
      .popup-price {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--navy-1);
        margin-bottom: 4px;
      }
      
      .popup-address {
        font-size: 0.9rem;
        color: var(--navy-1);
        margin-bottom: 4px;
        line-height: 1.3;
      }
      
      .popup-features {
        font-size: 0.8rem;
        color: rgba(13,27,42,0.7);
        margin-bottom: 8px;
      }
      
      .popup-actions {
        display: flex;
        gap: 6px;
      }
      
      .popup-btn {
        flex: 1;
        padding: 6px 8px;
        border: none;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .popup-btn.view-details {
        background: var(--navy-1);
        color: var(--ivory);
      }
      
      .popup-btn.book-showing {
        background: var(--gold);
        color: var(--navy-1);
      }
      
      .popup-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      }
      
      .property-card.highlighted {
        border-color: var(--gold) !important;
        box-shadow: 0 0 20px rgba(201,166,107,0.5) !important;
        transform: scale(1.02);
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Format price for display
   */
  formatPrice(price) {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
      return `$${(price / 1000).toFixed(0)}K`;
    }
    return `$${price.toLocaleString()}`;
  }

  /**
   * Get map instance (for external access)
   */
  getMap() {
    return this.map;
  }

  /**
   * Check if map is initialized
   */
  isMapReady() {
    return this.isInitialized && this.map !== null;
  }
}

// Export for use in other modules
window.MapHandler = MapHandler;

// Create global instance
window.mapHandler = new MapHandler();
