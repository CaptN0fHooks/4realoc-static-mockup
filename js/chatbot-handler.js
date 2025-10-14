/**
 * Custom Chatbot Handler
 * Provides interactive chatbot functionality for property search
 */

class ChatbotHandler {
  constructor() {
    this.isInitialized = false;
    this.conversationHistory = [];
    this.searchParameters = {};
  }

  /**
   * Initialize homepage chatbot
   */
  initializeHomepageChatbot() {
    const input = document.getElementById('chatbotInput');
    const sendBtn = document.getElementById('chatbotSend');
    const messages = document.getElementById('chatbotMessages');
    const status = document.querySelector('#homepageChatbot .chatbot-status span:last-child');

    if (!input || !sendBtn || !messages) {
      console.error('Homepage chatbot elements not found');
      return;
    }

    // Add event listeners
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleUserInput('homepage', input.value.trim());
        input.value = '';
      }
    });

    sendBtn.addEventListener('click', () => {
      this.handleUserInput('homepage', input.value.trim());
      input.value = '';
    });

    // Add quick search example handlers
    this.initializeQuickSearchExamples();

    // Update status
    if (status) {
      status.textContent = 'Ready to help you find properties';
    }

    this.isInitialized = true;
    console.log('Homepage chatbot initialized');
  }

  /**
   * Initialize search page chatbot
   */
  initializeSearchChatbot() {
    const input = document.getElementById('searchChatbotInput');
    const sendBtn = document.getElementById('searchChatbotSend');
    const messages = document.getElementById('searchChatbotMessages');
    const status = document.querySelector('#searchChatbot .chatbot-status span:last-child');

    if (!input || !sendBtn || !messages) {
      console.error('Search chatbot elements not found');
      return;
    }

    // Add event listeners
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleUserInput('search', input.value.trim());
        input.value = '';
      }
    });

    sendBtn.addEventListener('click', () => {
      this.handleUserInput('search', input.value.trim());
      input.value = '';
    });

    // Add quick filter handlers
    this.initializeQuickFilters();

    // Update status
    if (status) {
      status.textContent = 'Ready to refine your search';
    }

    console.log('Search chatbot initialized');
  }

  /**
   * Handle user input
   */
  handleUserInput(type, message) {
    if (!message) return;

    // Add user message to conversation
    this.addMessage(type, message, 'user');

    // Process the message and extract search parameters
    const searchParams = this.extractSearchParameters(message);
    
    if (type === 'homepage') {
      this.handleHomepageSearch(searchParams);
    } else if (type === 'search') {
      this.handleSearchRefinement(searchParams);
    }
  }

  /**
   * Extract search parameters from user message
   */
  extractSearchParameters(message) {
    const params = {};
    const lowerMessage = message.toLowerCase();

    // Extract bedrooms
    const bedMatch = lowerMessage.match(/(\d+)\s*(?:bed|bedroom|br)/);
    if (bedMatch) {
      params.beds = parseInt(bedMatch[1]);
    }

    // Extract bathrooms
    const bathMatch = lowerMessage.match(/(\d+(?:\.\d+)?)\s*(?:bath|bathroom|ba)/);
    if (bathMatch) {
      params.baths = parseFloat(bathMatch[1]);
    }

    // Extract price range
    const priceMatch = lowerMessage.match(/(?:under|below|less than|max)\s*\$?(\d+(?:,\d{3})*(?:k|m)?)/);
    if (priceMatch) {
      let price = priceMatch[1];
      if (price.includes('k')) {
        price = price.replace('k', '000');
      } else if (price.includes('m')) {
        price = price.replace('m', '000000');
      }
      params.price_max = parseInt(price.replace(/,/g, ''));
    }

    const priceMinMatch = lowerMessage.match(/(?:over|above|more than|min)\s*\$?(\d+(?:,\d{3})*(?:k|m)?)/);
    if (priceMinMatch) {
      let price = priceMinMatch[1];
      if (price.includes('k')) {
        price = price.replace('k', '000');
      } else if (price.includes('m')) {
        price = price.replace('m', '000000');
      }
      params.price_min = parseInt(price.replace(/,/g, ''));
    }

    // Extract cities
    const cities = ['newport beach', 'laguna beach', 'irvine', 'costa mesa', 'huntington beach', 'dana point', 'san clemente', 'mission viejo'];
    for (const city of cities) {
      if (lowerMessage.includes(city)) {
        params.city = city;
        break;
      }
    }

    // Extract property types
    if (lowerMessage.includes('condo') || lowerMessage.includes('condominium')) {
      params.property_type = 'condo';
    } else if (lowerMessage.includes('townhouse') || lowerMessage.includes('townhome')) {
      params.property_type = 'townhouse';
    } else if (lowerMessage.includes('single family') || lowerMessage.includes('house')) {
      params.property_type = 'single family';
    }

    // Extract features
    if (lowerMessage.includes('pool')) {
      params.features = (params.features || []).concat(['pool']);
    }
    if (lowerMessage.includes('waterfront') || lowerMessage.includes('water front')) {
      params.features = (params.features || []).concat(['waterfront']);
    }
    if (lowerMessage.includes('new construction') || lowerMessage.includes('new build')) {
      params.features = (params.features || []).concat(['new_construction']);
    }

    return params;
  }

  /**
   * Handle homepage search
   */
  handleHomepageSearch(params) {
    // Add bot response
    let response = "Great! I understand you're looking for: ";
    if (Object.keys(params).length > 0) {
      const criteria = [];
      if (params.beds) criteria.push(`${params.beds} bedroom${params.beds > 1 ? 's' : ''}`);
      if (params.baths) criteria.push(`${params.baths} bathroom${params.baths > 1 ? 's' : ''}`);
      if (params.price_max) criteria.push(`under $${this.formatPrice(params.price_max)}`);
      if (params.price_min) criteria.push(`over $${this.formatPrice(params.price_min)}`);
      if (params.city) criteria.push(`in ${params.city}`);
      if (params.property_type) criteria.push(`${params.property_type}s`);
      response += criteria.join(', ') + ". ";
    }
    response += "For real, current listings with live MLS data, click the 'View Real Listings' button below!";

    this.addMessage('homepage', response, 'bot');

    // Add follow-up message
    setTimeout(() => {
      this.addMessage('homepage', "The AI Search Demo shows how the interface works, but for actual property hunting, you'll want the real MLS listings.", 'bot');
    }, 2000);
  }

  /**
   * Handle search refinement
   */
  handleSearchRefinement(params) {
    // Update current search parameters
    this.searchParameters = { ...this.searchParameters, ...params };

    // Add bot response
    let response = "I've updated your search criteria! ";
    if (Object.keys(params).length > 0) {
      response += "I've added: ";
      const criteria = [];
      if (params.beds) criteria.push(`${params.beds} bedroom${params.beds > 1 ? 's' : ''}`);
      if (params.baths) criteria.push(`${params.baths} bathroom${params.baths > 1 ? 's' : ''}`);
      if (params.price_max) criteria.push(`under $${this.formatPrice(params.price_max)}`);
      if (params.price_min) criteria.push(`over $${this.formatPrice(params.price_min)}`);
      if (params.city) criteria.push(`${params.city}`);
      if (params.property_type) criteria.push(`${params.property_type}s`);
      response += criteria.join(', ') + ". ";
    }
    response += "For real listings with these criteria, use the 'View Real MLS Listings' button above!";

    this.addMessage('search', response, 'bot');

    // Add follow-up message
    setTimeout(() => {
      this.addMessage('search', "This demo shows how the AI interface works, but for actual property hunting, you'll want the real MLS listings with current data.", 'bot');
    }, 2000);
  }

  /**
   * Build search URL with parameters
   */
  buildSearchUrl(params) {
    const url = new URL('search.html', window.location.origin);
    
    Object.keys(params).forEach(key => {
      if (Array.isArray(params[key])) {
        params[key].forEach(value => {
          url.searchParams.append(key, value);
        });
      } else {
        url.searchParams.set(key, params[key]);
      }
    });

    return url.toString();
  }

  /**
   * Add message to conversation
   */
  addMessage(type, message, sender) {
    const messagesId = type === 'homepage' ? 'chatbotMessages' : 'searchChatbotMessages';
    const messages = document.getElementById(messagesId);
    
    if (!messages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = message;
    
    messageDiv.appendChild(contentDiv);
    messages.appendChild(messageDiv);
    
    // Scroll to bottom
    messages.scrollTop = messages.scrollHeight;

    // Add to conversation history
    this.conversationHistory.push({ sender, message, timestamp: Date.now() });
  }

  /**
   * Initialize quick search examples
   */
  initializeQuickSearchExamples() {
    const chips = document.querySelectorAll('.example-chips .chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const message = chip.textContent.replace(/"/g, '');
        document.getElementById('chatbotInput').value = message;
        this.handleUserInput('homepage', message);
      });
    });
  }

  /**
   * Initialize quick filters
   */
  initializeQuickFilters() {
    const chips = document.querySelectorAll('.filter-chips .chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const filter = chip.dataset.filter;
        let message = '';
        
        switch (filter) {
          case 'price_under_1m':
            message = 'show me homes under $1M';
            break;
          case 'price_1m_to_2m':
            message = 'show me homes between $1M and $2M';
            break;
          case 'price_over_2m':
            message = 'show me homes over $2M';
            break;
          case 'newport_beach':
            message = 'show me homes in Newport Beach';
            break;
          case 'laguna_beach':
            message = 'show me homes in Laguna Beach';
            break;
          case 'with_pool':
            message = 'add a pool filter';
            break;
          case 'waterfront':
            message = 'show me waterfront properties';
            break;
          case 'new_construction':
            message = 'show me new construction only';
            break;
        }
        
        if (message) {
          document.getElementById('searchChatbotInput').value = message;
          this.handleUserInput('search', message);
        }
      });
    });
  }

  /**
   * Format price for display
   */
  formatPrice(price) {
    if (price >= 1000000) {
      return (price / 1000000).toFixed(1) + 'M';
    } else if (price >= 1000) {
      return (price / 1000).toFixed(0) + 'K';
    }
    return price.toLocaleString();
  }
}

// Initialize global chatbot handler
window.chatbotHandler = new ChatbotHandler();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize homepage chatbot
  if (document.getElementById('homepageChatbot')) {
    window.chatbotHandler.initializeHomepageChatbot();
  }
  
  // Initialize search chatbot
  if (document.getElementById('searchChatbot')) {
    window.chatbotHandler.initializeSearchChatbot();
  }
});