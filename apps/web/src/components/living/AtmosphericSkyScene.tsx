"use client";

import React, { useEffect, useRef, useState } from "react";
import { SkyPalette } from "@/hooks/useAtmosphereState";
import { useWebGLFallback } from "@/hooks/useWebGLFallback";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface AtmosphericSkySceneProps {
  palette: SkyPalette;
  cloudCover?: number; // 0 to 100
  windSpeed?: number;  // km/h
  className?: string;
}

export function AtmosphericSkyScene({
  palette,
  cloudCover = 20,
  windSpeed = 12,
  className = "",
}: AtmosphericSkySceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isWebGLSupported = useWebGLFallback();
  const prefersReducedMotion = useReducedMotion();
  const [hasRenderError, setHasRenderError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isWebGLSupported || hasRenderError || prefersReducedMotion) {
      return;
    }

    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext("webgl", { alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      setHasRenderError(true);
      return;
    }

    if (!gl) {
      setHasRenderError(true);
      return;
    }

    // Vertex Shader
    const vertSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    // Atmospheric Raymarched Cloud / Sky Fragment Shader
    const fragSource = `
      precision mediump float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec3 u_cZenith;
      uniform vec3 u_cHorizon;
      uniform vec3 u_cCloud;
      uniform float u_cloudCover;
      uniform float u_speed;

      // Pseudo-noise function
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                   mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        vec2 shift = vec2(100.0);
        mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
        for (int i = 0; i < 4; ++i) {
          v += a * noise(p);
          p = rot * p * 2.0 + shift;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        
        // Sky vertical gradient
        vec3 sky = mix(u_cHorizon, u_cZenith, pow(uv.y, 0.8));

        // Moving cloud turbulence
        vec2 p = uv * 3.0;
        p.x += u_time * u_speed * 0.04;
        p.y += sin(u_time * 0.02) * 0.1;

        float n = fbm(p);
        float cloudDensity = smoothstep(1.0 - (u_cloudCover * 0.01), 1.2, n);

        vec3 finalColor = mix(sky, u_cCloud, cloudDensity * 0.65);
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    function createShader(glCtx: WebGLRenderingContext, type: number, source: string) {
      const shader = glCtx.createShader(type);
      if (!shader) return null;
      glCtx.shaderSource(shader, source);
      glCtx.compileShader(shader);
      if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
        glCtx.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertShader = createShader(gl, gl.VERTEX_SHADER, vertSource);
    const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragSource);

    if (!vertShader || !fragShader) {
      setHasRenderError(true);
      return;
    }

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setHasRenderError(true);
      return;
    }

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posAttr = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uZenith = gl.getUniformLocation(program, "u_cZenith");
    const uHorizon = gl.getUniformLocation(program, "u_cHorizon");
    const uCloud = gl.getUniformLocation(program, "u_cCloud");
    const uCloudCover = gl.getUniformLocation(program, "u_cloudCover");
    const uSpeed = gl.getUniformLocation(program, "u_speed");

    function parseHex(hex: string): [number, number, number] {
      const c = hex.replace("#", "");
      const r = parseInt(c.substring(0, 2), 16) / 255;
      const g = parseInt(c.substring(2, 4), 16) / 255;
      const b = parseInt(c.substring(4, 6), 16) / 255;
      return [isNaN(r) ? 0.1 : r, isNaN(g) ? 0.1 : g, isNaN(b) ? 0.2 : b];
    }

    let animId: number;
    let startTime = performance.now();

    const handleResize = () => {
      if (!canvas || !gl) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = canvas.clientWidth * dpr;
      const height = canvas.clientHeight * dpr;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const render = (now: number) => {
      if (!gl) return;
      const elapsed = (now - startTime) / 1000;

      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, elapsed);
      gl.uniform3fv(uZenith, parseHex(palette.zenith));
      gl.uniform3fv(uHorizon, parseHex(palette.horizon));
      gl.uniform3fv(uCloud, parseHex(palette.cloudLight));
      gl.uniform1f(uCloudCover, cloudCover);
      gl.uniform1f(uSpeed, Math.max(0.5, windSpeed * 0.08));

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animId);
      if (gl) {
        gl.deleteProgram(program);
        gl.deleteShader(vertShader);
        gl.deleteShader(fragShader);
      }
    };
  }, [palette, cloudCover, windSpeed, isWebGLSupported, hasRenderError, prefersReducedMotion]);

  // CSS Fallback representation
  const cssFallbackStyle = {
    background: `linear-gradient(180deg, ${palette.zenith} 0%, ${palette.horizon} 70%, #090B0F 100%)`,
  };

  return (
    <div ref={containerRef} className={`relative overflow-hidden pointer-events-none ${className}`}>
      {/* Fallback CSS gradient always mounted underneath */}
      <div className="absolute inset-0 transition-colors duration-1000" style={cssFallbackStyle} />

      {/* WebGL Canvas */}
      {isWebGLSupported && !hasRenderError && !prefersReducedMotion && (
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-80" />
      )}

      {/* Subtle SVG Film Grain Overlay */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
