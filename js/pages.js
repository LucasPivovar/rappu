/**
 * rappu — Páginas vivas do livro
 * Cada página é uma mini landing page desenhada em <canvas> a cada frame,
 * com animações (motion) e áreas interativas (hover, clique, arrastar).
 *
 * Para personalizar textos de contato, edite o objeto CONFIG abaixo.
 */

const CONFIG = {
  email: 'hello@rappu.io',
  socials: [
    { label: 'GitHub', url: 'https://github.com/LucasPivovar' },
    { label: 'Instagram', url: '' },
    { label: 'LinkedIn', url: '' },
    { label: 'Dribbble', url: '' },
  ],
};

// Espaço lógico de cada página (proporção A4 do livro) e resolução real da textura
const PW = 800;
const PH = 1130;
const RES = 1.28;
const TOPBAR = 124; // altura do menu fixo
const BOTTOMBAR = 1062; // início do rodapé fixo

const FONT = {
  sans: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, Menlo, monospace',
  serif: '"Instrument Serif", Georgia, "Times New Roman", serif',
};

// Cada landing page tem sua própria tipografia (d = display, b = texto, m = mono)
const TYPE = {
  kora: { d: '"Big Shoulders Display", "Arial Narrow", sans-serif', b: '"Manrope", system-ui, sans-serif', m: '"Geist Mono", ui-monospace, monospace' },
  aurora: { d: '"Archivo", Arial, sans-serif', b: '"Archivo", Arial, sans-serif', m: '"IBM Plex Mono", ui-monospace, monospace' },
  pulse: { d: '"Anton", Impact, "Arial Narrow", sans-serif', b: '"Figtree", system-ui, sans-serif', m: '"Geist Mono", ui-monospace, monospace' },
  orbit: { d: '"Chakra Petch", "Arial Narrow", sans-serif', b: '"IBM Plex Sans", system-ui, sans-serif', m: '"IBM Plex Mono", ui-monospace, monospace' },
  bloom: { d: '"Cormorant Garamond", Garamond, Georgia, serif', b: '"Jost", system-ui, sans-serif', m: '"Jost", system-ui, sans-serif' },
  kinetic: { d: '"Unbounded", "Arial Black", sans-serif', b: '"Instrument Sans", system-ui, sans-serif', m: '"Geist Mono", ui-monospace, monospace' },
  nimbus: { d: '"Urbanist", system-ui, sans-serif', b: '"Urbanist", system-ui, sans-serif', m: '"Geist Mono", ui-monospace, monospace' },
  contact: { d: '"Instrument Serif", Georgia, serif', b: '"Geist", system-ui, sans-serif', m: '"Geist Mono", ui-monospace, monospace' },
};
let CUR_F = { d: FONT.sans, b: FONT.sans, m: FONT.mono };
const famOf = (f) => {
  if (f === 'd' || f === 'b' || f === 'm') return CUR_F[f];
  if (f && f.charAt(0) === '"') return f + ', system-ui, sans-serif';
  return FONT[f || 'b'] || CUR_F.b;
};

// O canvas só usa uma webfont depois que ela é baixada: pedimos todas explicitamente
const FONT_FACES = [
  '700 20px "Big Shoulders Display"', '800 20px "Big Shoulders Display"', '400 20px "Manrope"', '600 20px "Manrope"',
  '400 20px "Archivo"', '600 20px "Archivo"', '900 20px "Archivo"',
  '400 20px "Anton"', '400 20px "Figtree"', '700 20px "Figtree"',
  '500 20px "Chakra Petch"', '700 20px "Chakra Petch"', '400 20px "IBM Plex Sans"', '600 20px "IBM Plex Sans"', '500 20px "IBM Plex Mono"',
  '500 20px "Cormorant Garamond"', '600 20px "Cormorant Garamond"', '400 20px "Jost"', '500 20px "Jost"', '600 20px "Jost"',
  '200 20px "Unbounded"', '500 20px "Unbounded"', '900 20px "Unbounded"', '400 20px "Instrument Sans"', '600 20px "Instrument Sans"',
  '200 20px "Urbanist"', '400 20px "Urbanist"', '700 20px "Urbanist"',
  '400 20px "Instrument Serif"', '400 20px "Geist"', '600 20px "Geist"', '400 20px "Geist Mono"', '600 20px "Geist Mono"',
  '400 20px "Plus Jakarta Sans"', '800 20px "Plus Jakarta Sans"', '400 20px "JetBrains Mono"', '600 20px "JetBrains Mono"',
];
window.pageFontsReady = document.fonts
  ? Promise.all(FONT_FACES.map((f) => document.fonts.load(f).catch(() => null)))
  : Promise.resolve();

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const TAU = Math.PI * 2;

// "Tinta" da página atual: branca nas páginas escuras, quase-preta no papel claro
let INK = '#ffffff';
let INK_RGB = '255,255,255';
const ink = (a) => `rgba(${INK_RGB},${a})`;

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(typeof r === 'number' ? r : 0, w / 2, h / 2);
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
  };
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function txt(ctx, s, x, y, o = {}) {
  const size = o.size || 16;
  const weight = o.weight || 400;
  const fam = famOf(o.fam);
  ctx.font = `${o.italic ? 'italic ' : ''}${weight} ${size}px ${fam}`;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.baseline || 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = o.ls || '0px';
  const prevAlpha = ctx.globalAlpha;
  if (o.alpha !== undefined) ctx.globalAlpha = prevAlpha * o.alpha;
  if (o.stroke) {
    ctx.strokeStyle = o.stroke;
    ctx.lineWidth = o.lineWidth || 1.5;
    ctx.strokeText(s, x, y);
  } else {
    ctx.fillStyle = o.color || INK;
    ctx.fillText(s, x, y);
  }
  ctx.globalAlpha = prevAlpha;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
}

function measure(ctx, s, o = {}) {
  ctx.font = `${o.italic ? 'italic ' : ''}${o.weight || 400} ${o.size || 16}px ${famOf(o.fam)}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = o.ls || '0px';
  const w = ctx.measureText(s).width;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  return w;
}

function glow(ctx, x, y, r, rgb, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function hexToArr(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgbStr = (c) => `${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])}`;
const dampArr = (cur, target, l, dt) => cur.map((v, i) => damp(v, target[i], l, dt));

let NOISE_CANVAS = null;
function getNoise() {
  if (NOISE_CANVAS) return NOISE_CANVAS;
  const c = document.createElement('canvas');
  c.width = c.height = 200;
  const x = c.getContext('2d');
  const img = x.createImageData(200, 200);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = Math.random() < 0.5 ? 10 : 0;
  }
  x.putImageData(img, 0, 0);
  NOISE_CANVAS = c;
  return c;
}

function sound(kind) {
  const a = window.paperAudio;
  if (!a) return;
  if (kind === 'click') a.playKeyClick();
  else if (kind === 'tick') a.playHoverTick();
}

// ---------------------------------------------------------------------------
// Classe base: uma página = um canvas animado com regiões interativas
// ---------------------------------------------------------------------------
class LivePage {
  constructor(num, label) {
    this.num = num;
    this.label = label;
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.round(PW * RES);
    this.canvas.height = Math.round(PH * RES);
    this.ctx = this.canvas.getContext('2d');
    this.t = 0;
    this.p = { x: PW / 2, y: PH * 0.45, inside: false, down: false };
    this.sp = { x: PW / 2, y: PH * 0.45 };
    this.regions = [];
    this.nextRegions = [];
    this.hover = null;
    this.anims = {};
    this.fx = [];
    this.toastMsg = '';
    this.toastT = 0;
    this.shownAt = 0;
    this.dragId = null;
    this.onNavigate = null;
    if (this.init) this.init();
  }

  setPointer(x, y, inside) {
    this.p.inside = inside;
    if (inside) {
      this.p.x = x;
      this.p.y = y;
    } else {
      this.p.down = false;
    }
  }

  regionAt(x, y) {
    for (let i = this.regions.length - 1; i >= 0; i--) {
      const r = this.regions[i];
      // regiões do conteúdo rolável não respondem embaixo do menu fixo ou do rodapé
      if (r.s && (y < TOPBAR || y > BOTTOMBAR)) continue;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r;
    }
    return null;
  }

  get isHot() {
    return !!this.hover;
  }

  region(id, x, y, w, h) {
    const off = this._inScroll ? -(this.scroll || 0) : 0;
    this.nextRegions.push({ id, x, y: y + off, w, h, s: !!this._inScroll });
  }

  // ---- rolagem interna da landing page (roda do mouse sobre a página) ----
  get maxScroll() {
    return Math.max(0, (this.contentH || PH) - PH);
  }

  scrollBy(dy) {
    if (this.maxScroll <= 0) return false;
    this.scrollT = clamp((this.scrollT || 0) + dy, 0, this.maxScroll);
    this.scrollIdle = 0;
    return true;
  }

  // Desenha o conteúdo deslocado pela rolagem; ponteiro e regiões ficam em coordenadas do conteúdo
  scrollArea(ctx, fn) {
    const s = this.scroll || 0;
    ctx.save();
    ctx.translate(0, -s);
    this._inScroll = true;
    const py = this.p.y, spy = this.sp.y;
    this.p.y += s;
    this.sp.y += s;
    fn();
    this.p.y = py;
    this.sp.y = spy;
    this._inScroll = false;
    ctx.restore();
  }

  // Faixa do menu fixo: aparece quando a página é rolada
  topBand(ctx, color) {
    const a = clamp((this.scroll || 0) / 50, 0, 1);
    if (a <= 0) return;
    ctx.globalAlpha = a;
    ctx.fillStyle = color || this.bgColor || '#000';
    ctx.fillRect(0, 0, PW, TOPBAR);
    ctx.fillStyle = ink(0.08);
    ctx.fillRect(0, TOPBAR, PW, 1);
    ctx.globalAlpha = 1;
  }

  // Rodapé fixo com fólio, barra de rolagem e dica "role para ver mais"
  chrome(ctx, color) {
    const max = this.maxScroll;
    if (max > 0) {
      ctx.fillStyle = color || this.bgColor || '#000';
      ctx.fillRect(0, BOTTOMBAR, PW, PH - BOTTOMBAR);
      // barra de rolagem
      const trackY = TOPBAR + 16, trackH = BOTTOMBAR - TOPBAR - 32;
      const thumbH = Math.max(60, trackH * (PH / this.contentH));
      const ty = trackY + (trackH - thumbH) * ((this.scroll || 0) / max);
      const a = 0.12 + 0.3 * clamp(1 - (this.scrollIdle || 0) / 1.5, 0, 1);
      rr(ctx, PW - 12, ty, 4, thumbH, 2);
      ctx.fillStyle = ink(a);
      ctx.fill();
      if ((this.scroll || 0) < 20) {
        const b = Math.sin(this.t * 3) * 4;
        txt(ctx, 'role para ver mais  ↓', PW / 2, BOTTOMBAR - 14 + b, { size: 12, fam: 'm', align: 'center', alpha: 0.55, ls: '1px' });
      }
    }
    this.folio(ctx);
  }

  h(id) {
    if (!(id in this.anims)) this.anims[id] = 0;
    return this.anims[id];
  }

  onShow() {
    this.shownAt = this.t;
  }

  frame(dt) {
    dt = Math.min(dt, 0.05);
    this.t += dt;
    this.sp.x = damp(this.sp.x, this.p.x, 7, dt);
    this.sp.y = damp(this.sp.y, this.p.y, 7, dt);

    const r = this.p.inside ? this.regionAt(this.p.x, this.p.y) : null;
    const newHover = r ? r.id : null;
    if (newHover && newHover !== this.hover) sound('tick');
    this.hover = newHover;
    for (const k in this.anims) {
      this.anims[k] = damp(this.anims[k], k === this.hover ? 1 : 0, 12, dt);
    }

    this.scrollT = clamp(this.scrollT || 0, 0, this.maxScroll);
    this.scroll = damp(this.scroll || 0, this.scrollT, 10, dt);
    if (Math.abs(this.scroll - this.scrollT) < 0.3) this.scroll = this.scrollT;
    this.scrollIdle = (this.scrollIdle || 0) + dt;
    const ctx = this.ctx;
    this.contentH = PH;
    CUR_F = TYPE[this.type] || { d: FONT.sans, b: FONT.sans, m: FONT.mono };
    this.dt = dt;
    this.tabT = (this.tabT || 0) + dt;
    INK = this.light ? '#0d1020' : '#ffffff';
    INK_RGB = this.light ? '13,16,32' : '255,255,255';
    this.nextRegions = [];
    ctx.setTransform(RES, 0, 0, RES, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    this.draw(ctx, this.t, dt);
    this.drawFx(ctx, dt);
    this.regions = this.nextRegions;
  }

  pointerDown(x, y) {
    this.p.down = true;
    const r = this.regionAt(x, y);
    if (r) {
      this.dragId = r.id;
      if (r.id.startsWith('tab')) {
        this.setTab(+r.id.slice(3));
        return true;
      }
      // para regiões roláveis, o y entregue fica em coordenadas do conteúdo
      this._pressOff = r.s ? this.scroll || 0 : 0;
      if (this.onPress) this.onPress(r.id, x, y + this._pressOff);
      this._pressOff = 0;
      return true;
    }
    return false;
  }

  pointerUp() {
    this.p.down = false;
    this.dragId = null;
  }

  setTab(i) {
    if (i === this.tab) return;
    this.tab = i;
    this.tabT = 0;
    this.scroll = this.scrollT = 0;
    sound('click');
    if (this.onTab) this.onTab(i);
  }

  // Desenha a tela atual com uma entrada suave (fade + leve subida) ao trocar de aba
  screen(ctx, fn) {
    const k = easeOut(this.tabT / 0.5);
    ctx.save();
    ctx.globalAlpha = k;
    ctx.translate(0, (1 - k) * 28);
    fn();
    ctx.restore();
  }

  // Menu de navegação da landing page: cada item é uma aba clicável
  navTabs(ctx, labels, x, y, o = {}) {
    const size = o.size || 17;
    const weight = o.weight || 600;
    const fam = o.fam || 'b';
    let cx = x;
    const pos = [];
    labels.forEach((l, i) => {
      const w = measure(ctx, l, { size, weight, fam, ls: o.ls });
      this.region('tab' + i, cx - 12, y - 30, w + 24, 46);
      const hv = this.h('tab' + i);
      const on = i === (this.tab || 0);
      txt(ctx, l, cx, y, { size, weight, fam, ls: o.ls, color: on ? o.active || INK : INK, alpha: on ? 1 : 0.5 + hv * 0.4 });
      pos.push([cx, w]);
      cx += w + (o.gap || 28);
    });
    const [tx, tw] = pos[this.tab || 0];
    this._ulx = this._ulx === undefined ? tx : damp(this._ulx, tx, 14, this.dt);
    this._ulw = this._ulw === undefined ? tw : damp(this._ulw, tw, 14, this.dt);
    ctx.fillStyle = o.accent || INK;
    ctx.fillRect(this._ulx, y + 10, this._ulw, 2.5);
  }

  ripple(x, y, rgb) {
    this.fx.push({ x, y: y - (this._pressOff || 0), t: 0, rgb: rgb || INK_RGB });
  }

  toast(msg) {
    this.toastMsg = msg;
    this.toastT = 2.4;
  }

  drawFx(ctx, dt) {
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.t += dt;
      const k = f.t / 0.7;
      if (k >= 1) {
        this.fx.splice(i, 1);
        continue;
      }
      ctx.strokeStyle = `rgba(${f.rgb},${(1 - k) * 0.8})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 10 + easeOut(k) * 90, 0, TAU);
      ctx.stroke();
    }

    if (this.toastT > 0) {
      this.toastT -= dt;
      const a = clamp(Math.min(this.toastT / 0.3, (2.4 - this.toastT) / 0.25), 0, 1);
      const w = measure(ctx, this.toastMsg, { size: 15, weight: 600 }) + 48;
      const y = PH - 150 + (1 - a) * 16;
      ctx.globalAlpha = a;
      rr(ctx, PW / 2 - w / 2, y, w, 46, 23);
      ctx.fillStyle = this.light ? 'rgba(13,16,32,0.94)' : 'rgba(250,250,252,0.96)';
      ctx.fill();
      txt(ctx, this.toastMsg, PW / 2, y + 29, { size: 15, weight: 600, color: this.light ? '#ffffff' : '#0b0b10', align: 'center' });
      ctx.globalAlpha = 1;
    }
  }

  bg(ctx, color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, PW, PH);
  }

  grain(ctx) {
    if (!this._pattern) this._pattern = ctx.createPattern(getNoise(), 'repeat');
    ctx.fillStyle = this._pattern;
    ctx.globalAlpha = this.light ? 0.6 : 1;
    ctx.fillRect(0, 0, PW, PH);
    ctx.globalAlpha = 1;
  }

  folio(ctx) {
    ctx.strokeStyle = ink(0.1);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(56, 1078);
    ctx.lineTo(PW - 56, 1078);
    ctx.stroke();
    txt(ctx, 'rappu — vol. 01', 56, 1104, { size: 11, fam: 'm', alpha: 0.35, ls: '1px' });
    txt(ctx, `${this.label.toUpperCase()}   ${String(this.num).padStart(2, '0')} / 08`, PW - 56, 1104, {
      size: 11, fam: 'm', alpha: 0.35, align: 'right', ls: '1px',
    });
  }

  button(ctx, id, x, y, w, h, label, o = {}) {
    const hv = this.h(id);
    this.region(id, x, y, w, h);
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    const s = 1 + hv * 0.025;
    ctx.scale(s, s);
    if (o.glow) glow(ctx, 0, 0, w * 0.75, o.glow, 0.35 * hv);
    rr(ctx, -w / 2, -h / 2, w, h, h / 2);
    if (o.fill) {
      ctx.fillStyle = o.fill;
      ctx.fill();
    } else {
      ctx.fillStyle = ink(0.04 + hv * 0.1);
      ctx.fill();
      ctx.strokeStyle = ink(0.18 + hv * 0.2);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    const arrow = o.arrow ? '  →' : '';
    txt(ctx, label + arrow, hv * (o.arrow ? 3 : 0), 6, {
      size: o.size || 15, weight: o.weight || 700, fam: o.fam || 'b', color: o.color || INK, align: 'center', ls: o.ls,
    });
    ctx.restore();
    return hv;
  }
}

// ---------------------------------------------------------------------------
// CAPA (lado de fora) — anima enquanto o livro está fechado
// ---------------------------------------------------------------------------
class CoverPage extends LivePage {
  init() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#0e0f13';
    x.fillRect(0, 0, 64, 64);
    x.fillStyle = 'rgba(255,255,255,0.025)';
    for (let i = 0; i < 64; i += 3) {
      x.fillRect(i, 0, 1, 64);
      x.fillRect(0, i, 64, 1);
    }
    this.linen = c;
    this.hoverAmt = 0;
  }

  draw(ctx, t, dt) {
    if (!this._linen) this._linen = ctx.createPattern(this.linen, 'repeat');
    ctx.fillStyle = this._linen;
    ctx.fillRect(0, 0, PW, PH);

    glow(ctx, 400, 470, 520, '120,110,255', 0.10 + this.hoverAmt * 0.08);
    glow(ctx, 520 + Math.sin(t * 0.4) * 60, 380, 300, '236,72,153', 0.06);
    glow(ctx, 280 + Math.cos(t * 0.35) * 60, 560, 320, '34,211,238', 0.06);

    // moldura com "hot stamping" dourado
    const gold = 'rgba(214,190,140,';
    ctx.strokeStyle = gold + '0.38)';
    ctx.lineWidth = 1.5;
    rr(ctx, 40, 40, PW - 80, PH - 80, 10);
    ctx.stroke();
    ctx.strokeStyle = gold + '0.14)';
    rr(ctx, 52, 52, PW - 104, PH - 104, 6);
    ctx.stroke();

    txt(ctx, 'VOLUME 01', 400, 140, { size: 14, fam: 'mono', color: '#d6be8c', align: 'center', ls: '6px', alpha: 0.85 });

    // emblema orbital
    ctx.save();
    ctx.translate(400, 330);
    ctx.strokeStyle = gold + '0.55)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate(t * 0.25 + (i * Math.PI) / 3);
      ctx.beginPath();
      ctx.ellipse(0, 0, 88, 30, 0, 0, TAU);
      ctx.stroke();
      const a = t * (1.2 + i * 0.3) + i * 2;
      ctx.fillStyle = '#f5e6c4';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 88, Math.sin(a) * 30, 3.2, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    glow(ctx, 0, 0, 40, '245,230,196', 0.5);
    ctx.restore();

    // título com brilho que varre
    const sweep = ((t * 0.22) % 1.6) - 0.3;
    const g = ctx.createLinearGradient(80, 0, 720, 0);
    g.addColorStop(0, '#e9e9ee');
    g.addColorStop(clamp(sweep - 0.12, 0, 1), '#e9e9ee');
    g.addColorStop(clamp(sweep, 0, 1), '#ffffff');
    g.addColorStop(clamp(sweep + 0.01, 0, 1), '#f5e6c4');
    g.addColorStop(clamp(sweep + 0.12, 0, 1), '#e9e9ee');
    g.addColorStop(1, '#e9e9ee');
    txt(ctx, 'rappu', 400, 600, { size: 178, weight: 800, color: g, align: 'center', ls: '-8px' });
    txt(ctx, 'interfaces em movimento', 400, 670, { size: 46, fam: 'serif', color: '#cfcfe0', align: 'center', alpha: 0.85 });

    txt(ctx, 'Trabalhos selecionados de web e interface.', 400, 760, { size: 18, align: 'center', alpha: 0.5 });

    // convite para abrir
    const pulse = 0.5 + Math.sin(t * 2.4) * 0.5;
    const w = 280;
    ctx.save();
    ctx.translate(400, 930);
    glow(ctx, 0, 0, 200, '200,190,255', 0.10 + pulse * 0.08 + this.hoverAmt * 0.15);
    rr(ctx, -w / 2, -28, w, 56, 28);
    ctx.fillStyle = `rgba(255,255,255,${0.05 + this.hoverAmt * 0.08})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.25 + pulse * 0.25})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    txt(ctx, 'CLIQUE PARA ABRIR', 0, 6, { size: 14, fam: 'mono', weight: 600, align: 'center', ls: '3px' });
    ctx.restore();

    txt(ctx, 'EDIÇÃO 2026 · RAPPU STUDIO', 400, 1040, { size: 12, fam: 'mono', align: 'center', alpha: 0.35, ls: '3px' });
    this.grain(ctx);
  }
}

// ---------------------------------------------------------------------------
// Componentes compartilhados das landing pages
// ---------------------------------------------------------------------------
LivePage.prototype.segmented = function (ctx, id, labels, sel, x, y, w, h, o = {}) {
  const n = labels.length;
  const cw = (w - 8) / n;
  const key = '_seg' + id;
  this[key] = this[key] === undefined ? sel : damp(this[key], sel, 14, this.dt);
  rr(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = o.track || ink(0.06);
  ctx.fill();
  rr(ctx, x + 4 + this[key] * cw, y + 4, cw, h - 8, (h - 8) / 2);
  ctx.fillStyle = o.accent || INK;
  ctx.fill();
  labels.forEach((l, i) => {
    this.region(id + i, x + 4 + i * cw, y, cw, h);
    const on = Math.abs(this[key] - i) < 0.5;
    txt(ctx, l, x + 4 + i * cw + cw / 2, y + h / 2 + 5, {
      size: o.size || 14, weight: o.weight || 600, fam: o.fam || 'b', align: 'center',
      color: on ? o.onColor || '#ffffff' : ink(0.62),
    });
  });
};

LivePage.prototype.chip = function (ctx, id, label, x, y, on, o = {}) {
  const size = o.size || 15;
  const w = measure(ctx, label, { size, weight: 500, fam: 'b' }) + 36;
  const h = o.h || 42;
  const hv = this.h(id);
  this.region(id, x, y, w, h);
  rr(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = on ? o.accent || INK : ink(0.04 + hv * 0.06);
  ctx.fill();
  ctx.strokeStyle = on ? o.accent || INK : ink(0.18 + hv * 0.2);
  ctx.lineWidth = 1;
  ctx.stroke();
  txt(ctx, label, x + w / 2, y + h / 2 + 5, { size, weight: 500, fam: 'b', align: 'center', color: on ? o.onColor || '#ffffff' : INK });
  return w;
};

function fitSize(ctx, s, maxW, maxSize, o) {
  const w = measure(ctx, s, { ...o, size: maxSize });
  return Math.min(maxSize, (maxSize * maxW) / w);
}

const brl = (v, dec = 2) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

// Quebra texto em linhas que cabem em maxW; retorna a altura usada
function wrapText(ctx, s, x, y, maxW, lh, o = {}) {
  const words = s.split(' ');
  let line = '';
  let yy = y;
  words.forEach((w) => {
    const test = line ? line + ' ' + w : w;
    if (measure(ctx, test, o) > maxW && line) {
      txt(ctx, line, x, yy, o);
      line = w;
      yy += lh;
    } else line = test;
  });
  if (line) txt(ctx, line, x, yy, o);
  return yy - y + lh;
}

// ---------------------------------------------------------------------------
// Fotos (Unsplash) usadas nas landing pages
// ---------------------------------------------------------------------------
const PHOTOS = {};
function photo(key) {
  if (!PHOTOS[key]) {
    const im = new Image();
    im.src = `assets/photos/${key}.webp`;
    PHOTOS[key] = im;
  }
  const im = PHOTOS[key];
  return im.complete && im.naturalWidth ? im : null;
}

// desenha a foto cobrindo o retângulo (como object-fit: cover), com zoom e deslocamento
function drawCover(ctx, im, x, y, w, h, zoom = 1, dx = 0, dy = 0) {
  const s = Math.max(w / im.naturalWidth, h / im.naturalHeight) * zoom;
  const iw = im.naturalWidth * s, ih = im.naturalHeight * s;
  ctx.drawImage(im, x + (w - iw) / 2 + dx, y + (h - ih) / 2 + dy, iw, ih);
}

// ---------------------------------------------------------------------------
// Modelo de landing page: menu, título grande, foto principal, texto + número e 3 cartões.
// Cada marca muda tipografia, cores, textos e fotos.
// ---------------------------------------------------------------------------
class StudioLanding extends LivePage {
  constructor(num, label, cfg) {
    super(num, label);
    this.cfg = cfg;
    this.type = cfg.type;
    this.light = !!cfg.light;
    this.started = false;
    this.loader = !!cfg.loader;
    this.sel = -1;
  }

  onShow() {
    this.started = true;
    this.shownAt = this.t;
  }

  get lead() {
    return this.loader ? 1.1 : 0.05;
  }

  inK(delay) {
    if (!this.started) return 0;
    return easeOut((this.t - this.shownAt - this.lead - delay) / 0.6);
  }

  reveal(ctx, delay, y, h, fn) {
    const k = this.inK(delay);
    if (k <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y - h, PW, h * 1.3);
    ctx.clip();
    ctx.translate(0, (1 - k) * h);
    fn();
    ctx.restore();
  }

  fade(ctx, delay, fn) {
    const k = this.inK(delay);
    if (k <= 0) return;
    ctx.save();
    ctx.globalAlpha *= k;
    ctx.translate(0, (1 - k) * 24);
    fn(k);
    ctx.restore();
  }

  drawLoader(ctx, e) {
    const c = this.cfg;
    const lp = clamp(e / 0.9, 0, 1);
    const out = easeOut((e - 0.9) / 0.35);
    if (out >= 1) return;
    ctx.save();
    ctx.globalAlpha = 1 - out;
    const pe = lp < 0.5 ? 4 * lp ** 3 : 1 - Math.pow(-2 * lp + 2, 3) / 2;
    // a planta de uma casa se desenha linha por linha
    const segs = [[300, 440, 500, 440], [500, 440, 500, 560], [500, 560, 300, 560], [300, 560, 300, 440], [380, 440, 380, 520], [380, 520, 440, 520], [440, 500, 500, 500]];
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 3;
    segs.forEach((sg, i) => {
      const k = clamp(pe * segs.length - i, 0, 1);
      if (k <= 0) return;
      ctx.beginPath();
      ctx.moveTo(sg[0], sg[1]);
      ctx.lineTo(lerp(sg[0], sg[2], k), lerp(sg[1], sg[3], k));
      ctx.stroke();
    });
    txt(ctx, c.logo, 400, 630, { size: 40, weight: c.logoWeight || 800, fam: 'd', align: 'center', ls: c.logoLs || '8px' });
    txt(ctx, String(Math.round(pe * 100)).padStart(2, '0') + '%', 400, 668, { size: 13, fam: 'm', align: 'center', alpha: 0.55, ls: '2px' });
    ctx.restore();
  }

  draw(ctx, t) {
    const c = this.cfg;
    const e = this.started ? t - this.shownAt : 0;
    this.bgColor = c.bg;
    this.bg(ctx, c.bg);
    if (this.loader) this.drawLoader(ctx, e);
    glow(ctx, 660, 220, 360, c.glow || hexToArr(c.accent).join(','), 0.1 * this.inK(0.1));

    // ---------- menu ----------
    this.fade(ctx, 0, () => {
      txt(ctx, c.logo, 56, 96, { size: c.logoSize || 30, weight: c.logoWeight || 800, fam: 'd', ls: c.logoLs || '6px' });
      const ctaW = measure(ctx, c.cta, { size: 14, weight: 700, fam: 'b' }) + 44;
      let x = PW - 56 - ctaW - 36;
      [...c.nav].reverse().forEach((l, ri) => {
        const i = c.nav.length - 1 - ri;
        const w = measure(ctx, l, { size: 16, weight: 600, fam: 'b' });
        x -= w;
        const id = 'nv' + i;
        this.region(id, x - 8, 66, w + 16, 40);
        txt(ctx, l, x, 92, { size: 16, weight: 600, fam: 'b', alpha: 0.6 + this.h(id) * 0.4 });
        ctx.fillStyle = c.accent;
        ctx.fillRect(x, 100, w * this.h(id), 1.5);
        x -= 30;
      });
      this.button(ctx, 'cta', PW - 56 - ctaW, 68, ctaW, 42, c.cta, { fill: c.accent, color: c.ctaInk || '#111111', size: 14 });
    });

    // ---------- título ----------
    this.reveal(ctx, 0.05, 168, 20, () => txt(ctx, c.eyebrow, 56, 168, { size: 12, fam: 'm', alpha: 0.55, ls: '3px' }));
    const hw = c.headWeight || 800;
    const hls = c.headLs || '0px';
    const fs = Math.min(
      c.headMax || 128,
      fitSize(ctx, c.head[0], PW - 108, c.headMax || 128, { weight: hw, fam: 'd', ls: hls }),
      fitSize(ctx, c.head[1], PW - 108, c.headMax || 128, { weight: hw, fam: 'd', ls: hls })
    );
    const lh = fs * (c.headLh || 0.86);
    this.reveal(ctx, 0.12, 176 + lh, fs * 0.95, () => txt(ctx, c.head[0], 50, 176 + lh, { size: fs, weight: hw, fam: 'd', ls: hls }));
    this.reveal(ctx, 0.22, 176 + lh * 2, fs * 0.95, () => txt(ctx, c.head[1], 50, 176 + lh * 2, { size: fs, weight: hw, fam: 'd', ls: hls, color: c.accent }));

    // ---------- foto principal ----------
    const X = 56, W = PW - 112;
    const Y = 176 + lh * 2 + fs * 0.42;
    const H = clamp(300 + (486 - Y), 280, 400);
    const ki = this.inK(0.32);
    if (ki > 0) {
      ctx.save();
      rr(ctx, X, Y, W, H * ki, 18);
      ctx.clip();
      const im = photo(c.hero);
      const px = this.p.inside ? (this.sp.x / PW - 0.5) * -18 : 0;
      const py = this.p.inside ? (this.sp.y / PH - 0.5) * -10 : 0;
      if (im) drawCover(ctx, im, X, Y, W, H, 1.08 + Math.sin(t * 0.15) * 0.03 + (1 - ki) * 0.15, px, py);
      else {
        ctx.fillStyle = ink(0.08);
        ctx.fillRect(X, Y, W, H);
      }
      const shade = ctx.createLinearGradient(0, Y + H * 0.55, 0, Y + H);
      shade.addColorStop(0, 'rgba(0,0,0,0)');
      shade.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = shade;
      ctx.fillRect(X, Y, W, H);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = this.inK(0.6);
      const cw2 = measure(ctx, c.caption, { size: 14, weight: 600, fam: 'b' }) + 40;
      rr(ctx, X + 20, Y + H - 58, cw2, 38, 19);
      ctx.fillStyle = 'rgba(15,15,18,0.72)';
      ctx.fill();
      txt(ctx, c.caption, X + 40, Y + H - 33, { size: 14, weight: 600, fam: 'b', color: '#ffffff' });
      ctx.restore();
    }

    // ---------- texto + número ----------
    const py = Y + H + 52;
    this.fade(ctx, 0.5, () => wrapText(ctx, c.text, 56, py, 440, 28, { size: 18, fam: 'b', alpha: 0.72 }));
    this.fade(ctx, 0.55, () => {
      txt(ctx, c.stat[0], PW - 56, py + 22, { size: 64, weight: c.statWeight || hw, fam: 'd', align: 'right', color: c.accent });
      txt(ctx, c.stat[1], PW - 56, py + 46, { size: 13, fam: 'b', align: 'right', alpha: 0.55 });
    });

    // ---------- cartões ----------
    const cw = (PW - 112 - 32) / 3, cy = py + 84;
    c.cards.forEach(([n, meta], i) => {
      const k = this.inK(0.65 + i * 0.08);
      if (k <= 0) return;
      const x = 56 + i * (cw + 16);
      const id = 'cd' + i;
      const hv = this.h(id);
      this.region(id, x, cy, cw, 150);
      ctx.save();
      ctx.globalAlpha *= k;
      ctx.translate(0, (1 - k) * 30 - hv * 5);
      ctx.save();
      rr(ctx, x, cy, cw, 104, 12);
      ctx.clip();
      const im = photo(`${c.key}_c${i}`);
      if (im) drawCover(ctx, im, x, cy, cw, 104, 1 + hv * 0.08);
      else {
        ctx.fillStyle = ink(0.08);
        ctx.fillRect(x, cy, cw, 104);
      }
      ctx.restore();
      if (this.sel === i) {
        rr(ctx, x - 3, cy - 3, cw + 6, 110, 14);
        ctx.strokeStyle = c.accent;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      const mw = measure(ctx, meta, { size: 12, fam: 'm' }) + 12;
      txt(ctx, n, x, cy + 132, { size: fitSize(ctx, n, cw - mw, c.cardSize || 20, { weight: c.cardWeight || 700, fam: 'd' }), weight: c.cardWeight || 700, fam: 'd' });
      txt(ctx, meta, x + cw, cy + 132, { size: 12, fam: 'm', align: 'right', alpha: 0.55 });
      ctx.restore();
    });
    if (this.inK(0.9) > 0) this.folio(ctx);
    this.grain(ctx);
  }

  onPress(id, x, y) {
    const c = this.cfg;
    sound('click');
    if (id === 'cta') {
      this.ripple(x, y, hexToArr(c.accent).join(','));
      if (c.onCta) c.onCta(this);
      else this.toast(c.ctaToast);
    } else if (id.startsWith('cd')) {
      const i = +id.slice(2);
      this.sel = this.sel === i ? -1 : i;
      this.ripple(x, y, hexToArr(c.accent).join(','));
      this.toast(c.cardToast ? c.cardToast(c.cards[i]) : c.cards[i][0]);
    } else if (id.startsWith('nv')) {
      this.toast(c.navToast ? c.navToast[+id.slice(2)] : c.nav[+id.slice(2)]);
    }
  }
}

const LANDINGS = [
  {
    key: 'kora', type: 'kora', loader: true, bg: '#13110f', accent: '#d9c3a0', ctaInk: '#13110f',
    logo: 'KORA', nav: ['Projetos', 'Estúdio', 'Contato'], cta: 'Agendar visita', ctaToast: 'Visita ao ateliê agendada ✓',
    eyebrow: 'ARQUITETURA RESIDENCIAL — SÃO PAULO', head: ['CASAS COM', 'HORIZONTE.'], headWeight: 800,
    hero: 'kora_hero', caption: 'Casa Mirante · 2025',
    text: 'Projetamos casas com luz natural, ventilação cruzada e materiais que envelhecem bem.',
    stat: ['48', 'casas entregues'],
    cards: [['Casa Pátio', '2024'], ['Casa Serra', '2023'], ['Casa Duna', '2023']],
    cardToast: (cd) => `${cd[0]}: projeto completo em breve`,
    navToast: ['48 projetos no portfólio', 'Somos 12 arquitetas e arquitetos', 'contato@kora.arq'],
  },
  {
    key: 'aurora', type: 'aurora', light: true, bg: '#f5f5f1', accent: '#1f3bff', ctaInk: '#ffffff', glow: '70,100,255',
    logo: 'aurora', logoLs: '-0.5px', logoWeight: 900, logoSize: 28, nav: ['Conta', 'Cartão', 'Investir'], cta: 'Abrir conta', ctaToast: 'Conta aberta ✓  Bem-vindo à Aurora',
    eyebrow: 'CONTA DIGITAL — SEM TARIFAS', head: ['Seu dinheiro', 'em movimento.'], headWeight: 900, headLs: '-5px', headLh: 0.9,
    hero: 'aurora_hero', caption: 'App Aurora · iOS e Android',
    text: 'Conta, Pix e cartão de metal num app só. Abra em 4 minutos, sem papelada.',
    stat: ['4,2 mi', 'clientes'],
    cards: [['Pix sem limite', 'GRÁTIS'], ['Cartão de metal', 'R$ 0'], ['Caixinha', '112%']],
    navToast: ['Conta sem tarifa nenhuma', 'Cartão de metal com 1% de volta', 'Rende 112% do CDI'],
  },
  {
    key: 'pulse', type: 'pulse', bg: '#0b0709', accent: '#ff4d8d', ctaInk: '#120808',
    logo: 'pulse', logoLs: '-0.5px', logoWeight: 700, logoSize: 28, nav: ['Descobrir', 'Biblioteca', 'Ao vivo'], cta: 'Ouvir grátis', ctaToast: 'Tocando agora: Neon de Tarde',
    eyebrow: 'STREAMING — ÁUDIO SEM PERDAS', head: ['SOM QUE', 'VOCÊ SENTE.'], headWeight: 400, headLs: '1px', headLh: 0.9,
    hero: 'pulse_hero', caption: 'Ao vivo · Galpão 12, sexta 22h',
    text: '90 milhões de faixas em qualidade de estúdio, letras sincronizadas e shows ao vivo toda sexta.',
    stat: ['12 mi', 'ouvintes por mês'], statWeight: 400,
    cards: [['ELETRÔNICA', 'MIX'], ['AO VIVO', 'SEX 22H'], ['ACÚSTICO', 'MIX']], cardWeight: 400, cardSize: 24,
    cardToast: (cd) => `Tocando: ${cd[0].toLowerCase()}`,
  },
  {
    key: 'orbit', type: 'orbit', bg: '#04090a', accent: '#5eead4', ctaInk: '#04201c',
    logo: 'ORBIT', logoLs: '4px', logoWeight: 700, logoSize: 26, nav: ['Produto', 'Preços', 'Status'], cta: 'Começar', ctaToast: 'Primeiro deploy em 30 segundos ✓',
    eyebrow: 'INFRAESTRUTURA — DEPLOY GLOBAL', head: ['INFRA QUE', 'ORBITA.'], headWeight: 700, headLs: '2px', headLh: 0.92,
    hero: 'orbit_hero', caption: '190 pontos de presença',
    text: 'Deploy em segundos para 190 regiões, escala automática e nenhum servidor para administrar.',
    stat: ['99,99%', 'de uptime'],
    cards: [['DATA CENTERS', 'GRU1'], ['REDE GLOBAL', '38 MS'], ['EDGE', 'FUNÇÕES']], cardSize: 18,
    navToast: ['Preview por PR, edge e analytics', 'Plano Pro: R$ 99/mês', 'Todos os sistemas operacionais'],
  },
  {
    key: 'bloom', type: 'bloom', light: true, bg: '#f5eee8', accent: '#8a4f3c', ctaInk: '#ffffff', glow: '255,179,138',
    logo: 'bloom', logoLs: '0px', logoWeight: 600, logoSize: 40, nav: ['Loja', 'Ritual', 'Sobre'], cta: 'Comprar', ctaToast: 'Sérum adicionado à sacola ✓',
    eyebrow: 'SKINCARE — VEGANO E SEM PARABENOS', head: ['Brilho que', 'floresce.'], headWeight: 500, headLs: '-3px', headLh: 0.92, headMax: 136,
    hero: 'bloom_hero', caption: 'Sérum facial · 30 ml',
    text: 'Niacinamida e flor de laranjeira para uma pele uniforme e luminosa em 14 dias.',
    stat: ['4,9', '2.318 avaliações'], statWeight: 500,
    cards: [['Sérum', 'R$ 189'], ['Creme noturno', 'R$ 149'], ['Kit ritual', 'R$ 299']], cardWeight: 600, cardSize: 26,
    cardToast: (cd) => `${cd[0]} adicionado à sacola ✓`,
  },
  {
    key: 'kinetic', type: 'kinetic', light: true, bg: '#f2f1ec', accent: '#1f3bff', ctaInk: '#ffffff', glow: '31,59,255',
    logo: 'KINETIC', logoLs: '1px', logoWeight: 900, logoSize: 22, nav: ['Fontes', 'Licenças', 'Sobre'], cta: 'Testar fontes', ctaToast: 'Pacote de teste enviado ✓',
    eyebrow: 'FUNDIÇÃO DE TIPOS — SÃO PAULO', head: ['TIPOS QUE', 'SE MEXEM.'], headWeight: 900, headLs: '-3px', headLh: 0.95,
    hero: 'kinetic_hero', caption: 'Kinetic Variable · 2026',
    text: 'Famílias variáveis desenhadas para telas, de 12 px em interfaces a 300 px em cartazes.',
    stat: ['412', 'glifos por família'],
    cards: [['Sans', 'VAR'], ['Mono', '8 PESOS'], ['Display', 'VAR']], cardSize: 20,
    cardToast: (cd) => `Kinetic ${cd[0]} no carrinho ✓`,
  },
  {
    key: 'nimbus', type: 'nimbus', bg: '#0a1222', accent: '#7dd3fc', ctaInk: '#0a1222',
    logo: 'nimbus', logoLs: '-0.5px', logoWeight: 700, logoSize: 30, nav: ['Hoje', '7 dias', 'Radar'], cta: 'Baixar app', ctaToast: 'Link do app enviado ✓',
    eyebrow: 'PREVISÃO DO TEMPO — HIPERLOCAL', head: ['O céu,', 'minuto a minuto.'], headWeight: 700, headLs: '-3px', headLh: 0.95,
    hero: 'nimbus_hero', caption: 'São Paulo · 21° · chuva leve às 17h',
    text: 'Alertas de chuva com 15 minutos de antecedência e radar ao vivo para a sua rua.',
    stat: ['15 min', 'de antecedência'], statWeight: 200,
    cards: [['Tempestade', 'ALERTA'], ['Pôr do sol', '18:21'], ['Céu limpo', '26°']],
    navToast: ['Agora: 21°, chuva leve', 'Semana: máxima de 27° no sábado', 'Radar ao vivo da sua rua'],
  },
  {
    key: 'contact', type: 'contact', bg: '#0c0c10', accent: '#c4b5fd', ctaInk: '#0c0c10',
    logo: 'rappu', logoLs: '0px', logoWeight: 400, logoSize: 34, nav: ['Trabalhos', 'Processo', 'GitHub'], cta: 'Copiar e-mail',
    eyebrow: 'CONTATO — PROJETOS 2026', head: ['Vamos criar', 'algo juntos.'], headWeight: 400, headLs: '-2px', headLh: 0.95, headMax: 140,
    hero: 'contact_hero', caption: 'Estúdio rappu · São Paulo e remoto',
    text: 'Sites, apps e marcas com movimento. Conte sua ideia: respondo em até 48 horas.',
    stat: ['48 h', 'para responder'],
    cards: [['Sites', '2–6 SEM'], ['Apps', '6–12 SEM'], ['Marcas', '3–5 SEM']], cardSize: 30,
    cardToast: (cd) => `${cd[0]}: prazo médio de ${cd[1].toLowerCase()}`,
    navToast: ['Veja as páginas anteriores', 'Conversa, proposta, design, entrega', 'github.com/LucasPivovar'],
    onCta: (pg) => {
      if (navigator.clipboard) navigator.clipboard.writeText(CONFIG.email).catch(() => {});
      pg.toast(`${CONFIG.email} copiado ✓`);
    },
  },
];

// ---------------------------------------------------------------------------
function createBookPages() {
  // pré-carrega todas as fotos logo no início, para estarem prontas quando a página aparecer
  LANDINGS.forEach((c) => [c.hero, `${c.key}_c0`, `${c.key}_c1`, `${c.key}_c2`].forEach(photo));
  const labels = ['Kora — Arquitetura', 'Aurora — Banco', 'Pulse — Música', 'Orbit — Infra', 'Bloom — Skincare', 'Kinetic — Tipos', 'Nimbus — Clima', 'Contato'];
  return {
    cover: new CoverPage(0, 'Capa'),
    pages: LANDINGS.map((cfg, i) => new StudioLanding(i + 1, labels[i], cfg)),
    size: { w: PW, h: PH },
  };
}

window.createBookPages = createBookPages;
window.PAGE_CONFIG = CONFIG;
