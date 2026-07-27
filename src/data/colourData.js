export const SECTIONS = {
    matcher:  "Outfit Matcher",
    core:     "Core Palette",
    sister:   "Soft Autumn Crossover",
    neutrals: "Your Neutrals",
    caution:  "Approach with Caution",
    metals:   "Metals & Accessories",
    combos:   "Outfit Combinations",
};

export const coreColours = [
    { name: "Dusty Rose",        hex: "#C4929B", desc: "Your signature pink — muted, sophisticated, effortlessly flattering" },
    { name: "Mauve",             hex: "#B08A9A", desc: "A smoky pink-purple that echoes the soft complexity of your eyes" },
    { name: "Sage Green",        hex: "#8FA387", desc: "Greyed herbal green — mirrors the green tones in your iris" },
    { name: "Soft Teal",         hex: "#6E9B9E", desc: "A muted blue-green bridge colour, calming and harmonious" },
    { name: "Slate Blue",        hex: "#7389A2", desc: "Smoky blue with grey undertones — a strong everyday colour" },
    { name: "Lavender",          hex: "#A99BBD", desc: "Cool, dusty purple — soft enough to never overwhelm" },
    { name: "Cocoa",             hex: "#8B7168", desc: "A cool-leaning soft brown, warmer than grey but cooler than camel" },
    { name: "Dusty Plum",        hex: "#7E5475", desc: "Deep muted purple — your richest, most dramatic option" },
    { name: "Soft Burgundy",     hex: "#8B4D5A", desc: "Pinot noir in fabric form — deep, cool red" },
    { name: "Raspberry Muted",   hex: "#9E5B6E", desc: "A softened berry — your ideal 'red' that isn't actually red" },
    { name: "Pewter Blue",       hex: "#8DA0AC", desc: "Grey with a blue whisper — effortless sophistication" },
    { name: "Soft Jade",         hex: "#7BA098", desc: "A greyed blue-green with gentle depth" },
    { name: "Driftwood",         hex: "#8C7E72", desc: "Muted cool-leaning medium brown — easy and natural" },
    { name: "Dusty Cornflower",  hex: "#7F99B8", desc: "A softened mid-blue — less corporate than navy, more interesting than sky" },
    { name: "Heather",           hex: "#A992A5", desc: "Gentle grey-purple, like a Scottish moor in autumn mist" },
];

export const sisterColours = [
    { name: "Olive",       hex: "#808A5C", desc: "Muted, greyed olive — not bright or vivid" },
    { name: "Terracotta",  hex: "#B07A65", desc: "Dusty, earthy terracotta — greyed down, not bright" },
    { name: "Warm Taupe",  hex: "#A08E7F", desc: "Your warmest neutral — a bridge between seasons" },
    { name: "Soft Rust",   hex: "#A87360", desc: "Rust with the volume turned down — earthy, not fiery" },
    { name: "Warm Sage",   hex: "#9A9876", desc: "Sage with a golden lean — softer, earthier" },
    { name: "Mushroom",    hex: "#9C8E82", desc: "A warm grey-brown — natural and grounding" },
];

export const neutralColours = [
    { name: "Muted Navy",   hex: "#3D4F63", desc: "Your best dark — softer than true navy, endlessly versatile" },
    { name: "Charcoal",     hex: "#545861", desc: "Your alternative to black — all the depth without the harshness" },
    { name: "Cool Taupe",   hex: "#9B8E85", desc: "The ultimate Soft Summer neutral — grey + brown + cool" },
    { name: "Stone",        hex: "#B5ADA4", desc: "A greige — grey-beige blend, effortlessly elegant" },
    { name: "Greige",       hex: "#C4BAB0", desc: "A lighter warm grey — gentle and versatile" },
    { name: "Soft White",   hex: "#EDE8E3", desc: "Off-white with a hint of warmth — your replacement for stark white" },
    { name: "Pewter Grey",  hex: "#8A8D90", desc: "A medium cool grey — clean and understated" },
    { name: "Dove",         hex: "#B8B3AE", desc: "A delicate warm grey — lighter option for summer" },
];

export const cautionColours = [
    { name: "Bright Orange",  hex: "#FF6B2B", desc: "Too vivid and warm — overwhelms your soft, cool-neutral colouring" },
    { name: "Electric Yellow", hex: "#FFD700", desc: "Too saturated and warm — creates a sallow cast near your face" },
    { name: "Jet Black",       hex: "#0A0A0A", desc: "Too stark — creates harsh contrast against your gentle features" },
    { name: "Pure White",      hex: "#FFFFFF", desc: "Too crisp and bright — makes skin look grey or washed out" },
    { name: "Hot Pink",        hex: "#FF3399", desc: "Too vivid — dusty rose is the muted cousin that works" },
    { name: "Neon Green",      hex: "#39FF14", desc: "Too electric — sage and soft teal are your greens" },
    { name: "Warm Camel",      hex: "#C8A96E", desc: "Too golden for your cool-neutral undertone — choose cool taupe instead" },
    { name: "Kelly Green",     hex: "#00A550", desc: "Too saturated and bright — opt for muted jade or sage" },
];

export const metalColours = [
    { name: "Brushed Silver",    hex: "#B8C0C8", ring: "linear-gradient(135deg, #A8B0B8, #D0D8E0, #909BA5)", desc: "Your primary metal — matte or brushed finish suits Soft Summer perfectly" },
    { name: "White Gold",        hex: "#D4D0C8", ring: "linear-gradient(135deg, #C8C4BC, #E8E4DC, #B0ACA4)", desc: "A warmer-toned silver — elegant and flattering" },
    { name: "Rose Gold",         hex: "#D4A89A", ring: "linear-gradient(135deg, #C49888, #E4C0B2, #B4887A)", desc: "Your bridge metal — works beautifully given your Soft Autumn affinity" },
    { name: "Avoid: Bright Gold", hex: "#D4A843", ring: "linear-gradient(135deg, #C49830, #E4C060, #B48820)", desc: "Too warm and shiny — clashes with your cool-neutral undertone" },
];

export const outfitCombos = [
    {
        name: "Everyday Confidence",
        desc: "A grounded, versatile combination for daily wear",
        colours: [
            { name: "Muted Navy",  hex: "#3D4F63" },
            { name: "Soft White",  hex: "#EDE8E3" },
            { name: "Cool Taupe",  hex: "#9B8E85" },
            { name: "Slate Blue",  hex: "#7389A2" },
        ],
    },
    {
        name: "Saturday Edge",
        desc: "Relaxed but intentional — borrowing from your Soft Autumn side",
        colours: [
            { name: "Charcoal",   hex: "#545861" },
            { name: "Olive",      hex: "#808A5C" },
            { name: "Stone",      hex: "#B5ADA4" },
            { name: "Soft Rust",  hex: "#A87360" },
        ],
    },
    {
        name: "Evening Out",
        desc: "Your richest, most dramatic tones — still muted, but with depth",
        colours: [
            { name: "Dusty Plum",    hex: "#7E5475" },
            { name: "Muted Navy",    hex: "#3D4F63" },
            { name: "Soft Burgundy", hex: "#8B4D5A" },
            { name: "Pewter Grey",   hex: "#8A8D90" },
        ],
    },
    {
        name: "Summer Light",
        desc: "Lighter, cooler tones for warm weather — breezy and fresh",
        colours: [
            { name: "Sage Green",  hex: "#8FA387" },
            { name: "Soft White",  hex: "#EDE8E3" },
            { name: "Lavender",    hex: "#A99BBD" },
            { name: "Dusty Rose",  hex: "#C4929B" },
        ],
    },
    {
        name: "Professional Polish",
        desc: "Boardroom-ready — authoritative without being severe",
        colours: [
            { name: "Charcoal",    hex: "#545861" },
            { name: "Slate Blue",  hex: "#7389A2" },
            { name: "Soft White",  hex: "#EDE8E3" },
            { name: "Cocoa",       hex: "#8B7168" },
        ],
    },
];

// ── Helpers ──────────────────────────────────────────────

// Every colour that can actually be worn, tagged with its section role.
// The Outfit Matcher uses roles to slot colours: neutrals ground trousers
// and jackets, core/sister colours go near the face.
export const wearableColours = [
    ...coreColours.map((c) => ({ ...c, role: 'core' })),
    ...sisterColours.map((c) => ({ ...c, role: 'sister' })),
    ...neutralColours.map((c) => ({ ...c, role: 'neutral' })),
];
