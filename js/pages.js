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

const FONT = {
  sans: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, Menlo, monospace',
  serif: '"Instrument Serif", Georgia, "Times New Roman", serif',
};

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const TAU = Math.PI * 2;

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
  const fam = FONT[o.fam || 'sans'];
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
    ctx.fillStyle = o.color || '#fff';
    ctx.fillText(s, x, y);
  }
  ctx.globalAlpha = prevAlpha;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
}

function measure(ctx, s, o = {}) {
  ctx.font = `${o.italic ? 'italic ' : ''}${o.weight || 400} ${o.size || 16}px ${FONT[o.fam || 'sans']}`;
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
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r;
    }
    return null;
  }

  get isHot() {
    return !!this.hover;
  }

  region(id, x, y, w, h) {
    this.nextRegions.push({ id, x, y, w, h });
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

    const ctx = this.ctx;
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
      if (this.onPress) this.onPress(r.id, x, y);
      return true;
    }
    return false;
  }

  pointerUp() {
    this.p.down = false;
    this.dragId = null;
  }

  ripple(x, y, rgb = '255,255,255') {
    this.fx.push({ x, y, t: 0, rgb });
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
      ctx.fillStyle = 'rgba(250,250,252,0.96)';
      ctx.fill();
      txt(ctx, this.toastMsg, PW / 2, y + 29, { size: 15, weight: 600, color: '#0b0b10', align: 'center' });
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
    ctx.fillRect(0, 0, PW, PH);
  }

  folio(ctx) {
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(56, 1078);
    ctx.lineTo(PW - 56, 1078);
    ctx.stroke();
    txt(ctx, 'rappu — vol. 01', 56, 1104, { size: 11, fam: 'mono', alpha: 0.35, ls: '1px' });
    txt(ctx, `${this.label.toUpperCase()}   ${String(this.num).padStart(2, '0')} / 08`, PW - 56, 1104, {
      size: 11, fam: 'mono', alpha: 0.35, align: 'right', ls: '1px',
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
      ctx.fillStyle = `rgba(255,255,255,${0.04 + hv * 0.1})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.18 + hv * 0.2})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    const arrow = o.arrow ? '  →' : '';
    txt(ctx, label + arrow, hv * (o.arrow ? 3 : 0), 6, {
      size: o.size || 15, weight: 700, color: o.color || '#fff', align: 'center',
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
    txt(ctx, 'interfaces em movimento', 400, 670, { size: 46, fam: 'serif', italic: true, color: '#cfcfe0', align: 'center', alpha: 0.85 });

    txt(ctx, 'Oito páginas. Seis landing pages vivas.', 400, 760, { size: 18, align: 'center', alpha: 0.5 });

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
// 01 — Abertura + sumário clicável
// ---------------------------------------------------------------------------
class IndexPage extends LivePage {
  init() {
    this.items = [
      { n: '02', name: 'Aurora', cat: 'FINTECH', page: 2, c: '#8b9dff' },
      { n: '03', name: 'Pulse', cat: 'MÚSICA', page: 3, c: '#ff5c9a' },
      { n: '04', name: 'Orbit', cat: 'SAAS / INFRA', page: 4, c: '#5eead4' },
      { n: '05', name: 'Bloom', cat: 'SKINCARE', page: 5, c: '#ffb38a' },
      { n: '06', name: 'Kinetic', cat: 'TIPOGRAFIA', page: 6, c: '#d9ff3f' },
      { n: '07', name: 'Nimbus', cat: 'CLIMA', page: 7, c: '#7dd3fc' },
      { n: '08', name: 'Contato', cat: 'VAMOS CONVERSAR', page: 8, c: '#ffffff' },
    ];
  }

  draw(ctx, t) {
    this.bg(ctx, '#0a0b0f');
    glow(ctx, this.sp.x, this.sp.y, 420, '130,140,255', this.p.inside ? 0.09 : 0.04);
    const ox = 600 + Math.sin(t * 0.3) * 50;
    const oy = 190 + Math.cos(t * 0.4) * 30;
    glow(ctx, ox, oy, 320, '168,85,247', 0.16);
    glow(ctx, ox - 110, oy + 70, 260, '56,189,248', 0.12);

    txt(ctx, 'rappu', 56, 92, { size: 26, weight: 800, ls: '-1px' });
    ctx.fillStyle = '#8b9dff';
    ctx.beginPath();
    ctx.arc(56 + measure(ctx, 'rappu', { size: 26, weight: 800, ls: '-1px' }) + 6, 84, 4, 0, TAU);
    ctx.fill();
    txt(ctx, 'VOL. 01 — 2026', PW - 56, 90, { size: 12, fam: 'mono', align: 'right', alpha: 0.45, ls: '2px' });
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(56, 120, PW - 112, 1);

    txt(ctx, 'Interfaces', 56, 250, { size: 88, weight: 800, ls: '-4px' });
    const gx = 56 + Math.sin(t * 0.5) * 120;
    const g = ctx.createLinearGradient(gx, 0, gx + 560, 0);
    g.addColorStop(0, '#c4b5fd');
    g.addColorStop(0.5, '#67e8f9');
    g.addColorStop(1, '#f0abfc');
    txt(ctx, 'em movimento.', 56, 345, { size: 100, fam: 'serif', italic: true, color: g });

    const para = [
      'Este livro reúne seis landing pages de exemplo.',
      'Cada página é viva: passe o mouse, clique, arraste.',
    ];
    para.forEach((l, i) => txt(ctx, l, 56, 412 + i * 30, { size: 19, alpha: 0.62 }));

    txt(ctx, 'SUMÁRIO', 56, 528, { size: 12, fam: 'mono', alpha: 0.4, ls: '3px' });
    txt(ctx, 'clique para ir', PW - 56, 528, { size: 12, fam: 'mono', alpha: 0.3, align: 'right' });

    const y0 = 548;
    const rowH = 64;
    this.items.forEach((it, i) => {
      const id = 'it' + i;
      const y = y0 + i * rowH;
      const hv = this.h(id);
      this.region(id, 40, y, PW - 80, rowH);

      rr(ctx, 40, y + 4, PW - 80, rowH - 8, 14);
      ctx.fillStyle = `rgba(255,255,255,${0.05 * hv})`;
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(56, y + rowH, PW - 112, 1);

      txt(ctx, it.n, 64, y + 40, { size: 13, fam: 'mono', alpha: 0.35 + hv * 0.5 });
      ctx.fillStyle = it.c;
      ctx.beginPath();
      ctx.arc(110, y + 35, 4 + hv * 2, 0, TAU);
      ctx.fill();
      if (hv > 0.01) glow(ctx, 110, y + 35, 24, rgbStr(hexToArr(it.c)), 0.5 * hv);
      txt(ctx, it.name, 130 + hv * 12, y + 44, { size: 28, weight: 700, ls: '-0.5px' });
      txt(ctx, it.cat, PW - 96 - hv * 10, y + 40, { size: 11, fam: 'mono', align: 'right', alpha: 0.45, ls: '2px' });
      txt(ctx, '→', PW - 64 - (1 - hv) * 10, y + 41, { size: 18, align: 'right', alpha: hv });
    });

    txt(ctx, '← →  folhear      2× clique  ampliar      esc  voltar', 56, 1050, {
      size: 11, fam: 'mono', alpha: 0.3, ls: '1px',
    });
    this.folio(ctx);
    this.grain(ctx);
  }

  onPress(id) {
    if (id.startsWith('it')) {
      const it = this.items[+id.slice(2)];
      sound('click');
      if (this.onNavigate) this.onNavigate(it.page);
    }
  }
}

// ---------------------------------------------------------------------------
// 02 — AURORA · fintech
// ---------------------------------------------------------------------------
class AuroraPage extends LivePage {
  init() {
    this.data = [12, 14, 13, 17, 16, 19, 22, 21, 25, 27, 26, 31];
    this.months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    this.tilt = { x: 0, y: 0 };
  }

  draw(ctx, t, dt) {
    this.bg(ctx, '#07070d');
    const px = this.sp.x / PW - 0.5;
    const py = this.sp.y / PH - 0.5;

    // aurora
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 200 + Math.sin(t * 0.45) * 90 + px * 80, 170 + Math.cos(t * 0.35) * 50, 400, '91,91,255', 0.34);
    glow(ctx, 580 + Math.cos(t * 0.4) * 100 + px * 100, 230 + Math.sin(t * 0.5) * 60, 360, '0,190,255', 0.24);
    glow(ctx, 420 + Math.sin(t * 0.3 + 1) * 150, 90 + py * 60, 300, '190,80,255', 0.26);
    ctx.restore();
    const fade = ctx.createLinearGradient(0, 380, 0, 640);
    fade.addColorStop(0, 'rgba(7,7,13,0)');
    fade.addColorStop(1, 'rgba(7,7,13,1)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 380, PW, 260);

    // nav
    const lg = ctx.createLinearGradient(56, 72, 76, 92);
    lg.addColorStop(0, '#a5b4fc');
    lg.addColorStop(1, '#22d3ee');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(66, 84, 10, 0, TAU);
    ctx.fill();
    txt(ctx, 'aurora', 84, 92, { size: 22, weight: 800, ls: '-0.5px' });
    ['Produto', 'Preços', 'Empresas'].forEach((l, i) => txt(ctx, l, 330 + i * 92, 90, { size: 14, alpha: 0.65 }));
    this.button(ctx, 'login', 636, 64, 108, 40, 'Entrar', { size: 14 });

    // badge
    rr(ctx, 56, 148, 236, 34, 17);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.stroke();
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(76, 165, 4, 0, TAU);
    ctx.fill();
    glow(ctx, 76, 165, 14 + Math.sin(t * 3) * 4, '74,222,128', 0.5);
    txt(ctx, 'Novo · Cartão de metal', 90, 170, { size: 13, weight: 600, alpha: 0.9 });

    txt(ctx, 'Seu dinheiro,', 56, 262, { size: 70, weight: 800, ls: '-3px' });
    const hg = ctx.createLinearGradient(56, 0, 520, 0);
    hg.addColorStop(0, '#a5b4fc');
    hg.addColorStop(0.55, '#67e8f9');
    hg.addColorStop(1, '#f0abfc');
    txt(ctx, 'em movimento.', 56, 342, { size: 86, fam: 'serif', italic: true, color: hg });
    txt(ctx, 'Conta digital, investimentos e cartão num só app.', 56, 394, { size: 18, alpha: 0.7 });
    txt(ctx, 'Sem tarifas escondidas. Sem filas. Sem papel.', 56, 422, { size: 18, alpha: 0.7 });

    const cg = ctx.createLinearGradient(56, 0, 300, 0);
    cg.addColorStop(0, '#6366f1');
    cg.addColorStop(1, '#06b6d4');
    this.button(ctx, 'cta', 56, 456, 238, 58, 'Abrir conta grátis', { fill: cg, glow: '124,140,255', arrow: true });
    this.button(ctx, 'plans', 310, 456, 150, 58, 'Ver planos');

    // cartão 3D reagindo ao cursor
    const tx = this.p.inside ? px : Math.sin(t * 0.6) * 0.25;
    const ty = this.p.inside ? py : Math.cos(t * 0.5) * 0.15;
    this.tilt.x = damp(this.tilt.x, tx, 5, dt);
    this.tilt.y = damp(this.tilt.y, ty, 5, dt);
    const cx = 400;
    const cy = 700 + Math.sin(t * 1.2) * 6;

    ctx.save();
    ctx.translate(cx + this.tilt.x * 30, cy + 140);
    ctx.scale(1, 0.18);
    glow(ctx, 0, 0, 230, '0,0,0', 0.9);
    glow(ctx, 0, 0, 200, '99,102,241', 0.25);
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.09 + this.tilt.x * 0.22);
    ctx.transform(1, this.tilt.y * 0.12, -this.tilt.x * 0.18, 1, 0, 0);
    const W = 370;
    const H = 232;
    rr(ctx, -W / 2, -H / 2, W, H, 22);
    const card = ctx.createLinearGradient(-W / 2, -H / 2, W / 2, H / 2);
    card.addColorStop(0, '#1e1b4b');
    card.addColorStop(0.5, '#4338ca');
    card.addColorStop(1, '#0e7490');
    ctx.fillStyle = card;
    ctx.fill();
    ctx.save();
    ctx.clip();
    const sh = ((t * 0.25) % 1.8) - 0.4 + this.tilt.x * 0.6;
    const sg = ctx.createLinearGradient(-W / 2 + sh * W, -H / 2, -W / 2 + sh * W + 160, H / 2);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.5, 'rgba(255,255,255,0.22)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(-W / 2, -H / 2, W, H);
    glow(ctx, W / 2 - 40, -H / 2 + 20, 180, '240,171,252', 0.25);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1;
    rr(ctx, -W / 2, -H / 2, W, H, 22);
    ctx.stroke();

    txt(ctx, 'AURORA', -W / 2 + 28, -H / 2 + 44, { size: 15, fam: 'mono', weight: 700, ls: '4px' });
    txt(ctx, 'metal', W / 2 - 28, -H / 2 + 44, { size: 22, fam: 'serif', italic: true, align: 'right', alpha: 0.8 });
    const chip = ctx.createLinearGradient(-W / 2 + 28, -20, -W / 2 + 76, 16);
    chip.addColorStop(0, '#fde68a');
    chip.addColorStop(1, '#b45309');
    rr(ctx, -W / 2 + 28, -24, 48, 36, 7);
    ctx.fillStyle = chip;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(-W / 2 + 96, -6, 7 + i * 6, -0.7, 0.7);
      ctx.stroke();
    }
    txt(ctx, '••••  ••••  ••••  4821', -W / 2 + 28, 50, { size: 19, fam: 'mono', ls: '1px' });
    txt(ctx, 'RAPPU STUDIO', -W / 2 + 28, H / 2 - 26, { size: 13, fam: 'mono', alpha: 0.8, ls: '2px' });
    txt(ctx, '09/31', W / 2 - 28, H / 2 - 26, { size: 13, fam: 'mono', alpha: 0.8, align: 'right' });
    ctx.restore();

    // painel do gráfico
    const X = 56, Y = 862, PWd = PW - 112, PHt = 196;
    rr(ctx, X, Y, PWd, PHt, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.stroke();
    const prog = easeOut((t - this.shownAt - 0.3) / 1.8);
    txt(ctx, 'Rendimento · 12 meses', X + 24, Y + 34, { size: 14, alpha: 0.55 });
    txt(ctx, `+${(18.4 * prog).toFixed(1).replace('.', ',')}%`, X + 24, Y + 72, { size: 30, weight: 800, color: '#4ade80' });
    txt(ctx, 'R$ 24.380,00', X + PWd - 24, Y + 34, { size: 14, fam: 'mono', alpha: 0.55, align: 'right' });

    const cx0 = X + 24, cx1 = X + PWd - 24, cy0 = Y + 96, cy1 = Y + PHt - 22;
    const mn = 10, mx = 33;
    const pts = this.data.map((v, i) => [
      lerp(cx0, cx1, i / (this.data.length - 1)),
      lerp(cy1, cy0, (v - mn) / (mx - mn)),
    ]);
    const n = (pts.length - 1) * prog;
    const visible = [];
    for (let i = 0; i <= Math.floor(n); i++) visible.push(pts[i]);
    if (n < pts.length - 1) {
      const i = Math.floor(n);
      const f = n - i;
      visible.push([lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f)]);
    }
    if (visible.length > 1) {
      ctx.beginPath();
      ctx.moveTo(visible[0][0], cy1);
      visible.forEach((p) => ctx.lineTo(p[0], p[1]));
      ctx.lineTo(visible[visible.length - 1][0], cy1);
      ctx.closePath();
      const ag = ctx.createLinearGradient(0, cy0, 0, cy1);
      ag.addColorStop(0, 'rgba(99,102,241,0.35)');
      ag.addColorStop(1, 'rgba(99,102,241,0)');
      ctx.fillStyle = ag;
      ctx.fill();
      ctx.beginPath();
      visible.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      const lg2 = ctx.createLinearGradient(cx0, 0, cx1, 0);
      lg2.addColorStop(0, '#818cf8');
      lg2.addColorStop(1, '#22d3ee');
      ctx.strokeStyle = lg2;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    this.region('chart', X, Y, PWd, PHt);
    if (this.hover === 'chart' && prog > 0.95) {
      const i = clamp(Math.round(((this.p.x - cx0) / (cx1 - cx0)) * (pts.length - 1)), 0, pts.length - 1);
      const [hx, hy] = pts[i];
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(hx, cy0 - 6);
      ctx.lineTo(hx, cy1);
      ctx.stroke();
      ctx.setLineDash([]);
      glow(ctx, hx, hy, 22, '34,211,238', 0.6);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(hx, hy, 5, 0, TAU);
      ctx.fill();
      const label = `${this.months[i]} · R$ ${(this.data[i] * 786).toLocaleString('pt-BR')}`;
      const lw = measure(ctx, label, { size: 13, weight: 700 }) + 24;
      const lx = clamp(hx - lw / 2, X + 8, X + PWd - lw - 8);
      rr(ctx, lx, hy - 46, lw, 30, 15);
      ctx.fillStyle = '#fff';
      ctx.fill();
      txt(ctx, label, lx + lw / 2, hy - 26, { size: 13, weight: 700, color: '#0b0b10', align: 'center' });
    }

    this.folio(ctx);
    this.grain(ctx);
  }

  onPress(id, x, y) {
    if (id === 'cta') {
      sound('click');
      this.ripple(x, y, '165,180,252');
      this.toast('Conta aberta ✓  Bem-vindo à Aurora');
    } else if (id === 'plans') {
      sound('click');
      this.toast('Planos: Essencial · Plus · Metal');
    } else if (id === 'login') {
      sound('click');
      this.toast('Login por biometria em 1 toque');
    }
  }
}

// ---------------------------------------------------------------------------
// 03 — PULSE · player de música
// ---------------------------------------------------------------------------
class PulsePage extends LivePage {
  init() {
    this.playing = false;
    this.level = 0.06;
    this.angle = 0;
    this.prog = 0.28;
    this.track = 0;
    this.tracks = [
      { t: 'Neon de Tarde', a: 'Marina Sol', d: 222, c: ['#ff4d8d', '#ff9f43'] },
      { t: 'Maré Alta', a: 'Os Ventos', d: 245, c: ['#8b5cf6', '#ec4899'] },
      { t: 'Cidade Lenta', a: 'Duo Alva', d: 178, c: ['#f97316', '#facc15'] },
    ];
    this.cA = hexToArr(this.tracks[0].c[0]);
    this.cB = hexToArr(this.tracks[0].c[1]);
  }

  draw(ctx, t, dt) {
    const tr = this.tracks[this.track];
    this.cA = dampArr(this.cA, hexToArr(tr.c[0]), 5, dt);
    this.cB = dampArr(this.cB, hexToArr(tr.c[1]), 5, dt);
    const A = rgbStr(this.cA);
    const B = rgbStr(this.cB);
    this.level = damp(this.level, this.playing ? 1 : 0.06, 3, dt);
    if (this.playing) {
      this.prog += dt / tr.d;
      if (this.prog >= 1) {
        this.prog = 0;
        this.track = (this.track + 1) % this.tracks.length;
      }
    }
    if (this.dragId === 'seek' && this.p.down) this.prog = clamp((this.p.x - 56) / (PW - 112), 0, 1);
    this.angle += dt * 1.8 * this.level;

    this.bg(ctx, '#0b0709');
    const beat = Math.pow(Math.max(0, Math.sin(t * 7.5)), 6) * this.level;
    glow(ctx, 400, 520, 420, A, 0.16 + beat * 0.12);
    glow(ctx, 560, 380, 300, B, 0.12);

    // nav
    ctx.fillStyle = `rgb(${A})`;
    [10, 18, 12, 22].forEach((hgt, i) => {
      const hh = hgt * (0.6 + 0.4 * Math.abs(Math.sin(t * 4 + i)) * (0.3 + this.level));
      rr(ctx, 56 + i * 7, 86 - hh / 2, 4, hh, 2);
      ctx.fill();
    });
    txt(ctx, 'pulse', 92, 93, { size: 22, weight: 800, ls: '-0.5px' });
    ['Descobrir', 'Biblioteca', 'Ao vivo'].forEach((l, i) => txt(ctx, l, 340 + i * 105, 91, { size: 14, alpha: 0.6 }));
    const av = ctx.createLinearGradient(708, 68, 744, 104);
    av.addColorStop(0, `rgb(${A})`);
    av.addColorStop(1, `rgb(${B})`);
    ctx.fillStyle = av;
    ctx.beginPath();
    ctx.arc(726, 86, 18, 0, TAU);
    ctx.fill();

    txt(ctx, 'Som que', 56, 205, { size: 66, weight: 800, ls: '-3px' });
    const hg = ctx.createLinearGradient(56, 0, 470, 0);
    hg.addColorStop(0, `rgb(${A})`);
    hg.addColorStop(1, `rgb(${B})`);
    txt(ctx, 'você sente.', 56, 282, { size: 82, fam: 'serif', italic: true, color: hg });
    txt(ctx, 'ÁUDIO ESPACIAL · SEM PERDAS · 24-BIT', PW - 56, 205, { size: 11, fam: 'mono', align: 'right', alpha: 0.4, ls: '2px' });

    // vinil
    const vx = 400, vy = 515, R = 165;
    const hv = this.h('vinyl');
    this.region('vinyl', vx - R, vy - R, R * 2, R * 2);
    ctx.save();
    ctx.translate(vx, vy);
    const s = 1 + hv * 0.025 + beat * 0.015;
    ctx.scale(s, s);
    ctx.fillStyle = '#0a0a0b';
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();
    for (let r = 72; r < R - 4; r += 5) {
      ctx.strokeStyle = `rgba(255,255,255,${r % 15 === 2 ? 0.07 : 0.035})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.stroke();
    }
    ctx.rotate(this.angle);
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.clip();
    const sheen = ctx.createLinearGradient(-R, -R, R, R);
    sheen.addColorStop(0.35, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0.10)');
    sheen.addColorStop(0.65, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(-R, -R, R * 2, R * 2);
    ctx.restore();
    const lab = ctx.createLinearGradient(-62, -62, 62, 62);
    lab.addColorStop(0, `rgb(${A})`);
    lab.addColorStop(1, `rgb(${B})`);
    ctx.fillStyle = lab;
    ctx.beginPath();
    ctx.arc(0, 0, 62, 0, TAU);
    ctx.fill();
    txt(ctx, 'PULSE', 0, -22, { size: 12, fam: 'mono', weight: 700, align: 'center', color: '#120808', ls: '3px' });
    txt(ctx, tr.a.toUpperCase(), 0, 34, { size: 9, fam: 'mono', align: 'center', color: '#120808', ls: '1px' });
    ctx.fillStyle = '#0b0709';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, TAU);
    ctx.fill();
    ctx.restore();

    // visualizador
    const n = 56;
    const x0 = 56, x1 = PW - 56, base = 765;
    const bw = (x1 - x0) / n;
    const vg = ctx.createLinearGradient(x0, 0, x1, 0);
    vg.addColorStop(0, `rgb(${A})`);
    vg.addColorStop(1, `rgb(${B})`);
    ctx.fillStyle = vg;
    for (let i = 0; i < n; i++) {
      const k = Math.sin(t * (3 + (i % 7) * 0.6) + i * 0.7) * 0.5 + 0.5;
      const k2 = Math.sin(t * 5.3 + i * 0.31) * 0.5 + 0.5;
      const env = Math.sin((i / n) * Math.PI) * 0.7 + 0.3;
      const hgt = 4 + (k * 0.6 + k2 * 0.4) * env * 70 * this.level + beat * 18 * env;
      rr(ctx, x0 + i * bw + 1.5, base - hgt, bw - 3, hgt, 2);
      ctx.fill();
      ctx.globalAlpha = 0.15;
      rr(ctx, x0 + i * bw + 1.5, base + 4, bw - 3, hgt * 0.35, 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // info da faixa
    txt(ctx, tr.t, 56, 838, { size: 24, weight: 700 });
    txt(ctx, tr.a, 56, 864, { size: 15, alpha: 0.55 });
    txt(ctx, '♥', PW - 56, 846, { size: 22, align: 'right', color: `rgb(${A})` });

    const sy = 892;
    const sw = PW - 112;
    this.region('seek', 56, sy - 14, sw, 28);
    const sh = this.h('seek');
    rr(ctx, 56, sy - 2, sw, 4, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill();
    rr(ctx, 56, sy - 2, sw * this.prog, 4, 2);
    ctx.fillStyle = vg;
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(56 + sw * this.prog, sy, 6 + sh * 3, 0, TAU);
    ctx.fill();
    const fmt = (s2) => `${Math.floor(s2 / 60)}:${String(Math.floor(s2 % 60)).padStart(2, '0')}`;
    txt(ctx, fmt(this.prog * tr.d), 56, sy + 26, { size: 12, fam: 'mono', alpha: 0.5 });
    txt(ctx, fmt(tr.d), PW - 56, sy + 26, { size: 12, fam: 'mono', alpha: 0.5, align: 'right' });

    // controles
    const cy = 965;
    const drawTri = (x, dir, a) => {
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath();
      ctx.moveTo(x + dir * 9, cy - 10);
      ctx.lineTo(x - dir * 7, cy);
      ctx.lineTo(x + dir * 9, cy + 10);
      ctx.fill();
      ctx.fillRect(x - dir * 9 - 1.5, cy - 10, 3, 20);
    };
    this.region('prev', 270, cy - 30, 60, 60);
    this.region('next', 470, cy - 30, 60, 60);
    drawTri(300, 1, 0.55 + this.h('prev') * 0.45);
    drawTri(500, -1, 0.55 + this.h('next') * 0.45);
    const ph = this.h('play');
    this.region('play', 362, cy - 38, 76, 76);
    glow(ctx, 400, cy, 80, A, 0.25 + ph * 0.3);
    ctx.fillStyle = hg;
    const pg = ctx.createLinearGradient(366, cy - 34, 434, cy + 34);
    pg.addColorStop(0, `rgb(${A})`);
    pg.addColorStop(1, `rgb(${B})`);
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(400, cy, 34 + ph * 2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#120808';
    if (this.playing) {
      ctx.fillRect(389, cy - 12, 7, 24);
      ctx.fillRect(404, cy - 12, 7, 24);
    } else {
      ctx.beginPath();
      ctx.moveTo(392, cy - 13);
      ctx.lineTo(413, cy);
      ctx.lineTo(392, cy + 13);
      ctx.fill();
    }

    // chips de faixas
    let cxp = 56;
    this.tracks.forEach((tk, i) => {
      const id = 'tk' + i;
      const w = measure(ctx, tk.t, { size: 13, weight: 600 }) + 36;
      const on = i === this.track;
      const th = this.h(id);
      this.region(id, cxp, 1018, w, 38);
      rr(ctx, cxp, 1018, w, 38, 19);
      ctx.fillStyle = on ? `rgba(${A},0.22)` : `rgba(255,255,255,${0.05 + th * 0.06})`;
      ctx.fill();
      ctx.strokeStyle = on ? `rgba(${A},0.6)` : 'rgba(255,255,255,0.12)';
      ctx.stroke();
      txt(ctx, tk.t, cxp + w / 2, 1042, { size: 13, weight: 600, align: 'center', alpha: on ? 1 : 0.7 });
      cxp += w + 10;
    });

    this.folio(ctx);
    this.grain(ctx);
  }

  onPress(id, x, y) {
    sound('click');
    if (id === 'play' || id === 'vinyl') {
      this.playing = !this.playing;
      this.ripple(x, y, rgbStr(this.cA));
    } else if (id === 'prev') {
      this.track = (this.track + this.tracks.length - 1) % this.tracks.length;
      this.prog = 0;
    } else if (id === 'next') {
      this.track = (this.track + 1) % this.tracks.length;
      this.prog = 0;
    } else if (id === 'seek') {
      this.prog = clamp((x - 56) / (PW - 112), 0, 1);
    } else if (id.startsWith('tk')) {
      this.track = +id.slice(2);
      this.prog = 0;
      this.playing = true;
    }
  }
}

// ---------------------------------------------------------------------------
// 04 — ORBIT · SaaS / infraestrutura
// ---------------------------------------------------------------------------
class OrbitPage extends LivePage {
  init() {
    this.parts = [];
    for (let i = 0; i < 180; i++) {
      const r = 70 + Math.pow(Math.random(), 0.8) * 240;
      this.parts.push({
        r,
        a: Math.random() * TAU,
        sp: (0.25 + Math.random() * 0.35) * (110 / r),
        size: 0.8 + Math.random() * 2.2,
        c: Math.random() < 0.65 ? '94,234,212' : Math.random() < 0.6 ? '167,139,250' : '255,255,255',
        ox: 0, oy: 0, vx: 0, vy: 0,
      });
    }
    this.annual = false;
    this.toggleA = 0;
    this.price = 99;
    this.shocks = [];
  }

  draw(ctx, t, dt) {
    this.bg(ctx, '#04090a');
    const cx = 400, cy = 590;
    glow(ctx, cx, cy, 380, '20,184,166', 0.12);
    glow(ctx, 640, 160, 300, '139,92,246', 0.10);

    // nav
    ctx.strokeStyle = '#5eead4';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(66, 84, 9, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = '#5eead4';
    ctx.beginPath();
    ctx.arc(66 + Math.cos(t * 2) * 13, 84 + Math.sin(t * 2) * 5, 3, 0, TAU);
    ctx.fill();
    txt(ctx, 'orbit', 86, 92, { size: 22, weight: 800, ls: '-0.5px' });
    ['Docs', 'Preços', 'Status'].forEach((l, i) => txt(ctx, l, 340 + i * 80, 90, { size: 14, alpha: 0.6 }));
    this.button(ctx, 'begin', 620, 64, 124, 40, 'Começar', { fill: '#5eead4', color: '#04201c', size: 14 });

    txt(ctx, 'Infraestrutura que', 56, 205, { size: 58, weight: 800, ls: '-2.5px' });
    const hg = ctx.createLinearGradient(56, 0, 560, 0);
    hg.addColorStop(0, '#5eead4');
    hg.addColorStop(1, '#a78bfa');
    txt(ctx, 'orbita seu produto.', 56, 278, { size: 76, fam: 'serif', italic: true, color: hg });
    txt(ctx, 'Deploy global em segundos. Escala automática, zero servidores.', 56, 326, { size: 17, alpha: 0.6 });

    // campo de partículas
    this.region('field', 56, 380, PW - 112, 400);
    for (let i = this.shocks.length - 1; i >= 0; i--) {
      this.shocks[i].t += dt;
      if (this.shocks[i].t > 1.2) this.shocks.splice(i, 1);
    }
    ctx.strokeStyle = 'rgba(94,234,212,0.10)';
    ctx.lineWidth = 1;
    [120, 200, 280].forEach((r) => {
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.4, 0, 0, TAU);
      ctx.stroke();
    });
    this.shocks.forEach((s) => {
      ctx.strokeStyle = `rgba(94,234,212,${0.5 * (1 - s.t / 1.2)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.t * 520, 0, TAU);
      ctx.stroke();
    });

    const back = [];
    const front = [];
    const mx = this.p.x, my = this.p.y;
    this.parts.forEach((p) => {
      p.a += p.sp * dt;
      const bx = cx + Math.cos(p.a) * p.r;
      const by = cy + Math.sin(p.a) * p.r * 0.4;
      let x = bx + p.ox, y = by + p.oy;
      if (this.p.inside) {
        const dx = x - mx, dy = y - my;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 130) {
          const f = (1 - d / 130) * 1800;
          p.vx += (dx / d) * f * dt;
          p.vy += (dy / d) * f * dt;
        }
      }
      this.shocks.forEach((s) => {
        const dx = x - s.x, dy = y - s.y;
        const d = Math.hypot(dx, dy) || 1;
        if (Math.abs(d - s.t * 520) < 40) {
          p.vx += (dx / d) * 2600 * dt;
          p.vy += (dy / d) * 2600 * dt;
        }
      });
      p.vx += -p.ox * 14 * dt;
      p.vy += -p.oy * 14 * dt;
      const fr = Math.exp(-5 * dt);
      p.vx *= fr;
      p.vy *= fr;
      p.ox += p.vx * dt;
      p.oy += p.vy * dt;
      x = bx + p.ox;
      y = by + p.oy;
      (Math.sin(p.a) < 0 ? back : front).push([x, y, p]);
    });
    const drawP = ([x, y, p]) => {
      const depth = 0.75 + Math.sin(p.a) * 0.35;
      ctx.fillStyle = `rgba(${p.c},${0.35 + depth * 0.45})`;
      ctx.beginPath();
      ctx.arc(x, y, p.size * depth, 0, TAU);
      ctx.fill();
    };
    back.forEach(drawP);
    glow(ctx, cx, cy, 110, '94,234,212', 0.35);
    const core = ctx.createRadialGradient(cx - 14, cy - 16, 4, cx, cy, 48);
    core.addColorStop(0, '#ccfbf1');
    core.addColorStop(0.5, '#14b8a6');
    core.addColorStop(1, '#042f2e');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, 46, 0, TAU);
    ctx.fill();
    front.forEach(drawP);
    if (this.hover === 'field') {
      txt(ctx, 'clique para uma onda de deploy', cx, 790, { size: 11, fam: 'mono', align: 'center', alpha: 0.4, ls: '1px' });
    }

    // métricas
    const stats = [['99,99%', 'uptime garantido'], ['38 ms', 'latência média'], ['190+', 'regiões edge']];
    stats.forEach(([v, l], i) => {
      const x = 56 + i * 236;
      if (i) {
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(x - 20, 812, 1, 56);
      }
      txt(ctx, v, x, 846, { size: 32, weight: 800, ls: '-1px' });
      txt(ctx, l, x, 870, { size: 13, alpha: 0.5 });
    });

    // preços
    this.toggleA = damp(this.toggleA, this.annual ? 1 : 0, 10, dt);
    this.price = damp(this.price, this.annual ? 79 : 99, 8, dt);
    const ty = 910;
    this.region('toggle', 56, ty, 280, 44);
    rr(ctx, 56, ty, 280, 44, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.stroke();
    rr(ctx, 60 + this.toggleA * 136, ty + 4, 136, 36, 18);
    ctx.fillStyle = '#5eead4';
    ctx.fill();
    txt(ctx, 'Mensal', 128, ty + 27, { size: 14, weight: 700, align: 'center', color: this.toggleA < 0.5 ? '#04201c' : 'rgba(255,255,255,0.7)' });
    txt(ctx, 'Anual −20%', 264, ty + 27, { size: 14, weight: 700, align: 'center', color: this.toggleA >= 0.5 ? '#04201c' : 'rgba(255,255,255,0.7)' });
    txt(ctx, 'Plano Pro', 56, 994, { size: 15, alpha: 0.6 });
    txt(ctx, `R$ ${Math.round(this.price)}`, 56, 1050, { size: 52, weight: 800, ls: '-2px' });
    txt(ctx, '/mês', 56 + measure(ctx, `R$ ${Math.round(this.price)}`, { size: 52, weight: 800, ls: '-2px' }) + 8, 1050, { size: 16, alpha: 0.5 });

    ['Deploys ilimitados', 'SSL + CDN global', 'Suporte 24/7'].forEach((f, i) => {
      txt(ctx, '✓', 400, 932 + i * 30, { size: 15, weight: 800, color: '#5eead4' });
      txt(ctx, f, 424, 932 + i * 30, { size: 15, alpha: 0.75 });
    });
    this.button(ctx, 'subscribe', 400, 1004, PW - 456, 52, 'Assinar o Pro', { fill: '#ffffff', color: '#04201c', arrow: true, glow: '94,234,212' });

    this.folio(ctx);
    this.grain(ctx);
  }

  onPress(id, x, y) {
    if (id === 'field') {
      this.shocks.push({ x, y, t: 0 });
      sound('click');
    } else if (id === 'toggle') {
      this.annual = !this.annual;
      sound('click');
    } else if (id === 'subscribe') {
      sound('click');
      this.ripple(x, y, '94,234,212');
      this.toast(`Plano Pro ativado ✓  R$ ${this.annual ? 79 : 99}/mês`);
    } else if (id === 'begin') {
      sound('click');
      this.toast('Seu primeiro deploy leva 30 segundos');
    }
  }
}

// ---------------------------------------------------------------------------
// 05 — BLOOM · e-commerce de skincare
// ---------------------------------------------------------------------------
class BloomPage extends LivePage {
  init() {
    this.sw = [
      { n: 'Pêssego', c: [255, 179, 138] },
      { n: 'Rosa', c: [255, 143, 171] },
      { n: 'Sálvia', c: [163, 217, 165] },
    ];
    this.sel = 0;
    this.col = this.sw[0].c.slice();
    this.bag = 0;
    this.bagPop = 0;
    this.added = 0;
    this.flyers = [];
    this.bubbles = [];
    this.tilt = 0;
  }

  draw(ctx, t, dt) {
    this.col = dampArr(this.col, this.sw[this.sel].c, 6, dt);
    const cs = rgbStr(this.col);
    this.bagPop = damp(this.bagPop, 0, 6, dt);
    this.added = Math.max(0, this.added - dt);

    this.bg(ctx, '#100b0b');
    glow(ctx, 400, 610, 380, cs, 0.22);
    ctx.strokeStyle = `rgba(${cs},0.14)`;
    ctx.lineWidth = 1;
    [190, 250].forEach((r) => {
      ctx.beginPath();
      ctx.arc(400, 610, r + Math.sin(t + r) * 4, 0, TAU);
      ctx.stroke();
    });

    // nav
    txt(ctx, 'bloom.', 56, 96, { size: 34, fam: 'serif', italic: true });
    ['Loja', 'Rituais', 'Sobre'].forEach((l, i) => txt(ctx, l, 330 + i * 86, 90, { size: 14, alpha: 0.6 }));
    ctx.save();
    ctx.translate(722, 84);
    const bs = 1 + this.bagPop * 0.35;
    ctx.scale(bs, bs);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    rr(ctx, -13, -8, 26, 22, 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -8, 7, Math.PI, 0);
    ctx.stroke();
    if (this.bag > 0) {
      ctx.fillStyle = `rgb(${cs})`;
      ctx.beginPath();
      ctx.arc(13, -12, 10, 0, TAU);
      ctx.fill();
      txt(ctx, String(this.bag), 13, -8, { size: 11, weight: 800, align: 'center', color: '#140c0c' });
    }
    ctx.restore();

    txt(ctx, 'SÉRUM FACIAL · 30 ML', 56, 160, { size: 12, fam: 'mono', alpha: 0.5, ls: '3px' });
    txt(ctx, 'Brilho que', 56, 232, { size: 66, weight: 800, ls: '-3px' });
    txt(ctx, 'floresce.', 56, 312, { size: 90, fam: 'serif', italic: true, color: `rgb(${cs})` });
    txt(ctx, 'Niacinamida + flor de laranjeira.', 56, 356, { size: 17, alpha: 0.6 });
    txt(ctx, 'Pele luminosa em 14 dias.', 56, 382, { size: 17, alpha: 0.6 });

    // produto
    const target = this.p.inside ? (this.sp.x / PW - 0.5) * 0.5 : Math.sin(t * 0.6) * 0.08;
    this.tilt = damp(this.tilt, target, 4, dt);
    const px = 400, py = 625 + Math.sin(t * 1.3) * 10;
    const hv = this.h('product');
    this.region('product', 300, 420, 200, 360);

    ctx.save();
    ctx.translate(400, 805);
    ctx.scale(1, 0.16);
    glow(ctx, 0, 0, 150, '0,0,0', 0.8);
    ctx.restore();

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(this.tilt * 0.35);
    const sc = 1 + hv * 0.03;
    ctx.scale(sc, sc);
    // conta-gotas
    const bulb = ctx.createLinearGradient(-22, 0, 22, 0);
    bulb.addColorStop(0, '#2a2020');
    bulb.addColorStop(0.35, '#4a3a3a');
    bulb.addColorStop(1, '#1a1212');
    ctx.fillStyle = bulb;
    rr(ctx, -22, -210, 44, 70, 22);
    ctx.fill();
    ctx.fillStyle = '#1a1414';
    rr(ctx, -30, -146, 60, 36, 6);
    ctx.fill();
    // vidro
    rr(ctx, -82, -112, 164, 252, 40);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(-90, -120, 180, 270);
    const level = -20;
    ctx.beginPath();
    ctx.moveTo(-90, 150);
    for (let x = -90; x <= 90; x += 6) {
      const y = level + Math.sin(x * 0.045 + t * 3) * 4 + Math.sin(x * 0.02 - t * 2) * 3 - x * this.tilt * 0.5;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(90, 150);
    ctx.closePath();
    const liq = ctx.createLinearGradient(0, -20, 0, 140);
    liq.addColorStop(0, `rgba(${cs},0.9)`);
    liq.addColorStop(1, `rgba(${cs},0.55)`);
    ctx.fillStyle = liq;
    ctx.fill();
    if (Math.random() < dt * 6) this.bubbles.push({ x: (Math.random() - 0.5) * 120, y: 130, r: 1 + Math.random() * 3, v: 20 + Math.random() * 40 });
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.y -= b.v * dt;
      if (b.y < level) {
        this.bubbles.splice(i, 1);
        continue;
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(b.x + Math.sin(t * 3 + b.y * 0.1) * 2, b.y, b.r, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1.5;
    rr(ctx, -82, -112, 164, 252, 40);
    ctx.stroke();
    const hl = ctx.createLinearGradient(-66, 0, -46, 0);
    hl.addColorStop(0, 'rgba(255,255,255,0)');
    hl.addColorStop(0.5, 'rgba(255,255,255,0.35)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl;
    rr(ctx, -66, -90, 20, 200, 10);
    ctx.fill();
    rr(ctx, -56, 30, 112, 64, 8);
    ctx.fillStyle = 'rgba(255,250,246,0.92)';
    ctx.fill();
    txt(ctx, 'bloom.', 0, 62, { size: 24, fam: 'serif', italic: true, align: 'center', color: '#1a1010' });
    txt(ctx, 'SÉRUM · 30ML', 0, 82, { size: 9, fam: 'mono', align: 'center', color: '#1a1010', ls: '1px' });
    ctx.restore();

    // tons
    txt(ctx, 'Escolha o tom', 56, 846, { size: 13, alpha: 0.5 });
    this.sw.forEach((s, i) => {
      const id = 'sw' + i;
      const x = 76 + i * 52, y = 880;
      const h2 = this.h(id);
      this.region(id, x - 22, y - 22, 44, 44);
      if (i === this.sel) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, TAU);
        ctx.stroke();
      }
      ctx.fillStyle = `rgb(${s.c.join(',')})`;
      ctx.beginPath();
      ctx.arc(x, y, 15 + h2 * 3, 0, TAU);
      ctx.fill();
    });
    txt(ctx, this.sw[this.sel].n, 230, 886, { size: 16, weight: 700 });

    txt(ctx, '★★★★★', PW - 56, 852, { size: 18, align: 'right', color: `rgb(${cs})`, ls: '2px' });
    txt(ctx, '4,9 · 2.318 avaliações', PW - 56, 880, { size: 13, align: 'right', alpha: 0.5 });

    txt(ctx, 'R$ 189', 56, 960, { size: 42, weight: 800, ls: '-1.5px' });
    txt(ctx, 'R$ 229', 216, 958, { size: 18, alpha: 0.4 });
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(214, 952, measure(ctx, 'R$ 229', { size: 18 }) + 4, 1.5);
    rr(ctx, 300, 937, 56, 28, 14);
    ctx.fillStyle = `rgba(${cs},0.2)`;
    ctx.fill();
    txt(ctx, '−17%', 328, 956, { size: 13, weight: 700, align: 'center', color: `rgb(${cs})` });

    const label = this.added > 0 ? 'Adicionado à sacola ✓' : 'Adicionar à sacola';
    const bfill = `rgb(${rgbStr(this.col.map((v) => lerp(v, 255, this.h('add') * 0.25)))})`;
    this.button(ctx, 'add', 380, 920, PW - 436, 58, label, { fill: bfill, color: '#140c0c', glow: cs });

    txt(ctx, 'VEGANO   ·   SEM PARABENOS   ·   REFIL SUSTENTÁVEL', 400, 1040, {
      size: 11, fam: 'mono', align: 'center', alpha: 0.45, ls: '2px',
    });

    // itens voando para a sacola
    for (let i = this.flyers.length - 1; i >= 0; i--) {
      const f = this.flyers[i];
      f.t += dt / 0.75;
      if (f.t >= 1) {
        this.flyers.splice(i, 1);
        this.bag++;
        this.bagPop = 1;
        continue;
      }
      const k = easeOut(f.t);
      const x = lerp(f.x, 722, k);
      const y = lerp(f.y, 84, k) - Math.sin(k * Math.PI) * 140;
      glow(ctx, x, y, 26, cs, 0.6);
      ctx.fillStyle = `rgb(${cs})`;
      ctx.beginPath();
      ctx.arc(x, y, 9 * (1 - k * 0.5), 0, TAU);
      ctx.fill();
    }

    this.folio(ctx);
    this.grain(ctx);
  }

  onPress(id, x, y) {
    if (id.startsWith('sw')) {
      this.sel = +id.slice(2);
      sound('click');
    } else if (id === 'add') {
      sound('click');
      this.added = 1.6;
      this.flyers.push({ x, y, t: 0 });
      this.ripple(x, y, rgbStr(this.col));
    } else if (id === 'product') {
      for (let i = 0; i < 14; i++) this.bubbles.push({ x: (Math.random() - 0.5) * 120, y: 100 + Math.random() * 40, r: 1 + Math.random() * 4, v: 60 + Math.random() * 80 });
      this.ripple(x, y, rgbStr(this.col));
      sound('click');
    }
  }
}

// ---------------------------------------------------------------------------
// 06 — KINETIC · tipografia reativa
// ---------------------------------------------------------------------------
class KineticPage extends LivePage {
  init() {
    this.words = ['CRIAR', 'SEM', 'LIMITES'];
    this.letters = null;
    this.outline = false;
    this.scramble = 0;
    this.glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#&%@*';
  }

  layout(ctx) {
    let size = 150;
    const widest = Math.max(...this.words.map((w) => measure(ctx, w, { size, weight: 800 })));
    size = Math.min(size, (size * (PW - 120)) / widest);
    this.fontSize = size;
    this.letters = [];
    this.words.forEach((w, li) => {
      const total = measure(ctx, w, { size, weight: 800 });
      let x = (PW - total) / 2;
      const y = 470 + li * size * 1.05;
      for (const ch of w) {
        const cw = measure(ctx, ch, { size, weight: 800 });
        this.letters.push({ ch, hx: x + cw / 2, hy: y, ox: 0, oy: 0, vx: 0, vy: 0, near: 0, rot: 0 });
        x += cw;
      }
    });
  }

  draw(ctx, t, dt) {
    if (!this.letters) this.layout(ctx);
    const lime = '217,255,63';
    this.bg(ctx, '#0a0a0a');
    glow(ctx, this.sp.x, this.sp.y, 260, lime, this.p.inside ? 0.08 : 0);

    txt(ctx, 'KINETIC®', 56, 92, { size: 16, fam: 'mono', weight: 700, ls: '2px' });
    txt(ctx, 'Estúdio de tipografia', PW - 56, 92, { size: 14, align: 'right', alpha: 0.55 });

    // letreiro em contorno
    const m1 = 'MOVIMENTO ✦ FORMA ✦ RITMO ✦ ';
    const w1 = measure(ctx, m1, { size: 72, weight: 800 });
    const off1 = -((t * 50) % w1);
    for (let x = off1; x < PW; x += w1) txt(ctx, m1, x, 196, { size: 72, weight: 800, stroke: 'rgba(255,255,255,0.3)', lineWidth: 1.4 });

    // faixa lima
    ctx.save();
    ctx.translate(400, 262);
    ctx.rotate(-0.025);
    ctx.fillStyle = `rgb(${lime})`;
    ctx.fillRect(-460, -32, 920, 64);
    const m2 = 'TIPO VARIÁVEL — 100 A 900 — ';
    const w2 = measure(ctx, m2, { size: 30, weight: 800 });
    const off2 = ((t * 70) % w2) - w2;
    for (let x = off2 - 460; x < 460; x += w2) txt(ctx, m2, x, 11, { size: 30, weight: 800, color: '#0a0a0a' });
    ctx.restore();

    // letras interativas
    this.region('letters', 40, 330, PW - 80, 540);
    this.scramble = Math.max(0, this.scramble - dt);
    const mx = this.p.x, my = this.p.y;
    this.letters.forEach((L, i) => {
      const x = L.hx + L.ox, y = L.hy + L.oy;
      let near = 0;
      if (this.p.inside) {
        const dx = x - mx, dy = y - this.fontSize * 0.35 - my;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 200) {
          near = 1 - d / 200;
          L.vx += (dx / d) * near * 1500 * dt;
          L.vy += (dy / d) * near * 1500 * dt;
        }
      }
      L.near = damp(L.near, near, 10, dt);
      L.vx += -L.ox * 40 * dt;
      L.vy += -L.oy * 40 * dt;
      const fr = Math.exp(-7 * dt);
      L.vx *= fr;
      L.vy *= fr;
      L.ox += L.vx * dt;
      L.oy += L.vy * dt;
      L.rot = L.ox * 0.004;

      let ch = L.ch;
      if (this.scramble > 0 && Math.random() < this.scramble) ch = this.glyphs[(Math.random() * this.glyphs.length) | 0];
      ctx.save();
      ctx.translate(L.hx + L.ox, L.hy + L.oy);
      ctx.rotate(L.rot);
      const s = 1 + L.near * 0.22;
      ctx.scale(s, s);
      const wobble = Math.sin(t * 2 + i * 0.6) * 3;
      const color = L.near > 0.05 ? `rgb(${lerp(255, 217, L.near)},255,${lerp(255, 63, L.near)})` : '#f4f4f0';
      if (this.outline) {
        txt(ctx, ch, 0, wobble, { size: this.fontSize, weight: 800, align: 'center', stroke: color, lineWidth: 2 });
      } else {
        txt(ctx, ch, 0, wobble, { size: this.fontSize, weight: 800, align: 'center', color });
      }
      ctx.restore();
    });

    // controles
    const y = 900;
    this.region('mode', 56, y, 290, 46);
    rr(ctx, 56, y, 290, 46, 23);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
    this._m = damp(this._m || 0, this.outline ? 1 : 0, 10, dt);
    rr(ctx, 60 + this._m * 141, y + 4, 141, 38, 19);
    ctx.fillStyle = `rgb(${lime})`;
    ctx.fill();
    txt(ctx, 'Preenchido', 130, y + 28, { size: 14, weight: 700, align: 'center', color: this._m < 0.5 ? '#0a0a0a' : 'rgba(255,255,255,0.7)' });
    txt(ctx, 'Contorno', 272, y + 28, { size: 14, weight: 700, align: 'center', color: this._m >= 0.5 ? '#0a0a0a' : 'rgba(255,255,255,0.7)' });
    this.button(ctx, 'shuffle', 362, y, 180, 46, 'Embaralhar ↻', { size: 14 });

    txt(ctx, 'Tipografia que reage ao seu gesto.', 56, 1006, { size: 24, weight: 700, ls: '-0.5px' });
    txt(ctx, 'Passe o mouse sobre as letras — ou clique nelas.', 56, 1036, { size: 15, alpha: 0.5 });
    txt(ctx, '412 GLIFOS', PW - 56, 1006, { size: 11, fam: 'mono', align: 'right', alpha: 0.4, ls: '2px' });
    txt(ctx, 'OFL · 2026', PW - 56, 1028, { size: 11, fam: 'mono', align: 'right', alpha: 0.4, ls: '2px' });

    this.folio(ctx);
    this.grain(ctx);
  }

  onPress(id, x, y) {
    sound('click');
    if (id === 'mode') this.outline = !this.outline;
    else if (id === 'shuffle' || id === 'letters') {
      this.scramble = 0.9;
      this.letters.forEach((L) => {
        L.vx += (Math.random() - 0.5) * 900;
        L.vy += (Math.random() - 0.5) * 900;
      });
      if (id === 'letters') this.ripple(x, y, '217,255,63');
    }
  }
}

// ---------------------------------------------------------------------------
// 07 — NIMBUS · app de clima
// ---------------------------------------------------------------------------
class NimbusPage extends LivePage {
  init() {
    this.cities = [
      { n: 'São Paulo', temp: 21, cond: 'Chuva leve', type: 'rain', hum: 82, wind: 14, uv: 3 },
      { n: 'Lisboa', temp: 26, cond: 'Ensolarado', type: 'sun', hum: 48, wind: 9, uv: 7 },
      { n: 'Tóquio', temp: 17, cond: 'Nublado', type: 'cloud', hum: 64, wind: 18, uv: 2 },
    ];
    this.ci = 0;
    this.tabX = 0;
    this.temp = 21;
    this.hour = 15;
    this.mix = { rain: 1, sun: 0, cloud: 0 };
    this.drops = Array.from({ length: 110 }, () => ({ x: Math.random() * PW, y: Math.random() * 760, v: 500 + Math.random() * 300 }));
  }

  skyAt(h) {
    const keys = [
      [0, [6, 9, 24], [10, 14, 34]],
      [5, [12, 16, 40], [40, 30, 60]],
      [7, [40, 80, 140], [140, 110, 120]],
      [12, [24, 90, 170], [70, 140, 200]],
      [17, [40, 60, 130], [200, 110, 90]],
      [19, [30, 24, 60], [120, 60, 80]],
      [21, [8, 12, 30], [14, 18, 40]],
      [24, [6, 9, 24], [10, 14, 34]],
    ];
    for (let i = 0; i < keys.length - 1; i++) {
      const [h0, t0, b0] = keys[i];
      const [h1, t1, b1] = keys[i + 1];
      if (h >= h0 && h <= h1) {
        const k = (h - h0) / (h1 - h0);
        return [t0.map((v, j) => lerp(v, t1[j], k)), b0.map((v, j) => lerp(v, b1[j], k))];
      }
    }
    return [keys[0][1], keys[0][2]];
  }

  cloud(ctx, x, y, s, a) {
    ctx.fillStyle = `rgba(230,236,248,${a})`;
    ctx.beginPath();
    ctx.moveTo(x, y + 32 * s);
    ctx.arc(x, y, 32 * s, Math.PI / 2, Math.PI * 1.5);
    ctx.arc(x + 40 * s, y - 16 * s, 42 * s, Math.PI * 1.1, Math.PI * 1.95);
    ctx.arc(x + 88 * s, y, 32 * s, Math.PI * 1.5, Math.PI / 2);
    ctx.closePath();
    ctx.fill();
  }

  draw(ctx, t, dt) {
    const c = this.cities[this.ci];
    if (this.dragId === 'slider' && this.p.down) this.hour = clamp(((this.p.x - 56) / (PW - 112)) * 24, 0, 23.99);
    ['rain', 'sun', 'cloud'].forEach((k) => (this.mix[k] = damp(this.mix[k], c.type === k ? 1 : 0, 3, dt)));
    const tempTarget = c.temp + (Math.cos(((this.hour - 15) / 24) * TAU) - 1) * 3;
    this.temp = damp(this.temp, tempTarget, 5, dt);
    const daylight = clamp(Math.sin(((this.hour - 6) / 12) * Math.PI), 0, 1);

    // céu
    const [top, bot] = this.skyAt(this.hour);
    const dim = 1 - this.mix.rain * 0.3 - this.mix.cloud * 0.15;
    const sky = ctx.createLinearGradient(0, 0, 0, 760);
    sky.addColorStop(0, `rgb(${rgbStr(top.map((v) => v * dim))})`);
    sky.addColorStop(1, `rgb(${rgbStr(bot.map((v) => v * dim))})`);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, PW, 760);
    ctx.fillStyle = '#070a12';
    ctx.fillRect(0, 760, PW, PH - 760);
    const fade = ctx.createLinearGradient(0, 560, 0, 760);
    fade.addColorStop(0, 'rgba(7,10,18,0)');
    fade.addColorStop(1, 'rgba(7,10,18,1)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 560, PW, 200);

    // sol / lua
    const k = ((this.hour - 6 + 24) % 24) / 12;
    if (k <= 1) {
      const sx = lerp(120, 680, k), sy = 560 - Math.sin(k * Math.PI) * 330;
      const a = 1 - this.mix.rain * 0.7 - this.mix.cloud * 0.5;
      glow(ctx, sx, sy, 200 + this.mix.sun * 80, '255,200,120', 0.45 * a);
      ctx.fillStyle = `rgba(255,236,190,${a})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 34, 0, TAU);
      ctx.fill();
      if (this.mix.sun > 0.05) {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(t * 0.3);
        ctx.strokeStyle = `rgba(255,230,170,${0.6 * this.mix.sun * a})`;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        for (let i = 0; i < 12; i++) {
          ctx.rotate(TAU / 12);
          ctx.beginPath();
          ctx.moveTo(48, 0);
          ctx.lineTo(62 + Math.sin(t * 3 + i) * 5, 0);
          ctx.stroke();
        }
        ctx.restore();
      }
    } else {
      const k2 = k - 1;
      const mx2 = lerp(120, 680, k2), my2 = 560 - Math.sin(k2 * Math.PI) * 330;
      glow(ctx, mx2, my2, 120, '200,210,255', 0.25);
      ctx.fillStyle = '#e6e9f5';
      ctx.beginPath();
      ctx.arc(mx2, my2, 26, 0, TAU);
      ctx.fill();
      ctx.fillStyle = `rgb(${rgbStr(top)})`;
      ctx.beginPath();
      ctx.arc(mx2 + 11, my2 - 8, 22, 0, TAU);
      ctx.fill();
      for (let i = 0; i < 30; i++) {
        const sx = (i * 137.5) % PW, sy = (i * 71.3) % 500;
        ctx.fillStyle = `rgba(255,255,255,${(0.3 + 0.3 * Math.sin(t * 2 + i)) * (1 - daylight)})`;
        ctx.fillRect(sx, sy, 2, 2);
      }
    }

    // nuvens
    const ca = this.mix.cloud * 0.55 + this.mix.rain * 0.4 + 0.08;
    [[0.0, 300, 1.2], [0.4, 220, 0.8], [0.7, 380, 1.0]].forEach(([o, y, s], i) => {
      const x = (((t * (10 + i * 6)) / PW + o) % 1.3) * (PW + 300) - 250;
      this.cloud(ctx, x, y, s, ca * (0.5 + i * 0.2));
    });

    // chuva
    if (this.mix.rain > 0.02) {
      ctx.strokeStyle = `rgba(180,210,255,${0.45 * this.mix.rain})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      this.drops.forEach((d) => {
        d.y += d.v * dt;
        d.x -= d.v * dt * 0.15;
        if (d.y > 760) {
          d.y = -20;
          d.x = Math.random() * (PW + 100);
        }
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + 3, d.y - 18);
      });
      ctx.stroke();
    }

    // nav + abas de cidade
    txt(ctx, 'nimbus', 56, 92, { size: 22, weight: 800, ls: '-0.5px' });
    txt(ctx, 'Atualizado agora', PW - 56, 90, { size: 13, alpha: 0.6, align: 'right' });
    const tabW = 128;
    this.tabX = damp(this.tabX, this.ci * (tabW + 8), 10, dt);
    rr(ctx, 56 + this.tabX, 128, tabW, 40, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fill();
    this.cities.forEach((ct, i) => {
      const x = 56 + i * (tabW + 8);
      this.region('city' + i, x, 128, tabW, 40);
      if (i !== this.ci) {
        rr(ctx, x, 128, tabW, 40, 20);
        ctx.strokeStyle = `rgba(255,255,255,${0.2 + this.h('city' + i) * 0.3})`;
        ctx.stroke();
      }
      txt(ctx, ct.n, x + tabW / 2, 154, { size: 14, weight: 700, align: 'center', color: i === this.ci ? '#0b1020' : '#fff' });
    });

    txt(ctx, `${Math.round(this.temp)}°`, 48, 380, { size: 170, weight: 800, ls: '-8px' });
    txt(ctx, c.cond, 58, 430, { size: 28, weight: 700 });
    txt(ctx, `Máx ${c.temp}°  ·  Mín ${c.temp - 6}°`, 58, 462, { size: 16, alpha: 0.7 });

    // slider de hora
    const sy = 700;
    const hh = Math.floor(this.hour);
    txt(ctx, 'HORA DO DIA — ARRASTE', 56, 672, { size: 11, fam: 'mono', alpha: 0.6, ls: '2px' });
    txt(ctx, `${String(hh).padStart(2, '0')}:${String(Math.floor((this.hour % 1) * 60)).padStart(2, '0')}`, PW - 56, 674, {
      size: 16, fam: 'mono', weight: 700, align: 'right',
    });
    this.region('slider', 56, sy - 20, PW - 112, 40);
    const tg = ctx.createLinearGradient(56, 0, PW - 56, 0);
    tg.addColorStop(0, '#1e2a5a');
    tg.addColorStop(0.3, '#f6b26b');
    tg.addColorStop(0.5, '#7dd3fc');
    tg.addColorStop(0.75, '#f08a5d');
    tg.addColorStop(1, '#1e2a5a');
    rr(ctx, 56, sy - 3, PW - 112, 6, 3);
    ctx.fillStyle = tg;
    ctx.fill();
    const kx = 56 + (this.hour / 24) * (PW - 112);
    glow(ctx, kx, sy, 30, '255,255,255', 0.3 + this.h('slider') * 0.3);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(kx, sy, 11 + this.h('slider') * 3, 0, TAU);
    ctx.fill();

    // previsão por hora
    const py0 = 770;
    rr(ctx, 56, py0, PW - 112, 150, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.stroke();
    const colW = (PW - 112) / 6;
    const temps = [];
    for (let i = 0; i < 6; i++) {
      const hr = (hh + i * 3) % 24;
      temps.push(Math.round(c.temp + (Math.cos(((hr - 15) / 24) * TAU) - 1) * 3));
    }
    const tmin = Math.min(...temps) - 1, tmax = Math.max(...temps) + 1;
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const x = 56 + colW * i + colW / 2;
      const id = 'h' + i;
      this.region(id, 56 + colW * i, py0, colW, 150);
      const hv = this.h(id);
      if (hv > 0.01) {
        rr(ctx, 60 + colW * i, py0 + 4, colW - 8, 142, 16);
        ctx.fillStyle = `rgba(255,255,255,${0.07 * hv})`;
        ctx.fill();
      }
      const hr = (hh + i * 3) % 24;
      txt(ctx, i === 0 ? 'Agora' : `${String(hr).padStart(2, '0')}h`, x, py0 + 32, { size: 12, fam: 'mono', align: 'center', alpha: 0.6 });
      const y = lerp(py0 + 120, py0 + 70, (temps[i] - tmin) / (tmax - tmin));
      pts.push([x, y]);
      txt(ctx, `${temps[i]}°`, x, y - 14, { size: 16 + hv * 4, weight: 700, align: 'center' });
    }
    ctx.strokeStyle = 'rgba(125,211,252,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
    pts.forEach((p) => {
      ctx.fillStyle = '#7dd3fc';
      ctx.beginPath();
      ctx.arc(p[0], p[1], 3.5, 0, TAU);
      ctx.fill();
    });

    // estatísticas
    const cards = [
      ['UMIDADE', `${c.hum}%`, c.hum / 100],
      ['VENTO', `${c.wind} km/h`, c.wind / 30],
      ['ÍNDICE UV', `${c.uv}`, c.uv / 11],
    ];
    const cw = (PW - 112 - 32) / 3;
    cards.forEach(([l, v, f], i) => {
      const x = 56 + i * (cw + 16), y = 940;
      rr(ctx, x, y, cw, 116, 18);
      ctx.fillStyle = 'rgba(255,255,255,0.045)';
      ctx.fill();
      txt(ctx, l, x + 18, y + 30, { size: 11, fam: 'mono', alpha: 0.55, ls: '2px' });
      txt(ctx, v, x + 18, y + 70, { size: 26, weight: 800 });
      rr(ctx, x + 18, y + 90, cw - 36, 5, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fill();
      this['_bar' + i] = damp(this['_bar' + i] || 0, f, 5, dt);
      rr(ctx, x + 18, y + 90, (cw - 36) * clamp(this['_bar' + i], 0, 1), 5, 3);
      ctx.fillStyle = '#7dd3fc';
      ctx.fill();
    });

    this.folio(ctx);
    this.grain(ctx);
  }

  onPress(id, x) {
    if (id.startsWith('city')) {
      this.ci = +id.slice(4);
      sound('click');
    } else if (id === 'slider') {
      this.hour = clamp(((x - 56) / (PW - 112)) * 24, 0, 23.99);
    }
  }
}

// ---------------------------------------------------------------------------
// 08 — CONTATO
// ---------------------------------------------------------------------------
class ContactPage extends LivePage {
  init() {
    this.mag = { x: 0, y: 0 };
    this.copied = 0;
  }

  draw(ctx, t, dt) {
    this.bg(ctx, '#08080b');
    this.copied = Math.max(0, this.copied - dt);

    // blob orgânico
    const bx = 400 + (this.sp.x - 400) * 0.08;
    const by = 400 + (this.sp.y - 400) * 0.05;
    const R = 175;
    const palette = [[99, 102, 241], [236, 72, 153], [6, 182, 212], [168, 85, 247]];
    const ph = (t * 0.15) % palette.length;
    const c1 = palette[Math.floor(ph)];
    const c2 = palette[(Math.floor(ph) + 1) % palette.length];
    const f = ph % 1;
    const mixC = c1.map((v, i) => lerp(v, c2[i], f));
    glow(ctx, bx, by, 360, rgbStr(mixC), 0.22);
    ctx.beginPath();
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * TAU;
      const r = R * (1 + 0.08 * Math.sin(3 * a + t * 1.1) + 0.06 * Math.sin(5 * a - t * 0.8) + 0.04 * Math.sin(2 * a + t * 1.7));
      const x = bx + Math.cos(a) * r, y = by + Math.sin(a) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    const bg = ctx.createLinearGradient(bx - R, by - R, bx + R, by + R);
    bg.addColorStop(0, `rgb(${rgbStr(c1)})`);
    bg.addColorStop(1, `rgb(${rgbStr(c2)})`);
    ctx.fillStyle = bg;
    ctx.fill();
    glow(ctx, bx - 50, by - 60, 120, '255,255,255', 0.35);

    // texto girando em volta
    const ring = 'DISPONÍVEL PARA PROJETOS · 2026 · ';
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(t * 0.15);
    const chars = (ring + ring).split('');
    chars.forEach((ch, i) => {
      ctx.save();
      ctx.rotate((i / chars.length) * TAU);
      txt(ctx, ch, 0, -248, { size: 13, fam: 'mono', align: 'center', alpha: 0.55 });
      ctx.restore();
    });
    ctx.restore();

    txt(ctx, 'rappu', 56, 92, { size: 22, weight: 800, ls: '-0.5px' });
    txt(ctx, 'CONTATO', PW - 56, 90, { size: 12, fam: 'mono', align: 'right', alpha: 0.5, ls: '3px' });

    txt(ctx, 'Vamos criar', 56, 762, { size: 72, weight: 800, ls: '-3px' });
    const hg = ctx.createLinearGradient(56, 0, 500, 0);
    hg.addColorStop(0, `rgb(${rgbStr(c1)})`);
    hg.addColorStop(1, `rgb(${rgbStr(c2)})`);
    txt(ctx, 'algo juntos.', 56, 846, { size: 92, fam: 'serif', italic: true, color: hg });
    txt(ctx, 'Tem uma ideia, um produto ou uma marca para lançar?', 56, 896, { size: 18, alpha: 0.6 });
    txt(ctx, 'Me conta — respondo em até 48h.', 56, 924, { size: 18, alpha: 0.6 });

    // botão magnético
    const bw = 230, bh = 60, bx0 = 56, by0 = 952;
    const ccx = bx0 + bw / 2, ccy = by0 + bh / 2;
    let tx = 0, ty = 0;
    if (this.p.inside) {
      const dx = this.p.x - ccx, dy = this.p.y - ccy;
      if (Math.hypot(dx, dy) < 160) {
        tx = dx * 0.28;
        ty = dy * 0.28;
      }
    }
    this.mag.x = damp(this.mag.x, tx, 9, dt);
    this.mag.y = damp(this.mag.y, ty, 9, dt);
    const label = this.copied > 0 ? 'Copiado ✓' : 'Copiar e-mail';
    this.button(ctx, 'copy', bx0 + this.mag.x, by0 + this.mag.y, bw, bh, label, { fill: '#ffffff', color: '#0b0b10', glow: rgbStr(mixC), size: 16 });
    txt(ctx, CONFIG.email, 310, 990, { size: 18, fam: 'mono', alpha: 0.85 });

    let sx = 56;
    CONFIG.socials.forEach((s, i) => {
      const id = 's' + i;
      const lbl = s.label + ' ↗';
      const w = measure(ctx, lbl, { size: 14, weight: 600 });
      const hv = this.h(id);
      this.region(id, sx - 6, 1030, w + 12, 34);
      txt(ctx, lbl, sx, 1054, { size: 14, weight: 600, alpha: 0.55 + hv * 0.45 });
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(sx, 1060, w * hv, 1.5);
      sx += w + 30;
    });

    this.folio(ctx);
    this.grain(ctx);
  }

  onPress(id, x, y) {
    sound('click');
    if (id === 'copy') {
      if (navigator.clipboard) navigator.clipboard.writeText(CONFIG.email).catch(() => {});
      this.copied = 1.8;
      this.ripple(x, y);
      this.toast(`${CONFIG.email} copiado ✓`);
    } else if (id.startsWith('s')) {
      const s = CONFIG.socials[+id.slice(1)];
      if (s && s.url) window.open(s.url, '_blank', 'noopener');
    }
  }
}

// ---------------------------------------------------------------------------
function createBookPages() {
  return {
    cover: new CoverPage(0, 'Capa'),
    pages: [
      new IndexPage(1, 'Sumário'),
      new AuroraPage(2, 'Aurora — Fintech'),
      new PulsePage(3, 'Pulse — Música'),
      new OrbitPage(4, 'Orbit — SaaS'),
      new BloomPage(5, 'Bloom — Skincare'),
      new KineticPage(6, 'Kinetic — Tipografia'),
      new NimbusPage(7, 'Nimbus — Clima'),
      new ContactPage(8, 'Contato'),
    ],
    size: { w: PW, h: PH },
  };
}

window.createBookPages = createBookPages;
window.PAGE_CONFIG = CONFIG;
