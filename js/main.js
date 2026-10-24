/**
 * Main WebGL Application & In-Page Interactive Landing Page Orchestrator
 * Integrates Three.js Scene, Studio Lighting, Dynamic Canvas UV Raycasting,
 * Interactive Mechanical Keypad, and Camera Parallax.
 */

class App {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.loadingOverlay = document.getElementById('loading-overlay');
    this.pageCounter = document.getElementById('page-counter');
    this.btnPrev = document.getElementById('btn-prev');
    this.btnNext = document.getElementById('btn-next');
    this.btnSound = document.getElementById('btn-sound');
    this.cursorHint = document.getElementById('cursor-hint');

    // Camera preset coordinates & Dynamic Journal Hover Zoom
    this.cameraPresets = {
      studio: { x: 0, y: 10.3, z: 7.3, lookY: -0.2, fov: 37 },
      focus: { x: 0, y: 8.5, z: 5.0, lookY: 0.05, fov: 35 },
    };
    this.cameraState = {
      baseX: 0,
      baseY: 10.3,
      baseZ: 7.3,
      lookX: 0,
      lookY: -0.2,
      lookZ: 0,
      isFocused: false,
    };
    this.currentView = 'studio';

    // Mouse Parallax & Raycasting
    this.mouse = new THREE.Vector2();
    this.targetMouse = new THREE.Vector2();
    this.mouseMoved = false;
    this.raycaster = new THREE.Raycaster();
    this.hoverState = null;
    this.activeKeyHover = null; // [row, col] on Page 3 keypad

    this.init();
  }

  async init() {
    // 1. Setup Three.js Scene & Renderer (Cinematic Moody Dark Atmosphere)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x030406);
    this.scene.fog = new THREE.FogExp2(0x030406, 0.030);

    this.camera = new THREE.PerspectiveCamera(
      this.cameraPresets.studio.fov,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    const startPreset = this.cameraPresets.studio;
    this.camera.position.set(startPreset.x, startPreset.y, startPreset.z);
    this.camera.lookAt(0, startPreset.lookY, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 2. Build Studio Desk & Lighting
    this.studio = new StudioEnvironment(this.scene, this.renderer);

    // 3. Render High-Res 2D Canvases
    this.textureGen = new PageTextureGenerator();
    this.pageCanvases = this.textureGen.generateAll();

    // 4. Construct 3D Book
    this.book = new Book3D(this.scene, this.pageCanvases);

    // 5. Setup Event Listeners
    this.setupEvents();
    this.updateUI();

    // 6. Dismiss Loading Screen
    setTimeout(() => {
      if (this.loadingOverlay) {
        this.loadingOverlay.classList.add('hidden');
      }
    }, 500);

    // 7. Start Render Loop
    this.animate();
  }

  setupEvents() {
    window.addEventListener('resize', () => this.onResize());

    // Mouse movement for tactile camera parallax & in-page UI hover tracking (throttled to render loop)
    window.addEventListener('mousemove', (e) => {
      this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.mouseMoved = true;
    });

    // Click on book pages or in-page interactive landing page components
    this.renderer.domElement.addEventListener('click', (e) => {
      this.handleInPageClick(e);
    });

    // Mouse wheel / trackpad scroll for fluid page flips
    let wheelCooldown = false;
    window.addEventListener('wheel', (e) => {
      if (wheelCooldown || this.book.isFlipping) return;
      if (Math.abs(e.deltaY) > 25) {
        wheelCooldown = true;
        if (e.deltaY > 0) {
          this.book.flipNext((newSpread) => this.updateUI());
        } else {
          this.book.flipPrev((newSpread) => this.updateUI());
        }
        setTimeout(() => { wheelCooldown = false; }, 550);
      }
    }, { passive: true });

    // Navigation UI Buttons
    if (this.btnNext) {
      this.btnNext.addEventListener('click', () => {
        this.book.flipNext((newSpread) => this.updateUI());
      });
    }
    if (this.btnPrev) {
      this.btnPrev.addEventListener('click', () => {
        this.book.flipPrev((newSpread) => this.updateUI());
      });
    }

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        this.book.flipNext((newSpread) => this.updateUI());
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        this.book.flipPrev((newSpread) => this.updateUI());
      }
    });

    // Sound toggle
    if (this.btnSound) {
      this.btnSound.addEventListener('click', () => {
        if (window.paperAudio) {
          const active = window.paperAudio.toggle();
          this.btnSound.classList.toggle('muted', !active);
        }
      });
    }

    // Mobile Swipe Handling
    let touchStartX = 0;
    window.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      const diff = e.changedTouches[0].clientX - touchStartX;
      if (diff < -50) {
        this.book.flipNext((newSpread) => this.updateUI());
      } else if (diff > 50) {
        this.book.flipPrev((newSpread) => this.updateUI());
      }
    }, { passive: true });
  }

  // Dynamic Journal Hover Focus: elevates camera and highlights book with gallery spotlight
  setJournalHover(isHovered) {
    if (this.cameraState.isFocused === isHovered) return;
    this.cameraState.isFocused = isHovered;

    if (isHovered) {
      // Gentle focal elevation directly over the open monograph journal (stable & jitter-free)
      gsap.to(this.cameraState, {
        baseX: 0,
        baseY: 9.6,
        baseZ: 6.8,
        lookX: 0,
        lookY: -0.15,
        lookZ: 0,
        duration: 0.65,
        ease: 'power2.out',
        overwrite: 'auto',
      });
      // Brighten reading spotlight on monograph to make it pop and stand out
      if (this.studio && this.studio.bookFill) {
        gsap.to(this.studio.bookFill, { intensity: 1.35, duration: 0.55, ease: 'power2.out', overwrite: 'auto' });
      }
    } else {
      // Smooth return to wider studio overview
      gsap.to(this.cameraState, {
        baseX: 0,
        baseY: 10.3,
        baseZ: 7.3,
        lookX: 0,
        lookY: -0.2,
        lookZ: 0,
        duration: 0.75,
        ease: 'power2.inOut',
        overwrite: 'auto',
      });
      if (this.studio && this.studio.bookFill) {
        gsap.to(this.studio.bookFill, { intensity: 0.55, duration: 0.65, ease: 'power2.inOut', overwrite: 'auto' });
      }
    }
  }

  // Raycasting on Book Pages with UV Coordinate Precision (High-Performance & Stable)
  checkInPageRaycast() {
    if (this.book.isFlipping) {
      document.body.style.cursor = 'default';
      return;
    }

    // Stable screen-space journal hover zone (prevents 3D camera displacement feedback loops)
    const isOverJournal = Math.abs(this.targetMouse.x) < 0.62 && Math.abs(this.targetMouse.y) < 0.52;
    this.setJournalHover(isOverJournal);

    if (!isOverJournal) {
      this.activeKeyHover = null;
      document.body.style.cursor = 'default';
      return;
    }

    this.raycaster.setFromCamera(this.targetMouse, this.camera);
    const intersects = this.raycaster.intersectObjects([this.book.leftBlock, this.book.rightBlock]);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const isLeft = hit.object === this.book.leftBlock;
      const isRight = hit.object === this.book.rightBlock;
      const spread = this.book.currentSpread;

      // Calculate canvas pixel position from UV coordinates
      const uv = hit.uv;
      const cx = uv.x * 1600;
      const cy = (1.0 - uv.y) * 2260;

      // SPREAD 1 (Pages 3 & 4): Page 3 on Left has the interactive mechanical keypad!
      if (spread === 1 && isLeft) {
        const keyInfo = this.getKeypadKeyAt(cx, cy);
        if (keyInfo) {
          if (!this.activeKeyHover || this.activeKeyHover.label !== keyInfo.label) {
            this.activeKeyHover = keyInfo;
            if (window.paperAudio) window.paperAudio.playHoverTick();
          }
          document.body.style.cursor = 'pointer';
          return;
        } else {
          this.activeKeyHover = null;
        }
      }

      // SPREAD 0 (Page 2 on Right): "Weightless Cloud" CTA button
      if (spread === 0 && isRight) {
        if (cx >= 120 && cx <= 450 && cy >= 480 && cy <= 560) {
          document.body.style.cursor = 'pointer';
          return;
        }
      }

      // SPREAD 3 (Page 8 on Right): "hello@rappu.io" Contact card
      if (spread === 3 && isRight) {
        if (cx >= 120 && cx <= 1480 && cy >= 780 && cy <= 1000) {
          document.body.style.cursor = 'pointer';
          return;
        }
      }

      // Default page flipping cursor on margins/page areas
      document.body.style.cursor = 'pointer';
      return;
    }

    document.body.style.cursor = 'default';
  }

  // Calculate if (cx, cy) is over one of the 12 keypad keys on Page 3
  getKeypadKeyAt(cx, cy) {
    const kw = 1600 - 240;
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

    const labels = [
      ['01', 'SHIFT', 'CMD', 'OPT'],
      ['ESC', 'TAB', 'ENTER', 'PLAY'],
      ['AUDIO', 'SYNC', 'MUTE', 'LIVE']
    ];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * (keyW + gap);
        const y = startY + r * (keyH + gap);
        if (cx >= x && cx <= x + keyW && cy >= y && cy <= y + keyH) {
          return { row: r, col: c, label: labels[r][c], x, y, w: keyW, h: keyH };
        }
      }
    }
    return null;
  }

  // Handle in-page interactive clicks vs page flips
  handleInPageClick(e) {
    if (this.book.isFlipping) return;

    this.raycaster.setFromCamera(this.targetMouse, this.camera);
    const intersects = this.raycaster.intersectObjects([this.book.leftBlock, this.book.rightBlock]);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const isLeft = hit.object === this.book.leftBlock;
      const isRight = hit.object === this.book.rightBlock;
      const spread = this.book.currentSpread;

      const uv = hit.uv;
      const cx = uv.x * 1600;
      const cy = (1.0 - uv.y) * 2260;

      // 1. Mechanical Keypad Click on Page 3
      if (spread === 1 && isLeft) {
        const keyInfo = this.getKeypadKeyAt(cx, cy);
        if (keyInfo) {
          // Play tactile switch click
          if (window.paperAudio) window.paperAudio.playKeyClick();
          // Visual keypress animation on Page 3 canvas
          this.triggerKeypressVisual(keyInfo);
          return;
        }
      }

      // 2. Launch Console CTA on Page 2
      if (spread === 0 && isRight) {
        if (cx >= 120 && cx <= 450 && cy >= 480 && cy <= 560) {
          if (window.paperAudio) window.paperAudio.playKeyClick();
          return;
        }
      }

      // 3. Contact Email Copy on Page 8
      if (spread === 3 && isRight) {
        if (cx >= 120 && cx <= 1480 && cy >= 780 && cy <= 1000) {
          navigator.clipboard.writeText('hello@rappu.io').catch(() => {});
          if (window.paperAudio) window.paperAudio.playKeyClick();
          return;
        }
      }

      // 4. Page Flip on background
      if (isRight) {
        this.book.flipNext((newSpread) => this.updateUI());
      } else if (isLeft) {
        this.book.flipPrev((newSpread) => this.updateUI());
      }
    }
  }

  // Interactive flash on pressed mechanical keycap
  triggerKeypressVisual(keyInfo) {
    const canvas = this.pageCanvases[2]; // Page 3 canvas (index 2)
    const ctx = canvas.getContext('2d');

    // Draw active glowing pressed key
    ctx.save();
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(keyInfo.x, keyInfo.y + 6, keyInfo.w, keyInfo.h, 14);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 22px "JetBrains Mono", monospace';
    ctx.fillStyle = '#0a0b0e';
    ctx.textAlign = 'center';
    ctx.fillText(keyInfo.label, keyInfo.x + keyInfo.w / 2, keyInfo.y + keyInfo.h / 2 + 10);
    ctx.restore();

    this.book.leftPageMat.map.needsUpdate = true;

    // Reset keycap appearance after 180ms
    setTimeout(() => {
      this.textureGen.renderKeycap(canvas, keyInfo.row, keyInfo.col, false);
      this.book.leftPageMat.map.needsUpdate = true;
    }, 180);
  }

  showHoverHint(text) {}
  hideHoverHint() {}

  updateUI() {
    const spread = this.book.currentSpread;
    const total = this.book.totalPages;

    if (this.pageCounter) {
      const leftPage = spread * 2 + 1;
      const rightPage = spread * 2 + 2;
      this.pageCounter.innerHTML = `<span class="current">${String(leftPage).padStart(2, '0')}-${String(rightPage).padStart(2, '0')}</span> <span class="total">/ ${String(total).padStart(2, '0')}</span>`;
    }

    if (this.btnPrev) this.btnPrev.disabled = spread === 0;
    if (this.btnNext) this.btnNext.disabled = spread >= (total / 2) - 1;
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.camera.aspect = w / h;

    if (w < 768) {
      this.camera.position.y = 12.2;
      this.camera.position.z = 8.2;
    } else {
      const preset = this.cameraPresets.studio;
      this.camera.position.set(preset.x, preset.y, preset.z);
    }

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const time = performance.now() * 0.001;

    // Run raycast at most once per animation frame only when mouse moved
    if (this.mouseMoved && !this.book.isFlipping) {
      this.checkInPageRaycast();
      this.mouseMoved = false;
    }

    // Silky smooth mouse parallax lerp
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05;
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05;

    // Gentle spatial tilt with dynamic Journal Focus on Hover
    const camParam = new URLSearchParams(window.location.search).get('cam');
    if (camParam) {
      const v = camParam.split(',').map(Number);
      this.camera.position.set(v[0], v[1], v[2]);
      this.camera.lookAt(v[3], v[4], v[5]);
    } else {
      const pScale = this.cameraState.isFocused ? 0.35 : 0.65;
      this.camera.position.x = this.cameraState.baseX + this.mouse.x * (0.55 * pScale);
      this.camera.position.y = this.cameraState.baseY;
      this.camera.position.z = this.cameraState.baseZ + this.mouse.y * (0.35 * pScale);
      this.camera.lookAt(
        this.cameraState.lookX + this.mouse.x * 0.15,
        this.cameraState.lookY,
        this.cameraState.lookZ
      );
    }

    // Studio environment micro-animations
    if (this.studio && this.studio.update) {
      this.studio.update(time);
    }

    // Pristine native Three.js ACESFilmic tone-mapped rendering
    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
