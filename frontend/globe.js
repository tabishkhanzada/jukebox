/**
 * NASA Earth Information Jukebox - 3D Planetary Particle Sphere
 * Full Round 3D Earth Globe with authentic continental dot-mesh,
 * radiant solar orange/amber rim lighting, and audio-reactive targeting reticle.
 */

class PlanetaryParticleGlobe {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container || !window.THREE) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.globeGroup = null;
    this.particleMesh = null;
    this.coreMesh = null;
    this.atmosphereMesh = null;
    this.reticleGroup = null;

    this.pulseEnergy = 0;
    this.targetRotationY = 0;
    this.targetRotationX = 0.2;
    this.currentRotationY = 0;
    this.currentRotationX = 0.2;
    this.activeLat = 24.86;
    this.activeLon = 67.01;
    this.globeRadius = 2.85;

    // Holographic Sonic Shockwave Radar System
    this.shockwaves = [];
    this.lastShockwaveTime = 0;
    this.lastAmbientShockwave = 0;
    this.shockwaveGroup = null;

    // Smooth Orbital Camera Dolly Dynamics
    this.baseCameraZ = 8.0;
    this.targetCameraZ = 8.0;

    // Mouse drag interaction
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };

    this.init();
  }

  init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || 560;

    // 1. Three.js Scene & Camera (Directly Centered on the Full Round Ball)
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 0.35, this.baseCameraZ);
    this.camera.lookAt(0, 0.35, 0);

    // 2. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // 3. Master Globe Group (Holds Core, Continents, and Reticle)
    this.globeGroup = new THREE.Group();
    this.globeGroup.position.set(0, 0.35, 0);
    this.scene.add(this.globeGroup);

    // 4. Inner Cosmic Sphere (Prevents See-Through Transparency)
    this.buildInnerCore();

    // 5. Complete 3D Orange Dotted Continental Sphere (Round Ball)
    this.buildParticleSphere();

    // 6. Atmospheric Rim Halo
    this.buildAtmosphereHalo();

    // 7. Targeting Reticle Pin on Ball Surface
    this.buildTargetingReticle();

    // 8. Event Listeners
    this.bindEvents();

    // 9. Initial Position
    this.setTargetCoordinates(this.activeLat, this.activeLon, "Karachi");

    // 10. Render Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  /**
   * Renders the world's landmasses onto a high-performance in-memory canvas
   * to determine whether any spherical point is on land or ocean.
   */
  generateLandMask() {
    const canvas = document.createElement("canvas");
    canvas.width = 360;
    canvas.height = 180;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 360, 180);

    ctx.fillStyle = "#ffffff";

    // North America
    ctx.beginPath();
    ctx.moveTo(30, 20); ctx.lineTo(110, 20); ctx.lineTo(130, 40); ctx.lineTo(105, 75);
    ctx.lineTo(85, 95); ctx.lineTo(75, 110); ctx.lineTo(60, 95); ctx.lineTo(40, 65);
    ctx.closePath(); ctx.fill();

    // Greenland
    ctx.beginPath();
    ctx.moveTo(125, 12); ctx.lineTo(150, 15); ctx.lineTo(140, 38); ctx.lineTo(125, 30);
    ctx.closePath(); ctx.fill();

    // South America
    ctx.beginPath();
    ctx.moveTo(95, 105); ctx.lineTo(125, 115); ctx.lineTo(135, 130); ctx.lineTo(125, 155);
    ctx.lineTo(105, 172); ctx.lineTo(95, 150); ctx.lineTo(90, 120);
    ctx.closePath(); ctx.fill();

    // Europe
    ctx.beginPath();
    ctx.moveTo(170, 30); ctx.lineTo(215, 30); ctx.lineTo(210, 55); ctx.lineTo(185, 65);
    ctx.lineTo(165, 55); ctx.lineTo(160, 40);
    ctx.closePath(); ctx.fill();

    // Africa
    ctx.beginPath();
    ctx.moveTo(165, 55); ctx.lineTo(215, 60); ctx.lineTo(235, 78); ctx.lineTo(220, 110);
    ctx.lineTo(205, 145); ctx.lineTo(185, 130); ctx.lineTo(165, 85); ctx.lineTo(155, 70);
    ctx.closePath(); ctx.fill();

    // Asia
    ctx.beginPath();
    ctx.moveTo(215, 25); ctx.lineTo(330, 20); ctx.lineTo(345, 45); ctx.lineTo(315, 70);
    ctx.lineTo(290, 85); ctx.lineTo(265, 80); ctx.lineTo(240, 65); ctx.lineTo(215, 45);
    ctx.closePath(); ctx.fill();

    // India
    ctx.beginPath();
    ctx.moveTo(245, 70); ctx.lineTo(265, 75); ctx.lineTo(255, 98);
    ctx.closePath(); ctx.fill();

    // SE Asia & Indonesia
    ctx.beginPath();
    ctx.moveTo(280, 80); ctx.lineTo(300, 95); ctx.lineTo(290, 110);
    ctx.closePath(); ctx.fill();

    // Australia
    ctx.beginPath();
    ctx.moveTo(295, 115); ctx.lineTo(335, 118); ctx.lineTo(338, 142); ctx.lineTo(315, 152); ctx.lineTo(292, 135);
    ctx.closePath(); ctx.fill();

    // Antarctica
    ctx.beginPath();
    ctx.rect(0, 168, 360, 12);
    ctx.fill();

    return ctx.getImageData(0, 0, 360, 180).data;
  }

  buildInnerCore() {
    const geo = new THREE.SphereGeometry(this.globeRadius * 0.985, 48, 48);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x05070e,
      transparent: true,
      opacity: 0.95
    });
    this.coreMesh = new THREE.Mesh(geo, mat);
    this.globeGroup.add(this.coreMesh);
  }

  buildParticleSphere() {
    const R = this.globeRadius;
    const landData = this.generateLandMask();

    const nPoints = 16000;
    const positions = [];
    const colors = [];

    // Colors matching the glowing orange Mars / Solar ball reference
    const colorLand = new THREE.Color(0xff6a3d);    // Radiant solar orange
    const colorPeak = new THREE.Color(0xff9800);    // Bright solar amber
    const colorOcean = new THREE.Color(0x3d170a);   // Deep twilight amber (ambient volume)

    for (let i = 0; i < nPoints; i++) {
      // Fibonacci sphere distribution for perfectly uniform spherical coverage
      const phi = Math.acos(1 - (2 * (i + 0.5)) / nPoints);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);

      const lat = 90 - (phi * 180) / Math.PI;
      const lon = ((theta * 180) / Math.PI) % 360 - 180;

      const u = Math.min(359, Math.max(0, Math.floor(((lon + 180) / 360) * 360)));
      const v = Math.min(179, Math.max(0, Math.floor(((90 - lat) / 180) * 180)));

      const isLand = landData[(v * 360 + u) * 4] > 100;

      // Only skip 65% of ocean dots so the continents stand out clearly while preserving the round ball volume
      if (!isLand && i % 3 !== 0) continue;

      const x = R * Math.sin(phi) * Math.cos(theta);
      const y = R * Math.cos(phi);
      const z = R * Math.sin(phi) * Math.sin(theta);

      positions.push(x, y, z);

      if (isLand) {
        // Subtle height/latitude color shimmer
        const col = (y > 1.0) ? colorPeak : colorLand;
        colors.push(col.r, col.g, col.b);
      } else {
        colors.push(colorOcean.r, colorOcean.g, colorOcean.b);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    // Crisp circular glowing dot texture
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    const rad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    rad.addColorStop(0, "rgba(255, 255, 255, 1)");
    rad.addColorStop(0.35, "rgba(255, 200, 150, 0.95)");
    rad.addColorStop(0.75, "rgba(255, 87, 34, 0.35)");
    rad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 0.082,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particleMesh = new THREE.Points(geometry, material);
    this.globeGroup.add(this.particleMesh);
  }

  buildAtmosphereHalo() {
    // Ethereal glowing halo embracing the full perimeter of the round ball
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    const grad = ctx.createRadialGradient(64, 64, 48, 64, 64, 64);
    grad.addColorStop(0, "rgba(255, 87, 34, 0)");
    grad.addColorStop(0.75, "rgba(255, 87, 34, 0.45)");
    grad.addColorStop(1, "rgba(255, 112, 67, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      color: 0xff5722,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.75
    });

    this.atmosphereMesh = new THREE.Sprite(spriteMat);
    this.atmosphereMesh.scale.set(this.globeRadius * 2.38, this.globeRadius * 2.38, 1);
    this.globeGroup.add(this.atmosphereMesh);
  }

  buildTargetingReticle() {
    this.reticleGroup = new THREE.Group();

    // 1. Concentric targeting ring
    const ringGeo = new THREE.RingGeometry(0.12, 0.15, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    this.reticleGroup.add(ring);

    // 2. Center dot
    const dotGeo = new THREE.CircleGeometry(0.045, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xff5722 });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    this.reticleGroup.add(dot);

    // 3. Outer pulse ring
    const outerGeo = new THREE.RingGeometry(0.22, 0.25, 32);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65
    });
    this.pulseRing = new THREE.Mesh(outerGeo, outerMat);
    this.reticleGroup.add(this.pulseRing);

    // 4. Dedicated Holographic Shockwave Container
    this.shockwaveGroup = new THREE.Group();
    this.reticleGroup.add(this.shockwaveGroup);

    // Add reticle to the rotating globe group so it tracks surface coordinates
    this.globeGroup.add(this.reticleGroup);
  }

  /**
   * Sets active coordinates and smoothly rotates globe so station faces the camera.
   */
  setTargetCoordinates(lat, lon, cityName = "") {
    this.activeLat = lat;
    this.activeLon = lon;

    // Convert geodetic coordinates to spherical surface position on the round ball
    const radLat = (lat * Math.PI) / 180;
    const radLon = (lon * Math.PI) / 180;

    const R = this.globeRadius * 1.01;
    const x = R * Math.cos(radLat) * Math.sin(radLon);
    const y = R * Math.sin(radLat);
    const z = R * Math.cos(radLat) * Math.cos(radLon);

    if (this.reticleGroup) {
      this.reticleGroup.position.set(x, y, z);
      this.reticleGroup.lookAt(x * 2, y * 2, z * 2);
    }

    // Target rotation to bring the station directly front & center
    this.targetRotationY = -radLon;
    this.targetRotationX = radLat * 0.45;

    // Smooth Orbital Camera Dolly
    this.targetCameraZ = this.baseCameraZ + 0.65;
    if (this._dollyTimeout) clearTimeout(this._dollyTimeout);
    this._dollyTimeout = setTimeout(() => {
      this.targetCameraZ = this.baseCameraZ;
    }, 450);

    // Scramble reticle text tags
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
    if (!this.atmosphereMesh) return;
    const cold = new THREE.Color(0x00e5ff); // Cyan
    const hot = new THREE.Color(0xff4500);  // Solar Crimson
    const tone = cold.clone().lerp(hot, normalizedTemp);
    this.atmosphereMesh.material.color.copy(tone);
  }

  /**
   * Pulses particle sphere and triggers holographic radar shockwaves.
   */
  triggerAudioPulse(frequency) {
    this.pulseEnergy = Math.min(1.0, this.pulseEnergy + 0.45);

    const now = performance.now();
    if (now - this.lastShockwaveTime > 90 && this.shockwaveGroup) {
      this.lastShockwaveTime = now;
      this.spawnShockwave(frequency, false);
    }
  }

  /**
   * Spawns an ultra-crisp concentric holographic shockwave ripple on the ball.
   */
  spawnShockwave(frequency = 440, isAmbient = false) {
    if (!this.shockwaveGroup) return;

    const geo = new THREE.RingGeometry(0.16, 0.22, 48);
    const isHighFreq = frequency > 520;
    const color = isHighFreq ? 0xff7043 : 0x38bdf8;
    const initialOpacity = isAmbient ? 0.4 : 0.8;
    const mat = new THREE.MeshBasicMaterial({
      color: color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: initialOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ring = new THREE.Mesh(geo, mat);
    this.shockwaveGroup.add(ring);

    this.shockwaves.push({
      mesh: ring,
      material: mat,
      scale: 1.0,
      maxScale: isAmbient ? 3.6 : 3.2,
      growthRate: isAmbient ? 0.038 : 0.055,
      initialOpacity: initialOpacity
    });

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

    // Interactive mouse rotation drag
    if (this.container) {
      this.container.addEventListener("mousedown", (e) => {
        this.isDragging = true;
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      });

      window.addEventListener("mouseup", () => {
        this.isDragging = false;
      });

      this.container.addEventListener("mousemove", (e) => {
        if (this.isDragging) {
          const deltaX = e.clientX - this.previousMousePosition.x;
          const deltaY = e.clientY - this.previousMousePosition.y;

          this.targetRotationY += deltaX * 0.005;
          this.targetRotationX += deltaY * 0.005;
          this.previousMousePosition = { x: e.clientX, y: e.clientY };
        } else {
          // Subtle mouse follow parallax
          const nx = (e.clientX / window.innerWidth) * 2 - 1;
          const ny = (e.clientY / window.innerHeight) * 2 - 1;
          this.targetRotationY += nx * 0.0003;
        }
      });
    }
  }

  animate() {
    requestAnimationFrame(this.animate);

    // Smooth spherical rotation interpolation
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.05;
    this.currentRotationX += (this.targetRotationX - this.currentRotationX) * 0.05;

    // Continuous subtle planetary spin when not dragging
    if (!this.isDragging) {
      this.targetRotationY += 0.0008;
    }

    if (this.globeGroup) {
      this.globeGroup.rotation.y = this.currentRotationY;
      this.globeGroup.rotation.x = this.currentRotationX;

      // Audio reactive scale breathing
      const scale = 1.0 + this.pulseEnergy * 0.025;
      this.globeGroup.scale.set(scale, scale, scale);
    }

    if (this.pulseRing) {
      const ringScale = 1.0 + this.pulseEnergy * 0.65;
      this.pulseRing.scale.set(ringScale, ringScale, 1);
      this.pulseRing.material.opacity = 0.25 + this.pulseEnergy * 0.6;
    }

    // Smoothly expand and fade active shockwave rings
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.scale += sw.growthRate;
      sw.mesh.scale.set(sw.scale, sw.scale, 1);

      const progress = (sw.scale - 1.0) / (sw.maxScale - 1.0);
      sw.material.opacity = Math.max(0, sw.initialOpacity * (1.0 - progress * progress));

      if (progress >= 1.0) {
        this.shockwaveGroup.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        sw.material.dispose();
        this.shockwaves.splice(i, 1);
      }
    }

    // Camera dolly smoothing
    if (this.camera) {
      this.camera.position.z += (this.targetCameraZ - this.camera.position.z) * 0.06;
    }

    // Ambient idle radar pulse when paused (every 2.4s)
    const now = performance.now();
    if (now - this.lastShockwaveTime > 2400 && now - this.lastAmbientShockwave > 2400) {
      this.lastAmbientShockwave = now;
      this.spawnShockwave(440, true);
    }

    // Energy dissipation
    this.pulseEnergy *= 0.91;

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

window.PlanetaryParticleGlobe = PlanetaryParticleGlobe;
