/* ==========================================================================
   Real OC — Search Handler (Search Page Orchestration)
   ========================================================================== */

/**
 * Search Handler for Search Page Orchestration
 * Manages URL parameter parsing, search execution, and page coordination
 */

class SearchHandler {
  constructor() {
    this.currentFilters = {};
    this.searchResults = [];
    this.top5Results = [];
    this.allResults = [];
    this.isLoading = false;
    this.currentPage = 1;
    this.resultsPerPage = 12;
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  /**
   * Initialize the search handler
   */
  async initialize() {
    console.log('Initializing Search Handler...');
    
    try {
      // Parse URL parameters
      this.currentFilters = this.parseURLParameters();
      
      // Update search summary
      this.updateSearchSummary(this.currentFilters);
      
      // Load search results
      await this.loadSearchResults(this.currentFilters);
      
      // Initialize page components
      this.initializeHeroTop5();
      this.initializeTop10Listings();
      this.initializeTop5Carousel();
      this.initializeQuickFilters();
      this.initializeMap();
      this.initializeChatbot();
      
      console.log('Search Handler initialized successfully');
      
    } catch (error) {
      console.error('Error initializing Search Handler:', error);
      this.showErrorState();
    }
  }

  /**
   * Parse URL parameters into search filters
   */
  parseURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const filters = {};
    
    // Parse common search parameters
    if (urlParams.get('beds')) filters.beds = parseInt(urlParams.get('beds'));
    if (urlParams.get('baths')) filters.baths = parseInt(urlParams.get('baths'));
    if (urlParams.get('price_min')) filters.price_min = parseInt(urlParams.get('price_min'));
    if (urlParams.get('price_max')) filters.price_max = parseInt(urlParams.get('price_max'));
    if (urlParams.get('city')) filters.city = urlParams.get('city');
    if (urlParams.get('state')) filters.state = urlParams.get('state');
    if (urlParams.get('zip')) filters.zip = urlParams.get('zip');
    if (urlParams.get('property_type')) filters.property_type = urlParams.get('property_type');
    if (urlParams.get('sqft_min')) filters.sqft_min = parseInt(urlParams.get('sqft_min'));
    if (urlParams.get('sqft_max')) filters.sqft_max = parseInt(urlParams.get('sqft_max'));
    if (urlParams.get('year_built_min')) filters.year_built_min = parseInt(urlParams.get('year_built_min'));
    if (urlParams.get('year_built_max')) filters.year_built_max = parseInt(urlParams.get('year_built_max'));
    if (urlParams.get('has_pool')) filters.has_pool = urlParams.get('has_pool') === 'true';
    if (urlParams.get('waterfront')) filters.waterfront = urlParams.get('waterfront') === 'true';
    if (urlParams.get('new_construction')) filters.new_construction = urlParams.get('new_construction') === 'true';
    
    // Parse special parameters
    if (urlParams.get('mls')) filters.mls = urlParams.get('mls');
    if (urlParams.get('limit')) filters.limit = parseInt(urlParams.get('limit'));
    if (urlParams.get('offset')) filters.offset = parseInt(urlParams.get('offset'));
    
    console.log('Parsed URL parameters:', filters);
    return filters;
  }

  /**
   * Update search summary in hero section
   */
  updateSearchSummary(filters) {
    const searchSummary = document.getElementById('searchSummary');
    const activeFilters = document.getElementById('activeFilters');
    const resultCount = document.getElementById('resultCount');
    
    if (!searchSummary || !activeFilters) return;
    
    // Keep the original "Property Search" text, don't override it
    // searchSummary.textContent = "Property Search"; // Keep original text
    
    // Build search summary text for active filters display
    const summaryParts = [];
    
    if (filters.city) summaryParts.push(filters.city);
    if (filters.beds) summaryParts.push(`${filters.beds} bedroom${filters.beds > 1 ? 's' : ''}`);
    if (filters.price_min || filters.price_max) {
      const priceRange = this.formatPriceRange(filters.price_min, filters.price_max);
      summaryParts.push(priceRange);
    }
    if (filters.property_type) summaryParts.push(filters.property_type.toLowerCase());
    
    const summaryText = summaryParts.length > 0 
      ? `Searching for ${summaryParts.join(', ')}`
      : 'Searching all Orange County properties';
    
    // Update active filters display
    this.updateActiveFiltersDisplay(filters);
    
    // Keep original "Top 5 Results" text - don't override it
    // if (resultCount) {
    //   resultCount.textContent = '0';
    // }
  }

  /**
   * Update active filters display
   */
  updateActiveFiltersDisplay(filters) {
    const activeFilters = document.getElementById('activeFilters');
    if (!activeFilters) return;
    
    // Clear existing filters
    activeFilters.innerHTML = '';
    
    // Add filter chips for each active filter
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        const filterChip = this.createFilterChip(key, filters[key]);
        activeFilters.appendChild(filterChip);
      }
    });
    
    // If no filters, show "All Properties"
    if (activeFilters.children.length === 0) {
      const allChip = document.createElement('div');
      allChip.className = 'filter active';
      allChip.textContent = 'All Properties';
      activeFilters.appendChild(allChip);
    }
  }

  /**
   * Create a filter chip element
   */
  createFilterChip(key, value) {
    const chip = document.createElement('div');
    chip.className = 'filter active';
    
    let displayText = '';
    switch (key) {
      case 'beds':
        displayText = `${value} bed${value > 1 ? 's' : ''}`;
        break;
      case 'baths':
        displayText = `${value} bath${value > 1 ? 's' : ''}`;
        break;
      case 'price_min':
        displayText = `From ${this.formatPrice(value)}`;
        break;
      case 'price_max':
        displayText = `Under ${this.formatPrice(value)}`;
        break;
      case 'city':
        displayText = value;
        break;
      case 'property_type':
        displayText = value;
        break;
      case 'has_pool':
        displayText = 'With Pool';
        break;
      case 'waterfront':
        displayText = 'Waterfront';
        break;
      case 'new_construction':
        displayText = 'New Construction';
        break;
      default:
        displayText = `${key}: ${value}`;
    }
    
    chip.textContent = displayText;
    
    // Add click handler to remove filter
    chip.addEventListener('click', () => {
      this.removeFilter(key);
    });
    
    return chip;
  }

  /**
   * Remove a filter and reload search
   */
  removeFilter(key) {
    delete this.currentFilters[key];
    this.updateURL();
    this.loadSearchResults(this.currentFilters);
  }

  /**
   * Load search results from API
   */
  async loadSearchResults(filters) {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.showLoadingState();
    
    try {
      console.log('Loading search results with filters:', filters);
      
      // Use the Property API to search
      if (window.propertyAPI) {
        const response = await window.propertyAPI.searchProperties(filters);
        this.searchResults = response.listings || [];
        this.allResults = [...this.searchResults];
        
        // Sort results by relevance/price
        this.sortResults();
        
        // Get top 5 results
        this.top5Results = this.searchResults.slice(0, 5);
        
        console.log(`Loaded ${this.searchResults.length} search results`);
        console.log('Top 5 results:', this.top5Results);
        
        // Update UI with results
        this.updateResultsDisplay();
        this.updateResultCount();
        
      } else {
        throw new Error('Property API not available');
      }
      
    } catch (error) {
      console.error('Error loading search results:', error);
      this.showErrorState();
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Sort results by relevance
   */
  sortResults() {
    this.searchResults.sort((a, b) => {
      // Priority: price (ascending), then beds (descending), then sqft (descending)
      const priceA = this.parsePrice(a.price);
      const priceB = this.parsePrice(b.price);
      
      if (priceA !== priceB) return priceA - priceB;
      if (a.beds !== b.beds) return b.beds - a.beds;
      return (b.sqft || 0) - (a.sqft || 0);
    });
  }

  /**
   * Update results display
   */
  updateResultsDisplay() {
    // Update Top 5 carousel
    this.updateTop5Carousel();
    
    // Update all results grid
    this.updateAllResultsGrid();
    
    // Update map
    this.updateMap();
  }

  /**
   * Update Top 5 carousel
   */
  updateTop5Carousel() {
    const heroTop5 = document.getElementById('heroTop5');
    if (!heroTop5) return;

    const carouselTrack = heroTop5.querySelector('.top5-container');
    if (!carouselTrack) return;
    
    // Clear existing cards
    carouselTrack.innerHTML = '';
    
    // Add top 5 property cards
    this.top5Results.forEach((property, index) => {
      const card = this.createTop5Card(property, index);
      carouselTrack.appendChild(card);
    });
    
    // If no results, show message
    if (this.top5Results.length === 0) {
      carouselTrack.innerHTML = `
        <div class="top5-card no-results">
          <div class="card-details">
            <div class="card-price">No Properties Found</div>
            <div class="card-address">Try adjusting your search criteria</div>
            <div class="card-features">Contact Michael for assistance</div>
          </div>
        </div>
      `;
    }
  }

  /**
   * Create Top 5 property card with accessibility
   */
  createTop5Card(property, rank) {
    const formatted = window.propertyAPI ? window.propertyAPI.formatPropertyForUI(property) : property;
    
    const card = document.createElement('div');
    card.className = 'top5-card';
    card.setAttribute('role', 'article');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Property ${rank}: ${formatted.address}, ${formatted.price}`);
    
    card.innerHTML = `
      <div class="card-image" style="background-image: url('${formatted.image}')" aria-hidden="true">
        <div class="card-rank" aria-label="Rank ${rank}">#${rank}</div>
        <div class="card-price" aria-label="Price ${formatted.price}">${formatted.price}</div>
      </div>
      <div class="card-details">
        <div class="card-address">${formatted.address}</div>
        <div class="card-features">${formatted.beds} bed • ${formatted.baths} bath • ${formatted.sqft}</div>
        <div class="card-type">${formatted.propertyType}</div>
      </div>
    `;
    
    // Add click handler
    card.addEventListener('click', () => {
      this.onPropertyClick(formatted);
    });
    
    // Add keyboard handler
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.onPropertyClick(formatted);
      }
    });
    
    return card;
  }

  /**
   * Update all results grid
   */
  updateAllResultsGrid() {
    const resultsGrid = document.getElementById('allResultsGrid');
    if (!resultsGrid) return;
    
    // Clear existing cards
    resultsGrid.innerHTML = '';
    
    // Add property cards
    this.searchResults.forEach(property => {
      const card = this.createPropertyCard(property);
      resultsGrid.appendChild(card);
    });
    
    // Show/hide load more button
    this.updateLoadMoreButton();
  }

  /**
   * Create property card for results grid with accessibility
   */
  createPropertyCard(property) {
    const formatted = window.propertyAPI ? window.propertyAPI.formatPropertyForUI(property) : property;
    
    const card = document.createElement('div');
    card.className = 'property-card';
    card.setAttribute('role', 'article');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Property: ${formatted.address}, ${formatted.price}`);
    
    card.innerHTML = `
      <div class="property-image" style="background-image: url('${formatted.image}')" aria-hidden="true">
        <div class="property-price" aria-label="Price ${formatted.price}">${formatted.price}</div>
      </div>
      <div class="property-details">
        <div class="property-address">${formatted.address}</div>
        <div class="property-features">${formatted.beds} bed • ${formatted.baths} bath • ${formatted.sqft}</div>
        <div class="property-type">${formatted.propertyType}</div>
      </div>
    `;
    
    // Add click handler
    card.addEventListener('click', () => {
      this.onPropertyClick(formatted);
    });
    
    // Add keyboard handler
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.onPropertyClick(formatted);
      }
    });
    
    return card;
  }

  /**
   * Update map with search results
   */
  updateMap() {
    if (window.mapHandler && window.mapHandler.isMapReady()) {
      // Convert search results to map format
      const mapProperties = this.searchResults.map(property => {
        const formatted = window.propertyAPI ? window.propertyAPI.formatPropertyForUI(property) : property;
        return {
          ...formatted,
          coordinates: {
            lat: formatted.latitude || 33.7175,
            lng: formatted.longitude || -117.8311
          }
        };
      });
      
      window.mapHandler.addProperties(mapProperties);
    }
  }

  /**
   * Handle property click
   */
  onPropertyClick(property) {
    console.log('Property clicked:', property);
    
    // Center map on property
    if (window.mapHandler && window.mapHandler.isMapReady()) {
      window.mapHandler.centerOnProperty(property);
    }
    
    // Scroll to property details or open in new tab
    // For now, just log - can be extended to show property details modal
  }

  /**
   * Update result count
   */
  updateResultCount() {
    // Keep original "Top 5 Results" text - don't override it
    // const resultCount = document.getElementById('resultCount');
    // if (resultCount) {
    //   resultCount.textContent = this.searchResults.length.toLocaleString();
    // }
  }

  /**
   * Update load more button
   */
  updateLoadMoreButton() {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (!loadMoreBtn) return;
    
    // For now, hide load more button since we're showing all results
    // This can be implemented for pagination later
    loadMoreBtn.style.display = 'none';
  }

  /**
   * Initialize Top 5 carousel
   */
  initializeTop5Carousel() {
    const heroTop5 = document.getElementById('heroTop5');
    if (!heroTop5) {
      console.log('heroTop5 not found');
      return;
    }
    
    const track = heroTop5.querySelector('.top5-container');
    if (!track) {
      console.log('top5-container not found');
      return;
    }
    
    console.log('Initializing carousel, track width:', track.scrollWidth, 'client width:', track.clientWidth);
    
    // Add hover scroll behavior
    let isScrolling = false;
    let scrollInterval = null;
    
    track.addEventListener('mouseenter', () => {
      console.log('Mouse entered carousel');
      if (!isScrolling && track.scrollWidth > track.clientWidth) {
        isScrolling = true;
        let scrollPosition = track.scrollLeft;
        const scrollSpeed = 2;
        
        scrollInterval = setInterval(() => {
          if (scrollPosition < track.scrollWidth - track.clientWidth) {
            scrollPosition += scrollSpeed;
            track.scrollLeft = scrollPosition;
          } else {
            clearInterval(scrollInterval);
            isScrolling = false;
          }
        }, 30);
      }
    });
    
    track.addEventListener('mouseleave', () => {
      console.log('Mouse left carousel');
      isScrolling = false;
      if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
      }
    });
  }

  /**
   * Initialize quick filters with keyboard support
   */
  initializeQuickFilters() {
    const filterChips = document.querySelectorAll('.filter-chips .chip');
    
    filterChips.forEach(chip => {
      // Make chips focusable
      chip.setAttribute('tabindex', '0');
      chip.setAttribute('role', 'button');
      
      // Click handler
      chip.addEventListener('click', () => {
        const filterType = chip.dataset.filter;
        this.applyQuickFilter(filterType);
      });
      
      // Keyboard handler
      chip.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const filterType = chip.dataset.filter;
          this.applyQuickFilter(filterType);
        }
      });
    });
  }

  /**
   * Apply quick filter
   */
  applyQuickFilter(filterType) {
    const newFilters = { ...this.currentFilters };
    
    switch (filterType) {
      case 'price_under_1m':
        newFilters.price_max = 1000000;
        break;
      case 'price_1m_to_2m':
        newFilters.price_min = 1000000;
        newFilters.price_max = 2000000;
        break;
      case 'price_over_2m':
        newFilters.price_min = 2000000;
        break;
      case 'newport_beach':
        newFilters.city = 'Newport Beach';
        break;
      case 'laguna_beach':
        newFilters.city = 'Laguna Beach';
        break;
      case 'with_pool':
        newFilters.has_pool = true;
        break;
      case 'waterfront':
        newFilters.waterfront = true;
        break;
      case 'new_construction':
        newFilters.new_construction = true;
        break;
    }
    
    this.currentFilters = newFilters;
    this.updateURL();
    this.loadSearchResults(this.currentFilters);
  }

  /**
   * Initialize map
   */
  initializeMap() {
    if (window.mapHandler) {
      // Map will be initialized when results are loaded
      console.log('Map handler available, will initialize with results');
    }
  }

  /**
   * Update URL with current filters
   */
  updateURL() {
    const params = new URLSearchParams();
    
    Object.keys(this.currentFilters).forEach(key => {
      if (this.currentFilters[key] !== null && this.currentFilters[key] !== undefined) {
        params.append(key, this.currentFilters[key]);
      }
    });
    
    const newURL = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newURL);
  }

  /**
   * Show loading state
   */
  showLoadingState() {
    // Loading states are handled by the existing loading cards in HTML
    console.log('Showing loading state...');
  }

  /**
   * Show error state
   */
  showErrorState() {
    const top5Track = document.getElementById('top5Track');
    const allResultsGrid = document.getElementById('allResultsGrid');
    
    if (top5Track) {
      top5Track.innerHTML = `
        <div class="top5-card error">
          <div class="card-details">
            <div class="card-price">Search Error</div>
            <div class="card-address">Unable to load properties</div>
            <div class="card-features">Please try again or contact Michael</div>
          </div>
        </div>
      `;
    }
    
    if (allResultsGrid) {
      allResultsGrid.innerHTML = `
        <div class="property-card error">
          <div class="property-details">
            <div class="property-price">Search Error</div>
            <div class="property-address">Unable to load properties</div>
            <div class="property-features">Please try again or contact Michael</div>
          </div>
        </div>
      `;
    }
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
   * Format price range
   */
  formatPriceRange(min, max) {
    if (min && max) {
      return `${this.formatPrice(min)} - ${this.formatPrice(max)}`;
    } else if (min) {
      return `From ${this.formatPrice(min)}`;
    } else if (max) {
      return `Under ${this.formatPrice(max)}`;
    }
    return '';
  }

  /**
   * Parse price string to number
   */
  parsePrice(priceStr) {
    if (typeof priceStr === 'number') return priceStr;
    if (typeof priceStr === 'string') {
      return parseInt(priceStr.replace(/[^0-9]/g, '')) || 0;
    }
    return 0;
  }

  /**
   * Initialize Hero Top 5 results
   */
  initializeHeroTop5() {
    const heroTop5 = document.getElementById('heroTop5');
    if (!heroTop5) return;

    const container = heroTop5.querySelector('.top5-container');
    if (!container) return;

    // Clear loading cards
    container.innerHTML = '';

    // Add top 5 results to hero
    this.top5Results.slice(0, 5).forEach((property, index) => {
      const card = this.createTop5Card(property, index);
      container.appendChild(card);
    });
  }

  /**
   * Initialize Top 10 listings
   */
  initializeTop10Listings() {
    const top10Grid = document.getElementById('top10Grid');
    if (!top10Grid) return;

    // Clear loading cards
    top10Grid.innerHTML = '';

    // Add top 10 results
    this.searchResults.slice(0, 10).forEach((property, index) => {
      const card = this.createPropertyCard(property, index);
      top10Grid.appendChild(card);
    });
  }

  /**
   * Get current search state
   */
  getSearchState() {
    return {
      filters: this.currentFilters,
      results: this.searchResults,
      top5: this.top5Results,
      isLoading: this.isLoading,
      currentPage: this.currentPage
    };
  }
}

// Export for use in other modules
window.SearchHandler = SearchHandler;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.searchHandler = new SearchHandler();
  });
} else {
  window.searchHandler = new SearchHandler();
}
