/**
 * 3D Book Physics & Turning Engine (Three.js + GSAP)
 * Implements continuous arc-length preserving tangent integration for natural,
 * fluid, organic paper bending with corner peel, dual-sided rendering, hardcover spine,
 * natural gutter arc sag, woven silk ribbon bookmark, and realistic contact shadows.
 */

class Book3D {
  constructor(scene, textures, coverCanvas) {
    this.scene = scene;
    this.canvasTextures = textures; // Array of 8 page canvases (animated)
    this.coverCanvas = coverCanvas;
    this.openness = 0; // 0 = fechado, 1 = aberto
    this.coverTease = 0; // leve levantada da capa no hover
    this.isOpen = false;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Book Dimensions (Luxury Monograph A4 Proportion)
    this.pageW = 3.8;
    this.pageH = 5.37; // 3.8 * 1.4125
    this.blockThickness = 0.18;
    this.coverOverhang = 0.16;

    // State
    this.totalPages = 8;
    this.currentSpread = 0; // 0: [P1, P2], 1: [P3, P4], 2: [P5, P6], 3: [P7, P8]
    this.isFlipping = false;
    this.flipProgress = 0;
    this.flipDirection = 1; // 1 = forward, -1 = backward

    this.initMaterials();
    this.buildCoverAndSpine();
    this.buildPageBlocks();
    this.buildTurningSheet();
    this.buildSpineShadow();
    this.buildFlap();
    this.buildRiffle();

    // Position book on the desk
    this.group.position.set(0, this.blockThickness / 2 + 0.01, 0);
    this.group.rotation.x = -Math.PI / 2; // Flat on desk, Y is depth/height
    this.group.rotation.z = 0;

    this.updateSpreadTextures(0);
    this.applyOpenness();
  }

  initMaterials() {
    // Generate Three.js textures from page canvases
    this.pageThreeTextures = this.canvasTextures.map((canvas) => {
      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      tex.anisotropy = 8;
      tex.encoding = THREE.sRGBEncoding;
      return tex;
    });

    this.coverTexture = new THREE.CanvasTexture(this.coverCanvas);
    this.coverTexture.anisotropy = 8;
    this.coverTexture.encoding = THREE.sRGBEncoding;

    // Crisp high-fidelity luxury monograph paper material
    this.createPageMaterial = (texture) => {
      // Papel fosco: sem brilho especular "lavando" os pretos, com leve auto-iluminação
      // A cena soma ~5x de irradiância sobre o livro; o albedo reduzido + emissivo
      // faz a página deitada reproduzir as cores exatas do canvas, e ainda escurecer
      // naturalmente quando ela se curva ao virar.
      return new THREE.MeshPhongMaterial({
        map: texture,
        color: 0x262626,
        emissive: 0xffffff,
        emissiveMap: texture,
        emissiveIntensity: 0.38,
        specular: 0x000000,
        shininess: 1,
        toneMapped: false,
        side: THREE.FrontSide,
      });
    };

    // Stratified Paper Edge Texture (Multi-layered cream/ivory deckle strata)
    const edgeCanvas = document.createElement('canvas');
    edgeCanvas.width = 256;
    edgeCanvas.height = 256;
    const ectx = edgeCanvas.getContext('2d');
    ectx.fillStyle = '#14151a';
    ectx.fillRect(0, 0, 256, 256);

    for (let y = 0; y < 256; y += 2) {
      const isWarm = Math.random() > 0.4;
      const alpha = 0.12 + Math.random() * 0.18;
      ectx.fillStyle = isWarm
        ? `rgba(225, 215, 195, ${alpha})`
        : `rgba(180, 170, 150, ${alpha * 0.6})`;
      ectx.fillRect(0, y, 256, 1.2);
    }
    // Gilded/graphite edge hint
    ectx.fillStyle = 'rgba(212, 175, 55, 0.06)';
    ectx.fillRect(0, 0, 256, 256);

    const edgeTex = new THREE.CanvasTexture(edgeCanvas);
    edgeTex.wrapS = THREE.RepeatWrapping;
    edgeTex.wrapT = THREE.RepeatWrapping;
    edgeTex.repeat.set(12, 1);

    this.edgeMaterial = new THREE.MeshStandardMaterial({
      map: edgeTex,
      roughness: 0.78,
      metalness: 0.08,
    });

    // Hardcover outer woven bookcloth / leatherette texture
    const coverCanvas = document.createElement('canvas');
    coverCanvas.width = 256;
    coverCanvas.height = 256;
    const cctx = coverCanvas.getContext('2d');
    cctx.fillStyle = '#0a0b0e';
    cctx.fillRect(0, 0, 256, 256);
    // Woven linen micro-pattern
    cctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    for (let x = 0; x < 256; x += 3) {
      cctx.fillRect(x, 0, 1.2, 256);
    }
    for (let y = 0; y < 256; y += 3) {
      cctx.fillRect(0, y, 256, 1.2);
    }
    const coverTex = new THREE.CanvasTexture(coverCanvas);
    coverTex.wrapS = THREE.RepeatWrapping;
    coverTex.wrapT = THREE.RepeatWrapping;
    coverTex.repeat.set(8, 8);

    this.coverMaterial = new THREE.MeshStandardMaterial({
      map: coverTex,
      color: 0x08090c,
      roughness: 0.82,
      metalness: 0.1,
    });
  }

  buildCoverAndSpine() {
    const cw = this.pageW + this.coverOverhang;
    const ch = this.pageH + this.coverOverhang * 2;
    const ct = 0.035;

    // Left Cover Plate
    const leftCoverGeo = new THREE.BoxGeometry(cw, ch, ct);
    this.coverFrontMat = new THREE.MeshPhongMaterial({
      map: this.coverTexture,
      color: 0x262626,
      emissive: 0xffffff,
      emissiveMap: this.coverTexture,
      emissiveIntensity: 0.2,
      specular: 0x000000,
      shininess: 1,
      toneMapped: false,
    });
    const cm = this.coverMaterial;
    this.leftCover = new THREE.Mesh(leftCoverGeo, [cm, cm, cm, cm, cm, this.coverFrontMat]);
    this.leftCover.position.set(-cw / 2 - 0.02, 0, -this.blockThickness - ct / 2);
    this.leftCover.receiveShadow = true;
    this.leftCover.castShadow = true;
    this.group.add(this.leftCover);

    // Right Cover Plate
    const rightCoverGeo = new THREE.BoxGeometry(cw, ch, ct);
    this.rightCover = new THREE.Mesh(rightCoverGeo, this.coverMaterial);
    this.rightCover.position.set(cw / 2 + 0.02, 0, -this.blockThickness - ct / 2);
    this.rightCover.receiveShadow = true;
    this.rightCover.castShadow = true;
    this.group.add(this.rightCover);

    // Flat Book Backplate underneath (keeps spine flush with desk without protruding)
    const spineBackGeo = new THREE.BoxGeometry(this.blockThickness * 1.2, this.pageH, ct);
    this.spineBack = new THREE.Mesh(spineBackGeo, this.coverMaterial);
    this.spineBack.position.set(0, 0, -this.blockThickness - ct / 2);
    this.spineBack.receiveShadow = true;
    this.group.add(this.spineBack);

    // Deep Ambient Occlusion Contact Shadow directly under book on the desk
    const bookShadowGeo = new THREE.PlaneGeometry(cw * 2 + 0.85, ch + 0.85);
    const bsCanvas = document.createElement('canvas');
    bsCanvas.width = 512;
    bsCanvas.height = 512;
    const bsctx = bsCanvas.getContext('2d');
    const bsgrad = bsctx.createRadialGradient(256, 256, 120, 256, 256, 256);
    bsgrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.75)');
    bsgrad.addColorStop(0.60, 'rgba(0, 0, 0, 0.45)');
    bsgrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.12)');
    bsgrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    bsctx.fillStyle = bsgrad;
    bsctx.fillRect(0, 0, 512, 512);

    const bsTex = new THREE.CanvasTexture(bsCanvas);
    const bsMat = new THREE.MeshBasicMaterial({
      map: bsTex,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });
    const bookContactShadow = new THREE.Mesh(bookShadowGeo, bsMat);
    bookContactShadow.position.set(0, 0, -this.blockThickness - ct - 0.005);
    this.group.add(bookContactShadow);
    this.contactShadow = bookContactShadow;
    this.coverThickness = ct;

    // Lombada vista quando o livro está fechado
    const spineGeo = new THREE.BoxGeometry(0.05, ch, this.blockThickness * 2 + ct * 2 + 0.01);
    this.closedSpine = new THREE.Mesh(spineGeo, this.coverMaterial);
    this.closedSpine.position.set(-0.025, 0, 0);
    this.closedSpine.castShadow = true;
    this.group.add(this.closedSpine);
  }

  /**
   * Builds the left and right page blocks with an authentic natural gutter arc:
   * Pages gently curve down into the central binding seam (d = 0) with organic depth,
   * while remaining level across the outer reading area.
   */
  buildPageBlocks() {
    const bw = this.pageW;
    const bh = this.pageH;
    const bt = this.blockThickness;

    // Clean, crisp page block geometries
    const leftBlockGeo = new THREE.BoxGeometry(bw, bh, bt, 40, 1, 1);
    this.leftPageMat = this.createPageMaterial(this.pageThreeTextures[0]);
    const leftMaterials = [
      this.edgeMaterial, // +X (spine side)
      this.edgeMaterial, // -X (outer page edge)
      this.edgeMaterial, // +Y (top edge)
      this.edgeMaterial, // -Y (bottom edge)
      this.leftPageMat,  // +Z (top surface facing camera)
      this.coverMaterial // -Z (bottom face)
    ];

    this.leftBlock = new THREE.Mesh(leftBlockGeo, leftMaterials);
    this.leftBlock.position.set(-bw / 2, 0, -bt / 2);
    this.leftBlock.receiveShadow = true;
    this.leftBlock.castShadow = true;
    this.group.add(this.leftBlock);

    // Right Static Page Block
    const rightBlockGeo = new THREE.BoxGeometry(bw, bh, bt, 40, 1, 1);
    this.rightPageMat = this.createPageMaterial(this.pageThreeTextures[1]);
    const rightMaterials = [
      this.edgeMaterial, // +X (outer page edge)
      this.edgeMaterial, // -X (spine side)
      this.edgeMaterial, // +Y (top edge)
      this.edgeMaterial, // -Y (bottom edge)
      this.rightPageMat, // +Z (top surface facing camera)
      this.coverMaterial // -Z (bottom face)
    ];

    this.rightBlock = new THREE.Mesh(rightBlockGeo, rightMaterials);
    this.rightBlock.position.set(bw / 2, 0, -bt / 2);
    this.rightBlock.receiveShadow = true;
    this.rightBlock.castShadow = true;
    this.group.add(this.rightBlock);
  }

  buildTurningSheet() {
    // 48 columns along width, 16 rows along height for fluid, continuous curvature
    this.sheetCols = 48;
    this.sheetRows = 16;
    const bw = this.pageW;
    const bh = this.pageH;

    // Plane geometry translated so origin (0,0,0) is strictly at the spine (X=0)
    const frontGeo = new THREE.PlaneGeometry(bw, bh, this.sheetCols, this.sheetRows);
    frontGeo.translate(bw / 2, 0, 0);

    const backGeo = new THREE.PlaneGeometry(bw, bh, this.sheetCols, this.sheetRows);
    backGeo.translate(bw / 2, 0, 0);

    // Invert back face UVs so text is correctly oriented when flipped over
    const uvs = backGeo.attributes.uv.array;
    for (let i = 0; i < uvs.length; i += 2) {
      uvs[i] = 1.0 - uvs[i];
    }
    backGeo.attributes.uv.needsUpdate = true;

    // Reverse triangle winding order for back face so it points downwards/backwards
    const index = backGeo.index.array;
    for (let i = 0; i < index.length; i += 3) {
      const tmp = index[i + 1];
      index[i + 1] = index[i + 2];
      index[i + 2] = tmp;
    }
    backGeo.index.needsUpdate = true;

    this.turnFrontMat = this.createPageMaterial(this.pageThreeTextures[1]);
    this.turnBackMat = this.createPageMaterial(this.pageThreeTextures[2]);

    this.turnFrontMesh = new THREE.Mesh(frontGeo, this.turnFrontMat);
    this.turnBackMesh = new THREE.Mesh(backGeo, this.turnBackMat);

    this.turnFrontMesh.castShadow = true;
    this.turnBackMesh.castShadow = true;
    this.turnFrontMesh.receiveShadow = true;
    this.turnBackMesh.receiveShadow = true;

    this.turningGroup = new THREE.Group();
    this.turningGroup.add(this.turnFrontMesh);
    this.turningGroup.add(this.turnBackMesh);
    this.turningGroup.position.set(0, 0, 0.003);
    this.turningGroup.visible = false;

    this.group.add(this.turningGroup);

    // Dynamic underneath contact shadow for turning sheet
    const shadowGeo = new THREE.PlaneGeometry(bw, bh);
    shadowGeo.translate(bw / 2, 0, 0);

    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sctx = shadowCanvas.getContext('2d');
    const sgrad = sctx.createLinearGradient(0, 0, 256, 0);
    sgrad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
    sgrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.15)');
    sgrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sctx.fillStyle = sgrad;
    sctx.fillRect(0, 0, 256, 256);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    this.sheetShadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.sheetShadow = new THREE.Mesh(shadowGeo, this.sheetShadowMat);
    this.sheetShadow.position.set(0, 0, 0.001);
    this.group.add(this.sheetShadow);
  }

  buildSpineShadow() {
    // Subtle ambient occlusion valley shadow along center book fold
    const shadowGeo = new THREE.PlaneGeometry(0.55, this.pageH);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.08)');
    grad.addColorStop(0.48, 'rgba(0, 0, 0, 0.35)');
    grad.addColorStop(0.50, 'rgba(0, 0, 0, 0.55)'); // Soft center crease
    grad.addColorStop(0.52, 'rgba(0, 0, 0, 0.35)');
    grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.08)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 512);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });

    const spineShadow = new THREE.Mesh(shadowGeo, mat);
    spineShadow.position.set(0, 0, 0.002);
    this.group.add(spineShadow);
    this.spineShadow = spineShadow;
  }

  // A capa + bloco esquerdo giram juntos em torno da lombada (eixo Y local)
  buildFlap() {
    this.flap = new THREE.Group();
    this.group.add(this.flap);
    this.flap.add(this.leftBlock);
    this.flap.add(this.leftCover);
  }

  // Arco das páginas: sobem a partir da lombada e descem até a borda, como num livro aberto.
  // A intensidade acompanha a abertura (fechado = plano, para as metades não se cruzarem).
  setPageArch(amount) {
    if (this._arch === amount) return;
    this._arch = amount;
    const bw = this.pageW, top = this.blockThickness / 2 - 1e-4;
    [[this.leftBlock, 1], [this.rightBlock, -1]].forEach(([mesh, side]) => {
      const pos = mesh.geometry.attributes.position;
      if (!mesh.userData.baseZ) mesh.userData.baseZ = Float32Array.from(pos.array);
      const base = mesh.userData.baseZ;
      for (let i = 0; i < pos.count; i++) {
        const z0 = base[i * 3 + 2];
        if (z0 < top) continue;
        const x = base[i * 3];
        const d = side === 1 ? (bw / 2 - x) / bw : (x + bw / 2) / bw;
        pos.array[i * 3 + 2] = z0 + amount * Math.sin(Math.PI * Math.sqrt(clamp01(d)));
      }
      pos.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
    });
  }

  applyOpenness() {
    const o = this.openness;
    this.setPageArch(0.075 * Math.pow(clamp01((o - 0.55) / 0.45), 2));
    const tease = this.coverTease * (1 - o);
    this.flap.rotation.y = Math.PI * (1 - o) - tease * 0.22;
    const cw = this.pageW + this.coverOverhang;
    const k = o * o * (3 - 2 * o);
    this.group.position.x = -(cw / 2 + 0.02) * (1 - k);
    this.contactShadow.scale.x = 0.52 + 0.48 * k;
    this.contactShadow.position.x = (cw / 2 + 0.02) * (1 - k);
    this.closedSpine.visible = o < 0.04;
    this.spineShadow.material.opacity = 0.7 * clamp01((o - 0.6) / 0.4);
  }

  setCoverTease(v) {
    gsap.to(this, { coverTease: v, duration: 0.5, ease: 'power2.out', overwrite: 'auto', onUpdate: () => this.applyOpenness() });
  }

  // Folhas extras usadas só ao abrir/fechar: passam em cascata junto com a capa
  buildRiffle() {
    this.riffle = [];
    for (let i = 0; i < 9; i++) {
      const front = new THREE.Mesh(this.turnFrontMesh.geometry.clone(), this.createPageMaterial(this.pageThreeTextures[1]));
      const back = new THREE.Mesh(this.turnBackMesh.geometry.clone(), this.createPageMaterial(this.pageThreeTextures[0]));
      front.castShadow = back.castShadow = true;
      const g = new THREE.Group();
      g.add(front, back);
      g.visible = false;
      this.group.add(g);
      this.riffle.push({ group: g, front, back, p: 0 });
    }
  }

  // dir 1: da direita para a esquerda (abrir) · dir -1: da esquerda para a direita (fechar)
  playRiffle(dir, { delay = 0, stagger = 0.07, dur = 0.9, faces } = {}) {
    const n = this.riffle.length;
    const e = 0.0016;
    return new Promise((resolve) => {
      this.riffle.forEach((sh, i) => {
        const [fTex, bTex] = faces(i, n);
        this.setMap(sh.front.material, fTex);
        this.setMap(sh.back.material, bTex);
        sh.p = 0;
        sh.group.position.z = 0.002 + (n - 1 - i) * e;
        this.deformTurningSheet(0, dir, sh.front, sh.back, false);
        if (dir === -1) sh.group.visible = true;
        gsap.to(sh, {
          p: 1,
          duration: dur,
          delay: delay + i * stagger,
          ease: 'power2.inOut',
          onStart: () => {
            sh.group.visible = true;
            if (window.paperAudio && i % 3 === 0) window.paperAudio.playFlipSound(dir);
          },
          onUpdate: () => {
            // a folha que vira primeiro fica por cima ao sair e por baixo ao chegar
            sh.group.position.z = 0.002 + (sh.p < 0.5 ? n - 1 - i : i) * e;
            this.deformTurningSheet(sh.p, dir, sh.front, sh.back, false);
          },
          onComplete: () => {
            if (i === n - 1) resolve();
          },
        });
      });
    });
  }

  hideRiffle() {
    this.riffle.forEach((sh) => (sh.group.visible = false));
  }

  open(onComplete) {
    if (this.isOpen || this.coverAnimating) return;
    this.coverAnimating = true;
    if (window.paperAudio) window.paperAudio.playFlipSound(1);
    this.updateSpreadTextures(0);
    const T = this.pageThreeTextures;
    // capa e páginas num único gesto: a capa lidera e as folhas vêm logo atrás, em cascata
    gsap.to(this, {
      openness: 1,
      coverTease: 0,
      duration: 1.5,
      ease: 'power3.out',
      onUpdate: () => this.applyOpenness(),
    });
    this.playRiffle(1, {
      delay: 0.16,
      stagger: 0.075,
      dur: 0.95,
      // a frente de cada folha é igual à página da direita (entra sem "piscar");
      // o verso mostra páginas variadas e a última folha termina na primeira página
      faces: (i, n) => [T[1], i === n - 1 ? T[0] : T[2 + (i % (T.length - 2))]],
    }).then(() => {
      this.hideRiffle();
      this.isOpen = true;
      this.coverAnimating = false;
      if (onComplete) onComplete();
    });
  }

  close(onComplete) {
    if (!this.isOpen || this.coverAnimating || this.isFlipping) return;
    this.coverAnimating = true;
    this.isOpen = false;
    const T = this.pageThreeTextures;
    const curLeft = this.leftPageMat.map;
    // a página da esquerda passa a ser a primeira (fica escondida sob as folhas);
    // a da direita só troca no fim, já coberta pela capa
    this.setMap(this.leftPageMat, T[0]);
    this.currentSpread = 0;
    // as folhas voltam em cascata e a capa fecha logo em seguida, sem pausa
    this.playRiffle(-1, {
      stagger: 0.06,
      dur: 0.85,
      faces: (i, n) => [T[2 + ((i + 3) % (T.length - 2))], i === 0 ? curLeft : T[2 + (i % (T.length - 2))]],
    });
    gsap.to(this, {
      openness: 0,
      duration: 1.3,
      delay: 0.55,
      ease: 'power2.inOut',
      onUpdate: () => this.applyOpenness(),
      onComplete: () => {
        this.hideRiffle();
        this.updateSpreadTextures(0);
        this.coverAnimating = false;
        if (onComplete) onComplete();
      },
    });
  }

  // Texturas de página que estão visíveis agora (para animar só o necessário)
  getVisibleTextures() {
    const set = new Set([this.leftPageMat.map, this.rightPageMat.map]);
    if (this.turningGroup.visible) {
      set.add(this.turnFrontMat.map);
      set.add(this.turnBackMat.map);
    }
    return set;
  }

  setMap(mat, tex) {
    mat.map = tex;
    mat.emissiveMap = tex;
  }

  /**
   * Ultra-Fluid Arc-Length Preserving Page Deformation with Analytical Normals
   * Integrates local tangent angles along width with analytical normal vectors.
   * Runs in microseconds without costly CPU computeVertexNormals().
   *
   * @param {number} p - Normalized progress [0, 1]
   * @param {number} dir - Direction (1 = forward right-to-left, -1 = backward left-to-right)
   */
  deformTurningSheet(p, dir = 1, front = this.turnFrontMesh, back = this.turnBackMesh, withShadow = true) {
    const W = this.pageW;
    const H = this.pageH;
    const Nu = this.sheetCols; // 48
    const Nv = this.sheetRows; // 16
    const du = 1.0 / Nu;
    const segmentLen = du * W;

    const frontPos = front.geometry.attributes.position.array;
    const backPos = back.geometry.attributes.position.array;
    const frontNorm = front.geometry.attributes.normal.array;
    const backNorm = back.geometry.attributes.normal.array;

    const sinP = Math.sin(p * Math.PI);
    const rootP = p * p * (3 - 2 * p);
    const theta0 = rootP * Math.PI;

    const archAmp = sinP * 1.70;
    const tipCurlAmp = (1.0 - p) * sinP * 0.70;
    const settleAmp = p * sinP * 0.70;

    let vIdx = 0;
    for (let iv = 0; iv <= Nv; iv++) {
      const v = 0.5 - iv / Nv;
      const py = v * H;
      const cornerLead = (0.22 - 0.44 * v) * sinP * 0.36;

      let x = 0;
      let z = 0.003;

      // Spine vertex (iu = 0)
      const spineZ = 0.003;
      const spineTheta = (dir === 1) ? theta0 : (Math.PI - theta0);
      const spineCos = Math.cos(spineTheta);
      const spineSin = Math.sin(spineTheta);

      let arrayIdx = vIdx * 3;
      frontPos[arrayIdx] = 0;
      frontPos[arrayIdx + 1] = py;
      frontPos[arrayIdx + 2] = spineZ;

      frontNorm[arrayIdx] = -spineSin;
      frontNorm[arrayIdx + 1] = 0;
      frontNorm[arrayIdx + 2] = spineCos;

      backPos[arrayIdx] = 0;
      backPos[arrayIdx + 1] = py;
      backPos[arrayIdx + 2] = spineZ - 0.0012;

      backNorm[arrayIdx] = spineSin;
      backNorm[arrayIdx + 1] = 0;
      backNorm[arrayIdx + 2] = -spineCos;

      vIdx++;

      // Integrated tangent curve along page width
      for (let iu = 1; iu <= Nu; iu++) {
        const u = iu * du;
        const tipCurl = tipCurlAmp * Math.pow(u, 1.6);
        const settle = settleAmp * (1.0 - Math.pow(1.0 - u, 1.6));
        const baseTheta = theta0 + (u - 0.5) * archAmp + tipCurl - settle + cornerLead * u;

        const theta = (dir === 1) ? baseTheta : (Math.PI - baseTheta);
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        x += segmentLen * cosT;
        z += segmentLen * sinT;

        // acompanha o arco das páginas para a folha não entrar por baixo delas
        const pz = Math.max(0.003, z) + (this._arch || 0) * Math.sin(Math.PI * Math.sqrt(u)) + (this._arch ? 0.004 : 0);
        const yTaper = py * (1.0 - 0.012 * sinP * u);

        arrayIdx = vIdx * 3;
        frontPos[arrayIdx] = x;
        frontPos[arrayIdx + 1] = yTaper;
        frontPos[arrayIdx + 2] = pz;

        // Analytical normals for perfect lighting without CPU bottlenecks
        frontNorm[arrayIdx] = -sinT;
        frontNorm[arrayIdx + 1] = 0;
        frontNorm[arrayIdx + 2] = cosT;

        backPos[arrayIdx] = x;
        backPos[arrayIdx + 1] = yTaper;
        backPos[arrayIdx + 2] = pz - 0.0012;

        backNorm[arrayIdx] = sinT;
        backNorm[arrayIdx + 1] = 0;
        backNorm[arrayIdx + 2] = -cosT;

        vIdx++;
      }
    }

    front.geometry.attributes.position.needsUpdate = true;
    front.geometry.attributes.normal.needsUpdate = true;

    back.geometry.attributes.position.needsUpdate = true;
    back.geometry.attributes.normal.needsUpdate = true;

    // Soft contact shadow underneath turning sheet
    if (withShadow && this.sheetShadow) {
      if (p > 0.02 && p < 0.98) {
        this.sheetShadow.visible = true;
        this.sheetShadowMat.opacity = sinP * 0.40;
        this.sheetShadow.position.x = (dir === 1 ? (0.5 - p) : (p - 0.5)) * W * 0.75;
        this.sheetShadow.scale.x = Math.max(0.25, 1.0 - sinP * 0.35);
      } else {
        this.sheetShadow.visible = false;
      }
    }
  }

  updateSpreadTextures(spreadIndex) {
    const leftIdx = spreadIndex * 2;
    const rightIdx = leftIdx + 1;
    if (this.leftPageMat) this.setMap(this.leftPageMat, this.pageThreeTextures[leftIdx]);
    if (this.rightPageMat) this.setMap(this.rightPageMat, this.pageThreeTextures[rightIdx]);
    this.currentSpread = spreadIndex;
  }

  // Flip Forward (Right to Left) with Fluid Snappy Response & Queuing
  flipNext(onComplete) {
    if (this.isFlipping) {
      // Accelerate current flip to swiftly complete and immediately proceed
      if (this.flipDirection === 1 && this.currentSpread + 1 < (this.totalPages / 2) - 1) {
        this.queuedDirection = 1;
        if (this.flipTween) this.flipTween.timeScale(2.6);
      }
      return;
    }
    if (this.currentSpread >= (this.totalPages / 2) - 1) {
      this.playBounce(1);
      return;
    }

    this.isFlipping = true;
    this.flipDirection = 1;
    this.queuedDirection = 0;
    const currentSpread = this.currentSpread;
    const nextSpread = currentSpread + 1;

    const turningFrontIdx = currentSpread * 2 + 1;
    const turningBackIdx = nextSpread * 2;
    const revealedRightIdx = nextSpread * 2 + 1;

    this.setMap(this.turnFrontMat, this.pageThreeTextures[turningFrontIdx]);
    
    this.setMap(this.turnBackMat, this.pageThreeTextures[turningBackIdx]);
    
    this.setMap(this.rightPageMat, this.pageThreeTextures[revealedRightIdx]);
    
    this.turningGroup.visible = true;
    this.flipProgress = 0;
    this.deformTurningSheet(0, 1);

    if (this.onFlipStart) this.onFlipStart(nextSpread);

    if (window.paperAudio) {
      window.paperAudio.playFlipSound(1);
    }

    if (this.flipTween) this.flipTween.kill();
    this.flipTween = gsap.to(this, {
      flipProgress: 1,
      duration: 0.52,
      ease: 'power2.out',
      onUpdate: () => {
        this.deformTurningSheet(this.flipProgress, 1);
      },
      onComplete: () => {
        this.turningGroup.visible = false;
        this.updateSpreadTextures(nextSpread);
        this.isFlipping = false;
        if (this.onFlipEnd) this.onFlipEnd(nextSpread);
        if (onComplete) onComplete(nextSpread);

        if (this.queuedDirection === 1) {
          this.queuedDirection = 0;
          this.flipNext(onComplete);
        } else if (this.queuedDirection === -1) {
          this.queuedDirection = 0;
          this.flipPrev(onComplete);
        }
      }
    });
  }

  // Flip Backward (Left to Right) with Fluid Snappy Response & Queuing
  flipPrev(onComplete) {
    if (this.isFlipping) {
      // Accelerate current flip to swiftly complete and immediately proceed
      if (this.flipDirection === -1 && this.currentSpread - 1 > 0) {
        this.queuedDirection = -1;
        if (this.flipTween) this.flipTween.timeScale(2.6);
      }
      return;
    }
    if (this.currentSpread <= 0) {
      this.playBounce(-1);
      return;
    }

    this.isFlipping = true;
    this.flipDirection = -1;
    this.queuedDirection = 0;
    const currentSpread = this.currentSpread;
    const prevSpread = currentSpread - 1;

    const turningFrontIdx = prevSpread * 2 + 1;
    const turningBackIdx = currentSpread * 2;
    const revealedLeftIdx = prevSpread * 2;

    this.setMap(this.turnFrontMat, this.pageThreeTextures[turningFrontIdx]);
    
    this.setMap(this.turnBackMat, this.pageThreeTextures[turningBackIdx]);
    
    this.setMap(this.leftPageMat, this.pageThreeTextures[revealedLeftIdx]);
    
    this.turningGroup.visible = true;
    this.flipProgress = 0;
    this.deformTurningSheet(0, -1);

    if (this.onFlipStart) this.onFlipStart(prevSpread);

    if (window.paperAudio) {
      window.paperAudio.playFlipSound(-1);
    }

    if (this.flipTween) this.flipTween.kill();
    this.flipTween = gsap.to(this, {
      flipProgress: 1,
      duration: 0.52,
      ease: 'power2.out',
      onUpdate: () => {
        this.deformTurningSheet(this.flipProgress, -1);
      },
      onComplete: () => {
        this.turningGroup.visible = false;
        this.updateSpreadTextures(prevSpread);
        this.isFlipping = false;
        if (this.onFlipEnd) this.onFlipEnd(prevSpread);
        if (onComplete) onComplete(prevSpread);

        if (this.queuedDirection === 1) {
          this.queuedDirection = 0;
          this.flipNext(onComplete);
        } else if (this.queuedDirection === -1) {
          this.queuedDirection = 0;
          this.flipPrev(onComplete);
        }
      }
    });
  }

  // Smooth Direct Jump to any Spread Index
  goToSpread(targetSpread, onComplete) {
    if (targetSpread === this.currentSpread) return;
    if (targetSpread < 0 || targetSpread >= this.totalPages / 2) return;

    if (this.isFlipping) {
      if (this.flipTween) this.flipTween.kill();
      this.turningGroup.visible = false;
      this.isFlipping = false;
    }

    const isForward = targetSpread > this.currentSpread;
    const dir = isForward ? 1 : -1;

    this.isFlipping = true;
    this.flipDirection = dir;
    this.queuedDirection = 0;

    const turningFrontIdx = isForward ? (this.currentSpread * 2 + 1) : (targetSpread * 2 + 1);
    const turningBackIdx = isForward ? (targetSpread * 2) : (this.currentSpread * 2);
    const revealedStaticIdx = isForward ? (targetSpread * 2 + 1) : (targetSpread * 2);

    this.setMap(this.turnFrontMat, this.pageThreeTextures[turningFrontIdx]);
    
    this.setMap(this.turnBackMat, this.pageThreeTextures[turningBackIdx]);
    
    if (isForward) {
      this.setMap(this.rightPageMat, this.pageThreeTextures[revealedStaticIdx]);
          } else {
      this.setMap(this.leftPageMat, this.pageThreeTextures[revealedStaticIdx]);
    }

    this.turningGroup.visible = true;
    this.flipProgress = 0;
    this.deformTurningSheet(0, dir);

    if (this.onFlipStart) this.onFlipStart(targetSpread);
    if (window.paperAudio) window.paperAudio.playFlipSound(dir);

    this.flipTween = gsap.to(this, {
      flipProgress: 1,
      duration: 0.54,
      ease: 'power2.out',
      onUpdate: () => {
        this.deformTurningSheet(this.flipProgress, dir);
      },
      onComplete: () => {
        this.turningGroup.visible = false;
        this.updateSpreadTextures(targetSpread);
        this.isFlipping = false;
        if (this.onFlipEnd) this.onFlipEnd(targetSpread);
        if (onComplete) onComplete(targetSpread);
      }
    });
  }

  // Subtle bounce feedback when reaching book limits
  playBounce(dir) {
    const target = dir > 0 ? this.rightBlock : this.leftBlock;
    gsap.to(target.position, {
      z: -this.blockThickness / 2 + 0.05,
      duration: 0.12,
      yoyo: true,
      repeat: 1,
      ease: 'power1.out'
    });
  }
}

window.Book3D = Book3D;

function clamp01(v) { return Math.max(0, Math.min(1, v)); }
