// Generates the placeholder line-art illustrations in public/parts/*.svg.
// Run: node scripts/generate-part-icons.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const S = 'fill="none" stroke="#d4d4d8" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"';
const R = 'fill="none" stroke="#c8102e" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"';
const F = 'fill="#c8102e"';

const icons = {
  headlight: `
    <path ${S} d="M60 190 C70 120 130 85 220 80 L340 78 C350 78 356 86 352 96 L318 196 C314 208 304 216 290 216 L90 222 C70 222 58 208 60 190 Z"/>
    <circle ${S} cx="150" cy="152" r="40"/><circle ${R} cx="150" cy="152" r="18"/>
    <path ${S} d="M215 120 L320 116 M210 150 L308 148 M206 180 L296 180"/>
    <path ${R} d="M80 205 C150 200 230 198 300 200"/>`,
  taillight: `
    <path ${S} d="M50 110 L330 90 C348 89 356 102 350 118 L320 200 C316 210 306 216 294 216 L70 214 C54 214 44 200 48 186 Z"/>
    <path ${F} opacity=".85" d="M70 124 L240 112 L226 200 L72 198 Z"/>
    <path ${S} d="M250 112 L328 106 L302 198 L238 200 Z"/>
    <path fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".6" d="M90 150 L210 145 M88 175 L205 172"/>`,
  bumper: `
    <path ${S} d="M30 120 C40 95 70 85 110 84 L290 84 C330 85 360 95 370 120 L374 190 C374 206 362 216 346 216 L54 216 C38 216 26 206 26 190 Z"/>
    <path ${S} d="M110 130 L290 130 C300 130 306 138 304 146 L298 176 C296 184 290 188 282 188 L118 188 C110 188 104 184 102 176 L96 146 C94 138 100 130 110 130 Z"/>
    <path ${S} d="M120 150 L280 150 M122 168 L278 168"/>
    <circle ${R} cx="62" cy="170" r="14"/><circle ${R} cx="338" cy="170" r="14"/>`,
  hood: `
    <path ${S} d="M70 230 L110 80 C112 72 120 66 128 66 L272 66 C280 66 288 72 290 80 L330 230 C332 238 326 244 318 244 L82 244 C74 244 68 238 70 230 Z"/>
    <path ${S} d="M160 70 L148 240 M240 70 L252 240" opacity=".55"/>
    <path ${R} d="M120 100 L280 100"/>`,
  grille: `
    <path ${S} d="M40 110 C60 80 110 70 200 70 C290 70 340 80 360 110 L340 200 C334 216 320 226 300 226 L100 226 C80 226 66 216 60 200 Z"/>
    <path ${S} d="M70 120 L330 120 M66 150 L334 150 M72 180 L328 180 M82 208 L318 208" opacity=".7"/>
    <ellipse ${R} cx="200" cy="148" rx="34" ry="24"/><ellipse ${R} cx="200" cy="148" rx="10" ry="20"/>`,
  mirror: `
    <path ${S} d="M90 90 C120 70 260 64 310 80 C340 90 350 120 342 160 C334 200 300 220 250 222 L130 224 C90 224 66 200 64 160 C62 126 70 104 90 90 Z"/>
    <path ${S} d="M106 108 C140 92 250 88 292 100 C314 108 322 128 316 158 C310 188 286 202 248 204 L136 206 C106 206 88 188 86 160 C84 134 90 118 106 108 Z" opacity=".6"/>
    <path ${R} d="M200 224 L200 262 L140 262"/><path ${R} d="M250 130 L300 128"/>`,
  door: `
    <path ${S} d="M70 60 L250 60 C270 60 300 70 320 100 L340 140 L340 250 C340 260 332 266 322 266 L80 266 C70 266 62 258 62 248 L62 70 C62 64 66 60 70 60 Z"/>
    <path ${S} d="M84 82 L240 82 C260 82 284 94 298 120 L306 138 L84 138 Z" opacity=".7"/>
    <path ${R} d="M230 170 L290 170"/>
    <path ${S} d="M62 200 L340 196" opacity=".5"/>`,
  engine: `
    <rect ${S} x="80" y="100" width="220" height="120" rx="12"/>
    <path ${S} d="M110 100 L110 70 L270 70 L270 100 M140 70 L140 52 L240 52 L240 70"/>
    <path ${S} d="M300 130 L340 130 L340 190 L300 190 M80 140 L50 140 L50 190 L80 190"/>
    <circle ${R} cx="140" cy="160" r="22"/><circle ${R} cx="240" cy="160" r="22"/>
    <path ${S} d="M110 220 L110 248 M270 220 L270 248 M190 220 L190 248"/>`,
  gearbox: `
    <path ${S} d="M60 120 L160 90 L320 110 C340 112 350 126 350 146 L350 186 C350 206 338 218 318 220 L160 236 L60 206 Z"/>
    <path ${S} d="M160 90 L160 236" opacity=".6"/>
    <circle ${R} cx="250" cy="164" r="34"/><circle ${S} cx="250" cy="164" r="12"/>
    <path ${S} d="M90 140 L130 132 M90 170 L130 168 M90 196 L130 200"/>`,
  suspension: `
    <path ${S} d="M200 40 L200 80 M200 220 L200 262"/>
    <rect ${S} x="176" y="150" width="48" height="84" rx="8"/>
    <path ${R} d="M150 86 L250 98 L150 110 L250 122 L150 134 L250 146 L150 158 L250 170"/>
    <rect ${S} x="140" y="72" width="120" height="16" rx="6"/>
    <circle ${S} cx="200" cy="262" r="12"/>`,
  brake: `
    <circle ${S} cx="190" cy="160" r="100"/><circle ${S} cx="190" cy="160" r="38"/>
    <path ${S} d="M190 70 L190 80 M190 240 L190 250 M100 160 L110 160 M270 160 L280 160" opacity=".6"/>
    <path ${F} d="M262 82 C300 96 322 130 324 168 L282 170 C280 146 268 126 248 114 Z"/>
    <circle cx="190" cy="160" r="8" fill="#d4d4d8"/>`,
  radiator: `
    <rect ${S} x="60" y="70" width="280" height="170" rx="10"/>
    <path ${S} d="M90 70 L90 240 M120 70 L120 240 M150 70 L150 240 M180 70 L180 240 M210 70 L210 240 M240 70 L240 240 M270 70 L270 240 M300 70 L300 240" opacity=".55"/>
    <path ${R} d="M340 100 L370 100 M30 210 L60 210"/>
    <rect ${S} x="60" y="52" width="280" height="18" rx="6"/>`,
  electrical: `
    <circle ${S} cx="190" cy="160" r="86"/><circle ${S} cx="190" cy="160" r="54"/>
    <path ${S} d="M190 106 L190 214 M136 160 L244 160 M152 122 L228 198 M228 122 L152 198" opacity=".55"/>
    <circle ${R} cx="190" cy="160" r="16"/>
    <path ${S} d="M276 140 L320 140 L320 120 M276 180 L330 180"/>`,
  display: `
    <rect ${S} x="60" y="70" width="280" height="170" rx="14"/>
    <rect ${S} x="80" y="90" width="240" height="130" rx="6" opacity=".6"/>
    <path ${R} d="M100 190 L150 150 L190 176 L240 120 L300 160"/>
    <circle cx="200" cy="230" r="4" fill="#d4d4d8"/>`,
  seat: `
    <path ${S} d="M150 40 C190 36 214 50 214 80 L206 170 C204 186 194 196 178 198 L132 202 C116 204 106 194 108 178 L118 64 C120 50 132 42 150 40 Z"/>
    <path ${S} d="M120 200 L280 196 C300 196 312 210 308 228 L300 250 L110 254 C100 254 92 246 94 236 Z"/>
    <path ${R} d="M138 60 L188 58"/><path ${S} d="M200 254 L196 280 M130 256 L126 280 M270 252 L276 280"/>`,
  wheel: `
    <circle ${S} cx="200" cy="155" r="110"/><circle ${S} cx="200" cy="155" r="80"/>
    ${Array.from({ length: 10 }, (_, i) => {
      const a = (i * Math.PI) / 5;
      const x1 = (200 + Math.cos(a) * 22).toFixed(1), y1 = (155 + Math.sin(a) * 22).toFixed(1);
      const x2 = (200 + Math.cos(a) * 76).toFixed(1), y2 = (155 + Math.sin(a) * 76).toFixed(1);
      return `<path ${S} d="M${x1} ${y1} L${x2} ${y2}"/>`;
    }).join("")}
    <circle ${R} cx="200" cy="155" r="18"/>`,
  generic: `
    <path ${S} d="M200 50 L300 105 L300 215 L200 270 L100 215 L100 105 Z"/>
    <path ${S} d="M100 105 L200 160 L300 105 M200 160 L200 270" opacity=".6"/>
    <circle ${R} cx="200" cy="160" r="20"/>`,
};

const out = join(process.cwd(), "public", "parts");
mkdirSync(out, { recursive: true });
for (const [name, body] of Object.entries(icons)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">${body.replace(/\s+/g, " ").trim()}</svg>\n`;
  writeFileSync(join(out, `${name}.svg`), svg);
}
console.log(`Wrote ${Object.keys(icons).length} icons to ${out}`);
