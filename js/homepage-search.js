import {
  parseUserQueryToFilters,
  filtersToQueryString,
  filtersToSession,
  mergeFilters,
  getFiltersFromSession
} from './filters.js';

function createMessageElement(role, text) {
  const message = document.createElement('div');
  message.className = `message ${role}-message`;

  const bubble = document.createElement('div');
  bubble.className = 'message-content';
  bubble.textContent = text;
  message.appendChild(bubble);

  return message;
}

function scrollMessages(container) {
  if (!container) return;
  container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}

function normalizeFilters(baseFilters, parsedFilters) {
  const merged = mergeFilters(baseFilters, parsedFilters);
  merged.page = 1;
  return merged;
}

function redirectWithFilters(filters) {
  filtersToSession(filters);
  const query = filtersToQueryString(filters);
  const target = query ? `search.html?${query}` : 'search.html';
  window.location.href = target;
}

function initHomepageChat() {
  const form = document.getElementById('homepageChatForm');
  const input = document.getElementById('homepageChatInput');
  const messages = document.getElementById('homepageChatMessages');
  const examples = document.querySelectorAll('[data-search-example]');

  if (!form || !input || !messages) return;

  const baseFilters = getFiltersFromSession();

  form.addEventListener('submit', event => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) return;

    messages.appendChild(createMessageElement('user', query));
    scrollMessages(messages);
    input.value = '';

    const parsed = parseUserQueryToFilters(query);
    if (!Object.keys(parsed).length) {
      messages.appendChild(createMessageElement('bot', 'I can look for neighborhoods, price ranges, beds/baths, pools, and more. Try “HB or Newport, under 1.2M, 3+ beds, pool”.'));
      scrollMessages(messages);
      return;
    }

    messages.appendChild(createMessageElement('bot', 'Got it—loading matches for you…'));
    scrollMessages(messages);

    const filters = normalizeFilters(baseFilters, parsed);
    redirectWithFilters(filters);
  });

  examples.forEach(example => {
    example.addEventListener('click', () => {
      const sample = example.getAttribute('data-search-example');
      if (!sample) return;
      input.value = sample;
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });
  });
}

if (document.readyState !== 'loading') {
  initHomepageChat();
} else {
  document.addEventListener('DOMContentLoaded', initHomepageChat);
}
