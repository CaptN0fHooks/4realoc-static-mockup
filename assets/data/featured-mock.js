// featured-mock.js
console.log("featured-mock.js loaded");

// This will later be replaced by Supabase results.
// For now: 5 sample curated listings.

window.featuredMockListings = [
  {
    id: 1,
    address: "123 Ocean View Dr, Laguna Beach, CA",
    price: 2895000,
    beds: 3,
    baths: 3,
    sqft: 2150,
    latitude: 33.542,
    longitude: -117.785,
    photo: "/assets/backgrounds/pexels-sonny-11968593.webp",
    features: ["ocean_view", "modern"]
  },
  {
    id: 2,
    address: "88 Blue Lagoon, Laguna Beach, CA",
    price: 3250000,
    beds: 4,
    baths: 4,
    sqft: 2600,
    latitude: 33.531,
    longitude: -117.773,
    photo: "/assets/backgrounds/pexels-daniel-2984347 webp.webp",
    features: ["ocean_view"]
  },
  {
    id: 3,
    address: "16 Vista Ridge, Newport Coast, CA",
    price: 4850000,
    beds: 5,
    baths: 5,
    sqft: 4200,
    latitude: 33.595,
    longitude: -117.807,
    photo: "/assets/backgrounds/The Ghazi webp.webp",
    features: ["gated", "ocean_view"]
  },
  {
    id: 4,
    address: "2400 Pacific Coast Hwy, HB, CA",
    price: 1890000,
    beds: 3,
    baths: 2,
    sqft: 1800,
    latitude: 33.668,
    longitude: -118.007,
    photo: "/assets/backgrounds/Pixabay webp.webp",
    features: ["modern"]
  },
  {
    id: 5,
    address: "55 Marbella, San Clemente, CA",
    price: 2190000,
    beds: 4,
    baths: 3,
    sqft: 2400,
    latitude: 33.438,
    longitude: -117.603,
    photo: "/assets/backgrounds/pexels-rdne-5637721 webp.webp",
    features: ["pool"]
  }
];
