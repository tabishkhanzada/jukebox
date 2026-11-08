/**
 * NASA Earth Information Jukebox - 3D Planetary Particle Horizon
 * Implements an interactive Three.js point-cloud globe matching NASA mission control visuals.
 * Features dynamic rim-lighting, coordinate targeting reticle, audio-reactive particle pulse,
 * and mouse-follow parallax.
 */

class PlanetaryParticleGlobe {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container || !window.THREE) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.particleMesh = null;
    this.glowMesh = null;
    this.reticleGroup = null;
    this.pulseEnergy = 0;
    this.targetRotationY = 0;
    this.targetRotationX = 0.35;
    this.currentRotationY = 0;
    this.currentRotationX = 0.35;
    this.activeLat = 24.86;
    this.activeLon = 67.01;
    this.rimColor = new THREE.Color(0xff5722); // Solar amber default

    // Holographic Sonic Shockwave Radar System
    this.shockwaves = [];
    this.lastShockwaveTime = 0;
    this.shockwaveGroup = null;

    this.init();
  }

  init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || 520;

    // 1. Three.js Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 4.5, 9.5);
    this.camera.lookAt(0, 0, 0);

    // 2. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // 3. Build Planetary Particle Mesh (12,000+ points in concentric rings)
    this.buildParticleSphere();

    // 4. Build Horizon Atmospheric Rim Glow
    this.buildAtmosphericRim();

    // 5. Build Targeting Reticle Pin
    this.buildTargetingReticle();

    // 6. Event Listeners (Resize & Parallax)
    this.bindEvents();

    // 7. Render Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  buildParticleSphere() {
    const radius = 4.2;
    const segments = 90;
    const rings = 60;
    const particleCount = segments * rings;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const originalY = new Float32Array(particleCount);

    let idx = 0;
    const colorTop = new THREE.Color(0xff6a3d); // Warm sunrise rim
    const colorBody = new THREE.Color(0x38bdf8); // Cyan body
    const colorDeep = new THREE.Color(0x0f172a); // Deep shadow

    for (let r = 0; r < rings; r++) {
      const phi = (r / rings) * Math.PI; // 0 to PI
      const y = radius * Math.cos(phi);

      for (let s = 0; s < segments; s++) {
        const theta = (s / segments) * Math.PI * 2; // 0 to 2PI
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const z = radius * Math.sin(phi) * Math.sin(theta);

        // Add subtle geometric ripple topography
        const ripple = Math.sin(theta * 6) * Math.cos(phi * 8) * 0.04;
        positions[idx * 3] = x * (1 + ripple);
        positions[idx * 3 + 1] = y * (1 + ripple);
        positions[idx * 3 + 2] = z * (1 + ripple);
        originalY[idx] = y;

        // Rim-lit gradient: top horizon dots glow solar amber; body is atmospheric cyan
        let pColor;
        if (y > 1.2) {
          pColor = colorTop;
        } else if (y > -1.5) {
          pColor = colorBody;
        } else {
          pColor = colorDeep;
        }

        colors[idx * 3] = pColor.r;
        colors[idx * 3 + 1] = pColor.g;
        colors[idx * 3 + 2] = pColor.b;

        idx++;
      }
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.originalY = originalY;

    // Glowing dot texture
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    const radGrad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    radGrad.addColorStop(0, "rgba(255,255,255,1)");
    radGrad.addColorStop(0.3, "rgba(255,255,255,0.85)");
    radGrad.addColorStop(0.7, "rgba(255,255,255,0.2)");
    radGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 0.085,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particleMesh = new THREE.Points(geometry, material);
    // Position hemisphere to rise from below like the NASA Mars reference image
    this.particleMesh.position.set(0, -2.4, 0);
    this.scene.add(this.particleMesh);
  }

  buildAtmosphericRim() {
    // Elegant soft ring highlighting the planetary crest
    const curve = new THREE.EllipseCurve(0, 0, 4.35, 4.35, 0, Math.PI, false, 0);
    const points = curve.getPoints(80);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
      color: 0xff5722,
      transparent: true,
      opacity: 0.35,
      linewidth: 2,
      blending: THREE.AdditiveBlending
    });

    this.glowMesh = new THREE.Line(geometry, material);
    this.glowMesh.rotation.x = Math.PI / 2;
    this.glowMesh.position.set(0, 1.85, 0);
    this.scene.add(this.glowMesh);
  }

  buildTargetingReticle() {
    this.reticleGroup = new THREE.Group();

    // 1. Concentric targeting ring
    const ringGeo = new THREE.RingGeometry(0.18, 0.22, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    this.reticleGroup.add(ring);

    // 2. Center dot
    const dotGeo = new THREE.CircleGeometry(0.06, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xff5722 });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    this.reticleGroup.add(dot);

    // 3. Outer pulse ring
    const outerGeo = new THREE.RingGeometry(0.32, 0.35, 32);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5
    });
    this.pulseRing = new THREE.Mesh(outerGeo, outerMat);
    this.reticleGroup.add(this.pulseRing);

    // 4. Dedicated Holographic Shockwave Container
    this.shockwaveGroup = new THREE.Group();
    this.reticleGroup.add(this.shockwaveGroup);

    this.reticleGroup.position.set(1.4, 1.1, 3.6);
    this.scene.add(this.reticleGroup);
  }

  /**
   * Sets active coordinates and rotates globe to bring station to the horizon.
   */
  setTargetCoordinates(lat, lon, cityName = "") {
    this.activeLat = lat;
    this.activeLon = lon;

    // Convert lat/lon to target spherical rotation
    const radLon = (lon * Math.PI) / 180;
    const radLat = (lat * Math.PI) / 180;

    this.targetRotationY = -radLon;
    this.targetRotationX = 0.25 + (radLat * 0.2);

    // Update targeting HUD tag with holographic decrypt scramble
    const solTag = document.getElementById("heroReticleTag");
    if (solTag) {
      const tagText = `STATION: ${cityName.toUpperCase() || 'TARGET'} / ${lat >= 0 ? lat.toFixed(2) + '°N' : Math.abs(lat).toFixed(2) + '°S'} ${lon >= 0 ? lon.toFixed(2) + '°E' : Math.abs(lon).toFixed(2) + '°W'}`;
      if (window.TelemetryScrambler) {
        window.TelemetryScrambler.scramble(solTag, tagText, 420);
      } else {
        solTag.textContent = tagText;
      }
    }

    const solSub = document.getElementById("heroReticleSol");
    if (solSub && window.TelemetryScrambler) {
      window.TelemetryScrambler.scramble(solSub, "SOL 2024 • MSL 00:02:12:00", 460);
    }
  }

  /**
   * Updates planetary rim glow color dynamically based on temperature.
   */
  setThermalTone(normalizedTemp) {
    // 0.0 (Cold blue) to 1.0 (Solar crimson)
    const cold = new THREE.Color(0x00e5ff); // Neon Cyan
    const hot = new THREE.Color(0xff4500); // Solar Orange-Red
    this.rimColor.copy(cold).lerp(hot, normalizedTemp);

    if (this.glowMesh && this.glowMesh.material) {
      this.glowMesh.material.color.copy(this.rimColor);
    }
  }

  /**
   * Pulses particle sphere and triggers holographic radar shockwaves.
   */
  triggerAudioPulse(frequency) {
    this.pulseEnergy = Math.min(1.0, this.pulseEnergy + 0.45);

    const now = performance.now();
    // Smooth 90ms throttle ensures rhythmic, clean, uncluttered visual ripples
    if (now - this.lastShockwaveTime > 90 && this.shockwaveGroup) {
      this.lastShockwaveTime = now;
      this.spawnShockwave(frequency);
    }
  }

  /**
   * Spawns an ultra-crisp concentric holographic shockwave ripple.
   */
  spawnShockwave(frequency) {
    const geo = new THREE.RingGeometry(0.18, 0.20, 48);
    const isHighFreq = frequency > 520;
    const color = isHighFreq ? 0xff7043 : 0x38bdf8;
    const mat = new THREE.MeshBasicMaterial({
      color: color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ring = new THREE.Mesh(geo, mat);
    this.shockwaveGroup.add(ring);

    this.shockwaves.push({
      mesh: ring,
      material: mat,
      scale: 1.0,
      maxScale: 3.6,
      growthRate: 0.055,
      initialOpacity: 0.65
    });

    // Cap active shockwaves at 4 for ultra-clean, lightweight 60fps rendering
    if (this.shockwaves.length > 4) {
      const oldest = this.shockwaves.shift();
      this.shockwaveGroup.remove(oldest.mesh);
      oldest.mesh.geometry.dispose();
      oldest.material.dispose();
    }
  }

  bindEvents() {
    window.addEventListener("resize", () => {
      if (!this.container || !this.renderer || !this.camera) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });

    // Mouse parallax
    window.addEventListener("mousemove", (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      this.targetRotationY += nx * 0.0008;
      this.targetRotationX = 0.35 + ny * 0.08;
    });
  }

  animate() {
    requestAnimationFrame(this.animate);

    // Smooth spherical rotation interpolation
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.05;
    this.currentRotationX += (this.targetRotationX - this.currentRotationX) * 0.05;

    // Subtle continuous planetary spin
    this.targetRotationY += 0.0006;

    if (this.particleMesh) {
      this.particleMesh.rotation.y = this.currentRotationY;
      this.particleMesh.rotation.x = this.currentRotationX;

      // Audio reactive scale breathing
      const scale = 1.0 + this.pulseEnergy * 0.035;
      this.particleMesh.scale.set(scale, scale, scale);
    }

    if (this.pulseRing) {
      const ringScale = 1.0 + this.pulseEnergy * 0.6;
      this.pulseRing.scale.set(ringScale, ringScale, 1);
      this.pulseRing.material.opacity = 0.2 + this.pulseEnergy * 0.6;
    }

    // Smoothly expand and fade active shockwave rings
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.scale += sw.growthRate;
      sw.mesh.scale.set(sw.scale, sw.scale, 1);

      const progress = (sw.scale - 1.0) / (sw.maxScale - 1.0);
      // Smooth quadratic ease-out opacity curve
      sw.material.opacity = Math.max(0, sw.initialOpacity * (1.0 - progress * progress));

      if (progress >= 1.0) {
        this.shockwaveGroup.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        sw.material.dispose();
        this.shockwaves.splice(i, 1);
      }
    }

    // Energy dissipation
    this.pulseEnergy *= 0.91;

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

window.PlanetaryParticleGlobe = PlanetaryParticleGlobe;

