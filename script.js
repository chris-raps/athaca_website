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
// Service Card Mini-Blobs
// ============================
(function initServiceBlobs() {
  const configs = [
    { id: 'canvas-synth', shape: 'dna',    color: 0x4850dd },
    { id: 'canvas-agent', shape: 'nodes',  color: 0x4555cc },
    { id: 'canvas-govern', shape: 'shield', color: 0x5050e0 },
  ];

  configs.forEach(cfg => {
    const canvas = document.getElementById(cfg.id);
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 3.8);

    const geometry = new THREE.SphereGeometry(1.0, 80, 80);
    const posAttr = geometry.attributes.position;
    const origPos = new Float32Array(posAttr.array.length);
    origPos.set(posAttr.array);

    const material = new THREE.MeshPhysicalMaterial({
      color: cfg.color,
      metalness: 0.3,
      roughness: 0.04,
      reflectivity: 1.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      envMapIntensity: 2.5,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Lights — pink/blue
    const l1 = new THREE.DirectionalLight(0x6688ff, 2.5);
    l1.position.set(3, 4, 5);
    scene.add(l1);
    const l2 = new THREE.DirectionalLight(0xff66aa, 1.8);
    l2.position.set(-4, 2, 3);
    scene.add(l2);
    const l3 = new THREE.DirectionalLight(0x4488ff, 1.2);
    l3.position.set(2, -3, -4);
    scene.add(l3);
    scene.add(new THREE.AmbientLight(0x8888cc, 0.25));

    // Simple env map
    const envGeo = new THREE.SphereGeometry(20, 16, 16);
    const envMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true });
    const eColors = new Float32Array(envGeo.attributes.position.count * 3);
    for (let i = 0; i < envGeo.attributes.position.count; i++) {
      const y = envGeo.attributes.position.getY(i);
      const t = (y + 20) / 40;
      eColors[i*3]   = 0.06 + t * 0.18;
      eColors[i*3+1] = 0.04 + t * 0.1;
      eColors[i*3+2] = 0.1 + t * 0.2;
    }
    envGeo.setAttribute('color', new THREE.BufferAttribute(eColors, 3));
    const envMesh = new THREE.Mesh(envGeo, envMat);
    scene.add(envMesh);

    const cubeRT = new THREE.WebGLCubeRenderTarget(128);
    const cubeCam = new THREE.CubeCamera(0.1, 100, cubeRT);
    scene.add(cubeCam);
    mesh.visible = false;
    cubeCam.update(renderer, scene);
    material.envMap = cubeRT.texture;
    material.needsUpdate = true;
    mesh.visible = true;
    envMesh.visible = false;

    // Shape functions for each service
    const Rm = 1.0;

    function shapeDNAMini(nx, ny, nz, t) {
      const theta = Math.atan2(nz, nx);
      const yPos = ny * 3.5;
      const twist = yPos * 3.0 + t * 0.8;
      function aDist(a, b) { let d=a-b; while(d>Math.PI)d-=Math.PI*2; while(d<-Math.PI)d+=Math.PI*2; return d; }
      const d1 = aDist(theta, twist);
      const d2 = aDist(theta, twist + Math.PI);
      const s = Math.max(Math.exp(-d1*d1*2.5), Math.exp(-d2*d2*2.5));
      const rung = Math.pow(Math.max(0, Math.cos(yPos*5.5)), 8) * (1-s) * 0.3;
      const r = Rm * (0.1 + s * 0.8 + rung);
      return [nx*r, ny*Rm*1.8, nz*r];
    }

    function shapeNodes(nx, ny, nz, t) {
      // Network of interconnected nodes
      const centers = [
        [0.0, 0.7, 0.0], [0.65, 0.0, 0.3], [-0.5, 0.1, 0.55],
        [0.2, -0.6, -0.3], [-0.3, -0.4, -0.6], [0.5, 0.4, -0.5],
      ];
      let nodeVal = 0;
      for (const c of centers) {
        const dx = nx-c[0], dy = ny-c[1], dz = nz-c[2];
        nodeVal += Math.exp(-Math.sqrt(dx*dx+dy*dy+dz*dz) * 5.0);
      }
      // Thin connections between all pairs
      let bondVal = 0;
      for (let i = 0; i < centers.length; i++) {
        for (let j = i+1; j < centers.length; j++) {
          const ax=centers[i][0], ay=centers[i][1], az=centers[i][2];
          const bx=centers[j][0]-ax, by=centers[j][1]-ay, bz=centers[j][2]-az;
          const bl = Math.sqrt(bx*bx+by*by+bz*bz);
          const ex=bx/bl, ey=by/bl, ez=bz/bl;
          const px=nx-ax, py=ny-ay, pz=nz-az;
          const dot = Math.max(0, Math.min(bl, px*ex+py*ey+pz*ez));
          const cx2=px-ex*dot, cy2=py-ey*dot, cz2=pz-ez*dot;
          const perp = Math.sqrt(cx2*cx2+cy2*cy2+cz2*cz2);
          bondVal += Math.exp(-perp*18) * 0.15;
        }
      }
      const r = Rm * (0.12 + nodeVal * 0.9 + bondVal);
      const noise = Math.sin(nx*4+ny*3+nz*5+t*0.5)*0.01;
      return [nx*(r+noise), ny*(r+noise), nz*(r+noise)];
    }

    function shapeShield(nx, ny, nz, t) {
      // Shield / governance framework shape
      const theta = Math.atan2(nz, nx);
      // Pointed bottom, rounded top
      let shieldR;
      if (ny > 0.2) {
        // Top dome
        shieldR = Rm * 0.8;
      } else if (ny > -0.4) {
        // Tapering middle
        const taper = 1.0 - Math.pow(Math.abs(ny - 0.2) / 0.6, 0.8) * 0.3;
        shieldR = Rm * 0.8 * taper;
      } else {
        // Bottom point
        const pointT = Math.min((-ny - 0.4) / 0.6, 1.0);
        shieldR = Rm * 0.56 * (1.0 - pointT * pointT);
      }
      shieldR = Math.max(shieldR, Rm * 0.04);

      // Front/back flattening for shield shape
      const flatFactor = 1.0 - Math.abs(Math.sin(theta)) * 0.0;
      // Slight vertical lines for governance/structure feel
      const lines = Math.pow(Math.abs(Math.cos(theta * 3)), 20) * 0.08;

      const r = shieldR + lines * Rm;
      const noise = Math.sin(nx*3+ny*5+nz*4+t*0.4)*0.01;
      return [nx*(r+noise), ny*(r+noise)*1.2, nz*(r+noise)];
    }

    const shapeFn = cfg.shape === 'dna' ? shapeDNAMini :
                    cfg.shape === 'nodes' ? shapeNodes : shapeShield;

    const clock = new THREE.Clock();

    function resize() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();

    // Only animate when visible
    let isVisible = false;
    const observer = new IntersectionObserver(entries => {
      isVisible = entries[0].isIntersecting;
    }, { threshold: 0.1 });
    observer.observe(canvas);

    function animate() {
      requestAnimationFrame(animate);
      if (!isVisible) return;

      const t = clock.getElapsedTime();
      const pos = posAttr.array;

      for (let i = 0; i < pos.length; i += 3) {
        const ox = origPos[i], oy = origPos[i+1], oz = origPos[i+2];
        const len = Math.sqrt(ox*ox + oy*oy + oz*oz);
        const nxi = ox/len, nyi = oy/len, nzi = oz/len;

        // Gentle breathing + shape
        const breathe = 1.0 + Math.sin(t * 0.8) * 0.03;
        const [sx, sy, sz] = shapeFn(nxi, nyi, nzi, t);
        pos[i]   = sx * breathe;
        pos[i+1] = sy * breathe;
        pos[i+2] = sz * breathe;
      }
      posAttr.needsUpdate = true;
      geometry.computeVertexNormals();

      mesh.rotation.y = t * 0.25;
      mesh.rotation.x = Math.sin(t * 0.3) * 0.1;
      mesh.position.y = Math.sin(t * 0.6) * 0.05;

      renderer.render(scene, camera);
    }

    animate();
    window.addEventListener('resize', resize);
  });
})();

// ============================
// Roadmap Morphing Blob (scroll-driven)
// ============================
(function initRoadmapBlob() {
  const canvas = document.getElementById('roadmap-blob');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 4.0);

  const geometry = new THREE.SphereGeometry(1.2, 96, 96);
  const posAttr = geometry.attributes.position;
  const origPos = new Float32Array(posAttr.array.length);
  origPos.set(posAttr.array);

  const material = new THREE.MeshPhysicalMaterial({
    color: 0x5050e0,
    metalness: 0.28,
    roughness: 0.03,
    reflectivity: 1.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.01,
    envMapIntensity: 2.8,
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Lights
  scene.add(Object.assign(new THREE.DirectionalLight(0x6688ff, 2.5), { position: new THREE.Vector3(3, 4, 5) }));
  scene.add(Object.assign(new THREE.DirectionalLight(0xff66aa, 1.8), { position: new THREE.Vector3(-4, 2, 3) }));
  scene.add(Object.assign(new THREE.DirectionalLight(0x4488ff, 1.3), { position: new THREE.Vector3(2, -3, -4) }));
  scene.add(new THREE.AmbientLight(0x8888cc, 0.25));

  // Env map
  const envGeo = new THREE.SphereGeometry(20, 16, 16);
  const envMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true });
  const eCol = new Float32Array(envGeo.attributes.position.count * 3);
  for (let i = 0; i < envGeo.attributes.position.count; i++) {
    const y = envGeo.attributes.position.getY(i);
    const tt = (y + 20) / 40;
    eCol[i*3] = 0.06 + tt * 0.18;
    eCol[i*3+1] = 0.04 + tt * 0.1;
    eCol[i*3+2] = 0.1 + tt * 0.22;
  }
  envGeo.setAttribute('color', new THREE.BufferAttribute(eCol, 3));
  const envMesh = new THREE.Mesh(envGeo, envMat);
  scene.add(envMesh);
  const cubeRT = new THREE.WebGLCubeRenderTarget(128);
  const cubeCam = new THREE.CubeCamera(0.1, 100, cubeRT);
  scene.add(cubeCam);
  mesh.visible = false;
  cubeCam.update(renderer, scene);
  material.envMap = cubeRT.texture;
  material.needsUpdate = true;
  mesh.visible = true;
  envMesh.visible = false;

  const Rm = 1.2;
  function aDist(a, b) { let d=a-b; while(d>Math.PI)d-=Math.PI*2; while(d<-Math.PI)d+=Math.PI*2; return d; }

  // Step 1: Magnifying glass / target — finding the problem
  function shapeTarget(nx, ny, nz, t) {
    const horiz = Math.sqrt(nx*nx + nz*nz);
    // Disc shape
    const disc = Math.exp(-ny*ny*12.0);
    // Ring pattern
    const ring1 = Math.exp(-Math.pow(horiz-0.6, 2)*40) * disc;
    const ring2 = Math.exp(-Math.pow(horiz-0.3, 2)*40) * disc;
    const center = Math.exp(-horiz*horiz*15) * disc;
    // Handle
    const handleAngle = Math.atan2(nz, nx);
    const handleDir = Math.exp(-aDist(handleAngle, -0.7)*aDist(handleAngle, -0.7)*4.0);
    const handleOn = (horiz > 0.6) ? handleDir * Math.exp(-ny*ny*8) * 0.5 : 0;
    const r = Rm * (0.12 + disc*0.3 + ring1*0.35 + ring2*0.25 + center*0.3 + handleOn);
    return [nx*r, ny*r, nz*r];
  }

  // Step 2: Shield — regulatory compliance
  function shapeShield(nx, ny, nz, t) {
    let sr;
    if (ny > 0.2) {
      sr = Rm * 0.85;
    } else if (ny > -0.3) {
      sr = Rm * 0.85 * (1.0 - Math.pow((0.2-ny)/0.5, 0.7)*0.25);
    } else {
      const pt = Math.min((-ny - 0.3) / 0.7, 1.0);
      sr = Rm * 0.64 * (1.0 - pt*pt);
    }
    sr = Math.max(sr, Rm * 0.03);
    const lines = Math.pow(Math.abs(Math.cos(Math.atan2(nz,nx)*4)), 25)*0.04;
    return [nx*(sr+lines), ny*(sr+lines)*1.25, nz*(sr+lines)];
  }

  // Step 3: Gear — production/operations
  function shapeGear(nx, ny, nz, t) {
    const theta = Math.atan2(nz, nx);
    const disc = Math.exp(-ny*ny*6.0);
    const teeth = 8;
    const toothVal = Math.pow(Math.max(0, Math.cos(theta*teeth)), 3.0) * 0.2;
    const rim = Math.exp(-Math.pow(Math.sqrt(nx*nx+nz*nz)-0.7, 2)*20) * disc;
    const hub = Math.exp(-(nx*nx+nz*nz)*8) * disc;
    // Spokes
    const spokeCount = 4;
    const spoke = Math.pow(Math.max(0, Math.cos(theta*spokeCount)), 8) * 0.15 * disc;
    const r = Rm * (0.1 + disc*0.15 + rim*0.4 + hub*0.35 + toothVal*disc + spoke);
    return [nx*r, ny*r*0.7, nz*r];
  }

  // Step 4: Handshake / connected circles — partnership
  function shapePartner(nx, ny, nz, t) {
    const c1 = [-0.35, 0, 0], c2 = [0.35, 0, 0];
    const d1x=nx-c1[0], d1y=ny-c1[1], d1z=nz-c1[2];
    const d2x=nx-c2[0], d2y=ny-c2[1], d2z=nz-c2[2];
    const dist1 = Math.sqrt(d1x*d1x+d1y*d1y+d1z*d1z);
    const dist2 = Math.sqrt(d2x*d2x+d2y*d2y+d2z*d2z);
    const sphere1 = Math.exp(-dist1*5.0);
    const sphere2 = Math.exp(-dist2*5.0);
    // Overlap region (connection)
    const overlap = Math.exp(-Math.abs(nx)*6) * Math.exp(-ny*ny*3) * 0.3;
    const r = Rm * (0.1 + sphere1*0.75 + sphere2*0.75 + overlap);
    const noise = Math.sin(nx*3+ny*4+nz*3+t*0.4)*0.01;
    return [nx*(r+noise), ny*(r+noise), nz*(r+noise)];
  }

  const roadmapShapes = [shapeTarget, shapeShield, shapeGear, shapePartner];

  // Track active step based on scroll
  let activeStep = 0;
  let targetStep = 0;
  let blendProgress = 0;

  const steps = document.querySelectorAll('.roadmap-step');
  const dots = document.querySelectorAll('.step-dot');

  const stepObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const idx = parseInt(entry.target.dataset.step);
        targetStep = idx;
        // Update active classes
        steps.forEach(s => s.classList.remove('active'));
        entry.target.classList.add('active');
        dots.forEach(d => d.classList.remove('active'));
        if (dots[idx]) dots[idx].classList.add('active');
      }
    });
  }, { threshold: 0.5, rootMargin: '-20% 0px -20% 0px' });

  steps.forEach(s => stepObserver.observe(s));
  // Set first step active by default
  if (steps[0]) steps[0].classList.add('active');

  // Dot clicks
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.dataset.step);
      if (steps[idx]) steps[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  const clock = new THREE.Clock();
  let isVisible = false;
  const visObs = new IntersectionObserver(entries => {
    isVisible = entries[0].isIntersecting;
  }, { threshold: 0.05 });
  visObs.observe(canvas);

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  function animate() {
    requestAnimationFrame(animate);
    if (!isVisible) return;

    const t = clock.getElapsedTime();

    // Smooth blend between steps
    if (activeStep !== targetStep) {
      blendProgress += 0.025;
      if (blendProgress >= 1.0) {
        activeStep = targetStep;
        blendProgress = 0;
      }
    }

    const shapeFnA = roadmapShapes[activeStep] || roadmapShapes[0];
    const shapeFnB = roadmapShapes[targetStep] || roadmapShapes[0];
    const blend = blendProgress * blendProgress * (3 - 2 * blendProgress); // smoothstep

    const pos = posAttr.array;
    for (let i = 0; i < pos.length; i += 3) {
      const ox = origPos[i], oy = origPos[i+1], oz = origPos[i+2];
      const len = Math.sqrt(ox*ox + oy*oy + oz*oz);
      const nxi = ox/len, nyi = oy/len, nzi = oz/len;

      const a = shapeFnA(nxi, nyi, nzi, t);
      const b = shapeFnB(nxi, nyi, nzi, t);

      const breathe = 1.0 + Math.sin(t * 0.8) * 0.02;
      pos[i]   = (a[0] + (b[0]-a[0])*blend) * breathe;
      pos[i+1] = (a[1] + (b[1]-a[1])*blend) * breathe;
      pos[i+2] = (a[2] + (b[2]-a[2])*blend) * breathe;
    }
    posAttr.needsUpdate = true;
    geometry.computeVertexNormals();

    mesh.rotation.y = t * 0.2;
    mesh.rotation.x = Math.sin(t * 0.3) * 0.08;
    mesh.position.y = Math.sin(t * 0.6) * 0.04;

    renderer.render(scene, camera);
  }

  animate();
})();

// ============================
// 3D DNA Double Helix
// ============================
(function initDNAHelix() {
  const canvas = document.getElementById('hero-dna');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 14);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x4455cc, 0.3);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0x5060e8, 2.5);
  mainLight.position.set(5, 8, 5);
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0x4448dd, 1.5);
  fillLight.position.set(-5, -3, 3);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x7788ff, 1.2);
  rimLight.position.set(0, 5, -8);
  scene.add(rimLight);

  // Materials
  const backboneMat = new THREE.MeshPhysicalMaterial({
    color: 0x4050dd,
    metalness: 0.4,
    roughness: 0.15,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
  });

  const basePairMat = new THREE.MeshPhysicalMaterial({
    color: 0x6070ee,
    metalness: 0.3,
    roughness: 0.2,
    clearcoat: 0.6,
    clearcoatRoughness: 0.15,
  });

  const nodeMat = new THREE.MeshPhysicalMaterial({
    color: 0x5565e5,
    metalness: 0.5,
    roughness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });

  // Geometry templates
  const sphereGeo = new THREE.SphereGeometry(0.28, 16, 16);
  const smallSphereGeo = new THREE.SphereGeometry(0.18, 12, 12);

  // DNA group
  const dnaGroup = new THREE.Group();
  scene.add(dnaGroup);

  // Build the double helix
  const turns = 4;
  const pointsPerTurn = 20;
  const totalPoints = turns * pointsPerTurn;
  const helixRadius = 1.8;
  const helixHeight = 24;
  const yStart = -helixHeight / 2;

  // Function to create a cylinder between two points
  function createCylinder(p1, p2, radius, material) {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(radius, radius, len, 8, 1);
    geo.translate(0, len / 2, 0);
    geo.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.copy(p1);
    mesh.lookAt(p2);
    return mesh;
  }

  const strand1Points = [];
  const strand2Points = [];

  for (let i = 0; i <= totalPoints; i++) {
    const t = i / totalPoints;
    const angle = t * turns * Math.PI * 2;
    const y = yStart + t * helixHeight;

    // Strand 1
    const x1 = Math.cos(angle) * helixRadius;
    const z1 = Math.sin(angle) * helixRadius;
    strand1Points.push(new THREE.Vector3(x1, y, z1));

    // Strand 2 (offset by PI)
    const x2 = Math.cos(angle + Math.PI) * helixRadius;
    const z2 = Math.sin(angle + Math.PI) * helixRadius;
    strand2Points.push(new THREE.Vector3(x2, y, z2));

    // Node spheres on backbone
    const node1 = new THREE.Mesh(sphereGeo, nodeMat);
    node1.position.set(x1, y, z1);
    dnaGroup.add(node1);

    const node2 = new THREE.Mesh(sphereGeo, nodeMat);
    node2.position.set(x2, y, z2);
    dnaGroup.add(node2);

    // Base pair rungs (every 2 points)
    if (i % 2 === 0 && i < totalPoints) {
      const p1 = new THREE.Vector3(x1, y, z1);
      const p2 = new THREE.Vector3(x2, y, z2);
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

      // Two half-rungs with a small sphere in the middle
      const rung1 = createCylinder(p1, mid, 0.06, basePairMat);
      const rung2 = createCylinder(mid, p2, 0.06, basePairMat);
      dnaGroup.add(rung1);
      dnaGroup.add(rung2);

      const midNode = new THREE.Mesh(smallSphereGeo, basePairMat);
      midNode.position.copy(mid);
      dnaGroup.add(midNode);
    }
  }

  // Backbone cylinders connecting nodes
  for (let i = 0; i < strand1Points.length - 1; i++) {
    const seg1 = createCylinder(strand1Points[i], strand1Points[i + 1], 0.08, backboneMat);
    const seg2 = createCylinder(strand2Points[i], strand2Points[i + 1], 0.08, backboneMat);
    dnaGroup.add(seg1);
    dnaGroup.add(seg2);
  }

  // Resize
  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // Animation
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    dnaGroup.rotation.y = t * 0.3;
    dnaGroup.rotation.x = Math.PI / 6; // 30 degree tilt

    renderer.render(scene, camera);
  }

  animate();
})();

// (Scroll animations, nav effect, and anchor scrolling are at the top of this file)
