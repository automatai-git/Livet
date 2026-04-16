export const DESTINATION = {
  id: 'hawaii',
  name: 'Hawaii Islands',
  subtitle: 'Experience Guide & 12-Day Split',
  description: [
    'Curated selection of best experiences across the Hawaiian islands',
    'Prioritised for adventure, unique landscapes, and marine encounters',
    'Optimized for a 12-day journey with no overlap'
  ],
  recommendedSplit: {
    title: 'Option A: Three Islands (Recommended)',
    duration: '12 Days',
    summary: 'Big Island 5 + Oahu 3 + Kauai 4. Maximises unique experiences with zero overlap.',
    days: [
      {
        range: '1–5',
        islandId: 'big-island',
        islandName: 'Big Island',
        theme: 'YOUR ANCHOR',
        description: [
          'Manta ray night snorkel (Kona)',
          'Helicopter volcano tour (Hilo)',
          'Volcanoes NP ground visit with night glow',
          'Kealakekua snorkeling',
          'Hapuna Beach chill'
        ],
        base: '3 nights Kona + 2 nights Hilo/Volcano side'
      },
      {
        range: '6–8',
        islandId: 'oahu',
        islandName: 'Oahu',
        theme: 'ACTION BLOCK',
        description: [
          'Waikiki surf lessons (2 sessions)',
          'Cage-free shark dive (North Shore)',
          'Diamond Head sunrise hike',
          'North Shore exploration'
        ],
        base: 'Waikiki'
      },
      {
        range: '9–12',
        islandId: 'kauai',
        islandName: 'Kauai',
        theme: 'TREKKING & SCENERY FINALE',
        description: [
          'Na Pali Coast boat/raft tour',
          'Kalalau Trail day hike (Hanakapiai Falls)',
          'Waimea Canyon exploration',
          'Wailua River kayak',
          'Beach recovery time'
        ],
        base: 'Poipu or Princeville'
      }
    ]
  }
};

export const ISLANDS = [
  {
    id: 'big-island',
    name: "Big Island (Hawai'i)",
    nickname: 'The Adventure Island',
    color: '#de431d', // Volcanic red
    icon: '🌋',
    coords: { x: 80, y: 70 },
    verdict: 'Your #1 priority island. Base in Kona (west side) for beach, manta rays, helicopter, and coffee. Spend 1–2 nights on Hilo side for volcano, waterfalls.'
  },
  {
    id: 'oahu',
    name: 'Oahu',
    nickname: 'The Action Island',
    color: '#0d94da', // Ocean blue
    icon: '🏄',
    coords: { x: 35, y: 35 },
    verdict: '2–3 nights. Day 1: Waikiki surf lesson + Diamond Head. Day 2: North Shore shark dive + Haleiwa. Compact, efficient, done.'
  },
  {
    id: 'maui',
    name: 'Maui',
    nickname: 'The Scenic All-Rounder',
    color: '#e2ba1b', // Sun yellow
    icon: '🐋',
    coords: { x: 60, y: 50 },
    verdict: '3–4 nights if included. Road to Hana is a must-do full day. Haleakala sunrise is a full day. Best all-round island but has overlap.'
  },
  {
    id: 'kauai',
    name: 'Kauai',
    nickname: 'The Adventure Trekking Island',
    color: '#348e3e', // Jungle green
    icon: '🥾',
    coords: { x: 10, y: 20 },
    verdict: '3–4 nights. Day 1: Na Pali boat tour. Day 2: Kalalau Trail hike. Day 3: Waimea Canyon. Day 4: Wailua kayak. Slower travel — don’t rush it.'
  }
];

export const EXPERIENCES = [
  // BIG ISLAND
  {
    id: 'bi-1', islandId: 'big-island', name: 'Manta ray night snorkel', 
    rating: '10/10', cost: '$99–169', 
    description: 'BUCKET LIST. Kona coast, nightly. Float above 12–15 ft wingspan mantas feeding on plankton inches below you. 90%+ sighting rate. This alone justifies the Big Island.'
  },
  {
    id: 'bi-2', islandId: 'big-island', name: 'Helicopter volcano tour', 
    rating: '9/10', cost: '$229–650', 
    description: 'Fly over Kilauea’s active crater, lava fields, Hamakua coast waterfalls. Timing the flight during an active eruption episode is spectacular.'
  },
  {
    id: 'bi-3', islandId: 'big-island', name: 'Hawaii Volcanoes National Park', 
    rating: '9/10', cost: '$30/car', 
    description: 'BUCKET LIST: See active lava, lava tube, volcanic crater. Kilauea erupts episodically with lava fountains. Night viewing of crater glow is mesmerising.'
  },
  {
    id: 'bi-4', islandId: 'big-island', name: 'Snorkeling Kealakekua Bay', 
    rating: '8/10', cost: 'Free–$120', 
    description: 'Best snorkeling on Big Island. Captain Cook monument area has crystal-clear water, abundant marine life, spinner dolphins often present.'
  },
  {
    id: 'bi-5', islandId: 'big-island', name: 'Mauna Kea stargazing', 
    rating: '8/10', cost: 'Free–$250', 
    description: 'Drive to 13,796 ft summit for sunset + stars. One of the best stargazing locations on Earth. Altitude can cause symptoms — acclimate first.'
  },
  
  // OAHU
  {
    id: 'oa-1', islandId: 'oahu', name: 'Shark dive (cage-free)', 
    rating: '9/10', cost: '$99–150', 
    description: 'BUCKET LIST. Open water snorkel/freedive with Galapagos, sandbar, and occasionally tiger sharks. No cage, safety divers present.'
  },
  {
    id: 'oa-2', islandId: 'oahu', name: 'Surfing at Waikiki', 
    rating: '9/10', cost: '$80–179', 
    description: 'BUCKET LIST. The birthplace of modern surfing. Summer south swells bring consistent, gentle beginner waves. Cultural significance elevates this.'
  },
  {
    id: 'oa-3', islandId: 'oahu', name: 'Shark cage dive', 
    rating: '7/10', cost: '$130–150', 
    description: 'Alternative to cage-free. No swimming ability needed. 100% sighting guarantee. Slightly less immersive but more accessible.'
  },
  {
    id: 'oa-4', islandId: 'oahu', name: 'Diamond Head hike', 
    rating: '7/10', cost: '$5', 
    description: 'Iconic short hike inside volcanic crater. 1.5 hrs round trip. Panoramic views of Waikiki and Honolulu. Easy-moderate.'
  },
  {
    id: 'oa-5', islandId: 'oahu', name: 'North Shore exploration', 
    rating: '7/10', cost: 'Free–$50', 
    description: 'Haleiwa town, shrimp trucks, surf beaches. Laid-back contrast to Waikiki’s energy.'
  },

  // MAUI
  {
    id: 'ma-1', islandId: 'maui', name: 'Road to Hana', 
    rating: '9/10', cost: 'Free–$50', 
    description: '64 miles, 620 curves, 59 bridges through tropical rainforest. Waterfalls, black sand beaches, bamboo forests. This is Maui’s signature experience.'
  },
  {
    id: 'ma-2', islandId: 'maui', name: 'Haleakala sunrise', 
    rating: '8/10', cost: '$31', 
    description: 'Watch sunrise from 10,023 ft above sea level, above the clouds. Advance reservation required.'
  },
  {
    id: 'ma-3', islandId: 'maui', name: 'Molokini Crater snorkeling', 
    rating: '8/10', cost: '$99–180', 
    description: 'Partially submerged volcanic crater with 150+ ft visibility. One of the best snorkel sites in Hawaii.'
  },

  // KAUAI
  {
    id: 'ka-1', islandId: 'kauai', name: 'Na Pali Coast boat/raft tour', 
    rating: '10/10', cost: '$150–250', 
    description: '17-mile coastline of 4,000-ft cliffs, sea caves, waterfalls, hidden beaches. Accessible only by boat. One of the most visually stunning boat trips in the world.'
  },
  {
    id: 'ka-2', islandId: 'kauai', name: 'Kalalau Trail (Na Pali hike)', 
    rating: '9/10', cost: '$5–40', 
    description: 'BUCKET LIST calibre. Rated one of the world’s most challenging and beautiful hikes. Day hike option to Hanakapiai Falls (8 mi RT).'
  },
  {
    id: 'ka-3', islandId: 'kauai', name: 'Doors-off helicopter', 
    rating: '9/10', cost: '$250–400', 
    description: 'Kauai’s helicopter tours are arguably the best in Hawaii because the terrain is so dramatic. Photography paradise.'
  },
  {
    id: 'ka-4', islandId: 'kauai', name: 'Waimea Canyon', 
    rating: '8/10', cost: 'Free', 
    description: '“Grand Canyon of the Pacific.” 14 miles long, 3,600 ft deep. Red and green gorge walls are visually stunning.'
  }
];
