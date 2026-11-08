/**
 * NASA Earth Information Jukebox - 3D Real-World Continental Dot-Matrix Globe
 * Renders an authentic, photorealistic 3D dot-mesh Earth sphere matching NASA mission visuals.
 * Featuring:
 * - Real-world continental dot-matrix sampled from NASA satellite landmask
 * - Moving 3D NASA Earth-Observation Satellite in inclined Low Earth Orbit with solar panels
 * - Luminous 3D orbital trajectory flight track
 * - Telemetry downlink laser beam actively connecting the satellite to the ground station
 * - Audio-reactive surface shockwaves, pulsing beacon lights, and interactive 3D orbit controls.
 */

class PlanetaryParticleGlobe {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container || !window.THREE) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.globeGroup = null;
    this.coreMesh = null;
    this.landMesh = null;
    this.oceanMesh = null;
    this.reticleGroup = null;
    this.shockwaveGroup = null;

    // Real Moving Satellite System
    this.satelliteGroup = null;
    this.orbitPathMesh = null;
    this.downlinkBeam = null;
    this.strobeLight = null;
    this.orbitAngle = 0.4;
    this.orbitSpeed = 0.009;
    this.orbitRadius = 3.65;
    this.orbitInclination = 51.6 * (Math.PI / 180); // 51.6° ISS / NASA Earth Science Orbit

    this.globeRadius = 2.85;
    this.pulseEnergy = 0;

    // Spherical orientation (Euler angles)
    this.targetRotationY = 0;
    this.targetRotationX = 0.25;
    this.currentRotationY = 0;
    this.currentRotationX = 0.25;

    this.activeLat = 24.86;
    this.activeLon = 67.01;

    // Shockwave ripple system
    this.shockwaves = [];
    this.lastShockwaveTime = 0;
    this.lastAmbientShockwave = 0;

    // Camera dolly
    this.baseCameraZ = 8.0;
    this.targetCameraZ = 8.0;

    // Mouse drag interaction
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };

    this.init();
  }

  async init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || 560;

    // 1. Scene & Centered Perspective Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 0.35, this.baseCameraZ);
    this.camera.lookAt(0, 0.35, 0);

    // 2. High-performance WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // 3. Central Master Globe Group
    this.globeGroup = new THREE.Group();
    this.globeGroup.position.set(0, 0.35, 0);
    this.scene.add(this.globeGroup);

    // 4. Solid Inner Cosmic Sphere (Prevents backside dots from bleeding through)
    this.buildInnerCore();

    // 5. Build Real Continental Dot Matrix (Loads authentic satellite landmask)
    await this.buildContinentalDots();

    // 6. Surface Station Ground Beacon Pin
    this.buildTargetingReticle();

    // 7. Real Moving Satellite Vehicle with Orbit Path & Telemetry Downlink Beam
    this.buildSatellite();

    // 8. Event Listeners (Resize, Drag, Parallax)
    this.bindEvents();

    // 9. Align to initial station (Karachi default)
    this.setTargetCoordinates(this.activeLat, this.activeLon, "Karachi");

    // 10. Continuous Animation Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  buildInnerCore() {
    const geo = new THREE.SphereGeometry(this.globeRadius * 0.985, 48, 48);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x05070e,
      transparent: true,
      opacity: 0.96
    });
    this.coreMesh = new THREE.Mesh(geo, mat);
    this.globeGroup.add(this.coreMesh);
  }

  async buildContinentalDots() {
    let dotsData = null;

    try {
      const response = await fetch("earth_dots.json");
      if (response.ok) {
        dotsData = await response.json();
      }
    } catch (err) {
      console.warn("Could not load earth_dots.json, using fallback:", err);
    }

    // Circular glowing dot particle texture
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    const rad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    rad.addColorStop(0, "rgba(255, 255, 255, 1)");
    rad.addColorStop(0.35, "rgba(255, 150, 80, 0.9)");
    rad.addColorStop(0.75, "rgba(255, 87, 34, 0.3)");
    rad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, 32, 32);

    const dotTexture = new THREE.CanvasTexture(canvas);

    if (dotsData && dotsData.land && dotsData.land.length > 0) {
      // 1. Land Points (Bright, Crisp, Radiant Solar Orange Continents)
      const landGeo = new THREE.BufferGeometry();
      landGeo.setAttribute("position", new THREE.Float32BufferAttribute(dotsData.land, 3));

      const landColors = [];
      const colorLandPrimary = new THREE.Color(0xff6a3d); // Warm sunrise orange
      const colorLandPeak = new THREE.Color(0xff9800);    // Solar amber peak

      for (let i = 0; i < dotsData.land.length; i += 3) {
        const y = dotsData.land[i + 1];
        const col = (y > 0.8) ? colorLandPeak : colorLandPrimary;
        landColors.push(col.r, col.g, col.b);
      }
      landGeo.setAttribute("color", new THREE.Float32BufferAttribute(landColors, 3));

      const landMat = new THREE.PointsMaterial({
        size: 0.082,
        map: dotTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.98,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      this.landMesh = new THREE.Points(landGeo, landMat);
      this.globeGroup.add(this.landMesh);

      // 2. Ocean Points (Subtle, Translucent Twilight Amber Grid Structure)
      if (dotsData.ocean && dotsData.ocean.length > 0) {
        const oceanGeo = new THREE.BufferGeometry();
        oceanGeo.setAttribute("position", new THREE.Float32BufferAttribute(dotsData.ocean, 3));

        const oceanMat = new THREE.PointsMaterial({
          size: 0.045,
          color: 0x4a180a,
          map: dotTexture,
          transparent: true,
          opacity: 0.35,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        this.oceanMesh = new THREE.Points(oceanGeo, oceanMat);
        this.globeGroup.add(this.oceanMesh);
      }
    }
  }

  buildTargetingReticle() {
    this.reticleGroup = new THREE.Group();

    // 1. Ground Station Reception Beacon Pin
    const pinGeo = new THREE.CircleGeometry(0.045, 16);
    const pinMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide
    });
    const pin = new THREE.Mesh(pinGeo, pinMat);
    this.reticleGroup.add(pin);

    // 2. Center dot in solar orange
    const dotGeo = new THREE.CircleGeometry(0.022, 16);
    const dotMat = new THREE.MeshBasicMaterial({
      color: 0xff5722,
      side: THREE.DoubleSide
    });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    this.reticleGroup.add(dot);

    // 3. Shockwave ripple container
    this.shockwaveGroup = new THREE.Group();
    this.reticleGroup.add(this.shockwaveGroup);

    // Attach to the rotating globe group so it tracks surface continents
    this.globeGroup.add(this.reticleGroup);
  }

  /**
   * Builds the Real 3D Moving NASA Earth-Observation Satellite Model,
   * its 3D orbital trajectory ring, and the live telemetry downlink beam.
   */
  buildSatellite() {
    this.satelliteGroup = new THREE.Group();

    // 1. Satellite Main Body (Spacecraft Bus with Gold Foil Texture)
    const busGeo = new THREE.BoxGeometry(0.18, 0.12, 0.12);
    const busMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b // Spacecraft Gold
    });
    const bus = new THREE.Mesh(busGeo, busMat);
    this.satelliteGroup.add(bus);

    // 2. Solar Panel Array Wings (Dual Photovoltaic Arrays)
    const wingGeo = new THREE.BoxGeometry(0.36, 0.12, 0.015);
    const wingMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7 // Deep solar array blue
    });

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-0.28, 0, 0);
    this.satelliteGroup.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(0.28, 0, 0);
    this.satelliteGroup.add(rightWing);

    // Cyan wireframe grid overlay on solar panels
    const trimGeo = new THREE.BoxGeometry(0.37, 0.125, 0.016);
    const trimMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.65
    });
    const leftTrim = new THREE.Mesh(trimGeo, trimMat);
    leftTrim.position.set(-0.28, 0, 0);
    this.satelliteGroup.add(leftTrim);

    const rightTrim = new THREE.Mesh(trimGeo, trimMat);
    rightTrim.position.set(0.28, 0, 0);
    this.satelliteGroup.add(rightTrim);

    // 3. Earth-Facing Sensor Payload / Radiometer Dish (Nadir-pointing)
    const dishGeo = new THREE.CylinderGeometry(0.065, 0.02, 0.08, 16);
    const dishMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.rotation.x = Math.PI / 2;
    dish.position.set(0, 0, 0.09);
    this.satelliteGroup.add(dish);

    // 4. Strobe Telemetry Beacon Light
    const beaconGeo = new THREE.SphereGeometry(0.025, 12, 12);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 1.0
    });
    this.strobeLight = new THREE.Mesh(beaconGeo, beaconMat);
    this.strobeLight.position.set(0, 0.08, 0);
    this.satelliteGroup.add(this.strobeLight);

    this.scene.add(this.satelliteGroup);

    // 5. Glowing 3D Orbital Trajectory Track Line
    const orbitPoints = [];
    const R_orbit = this.orbitRadius;
    const inc = this.orbitInclination;
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      const ox = R_orbit * Math.cos(a);
      const oy = R_orbit * Math.sin(a) * Math.sin(inc) + 0.35;
      const oz = R_orbit * Math.sin(a) * Math.cos(inc);
      orbitPoints.push(new THREE.Vector3(ox, oy, oz));
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending
    });
    this.orbitPathMesh = new THREE.LineLoop(orbitGeo, orbitMat);
    this.scene.add(this.orbitPathMesh);

    // 6. Active Downlink Telemetry Laser Beam connecting Satellite to Ground Station
    const beamPositions = new Float32Array([0, 0, 0, 0, 0, 0]);
    const beamGeo = new THREE.BufferGeometry();
    beamGeo.setAttribute("position", new THREE.BufferAttribute(beamPositions, 3));
    const beamMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    });
    this.downlinkBeam = new THREE.Line(beamGeo, beamMat);
    this.scene.add(this.downlinkBeam);
  }

  /**
   * Smoothly rotates the 3D globe to bring the target station front and center.
   */
  setTargetCoordinates(lat, lon, cityName = "") {
    this.activeLat = lat;
    this.activeLon = lon;

    const radLat = (lat * Math.PI) / 180;
    const radLon = (lon * Math.PI) / 180;

    // Position ground station on the 3D spherical surface
    const R = this.globeRadius * 1.012;
    const x = R * Math.cos(radLat) * Math.sin(radLon);
    const y = R * Math.sin(radLat);
    const z = R * Math.cos(radLat) * Math.cos(radLon);

    if (this.reticleGroup) {
      this.reticleGroup.position.set(x, y, z);
      this.reticleGroup.lookAt(x * 2, y * 2, z * 2);
    }

    // Spherical target rotation: bring the station directly facing the camera
    this.targetRotationY = -radLon;
    this.targetRotationX = radLat * 0.45;

    // Smooth orbital camera dolly
    this.targetCameraZ = this.baseCameraZ + 0.55;
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

  setThermalTone(normalizedTemp) {
    if (!this.landMesh) return;
    const cold = new THREE.Color(0x38bdf8);
    const hot = new THREE.Color(0xff5722);
    const tone = cold.clone().lerp(hot, normalizedTemp);
    this.landMesh.material.color = tone;
  }

  triggerAudioPulse(frequency) {
    this.pulseEnergy = Math.min(1.0, this.pulseEnergy + 0.45);

    const now = performance.now();
    if (now - this.lastShockwaveTime > 90 && this.shockwaveGroup) {
      this.lastShockwaveTime = now;
      this.spawnShockwave(frequency, false);
    }
  }

  spawnShockwave(frequency = 440, isAmbient = false) {
    if (!this.shockwaveGroup) return;

    // Concentric radar ripple on ground beacon
    const geo = new THREE.RingGeometry(0.08, 0.11, 32);
    const isHighFreq = frequency > 520;
    const color = isHighFreq ? 0xff7043 : 0x38bdf8;
    const initialOpacity = isAmbient ? 0.35 : 0.75;

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
      maxScale: isAmbient ? 3.5 : 3.0,
      growthRate: isAmbient ? 0.035 : 0.05,
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

    // 3D Interactive Mouse Drag Controls
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
          this.targetRotationY += nx * 0.0002;
        }
      });
    }
  }

  animate() {
    requestAnimationFrame(this.animate);

    // 1. Advance Satellite Orbital Angle along inclined flight trajectory
    this.orbitAngle += this.orbitSpeed;

    const R_orbit = this.orbitRadius;
    const inc = this.orbitInclination;
    const satX = R_orbit * Math.cos(this.orbitAngle);
    const satY = R_orbit * Math.sin(this.orbitAngle) * Math.sin(inc) + 0.35;
    const satZ = R_orbit * Math.sin(this.orbitAngle) * Math.cos(inc);

    if (this.satelliteGroup) {
      this.satelliteGroup.position.set(satX, satY, satZ);
      // Nadir-pointing: Instruments continuously face straight toward the Earth's center
      this.satelliteGroup.lookAt(0, 0.35, 0);

      // Subtle solar wing oscillation
      this.satelliteGroup.rotateZ(Math.sin(this.orbitAngle * 2) * 0.06);
    }

    // 2. Pulse Strobe Beacon Light
    if (this.strobeLight) {
      const flash = (Math.sin(performance.now() * 0.009) > 0.45) ? 1.0 : 0.12;
      this.strobeLight.material.opacity = flash;
    }

    // 3. Update Real-Time Telemetry Downlink Laser Beam
    if (this.downlinkBeam && this.reticleGroup && this.satelliteGroup) {
      const groundWorldPos = new THREE.Vector3();
      this.reticleGroup.getWorldPosition(groundWorldPos);

      const positions = this.downlinkBeam.geometry.attributes.position.array;
      positions[0] = satX;
      positions[1] = satY;
      positions[2] = satZ;
      positions[3] = groundWorldPos.x;
      positions[4] = groundWorldPos.y;
      positions[5] = groundWorldPos.z;
      this.downlinkBeam.geometry.attributes.position.needsUpdate = true;

      // Distance-based intensity: Beam intensifies as the satellite sweeps over the station
      const dist = this.satelliteGroup.position.distanceTo(groundWorldPos);
      const proximity = Math.max(0.12, 1.0 - (dist / 7.0));
      this.downlinkBeam.material.opacity = (proximity * 0.45) + (this.pulseEnergy * 0.55);
    }

    // 4. Smooth Spherical Rotation Interpolation
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.05;
    this.currentRotationX += (this.targetRotationX - this.currentRotationX) * 0.05;

    // Majestic planetary spin when not dragging
    if (!this.isDragging) {
      this.targetRotationY += 0.0007;
    }

    if (this.globeGroup) {
      this.globeGroup.rotation.y = this.currentRotationY;
      this.globeGroup.rotation.x = this.currentRotationX;

      // Audio reactive subtle scale breathing
      const scale = 1.0 + this.pulseEnergy * 0.02;
      this.globeGroup.scale.set(scale, scale, scale);
    }

    // 5. Expand active shockwave rings
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

    // 6. Camera dolly easing
    if (this.camera) {
      this.camera.position.z += (this.targetCameraZ - this.camera.position.z) * 0.06;
    }

    // 7. Ambient radar pulse when paused
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
