// One source of geometry for every Arcbuildr mark. Run: node brand/build.mjs
// Grid: baseline y=60, x-height y=20, ascender y=0 (outer edges). Every shape is a round-capped stroke
// on centerlines, so weight is one number and every part can be drawn on, retracted or recolored in CSS.
import { writeFileSync, mkdirSync } from "node:fs";

const W = 10; // letter stroke
const ARC = { r: 21, w: 11 }; // the mark: a half circle, one step heavier than the letters
const INK = "#1a1a1a";
const ACCENT = "#e8722e";
const PAPER = "#ffffff";

const bowl = (cx) => `M${cx - 15} 40a15 15 0 1 0 30 0a15 15 0 1 0-30 0`;
const LETTERS = {
  a: { w: 40, d: (L) => `${bowl(L + 20)}M${L + 35} 25V55` },
  r: { w: 25, d: (L) => `M${L + 5} 55V40A15 15 0 0 1 ${L + 20} 25` },
  c: { w: 36, d: (L) => `M${L + 30.61} 29.39A15 15 0 1 0 ${L + 30.61} 50.61` },
  b: { w: 40, d: (L) => `M${L + 5} 5V55${bowl(L + 20)}` },
  u: { w: 40, d: (L) => `M${L + 5} 25V40A15 15 0 0 0 ${L + 35} 40M${L + 35} 25V55` },
  i: { w: 10, d: (L) => `M${L + 5} 25V55M${L + 5} 7v.01` },
  l: { w: 10, d: (L) => `M${L + 5} 5V55` },
  d: { w: 40, d: (L) => `${bowl(L + 20)}M${L + 35} 5V55` },
};
// Optical gaps: the r's open shoulder needs less room after it.
const GAP = { default: 7, r: 3 };

/** Returns { paths: [{ d, letter, accent }], width } for "arcbuildr" starting at x. */
function wordmark(x = 0) {
  const paths = [];
  [..."arcbuildr"].forEach((ch, i, all) => {
    const g = LETTERS[ch];
    paths.push({ d: g.d(x), letter: ch, accent: i === all.length - 1 });
    x += g.w + (i < all.length - 1 ? (GAP[ch] ?? GAP.default) : 0);
  });
  return { paths, width: x };
}

/** The arc with its legs on y=baseLine (centerline), left outer edge at x. */
function arc(x = 0, base = 60 - ARC.w / 2, r = ARC.r, w = ARC.w) {
  const l = x + w / 2;
  return { d: `M${l} ${base}A${r} ${r} 0 0 1 ${l + r * 2} ${base}`, width: r * 2 + w };
}

const svg = (vb, body, label = "Arcbuildr") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${label}" fill="none" stroke-linecap="round" stroke-linejoin="round">${body}</svg>\n`;
const letters = (wm, color) =>
  wm.paths
    .map(
      (p) =>
        `<path class="l l-${p.letter}" d="${p.d}" stroke="${p.accent ? ACCENT : color}" stroke-width="${W}"/>`,
    )
    .join("");
const arcPath = (a, color, w = ARC.w) =>
  `<path class="arc" d="${a.d}" stroke="${color}" stroke-width="${w}"/>`;

const files = {};
const sym = arc(0);
files["symbol.svg"] = svg(
  `0 ${60 - ARC.r - ARC.w} ${sym.width} ${ARC.r + ARC.w}`,
  arcPath(sym, ACCENT),
);

// Tile: arc optically centered (sits a little low, its mass is at the top). Heavier stroke so it survives 16px.
const T = 64;
const tArc = { r: 15, w: 11 };
const tBase = 41;
files["tile.svg"] = svg(
  `0 0 ${T} ${T}`,
  `<rect width="${T}" height="${T}" rx="15" fill="${ACCENT}"/><path class="arc" d="M${T / 2 - tArc.r} ${tBase}A${tArc.r} ${tArc.r} 0 0 1 ${T / 2 + tArc.r} ${tBase}" stroke="${PAPER}" stroke-width="${tArc.w}"/>`,
);

for (const [name, color] of [
  ["ink", INK],
  ["paper", PAPER],
]) {
  const wm = wordmark(0);
  files[`wordmark-${name}.svg`] = svg(`-5 -5 ${wm.width + 10} 70`, letters(wm, color));

  const a = arc(0);
  const wmH = wordmark(a.width + 12);
  files[`lockup-${name}.svg`] = svg(
    `-5 -5 ${wmH.width + 10} 70`,
    arcPath(a, ACCENT) + letters(wmH, color),
  );

  // Stacked: arc centered over the wordmark.
  const wmS = wordmark(0);
  const S = { r: 34, w: 20 }; // stacked arc reads as the hero, so it grows
  const aS = arc((wmS.width - (S.r * 2 + S.w)) / 2, 0, S.r, S.w);
  files[`stacked-${name}.svg`] = svg(
    `-5 ${-S.r - S.w - 2} ${wmS.width + 10} ${S.r + S.w + 2 + 76}`,
    arcPath(aS, ACCENT, S.w) + `<g transform="translate(0 16)">${letters(wmS, color)}</g>`,
  );
}

mkdirSync(new URL("./svg/", import.meta.url), { recursive: true });
for (const [name, body] of Object.entries(files))
  writeFileSync(new URL(`./svg/${name}`, import.meta.url), body);
writeFileSync(new URL("../public/favicon.svg", import.meta.url), files["tile.svg"]);

// The site draws the logo inline (header, footer, intro) from this data, so it can animate per stroke.
const site = { arc: arc(0), word: wordmark(0) };
writeFileSync(
  new URL("../src/data/logo.json", import.meta.url),
  JSON.stringify(
    {
      stroke: W,
      arc: {
        d: site.arc.d,
        stroke: ARC.w,
        viewBox: `-1 ${60 - ARC.r - ARC.w - 1} ${site.arc.width + 2} ${ARC.r + ARC.w + 2}`,
      },
      word: {
        viewBox: `-5 -5 ${site.word.width + 10} 70`,
        letters: site.word.paths.map((p) => p.d),
      },
    },
    null,
    2,
  ) + "\n",
);
console.log(Object.keys(files).join("\n"));

// kit.html: live preview of the motion this geometry allows. Inline SVG, pathLength=1 so dash math is 0..1.
const inl = (wm) =>
  wm.paths
    .map(
      (p, i) =>
        `<path pathLength="1" style="--i:${i}" class="l${p.accent ? " acc" : ""}" d="${p.d}"/>`,
    )
    .join("");
const wmK = wordmark(0);
const aK = arc(0);
const arcSvg = (cls = "") =>
  `<svg class="${cls}" viewBox="-2 ${60 - ARC.r - ARC.w - 2} ${aK.width + 4} ${ARC.r + ARC.w + 4}" fill="none" stroke-linecap="round"><path pathLength="1" class="arc" d="${aK.d}"/></svg>`;
const wordSvg = `<svg class="word" viewBox="-5 -5 ${wmK.width + 10} 70" fill="none" stroke-linecap="round" stroke-linejoin="round">${inl(wmK)}</svg>`;
writeFileSync(
  new URL("./kit.html", import.meta.url),
  `<!doctype html><meta charset="utf-8"><title>Arcbuildr kit</title><style>
body{margin:0;padding:40px;background:#f4f2ee;color:#1a1a1a;font:15px/1.4 system-ui;display:grid;gap:48px;max-width:900px}
h2{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#8a8580;margin:0 0 14px}
.l{stroke:currentColor;stroke-width:var(--w,10)}.acc{stroke:${ACCENT}}.arc{stroke:${ACCENT};stroke-width:${ARC.w}}
.big .word{height:80px}.big{display:flex;gap:14px;align-items:flex-end}.big .mk{height:54px;margin-bottom:2px}
.draw .l,.draw .arc{stroke-dasharray:1;stroke-dashoffset:1;animation:d .5s cubic-bezier(.3,0,.2,1) forwards;animation-delay:calc(.25s + var(--i,0)*.06s)}
.draw .arc{animation-delay:0s;animation-duration:.6s}@keyframes d{to{stroke-dashoffset:0}}
.pill{display:flex;align-items:center;margin:auto;width:fit-content;background:#1a1a1a;color:#fff;border-radius:99px;padding:6px 6px 6px 18px;gap:0}
.pill .mk{height:22px;flex:none;border-radius:12px;transition:background .3s,padding .3s}.pill .word{height:22px;display:block}
.pill .ww,.pill nav{overflow:hidden;max-width:200px;transition:max-width .3s cubic-bezier(0,0,.2,1),opacity .2s,margin .3s;margin-left:10px}
.pill nav{display:flex;gap:4px;font-size:13px;white-space:nowrap;margin-right:8px}.pill nav a{padding:10px 6px;color:#fffc}
.cta{background:${ACCENT};color:#fff;font-weight:700;font-size:19px;padding:10px 18px;border-radius:99px;white-space:nowrap}
.closed{padding-left:6px}.closed .mk{background:${ACCENT};height:16px;padding:11px 6px;margin-right:6px}.closed .mk .arc{stroke:#fff}
.closed .ww,.closed nav{max-width:0;opacity:0;margin:0}
.spin{height:40px;animation:s 1s linear infinite}.spin .arc{stroke-dasharray:.6 .4;animation:c 1.2s ease-in-out infinite}
@keyframes s{to{transform:rotate(360deg)}}@keyframes c{50%{stroke-dasharray:.15 .85}}
.prog .arc{stroke-dasharray:1;stroke-dashoffset:calc(1 - var(--p,.3))}.track{stroke:#e2ddd6!important}
.row{display:flex;gap:32px;align-items:center;flex-wrap:wrap}button{font:inherit;padding:6px 12px}
</style>
<section><h2>1. Draw-on (intro, page loads)</h2><div class="big draw" id="draw">${arcSvg("mk")}${wordSvg}</div><button onclick="const e=document.getElementById('draw');e.classList.remove('draw');void e.offsetWidth;e.classList.add('draw')">replay</button></section>
<section><h2>2. Header: closes inward to the tile + CTA</h2><div class="pill" id="pill">${arcSvg("mk")}<span class="ww">${wordSvg}</span><nav><a>Method</a><a>Notes</a><a>About</a></nav><a class="cta">Book a call</a></div><p><button onclick="pill.classList.toggle('closed')">toggle scroll state</button></p></section>
<section><h2>3. Weight is one number (stroke width)</h2><div class="big" id="wt">${wordSvg}</div><input type="range" min="6" max="14" value="10" step=".5" oninput="wt.style.setProperty('--w',this.value)"></section>
<section><h2>4. Arc as loader and as reading progress</h2><div class="row">${arcSvg("spin")}<div class="prog" id="pg" style="position:relative;height:40px"><svg viewBox="-2 ${60 - ARC.r - ARC.w - 2} ${aK.width + 4} ${ARC.r + ARC.w + 4}" style="height:40px" fill="none" stroke-linecap="round"><path class="arc track" d="${aK.d}"/><path pathLength="1" class="arc" d="${aK.d}"/></svg></div><input type="range" min="0" max="1" step=".01" value=".3" oninput="pg.style.setProperty('--p',this.value)"></div></section>
<section><h2>5. Static files (brand/svg)</h2><div class="row">${Object.keys(files)
    .map(
      (f) =>
        `<figure style="margin:0"><img src="svg/${f}" style="height:${f.startsWith("tile") ? 48 : 40}px;${f.includes("paper") ? "background:#1a1a1a;padding:8px;border-radius:8px" : ""}"><figcaption style="font-size:12px;color:#8a8580">${f}</figcaption></figure>`,
    )
    .join("")}</div></section>
`,
);
