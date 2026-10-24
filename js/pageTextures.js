/**
 * Ultra High-Resolution Canvas Page Texture Generator (2048 x 2896 px)
 * Renders editorial-grade Swiss layout typography, charts, vector diagrams,
 * and tactile hardware mockups for the 3D book pages.
 */

class PageTextureGenerator {
  constructor() {
    this.width = 1600;
    this.height = 2260; // 1 : 1.4125 (Editorial A4 Monograph ratio)
    this.pages = [];
  }

  createCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    return canvas;
  }

  // Draw subtle natural paper fiber texture & hairline perimeter rules
  drawPaperBase(ctx, isDark = true) {
    const w = this.width;
    const h = this.height;

    if (isDark) {
      // Luxurious deep dark slate paper
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0c0d11');
      grad.addColorStop(0.5, '#0e0f14');
      grad.addColorStop(1, '#0a0b0e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Delicate micro-texture noise
      ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
      for (let i = 0; i < 3000; i++) {
        const rx = Math.random() * w;
        const ry = Math.random() * h;
        ctx.fillRect(rx, ry, 1.5, 1.5);
      }

      // Elegant inner hairline border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(40, 40, w - 80, h - 80);
    } else {
      // Warm editorial cream white
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#f9f9fa');
      grad.addColorStop(1, '#f1f1f3');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.015)';
      for (let i = 0; i < 2000; i++) {
        const rx = Math.random() * w;
        const ry = Math.random() * h;
        ctx.fillRect(rx, ry, 1.5, 1.5);
      }

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(40, 40, w - 80, h - 80);
    }
  }

  // Helper for pagination & top folio
  drawFolio(ctx, pageNum, totalPages, category, isDark = true) {
    const w = this.width;
    const isLeft = pageNum % 2 === 0;
    const x = isLeft ? 70 : w - 70;
    const align = isLeft ? 'left' : 'right';

    ctx.save();
    ctx.textAlign = align;
    ctx.font = '500 24px "JetBrains Mono", monospace';
    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.45)';

    // Folio text
    const numStr = String(pageNum).padStart(2, '0');
    const totalStr = String(totalPages).padStart(2, '0');
    ctx.fillText(`${numStr} / ${totalStr}`, x, 90);

    // Running category
    ctx.textAlign = isLeft ? 'right' : 'left';
    const catX = isLeft ? w - 70 : 70;
    ctx.font = '600 22px "Plus Jakarta Sans", -apple-system, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText(category.toUpperCase(), catX, 90);

    // Hairline divider under folio
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(70, 115);
    ctx.lineTo(w - 70, 115);
    ctx.stroke();

    ctx.restore();
  }

  // ==========================================
  // PAGE 1: COVER / TITLE MONOGRAPH (Alive, Vibrant, High-Contrast)
  // ==========================================
  generatePage1() {
    const canvas = this.createCanvas();
    const ctx = canvas.getContext('2d');
    const w = this.width;
    const h = this.height;

    this.drawPaperBase(ctx, true);

    // Architectural precision matrix in background
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 100; x < w - 80; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 120);
      ctx.lineTo(x, h - 120);
      ctx.stroke();
    }
    for (let y = 140; y < h - 120; y += 60) {
      ctx.beginPath();
      ctx.moveTo(100, y);
      ctx.lineTo(w - 100, y);
      ctx.stroke();
    }
    ctx.restore();

    // Studio Header & Monograph Tag
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 68px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('rappu', 120, 260);

    // Glowing electric cyan accent dot
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(345, 228, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Glowing Category Pill
    ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.40)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(120, 305, 410, 44, 22);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 18px "JetBrains Mono", monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText('SELECTED WORKS · 2026 EDITION', 145, 333);

    // Large high-impact monograph title with rich contrast
    ctx.font = '900 106px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('CRAZIEST', 120, 520);

    // Gradient chromatic title line for PORTFOLIO
    const titleGrad = ctx.createLinearGradient(120, 0, 750, 0);
    titleGrad.addColorStop(0.0, '#ffffff');
    titleGrad.addColorStop(0.5, '#67e8f9');
    titleGrad.addColorStop(1.0, '#a855f7');
    ctx.fillStyle = titleGrad;
    ctx.fillText('PORTFOLIO', 120, 625);

    ctx.fillStyle = '#ffffff';
    ctx.fillText('IN 2026', 120, 730);

    // Subtitle tagline
    ctx.font = '500 34px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('"Feels like a book, acts like a book, is a book."', 120, 810);

    // ============================================
    // CENTER FOCAL PIECE: Radiant Chromatic Holographic 3D Prism
    // ============================================
    const cx = w / 2;
    const cy = 1360;
    const s = 210;

    // Radiant background aura glow
    const auraGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 420);
    auraGrad.addColorStop(0.00, 'rgba(0, 240, 255, 0.22)');
    auraGrad.addColorStop(0.35, 'rgba(99, 102, 241, 0.15)');
    auraGrad.addColorStop(0.70, 'rgba(168, 85, 247, 0.05)');
    auraGrad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 420, 0, Math.PI * 2);
    ctx.fill();

    // Concentric precision orbital dials
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.20)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 340, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(168, 85, 247, 0.25)';
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    ctx.arc(cx, cy, 270, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Glowing 3D Prism with Rich Iridescent Glass Faces
    const drawHoloPrism = (x, y, size) => {
      ctx.save();

      // Top Face - Luminous Cyan/Emerald Glass
      const topGrad = ctx.createLinearGradient(x - size, y - size, x + size, y);
      topGrad.addColorStop(0.0, 'rgba(6, 182, 212, 0.45)');
      topGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.35)');
      topGrad.addColorStop(1.0, 'rgba(59, 130, 246, 0.50)');

      const topPts = [
        [x, y - size],
        [x + size * 0.866, y - size * 0.5],
        [x, y],
        [x - size * 0.866, y - size * 0.5]
      ];
      ctx.fillStyle = topGrad;
      ctx.beginPath();
      ctx.moveTo(topPts[0][0], topPts[0][1]);
      topPts.forEach(pt => ctx.lineTo(pt[0], pt[1]));
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Left Face - Deep Violet / Ultramarine Glass
      const leftGrad = ctx.createLinearGradient(x - size, y, x, y + size);
      leftGrad.addColorStop(0.0, 'rgba(147, 51, 234, 0.40)');
      leftGrad.addColorStop(1.0, 'rgba(59, 130, 246, 0.25)');

      ctx.fillStyle = leftGrad;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - size * 0.866, y - size * 0.5);
      ctx.lineTo(x - size * 0.866, y + size * 0.5);
      ctx.lineTo(x, y + size);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(168, 85, 247, 0.8)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Right Face - Electric Cyan / Solar Glass
      const rightGrad = ctx.createLinearGradient(x, y, x + size, y + size);
      rightGrad.addColorStop(0.0, 'rgba(59, 130, 246, 0.35)');
      rightGrad.addColorStop(1.0, 'rgba(236, 72, 153, 0.35)');

      ctx.fillStyle = rightGrad;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + size * 0.866, y - size * 0.5);
      ctx.lineTo(x + size * 0.866, y + size * 0.5);
      ctx.lineTo(x, y + size);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(236, 72, 153, 0.8)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Inner refraction beams
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x, y + size);
      ctx.stroke();

      ctx.restore();
    };

    drawHoloPrism(cx, cy, s);

    // Floating data coordinates & tags
    ctx.font = '600 18px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(0, 240, 255, 0.75)';
    ctx.fillText('NODE_SYS: 0x7E3A9 · ACTIVE', cx - 180, cy + 280);

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(168, 85, 247, 0.85)';
    ctx.fillText('CRYPTO_MESH: 128-BIT VERIFIED', cx + 180, cy + 280);
    ctx.textAlign = 'left';

    // Colophon bottom info
    ctx.font = '600 24px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('CURATOR: RAPPU STUDIO', 120, h - 210);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fillText('TECH: THREE.JS · WEBGL · SHADERS · GSAP 3D', 120, h - 160);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('RAPPU / VOLUME 01', w - 120, h - 210);
    ctx.fillStyle = '#00f0ff';
    ctx.fillText('EDITION: № 0001 · PHYSICAL DIGITAL', w - 120, h - 160);

    ctx.restore();
    return canvas;
  }

  // ==========================================
  // PAGE 2: CASE 01 (LEFT) - WEIGHTLESS CLOUD (Vibrant, Alive, High-Contrast)
  // ==========================================
  generatePage2() {
    const canvas = this.createCanvas();
    const ctx = canvas.getContext('2d');
    const w = this.width;
    const h = this.height;

    this.drawPaperBase(ctx, true);
    this.drawFolio(ctx, 2, 8, 'Case 01 / Spatial Cloud Architecture', true);

    ctx.save();

    // Live Operational Status Chip at Top Right
    ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.50)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(w - 470, 160, 350, 42, 21);
    ctx.fill();
    ctx.stroke();

    // Glowing emerald pulse dot
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(w - 440, 181, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = '700 16px "JetBrains Mono", monospace';
    ctx.fillStyle = '#34d399';
    ctx.fillText('CLUSTER ONLINE · 99.999%', w - 420, 187);

    // Bold Headline
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 76px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Weightless', 120, 240);

    const gradText = ctx.createLinearGradient(120, 0, 600, 0);
    gradText.addColorStop(0.0, '#38bdf8');
    gradText.addColorStop(1.0, '#818cf8');
    ctx.fillStyle = gradText;
    ctx.fillText('Cloud Storage', 120, 325);

    // Subhead
    ctx.font = '400 32px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('Next-generation decentralized object store built for', 120, 400);
    ctx.fillText('instantaneous spatial synchronicity across platforms.', 120, 448);

    // ============================================
    // VIBRANT CELESTIAL NODE GRAPHIC
    // ============================================
    const cx = w / 2;
    const cy = 920;

    // Deep cosmic background glow
    const orbAura = ctx.createRadialGradient(cx, cy, 20, cx, cy, 380);
    orbAura.addColorStop(0.00, 'rgba(56, 189, 248, 0.35)');
    orbAura.addColorStop(0.40, 'rgba(99, 102, 241, 0.18)');
    orbAura.addColorStop(0.80, 'rgba(168, 85, 247, 0.05)');
    orbAura.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = orbAura;
    ctx.beginPath();
    ctx.arc(cx, cy, 380, 0, Math.PI * 2);
    ctx.fill();

    // Radiant orbital elliptical paths
    const orbits = [140, 220, 300, 380];
    orbits.forEach((r, idx) => {
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.44, Math.PI / 6 + idx * 0.1, 0, Math.PI * 2);
      ctx.strokeStyle = idx % 2 === 0 ? 'rgba(56, 189, 248, 0.45)' : 'rgba(129, 140, 248, 0.35)';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    });

    // Radiant Core Orb with Multi-Layered Atmosphere
    const coreGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 100);
    coreGrad.addColorStop(0.00, '#ffffff');
    coreGrad.addColorStop(0.25, '#67e8f9');
    coreGrad.addColorStop(0.60, '#3b82f6');
    coreGrad.addColorStop(0.90, '#1e1b4b');
    coreGrad.addColorStop(1.00, 'rgba(30, 27, 75, 0)');
    ctx.fillStyle = coreGrad;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(cx, cy, 100, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Glowing Data Nodes with Badges
    const nodes = [
      { x: cx - 210, y: cy - 75, label: 'Shard 01', latency: '0.12ms', color: '#38bdf8' },
      { x: cx + 230, y: cy + 45, label: 'Consensus', latency: 'BFT-99', color: '#a855f7' },
      { x: cx + 80, y: cy - 145, label: 'Zero-Proof', latency: 'zk-SNARK', color: '#10b981' },
      { x: cx - 140, y: cy + 125, label: 'Edge-Cache', latency: 'Active', color: '#f59e0b' },
    ];

    nodes.forEach(n => {
      // Connecting laser beam to core
      ctx.strokeStyle = n.color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(n.x, n.y);
      ctx.stroke();

      // Node dot with glow
      ctx.shadowColor = n.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = n.color;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Pill Chip Badge
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = n.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(n.x + 14, n.y - 18, 140, 36, 8);
      ctx.fill();
      ctx.stroke();

      ctx.font = '700 15px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(n.label, n.x + 24, n.y + 5);
    });

    // ============================================
    // VIBRANT TELEMETRY STAT CARDS (Glowing Numbers & Cards)
    // ============================================
    const drawStatCard = (label, val, unit, x, y, width, accentColor) => {
      // Frosted Glass Card Base
      const cardGrad = ctx.createLinearGradient(x, y, x, y + 180);
      cardGrad.addColorStop(0.0, 'rgba(30, 41, 59, 0.45)');
      cardGrad.addColorStop(1.0, 'rgba(15, 23, 42, 0.65)');
      ctx.fillStyle = cardGrad;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(x, y, width, 180, 18);
      ctx.fill();
      ctx.stroke();

      // Accent Top Highlight Line
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 24, y);
      ctx.lineTo(x + width - 24, y);
      ctx.stroke();

      // Label
      ctx.font = '600 19px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.60)';
      ctx.fillText(label.toUpperCase(), x + 28, y + 54);

      // Large Glowing Value
      ctx.font = '900 62px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 10;
      ctx.fillText(val, x + 28, y + 134);
      ctx.shadowBlur = 0;

      // Unit
      ctx.font = '700 24px "JetBrains Mono", monospace';
      ctx.fillStyle = accentColor;
      const valW = ctx.measureText(val).width;
      ctx.fillText(unit, x + 38 + valW, y + 134);
    };

    const cardW = (w - 240 - 36) / 2;
    drawStatCard('Peer Latency', '0.14', 'ms', 120, 1400, cardW, '#38bdf8');
    drawStatCard('Availability', '99.999', '%', 120 + cardW + 36, 1400, cardW, '#10b981');
    drawStatCard('Active Shards', '4,096', 'nodes', 120, 1620, cardW, '#f59e0b');
    drawStatCard('Compression', '4.8', 'x', 120 + cardW + 36, 1620, cardW, '#a855f7');

    // Editorial notes at bottom with high contrast
    ctx.font = '500 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fillText('Architecture verified on production stress clusters handling over 2.4 TB/sec', 120, 1920);
    ctx.fillText('with cryptographic attestation and instantaneous state verification.', 120, 1960);

    ctx.restore();
    return canvas;
  }

  // ==========================================
  // PAGE 3: CASE 01 (RIGHT) - ALL BUTTONS YOU LOVE
  // (Identical to Sean's video!)
  // ==========================================
  generatePage3() {
    const canvas = this.createCanvas();
    const ctx = canvas.getContext('2d');
    const w = this.width;
    const h = this.height;

    this.drawPaperBase(ctx, true);
    this.drawFolio(ctx, 3, 8, 'Case 01.2 / Tactile Mechanical Interfaces', true);

    ctx.save();
    // Iconic Headline from reel
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 64px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('All buttons you love', 120, 240);
    ctx.fillText('are now alive', 120, 320);

    ctx.font = '400 28px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fillText('A physical-meets-digital haptic controller bringing high-end tactile', 120, 390);
    ctx.fillText('mechanical key switches to spatial software environments.', 120, 435);

    // Realistic Rendered Keypad Mockup
    const kx = 120;
    const ky = 540;
    const kw = w - 240;
    const kh = 850;

    // Outer keypad chassis
    const chassisGrad = ctx.createLinearGradient(kx, ky, kx + kw, ky + kh);
    chassisGrad.addColorStop(0, '#1c1e24');
    chassisGrad.addColorStop(1, '#0e1014');
    ctx.fillStyle = chassisGrad;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(kx, ky, kw, kh, 32);
    ctx.fill();
    ctx.stroke();

    // Keypad inner recessed tray
    ctx.fillStyle = '#08090c';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(kx + 40, ky + 40, kw - 80, kh - 80, 24);
    ctx.fill();
    ctx.stroke();

    // 4x3 Grid of illuminated mechanical keys
    const rows = 3;
    const cols = 4;
    const gap = 24;
    const keyW = (kw - 80 - 60 - gap * (cols - 1)) / cols;
    const keyH = (kh - 80 - 60 - gap * (rows - 1)) / rows;
    const startX = kx + 40 + 30;
    const startY = ky + 40 + 30;

    const keyLabels = [
      ['01', 'SHIFT', 'CMD', 'OPT'],
      ['ESC', 'TAB', 'ENTER', 'PLAY'],
      ['AUDIO', 'SYNC', 'MUTE', 'LIVE']
    ];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * (keyW + gap);
        const y = startY + r * (keyH + gap);

        // Keycap drop shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.roundRect(x, y + 8, keyW, keyH, 14);
        ctx.fill();

        // Keycap body (subtle bevel)
        const isAccent = (r === 1 && c === 2) || (r === 0 && c === 0);
        const keyGrad = ctx.createLinearGradient(x, y, x, y + keyH);
        if (isAccent) {
          keyGrad.addColorStop(0, '#1d4ed8');
          keyGrad.addColorStop(1, '#1e3a8a');
        } else {
          keyGrad.addColorStop(0, '#262933');
          keyGrad.addColorStop(1, '#171920');
        }
        ctx.fillStyle = keyGrad;
        ctx.strokeStyle = isAccent ? 'rgba(96, 165, 250, 0.6)' : 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, keyW, keyH, 14);
        ctx.fill();
        ctx.stroke();

        // Keycap top plate highlight
        ctx.fillStyle = isAccent ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        ctx.roundRect(x + 6, y + 6, keyW - 12, keyH * 0.45, 8);
        ctx.fill();

        // Key label
        ctx.font = '700 22px "JetBrains Mono", monospace';
        ctx.fillStyle = isAccent ? '#ffffff' : 'rgba(255, 255, 255, 0.85)';
        ctx.textAlign = 'center';
        ctx.fillText(keyLabels[r][c], x + keyW / 2, y + keyH / 2 + 8);
      }
    }
    ctx.textAlign = 'left';

    // Hardware specifications beneath mockup
    const specY = 1520;
    ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('TACTILE SPECIFICATIONS', 120, specY);

    const specs = [
      { k: 'Switch Type', v: 'Custom Linear Gateron with Optical Interrupters' },
      { k: 'Actuation Force', v: '65g Peak / 45g Reset with Progressive Spring' },
      { k: 'Lighting Matrix', v: 'Individual RGB per-switch with Dynamic Haptic Feedback' },
      { k: 'Enclosure Finish', v: 'CNC Machined Anodized Aerospace Aluminum 6061' },
    ];

    specs.forEach((s, idx) => {
      const y = specY + 60 + idx * 65;
      ctx.font = '500 22px "JetBrains Mono", monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(s.k, 120, y);

      ctx.font = '400 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(s.v, 440, y);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(120, y + 20);
      ctx.lineTo(w - 120, y + 20);
      ctx.stroke();
    });

    ctx.restore();
    return canvas;
  }

  // Redraw single keycap on canvas for interactive pressed/hover states
  renderKeycap(canvas, row, col, isPressed = false) {
    const ctx = canvas.getContext('2d');
    const w = this.width;
    const kw = w - 240;
    const kh = 850;
    const kx = 120;
    const ky = 540;

    const rows = 3;
    const cols = 4;
    const gap = 24;
    const keyW = (kw - 80 - 60 - gap * (cols - 1)) / cols;
    const keyH = (kh - 80 - 60 - gap * (rows - 1)) / rows;
    const startX = kx + 40 + 30;
    const startY = ky + 40 + 30;

    const keyLabels = [
      ['01', 'SHIFT', 'CMD', 'OPT'],
      ['ESC', 'TAB', 'ENTER', 'PLAY'],
      ['AUDIO', 'SYNC', 'MUTE', 'LIVE']
    ];

    const x = startX + col * (keyW + gap);
    const y = startY + row * (keyH + gap);
    const isAccent = (row === 1 && col === 2) || (row === 0 && col === 0);

    ctx.save();
    // Clear key area
    ctx.fillStyle = '#08090c';
    ctx.fillRect(x - 6, y - 6, keyW + 12, keyH + 20);

    // Keycap drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.roundRect(x, y + 8, keyW, keyH, 14);
    ctx.fill();

    // Keycap body
    const keyGrad = ctx.createLinearGradient(x, y, x, y + keyH);
    if (isPressed) {
      keyGrad.addColorStop(0, '#38bdf8');
      keyGrad.addColorStop(1, '#0284c7');
    } else if (isAccent) {
      keyGrad.addColorStop(0, '#1d4ed8');
      keyGrad.addColorStop(1, '#1e3a8a');
    } else {
      keyGrad.addColorStop(0, '#262933');
      keyGrad.addColorStop(1, '#171920');
    }
    ctx.fillStyle = keyGrad;
    ctx.strokeStyle = isPressed ? '#ffffff' : (isAccent ? 'rgba(96, 165, 250, 0.6)' : 'rgba(255, 255, 255, 0.12)');
    ctx.lineWidth = isPressed ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.roundRect(x, isPressed ? y + 4 : y, keyW, keyH, 14);
    ctx.fill();
    ctx.stroke();

    // Top plate highlight
    ctx.fillStyle = isPressed ? 'rgba(255, 255, 255, 0.3)' : (isAccent ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)');
    ctx.beginPath();
    ctx.roundRect(x + 6, (isPressed ? y + 4 : y) + 6, keyW - 12, keyH * 0.45, 8);
    ctx.fill();

    // Label
    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.fillStyle = isPressed ? '#000000' : (isAccent ? '#ffffff' : 'rgba(255, 255, 255, 0.85)');
    ctx.textAlign = 'center';
    ctx.fillText(keyLabels[row][col], x + keyW / 2, (isPressed ? y + 4 : y) + keyH / 2 + 8);
    ctx.restore();
  }

  // ==========================================
  // PAGE 4: CASE 02 (LEFT) - NEURAL CANVAS
  // ==========================================
  generatePage4() {
    const canvas = this.createCanvas();
    const ctx = canvas.getContext('2d');
    const w = this.width;
    const h = this.height;

    this.drawPaperBase(ctx, true);
    this.drawFolio(ctx, 4, 8, 'Case 02 / Generative UI & AI Canvas', true);

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 68px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Neural Canvas', 120, 240);
    ctx.fillText('Engine', 120, 320);

    ctx.font = '400 30px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fillText('Real-time generative workspace bridging multimodal', 120, 390);
    ctx.fillText('reasoning models with infinite vector spatial infinite canvases.', 120, 435);

    // Intricate generative curve illustration
    const cx = w / 2;
    const cy = 900;
    ctx.lineWidth = 2;

    for (let k = 0; k < 18; k++) {
      ctx.beginPath();
      const alpha = 0.15 + (k / 18) * 0.45;
      ctx.strokeStyle = `rgba(168, 85, 247, ${alpha})`;
      for (let theta = 0; theta < Math.PI * 2; theta += 0.08) {
        const rad = 280 + Math.sin(theta * 5 + k * 0.3) * 60 + Math.cos(theta * 3) * 30;
        const px = cx + Math.cos(theta) * rad;
        const py = cy + Math.sin(theta) * rad * 0.6;
        if (theta === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Glowing anchor tokens
    const nodeData = [
      { title: 'PROMPT LATENT NODE', code: 'vec4(0.82, 0.14, 0.95, 1.0)', x: 120, y: 1350 },
      { title: 'ATTENTION DISPERSION', code: 'AttentionWeights[Head_12]', x: 120, y: 1520 },
      { title: 'DIFFUSION INTERPOLATOR', code: 'lerp(State_A, State_B, t)', x: 120, y: 1690 }
    ];

    nodeData.forEach(n => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(n.x, n.y, w - 240, 130, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#c084fc';
      ctx.font = '700 22px "JetBrains Mono", monospace';
      ctx.fillText(n.title, n.x + 35, n.y + 50);

      ctx.fillStyle = '#ffffff';
      ctx.font = '500 26px "JetBrains Mono", monospace';
      ctx.fillText(n.code, n.x + 35, n.y + 95);
    });

    ctx.font = '400 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('Integrated in production workflows for over 18,000 professional designers.', 120, 1940);

    ctx.restore();
    return canvas;
  }

  // ==========================================
  // PAGE 5: CASE 02 (RIGHT) - SPATIAL VISION OS
  // ==========================================
  generatePage5() {
    const canvas = this.createCanvas();
    const ctx = canvas.getContext('2d');
    const w = this.width;
    const h = this.height;

    this.drawPaperBase(ctx, true);
    this.drawFolio(ctx, 5, 8, 'Case 02.2 / Spatial Computing & VisionOS', true);

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 68px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Spatial Vision OS', 120, 240);
    ctx.fillText('Design System', 120, 320);

    ctx.font = '400 30px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fillText('Volumetric user experience guidelines built for Apple Vision Pro,', 120, 390);
    ctx.fillText('introducing glassmorphism tokens, gaze tracking, and gesture physics.', 120, 435);

    // Floating Glassmorphic 3D Layer Mockup
    const drawGlassCard = (x, y, cw, ch, depth, title, subtitle) => {
      ctx.save();
      // Cast shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.roundRect(x + depth * 5, y + depth * 10, cw, ch, 24);
      ctx.fill();

      // Frosted Glass body
      const glassGrad = ctx.createLinearGradient(x, y, x + cw, y + ch);
      glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
      glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0.03)');
      ctx.fillStyle = glassGrad;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y, cw, ch, 24);
      ctx.fill();
      ctx.stroke();

      // Top specular rim
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 24, y);
      ctx.lineTo(x + cw - 24, y);
      ctx.stroke();

      // Content
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 28px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(title, x + 40, y + 65);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '400 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(subtitle, x + 40, y + 110);

      ctx.restore();
    };

    drawGlassCard(160, 560, w - 320, 240, 1, 'LAYER 01: FOCUSED GAZE ORBIT', 'Dynamic depth elevation triggers upon eye saccade fixation (240ms).');
    drawGlassCard(220, 860, w - 320, 240, 2, 'LAYER 02: PINCH MICRO-GESTURE', 'Sub-millimeter thumb-index pinch detection with tactile sonic haptics.');
    drawGlassCard(280, 1160, w - 320, 240, 3, 'LAYER 03: VOLUMETRIC PASSTHROUGH', 'Real-world room illumination baking and ambient occlusion ground shadows.');

    // Principle Pills
    const drawPill = (text, px, py) => {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 1.5;
      const pillW = ctx.measureText(text).width + 50;
      ctx.beginPath();
      ctx.roundRect(px, py, pillW, 56, 28);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#93c5fd';
      ctx.font = '600 20px "JetBrains Mono", monospace';
      ctx.fillText(text, px + 25, py + 36);
      return pillW;
    };

    let curX = 120;
    const curY = 1560;
    curX += drawPill('EYE TRACKING', curX, curY) + 20;
    curX += drawPill('6-DOF SPATIAL', curX, curY) + 20;
    curX += drawPill('REALITYKIT', curX, curY) + 20;

    // Editorial Specs
    ctx.font = '500 24px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillText('ADAPTIVE DYNAMIC RANGE: 10,000 NITS', 120, 1720);
    ctx.fillText('REFRESH RATE: 90HZ / 120HZ VOLUMETRIC MOTION', 120, 1770);
    ctx.fillText('SPATIAL AUDIO CO-ORDINATE RIG: 7.1.4 DOLBY ATMOS', 120, 1820);

    ctx.restore();
    return canvas;
  }

  // ==========================================
  // PAGE 6: CASE 03 (LEFT) - MONOLITH DESIGN SYSTEM
  // ==========================================
  generatePage6() {
    const canvas = this.createCanvas();
    const ctx = canvas.getContext('2d');
    const w = this.width;
    const h = this.height;

    this.drawPaperBase(ctx, true);
    this.drawFolio(ctx, 6, 8, 'Case 03 / Typographic Architecture', true);

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 68px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Monolith Design', 120, 240);
    ctx.fillText('Architecture', 120, 320);

    ctx.font = '400 30px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fillText('Mathematical proportions, optical typographic balance,', 120, 390);
    ctx.fillText('and ergonomic design tokens for high-velocity software suites.', 120, 435);

    // Color Token Palette Swatches
    ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('CORE CHROMATIC SCALE', 120, 540);

    const swatches = [
      { hex: '#0A0A0C', label: 'Obsidian', text: '#fff' },
      { hex: '#16161A', label: 'Carbon', text: '#fff' },
      { hex: '#262833', label: 'Slate 800', text: '#fff' },
      { hex: '#3B82F6', label: 'Electric Blue', text: '#fff' },
      { hex: '#F8FAFC', label: 'Optical White', text: '#000' },
    ];

    const swatchW = (w - 240 - 24 * 4) / 5;
    swatches.forEach((s, i) => {
      const sx = 120 + i * (swatchW + 24);
      const sy = 580;

      ctx.fillStyle = s.hex;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(sx, sy, swatchW, 160, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = s.text;
      ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(s.label, sx + 18, sy + 115);

      ctx.font = '500 16px "JetBrains Mono", monospace';
      ctx.fillText(s.hex, sx + 18, sy + 140);
    });

    // Typographic Specimen Grid
    const typeY = 820;
    ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('MODULAR TYPE HIERARCHY', 120, typeY);

    const typeRows = [
      { tag: 'DISPLAY 01', size: '104px', font: '800 64px "Plus Jakarta Sans"', text: 'Pure Form' },
      { tag: 'HEADLINE', size: '48px', font: '700 42px "Plus Jakarta Sans"', text: 'Engineered Precision' },
      { tag: 'SUBHEAD', size: '28px', font: '600 28px "Plus Jakarta Sans"', text: 'Mathematical harmonic scales' },
      { tag: 'BODY MONO', size: '20px', font: '400 20px "JetBrains Mono"', text: 'const ratio = 1.618033988749895;' },
    ];

    typeRows.forEach((r, idx) => {
      const rowY = typeY + 60 + idx * 120;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(120, rowY, w - 240, 100, 14);
      ctx.fill();
      ctx.stroke();

      ctx.font = '600 18px "JetBrains Mono", monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`${r.tag} — ${r.size}`, 150, rowY + 38);

      ctx.font = r.font;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(r.text, 150, rowY + 78);
    });

    // Spacing scale
    const spaceY = 1420;
    ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SPATIAL HARMONIC RHYTHM', 120, spaceY);

    const spaces = [4, 8, 16, 24, 32, 48, 64, 96];
    spaces.forEach((sp, idx) => {
      const bx = 120 + idx * 170;
      const by = spaceY + 50;
      ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bx, by, 140, 80, 10);
      ctx.fill();
      ctx.stroke();

      ctx.font = '700 24px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${sp}px`, bx + 24, by + 48);
    });

    ctx.restore();
    return canvas;
  }

  // ==========================================
  // PAGE 7: AWARDS & SELECT CLIENTS
  // ==========================================
  generatePage7() {
    const canvas = this.createCanvas();
    const ctx = canvas.getContext('2d');
    const w = this.width;
    const h = this.height;

    this.drawPaperBase(ctx, true);
    this.drawFolio(ctx, 7, 8, 'Studio Track Record / Recognition', true);

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 68px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Proven Impact', 120, 240);
    ctx.fillText('& Recognition', 120, 320);

    ctx.font = '400 30px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fillText('Award-winning craftsmanship recognized globally across', 120, 390);
    ctx.fillText('design engineering, interactive WebGL, and spatial computing.', 120, 435);

    // Recognition table
    const accolades = [
      { org: 'AWWWARDS', prize: 'Site of the Year Nominee 2025', count: '12x SOTD' },
      { org: 'FWA OF THE DAY', prize: 'Cutting Edge Web Experience', count: '8x FWA' },
      { org: 'RED DOT AWARD', prize: 'Best of the Best: Interface Design', count: 'Grand Prix' },
      { org: 'APPLE DESIGN', prize: 'Spatial Computing Finalist', count: 'VisionOS' },
    ];

    let startY = 540;
    accolades.forEach((a) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(120, startY, w - 240, 110, 16);
      ctx.fill();
      ctx.stroke();

      ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(a.org, 160, startY + 65);

      ctx.font = '400 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(a.prize, 480, startY + 65);

      ctx.font = '700 22px "JetBrains Mono", monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'right';
      ctx.fillText(a.count, w - 160, startY + 65);
      ctx.textAlign = 'left';

      startY += 140;
    });

    // Client Logos / Partners Grid
    startY += 40;
    ctx.font = '700 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('COLLABORATORS & SELECT CLIENTS', 120, startY);

    const partners = ['VERCEL', 'LINEAR', 'SOLANA', 'HUMANE', 'TEENAGE ENG.', 'STRIPE'];
    const pCols = 3;
    const pW = (w - 240 - 40) / pCols;
    const pH = 110;

    partners.forEach((p, idx) => {
      const col = idx % pCols;
      const row = Math.floor(idx / pCols);
      const px = 120 + col * (pW + 20);
      const py = startY + 40 + row * (pH + 20);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(px, py, pW, pH, 14);
      ctx.fill();
      ctx.stroke();

      ctx.font = '700 26px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.textAlign = 'center';
      ctx.fillText(p, px + pW / 2, py + pH / 2 + 9);
      ctx.textAlign = 'left';
    });

    ctx.restore();
    return canvas;
  }

  // ==========================================
  // PAGE 8: BACK COVER / COLOPHON & CONTACT
  // ==========================================
  generatePage8() {
    const canvas = this.createCanvas();
    const ctx = canvas.getContext('2d');
    const w = this.width;
    const h = this.height;

    this.drawPaperBase(ctx, true);

    ctx.save();
    // Colophon title
    ctx.font = '500 24px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillText('COLOPHON & STUDIO COMMISSIONS', 120, 180);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 80px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Let’s build', 120, 320);
    ctx.fillText('something', 120, 420);
    ctx.fillText('extraordinary.', 120, 520);

    ctx.font = '400 32px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('Currently taking on select spatial, brand, and design engineering', 120, 620);
    ctx.fillText('partnerships for Q2—Q4 2026.', 120, 670);

    // Big interactive contact badge
    const bx = 120;
    const by = 780;
    const bw = w - 240;
    const bh = 220;

    ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 24);
    ctx.fill();
    ctx.stroke();

    ctx.font = '600 24px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('PRIMARY INQUIRIES', bx + 50, by + 70);

    ctx.font = '700 52px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('hello@rappu.io', bx + 50, by + 145);

    // Studio details
    const detY = 1120;
    ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('STUDIO LOCATIONS', 120, detY);

    ctx.font = '400 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fillText('Berlin · Mitte District', 120, detY + 50);
    ctx.fillText('San Francisco · Mission District', 120, detY + 95);
    ctx.fillText('Tokyo · Shibuya Ward', 120, detY + 140);

    ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('ONLINE PRESENCE', 680, detY);

    ctx.font = '400 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fillText('Web: rappu.io', 680, detY + 50);
    ctx.fillText('X: @rappu', 680, detY + 95);
    ctx.fillText('IG: @rappu', 680, detY + 140);

    // Debossed bottom seal
    ctx.textAlign = 'center';
    ctx.font = '800 36px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillText('RAPPU ARCHIVE — MMXXVI', w / 2, h - 180);

    ctx.font = '500 20px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillText('ALL RIGHTS RESERVED · CRAFTED WITH THREE.JS & GSAP', w / 2, h - 130);

    ctx.restore();
    return canvas;
  }

  // Generate and return array of all 8 canvas textures
  generateAll() {
    console.log('Generating ultra-res book page textures...');
    return [
      this.generatePage1(),
      this.generatePage2(),
      this.generatePage3(),
      this.generatePage4(),
      this.generatePage5(),
      this.generatePage6(),
      this.generatePage7(),
      this.generatePage8(),
    ];
  }
}

window.PageTextureGenerator = PageTextureGenerator;
