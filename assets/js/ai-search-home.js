// ai-search-home.js
// Handles the AI search form on the homepage and sends data to search.html

console.log("ai-search-home.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("aiSearchForm");
  const input = document.getElementById("aiSearchInput");
  const chips = document.querySelectorAll(".featured-ai__chip");

  if (!form || !input) {
    console.warn("AI search form not found on homepage.");
    return;
  }

  // When user submits the AI form
  form.addEventListener("submit", (event) => {
    event.preventDefault();

const query = input.value.trim();
if (!query) {
  input.focus();
  return;
}

// Use the lightweight parser if available
let filters;
if (window.parseAiSearchQuery) {
  filters = window.parseAiSearchQuery(query);
} else {
  filters = { raw_query: query };
}

// Base IDX URL for now (we'll make this smarter later)
const idxUrlBase =
  "https://matrix.crmls.org/Matrix/public/IDX.aspx?idx=37fc3688";

// Store data for search.html to read
sessionStorage.setItem("aiSearchFilters", JSON.stringify(filters));
sessionStorage.setItem("aiIdxUrl", idxUrlBase);

console.log("Saved parsed filters to sessionStorage:", filters);
console.log("Saved IDX URL to sessionStorage:", idxUrlBase);
;

    // Go to the search page
    window.location.href = "search.html";
  });

  // Quick example chips: fill the input when clicked
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const example = chip.getAttribute("data-search-example");
      if (example) {
        input.value = example;
        input.focus();
      }
    });
  });
});
