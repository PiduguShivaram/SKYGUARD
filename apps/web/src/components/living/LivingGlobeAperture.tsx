"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useWebGLFallback } from "@/hooks/useWebGLFallback";

interface LivingGlobeApertureProps {
  onSelectCity?: (cityName: string) => void;
  selectedCityName?: string;
  isNight?: boolean;
  className?: string;
}

const CITIES = [
  { name: "Tokyo", lat: 35.6895, lon: 139.6917, temp: "8°", condition: "Clear" },
  { name: "London", lat: 51.5074, lon: -0.1278, temp: "11°", condition: "Rain" },
  { name: "New York", lat: 40.7128, lon: -74.006, temp: "14°", condition: "Dusk" },
  { name: "New Delhi", lat: 28.6139, lon: 77.209, temp: "22°", condition: "Haze" },
  { name: "Paris", lat: 48.8566, lon: 2.3522, temp: "9°", condition: "Clouds" },
  { name: "Sydney", lat: -33.8688, lon: 151.2093, temp: "21°", condition: "Sunny" },
];

function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export function LivingGlobeAperture({
  onSelectCity,
  selectedCityName,
  className = "",
}: LivingGlobeApertureProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const isWebGLSupported = useWebGLFallback();
  const prefersReduced = useReducedMotion();
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || !isWebGLSupported || prefersReduced) return;

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.z = 4.6;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const masterGlobe = new THREE.Group();
    scene.add(masterGlobe);

    // 1. Deep Obsidian Inner Sphere (Pure pitch-black interior, occluding backside)
    const innerGeo = new THREE.SphereGeometry(1.82, 48, 48);
    const innerMat = new THREE.MeshBasicMaterial({ color: 0x020408 });
    const innerSphere = new THREE.Mesh(innerGeo, innerMat);
    masterGlobe.add(innerSphere);

    // 2. Geodesic Triangulated Wireframe (Authentic Icosahedron from Benchmark Image 1)
    const icosaGeo = new THREE.IcosahedronGeometry(1.828, 3);
    const wireGeo = new THREE.WireframeGeometry(icosaGeo);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.14,
    });
    const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
    masterGlobe.add(wireMesh);

    // 3. Electric Cyan Fresnel Atmosphere Rim Glow (Outer Rim Shader from Benchmark Image 1)
    const atmosVertex = `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const innerRimFragment = `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vec3 viewDir = normalize(-vPosition);
        float rim = 1.0 - clamp(dot(vNormal, viewDir), 0.0, 1.0);
        float intensity = pow(rim, 3.2);
        gl_FragColor = vec4(0.0, 0.94, 1.0, 1.0) * intensity * 2.4;
      }
    `;

    const innerRimGeo = new THREE.SphereGeometry(1.834, 48, 48);
    const innerRimMat = new THREE.ShaderMaterial({
      vertexShader: atmosVertex,
      fragmentShader: innerRimFragment,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false,
    });
    const innerRimMesh = new THREE.Mesh(innerRimGeo, innerRimMat);
    masterGlobe.add(innerRimMesh);

    // Outer Atmosphere Halo (extending just outside the sphere)
    const outerHaloFragment = `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vec3 viewDir = normalize(-vPosition);
        float rim = clamp(dot(-vNormal, viewDir), 0.0, 1.0);
        float glow = pow(1.0 - rim, 3.4);
        gl_FragColor = vec4(0.0, 0.88, 1.0, 1.0) * glow * 1.8;
      }
    `;

    const outerHaloGeo = new THREE.SphereGeometry(1.95, 48, 48);
    const outerHaloMat = new THREE.ShaderMaterial({
      vertexShader: atmosVertex,
      fragmentShader: outerHaloFragment,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const outerHaloMesh = new THREE.Mesh(outerHaloGeo, outerHaloMat);
    scene.add(outerHaloMesh);

    // 4. Authentic High-Density Continental Dot Matrix Points (11,052 exact NASA land points)
    let pointsMesh: THREE.Points | null = null;
    let pointsGeo: THREE.BufferGeometry | null = null;

    fetch("/data/earth_land_points.json")
      .then((res) => res.json())
      .then((coords: number[]) => {
        if (!container || coords.length === 0) return;
        pointsGeo = new THREE.BufferGeometry();
        pointsGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(coords), 3));

        const pointsMat = new THREE.PointsMaterial({
          color: 0x00f0ff,
          size: 0.026,
          transparent: true,
          opacity: 0.92,
          blending: THREE.AdditiveBlending,
        });

        pointsMesh = new THREE.Points(pointsGeo, pointsMat);
        masterGlobe.add(pointsMesh);
      })
      .catch(() => {
        // graceful offline fallback
      });

    // 5. Glowing City Horizon Beacons
    const beaconGroup = new THREE.Group();
    masterGlobe.add(beaconGroup);

    const beaconObjects: { mesh: THREE.Mesh; name: string }[] = [];

    CITIES.forEach((city) => {
      const pos = latLonToVector3(city.lat, city.lon, 1.84);
      const isSelected = selectedCityName === city.name;
      const beaconColor = isSelected ? 0x00f0ff : 0x38bdf8;

      const dotGeo = new THREE.SphereGeometry(0.045, 16, 16);
      const dotMat = new THREE.MeshBasicMaterial({ color: beaconColor });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(pos);
      beaconGroup.add(dot);

      // Radiant Halo Ring
      const ringGeo = new THREE.RingGeometry(0.06, 0.09, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: beaconColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isSelected ? 0.9 : 0.6,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos.clone().multiplyScalar(1.008));
      ring.lookAt(pos.clone().multiplyScalar(2));
      beaconGroup.add(ring);

      beaconObjects.push({ mesh: dot, name: city.name });
    });

    // 6. Interactive Drag & Mouse Momentum (Smooth spring damping)
    let targetRotY = 0.4;
    let targetRotX = 0.15;
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    const handlePointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isDragging) {
        const dx = e.clientX - prevX;
        const dy = e.clientY - prevY;
        targetRotY += dx * 0.005;
        targetRotX += dy * 0.005;
        prevX = e.clientX;
        prevY = e.clientY;
      }
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    container.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    // Click Detection for City Horizon Beacons
    const raycaster = new THREE.Raycaster();
    const mouseVec = new THREE.Vector2();

    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouseVec, camera);
      const meshesToTest = beaconObjects.map((b) => b.mesh);
      const intersects = raycaster.intersectObjects(meshesToTest);

      if (intersects.length > 0) {
        const hit = beaconObjects.find((b) => b.mesh === intersects[0].object);
        if (hit && onSelectCity) {
          onSelectCity(hit.name);
        }
      }
    };

    container.addEventListener("click", handleClick);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // 60FPS Render Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!isDragging) {
        targetRotY += 0.0012; // slow planetary rotation
      }

      masterGlobe.rotation.y += (targetRotY - masterGlobe.rotation.y) * 0.08;
      masterGlobe.rotation.x += (targetRotX - masterGlobe.rotation.x) * 0.08;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener("pointerdown", handlePointerDown);
      container.removeEventListener("click", handleClick);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("resize", handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      icosaGeo.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      innerRimGeo.dispose();
      innerRimMat.dispose();
      outerHaloGeo.dispose();
      outerHaloMat.dispose();
      if (pointsGeo) pointsGeo.dispose();
    };
  }, [isWebGLSupported, prefersReduced, selectedCityName, onSelectCity]);

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      {/* 3D WebGL Canvas */}
      <div
        ref={mountRef}
        className="w-full max-w-[620px] h-[400px] sm:h-[480px] cursor-grab active:cursor-grabbing relative flex items-center justify-center"
      >
        {/* Ambient Cyan Aura */}
        <div className="absolute inset-0 bg-radial-gradient from-cyan-500/10 via-transparent to-transparent blur-3xl pointer-events-none" />

        {/* Non-WebGL Fallback */}
        {(!isWebGLSupported || prefersReduced) && (
          <div className="w-56 h-56 rounded-full border border-cyan-400/50 bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
              Planetary Horizon
            </span>
            <span className="text-[11px] text-slate-400 mt-2">
              Earth Troposphere • Live 60FPS
            </span>
          </div>
        )}
      </div>

      {/* Interactive Horizon City Selector Floating Beneath Globe */}
      <div className="relative z-10 -mt-4 flex flex-wrap items-center justify-center gap-2 max-w-xl px-4">
        {CITIES.map((city) => {
          const isSelected = selectedCityName === city.name;
          return (
            <button
              key={city.name}
              type="button"
              onClick={() => onSelectCity?.(city.name)}
              onMouseEnter={() => setHoveredCity(city.name)}
              onMouseLeave={() => setHoveredCity(null)}
              className={`group flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs transition-all backdrop-blur-xl ${
                isSelected
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400"
                  : "bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-800/80"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isSelected ? "bg-cyan-400 animate-ping" : "bg-cyan-500/60"
                }`}
              />
              <span className="font-medium text-slate-200">{city.name}</span>
              <span className="text-[11px] font-mono text-slate-400 tabular-nums">{city.temp}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] font-mono text-slate-400 uppercase tracking-widest text-center">
        Drag to rotate troposphere • Click any horizon to inhabit its atmosphere
      </p>
    </div>
  );
}
