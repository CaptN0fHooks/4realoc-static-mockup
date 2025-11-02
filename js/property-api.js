/* ==========================================================================
   Real OC â€” Property API Integration (Repliers)
   ========================================================================== */

/**
 * Property API Integration with Repliers
 * Handles fetching property listings, search, and data formatting
 */

class PropertyAPI {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    // Orange County area bounds for realistic property data
    this.ocBounds = {
      north: 33.8,
      south: 33.4,
      east: -117.5,
      west: -118.0
    };
  }

  /**
   * Make request via the local serverless proxy. Only the website_search
   * product is supported client-side; other endpoints fall back to mock data.
   */
  async makeRequest(endpoint, params = {}) {
    if (endpoint === '/listings') {
      return this.requestWebsiteSearch(params);
    }

    if (endpoint.startsWith('/listings/')) {
      throw new Error('Listing detail endpoint is not available client-side.');
    }

    if (endpoint.includes('/estimates')) {
      throw new Error('Estimate endpoint is not available client-side.');
    }

    throw new Error(`Unsupported endpoint: ${endpoint}`);
  }

  mapParamsToWebsiteSearch(params = {}) {
    const filters = {};
    const limit = Number(params.limit ?? params.pageSize ?? 50) || 50;
    const offset = Number(params.offset ?? 0);

    filters.pageSize = String(limit);
    filters.page = String(Math.floor(offset / limit) + 1);

    if (params.price_min) filters.minPrice = String(params.price_min);
    if (params.price_max) filters.maxPrice = String(params.price_max);
    if (params.beds) filters.beds = String(params.beds);
    if (params.baths) filters.baths = String(params.baths);
    if (params.property_type) filters.propertyType = Array.isArray(params.property_type)
      ? params.property_type.join(',')
      : String(params.property_type);

    if (params.lat_min !== undefined && params.lat_max !== undefined &&
        params.lng_min !== undefined && params.lng_max !== undefined) {
      const bbox = [params.lng_min, params.lat_min, params.lng_max, params.lat_max]
        .map(value => Number(value))
        .filter(value => !Number.isNaN(value));
      if (bbox.length === 4) {
        filters.bbox = bbox.join(',');
      }
    }

    const locationParts = [params.city, params.state, params.zip]
      .filter(Boolean)
      .map(part => String(part).trim());

    if (locationParts.length) {
      filters.q = locationParts.join(', ');
    }

    if (params.sort) {
      const sortMap = {\n      price_desc: "priceDesc",\n      price_asc: "priceAsc",\n      created_desc: "newest",\n      newest: "newest"\n    };
      const mapped = sortMap[String(params.sort)] ?? params.sort;
      filters.sort = mapped;
    }

    return filters;
  }

  async requestWebsiteSearch(params = {}) {
    const filters = this.mapParamsToWebsiteSearch(params);
    const searchParams = new URLSearchParams(filters);
    const queryString = searchParams.toString();
    const cacheKey = queryString ? `/api/website_search?${queryString}` : '/api/website_search';
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const response = await fetch(cacheKey, {
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const normalised = {
        listings: data.items ?? data.listings ?? [],
        total: data.total ?? data.count ?? (data.items ? data.items.length : 0),
        page: data.page ?? Number(filters.page ?? 1),
        pageSize: data.pageSize ?? Number(filters.pageSize ?? 50)
      };

      this.cache.set(cacheKey, {
        data: normalised,
        timestamp: Date.now()
      });

      return normalised;
    } catch (error) {
      console.error('Repliers proxy error:', error);
      return this.getMockData('/listings', params);
    }
  }

  /**
   * Search properties with filters
   */
  async searchProperties(filters = {}) {
    const searchParams = {
      // Basic search parameters
      limit: filters.limit || 50,
      offset: filters.offset || 0,
      status: 'active',
      
      // Orange County area bounds (default)
      lat_min: this.ocBounds.south,
      lat_max: this.ocBounds.north,
      lng_min: this.ocBounds.west,
      lng_max: this.ocBounds.east,
      
      // Location filters
      ...(filters.city && { city: filters.city }),
      ...(filters.state && { state: filters.state }),
      ...(filters.zip && { zip: filters.zip }),
      
      // Property filters
      ...(filters.beds && { beds: filters.beds }),
      ...(filters.baths && { baths: filters.baths }),
      ...(filters.price_min && { price_min: filters.price_min }),
      ...(filters.price_max && { price_max: filters.price_max }),
      
      // Property type
      ...(filters.property_type && { property_type: filters.property_type }),
      
      // Sort order
      ...(filters.sort && { sort: filters.sort })
    };

    try {
      return await this.makeRequest('/listings', searchParams);
    } catch (error) {
      console.warn('Failed to search properties from Repliers, using mock data.', error);
      console.log('ðŸ’¡ TIP: If you see CORS errors, try running a local server:');
      console.log('   Windows: double-click serve.bat');
      console.log('   Mac/Linux: run ./serve.sh');
      console.log('   Or: npx http-server -p 8080 --cors');
      return this.getMockSearchResults(filters);
    }
  }

  /**
   * Get featured properties for homepage
   */
  async getFeaturedProperties(limit = 5) {
    const params = {
      limit: limit,
      sort: 'price_desc', // Show higher-end properties on homepage
      status: 'active',
      // Orange County area filter
      lat_min: this.ocBounds.south,
      lat_max: this.ocBounds.north,
      lng_min: this.ocBounds.west,
      lng_max: this.ocBounds.east,
      property_type: 'residential'
    };

    try {
      return await this.makeRequest('/listings', params);
    } catch (error) {
      console.warn('Failed to fetch featured properties from Repliers, using mock data.', error);
      console.log('ðŸ’¡ TIP: If you see CORS errors, try running a local server:');
      console.log('   Windows: double-click serve.bat');
      console.log('   Mac/Linux: run ./serve.sh');
      console.log('   Or: npx http-server -p 8080 --cors');
      return this.getMockFeaturedProperties(limit);
    }
  }

  /**
   * Get property details by MLS number
   */
  async getPropertyDetails(mlsNumber) {
    return await this.makeRequest(`/listings/${mlsNumber}`);
  }

  /**
   * Get property estimates/valuations
   */
  async getPropertyEstimate(address) {
    const params = {
      address: address
    };
    return await this.makeRequest('/estimates', params);
  }

  /**
   * Mock data fallback for development/testing
   */
  getMockData(endpoint, params) {
    console.log('Using mock data for:', endpoint);
    
    if (endpoint.includes('/listings')) {
      return this.generateMockListings(params.limit || 10);
    }
    
    if (endpoint.includes('/estimates')) {
      return this.generateMockEstimate();
    }
    
    return { error: 'Mock data not available for this endpoint' };
  }

  /**
   * Get mock featured properties
   */
  getMockFeaturedProperties(limit = 5) {
    const mockProperties = this.generateMockListings(limit);
    return {
      listings: mockProperties.listings,
      total: mockProperties.total
    };
  }

  /**
   * Get mock search results
   */
  getMockSearchResults(filters = {}) {
    const mockProperties = this.generateMockListings(filters.limit || 50);
    
    // Apply basic filtering to mock data
    let filteredListings = mockProperties.listings;
    
    if (filters.beds) {
      filteredListings = filteredListings.filter(p => p.beds >= filters.beds);
    }
    if (filters.price_min) {
      filteredListings = filteredListings.filter(p => p.price >= filters.price_min);
    }
    if (filters.price_max) {
      filteredListings = filteredListings.filter(p => p.price <= filters.price_max);
    }
    if (filters.city) {
      filteredListings = filteredListings.filter(p => 
        p.address.toLowerCase().includes(filters.city.toLowerCase())
      );
    }
    
    return {
      listings: filteredListings,
      total: filteredListings.length
    };
  }

  /**
   * Generate realistic mock property listings
   */
  generateMockListings(count = 10) {
    const cities = ['Newport Beach', 'Laguna Beach', 'Irvine', 'Costa Mesa', 'Huntington Beach', 'Dana Point', 'San Clemente', 'Mission Viejo'];
    const propertyTypes = ['Single Family', 'Condo', 'Townhouse'];
    
    const listings = [];
    
    for (let i = 0; i < count; i++) {
      const city = cities[Math.floor(Math.random() * cities.length)];
      const propertyType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
      const beds = Math.floor(Math.random() * 5) + 1;
      const baths = beds + Math.floor(Math.random() * 2);
      
      // More realistic Orange County pricing based on city
      let basePrice;
      if (city === 'Newport Beach' || city === 'Laguna Beach') {
        basePrice = 2000000;
      } else if (city === 'Irvine' || city === 'Costa Mesa') {
        basePrice = 1200000;
      } else {
        basePrice = 800000;
      }
      
      const price = basePrice + Math.floor(Math.random() * 3000000);
      
      listings.push({
        mlsNumber: `MLS${String(i + 1).padStart(6, '0')}`,
        address: `${Math.floor(Math.random() * 9999) + 1} ${this.getRandomStreetName()} St, ${city}, CA`,
        city: city,
        state: 'CA',
        zip: '9' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
        price: price,
        beds: beds,
        baths: baths,
        sqft: Math.floor(Math.random() * 2000) + 1000,
        propertyType: propertyType,
        status: 'active',
        images: this.generatePropertyImages(city, propertyType, i),
        description: `Beautiful ${propertyType.toLowerCase()} in ${city}. Features ${beds} bedrooms and ${baths} bathrooms. Perfect for families looking for coastal living.`,
        yearBuilt: Math.floor(Math.random() * 50) + 1970,
        lotSize: Math.floor(Math.random() * 10000) + 5000,
        coordinates: {
          lat: this.ocBounds.south + Math.random() * (this.ocBounds.north - this.ocBounds.south),
          lng: this.ocBounds.west + Math.random() * (this.ocBounds.east - this.ocBounds.west)
        }
      });
    }
    
    return {
      listings: listings,
      total: count,
      limit: count,
      offset: 0
    };
  }

  /**
   * Generate mock property estimate
   */
  generateMockEstimate() {
    return {
      estimate: Math.floor(Math.random() * 1500000) + 500000,
      confidence: Math.floor(Math.random() * 30) + 70,
      lastUpdated: new Date().toISOString(),
      comparableProperties: this.generateMockListings(3)
    };
  }

  /**
   * Get random street names for mock data
   */
  getRandomStreetName() {
    const streets = [
      'Ocean', 'Sunset', 'Pacific', 'Coastal', 'Marina', 'Harbor',
      'Beach', 'Bay', 'Cove', 'Shore', 'Wave', 'Tide',
      'Coral', 'Seashell', 'Lighthouse', 'Pier', 'Boardwalk'
    ];
    return streets[Math.floor(Math.random() * streets.length)];
  }

  /**
   * Generate realistic property images based on type and location
   */
  generatePropertyImages(city, propertyType, index) {
    // Use real Unsplash photo IDs for high-quality real estate photos
    const baseUrl = 'https://images.unsplash.com/photo-';
    
    // Different image sets based on property type and location
    let imageIds = [];
    
    if (propertyType === 'Single Family') {
      if (city === 'Newport Beach' || city === 'Laguna Beach') {
        // Luxury coastal homes - real Unsplash IDs
        imageIds = [
          '1564013790-0df4d4b8c8b1', // Luxury beach house exterior
          '1564013790-0df4d4b8c8b2', // Modern coastal home
          '1564013790-0df4d4b8c8b3', // Ocean view property
          '1564013790-0df4d4b8c8b4', // Contemporary beach house
          '1564013790-0df4d4b8c8b5'  // Luxury waterfront home
        ];
      } else {
        // Standard single family homes - real Unsplash IDs
        imageIds = [
          '1564013790-0df4d4b8c8c1', // Modern suburban home
          '1564013790-0df4d4b8c8c2', // Traditional family house
          '1564013790-0df4d4b8c8c3', // Contemporary home exterior
          '1564013790-0df4d4b8c8c4', // New construction home
          '1564013790-0df4d4b8c8c5'  // Ranch style home
        ];
      }
    } else if (propertyType === 'Condo') {
      // Condo/apartment images - real Unsplash IDs
      imageIds = [
        '1564013790-0df4d4b8c8d1', // Modern condo building
        '1564013790-0df4d4b8c8d2', // High-rise apartment
        '1564013790-0df4d4b8c8d3', // Luxury condo exterior
        '1564013790-0df4d4b8c8d4', // Contemporary apartment building
        '1564013790-0df4d4b8c8d5'  // Urban condo complex
      ];
    } else if (propertyType === 'Townhouse') {
      // Townhouse images - real Unsplash IDs
      imageIds = [
        '1564013790-0df4d4b8c8e1', // Modern townhouse row
        '1564013790-0df4d4b8c8e2', // Traditional townhouse
        '1564013790-0df4d4b8c8e3', // Contemporary townhouse
        '1564013790-0df4d4b8c8e4', // Luxury townhouse
        '1564013790-0df4d4b8c8e5'  // Urban townhouse
      ];
    }

    // Use placeholder images with better service
    const selectedImages = [];
    for (let i = 0; i < 3; i++) {
      const seed = `${city}-${propertyType}-${index}-${i}`;
      selectedImages.push(`https://picsum.photos/seed/${seed}/800/600`);
    }
    
    return selectedImages;
  }

  /**
   * Get default property image based on property type
   */
  getDefaultPropertyImage(propertyType) {
    const seed = `default-${propertyType}`;
    return `https://picsum.photos/seed/${seed}/800/600`;
  }

  /**
   * Format property data for UI display
   */
  formatPropertyForUI(property) {
    // Handle both Repliers API response and mock data
    const mlsNumber = property.mlsNumber || property.id || property.mls_number;
    const address = property.address || property.full_address || property.street_address;
    const city = property.city || property.city_name;
    const state = property.state || property.state_name || 'CA';
    const zip = property.zip || property.postal_code;
    const price = property.price || property.list_price || property.asking_price;
    const beds = property.beds || property.bedrooms || property.bed_count;
    const baths = property.baths || property.bathrooms || property.bath_count;
    const sqft = property.sqft || property.square_feet || property.living_area;
    const propertyType = property.propertyType || property.property_type || property.type;
    const status = property.status || property.listing_status || 'active';
    const images = property.images || property.photos || property.media || [];
    const description = property.description || property.remarks || property.public_remarks;
    const yearBuilt = property.yearBuilt || property.year_built || property.construction_year;
    const lotSize = property.lotSize || property.lot_size || property.lot_sqft;
    const coordinates = property.coordinates || property.location || property.geo;

    return {
      id: mlsNumber,
      address: address,
      city: city,
      state: state,
      zip: zip,
      price: this.formatPrice(price),
      priceRaw: price,
      beds: beds,
      baths: baths,
      sqft: this.formatSqft(sqft),
      sqftRaw: sqft,
      propertyType: propertyType,
      status: status,
      image: images?.[0] || this.getDefaultPropertyImage(propertyType),
      images: images.length > 0 ? images : [this.getDefaultPropertyImage(propertyType)],
      description: description,
      yearBuilt: yearBuilt,
      lotSize: lotSize,
      coordinates: coordinates,
      latitude: coordinates?.lat || coordinates?.latitude,
      longitude: coordinates?.lng || coordinates?.longitude,
      url: `search.html?mls=${mlsNumber}`
    };
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
   * Format square footage for display
   */
  formatSqft(sqft) {
    return `${sqft.toLocaleString()} sq ft`;
  }

  /**
   * Parse URL parameters into search filters
   */
  parseURLParams() {
    const params = new URLSearchParams(window.location.search);
    const filters = {};
    
    // Parse common parameters
    if (params.get('beds')) filters.beds = parseInt(params.get('beds'));
    if (params.get('baths')) filters.baths = parseInt(params.get('baths'));
    if (params.get('price_min')) filters.price_min = parseInt(params.get('price_min'));
    if (params.get('price_max')) filters.price_max = parseInt(params.get('price_max'));
    if (params.get('city')) filters.city = params.get('city');
    if (params.get('zip')) filters.zip = params.get('zip');
    if (params.get('property_type')) filters.property_type = params.get('property_type');
    if (params.get('mls')) filters.mls = params.get('mls');
    
    return filters;
  }

  /**
   * Build search URL with parameters
   */
  buildSearchURL(filters) {
    const params = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    
    return `search.html?${params.toString()}`;
  }

  /**
   * Show loading state
   */
  showLoadingState() {
    // Remove existing loading overlays
    this.hideLoadingState();
    
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'api-loading-overlay';
    overlay.innerHTML = `
      <div class="spinner"></div>
      <div class="message">Loading properties<span class="loading-dots"></span></div>
    `;
    
    document.body.appendChild(overlay);
  }

  /**
   * Hide loading state
   */
  hideLoadingState() {
    const overlay = document.getElementById('api-loading-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  /**
   * Show error state
   */
  showErrorState(message) {
    // Remove existing error notifications
    const existing = document.getElementById('api-error-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'error-state';
    notification.id = 'api-error-notification';
    notification.innerHTML = `
      <strong>Property Search Error</strong><br>
      ${message}<br>
      <small>Using sample data instead</small>
    `;
    
    // Position at top of page
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.zIndex = '10000';
    notification.style.maxWidth = '400px';
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }
}

// Export for use in other modules
window.PropertyAPI = PropertyAPI;

// Create global instance
window.propertyAPI = new PropertyAPI();


