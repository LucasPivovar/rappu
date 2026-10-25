/**
 * rappu — Orquestrador principal
 * Cena Three.js, câmera que enquadra o livro automaticamente, abertura da capa,
 * raycasting em UV para interagir com as landing pages vivas de cada página.
 */

const DEG = Math.PI / 180;

class App {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.loadingOverlay = document.getElementById('loading-overlay');
    this.pageCounter = document.getElementById('page-counter');
    this.btnPrev = document.getElementById('btn-prev');
    this.btnNext = document.getElementById('btn-next');
    this.btnZoom = document.getElementById('btn-zoom');
    this.btnClose = document.getElementById('btn-close');
    this.btnSound = document.getElementById('btn-sound');
    this.hintClosed = document.getElementById('hint-closed');
    this.dock = document.getElementById('dock');
    this.dotsEl = document.getElementById('page-dots');

    this.fov = 34;
    this.view = 'closed';
    this.rig = { tx: 0, tz: 0, dist: 14, elev: 58 * DEG, azim: 0 };

    this.mouse = new THREE.Vector2();
    this.targetMouse = new THREE.Vector2(0, 0);
    this.pointerOnCanvas = false;
    this.raycaster = new THREE.Raycaster();
    this.activePage = null;
    this.visiblePages = new Set();
    this.lastHit = null;

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x030406);
    this.scene.fog = new THREE.FogExp2(0x030406, 0.03);

    this.camera = new THREE.PerspectiveCamera(this.fov, window.innerWidth / window.innerHeight, 0.1, 100);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', stencil: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.studio = new StudioEnvironment(this.scene, this.renderer);
    // Foco de luz no livro, ambiente um pouco mais escuro
    if (this.studio.bookFill) {
      this.studio.bookFill.intensity = 0.9;
      this.studio.bookFill.angle = Math.PI / 3.6;
    }
    if (this.studio.ambientLight) this.studio.ambientLight.intensity = 0.32;

    // Páginas vivas
    const bp = createBookPages();
    this.pages = bp.pages;
    this.cover = bp.cover;
    this.pageSize = bp.size;
    this.pages.forEach((p) => {
      p.onNavigate = (n) => this.goToPage(n);
      p.frame(1 / 60);
    });
    this.cover.frame(1 / 60);

    this.book = new Book3D(this.scene, this.pages.map((p) => p.canvas), this.cover.canvas);
    this.texToPage = new Map(this.book.pageThreeTextures.map((t, i) => [t, this.pages[i]]));

    this.buildDots();
    this.setupEvents();
    this.setView('closed', true);
    this.updateUI();

    const hideLoader = () => this.loadingOverlay && this.loadingOverlay.classList.add('hidden');
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        this.pages.forEach((p) => {
          if ('letters' in p) p.letters = null; // re-mede tipografia com a fonte real
        });
        hideLoader();
      });
      setTimeout(hideLoader, 2500);
    } else {
      setTimeout(hideLoader, 400);
    }

    this.clock = new THREE.Clock();
    this.animate();
  }

  // ---------------------------------------------------------------------------
  // Câmera
  // ---------------------------------------------------------------------------
  fitDistance(W, D, elev) {
    const tanV = Math.tan((this.fov * DEG) / 2);
    const aspect = window.innerWidth / window.innerHeight;
    const uiFrac = Math.min(0.32, 190 / window.innerHeight);
    const dH = (D * Math.sin(elev)) / 2 / (tanV * (1 - uiFrac));
    const dW = W / 2 / (tanV * aspect * 0.94);
    return Math.max(dH, dW) * 1.04;
  }

  computeView(name) {
    const b = this.book;
    const cw = b.pageW + b.coverOverhang;
    let v;
    switch (name) {
      case 'closed':
        v = { tx: 0, tz: 0.1, W: cw + 1.4, D: b.pageH + 1.2, elev: 60 * DEG, azim: -7 * DEG };
        break;
      case 'left':
      case 'right':
        // Lupa: a página ocupa a largura; mover o mouse para cima/baixo percorre a página
        v = { tx: (name === 'left' ? -1 : 1) * b.pageW / 2, tz: 0, W: b.pageW + 0.3, D: b.pageH * 0.6, elev: 86 * DEG, azim: 0 };
        break;
      default:
        v = { tx: 0, tz: 0.05, W: cw * 2 + 0.5, D: b.pageH + 0.5, elev: 74 * DEG, azim: 0 };
    }
    v.dist = this.fitDistance(v.W, v.D, v.elev);
    // quanto da página fica fora do quadro (para o pan vertical da lupa)
    const tanV = Math.tan((this.fov * DEG) / 2);
    const visibleD = (2 * v.dist * tanV * (1 - Math.min(0.32, 190 / window.innerHeight))) / Math.sin(v.elev);
    v.range = Math.max(0, (b.pageH + 0.3 - visibleD) / 2);
    return v;
  }

  setView(name, instant = false) {
    this.view = name;
    const v = this.computeView(name);
    this.zoomRange = name === 'left' || name === 'right' ? v.range : 0;
    const target = { tx: v.tx, tz: v.tz, dist: v.dist, elev: v.elev, azim: v.azim };
    if (instant) Object.assign(this.rig, target);
    else gsap.to(this.rig, { ...target, duration: 1.3, ease: 'power3.inOut', overwrite: true });
    document.body.dataset.view = name;
    this.updateUI();
  }

  // ---------------------------------------------------------------------------
  // Eventos
  // ---------------------------------------------------------------------------
  setupEvents() {
    window.addEventListener('resize', () => this.onResize());
    const canvas = this.renderer.domElement;

    const setMouse = (e) => {
      this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('pointermove', (e) => {
      setMouse(e);
      this.pointerOnCanvas = e.target === canvas;
    });
    canvas.addEventListener('pointerleave', () => (this.pointerOnCanvas = false));

    canvas.addEventListener('pointerdown', (e) => {
      setMouse(e);
      this.pointerOnCanvas = true;
      this.downX = e.clientX;
      this.downType = e.pointerType;
      if (window.paperAudio) window.paperAudio.ensureRunning();

      if (!this.book.isOpen) {
        if (this.pickClosed()) this.openBook();
        return;
      }
      if (this.book.isFlipping || this.book.coverAnimating) return;
      const hit = this.pickPage();
      if (!hit) return;
      if (hit.page.pointerDown(hit.x, hit.y)) {
        this.activePage = hit.page;
        canvas.setPointerCapture(e.pointerId);
        return;
      }
      if (hit.flipZone) {
        if (hit.side === 'right') this.next();
        else this.prev();
      }
    });

    window.addEventListener('pointerup', (e) => {
      if (this.activePage) {
        this.activePage.pointerUp();
        this.activePage = null;
        return;
      }
      if (this.downType === 'touch' && this.book.isOpen && this.downX !== undefined) {
        const dx = e.clientX - this.downX;
        if (dx < -60) this.next();
        else if (dx > 60) this.prev();
      }
      this.downX = undefined;
    });

    canvas.addEventListener('dblclick', () => {
      if (!this.book.isOpen) return;
      const hit = this.pickPage();
      if (!hit || hit.page.isHot) return;
      if (this.view === 'open') this.setView(hit.side);
      else this.setView('open');
    });

    let wheelLock = false;
    window.addEventListener(
      'wheel',
      (e) => {
        if (wheelLock || Math.abs(e.deltaY) < 25) return;
        wheelLock = true;
        setTimeout(() => (wheelLock = false), 600);
        if (!this.book.isOpen) {
          if (e.deltaY > 0) this.openBook();
          return;
        }
        if (e.deltaY > 0) this.next();
        else this.prev();
      },
      { passive: true }
    );

    window.addEventListener('keydown', (e) => {
      if (!this.book.isOpen) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
          e.preventDefault();
          this.openBook();
        }
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') this.next();
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') this.prev();
      else if (e.key === 'Escape') {
        if (this.view !== 'open') this.setView('open');
        else this.closeBook();
      } else if (e.key === 'z' || e.key === 'Z') this.cycleZoom();
    });

    this.btnNext && this.btnNext.addEventListener('click', () => this.next());
    this.btnPrev && this.btnPrev.addEventListener('click', () => this.prev());
    this.btnZoom && this.btnZoom.addEventListener('click', () => this.cycleZoom());
    this.btnClose && this.btnClose.addEventListener('click', () => this.closeBook());
    this.hintClosed && this.hintClosed.addEventListener('click', () => this.openBook());
    this.btnSound &&
      this.btnSound.addEventListener('click', () => {
        if (window.paperAudio) {
          const active = window.paperAudio.toggle();
          this.btnSound.classList.toggle('muted', !active);
        }
      });
  }

  buildDots() {
    if (!this.dotsEl) return;
    const n = this.book.totalPages / 2;
    for (let i = 0; i < n; i++) {
      const b = document.createElement('button');
      b.className = 'dot-btn';
      b.setAttribute('aria-label', `Ir para páginas ${i * 2 + 1}-${i * 2 + 2}`);
      b.addEventListener('click', () => this.goToSpread(i));
      this.dotsEl.appendChild(b);
    }
  }

  // ---------------------------------------------------------------------------
  // Ações
  // ---------------------------------------------------------------------------
  openBook() {
    if (this.book.isOpen || this.book.coverAnimating) return;
    this.wantOpen = true;
    this.book.open(() => this.updateUI());
    // Em telas verticais (celular) abre direto na página da esquerda, em modo lupa
    this.setView(window.innerWidth / window.innerHeight < 0.85 ? 'left' : 'open');
    this.updateUI();
  }

  closeBook() {
    if (!this.book.isOpen) return;
    this.wantOpen = false;
    this.book.close(() => this.updateUI());
    setTimeout(() => this.setView('closed'), this.book.currentSpread !== 0 ? 500 : 0);
    this.updateUI();
  }

  next() {
    if (!this.book.isOpen) return this.openBook();
    const last = this.book.currentSpread >= this.book.totalPages / 2 - 1;
    if (this.view === 'left') return this.setView('right');
    if (this.view === 'right' && !last) this.setView('left');
    this.book.flipNext(() => this.updateUI());
  }

  prev() {
    if (!this.book.isOpen) return;
    if (this.view === 'right') return this.setView('left');
    if (this.view === 'left' && this.book.currentSpread > 0) this.setView('right');
    this.book.flipPrev(() => this.updateUI());
  }

  cycleZoom() {
    if (!this.book.isOpen) return;
    const order = { open: 'left', left: 'right', right: 'open' };
    this.setView(order[this.view] || 'open');
  }

  goToSpread(i) {
    if (!this.book.isOpen) return;
    if (i === this.book.currentSpread || this.book.isFlipping) return;
    this.book.goToSpread(i, () => this.updateUI());
  }

  goToPage(n) {
    const spread = Math.floor((n - 1) / 2);
    if (this.view !== 'open') this.setView(n % 2 === 1 ? 'left' : 'right');
    this.goToSpread(spread);
  }

  updateUI() {
    if (!this.book) return;
    document.body.classList.toggle('is-open', !!this.wantOpen);
    const spread = this.book.currentSpread;
    const total = this.book.totalPages;
    if (this.pageCounter) {
      this.pageCounter.innerHTML = `<span class="current">${String(spread * 2 + 1).padStart(2, '0')}–${String(spread * 2 + 2).padStart(2, '0')}</span> <span class="total">/ ${String(total).padStart(2, '0')}</span>`;
    }
    if (this.btnPrev) this.btnPrev.disabled = spread === 0 && this.view !== 'right';
    if (this.btnNext) this.btnNext.disabled = spread >= total / 2 - 1 && this.view !== 'left';
    if (this.dotsEl) [...this.dotsEl.children].forEach((d, i) => d.classList.toggle('active', i === spread));
    if (this.btnZoom) this.btnZoom.classList.toggle('active', this.view === 'left' || this.view === 'right');
  }

  // ---------------------------------------------------------------------------
  // Raycasting
  // ---------------------------------------------------------------------------
  pickClosed() {
    if (!this.pointerOnCanvas) return false;
    this.raycaster.setFromCamera(this.targetMouse, this.camera);
    const b = this.book;
    return this.raycaster.intersectObjects([b.leftCover, b.leftBlock, b.rightBlock, b.rightCover, b.closedSpine]).length > 0;
  }

  pickPage() {
    if (!this.pointerOnCanvas) return null;
    this.raycaster.setFromCamera(this.targetMouse, this.camera);
    const b = this.book;
    const hits = this.raycaster.intersectObjects([b.leftBlock, b.rightBlock]);
    const hit = hits.find((h) => h.face && h.face.materialIndex === 4);
    if (!hit) return null;
    const side = hit.object === b.leftBlock ? 'left' : 'right';
    const idx = b.currentSpread * 2 + (side === 'left' ? 0 : 1);
    const x = hit.uv.x * this.pageSize.w;
    const y = (1 - hit.uv.y) * this.pageSize.h;
    const edge = this.pageSize.w * 0.07;
    const flipZone = side === 'right' ? x > this.pageSize.w - edge : x < edge;
    return { page: this.pages[idx], side, x, y, flipZone };
  }

  // ---------------------------------------------------------------------------
  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    const v = this.computeView(this.view);
    gsap.killTweensOf(this.rig);
    Object.assign(this.rig, { tx: v.tx, tz: v.tz, dist: v.dist, elev: v.elev, azim: v.azim });
    this.zoomRange = this.view === 'left' || this.view === 'right' ? v.range : 0;
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.elapsedTime;

    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05;
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05;

    // câmera orbital com parallax sutil
    const zoomed = this.view === 'left' || this.view === 'right';
    const ps = zoomed ? 0.25 : this.book.isOpen ? 0.6 : 1.4;
    const elev = this.rig.elev + this.mouse.y * 0.02 * ps;
    const azim = this.rig.azim + this.mouse.x * 0.035 * ps;
    const r = this.rig.dist;
    const panTarget = zoomed ? THREE.MathUtils.clamp(-this.targetMouse.y * 1.25, -1, 1) * (this.zoomRange || 0) : 0;
    this.pan = (this.pan || 0) + (panTarget - (this.pan || 0)) * (1 - Math.exp(-4 * dt));
    const tz = this.rig.tz + this.pan;
    this.camera.position.set(
      this.rig.tx + r * Math.cos(elev) * Math.sin(azim),
      r * Math.sin(elev),
      tz + r * Math.cos(elev) * Math.cos(azim)
    );
    this.camera.lookAt(this.rig.tx, 0, tz);
    this.scene.fog.density = 0.36 / Math.max(8, r);
    this.camera.updateMatrixWorld();

    // interação
    let cursor = 'default';
    const b = this.book;
    let hoveredPage = null;
    if (!b.isOpen) {
      const over = !b.coverAnimating && this.pickClosed();
      if (over !== this.coverHover) {
        this.coverHover = over;
        b.setCoverTease(over ? 1 : 0);
      }
      if (over) cursor = 'pointer';
    } else if (!b.isFlipping && !b.coverAnimating) {
      const hit = this.pickPage();
      if (hit) {
        hoveredPage = hit.page;
        hit.page.setPointer(hit.x, hit.y, true);
        if (hit.page.isHot || hit.page.dragId) cursor = 'pointer';
        else if (hit.flipZone) cursor = hit.side === 'right' ? 'e-resize' : 'w-resize';
      }
    }
    if (this.activePage && this.activePage !== hoveredPage) hoveredPage = this.activePage;
    this.pages.forEach((p) => {
      if (p !== hoveredPage) p.setPointer(0, 0, false);
    });
    if (this.activePage) cursor = 'grabbing';
    if (this.renderer.domElement.style.cursor !== cursor) this.renderer.domElement.style.cursor = cursor;

    // anima somente as páginas visíveis
    const visTex = b.getVisibleTextures();
    const nowVisible = new Set();
    visTex.forEach((tex) => {
      const page = this.texToPage.get(tex);
      if (!page) return;
      nowVisible.add(page);
      if (!this.visiblePages.has(page)) page.onShow();
      page.frame(dt);
      tex.needsUpdate = true;
    });
    this.visiblePages = nowVisible;

    if (!b.isOpen || b.coverAnimating) {
      this.cover.hoverAmt += ((this.coverHover ? 1 : 0) - this.cover.hoverAmt) * 0.1;
      this.cover.frame(dt);
      b.coverTexture.needsUpdate = true;
    }

    if (this.studio && this.studio.update) this.studio.update(time);
    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
