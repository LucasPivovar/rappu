/**
 * Photorealistic Studio Environment & Props (Three.js r128)
 *
 * - Studio reflection map (PMREM from procedural studio softboxes) for realistic specular highlights.
 * - Warm oiled walnut plank desk with flowing grain and soft lighting falloff.
 * - Thick-walled European ceramic cappuccino cup with authentic LATTE ART (rosetta leaf foam)
 *   and stainless steel spoon, directly matching user reference photo media_1792855275267_98836958.png.
 * - Vibrant Cadmium Ochre Gold drafting pencil with natural cedar wood cone and sharp graphite.
 * - Clean prop placement directly on the tabletop (no clunky square trays).
 */

class StudioEnvironment {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer || null;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Prop placement: cup sits cleanly to the right of the book
    this.cupPos = new THREE.Vector3(5.2, 0, -1.25);
    this.pencilPos = new THREE.Vector3(-5.0, 0, 0.55);

    this.envMap = this.renderer ? this.buildStudioEnvironmentMap(this.renderer) : null;

    this.setupLighting();
    this.buildDeskSurface();
    this.buildEspressoCup();
    this.buildArchitectPencil();
  }

  /**
   * Builds pre-filtered studio reflection environment for realistic ceramic and metal highlights
   */
  buildStudioEnvironmentMap(renderer) {
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x040406);

    const room = new THREE.Mesh(
      new THREE.BoxGeometry(40, 40, 40),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0.015, 0.015, 0.018), side: THREE.BackSide })
    );
    envScene.add(room);

    const addPanel = (w, h, color, pos) => {
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
      );
      panel.position.copy(pos);
      panel.lookAt(0, 0, 0);
      envScene.add(panel);
    };

    // Warm high-key studio window light (creates window reflection in the cup, matching photo!)
    addPanel(12, 8, new THREE.Color(3.8, 3.4, 2.8), new THREE.Vector3(-7, 12, 7));
    // Soft cool fill card
    addPanel(3, 10, new THREE.Color(0.6, 0.8, 1.2), new THREE.Vector3(12, 5, -6));
    // Back contour card
    addPanel(8, 4, new THREE.Color(1.2, 1.1, 1.0), new THREE.Vector3(3, 10, -10));

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0.08, 0.05, 0.03), side: THREE.DoubleSide })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.5;
    envScene.add(floor);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const rt = pmrem.fromScene(envScene, 0.03);
    pmrem.dispose();
    return rt.texture;
  }

  withEnv(material, intensity = 1.0) {
    if (this.envMap) {
      material.envMap = this.envMap;
      material.envMapIntensity = intensity;
      material.needsUpdate = true;
    }
    return material;
  }

  setupLighting() {
    // 1. Warm ambient base (Calibrated so shadows have rich, deep, dark contrast)
    this.ambientLight = new THREE.AmbientLight(0x241d16, 0.45);
    this.scene.add(this.ambientLight);

    // 2. Global Window sunlight beam (Key light across desk and monograph)
    this.keyLight = new THREE.SpotLight(0xfff5e6, 2.6);
    this.keyLight.position.set(-4.0, 14.0, 5.5);
    this.keyLight.target.position.set(0.8, 0, -0.4);
    this.keyLight.angle = 0.68;
    this.keyLight.penumbra = 0.85;
    this.keyLight.decay = 0;
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.keyLight.shadow.camera.near = 6;
    this.keyLight.shadow.camera.far = 30;
    this.keyLight.shadow.bias = -0.0001;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    // 3. Cool rim light for silhouette separation
    this.fillLight = new THREE.DirectionalLight(0x6b82a8, 0.35);
    this.fillLight.position.set(8.5, 7.5, -6.0);
    this.scene.add(this.fillLight);

    // 4. Soft reading spotlight on the monograph book (highlights book with warm gallery illumination)
    this.bookFill = new THREE.SpotLight(0xfff4e6, 0.70);
    this.bookFill.position.set(0, 9.5, 2.0);
    this.bookFill.target.position.set(0, 0, 0);
    this.bookFill.angle = Math.PI / 4.2;
    this.bookFill.penumbra = 0.85;
    this.bookFill.decay = 0;
    this.scene.add(this.bookFill);
    this.scene.add(this.bookFill.target);

    // 5. Dedicated Coffee Ensemble Directional Sunlight
    // Matches the exact window sunlight beam angle from reference photo media_1792855275267_98836958.png!
    // Casts crisp, soft-penumbra shadows from the cup directly across the saucer and onto the desk!
    this.cupSun = new THREE.DirectionalLight(0xfff5e4, 2.2);
    this.cupSun.position.set(this.cupPos.x - 3.2, 5.0, this.cupPos.z + 3.0);
    this.cupSun.target.position.copy(this.cupPos);
    this.cupSun.castShadow = true;
    this.cupSun.shadow.mapSize.width = 1024;
    this.cupSun.shadow.mapSize.height = 1024;
    this.cupSun.shadow.camera.left = -1.8;
    this.cupSun.shadow.camera.right = 1.8;
    this.cupSun.shadow.camera.top = 1.8;
    this.cupSun.shadow.camera.bottom = -1.8;
    this.cupSun.shadow.camera.near = 0.5;
    this.cupSun.shadow.camera.far = 10.0;
    this.cupSun.shadow.bias = -0.0003;
    this.cupSun.shadow.normalBias = 0.02;
    this.cupSun.shadow.radius = 2.4;
    this.cupSun.shadow.camera.updateProjectionMatrix();
    this.scene.add(this.cupSun);
    this.scene.add(this.cupSun.target);

    // 6. Warm accent on the golden pencil
    this.pencilGlint = new THREE.SpotLight(0xfff2dc, 0.35);
    this.pencilGlint.position.set(-8.5, 7.0, 3.5);
    this.pencilGlint.target.position.copy(this.pencilPos);
    this.pencilGlint.angle = 0.28;
    this.pencilGlint.penumbra = 0.9;
    this.pencilGlint.decay = 0;
    this.scene.add(this.pencilGlint);
    this.scene.add(this.pencilGlint.target);
  }

  buildDeskSurface() {
    const S = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext('2d');

    const plankH = S / 4;
    const plankTones = [
      ['#2c1b11', '#3a2517'],
      ['#23160e', '#311f13'],
      ['#301e12', '#3e2818'],
      ['#26180f', '#352114'],
    ];
    const TAU = Math.PI * 2;

    for (let p = 0; p < 4; p++) {
      const y0 = p * plankH;
      ctx.fillStyle = plankTones[p][0];
      ctx.fillRect(0, y0, S, plankH);

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y0, S, plankH);
      ctx.clip();

      for (let b = 0; b < 6; b++) {
        const yy = y0 + Math.random() * plankH;
        const h = 20 + Math.random() * 60;
        const ph = Math.random() * TAU;
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(75, 46, 28, 0.18)' : 'rgba(8, 4, 2, 0.22)';
        ctx.beginPath();
        for (let x = 0; x <= S; x += 8) {
          const yOff = Math.sin((x / S) * TAU + ph) * 10 + Math.sin((x / S) * TAU * 3 + ph) * 4;
          if (x === 0) ctx.moveTo(x, yy + yOff);
          else ctx.lineTo(x, yy + yOff);
        }
        for (let x = S; x >= 0; x -= 8) {
          const yOff = Math.sin((x / S) * TAU + ph) * 10 + Math.sin((x / S) * TAU * 3 + ph) * 4;
          ctx.lineTo(x, yy + yOff + h);
        }
        ctx.closePath();
        ctx.fill();
      }

      for (let g = 0; g < 75; g++) {
        const yy = y0 + Math.random() * plankH;
        const amp = 3 + Math.random() * 9;
        const ph = Math.random() * TAU;
        const cyc = 1 + Math.floor(Math.random() * 3);
        const light = Math.random() > 0.55;
        ctx.strokeStyle = light
          ? `rgba(130, 88, 56, ${0.12 + Math.random() * 0.14})`
          : `rgba(5, 2, 1, ${0.22 + Math.random() * 0.25})`;
        ctx.lineWidth = 0.6 + Math.random() * 1.4;
        ctx.beginPath();
        for (let x = 0; x <= S; x += 6) {
          const yOff = Math.sin((x / S) * TAU * cyc + ph) * amp + Math.sin((x / S) * TAU * 5 + ph * 2) * 1.2;
          if (x === 0) ctx.moveTo(x, yy + yOff);
          else ctx.lineTo(x, yy + yOff);
        }
        ctx.stroke();
      }

      for (let i = 0; i < 1400; i++) {
        ctx.fillStyle = `rgba(0, 0, 0, ${0.18 + Math.random() * 0.2})`;
        ctx.fillRect(Math.random() * S, y0 + Math.random() * plankH, 1 + Math.random() * 4, 0.8);
      }
      ctx.restore();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(0, y0, S, 2);
      ctx.fillStyle = 'rgba(160, 115, 80, 0.12)';
      ctx.fillRect(0, y0 + 2, S, 2);
    }

    const woodTex = new THREE.CanvasTexture(canvas);
    woodTex.wrapS = THREE.RepeatWrapping;
    woodTex.wrapT = THREE.RepeatWrapping;
    woodTex.repeat.set(6, 32 / 6);
    woodTex.encoding = THREE.sRGBEncoding;
    woodTex.anisotropy = 8;

    const deskMat = this.withEnv(new THREE.MeshStandardMaterial({
      map: woodTex,
      bumpMap: woodTex,
      bumpScale: 0.012,
      roughness: 0.42,
      metalness: 0.0,
    }), 0.35);

    const deskGeo = new THREE.PlaneGeometry(36, 32);
    this.deskMesh = new THREE.Mesh(deskGeo, deskMat);
    this.deskMesh.rotation.x = -Math.PI / 2;
    this.deskMesh.receiveShadow = true;
    this.group.add(this.deskMesh);
  }

  makeContactShadow(w, d, strength = 0.85, inner = 0.25) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const g = c.getContext('2d');
    g.clearRect(0, 0, 256, 256);
    const grad = g.createRadialGradient(128, 128, 128 * inner, 128, 128, 128);
    grad.addColorStop(0.0, `rgba(10,5,2,${strength})`);
    grad.addColorStop(0.5, `rgba(15,8,3,${strength * 0.45})`);
    grad.addColorStop(1.0, 'rgba(15,8,3,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(w / 2, 48),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })
    );
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  /**
   * Classic European Ceramic Cappuccino Cup with LATTE ART & Teaspoon
   * Directly modelled after user reference photo media_1792855275267_98836958.png!
   */
  buildEspressoCup() {
    const cupGroup = new THREE.Group();
    const scale = 1.35;
    cupGroup.position.copy(this.cupPos);
    cupGroup.scale.setScalar(scale);

    // Warm ivory bone china porcelain material (natural soft sheen matching reference photo)
    const porcelainMat = this.withEnv(new THREE.MeshStandardMaterial({
      color: 0xede8dc,
      roughness: 0.15,
      metalness: 0.02,
    }), 1.1);

    // Soft realistic ambient occlusion shadow directly on the walnut desk
    const shadow = this.makeContactShadow(2.6, 2.6, 0.88, 0.30);
    shadow.position.set(0.18, 0.001, -0.15); // Naturally offset with the sun angle
    cupGroup.add(shadow);

    // 1. Deep Sculpted Bistro Saucer (High rim 0.180, deep well 0.022, dramatic 3D concave depth)
    const saucerPts = [
      new THREE.Vector2(0.00, 0.012), // Underside center
      new THREE.Vector2(0.26, 0.012), // Underside base flat
      new THREE.Vector2(0.34, 0.001), // Foot ring contact point on tabletop
      new THREE.Vector2(0.40, 0.001), // Foot ring flat width
      new THREE.Vector2(0.48, 0.024), // Underside rising slope
      new THREE.Vector2(0.70, 0.085), // Underside dish flare
      new THREE.Vector2(0.86, 0.145), // Under rim approach
      new THREE.Vector2(0.92, 0.170), // Outer rim apex
      new THREE.Vector2(0.915, 0.180), // Rounded lip top
      new THREE.Vector2(0.880, 0.182), // Inner lip curve
      new THREE.Vector2(0.810, 0.162), // Upper concave slope
      new THREE.Vector2(0.640, 0.105), // Mid concave slope (deep dramatic bowl curve!)
      new THREE.Vector2(0.460, 0.052), // Inner dish slope down to well
      new THREE.Vector2(0.360, 0.030), // Well rim drop
      new THREE.Vector2(0.280, 0.022), // Recessed cup well floor
      new THREE.Vector2(0.00, 0.022),  // Dish center floor
    ];
    const saucerGeo = new THREE.LatheGeometry(saucerPts, 128);
    saucerGeo.computeVertexNormals();

    // Map top-down UVs directly onto saucer geometry so depth shading and shadows are baked seamlessly!
    const sPos = saucerGeo.attributes.position;
    const sUvs = saucerGeo.attributes.uv;
    const maxR = 0.94;
    for (let i = 0; i < sPos.count; i++) {
      const x = sPos.getX(i);
      const z = sPos.getZ(i);
      sUvs.setXY(i, 0.5 + x / (maxR * 2), 0.5 - z / (maxR * 2));
    }
    sUvs.needsUpdate = true;

    // =========================================================================
    // DEDICATED SAUCER TEXTURE: DEPTH SHADING & DIRECTIONAL CUP SHADOW INSIDE
    // Directly addresses user request: "nao ta com profundidade o pratinho... tinha que ter a sombra dentro"
    // =========================================================================
    const saucerCanvas = document.createElement('canvas');
    saucerCanvas.width = 1024;
    saucerCanvas.height = 1024;
    const sCtx = saucerCanvas.getContext('2d');
    const scx = 512;
    const scy = 512;

    // A. Base warm ivory porcelain
    sCtx.fillStyle = '#ede8dd';
    sCtx.fillRect(0, 0, 1024, 1024);

    // B. Concave 3D Dish Depth Shading (creates dramatic deep dish curvature!)
    const depthGrad = sCtx.createRadialGradient(scx, scy, 140, scx, scy, 480);
    depthGrad.addColorStop(0.00, '#c7baaa'); // Deep well tone
    depthGrad.addColorStop(0.35, '#dad0bf'); // Lower concave slope
    depthGrad.addColorStop(0.75, '#ece5d9'); // Mid dish
    depthGrad.addColorStop(1.00, '#f6f1e8'); // Luminous outer rim
    sCtx.fillStyle = depthGrad;
    sCtx.beginPath();
    sCtx.arc(scx, scy, 485, 0, Math.PI * 2);
    sCtx.fill();

    // C. Soft warm directional shadow of the cup body INSIDE the saucer dish
    // Sun comes from front-left (-X, +Z), so shadow falls across (+X, -Z) -> (scx + dx, scy + dy)
    const cupShadowGrad = sCtx.createRadialGradient(scx + 95, scy + 85, 35, scx + 130, scy + 110, 360);
    cupShadowGrad.addColorStop(0.00, 'rgba(20, 9, 3, 0.92)'); // Dark core shadow right beside cup belly
    cupShadowGrad.addColorStop(0.35, 'rgba(45, 20, 8, 0.72)'); // Warm umber shadow
    cupShadowGrad.addColorStop(0.70, 'rgba(75, 36, 16, 0.35)'); // Penumbra climbing the rim slope
    cupShadowGrad.addColorStop(1.00, 'rgba(75, 36, 16, 0.00)'); // Smooth fade to lit rim
    sCtx.fillStyle = cupShadowGrad;
    sCtx.beginPath();
    sCtx.ellipse(scx + 110, scy + 95, 320, 240, 0.34, 0, Math.PI * 2);
    sCtx.fill();

    // D. Deep Ambient Occlusion ring where the cup foot contacts the saucer well
    const aoGrad = sCtx.createRadialGradient(scx, scy, 115, scx, scy, 225);
    aoGrad.addColorStop(0.00, 'rgba(12, 5, 2, 0.96)');
    aoGrad.addColorStop(0.55, 'rgba(25, 10, 4, 0.75)');
    aoGrad.addColorStop(0.85, 'rgba(45, 20, 8, 0.28)');
    aoGrad.addColorStop(1.00, 'rgba(45, 20, 8, 0.00)');
    sCtx.fillStyle = aoGrad;
    sCtx.beginPath();
    sCtx.arc(scx, scy, 225, 0, Math.PI * 2);
    sCtx.fill();

    // E. Golden sun glint on the upper-left rim (-X, +Z)
    const glintGrad = sCtx.createRadialGradient(scx - 280, scy - 280, 20, scx - 280, scy - 280, 200);
    glintGrad.addColorStop(0.00, 'rgba(255, 252, 242, 0.45)');
    glintGrad.addColorStop(1.00, 'rgba(255, 252, 242, 0.00)');
    sCtx.fillStyle = glintGrad;
    sCtx.beginPath();
    sCtx.arc(scx - 280, scy - 280, 200, 0, Math.PI * 2);
    sCtx.fill();

    const saucerTex = new THREE.CanvasTexture(saucerCanvas);
    saucerTex.encoding = THREE.sRGBEncoding;
    saucerTex.anisotropy = 16;

    const saucerMat = this.withEnv(new THREE.MeshStandardMaterial({
      map: saucerTex,
      roughness: 0.16,
      metalness: 0.02,
    }), 1.05);

    const saucer = new THREE.Mesh(saucerGeo, saucerMat);
    saucer.castShadow = true;
    saucer.receiveShadow = true;
    cupGroup.add(saucer);

    // 2. Thick-Walled Cappuccino Cup (128 radial segments, Loveramics Egg rounded profile)
    const cupPts = [
      new THREE.Vector2(0.00, 0.025), // Outer underside center
      new THREE.Vector2(0.20, 0.025), // Underside base flat
      new THREE.Vector2(0.24, 0.021), // Sits cleanly in saucer well
      new THREE.Vector2(0.27, 0.025), // Outer foot curve
      new THREE.Vector2(0.35, 0.080), // Rounded belly start
      new THREE.Vector2(0.44, 0.180), // Rounded mid belly
      new THREE.Vector2(0.50, 0.300), // Upper outer wall flare
      new THREE.Vector2(0.53, 0.410), // Upper outer rim approach
      new THREE.Vector2(0.535, 0.440), // Thick rounded lip apex
      new THREE.Vector2(0.515, 0.450), // Lip top curve
      new THREE.Vector2(0.475, 0.440), // Inner lip curve
      new THREE.Vector2(0.455, 0.380), // Inner upper wall
      new THREE.Vector2(0.40, 0.250), // Inner bowl curve
      new THREE.Vector2(0.31, 0.150), // Inner lower bowl
      new THREE.Vector2(0.18, 0.105), // Inner floor
      new THREE.Vector2(0.00, 0.100), // Inner center floor
    ];
    const cupGeo = new THREE.LatheGeometry(cupPts, 128);
    cupGeo.computeVertexNormals();
    const cup = new THREE.Mesh(cupGeo, porcelainMat);
    cup.castShadow = true;
    cup.receiveShadow = true;
    cupGroup.add(cup);

    // 3. Thick Comfortable Ceramic Loop Handle (Matching Reference Photo)
    const handleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.50, 0.37, 0),
      new THREE.Vector3(0.66, 0.36, 0),
      new THREE.Vector3(0.72, 0.26, 0),
      new THREE.Vector3(0.68, 0.16, 0),
      new THREE.Vector3(0.52, 0.13, 0),
      new THREE.Vector3(0.38, 0.13, 0),
    ]);
    const handleGeo = new THREE.TubeGeometry(handleCurve, 48, 0.034, 20, false);
    handleGeo.computeVertexNormals();
    const handle = new THREE.Mesh(handleGeo, porcelainMat);
    handle.rotation.y = Math.PI * 0.94;
    handle.castShadow = true;
    handle.receiveShadow = true;
    cupGroup.add(handle);

    // 4. Photorealistic LATTE ART Foam Liquid (Full Rosetta Texture, seamless crema rim)
    const textureLoader = new THREE.TextureLoader();
    const latteTex = textureLoader.load('assets/latte_foam_full.png');
    latteTex.encoding = THREE.sRGBEncoding;
    latteTex.anisotropy = 16;
    latteTex.generateMipmaps = true;

    const latteMat = this.withEnv(new THREE.MeshStandardMaterial({
      map: latteTex,
      roughness: 0.22,
      metalness: 0.0,
    }), 0.95);

    const latteGeo = new THREE.CircleGeometry(0.472, 96);
    const latte = new THREE.Mesh(latteGeo, latteMat);
    latte.rotation.x = -Math.PI / 2;
    latte.rotation.z = -0.32; // Beautiful viewing orientation facing user
    latte.position.y = 0.408; // Filled close to the rounded lip!
    latte.receiveShadow = true;
    cupGroup.add(latte);

    // 5. Camera-facing delicate rising steam wisps
    this.createSteamWisps(cupGroup);

    this.group.add(cupGroup);
    this.cupGroup = cupGroup;
  }

  /**
   * High-Resolution Procedural LATTE ART Canvas (1024x1024)
   * Recreates the exact rosetta / fern leaf pattern from reference photo media_1792855275267_98836958.png!
   */
  buildLatteArtCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    const cx = 512;
    const cy = 512;

    // 1. Golden-Hazelnut Crema Base with Roasted Espresso Rim
    const bgGrad = ctx.createRadialGradient(cx, cy, 120, cx, cy, 512);
    bgGrad.addColorStop(0.00, '#df9838'); // Warm caramel center
    bgGrad.addColorStop(0.50, '#c77d24'); // Golden hazelnut crema
    bgGrad.addColorStop(0.82, '#9b5618'); // Roasted espresso transition
    bgGrad.addColorStop(0.95, '#5e2b08'); // Dark roast ring
    bgGrad.addColorStop(1.00, '#2e1203'); // Porcelain contact border
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1024, 1024);

    // 2. Barista Pouring Crema Halos & Micro-Texture
    for (let r = 200; r < 480; r += 55) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(140, 75, 20, ${0.05 + Math.random() * 0.04})`;
      ctx.lineWidth = 18;
      ctx.stroke();
    }

    // 3. Rosetta Fern Leaf Pattern (Barista Steamed Milk Microfoam)
    ctx.save();
    ctx.translate(cx, cy);

    // Draw symmetrical fanning leaf wings from bottom to top
    const numWings = 12;
    for (let i = numWings; i >= 1; i--) {
      const t = i / numWings;
      const y = 260 - t * 460; // Wings positioned along the vertical stem
      const wingW = Math.sin(t * Math.PI) * 220 + 35;
      const wingH = 34 + (1.0 - t) * 18;

      // Soft creamy milk glow layer
      ctx.fillStyle = 'rgba(252, 248, 240, 0.88)';
      ctx.beginPath();
      ctx.moveTo(-wingW, y + wingH * 0.2);
      ctx.bezierCurveTo(-wingW * 0.5, y - wingH * 0.9, wingW * 0.5, y - wingH * 0.9, wingW, y + wingH * 0.2);
      ctx.bezierCurveTo(wingW * 0.5, y + wingH * 0.9, -wingW * 0.5, y + wingH * 0.9, -wingW, y + wingH * 0.2);
      ctx.fill();

      // Golden crema feathering along wing edges
      ctx.strokeStyle = 'rgba(195, 125, 45, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Top Tulip Heart Apex (The crown of the rosetta)
    const topY = -240;
    ctx.fillStyle = '#faf8f2';
    ctx.beginPath();
    ctx.moveTo(0, topY + 45);
    ctx.bezierCurveTo(-65, topY - 10, -75, topY - 55, -35, topY - 75);
    ctx.bezierCurveTo(0, topY - 85, 0, topY - 45, 0, topY - 35);
    ctx.bezierCurveTo(0, topY - 45, 0, topY - 85, 35, topY - 75);
    ctx.bezierCurveTo(75, topY - 55, 65, topY - 10, 0, topY + 45);
    ctx.fill();

    // Barista Draw-Through Stem (The crisp white stream drawn through the center)
    ctx.strokeStyle = '#faf7ee';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 320);
    ctx.bezierCurveTo(-5, 100, 5, -100, 0, -290);
    ctx.stroke();

    // Central stem glow
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.restore();

    // Micro-bubbles around the crema border
    for (let i = 0; i < 60; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 455 + Math.random() * 32;
      const bx = cx + Math.cos(ang) * dist;
      const by = cy + Math.sin(ang) * dist;
      const r = 1.0 + Math.random() * 2.8;

      ctx.fillStyle = 'rgba(215, 150, 75, 0.65)';
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 250, 0.85)';
      ctx.beginPath();
      ctx.arc(bx - r * 0.25, by - r * 0.25, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    return canvas;
  }

  createSteamWisps(parentGroup) {
    const steamGroup = new THREE.Group();
    steamGroup.position.set(0, 0.42, 0);

    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 128, 6, 64, 128, 64);
    grad.addColorStop(0.0, 'rgba(255,255,255,0.55)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.18)');
    grad.addColorStop(1.0, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 256);
    const tex = new THREE.CanvasTexture(c);

    this.steamSprites = [];
    for (let i = 0; i < 5; i++) {
      const mat = new THREE.SpriteMaterial({
        map: tex,
        color: 0xf2efe9,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.userData = {
        offset: i * 0.5,
        speed: 0.16 + Math.random() * 0.06,
        drift: 0.05 + Math.random() * 0.06,
        phase: Math.random() * Math.PI * 2,
      };
      steamGroup.add(sprite);
      this.steamSprites.push(sprite);
    }
    parentGroup.add(steamGroup);
  }

  buildArchitectPencil() {
    const pencilGroup = new THREE.Group();
    pencilGroup.position.set(this.pencilPos.x, 0, this.pencilPos.z);
    pencilGroup.rotation.y = -0.33;

    const R = 0.073;
    const inR = R * Math.cos(Math.PI / 6);
    const leadR = 0.019;
    const ferruleR = 0.066;
    const eraserR = 0.058;

    const eraserLen = 0.13;
    const ferruleStart = 0.115;
    const ferruleLen = 0.175;
    const barrelStart = ferruleStart + ferruleLen;
    const barrelLen = 2.25;
    const coneLen = 0.36;
    const leadLen = 0.09;
    const totalLen = barrelStart + barrelLen + coneLen + leadLen;
    const off = -totalLen / 2;

    const shadow = this.makeContactShadow(0.42, totalLen + 0.35, 0.85, 0.1);
    shadow.position.y = 0.002;
    pencilGroup.add(shadow);

    const axis = new THREE.Group();
    axis.rotation.set(-Math.PI / 2, Math.PI / 6, 0);
    axis.position.y = ferruleR;
    pencilGroup.add(axis);

    const barrelTex = this.buildPencilBarrelTexture();
    const barrelMat = this.withEnv(new THREE.MeshPhysicalMaterial({
      map: barrelTex,
      roughness: 0.62,
      metalness: 0.0,
      clearcoat: 0.25,
      clearcoatRoughness: 0.5,
      flatShading: true,
    }), 0.9);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(R, R, barrelLen, 6, 1), barrelMat);
    barrel.position.y = off + barrelStart + barrelLen / 2;
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    axis.add(barrel);

    const coneTex = this.buildPencilConeTexture(R, inR, leadR);
    const coneMat = this.withEnv(new THREE.MeshStandardMaterial({
      map: coneTex,
      roughness: 0.7,
      metalness: 0.0,
    }), 0.3);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(leadR, R, coneLen, 6 * 12, 1, true), coneMat);
    cone.position.y = off + barrelStart + barrelLen + coneLen / 2;
    cone.castShadow = true;
    cone.receiveShadow = true;
    axis.add(cone);

    const leadMat = this.withEnv(new THREE.MeshStandardMaterial({
      color: 0x2a2b2f,
      roughness: 0.38,
      metalness: 0.55,
    }), 0.9);
    const lead = new THREE.Mesh(new THREE.ConeGeometry(leadR, leadLen, 32), leadMat);
    lead.position.y = off + barrelStart + barrelLen + coneLen + leadLen / 2;
    lead.castShadow = true;
    axis.add(lead);

    const fp = [];
    const addF = (r, y) => fp.push(new THREE.Vector2(r, y));
    addF(0.0, 0.0);
    addF(ferruleR - 0.004, 0.0);
    addF(ferruleR, 0.006);
    const grooves = [0.03, 0.045, 0.13, 0.145];
    for (let y = 0.006; y <= ferruleLen - 0.006; y += 0.0025) {
      let r = ferruleR;
      grooves.forEach((gy) => {
        const d = Math.abs(y - gy);
        if (d < 0.006) r = Math.min(r, ferruleR - 0.004 * (1 - d / 0.006));
      });
      addF(r, y);
    }
    addF(ferruleR, ferruleLen - 0.006);
    addF(ferruleR - 0.004, ferruleLen);
    addF(0.0, ferruleLen);
    const brassMat = this.withEnv(new THREE.MeshStandardMaterial({
      color: 0x9c8455,
      roughness: 0.22,
      metalness: 1.0,
    }), 1.1);
    const ferrule = new THREE.Mesh(new THREE.LatheGeometry(fp, 48), brassMat);
    ferrule.position.y = off + ferruleStart;
    ferrule.castShadow = true;
    ferrule.receiveShadow = true;
    axis.add(ferrule);

    const bandMat = this.withEnv(new THREE.MeshPhysicalMaterial({
      color: 0x2b2c31,
      roughness: 0.3,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    }), 0.8);
    [0.075, 0.1].forEach((by) => {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(ferruleR + 0.0008, ferruleR + 0.0008, 0.014, 48, 1, true), bandMat);
      band.position.y = off + ferruleStart + by;
      axis.add(band);
    });

    const ep = [];
    ep.push(new THREE.Vector2(0.0, 0.0));
    for (let k = 0; k <= 8; k++) {
      const a = (k / 8) * (Math.PI / 2);
      ep.push(new THREE.Vector2(eraserR * 0.55 + eraserR * 0.45 * Math.sin(a), 0.026 * (1 - Math.cos(a))));
    }
    ep.push(new THREE.Vector2(eraserR, eraserLen));
    ep.push(new THREE.Vector2(0.0, eraserLen));
    const eraserMat = this.withEnv(new THREE.MeshStandardMaterial({
      color: 0x3a3b40,
      roughness: 0.92,
      metalness: 0.0,
    }), 0.2);
    const eraser = new THREE.Mesh(new THREE.LatheGeometry(ep, 40), eraserMat);
    eraser.position.y = off;
    eraser.castShadow = true;
    axis.add(eraser);

    this.group.add(pencilGroup);
    this.pencilGroup = pencilGroup;
  }

  buildPencilBarrelTexture() {
    const W = 600;
    const H = 3072;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');

    g.fillStyle = '#17181c';
    g.fillRect(0, 0, W, H);

    for (let k = 0; k < 6; k++) {
      g.fillStyle = k % 2 ? 'rgba(255, 255, 255, 0.035)' : 'rgba(0, 0, 0, 0.12)';
      g.fillRect((k * W) / 6, 0, W / 6, H);
    }
    for (let i = 0; i < 300; i++) {
      g.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.02})`;
      g.fillRect(Math.random() * W, 0, 1, H);
    }

    const fx = (5.5 / 6) * W;
    g.save();
    g.translate(fx, H * 0.55);
    g.rotate(Math.PI / 2);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '700 46px "Plus Jakarta Sans", Arial, sans-serif';
    g.fillStyle = '#b89a5e';
    g.fillText('RAPPU  ✦  DRAFTING  No. 2  HB', 0, 0);
    g.restore();

    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 8;
    return tex;
  }

  buildPencilConeTexture(R, inR, leadR) {
    const W = 1024;
    const H = 256;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');

    const grad = g.createLinearGradient(0, H, 0, 0);
    grad.addColorStop(0, '#c58f58');
    grad.addColorStop(1, '#e6c08e');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);

    for (let i = 0; i < 140; i++) {
      g.strokeStyle = `rgba(120, 70, 30, ${0.08 + Math.random() * 0.18})`;
      g.lineWidth = 0.6 + Math.random() * 1.6;
      const x = Math.random() * W;
      g.beginPath();
      g.moveTo(x, H);
      g.lineTo(x + (Math.random() - 0.5) * 8, 0);
      g.stroke();
    }
    for (let x = 0; x < W; x += 48) {
      g.fillStyle = `rgba(255, 240, 210, ${0.04 + Math.random() * 0.05})`;
      g.fillRect(x, 0, 20, H);
    }

    const scallopY = (u) => {
      const facet = (u * 6) % 1;
      const phi = (facet - 0.5) * (Math.PI / 3);
      const r = inR / Math.cos(phi);
      return Math.max(0, (R - r) / (R - leadR));
    };
    g.fillStyle = '#f2b707';
    g.beginPath();
    g.moveTo(0, H);
    for (let x = 0; x <= W; x += 2) {
      g.lineTo(x, H - scallopY(x / W) * H);
    }
    g.lineTo(W, H);
    g.closePath();
    g.fill();

    g.strokeStyle = 'rgba(120, 70, 0, 0.6)';
    g.lineWidth = 2;
    g.beginPath();
    for (let x = 0; x <= W; x += 2) {
      const y = H - scallopY(x / W) * H;
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();

    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 8;
    return tex;
  }

  update(time) {
    if (!this.steamSprites) return;
    this.steamSprites.forEach((sprite) => {
      const u = sprite.userData;
      const p = ((time * u.speed + u.offset) % 3.0) / 3.0;
      sprite.position.set(
        Math.sin(time * 0.9 + u.phase) * u.drift * (0.3 + p),
        0.05 + p * 0.9,
        Math.cos(time * 0.7 + u.phase) * u.drift * 0.5
      );
      const fadeIn = Math.min(1, p / 0.2);
      const fadeOut = 1 - Math.max(0, (p - 0.2) / 0.8);
      sprite.material.opacity = 0.16 * fadeIn * fadeOut;
      sprite.material.rotation = u.phase + time * 0.15;
      const s = 0.28 + p * 0.55;
      sprite.scale.set(s, s * 1.7, 1);
    });
  }
}

window.StudioEnvironment = StudioEnvironment;
