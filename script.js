// ============================
// ATHACA — Landing Page Scripts
// ============================

// ============================
// Scroll-triggered animations (RUN FIRST — before any 3D code)
// ============================
(function() {
  var fadeObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        fadeObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
  document.querySelectorAll('.fade-up').forEach(function(el) { fadeObs.observe(el); });

  // Nav scroll effect
  var navEl = document.querySelector('.nav');
  window.addEventListener('scroll', function() {
    if (window.scrollY > 20) { navEl.classList.add('scrolled'); }
    else { navEl.classList.remove('scrolled'); }
  }, { passive: true });

  // Smooth anchor scrolling
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      var target = document.querySelector(anchor.getAttribute('href'));
      if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });
})();

// ============================
// 3D Morphing Blob — Premium iridescent orb
// ============================
(function initBlob() {
  const canvas = document.getElementById('blob-canvas');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 4.5);

  const geometry = new THREE.SphereGeometry(1.4, 160, 160);
  const positionAttr = geometry.attributes.position;
  const originalPositions = new Float32Array(positionAttr.array.length);
  originalPositions.set(positionAttr.array);

  // Premium glass-like liquid material
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x5050e0,
    metalness: 0.28,
    roughness: 0.02,
    reflectivity: 1.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.01,
    envMapIntensity: 2.8,
  });

  const blob = new THREE.Mesh(geometry, material);
  scene.add(blob);

  // Blue-indigo dominant lighting (matches logo)
  [[0x4455ee, 3.2, 5, 5, 5], [0x5560e8, 2.8, -5, 3, 3], [0x4466ee, 2.0, 3, -4, -5],
   [0x5050dd, 1.6, -2, 7, -2], [0x4848cc, 1.5, 0, -2, -7]].forEach(([c, i, x, y, z]) => {
    const l = new THREE.DirectionalLight(c, i); l.position.set(x, y, z); scene.add(l);
  });
  scene.add(new THREE.AmbientLight(0x4455cc, 0.35));

  // Vibrant environment sphere for colorful reflections
  const envGeometry = new THREE.SphereGeometry(30, 32, 32);
  const envMaterial = new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true });
  const envColors = new Float32Array(envGeometry.attributes.position.count * 3);
  for (let i = 0; i < envGeometry.attributes.position.count; i++) {
    const ey = envGeometry.attributes.position.getY(i);
    const ex = envGeometry.attributes.position.getX(i);
    const ez = envGeometry.attributes.position.getZ(i);
    const et = (ey + 30) / 60;
    const ea = Math.atan2(ez, ex);
    envColors[i * 3]     = 0.08 + et * 0.18 * Math.max(0, Math.cos(ea * 0.5));
    envColors[i * 3 + 1] = 0.06 + et * 0.14;
    envColors[i * 3 + 2] = 0.32 + et * 0.55 * Math.max(0, Math.sin(ea * 0.5 + 1));
  }
  envGeometry.setAttribute('color', new THREE.BufferAttribute(envColors, 3));
  const envSphere = new THREE.Mesh(envGeometry, envMaterial);
  scene.add(envSphere);

  blob.visible = false;
  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256);
  const cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget);
  scene.add(cubeCamera);
  cubeCamera.position.copy(blob.position);
  cubeCamera.update(renderer, scene);
  material.envMap = cubeRenderTarget.texture;
  material.needsUpdate = true;
  blob.visible = true;
  envSphere.visible = false;

  // --- Shape morph targets ---
  const R = 1.4;

  // Precompute Taubin heart surface: (x²+9y²/4+z²-1)³ = x²z³ + 9y²z³/80
  const heartTargets = new Float32Array(positionAttr.array.length);
  {
    for (let i = 0; i < positionAttr.count; i++) {
      const ox = originalPositions[i * 3];
      const oy = originalPositions[i * 3 + 1];
      const oz = originalPositions[i * 3 + 2];
      const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
      const dX = ox / len, dY = oy / len, dZ = oz / len;
      // Map our_Y → Taubin_Z (asymmetric axis), our_Z → Taubin_Y
      const A = dX * dX + 2.25 * dZ * dZ + dY * dY;
      const B = dY * dY * dY * (dX * dX + 9 * dZ * dZ / 80);
      let lo = 0.01, hi = 2.5;
      for (let j = 0; j < 25; j++) {
        const mid = (lo + hi) / 2;
        const r2 = mid * mid;
        const inner = r2 * A - 1;
        const fVal = inner * inner * inner - r2 * r2 * mid * B;
        if (fVal < 0) lo = mid; else hi = mid;
      }
      const r = (lo + hi) / 2 * R;
      heartTargets[i * 3]     = dX * r;
      heartTargets[i * 3 + 1] = dY * r;
      heartTargets[i * 3 + 2] = dZ * r;
    }
  }
  function aDist(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  // 0: Smooth organic liquid blob
  function shapeBlob(nx, ny, nz, t) {
    const n = Math.sin(nx * 1.8 + t * 0.3) * 0.12
            + Math.sin(ny * 2.0 + t * 0.25 + Math.cos(nz * 1.5)) * 0.10
            + Math.sin(nz * 1.6 + t * 0.28 + Math.sin(nx * 1.3)) * 0.08;
    const r = R * (1 + n);
    return [nx * r, ny * r, nz * r];
  }

  // 1: DNA double helix — crisp dual-strand spiral
  function shapeDNA(nx, ny, nz, t) {
    const theta = Math.atan2(nz, nx);
    const height = ny * R * 2.3;
    const twist = ny * 7.0 + t * 0.4;
    const d1 = aDist(theta, twist);
    const d2 = aDist(theta, twist + Math.PI);
    const sigma = 0.28;
    const s1 = Math.exp(-d1 * d1 / (2 * sigma * sigma));
    const s2 = Math.exp(-d2 * d2 / (2 * sigma * sigma));
    const strand = Math.max(s1, s2);
    const rungOn = Math.pow(Math.max(0, Math.cos(ny * 3.5 * Math.PI)), 16);
    const rungBridge = rungOn * Math.max(0, 1 - strand * 2.5) * 0.5;
    const r = R * 0.02 + R * 0.7 * strand + R * 0.25 * rungBridge;
    return [nx * r, height, nz * r];
  }

  // 2: Pill capsule — flat elongated horizontal capsule
  function shapePill(nx, ny, nz, t) {
    const theta = Math.atan2(nz, nx);
    const u = ny;
    const pillR = R * 0.32;
    const halfL = R * 0.4;
    let along, radius;
    if (u < -0.7) {
      const s = (u + 1) / 0.3;
      const a = (1 - s) * Math.PI * 0.5;
      along = -halfL - pillR * Math.sin(a);
      radius = pillR * Math.cos(a);
    } else if (u > 0.7) {
      const s = (u - 0.7) / 0.3;
      const a = s * Math.PI * 0.5;
      along = halfL + pillR * Math.sin(a);
      radius = pillR * Math.cos(a);
    } else {
      along = u / 0.7 * halfL;
      radius = pillR;
    }
    radius = Math.max(radius, 0.001);
    return [along, Math.cos(theta) * radius, Math.sin(theta) * radius];
  }

  // 3: Water molecule (H2O) — ball-and-stick model
  function shapeMolecule(nx, ny, nz, t) {
    const angle = 104.5 * Math.PI / 180;
    const bondLen = 1.3;
    const oCenter = [0.0, -0.25, 0.0];
    const h1 = [-Math.sin(angle / 2) * bondLen, -0.25 + Math.cos(angle / 2) * bondLen, 0.0];
    const h2 = [ Math.sin(angle / 2) * bondLen, -0.25 + Math.cos(angle / 2) * bondLen, 0.0];
    const atomRadii = [0.6, 0.45, 0.45]; // O bigger, H clearly visible
    const centers = [oCenter, h1, h2];
    const stickR = 0.14;

    // Ray-march: find where the ray from origin along (nx,ny,nz) hits any atom sphere or bond cylinder
    let bestR = R * 0.02; // baseline tiny sphere
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    const dx = nx / len, dy = ny / len, dz = nz / len;

    // Check each atom sphere
    for (let i = 0; i < 3; i++) {
      const cx = centers[i][0], cy = centers[i][1], cz = centers[i][2];
      const ar = atomRadii[i];
      // Ray-sphere intersection: |origin + t*dir - center|² = ar²
      // t² - 2t(dir·center) + |center|² - ar² = 0
      const b = dx * cx + dy * cy + dz * cz;
      const c = cx * cx + cy * cy + cz * cz - ar * ar;
      const disc = b * b - c;
      if (disc > 0) {
        const hit = b + Math.sqrt(disc);
        if (hit > 0 && hit > bestR) bestR = hit;
      }
    }

    // Check each bond cylinder (O-H1, O-H2)
    const bonds = [[0, 1], [0, 2]];
    for (const [i, j] of bonds) {
      const ax = centers[i][0], ay = centers[i][1], az = centers[i][2];
      const bx = centers[j][0] - ax, by = centers[j][1] - ay, bz = centers[j][2] - az;
      const bl = Math.sqrt(bx * bx + by * by + bz * bz);
      const ex = bx / bl, ey = by / bl, ez = bz / bl;
      // Ray-cylinder: solve for t where distance from (t*dx, t*dy, t*dz) to line (a + s*e) = stickR
      const dDotE = dx * ex + dy * ey + dz * ez;
      const aDotE = ax * ex + ay * ey + az * ez;
      const fdx = dx - dDotE * ex, fdy = dy - dDotE * ey, fdz = dz - dDotE * ez;
      const gx = -ax + aDotE * ex, gy = -ay + aDotE * ey, gz = -az + aDotE * ez;
      const A = fdx * fdx + fdy * fdy + fdz * fdz;
      const B = 2 * (fdx * gx + fdy * gy + fdz * gz);
      const C = gx * gx + gy * gy + gz * gz - stickR * stickR;
      const disc2 = B * B - 4 * A * C;
      if (disc2 > 0 && A > 0.0001) {
        const hit = (-B + Math.sqrt(disc2)) / (2 * A);
        if (hit > 0) {
          // Check if hit point is within bond length
          const px = hit * dx - ax, py = hit * dy - ay, pz = hit * dz - az;
          const s = px * ex + py * ey + pz * ez;
          if (s >= 0 && s <= bl && hit > bestR) bestR = hit;
        }
      }
    }

    return [dx * bestR, dy * bestR, dz * bestR];
  }

  // 4: Heart — Taubin heart surface (precomputed)
  function shapeHeart(nx, ny, nz, t, vi) {
    return [heartTargets[vi * 3], heartTargets[vi * 3 + 1], heartTargets[vi * 3 + 2]];
  }

  const shapes = [shapeBlob, shapeDNA, shapeHeart, shapePill, shapeMolecule];
  const shapeDuration = 5.0;
  const transitionTime = 1.8;
  const firstBlobDuration = 0.25; // First blob transitions after 0.25s

  // --- Mouse interaction ---
  let mouseX = 0;
  let mouseY = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;
  document.addEventListener('mousemove', (e) => {
    targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
    targetMouseY = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  // --- Resize ---
  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // --- Animation ---
  const clock = new THREE.Clock();
  let smoothRotY = 0;
  let prevT = 0;

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const dt = t - prevT;
    prevT = t;

    // Smooth mouse
    mouseX += (targetMouseX - mouseX) * 0.05;
    mouseY += (targetMouseY - mouseY) * 0.05;

    // Morph between healthcare/CRO shapes
    const pos = positionAttr.array;
    // First blob is shorter, then normal cycle repeats
    const firstCycleTotal = firstBlobDuration + (shapes.length - 1) * shapeDuration;
    const normalCycleTotal = shapes.length * shapeDuration;
    let currentIdx, nextIdx, curDuration, elapsed;
    if (t < firstCycleTotal) {
      // First cycle: blob is short
      if (t < firstBlobDuration) {
        currentIdx = 0; nextIdx = 1;
        curDuration = firstBlobDuration;
        elapsed = t;
      } else {
        const rem = t - firstBlobDuration;
        currentIdx = 1 + Math.floor(rem / shapeDuration);
        if (currentIdx >= shapes.length) currentIdx = shapes.length - 1;
        nextIdx = (currentIdx + 1) % shapes.length;
        curDuration = shapeDuration;
        elapsed = rem % shapeDuration;
      }
    } else {
      // Subsequent cycles: all normal duration
      const rem = (t - firstCycleTotal) % normalCycleTotal;
      currentIdx = Math.floor(rem / shapeDuration) % shapes.length;
      nextIdx = (currentIdx + 1) % shapes.length;
      curDuration = shapeDuration;
      elapsed = rem % shapeDuration;
    }
    const shapeProgress = elapsed / curDuration;

    // Smooth easing for transition
    let blend = 0;
    const holdTime = curDuration - transitionTime;
    if (elapsed > holdTime) {
      const tNorm = (elapsed - holdTime) / transitionTime;
      blend = tNorm * tNorm * (3 - 2 * tNorm); // smoothstep
    }

    const shapeFnA = shapes[currentIdx];
    const shapeFnB = shapes[nextIdx];

    for (let i = 0; i < pos.length; i += 3) {
      const ox = originalPositions[i];
      const oy = originalPositions[i + 1];
      const oz = originalPositions[i + 2];

      const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
      const nx = ox / len;
      const ny = oy / len;
      const nz = oz / len;

      const vi = i / 3;
      const a = shapeFnA(nx, ny, nz, t, vi);
      const b = shapeFnB(nx, ny, nz, t, vi);

      // Lerp between shapes
      pos[i]     = a[0] + (b[0] - a[0]) * blend;
      pos[i + 1] = a[1] + (b[1] - a[1]) * blend;
      pos[i + 2] = a[2] + (b[2] - a[2]) * blend;
    }
    positionAttr.needsUpdate = true;
    geometry.computeVertexNormals();

    // Steer rotation to face camera when heart is showing
    const heartShowing = currentIdx === 2 || (nextIdx === 2 && blend > 0.3);
    if (heartShowing) {
      // Snap smoothRotY toward nearest multiple of 2PI (front-facing)
      const twoPi = Math.PI * 2;
      const nearest = Math.round(smoothRotY / twoPi) * twoPi;
      smoothRotY += (nearest - smoothRotY) * 0.15;
    } else {
      smoothRotY += 0.15 * dt;
    }
    blob.rotation.y = smoothRotY + mouseX * 0.4;
    blob.rotation.x = (heartShowing ? 0 : Math.sin(t * 0.2) * 0.1) + mouseY * 0.2;
    blob.rotation.z = heartShowing ? 0 : Math.sin(t * 0.15) * 0.03;
    blob.position.y = Math.sin(t * 0.6) * 0.08;
    blob.position.x = Math.sin(t * 0.35) * 0.02;

    renderer.render(scene, camera);
  }

  animate();
})();


// ============================
// Service Card 3D Visualizations
// ============================
(function initServiceVisuals() {
  // Shared glow point texture
  var glowCanvas = document.createElement('canvas');
  glowCanvas.width = 64;
  glowCanvas.height = 64;
  var gctx = glowCanvas.getContext('2d');
  var grad = gctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(60, 70, 180, 1)');
  grad.addColorStop(0.2, 'rgba(50, 65, 170, 0.85)');
  grad.addColorStop(0.5, 'rgba(40, 55, 160, 0.4)');
  grad.addColorStop(1, 'rgba(30, 40, 140, 0)');
  gctx.fillStyle = grad;
  gctx.fillRect(0, 0, 64, 64);
  var glowTex = new THREE.CanvasTexture(glowCanvas);

  // Shared scene setup
  function setupScene(canvasId, camZ) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, premultipliedAlpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = true;
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 0, camZ || 5);
    var l1 = new THREE.DirectionalLight(0x5060e8, 2.5); l1.position.set(3, 4, 5); scene.add(l1);
    var l2 = new THREE.DirectionalLight(0x4448dd, 1.5); l2.position.set(-4, 2, 3); scene.add(l2);
    var l3 = new THREE.DirectionalLight(0x6688ff, 1.0); l3.position.set(0, -3, -5); scene.add(l3);
    scene.add(new THREE.AmbientLight(0x4455cc, 0.5));
    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);
    var isVis = false;
    var obs = new IntersectionObserver(function(e) { isVis = e[0].isIntersecting; }, { threshold: 0.1 });
    obs.observe(canvas);
    return { canvas: canvas, renderer: renderer, scene: scene, camera: camera, visible: function() { return isVis; } };
  }

  // ---- 1. Particle Human Silhouette (Synthetic Patients) ----
  (function() {
    var s = setupScene('canvas-synth', 4.5);
    if (!s) return;
    s.camera.position.set(0, 0.5, 4.5);

    var parts = [
      { cx:0, cy:1.7, cz:0, rx:0.22, ry:0.25, rz:0.2, w:15 },
      { cx:0, cy:1.4, cz:0, rx:0.08, ry:0.1, rz:0.07, w:3 },
      { cx:0, cy:1.15, cz:0, rx:0.38, ry:0.18, rz:0.16, w:20 },
      { cx:0, cy:0.85, cz:0, rx:0.3, ry:0.18, rz:0.15, w:15 },
      { cx:0, cy:0.55, cz:0, rx:0.28, ry:0.15, rz:0.14, w:12 },
      { cx:-0.45, cy:1.05, cz:0, rx:0.07, ry:0.22, rz:0.07, w:8 },
      { cx:0.45, cy:1.05, cz:0, rx:0.07, ry:0.22, rz:0.07, w:8 },
      { cx:-0.5, cy:0.7, cz:0, rx:0.06, ry:0.18, rz:0.06, w:6 },
      { cx:0.5, cy:0.7, cz:0, rx:0.06, ry:0.18, rz:0.06, w:6 },
      { cx:-0.15, cy:0.15, cz:0, rx:0.11, ry:0.28, rz:0.1, w:12 },
      { cx:0.15, cy:0.15, cz:0, rx:0.11, ry:0.28, rz:0.1, w:12 },
      { cx:-0.15, cy:-0.35, cz:0, rx:0.08, ry:0.25, rz:0.08, w:9 },
      { cx:0.15, cy:-0.35, cz:0, rx:0.08, ry:0.25, rz:0.08, w:9 },
    ];

    var totalW = 0;
    for (var pi = 0; pi < parts.length; pi++) totalW += parts[pi].w;
    var count = 900;
    var positions = new Float32Array(count * 3);
    var basePos = new Float32Array(count * 3);
    var colors = new Float32Array(count * 3);
    var idx = 0;

    for (var pi = 0; pi < parts.length; pi++) {
      var part = parts[pi];
      var partCount = Math.round(count * part.w / totalW);
      for (var i = 0; i < partCount && idx < count; i++) {
        var theta = Math.random() * Math.PI * 2;
        var phi = Math.acos(2 * Math.random() - 1);
        var r = Math.pow(Math.random(), 1/3);
        var x = part.cx + Math.sin(phi) * Math.cos(theta) * part.rx * r;
        var y = part.cy + Math.cos(phi) * part.ry * r;
        var z = part.cz + Math.sin(phi) * Math.sin(theta) * part.rz * r;
        positions[idx * 3] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = z;
        basePos[idx * 3] = x;
        basePos[idx * 3 + 1] = y;
        basePos[idx * 3 + 2] = z;
        var ht = (y + 0.8) / 3.0;
        colors[idx * 3] = 0.2 + ht * 0.2;
        colors[idx * 3 + 1] = 0.25 + ht * 0.25;
        colors[idx * 3 + 2] = 0.55 + ht * 0.35;
        idx++;
      }
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    var mat = new THREE.PointsMaterial({
      size: 0.08,
      map: glowTex,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      vertexColors: true,
      sizeAttenuation: true,
      blending: THREE.NormalBlending,
    });
    var pts = new THREE.Points(geo, mat);
    s.scene.add(pts);

    var clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      if (!s.visible()) return;
      var t = clock.getElapsedTime();
      var arr = geo.attributes.position.array;
      for (var i = 0; i < count; i++) {
        var i3 = i * 3;
        arr[i3] = basePos[i3] + Math.sin(t * 1.2 + i * 0.7) * 0.06;
        arr[i3+1] = basePos[i3+1] + Math.cos(t * 1.0 + i * 0.5) * 0.04;
        arr[i3+2] = basePos[i3+2] + Math.sin(t * 0.8 + i * 0.3) * 0.06;
      }
      geo.attributes.position.needsUpdate = true;
      pts.rotation.y = Math.sin(t * 0.3) * 0.6;
      s.renderer.render(s.scene, s.camera);
    }
    animate();
  })();

  // ---- 2. Flowing Pipeline (Agentic AI Workflows) ----
  (function() {
    var s = setupScene('canvas-agent', 5.5);
    if (!s) return;

    var pipeMat = new THREE.MeshPhysicalMaterial({
      color: 0x3040aa, metalness: 0.3, roughness: 0.2,
      transparent: true, opacity: 0.55, clearcoat: 0.5,
    });

    var paths = [
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-2, 0.3, 0), new THREE.Vector3(-0.8, 0.8, 0.4),
        new THREE.Vector3(0, 0.2, -0.2), new THREE.Vector3(0.8, 0.7, 0.2),
        new THREE.Vector3(2, 0.4, 0),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.2, -0.2), new THREE.Vector3(0.3, 0.9, 0.6),
        new THREE.Vector3(0.9, 1.4, 0.3), new THREE.Vector3(1.6, 1.1, 0),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.8, 0.8, 0.4), new THREE.Vector3(-0.4, 0.0, 0.5),
        new THREE.Vector3(0.3, -0.5, 0.2), new THREE.Vector3(1.1, -0.2, 0),
      ]),
    ];

    var pipeGroup = new THREE.Group();
    s.scene.add(pipeGroup);

    paths.forEach(function(path) {
      var tubeGeo = new THREE.TubeGeometry(path, 40, 0.05, 8, false);
      pipeGroup.add(new THREE.Mesh(tubeGeo, pipeMat));
    });

    var particleGeo = new THREE.SphereGeometry(0.06, 8, 8);
    var particleMat = new THREE.MeshPhysicalMaterial({
      color: 0x3050cc, emissive: 0x2030aa, emissiveIntensity: 0.4,
      metalness: 0.5, roughness: 0.1, clearcoat: 1.0,
    });
    var particles = [];
    for (var i = 0; i < 25; i++) {
      var mesh = new THREE.Mesh(particleGeo, particleMat);
      var pathIdx = Math.floor(Math.random() * paths.length);
      particles.push({ mesh: mesh, pathIdx: pathIdx, speed: 0.08 + Math.random() * 0.12, offset: Math.random() });
      pipeGroup.add(mesh);
    }

    var jGeo = new THREE.SphereGeometry(0.1, 12, 12);
    var jMat = new THREE.MeshPhysicalMaterial({
      color: 0x3545b5, metalness: 0.4, roughness: 0.05, clearcoat: 1.0,
    });
    [[-2,0.3,0],[2,0.4,0],[0,0.2,-0.2],[-0.8,0.8,0.4],[1.6,1.1,0],[1.1,-0.2,0]].forEach(function(p) {
      var n = new THREE.Mesh(jGeo, jMat);
      n.position.set(p[0], p[1], p[2]);
      pipeGroup.add(n);
    });

    var clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      if (!s.visible()) return;
      var t = clock.getElapsedTime();
      particles.forEach(function(p) {
        var progress = (p.offset + t * p.speed) % 1;
        var pos = paths[p.pathIdx].getPointAt(progress);
        p.mesh.position.copy(pos);
      });
      pipeGroup.rotation.y = Math.sin(t * 0.12) * 0.35;
      pipeGroup.rotation.x = Math.sin(t * 0.08) * 0.1;
      s.renderer.render(s.scene, s.camera);
    }
    animate();
  })();

  // ---- 3. Layered Shield (AI Strategy & Governance) ----
  (function() {
    var s = setupScene('canvas-govern', 4.5);
    if (!s) return;

    var shieldGroup = new THREE.Group();
    s.scene.add(shieldGroup);

    var shells = [
      { radius: 1.3, detail: 1, faceOpacity: 0.12, wireColor: 0x3545b5, wireOpacity: 0.7, speed: 0.12 },
      { radius: 0.9, detail: 1, faceOpacity: 0.1, wireColor: 0x4055cc, wireOpacity: 0.55, speed: -0.08 },
      { radius: 0.55, detail: 0, faceOpacity: 0.15, wireColor: 0x4560dd, wireOpacity: 0.85, speed: 0.18 },
    ];

    var shellGroups = [];
    shells.forEach(function(sh, i) {
      var group = new THREE.Group();
      var icoGeo = new THREE.IcosahedronGeometry(sh.radius, sh.detail);
      var edges = new THREE.EdgesGeometry(icoGeo);
      var lineMat = new THREE.LineBasicMaterial({ color: sh.wireColor, transparent: true, opacity: sh.wireOpacity });
      group.add(new THREE.LineSegments(edges, lineMat));
      var faceMat = new THREE.MeshPhysicalMaterial({
        color: 0x3040aa, metalness: 0.2, roughness: 0.4,
        transparent: true, opacity: sh.faceOpacity, side: THREE.DoubleSide, clearcoat: 0.3,
      });
      group.add(new THREE.Mesh(icoGeo, faceMat));
      shieldGroup.add(group);
      shellGroups.push({ group: group, speed: sh.speed });
    });

    var coreGeo = new THREE.SphereGeometry(0.22, 16, 16);
    var coreMat = new THREE.MeshPhysicalMaterial({
      color: 0x3050cc, emissive: 0x2040aa, emissiveIntensity: 0.5,
      metalness: 0.5, roughness: 0.05, clearcoat: 1.0,
    });
    var core = new THREE.Mesh(coreGeo, coreMat);
    shieldGroup.add(core);

    var clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      if (!s.visible()) return;
      var t = clock.getElapsedTime();
      shellGroups.forEach(function(sg, i) {
        sg.group.rotation.y = t * sg.speed;
        sg.group.rotation.x = t * sg.speed * 0.7 + i * 0.5;
        var sc = 1 + Math.sin(t * 0.5 + i * 1.2) * 0.03;
        sg.group.scale.setScalar(sc);
      });
      core.scale.setScalar(1 + Math.sin(t * 1.5) * 0.15);
      shieldGroup.rotation.y = t * 0.06;
      s.renderer.render(s.scene, s.camera);
    }
    animate();
  })();
})();

// ============================
// 3D DNA Double Helix (Hero)
// ============================
(function initDNAHelix() {
  var canvas = document.getElementById('hero-dna');
  if (!canvas) return;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.6;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 7);

  // Chrome lighting — high contrast with warm/cool mix
  [[0xffffff, 4.0, 5, 5, 5], [0xccddff, 3.0, -5, 3, 3], [0xffeedd, 2.5, 3, -4, -5],
   [0xaabbff, 2.0, -2, 7, -2], [0xffffff, 2.0, 0, -3, -7], [0xffccaa, 1.5, -4, -2, 4]].forEach(function(cfg) {
    var l = new THREE.DirectionalLight(cfg[0], cfg[1]);
    l.position.set(cfg[2], cfg[3], cfg[4]);
    scene.add(l);
  });
  scene.add(new THREE.AmbientLight(0x8899cc, 0.4));

  // Environment sphere — high-contrast for chrome reflections
  var envGeo = new THREE.SphereGeometry(30, 64, 64);
  var envMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true });
  var envColors = new Float32Array(envGeo.attributes.position.count * 3);
  for (var ei = 0; ei < envGeo.attributes.position.count; ei++) {
    var ey = envGeo.attributes.position.getY(ei);
    var ex = envGeo.attributes.position.getX(ei);
    var ez = envGeo.attributes.position.getZ(ei);
    var et = (ey + 30) / 60;
    var ea = Math.atan2(ez, ex);
    // Bright bands alternating with dark for chrome contrast
    var band = Math.sin(et * Math.PI * 3 + ea * 2) * 0.5 + 0.5;
    var hotspot = Math.pow(Math.max(0, Math.cos(ea - 1.0) * Math.cos((et - 0.6) * Math.PI)), 4);
    envColors[ei * 3]     = 0.03 + band * 0.35 + hotspot * 0.9;
    envColors[ei * 3 + 1] = 0.03 + band * 0.3 + hotspot * 0.85;
    envColors[ei * 3 + 2] = 0.08 + band * 0.5 + hotspot * 0.95;
  }
  envGeo.setAttribute('color', new THREE.BufferAttribute(envColors, 3));
  var envSphere = new THREE.Mesh(envGeo, envMat);
  scene.add(envSphere);

  // Translucent chrome — picks up gradient colors
  var backboneMat = new THREE.MeshPhysicalMaterial({
    color: 0xccccdd, metalness: 0.6, roughness: 0.08,
    reflectivity: 0.9, clearcoat: 1.0, clearcoatRoughness: 0.03, envMapIntensity: 2.5,
    transparent: true, opacity: 0.85,
  });
  var basePairMat = new THREE.MeshPhysicalMaterial({
    color: 0xb0b8d0, metalness: 0.5, roughness: 0.12,
    reflectivity: 0.8, clearcoat: 0.8, clearcoatRoughness: 0.05, envMapIntensity: 2.0,
    transparent: true, opacity: 0.7,
  });
  var nodeMat = new THREE.MeshPhysicalMaterial({
    color: 0xdddde8, metalness: 0.65, roughness: 0.03,
    reflectivity: 1.0, clearcoat: 1.0, clearcoatRoughness: 0.01, envMapIntensity: 3.0,
    transparent: true, opacity: 0.9,
  });

  var sphereGeo = new THREE.SphereGeometry(0.28, 16, 16);
  var smallSphereGeo = new THREE.SphereGeometry(0.18, 12, 12);

  // Tilt group for 30-degree side lean
  var tiltGroup = new THREE.Group();
  tiltGroup.rotation.z = Math.PI / 6;
  scene.add(tiltGroup);

  var dnaGroup = new THREE.Group();
  tiltGroup.add(dnaGroup);

  // Build the double helix
  var turns = 4, pointsPerTurn = 20, totalPoints = turns * pointsPerTurn;
  var helixRadius = 1.8, helixHeight = 24, yStart = -helixHeight / 2;

  function createCylinder(p1, p2, radius, material) {
    var dir = new THREE.Vector3().subVectors(p2, p1);
    var len = dir.length();
    var geo = new THREE.CylinderGeometry(radius, radius, len, 8, 1);
    geo.translate(0, len / 2, 0);
    geo.rotateX(Math.PI / 2);
    var mesh = new THREE.Mesh(geo, material);
    mesh.position.copy(p1);
    mesh.lookAt(p2);
    return mesh;
  }

  // Each node gets its own material for color-shifting
  var colorNodes = [];
  var strand1 = [], strand2 = [];
  for (var i = 0; i <= totalPoints; i++) {
    var t = i / totalPoints;
    var angle = t * turns * Math.PI * 2;
    var y = yStart + t * helixHeight;
    var x1 = Math.cos(angle) * helixRadius, z1 = Math.sin(angle) * helixRadius;
    var x2 = Math.cos(angle + Math.PI) * helixRadius, z2 = Math.sin(angle + Math.PI) * helixRadius;
    strand1.push(new THREE.Vector3(x1, y, z1));
    strand2.push(new THREE.Vector3(x2, y, z2));
    var nm1 = nodeMat.clone(); var n1 = new THREE.Mesh(sphereGeo, nm1); n1.position.set(x1, y, z1); dnaGroup.add(n1);
    var nm2 = nodeMat.clone(); var n2 = new THREE.Mesh(sphereGeo, nm2); n2.position.set(x2, y, z2); dnaGroup.add(n2);
    colorNodes.push({ mat: nm1, t: t, offset: 0 });
    colorNodes.push({ mat: nm2, t: t, offset: 0.5 });
    if (i % 2 === 0 && i < totalPoints) {
      var p1 = new THREE.Vector3(x1, y, z1);
      var p2 = new THREE.Vector3(x2, y, z2);
      var mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      dnaGroup.add(createCylinder(p1, mid, 0.06, basePairMat));
      dnaGroup.add(createCylinder(mid, p2, 0.06, basePairMat));
      var mn = new THREE.Mesh(smallSphereGeo, basePairMat); mn.position.copy(mid); dnaGroup.add(mn);
    }
  }

  for (var i = 0; i < strand1.length - 1; i++) {
    dnaGroup.add(createCylinder(strand1[i], strand1[i + 1], 0.08, backboneMat));
    dnaGroup.add(createCylinder(strand2[i], strand2[i + 1], 0.08, backboneMat));
  }

  // Render env map for chrome reflections (higher res)
  dnaGroup.visible = false;
  var cubeRT = new THREE.WebGLCubeRenderTarget(512);
  var cubeCam = new THREE.CubeCamera(0.1, 100, cubeRT);
  scene.add(cubeCam);
  cubeCam.update(renderer, scene);
  var allMats = [backboneMat, basePairMat, nodeMat];
  colorNodes.forEach(function(cn) { allMats.push(cn.mat); });
  allMats.forEach(function(m) {
    m.envMap = cubeRT.texture;
    m.needsUpdate = true;
  });
  dnaGroup.visible = true;

  function resize() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // Gradient stops matching the hero background (top→bottom = 0→1)
  var gradStops = [
    { pos: 0.00, color: new THREE.Color(0x1a1a2e) },
    { pos: 0.22, color: new THREE.Color(0x1a2240) },
    { pos: 0.30, color: new THREE.Color(0x1c2d50) },
    { pos: 0.38, color: new THREE.Color(0x254068) },
    { pos: 0.46, color: new THREE.Color(0x3a6590) },
    { pos: 0.52, color: new THREE.Color(0x5a80aa) },
    { pos: 0.58, color: new THREE.Color(0x7a6daa) },
    { pos: 0.64, color: new THREE.Color(0x9b7abf) },
    { pos: 0.70, color: new THREE.Color(0xa583c8) },
    { pos: 0.78, color: new THREE.Color(0xb99bd6) },
    { pos: 0.90, color: new THREE.Color(0xdcc8eb) },
    { pos: 1.00, color: new THREE.Color(0xffffff) },
  ];
  function gradientColor(v) {
    v = Math.max(0, Math.min(1, v));
    for (var gi = 0; gi < gradStops.length - 1; gi++) {
      if (v <= gradStops[gi + 1].pos) {
        var local = (v - gradStops[gi].pos) / (gradStops[gi + 1].pos - gradStops[gi].pos);
        return gradStops[gi].color.clone().lerp(gradStops[gi + 1].color, local);
      }
    }
    return gradStops[gradStops.length - 1].color.clone();
  }

  var clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    var t = clock.getElapsedTime();
    dnaGroup.rotation.y = t * 0.3;
    // Tint nodes to match the hero gradient at their vertical position
    for (var ci = 0; ci < colorNodes.length; ci++) {
      var cn = colorNodes[ci];
      // cn.t goes 0→1 from bottom to top of helix; invert so top=dark, bottom=light
      var gradPos = 1.0 - cn.t;
      cn.mat.color.copy(gradientColor(gradPos));
    }
    // Rotate env sphere for shifting chrome reflections
    envSphere.rotation.y = t * 0.15;
    envSphere.rotation.x = Math.sin(t * 0.1) * 0.2;
    // Re-render env map for live reflections
    dnaGroup.visible = false;
    envSphere.visible = true;
    cubeCam.update(renderer, scene);
    dnaGroup.visible = true;
    envSphere.visible = false;
    renderer.render(scene, camera);
  }
  animate();
})();

// ============================
// Research Track Card Visuals
// ============================
(function initTrackVisuals() {
  function setupTrack(canvasId, camZ) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, premultipliedAlpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 0, camZ || 5);
    scene.add(new THREE.DirectionalLight(0x5060e8, 2.0).position.set(3, 3, 5) && scene.children[scene.children.length - 1] || new THREE.Object3D());
    var l1 = new THREE.DirectionalLight(0x5060e8, 2.0); l1.position.set(3, 3, 5); scene.add(l1);
    var l2 = new THREE.DirectionalLight(0x4448dd, 1.2); l2.position.set(-3, 2, 3); scene.add(l2);
    scene.add(new THREE.AmbientLight(0x4455cc, 0.6));
    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);
    var isVis = false;
    var obs = new IntersectionObserver(function(e) { isVis = e[0].isIntersecting; }, { threshold: 0.1 });
    obs.observe(canvas);
    return { renderer: renderer, scene: scene, camera: camera, visible: function() { return isVis; } };
  }

  // ---- Semantic Track: Knowledge Graph ----
  (function() {
    var s = setupTrack('canvas-semantic', 6);
    if (!s) return;
    var group = new THREE.Group();
    s.scene.add(group);

    var nodeMat = new THREE.MeshPhysicalMaterial({ color: 0x3545b5, metalness: 0.4, roughness: 0.1, clearcoat: 1.0 });
    var nodePositions = [
      [-1.2, 0.6, 0], [1.0, 0.8, 0.3], [-0.5, -0.5, 0.4], [1.3, -0.4, -0.2],
      [0, 0.2, -0.5], [-1.0, -0.8, -0.3], [0.5, -0.9, 0.5], [1.5, 0.2, 0.5],
      [-0.3, 1.0, 0.3], [0.8, 0.0, -0.6],
    ];
    var nodes = [];
    nodePositions.forEach(function(p) {
      var size = 0.08 + Math.random() * 0.08;
      var mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 10, 10), nodeMat);
      mesh.position.set(p[0], p[1], p[2]);
      group.add(mesh);
      nodes.push(mesh);
    });

    var edgeMat = new THREE.LineBasicMaterial({ color: 0x4055cc, transparent: true, opacity: 0.5 });
    var edges = [[0,1],[0,4],[1,3],[1,7],[2,5],[2,6],[3,7],[4,8],[4,9],[5,6],[8,0],[9,3],[6,3],[2,4]];
    edges.forEach(function(e) {
      var geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(nodePositions[e[0]][0], nodePositions[e[0]][1], nodePositions[e[0]][2]),
        new THREE.Vector3(nodePositions[e[1]][0], nodePositions[e[1]][1], nodePositions[e[1]][2]),
      ]);
      group.add(new THREE.LineSegments(geo, edgeMat));
    });

    var clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      if (!s.visible()) return;
      var t = clock.getElapsedTime();
      nodes.forEach(function(n, i) {
        n.position.y = nodePositions[i][1] + Math.sin(t * 0.8 + i * 1.1) * 0.08;
        n.position.x = nodePositions[i][0] + Math.cos(t * 0.6 + i * 0.9) * 0.05;
      });
      group.rotation.y = t * 0.15;
      s.renderer.render(s.scene, s.camera);
    }
    animate();
  })();

  // ---- Dynamic Track: 3D Signal Waveform ----
  (function() {
    var s = setupTrack('canvas-dynamic', 5);
    if (!s) return;
    var group = new THREE.Group();
    s.scene.add(group);

    var segCount = 80;
    var positions = new Float32Array(segCount * 3);
    var colors = new Float32Array(segCount * 3);
    for (var i = 0; i < segCount; i++) {
      var x = (i / segCount - 0.5) * 4;
      positions[i * 3] = x;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      var ht = i / segCount;
      colors[i * 3] = 0.2 + ht * 0.15;
      colors[i * 3 + 1] = 0.25 + ht * 0.15;
      colors[i * 3 + 2] = 0.55 + ht * 0.3;
    }
    var lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    lineGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    var lineMat = new THREE.LineBasicMaterial({ vertexColors: true, linewidth: 2 });
    var line = new THREE.Line(lineGeo, lineMat);
    group.add(line);

    var dotGeo = new THREE.SphereGeometry(0.06, 8, 8);
    var dotMat = new THREE.MeshPhysicalMaterial({ color: 0x3050cc, emissive: 0x2030aa, emissiveIntensity: 0.4, clearcoat: 1.0 });
    var dot = new THREE.Mesh(dotGeo, dotMat);
    group.add(dot);

    var clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      if (!s.visible()) return;
      var t = clock.getElapsedTime();
      var arr = lineGeo.attributes.position.array;
      for (var i = 0; i < segCount; i++) {
        var x = (i / segCount - 0.5) * 4;
        var wave = Math.sin(x * 3 - t * 2.5) * 0.4 * Math.exp(-Math.pow(x - Math.sin(t * 0.5) * 1.5, 2) * 0.3);
        wave += Math.sin(x * 5 - t * 4) * 0.15;
        arr[i * 3 + 1] = wave;
      }
      lineGeo.attributes.position.needsUpdate = true;
      var dotIdx = Math.floor(((Math.sin(t * 0.5) + 1) / 2) * (segCount - 1));
      dot.position.set(arr[dotIdx * 3], arr[dotIdx * 3 + 1], 0);
      dot.scale.setScalar(1 + Math.sin(t * 3) * 0.3);
      group.rotation.y = Math.sin(t * 0.2) * 0.3;
      s.renderer.render(s.scene, s.camera);
    }
    animate();
  })();

  // ---- Merged Attention: Double Helix Streams into Glowing Core ----
  (function() {
    var s = setupTrack('canvas-merged', 5);
    if (!s) return;
    var group = new THREE.Group();
    s.scene.add(group);

    var matA = new THREE.MeshPhysicalMaterial({ color: 0x3040b5, metalness: 0.5, roughness: 0.05, clearcoat: 1.0 });
    var matB = new THREE.MeshPhysicalMaterial({ color: 0x5570ee, metalness: 0.5, roughness: 0.05, clearcoat: 1.0 });
    var matCore = new THREE.MeshPhysicalMaterial({ color: 0x4055dd, emissive: 0x3040cc, emissiveIntensity: 0.6, metalness: 0.5, roughness: 0.05, clearcoat: 1.0 });

    // Two helical streams of particles spiraling inward
    var streamCount = 40;
    var streams = [];
    for (var i = 0; i < streamCount; i++) {
      var side = i < streamCount / 2 ? 0 : 1;
      var size = 0.03 + Math.random() * 0.03;
      var mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 6, 6), side === 0 ? matA : matB);
      var offset = (i % (streamCount / 2)) / (streamCount / 2);
      streams.push({ mesh: mesh, side: side, offset: offset, speed: 0.3 + Math.random() * 0.15 });
      group.add(mesh);
    }

    // Glowing core sphere
    var core = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), matCore);
    group.add(core);

    // Pulse rings that expand outward from core
    var ringMat = new THREE.LineBasicMaterial({ color: 0x4560dd, transparent: true, opacity: 0.5 });
    var pulseRings = [];
    for (var r = 0; r < 3; r++) {
      var pts = [];
      for (var j = 0; j <= 48; j++) {
        var a = (j / 48) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0));
      }
      var ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat.clone());
      ring.scale.setScalar(0.01);
      group.add(ring);
      pulseRings.push({ mesh: ring, phase: r * 1.2 });
    }

    // Cross-attention arcs connecting the two streams
    var arcMat = new THREE.LineBasicMaterial({ color: 0x4055cc, transparent: true, opacity: 0.25 });
    var arcs = [];
    for (var a = 0; a < 6; a++) {
      var arcGeo = new THREE.BufferGeometry();
      var arcPos = new Float32Array(12 * 3);
      arcGeo.setAttribute('position', new THREE.BufferAttribute(arcPos, 3));
      var arc = new THREE.Line(arcGeo, arcMat);
      group.add(arc);
      arcs.push({ line: arc, pairIdx: a });
    }

    var clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      if (!s.visible()) return;
      var t = clock.getElapsedTime();

      // Spiral particles inward
      streams.forEach(function(p) {
        var pr = (p.offset + t * p.speed * 0.15) % 1;
        var radius = 1.2 * (1 - pr * pr);
        var angle = pr * Math.PI * 4 + (p.side === 0 ? 0 : Math.PI);
        var x = Math.cos(angle + t * 0.5) * radius;
        var y = Math.sin(angle + t * 0.5) * radius;
        var z = Math.sin(pr * Math.PI * 2) * radius * 0.3;
        p.mesh.position.set(x, y, z);
        var sc = 0.5 + (1 - pr) * 0.8;
        p.mesh.scale.setScalar(sc);
        if (pr > 0.8) {
          p.mesh.material = matCore;
        } else {
          p.mesh.material = p.side === 0 ? matA : matB;
        }
      });

      // Pulsing core
      core.scale.setScalar(1 + Math.sin(t * 2.5) * 0.2);

      // Expanding pulse rings
      pulseRings.forEach(function(pr) {
        var cycle = ((t * 0.6 + pr.phase) % 2.0) / 2.0;
        var sc = cycle * 1.5;
        pr.mesh.scale.setScalar(sc);
        pr.mesh.material.opacity = 0.5 * (1 - cycle);
      });

      // Update cross-attention arcs
      for (var ai = 0; ai < arcs.length; ai++) {
        var sA = streams[ai * 3];
        var sB = streams[streamCount / 2 + ai * 3];
        if (sA && sB) {
          var arr = arcs[ai].line.geometry.attributes.position.array;
          for (var si = 0; si < 12; si++) {
            var blend = si / 11;
            arr[si * 3] = sA.mesh.position.x * (1 - blend) + sB.mesh.position.x * blend;
            arr[si * 3 + 1] = sA.mesh.position.y * (1 - blend) + sB.mesh.position.y * blend;
            arr[si * 3 + 2] = sA.mesh.position.z * (1 - blend) + sB.mesh.position.z * blend + Math.sin(blend * Math.PI) * 0.2;
          }
          arcs[ai].line.geometry.attributes.position.needsUpdate = true;
        }
      }

      group.rotation.z = t * 0.08;
      s.renderer.render(s.scene, s.camera);
    }
    animate();
  })();
})();

// ============================
// Why Athaca Card Visuals
// ============================
(function initWhyVisuals() {
  function setupWhy(canvasId, camZ) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, premultipliedAlpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 0, camZ || 5);
    var l1 = new THREE.DirectionalLight(0x5060e8, 2.0); l1.position.set(3, 3, 5); scene.add(l1);
    var l2 = new THREE.DirectionalLight(0x4448dd, 1.2); l2.position.set(-3, 2, 3); scene.add(l2);
    scene.add(new THREE.AmbientLight(0x4455cc, 0.6));
    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);
    var isVis = false;
    var obs = new IntersectionObserver(function(e) { isVis = e[0].isIntersecting; }, { threshold: 0.1 });
    obs.observe(canvas);
    return { renderer: renderer, scene: scene, camera: camera, visible: function() { return isVis; } };
  }

  // ---- Deep Expertise: Three Intersecting Orbits ----
  (function() {
    var s = setupWhy('canvas-expertise', 5);
    if (!s) return;
    var group = new THREE.Group();
    s.scene.add(group);

    var ringMats = [
      new THREE.LineBasicMaterial({ color: 0x3545b5, transparent: true, opacity: 0.6 }),
      new THREE.LineBasicMaterial({ color: 0x4055cc, transparent: true, opacity: 0.6 }),
      new THREE.LineBasicMaterial({ color: 0x5565e5, transparent: true, opacity: 0.6 }),
    ];
    var ringTilts = [
      { x: 0, z: 0 },
      { x: Math.PI / 3, z: Math.PI / 4 },
      { x: -Math.PI / 4, z: -Math.PI / 3 },
    ];

    var orbiters = [];
    var orbiterMat = new THREE.MeshPhysicalMaterial({ color: 0x3545b5, metalness: 0.4, roughness: 0.1, clearcoat: 1.0 });

    ringTilts.forEach(function(tilt, i) {
      var pts = [];
      for (var j = 0; j <= 64; j++) {
        var a = (j / 64) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * 1.2, Math.sin(a) * 1.2, 0));
      }
      var ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMats[i]);
      ring.rotation.x = tilt.x;
      ring.rotation.z = tilt.z;
      group.add(ring);

      var orb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), orbiterMat);
      group.add(orb);
      orbiters.push({ mesh: orb, tilt: tilt, speed: 0.6 + i * 0.25, offset: i * 2.1 });
    });

    var clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      if (!s.visible()) return;
      var t = clock.getElapsedTime();
      orbiters.forEach(function(o) {
        var a = t * o.speed + o.offset;
        var x = Math.cos(a) * 1.2;
        var y = Math.sin(a) * 1.2;
        var cx = Math.cos(o.tilt.x), sx = Math.sin(o.tilt.x);
        var cz = Math.cos(o.tilt.z), sz = Math.sin(o.tilt.z);
        var y2 = y * cx, z2 = y * sx;
        o.mesh.position.set(x * cz - y2 * sz, x * sz + y2 * cz, z2);
      });
      group.rotation.y = t * 0.1;
      s.renderer.render(s.scene, s.camera);
    }
    animate();
  })();

  // ---- Research-Driven: Rotating Crystal Lattice ----
  (function() {
    var s = setupWhy('canvas-research', 5.5);
    if (!s) return;
    var group = new THREE.Group();
    s.scene.add(group);

    var nodeMat = new THREE.MeshPhysicalMaterial({ color: 0x3545b5, metalness: 0.4, roughness: 0.1, clearcoat: 1.0 });
    var edgeMat = new THREE.LineBasicMaterial({ color: 0x4055cc, transparent: true, opacity: 0.45 });
    var sp = 0.7;
    var latticeNodes = [];

    for (var ix = -1; ix <= 1; ix++) {
      for (var iy = -1; iy <= 1; iy++) {
        for (var iz = -1; iz <= 1; iz++) {
          var p = [ix * sp, iy * sp, iz * sp];
          var mesh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), nodeMat);
          mesh.position.set(p[0], p[1], p[2]);
          group.add(mesh);
          latticeNodes.push(p);
        }
      }
    }

    for (var i = 0; i < latticeNodes.length; i++) {
      for (var j = i + 1; j < latticeNodes.length; j++) {
        var dx = latticeNodes[i][0] - latticeNodes[j][0];
        var dy = latticeNodes[i][1] - latticeNodes[j][1];
        var dz = latticeNodes[i][2] - latticeNodes[j][2];
        if (Math.sqrt(dx*dx + dy*dy + dz*dz) < sp * 1.1) {
          var geo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(latticeNodes[i][0], latticeNodes[i][1], latticeNodes[i][2]),
            new THREE.Vector3(latticeNodes[j][0], latticeNodes[j][1], latticeNodes[j][2]),
          ]);
          group.add(new THREE.LineSegments(geo, edgeMat));
        }
      }
    }

    var clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      if (!s.visible()) return;
      var t = clock.getElapsedTime();
      group.rotation.y = t * 0.2;
      group.rotation.x = Math.sin(t * 0.15) * 0.3;
      s.renderer.render(s.scene, s.camera);
    }
    animate();
  })();

  // ---- Services-Led: Rising Stacked Blocks ----
  (function() {
    var s = setupWhy('canvas-services', 5);
    if (!s) return;
    var group = new THREE.Group();
    s.scene.add(group);

    var heights = [0.5, 0.8, 1.2, 1.6];
    var blockMats = [
      new THREE.MeshPhysicalMaterial({ color: 0x5565e5, metalness: 0.3, roughness: 0.15, clearcoat: 0.8, transparent: true, opacity: 0.7 }),
      new THREE.MeshPhysicalMaterial({ color: 0x4555d5, metalness: 0.3, roughness: 0.15, clearcoat: 0.8, transparent: true, opacity: 0.75 }),
      new THREE.MeshPhysicalMaterial({ color: 0x3545c5, metalness: 0.3, roughness: 0.15, clearcoat: 0.8, transparent: true, opacity: 0.8 }),
      new THREE.MeshPhysicalMaterial({ color: 0x3040b5, metalness: 0.4, roughness: 0.1, clearcoat: 1.0, transparent: true, opacity: 0.85 }),
    ];

    var blocks = [];
    heights.forEach(function(h, i) {
      var mesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, h, 0.35), blockMats[i]);
      var x = (i - 1.5) * 0.5;
      mesh.position.set(x, h / 2 - 0.8, 0);
      group.add(mesh);
      blocks.push({ mesh: mesh, baseH: h, baseY: h / 2 - 0.8 });
    });

    var clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      if (!s.visible()) return;
      var t = clock.getElapsedTime();
      blocks.forEach(function(b, i) {
        var pulse = 1 + Math.sin(t * 1.2 + i * 0.8) * 0.08;
        b.mesh.scale.y = pulse;
        b.mesh.position.y = b.baseY * pulse;
      });
      group.rotation.y = Math.sin(t * 0.2) * 0.4;
      s.renderer.render(s.scene, s.camera);
    }
    animate();
  })();
})();

// ============================
// Engage Step Card Visuals
// ============================
(function initEngageVisuals() {
  function setupEngage(canvasId, camZ) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, premultipliedAlpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 0, camZ || 5);
    var l1 = new THREE.DirectionalLight(0x5060e8, 2.0); l1.position.set(3, 3, 5); scene.add(l1);
    var l2 = new THREE.DirectionalLight(0x4448dd, 1.2); l2.position.set(-3, 2, 3); scene.add(l2);
    scene.add(new THREE.AmbientLight(0x4455cc, 0.6));
    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);
    var isVis = false;
    var obs = new IntersectionObserver(function(e) { isVis = e[0].isIntersecting; }, { threshold: 0.1 });
    obs.observe(canvas);
    return { renderer: renderer, scene: scene, camera: camera, visible: function() { return isVis; } };
  }

  // ---- 01: Pulsing Target / Crosshair ----
  (function() {
    var s = setupEngage('canvas-engage1', 5);
    if (!s) return;
    var group = new THREE.Group();
    s.scene.add(group);

    var ringMat = new THREE.LineBasicMaterial({ color: 0x3545b5, transparent: true, opacity: 0.6 });
    var radii = [1.0, 0.65, 0.3];
    var rings = [];
    radii.forEach(function(r) {
      var pts = [];
      for (var j = 0; j <= 64; j++) {
        var a = (j / 64) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
      }
      var ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat);
      group.add(ring);
      rings.push({ mesh: ring, baseR: r });
    });

    var dotMat = new THREE.MeshPhysicalMaterial({ color: 0x3545b5, metalness: 0.4, roughness: 0.1, clearcoat: 1.0 });
    var dot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), dotMat);
    group.add(dot);

    var clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      if (!s.visible()) return;
      var t = clock.getElapsedTime();
      rings.forEach(function(r, i) {
        var sc = 1 + Math.sin(t * 1.5 + i * 1.0) * 0.1;
        r.mesh.scale.set(sc, sc, 1);
      });
      dot.scale.setScalar(1 + Math.sin(t * 2) * 0.2);
      group.rotation.z = Math.sin(t * 0.3) * 0.15;
      s.renderer.render(s.scene, s.camera);
    }
    animate();
  })();

  // ---- 02: Document with Scanning Line (Clinical/Regulatory) ----
  (function() {
    var s = setupEngage('canvas-engage2', 5);
    if (!s) return;
    var group = new THREE.Group();
    s.scene.add(group);

    var frameMat = new THREE.LineBasicMaterial({ color: 0x3545b5, transparent: true, opacity: 0.7 });
    var framePts = [
      new THREE.Vector3(-0.7, 1.1, 0), new THREE.Vector3(0.7, 1.1, 0),
      new THREE.Vector3(0.7, -1.1, 0), new THREE.Vector3(-0.7, -1.1, 0),
      new THREE.Vector3(-0.7, 1.1, 0),
    ];
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(framePts), frameMat));

    var lineMat = new THREE.LineBasicMaterial({ color: 0x4055cc, transparent: true, opacity: 0.35 });
    for (var i = 0; i < 5; i++) {
      var y = 0.7 - i * 0.35;
      var w = i === 2 ? 0.35 : 0.5;
      var pts = [new THREE.Vector3(-0.5, y, 0), new THREE.Vector3(-0.5 + w * 2, y, 0)];
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
    }

    var scanMat = new THREE.LineBasicMaterial({ color: 0x4560dd, transparent: true, opacity: 0.8 });
    var scanPts = [new THREE.Vector3(-0.7, 0, 0), new THREE.Vector3(0.7, 0, 0)];
    var scanLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(scanPts), scanMat);
    group.add(scanLine);

    var checkMat = new THREE.MeshPhysicalMaterial({ color: 0x3545b5, metalness: 0.4, roughness: 0.1, clearcoat: 1.0 });
    var checkDot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), checkMat);
    checkDot.position.set(0.5, -0.8, 0.1);
    checkDot.visible = false;
    group.add(checkDot);

    var clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      if (!s.visible()) return;
      var t = clock.getElapsedTime();
      var cycle = (t * 0.4) % 1;
      var scanY = 1.1 - cycle * 2.2;
      scanLine.position.y = scanY;
      checkDot.visible = cycle > 0.85;
      checkDot.scale.setScalar(cycle > 0.85 ? 1 + Math.sin(t * 4) * 0.2 : 0);
      group.rotation.y = Math.sin(t * 0.2) * 0.15;
      s.renderer.render(s.scene, s.camera);
    }
    animate();
  })();

  // ---- 03: Assembling Layers ----
  (function() {
    var s = setupEngage('canvas-engage3', 5.5);
    if (!s) return;
    var group = new THREE.Group();
    s.scene.add(group);

    var layerMats = [
      new THREE.MeshPhysicalMaterial({ color: 0x5565e5, metalness: 0.3, roughness: 0.15, clearcoat: 0.8, transparent: true, opacity: 0.6 }),
      new THREE.MeshPhysicalMaterial({ color: 0x4555d5, metalness: 0.3, roughness: 0.15, clearcoat: 0.8, transparent: true, opacity: 0.65 }),
      new THREE.MeshPhysicalMaterial({ color: 0x3545c5, metalness: 0.3, roughness: 0.15, clearcoat: 0.8, transparent: true, opacity: 0.7 }),
      new THREE.MeshPhysicalMaterial({ color: 0x3040b5, metalness: 0.4, roughness: 0.1, clearcoat: 1.0, transparent: true, opacity: 0.8 }),
    ];
    var edgeMat = new THREE.LineBasicMaterial({ color: 0x3545b5, transparent: true, opacity: 0.5 });

    var layers = [];
    for (var i = 0; i < 4; i++) {
      var geo = new THREE.BoxGeometry(1.2, 0.15, 0.8);
      var mesh = new THREE.Mesh(geo, layerMats[i]);
      var edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat);
      var layerGroup = new THREE.Group();
      layerGroup.add(mesh);
      layerGroup.add(edges);
      layerGroup.position.y = (i - 1.5) * 0.35;
      group.add(layerGroup);
      layers.push({ group: layerGroup, baseY: (i - 1.5) * 0.35 });
    }

    var clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      if (!s.visible()) return;
      var t = clock.getElapsedTime();
      layers.forEach(function(l, i) {
        var spread = Math.sin(t * 0.8) * 0.12;
        l.group.position.y = l.baseY + (i - 1.5) * spread;
      });
      group.rotation.y = t * 0.15;
      group.rotation.x = 0.3;
      s.renderer.render(s.scene, s.camera);
    }
    animate();
  })();

  // ---- 04: Two Orbits Linking ----
  (function() {
    var s = setupEngage('canvas-engage4', 5);
    if (!s) return;
    var group = new THREE.Group();
    s.scene.add(group);

    var orbMat = new THREE.MeshPhysicalMaterial({ color: 0x3545b5, metalness: 0.4, roughness: 0.1, clearcoat: 1.0 });
    var orbA = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), orbMat);
    var orbB = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), new THREE.MeshPhysicalMaterial({ color: 0x4560dd, metalness: 0.4, roughness: 0.1, clearcoat: 1.0 }));
    group.add(orbA);
    group.add(orbB);

    var linkMat = new THREE.LineBasicMaterial({ color: 0x4055cc, transparent: true, opacity: 0.5 });
    var linkGeo = new THREE.BufferGeometry();
    var linkPositions = new Float32Array(6);
    linkGeo.setAttribute('position', new THREE.BufferAttribute(linkPositions, 3));
    var link = new THREE.Line(linkGeo, linkMat);
    group.add(link);

    var trailMatA = new THREE.LineBasicMaterial({ color: 0x3545b5, transparent: true, opacity: 0.3 });
    var trailMatB = new THREE.LineBasicMaterial({ color: 0x4560dd, transparent: true, opacity: 0.3 });
    var trailPtsA = [], trailPtsB = [];
    for (var i = 0; i <= 64; i++) {
      var a = (i / 64) * Math.PI * 2;
      trailPtsA.push(new THREE.Vector3(Math.cos(a) * 0.9 - 0.35, Math.sin(a) * 0.9, 0));
      trailPtsB.push(new THREE.Vector3(Math.cos(a) * 0.9 + 0.35, Math.sin(a) * 0.9, 0));
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(trailPtsA), trailMatA));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(trailPtsB), trailMatB));

    var clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      if (!s.visible()) return;
      var t = clock.getElapsedTime();
      var aA = t * 0.7;
      var aB = t * 0.7 + Math.PI;
      orbA.position.set(Math.cos(aA) * 0.9 - 0.35, Math.sin(aA) * 0.9, 0);
      orbB.position.set(Math.cos(aB) * 0.9 + 0.35, Math.sin(aB) * 0.9, 0);
      var lArr = linkGeo.attributes.position.array;
      lArr[0] = orbA.position.x; lArr[1] = orbA.position.y; lArr[2] = 0;
      lArr[3] = orbB.position.x; lArr[4] = orbB.position.y; lArr[5] = 0;
      linkGeo.attributes.position.needsUpdate = true;
      group.rotation.y = Math.sin(t * 0.2) * 0.25;
      s.renderer.render(s.scene, s.camera);
    }
    animate();
  })();
})();
