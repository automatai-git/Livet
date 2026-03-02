import { useState } from "react";

const SECTIONS = {
    core: "Core Palette",
    sister: "Soft Autumn Crossover",
    neutrals: "Your Neutrals",
    caution: "Approach with Caution",
    metals: "Metals & Accessories",
    combos: "Outfit Combinations",
};

const coreColours = [
    { name: "Dusty Rose", hex: "#C4929B", desc: "Your signature pink — muted, sophisticated, effortlessly flattering" },
    { name: "Mauve", hex: "#B08A9A", desc: "A smoky pink-purple that echoes the soft complexity of your eyes" },
    { name: "Sage Green", hex: "#8FA387", desc: "Greyed herbal green — mirrors the green tones in your iris" },
    { name: "Soft Teal", hex: "#6E9B9E", desc: "A muted blue-green bridge colour, calming and harmonious" },
    { name: "Slate Blue", hex: "#7389A2", desc: "Smoky blue with grey undertones — a strong everyday colour" },
    { name: "Lavender", hex: "#A99BBD", desc: "Cool, dusty purple — soft enough to never overwhelm" },
    { name: "Cocoa", hex: "#8B7168", desc: "A cool-leaning soft brown, warmer than grey but cooler than camel" },
    { name: "Dusty Plum", hex: "#7E5475", desc: "Deep muted purple — your richest, most dramatic option" },
    { name: "Soft Burgundy", hex: "#8B4D5A", desc: "Pinot noir in fabric form — deep, cool red" },
    { name: "Raspberry Muted", hex: "#9E5B6E", desc: "A softened berry — your ideal 'red' that isn't actually red" },
    { name: "Pewter Blue", hex: "#8DA0AC", desc: "Grey with a blue whisper — effortless sophistication" },
    { name: "Soft Jade", hex: "#7BA098", desc: "A greyed blue-green with gentle depth" },
    { name: "Driftwood", hex: "#8C7E72", desc: "Muted cool-leaning medium brown — easy and natural" },
    { name: "Dusty Cornflower", hex: "#7F99B8", desc: "A softened mid-blue — less corporate than navy, more interesting than sky" },
    { name: "Heather", hex: "#A992A5", desc: "Gentle grey-purple, like a Scottish moor in autumn mist" },
];

const sisterColours = [
    { name: "Olive", hex: "#808A5C", desc: "Muted, greyed olive — not bright or vivid" },
    { name: "Terracotta", hex: "#B07A65", desc: "Dusty, earthy terracotta — greyed down, not bright" },
    { name: "Warm Taupe", hex: "#A08E7F", desc: "Your warmest neutral — a bridge between seasons" },
    { name: "Soft Rust", hex: "#A87360", desc: "Rust with the volume turned down — earthy, not fiery" },
    { name: "Warm Sage", hex: "#9A9876", desc: "Sage with a golden lean — softer, earthier" },
    { name: "Mushroom", hex: "#9C8E82", desc: "A warm grey-brown — natural and grounding" },
];

const neutralColours = [
    { name: "Muted Navy", hex: "#3D4F63", desc: "Your best dark — softer than true navy, endlessly versatile" },
    { name: "Charcoal", hex: "#545861", desc: "Your alternative to black — all the depth without the harshness" },
    { name: "Cool Taupe", hex: "#9B8E85", desc: "The ultimate Soft Summer neutral — grey + brown + cool" },
    { name: "Stone", hex: "#B5ADA4", desc: "A greige — grey-beige blend, effortlessly elegant" },
    { name: "Greige", hex: "#C4BAB0", desc: "A lighter warm grey — gentle and versatile" },
    { name: "Soft White", hex: "#EDE8E3", desc: "Off-white with a hint of warmth — your replacement for stark white" },
    { name: "Pewter Grey", hex: "#8A8D90", desc: "A medium cool grey — clean and understated" },
    { name: "Dove", hex: "#B8B3AE", desc: "A delicate warm grey — lighter option for summer" },
];

const cautionColours = [
    { name: "Bright Orange", hex: "#FF6B2B", desc: "Too vivid and warm — overwhelms your soft, cool-neutral colouring" },
    { name: "Electric Yellow", hex: "#FFD700", desc: "Too saturated and warm — creates a sallow cast near your face" },
    { name: "Jet Black", hex: "#0A0A0A", desc: "Too stark — creates harsh contrast against your gentle features" },
    { name: "Pure White", hex: "#FFFFFF", desc: "Too crisp and bright — makes skin look grey or washed out" },
    { name: "Hot Pink", hex: "#FF3399", desc: "Too vivid — dusty rose is the muted cousin that works" },
    { name: "Neon Green", hex: "#39FF14", desc: "Too electric — sage and soft teal are your greens" },
    { name: "Warm Camel", hex: "#C8A96E", desc: "Too golden for your cool-neutral undertone — choose cool taupe instead" },
    { name: "Kelly Green", hex: "#00A550", desc: "Too saturated and bright — opt for muted jade or sage" },
];

const metalColours = [
    { name: "Brushed Silver", hex: "#B8C0C8", ring: "linear-gradient(135deg, #A8B0B8, #D0D8E0, #909BA5)", desc: "Your primary metal — matte or brushed finish suits Soft Summer perfectly" },
    { name: "White Gold", hex: "#D4D0C8", ring: "linear-gradient(135deg, #C8C4BC, #E8E4DC, #B0ACA4)", desc: "A warmer-toned silver — elegant and flattering" },
    { name: "Rose Gold", hex: "#D4A89A", ring: "linear-gradient(135deg, #C49888, #E4C0B2, #B4887A)", desc: "Your bridge metal — works beautifully given your Soft Autumn affinity" },
    { name: "Avoid: Bright Gold", hex: "#D4A843", ring: "linear-gradient(135deg, #C49830, #E4C060, #B48820)", desc: "Too warm and shiny — clashes with your cool-neutral undertone" },
];

const outfitCombos = [
    {
        name: "Everyday Confidence",
        desc: "A grounded, versatile combination for daily wear",
        colours: [
            { name: "Muted Navy", hex: "#3D4F63" },
            { name: "Soft White", hex: "#EDE8E3" },
            { name: "Cool Taupe", hex: "#9B8E85" },
            { name: "Slate Blue", hex: "#7389A2" },
        ],
    },
    {
        name: "Saturday Edge",
        desc: "Relaxed but intentional — borrowing from your Soft Autumn side",
        colours: [
            { name: "Charcoal", hex: "#545861" },
            { name: "Olive", hex: "#808A5C" },
            { name: "Stone", hex: "#B5ADA4" },
            { name: "Soft Rust", hex: "#A87360" },
        ],
    },
    {
        name: "Evening Out",
        desc: "Your richest, most dramatic tones — still muted, but with depth",
        colours: [
            { name: "Dusty Plum", hex: "#7E5475" },
            { name: "Muted Navy", hex: "#3D4F63" },
            { name: "Soft Burgundy", hex: "#8B4D5A" },
            { name: "Pewter Grey", hex: "#8A8D90" },
        ],
    },
    {
        name: "Summer Light",
        desc: "Lighter, cooler tones for warm weather — breezy and fresh",
        colours: [
            { name: "Sage Green", hex: "#8FA387" },
            { name: "Soft White", hex: "#EDE8E3" },
            { name: "Lavender", hex: "#A99BBD" },
            { name: "Dusty Rose", hex: "#C4929B" },
        ],
    },
    {
        name: "Professional Polish",
        desc: "Boardroom-ready — authoritative without being severe",
        colours: [
            { name: "Charcoal", hex: "#545861" },
            { name: "Slate Blue", hex: "#7389A2" },
            { name: "Soft White", hex: "#EDE8E3" },
            { name: "Cocoa", hex: "#8B7168" },
        ],
    },
];

function getTextColour(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.55 ? "#3D3D3D" : "#F5F0EB";
}

function ColourCard({ colour, size = "normal", showDesc = true }) {
    const [hovered, setHovered] = useState(false);
    const textCol = getTextColour(colour.hex);
    const isSmall = size === "small";

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: colour.hex,
                borderRadius: isSmall ? 10 : 14,
                padding: isSmall ? "14px 16px" : "22px 24px",
                minHeight: isSmall ? 70 : 120,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                position: "relative",
                overflow: "hidden",
                transition: "transform 0.3s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.3s ease",
                transform: hovered ? "translateY(-3px)" : "translateY(0)",
                boxShadow: hovered
                    ? "0 8px 25px rgba(0,0,0,0.12)"
                    : "0 2px 8px rgba(0,0,0,0.06)",
                cursor: "default",
                border: colour.hex === "#FFFFFF" ? "1.5px solid #D0CCC7" : "none",
            }}
        >
            <div style={{ color: textCol, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: isSmall ? 13 : 15, letterSpacing: "0.01em" }}>
                {colour.name}
            </div>
            <div style={{ color: textCol, fontFamily: "'JetBrains Mono', monospace", fontSize: isSmall ? 10 : 11, opacity: 0.7, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {colour.hex}
            </div>
            {showDesc && !isSmall && colour.desc && (
                <div
                    style={{
                        color: textCol,
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 12,
                        opacity: hovered ? 0.85 : 0,
                        marginTop: 8,
                        lineHeight: 1.45,
                        transition: "opacity 0.3s ease",
                        fontWeight: 400,
                    }}
                >
                    {colour.desc}
                </div>
            )}
        </div>
    );
}

function MetalCard({ metal }) {
    const [hovered, setHovered] = useState(false);
    const isAvoid = metal.name.startsWith("Avoid");
    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: "#F5F0EB",
                borderRadius: 14,
                padding: "24px 22px",
                display: "flex",
                alignItems: "center",
                gap: 20,
                transition: "transform 0.3s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.3s ease",
                transform: hovered ? "translateY(-2px)" : "none",
                boxShadow: hovered ? "0 6px 20px rgba(0,0,0,0.08)" : "0 1px 4px rgba(0,0,0,0.04)",
                opacity: isAvoid ? 0.55 : 1,
                position: "relative",
            }}
        >
            {isAvoid && (
                <div style={{ position: "absolute", top: 10, right: 14, fontSize: 10, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: "#A08070", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Avoid
                </div>
            )}
            <div
                style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: metal.ring,
                    flexShrink: 0,
                    boxShadow: "inset 0 1px 3px rgba(255,255,255,0.5), 0 2px 6px rgba(0,0,0,0.1)",
                }}
            />
            <div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, color: "#3D3D3D" }}>
                    {metal.name}
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#7A7570", marginTop: 4, lineHeight: 1.45 }}>
                    {metal.desc}
                </div>
            </div>
        </div>
    );
}

function ComboCard({ combo }) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: "#F5F0EB",
                borderRadius: 14,
                padding: "22px",
                transition: "transform 0.3s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.3s ease",
                transform: hovered ? "translateY(-2px)" : "none",
                boxShadow: hovered ? "0 6px 20px rgba(0,0,0,0.08)" : "0 1px 4px rgba(0,0,0,0.04)",
            }}
        >
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, color: "#3D3D3D" }}>
                {combo.name}
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#7A7570", marginTop: 4, lineHeight: 1.4 }}>
                {combo.desc}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                {combo.colours.map((c, i) => (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <div
                            style={{
                                width: "100%",
                                aspectRatio: "1",
                                borderRadius: 10,
                                background: c.hex,
                                boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                                border: c.hex === "#EDE8E3" ? "1.5px solid #D0CCC7" : "none",
                            }}
                        />
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "#7A7570", textAlign: "center", lineHeight: 1.3 }}>
                            {c.name}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function CautionCard({ colour }) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: "#F5F0EB",
                borderRadius: 12,
                padding: "14px 18px",
                transition: "transform 0.2s ease",
                transform: hovered ? "translateY(-1px)" : "none",
            }}
        >
            <div
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: colour.hex,
                    flexShrink: 0,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                    border: colour.hex === "#FFFFFF" ? "1.5px solid #D0CCC7" : "none",
                    position: "relative",
                }}
            >
                <div style={{
                    position: "absolute", inset: 0, borderRadius: 8,
                    background: "repeating-linear-gradient(135deg, transparent, transparent 12px, rgba(0,0,0,0.08) 12px, rgba(0,0,0,0.08) 13px)",
                }} />
            </div>
            <div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, color: "#3D3D3D" }}>
                    {colour.name}
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#8A8580", marginTop: 2, lineHeight: 1.4 }}>
                    {colour.desc}
                </div>
            </div>
        </div>
    );
}

export default function SoftSummerPalette() {
    const [activeSection, setActiveSection] = useState("core");

    const sectionKeys = Object.keys(SECTIONS);

    return (
        <div style={{ minHeight: "100vh", background: "#EDE8E3", fontFamily: "'DM Sans', sans-serif" }}>
            <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

            {/* Header */}
            <div style={{ padding: "48px 32px 0", maxWidth: 960, margin: "0 auto" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: "50%",
                        background: "linear-gradient(135deg, #8FA387, #7389A2, #A99BBD, #C4929B)",
                        boxShadow: "0 3px 12px rgba(0,0,0,0.1)",
                    }} />
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7A7570" }}>
                            Seasonal Colour Analysis
                        </div>
                        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 36, color: "#3D3D3D", margin: 0, lineHeight: 1.15 }}>
                            Soft Summer
                        </h1>
                    </div>
                </div>
                <p style={{ fontSize: 15, color: "#7A7570", lineHeight: 1.6, maxWidth: 640, margin: "16px 0 0" }}>
                    Your colouring is defined by <strong style={{ color: "#545861" }}>softness</strong> and a <strong style={{ color: "#545861" }}>cool-neutral undertone</strong>.
                    Every colour in this palette has a drop of grey in it — muted, smoky, and gently toned-down.
                    Think morning mist, not midday sun.
                </p>

                {/* Dimension Badges */}
                <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
                    {[
                        { label: "Primary", value: "Muted / Soft", col: "#8A8D90" },
                        { label: "Secondary", value: "Cool-Neutral", col: "#7389A2" },
                        { label: "Sister Season", value: "Soft Autumn", col: "#A87360" },
                    ].map((b, i) => (
                        <div key={i} style={{
                            display: "flex", alignItems: "center", gap: 8,
                            background: "rgba(255,255,255,0.6)", borderRadius: 100,
                            padding: "8px 16px",
                        }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: b.col }} />
                            <span style={{ fontSize: 12, color: "#7A7570" }}>{b.label}:</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#3D3D3D" }}>{b.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigation */}
            <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(237,232,227,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,0,0,0.06)", marginTop: 32 }}>
                <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 32px", display: "flex", gap: 4, overflowX: "auto" }}>
                    {sectionKeys.map((key) => (
                        <button
                            key={key}
                            onClick={() => setActiveSection(key)}
                            style={{
                                padding: "14px 18px",
                                fontSize: 13,
                                fontWeight: activeSection === key ? 600 : 400,
                                color: activeSection === key ? "#3D3D3D" : "#8A8580",
                                background: "none",
                                border: "none",
                                borderBottom: activeSection === key ? "2px solid #7389A2" : "2px solid transparent",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                                transition: "all 0.2s ease",
                                fontFamily: "'DM Sans', sans-serif",
                            }}
                        >
                            {SECTIONS[key]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 32px 64px" }}>

                {/* Core Palette */}
                {activeSection === "core" && (
                    <div>
                        <p style={{ fontSize: 14, color: "#7A7570", lineHeight: 1.6, marginBottom: 24, maxWidth: 600 }}>
                            These are your home colours — every one has been greyed-down and softened. Hover over any swatch to see why it works for you.
                        </p>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(175, 1fr))",
                            gap: 14,
                        }}>
                            <style>{`
                .core-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
                @media (max-width: 700px) { .core-grid { grid-template-columns: repeat(2, 1fr); } }
                @media (max-width: 460px) { .core-grid { grid-template-columns: 1fr; } }
              `}</style>
                            <div className="core-grid">
                                {coreColours.map((c, i) => (
                                    <ColourCard key={i} colour={c} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Sister Season */}
                {activeSection === "sister" && (
                    <div>
                        <p style={{ fontSize: 14, color: "#7A7570", lineHeight: 1.6, marginBottom: 24, maxWidth: 620 }}>
                            You live on the warm edge of Soft Summer — these Soft Autumn tones are borrowed colours that work because they share your
                            defining quality: <strong style={{ color: "#545861" }}>mutedness</strong>. They're earthy, warm, but never vivid.
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, padding: "14px 20px", background: "rgba(168,115,96,0.08)", borderRadius: 12 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#A87360", flexShrink: 0 }} />
                            <div style={{ fontSize: 13, color: "#6E5548", lineHeight: 1.5 }}>
                                These work best when paired with your core Soft Summer neutrals — not worn head-to-toe.
                            </div>
                        </div>
                        <style>{`
              .sister-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
              @media (max-width: 700px) { .sister-grid { grid-template-columns: repeat(2, 1fr); } }
              @media (max-width: 460px) { .sister-grid { grid-template-columns: 1fr; } }
            `}</style>
                        <div className="sister-grid">
                            {sisterColours.map((c, i) => (
                                <ColourCard key={i} colour={c} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Neutrals */}
                {activeSection === "neutrals" && (
                    <div>
                        <p style={{ fontSize: 14, color: "#7A7570", lineHeight: 1.6, marginBottom: 24, maxWidth: 600 }}>
                            Build your wardrobe foundation here. These neutrals all carry a subtle grey or cool undertone — they'll mix with
                            every colour in your palette without clashing.
                        </p>
                        <style>{`
              .neutral-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
              @media (max-width: 700px) { .neutral-grid { grid-template-columns: repeat(2, 1fr); } }
              @media (max-width: 460px) { .neutral-grid { grid-template-columns: 1fr; } }
            `}</style>
                        <div className="neutral-grid">
                            {neutralColours.map((c, i) => (
                                <ColourCard key={i} colour={c} />
                            ))}
                        </div>
                        <div style={{ marginTop: 28, padding: "18px 22px", background: "rgba(115,137,162,0.08)", borderRadius: 12 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#3D3D3D", marginBottom: 6 }}>The Black & White Swap</div>
                            <div style={{ fontSize: 13, color: "#7A7570", lineHeight: 1.55 }}>
                                Swap jet black for <strong style={{ color: "#545861" }}>charcoal</strong> or <strong style={{ color: "#545861" }}>muted navy</strong>.
                                Swap bright white for <strong style={{ color: "#545861" }}>soft white</strong> or <strong style={{ color: "#545861" }}>stone</strong>.
                                You'll notice the softer alternatives frame your face without overpowering it.
                            </div>
                        </div>
                    </div>
                )}

                {/* Caution */}
                {activeSection === "caution" && (
                    <div>
                        <p style={{ fontSize: 14, color: "#7A7570", lineHeight: 1.6, marginBottom: 24, maxWidth: 600 }}>
                            These colours overwhelm your natural softness — they're either too vivid, too warm, or too stark.
                            Each one has a flattering alternative in your core palette.
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {cautionColours.map((c, i) => (
                                <CautionCard key={i} colour={c} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Metals */}
                {activeSection === "metals" && (
                    <div>
                        <p style={{ fontSize: 14, color: "#7A7570", lineHeight: 1.6, marginBottom: 24, maxWidth: 600 }}>
                            Metals follow the same rules as clothing — cool-toned, muted finishes flatter you most.
                            Brushed or satin textures suit Soft Summer better than high-polish mirror finishes.
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {metalColours.map((m, i) => (
                                <MetalCard key={i} metal={m} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Outfit Combos */}
                {activeSection === "combos" && (
                    <div>
                        <p style={{ fontSize: 14, color: "#7A7570", lineHeight: 1.6, marginBottom: 24, maxWidth: 600 }}>
                            Five ready-made colour stories using your palette. Each works as a complete outfit combination —
                            mix the swatches across tops, bottoms, outerwear, and accessories.
                        </p>
                        <style>{`
              .combo-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
              @media (max-width: 600px) { .combo-grid { grid-template-columns: 1fr; } }
            `}</style>
                        <div className="combo-grid">
                            {outfitCombos.map((combo, i) => (
                                <ComboCard key={i} combo={combo} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", padding: "24px 32px", maxWidth: 960, margin: "0 auto" }}>
                <div style={{ fontSize: 11, color: "#A09B96", lineHeight: 1.6, maxWidth: 500 }}>
                    Digital analysis based on photo + questionnaire data. For absolute precision, professional in-person draping is recommended.
                    Your undertone is fixed, but surface tone shifts with sun and season — lean into Soft Autumn when tanned, core Soft Summer when pale.
                </div>
            </div>
        </div>
    );
}