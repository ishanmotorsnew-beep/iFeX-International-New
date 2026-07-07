import { useEffect, useRef, useState } from 'react';

// Simplified map coordinates for Earth's landmasses
const CONTINENTS = [
  { lat: 42, lon: -100, rad: 28 }, // North America
  { lat: 60, lon: -95, rad: 16 },  // Northern Canada
  { lat: 72, lon: -40, rad: 14 },  // Greenland
  { lat: -15, lon: -60, rad: 22 }, // South America
  { lat: 50, lon: 15, rad: 20 },   // Western/Central Europe
  { lat: 60, lon: 95, rad: 32 },   // Russia / Northern Asia
  { lat: 35, lon: 105, rad: 22 },  // China / East Asia
  { lat: 22, lon: 78, rad: 12 },   // India / South Asia
  { lat: 8, lon: 20, rad: 26 },    // Africa
  { lat: -25, lon: 135, rad: 16 }  // Australia
];

function isLand(lat, lon) {
  // Add procedural noise to make shorelines organic and high-fidelity
  const noise = Math.sin(lat * 0.16) * Math.cos(lon * 0.16) * 4 + 
                Math.sin(lon * 0.45) * 1.8 + 
                Math.cos(lat * 0.8) * 1.2;
  
  for (const c of CONTINENTS) {
    let dLat = lat - c.lat;
    let dLon = lon - c.lon;
    if (dLon > 180) dLon -= 360;
    if (dLon < -180) dLon += 360;
    
    const dist = Math.sqrt(dLat * dLat + dLon * dLon) + noise;
    if (dist < c.rad) {
      return true;
    }
  }
  return false;
}

export default function GlobeCanvas({ onSettle }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  
  // Animation timing parameters (in milliseconds)
  const START_COALESCE = 2000;
  const END_COALESCE = 3800;
  const START_DRIFT = 3800;
  const END_DRIFT = 5000;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    let height = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      height = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.resetTransform();
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    window.addEventListener('resize', handleResize);

    // Globe parameters
    const GLOBE_RADIUS = 210;
    const CAMERA_DIST = 760;
    
    // Generate particles
    const particles = [];
    const rows = 45;
    const cols = 90;
    
    // 1. Generate Globe Points
    for (let r = 0; r < rows; r++) {
      const latDeg = -90 + (180 * r) / rows;
      const latRad = (latDeg * Math.PI) / 180;
      const cosLat = Math.cos(latRad);
      
      // Even density distribution
      const numCols = Math.max(4, Math.round(cols * cosLat));
      
      for (let c = 0; c < numCols; c++) {
        const lonDeg = -180 + (360 * c) / numCols;
        const lonRad = (lonDeg * Math.PI) / 180;
        
        if (isLand(latDeg, lonDeg)) {
          // Spherical target coordinates
          const tx = GLOBE_RADIUS * Math.cos(latRad) * Math.sin(lonRad);
          const ty = GLOBE_RADIUS * Math.sin(latRad);
          const tz = GLOBE_RADIUS * Math.cos(latRad) * Math.cos(lonRad);
          
          // Anti-gravity initial offsets
          // Particles start scattered, mostly floating upwards from below
          const ox = (Math.random() - 0.5) * 450;
          const oy = (Math.random() - 0.5) * 350 + 200; // start lower
          const oz = (Math.random() - 0.5) * 450;
          
          // Phase delay for individual particle lock-in
          const delay = Math.random() * 800; // ms
          
          particles.push({
            tx, ty, tz,
            ox, oy, oz,
            delay,
            size: Math.random() > 0.94 ? 2.2 : (Math.random() * 0.8 + 0.6),
            isHub: Math.random() > 0.985,
            color: Math.random() > 0.3 ? '#06b6d4' : '#2563eb' // Cyan or Blue
          });
        }
      }
    }

    // 2. Setup Hub connections
    const hubs = particles.filter(p => p.isHub);
    const connections = [];
    const numConnections = Math.min(16, hubs.length * 2);
    
    // Adjust hub sizes
    hubs.forEach(h => h.size = 3.5);

    for (let i = 0; i < numConnections; i++) {
      const hubA = hubs[Math.floor(Math.random() * hubs.length)];
      let hubB = hubs[Math.floor(Math.random() * hubs.length)];
      while (hubB === hubA && hubs.length > 1) {
        hubB = hubs[Math.floor(Math.random() * hubs.length)];
      }
      
      connections.push({
        from: hubA,
        to: hubB,
        packetProgress: Math.random(),
        packetSpeed: 0.005 + Math.random() * 0.008
      });
    }

    // 3. Ambient Starfield / Floating Crystals
    const starCount = 80;
    const stars = [];
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: (Math.random() - 0.5) * 800,
        y: (Math.random() - 0.5) * 800,
        z: (Math.random() - 0.5) * 800,
        size: Math.random() * 1.5 + 0.5,
        speed: 0.1 + Math.random() * 0.2
      });
    }

    // Animation state
    let startTime = null;
    let settledTriggered = false;

    // Projection helper
    const project = (x, y, z, cx, cy) => {
      const factor = CAMERA_DIST / (CAMERA_DIST + z);
      return {
        x: cx + x * factor,
        y: cy - y * factor,
        z: z
      };
    };

    // Rotation parameters
    let rotX = 0.15; // pitch
    let rotY = 0.5;  // yaw

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      // Clear with very slight alpha for trail / glow overlay
      ctx.fillStyle = 'rgba(10, 15, 29, 1)';
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      // Determine responsive layout center coordinates
      const isMobile = window.innerWidth < 768;
      
      let startCX = canvas.offsetWidth / 2;
      let startCY = canvas.offsetHeight / 2;
      let endCX = isMobile ? canvas.offsetWidth / 2 : canvas.offsetWidth * 0.72;
      let endCY = isMobile ? canvas.offsetHeight * 0.38 : canvas.offsetHeight / 2;
      
      // Calculate current layout center based on drift progress
      let cx = startCX;
      let cy = startCY;
      if (elapsed > START_DRIFT) {
        const driftProgress = Math.min(1, (elapsed - START_DRIFT) / (END_DRIFT - START_DRIFT));
        // Cinematic easeInOutCubic
        const ease = driftProgress < 0.5 
          ? 4 * driftProgress * driftProgress * driftProgress 
          : 1 - Math.pow(-2 * driftProgress + 2, 3) / 2;
        cx = startCX + (endCX - startCX) * ease;
        cy = startCY + (endCY - startCY) * ease;
      }

      // Check settle callback
      if (elapsed >= END_DRIFT && !settledTriggered) {
        settledTriggered = true;
        if (onSettle) onSettle();
      }

      // Continuous rotation
      rotY += 0.0035; // slow spin
      if (elapsed < START_COALESCE) {
        // slight sway during anti-gravity floating
        rotX = 0.15 + Math.sin(elapsed * 0.0006) * 0.05;
      } else {
        rotX = 0.15 + Math.sin(elapsed * 0.0003) * 0.03;
      }

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      // 4. Draw Ambient Starfield (behind the globe)
      stars.forEach(star => {
        // Slow float upwards
        star.y -= star.speed;
        if (star.y < -400) star.y = 400;

        // Apply same rotation to keep them in background space, or let them float independently
        // Let's rotate them slowly
        const rx = star.x * cosY + star.z * sinY;
        const rz = -star.x * sinY + star.z * cosY;
        
        // Depth cue
        const proj = project(rx, star.y, rz, cx, cy);
        if (proj.z > -CAMERA_DIST) {
          ctx.fillStyle = `rgba(6, 182, 212, ${Math.max(0.1, 0.45 * (CAMERA_DIST + proj.z) / (2 * CAMERA_DIST))})`;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, star.size, 0, 2 * Math.PI);
          ctx.fill();
        }
      });

      // 5. Calculate coalescing factor
      let coalesceProgress = 0;
      if (elapsed > START_COALESCE) {
        coalesceProgress = Math.min(1, (elapsed - START_COALESCE) / (END_COALESCE - START_COALESCE));
      }

      // Exponential ease-out for snapping points to sphere
      const snapEase = (p) => 1 - Math.pow(1 - p, 4);

      // Scanning wave height (bottom to top sweep)
      // Height ranges from -GLOBE_RADIUS to +GLOBE_RADIUS
      let scanY = -GLOBE_RADIUS * 1.5;
      if (elapsed > START_COALESCE) {
        const scanProgress = Math.min(1, (elapsed - START_COALESCE) / (END_COALESCE - START_COALESCE - 300));
        scanY = -GLOBE_RADIUS * 1.5 + (GLOBE_RADIUS * 3.0) * scanProgress;
      }

      // List of projected particles to draw connection lines later
      const projectedParticles = [];

      // 6. Project and Render Particles
      particles.forEach((p) => {
        // Apply 3D rotation to target spherical coordinates
        // Rotate around Y-axis (spin)
        let rx = p.tx * cosY + p.tz * sinY;
        let ry = p.ty;
        let rz = -p.tx * sinY + p.tz * cosY;

        // Rotate around X-axis (tilt)
        const finalY = ry * cosX - rz * sinX;
        const finalZ = ry * sinX + rz * cosX;
        const finalX = rx;

        // Calculate coalescence interpolation for this particle
        // Offset is decay-based and starts when scanY reaches the particle's Y level
        let localOffsetProgress = 0;
        const pTargetY = p.ty; // height on globe
        
        if (elapsed > START_COALESCE) {
          // If scan wave has passed this height, coalesce
          if (scanY > pTargetY) {
            const timeSincePassed = Math.max(0, scanY - pTargetY) * 6.5; // speed factor
            localOffsetProgress = Math.min(1, timeSincePassed / 300);
          }
        }

        const easeVal = snapEase(localOffsetProgress);
        
        // Anti-gravity float: offset drifts slowly upward
        const driftY = p.oy - (elapsed * 0.035);
        
        const curX = finalX + p.ox * (1 - easeVal);
        const curY = finalY + driftY * (1 - easeVal);
        const curZ = finalZ + p.oz * (1 - easeVal);

        const proj = project(curX, curY, curZ, cx, cy);
        
        if (proj.z > -CAMERA_DIST) {
          p.projX = proj.x;
          p.projY = proj.y;
          p.projZ = proj.z;
          p.active = localOffsetProgress > 0;
          
          projectedParticles.push(p);
        }
      });

      // Sort by Z for proper 3D rendering (back to front)
      projectedParticles.sort((a, b) => b.projZ - a.projZ);

      // 7. Draw Latitude/Longitude Grid Lines (fade in as globe coalesces)
      if (elapsed > START_COALESCE) {
        ctx.strokeStyle = `rgba(6, 182, 212, ${0.12 * coalesceProgress})`;
        ctx.lineWidth = 0.55;

        // Draw 3 horizontal rings (latitudes)
        const latRings = [-45, 0, 45];
        latRings.forEach(latDeg => {
          const latRad = (latDeg * Math.PI) / 180;
          const r = GLOBE_RADIUS * Math.cos(latRad);
          const yVal = GLOBE_RADIUS * Math.sin(latRad);
          
          ctx.beginPath();
          for (let i = 0; i <= 64; i++) {
            const angle = (i * 2 * Math.PI) / 64;
            const tx = r * Math.sin(angle);
            const tz = r * Math.cos(angle);

            // Rotate
            let rx = tx * cosY + tz * sinY;
            let rz = -tx * sinY + tz * cosY;
            const finalY = yVal * cosX - rz * sinX;
            const finalZ = yVal * sinX + rz * cosX;

            const proj = project(rx, finalY, finalZ, cx, cy);
            if (proj.z > -CAMERA_DIST) {
              if (i === 0) ctx.moveTo(proj.x, proj.y);
              else ctx.lineTo(proj.x, proj.y);
            }
          }
          ctx.stroke();
        });

        // Draw 3 vertical rings (longitudes)
        const lonRings = [0, 60, 120];
        lonRings.forEach(lonDeg => {
          const lonRad = (lonDeg * Math.PI) / 180;
          
          ctx.beginPath();
          for (let i = 0; i <= 64; i++) {
            const angle = (i * 2 * Math.PI) / 64;
            const tx = GLOBE_RADIUS * Math.cos(angle) * Math.sin(lonRad);
            const ty = GLOBE_RADIUS * Math.sin(angle);
            const tz = GLOBE_RADIUS * Math.cos(angle) * Math.cos(lonRad);

            // Rotate
            let rx = tx * cosY + tz * sinY;
            let ry = ty;
            let rz = -tx * sinY + tz * cosY;
            const finalY = ry * cosX - rz * sinX;
            const finalZ = ry * sinX + rz * cosX;

            const proj = project(rx, finalY, finalZ, cx, cy);
            if (proj.z > -CAMERA_DIST) {
              if (i === 0) ctx.moveTo(proj.x, proj.y);
              else ctx.lineTo(proj.x, proj.y);
            }
          }
          ctx.stroke();
        });
      }

      // 8. Draw Scan Ring wave front
      if (elapsed > START_COALESCE && elapsed < END_COALESCE) {
        // Draw a glowing horizontal ring at height = scanY
        if (scanY > -GLOBE_RADIUS && scanY < GLOBE_RADIUS) {
          const scanR = Math.sqrt(Math.max(0, GLOBE_RADIUS * GLOBE_RADIUS - scanY * scanY));
          
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)'; // Bright cyan
          ctx.shadowColor = 'rgba(6, 182, 212, 0.8)';
          ctx.shadowBlur = 8;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          
          for (let i = 0; i <= 64; i++) {
            const angle = (i * 2 * Math.PI) / 64;
            const tx = scanR * Math.sin(angle);
            const tz = scanR * Math.cos(angle);

            // Rotate
            let rx = tx * cosY + tz * sinY;
            let rz = -tx * sinY + tz * cosY;
            const finalY = scanY * cosX - rz * sinX;
            const finalZ = scanY * sinX + rz * cosX;

            const proj = project(rx, finalY, finalZ, cx, cy);
            if (proj.z > -CAMERA_DIST) {
              if (i === 0) ctx.moveTo(proj.x, proj.y);
              else ctx.lineTo(proj.x, proj.y);
            }
          }
          ctx.stroke();
          
          // Reset shadow
          ctx.shadowBlur = 0;
        }
      }

      // 9. Draw Network Connections (bezier arcs between hubs)
      if (elapsed > START_COALESCE) {
        connections.forEach(conn => {
          const f = conn.from;
          const t = conn.to;
          
          // Only show lines if both nodes have begun to coalesce
          if (f.active && t.active) {
            // Draw arched bezier curve
            ctx.beginPath();
            ctx.moveTo(f.projX, f.projY);
            
            // Calculate a control point in 3D that is pulled outward
            const midX = (f.tx + t.tx) * 0.5;
            const midY = (f.ty + t.ty) * 0.5;
            const midZ = (f.tz + t.tz) * 0.5;
            
            // Distance from center
            const midDist = Math.sqrt(midX*midX + midY*midY + midZ*midZ);
            const pullFactor = 1.35; // arch height
            const cpX = (midX / midDist) * GLOBE_RADIUS * pullFactor;
            const cpY = (midY / midDist) * GLOBE_RADIUS * pullFactor;
            const cpZ = (midZ / midDist) * GLOBE_RADIUS * pullFactor;
            
            // Rotate control point
            let cprx = cpX * cosY + cpZ * sinY;
            let cpry = cpY;
            let cprz = -cpX * sinY + cpZ * cosY;
            const cpFinalY = cpry * cosX - cprz * sinX;
            const cpFinalZ = cpry * sinX + cprz * cosX;
            const cpFinalX = cprx;
            
            const cpProj = project(cpFinalX, cpFinalY, cpFinalZ, cx, cy);
            
            ctx.quadraticCurveTo(cpProj.x, cpProj.y, t.projX, t.projY);
            
            // Interpolate line opacity based on depth and coalesce factor
            const avgZ = (f.projZ + t.projZ) * 0.5;
            const depthAlpha = Math.max(0, (CAMERA_DIST + avgZ) / (2 * CAMERA_DIST));
            ctx.strokeStyle = `rgba(34, 211, 238, ${0.16 * coalesceProgress * depthAlpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();

            // 10. Draw running data packets along curves
            conn.packetProgress += conn.packetSpeed;
            if (conn.packetProgress > 1) {
              conn.packetProgress = 0;
              conn.packetSpeed = 0.005 + Math.random() * 0.008;
            }

            // Quadratic bezier interpolation: B(t) = (1-t)^2*P0 + 2(1-t)*t*P1 + t^2*P2
            const tp = conn.packetProgress;
            const ptX = (1-tp)*(1-tp)*f.projX + 2*(1-tp)*tp*cpProj.x + tp*tp*t.projX;
            const ptY = (1-tp)*(1-tp)*f.projY + 2*(1-tp)*tp*cpProj.y + tp*tp*t.projY;

            ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * coalesceProgress * depthAlpha})`;
            ctx.beginPath();
            ctx.arc(ptX, ptY, 1.5, 0, 2 * Math.PI);
            ctx.fill();
          }
        });
      }

      // 11. Draw Particles (Sorted back-to-front for correct depth cue)
      projectedParticles.forEach((p) => {
        // Calculate transparency based on depth (front is solid, back is fading out)
        const depthAlpha = Math.max(0.12, (CAMERA_DIST + p.projZ) / (2 * CAMERA_DIST));
        
        let alpha = depthAlpha;
        if (elapsed < START_COALESCE) {
          // fade in everything slowly at start
          alpha = Math.min(1, elapsed / 800) * depthAlpha;
        }

        // Draw
        ctx.fillStyle = p.color;
        
        // Hubs and scanning highlights get a soft glow
        if (p.isHub && p.active) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#22d3ee';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(p.projX, p.projY, p.size * (0.85 + Math.sin(elapsed * 0.005) * 0.15), 0, 2 * Math.PI);
          ctx.fill();
          ctx.shadowBlur = 0;
          
          // Outer hub ring
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.arc(p.projX, p.projY, p.size * 2.2, 0, 2 * Math.PI);
          ctx.stroke();
        } else {
          // Standard particles
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(p.projX, p.projY, p.size, 0, 2 * Math.PI);
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [onSettle]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-10 home-hero-canvas"
    />
  );
}
