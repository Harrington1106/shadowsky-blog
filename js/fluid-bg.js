/* ============================================================
   fluid-bg.js — 简单 WebGL 流体背景
   基于 splat 累积 + 淡出 + 自喷溅，无复杂 Navier-Stokes
   依赖：window.LiquidFluidConfig
   ============================================================ */
(function() {
  'use strict';

  const CFG = window.LiquidFluidConfig;
  if (!CFG) { return; }

  const canvas = document.getElementById('fluid-canvas');
  if (!canvas) { return; }

  // ── 初始化 WebGL ──
  const gl = (function() {
    const names = ['webgl2', 'webgl', 'experimental-webgl'];
    for (const n of names) {
      try {
        const ctx = canvas.getContext(n, {
          alpha: true, depth: false, stencil: false,
          preserveDrawingBuffer: false, antialias: false,
          premultipliedAlpha: false
        });
        if (ctx) return ctx;
      } catch(e) {}
    }
    return null;
  })();

  if (!gl) {
    // WebGL 不可用，保持 CSS fallback 可见
    return;
  }

  // WebGL OK → 显示 canvas，隐藏 fallback
  canvas.style.display = 'block';
  const fbEl = document.getElementById('fluid-fallback');
  if (fbEl) fbEl.style.display = 'none';

  // ── 着色器 ──
  const VS = `
    attribute vec2 aPos;
    varying vec2 vUv;
    void main(){vUv=aPos*0.5+0.5;gl_Position=vec4(aPos,0.,1.);}
  `;

  // 显示着色器：直接输出染料纹理
  const FS_DISPLAY = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uDye;
    void main(){
      vec4 c = texture2D(uDye, vUv);
      gl_FragColor = c;
    }
  `;

  // 添加 splat 着色器
  const FS_SPLAT = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTarget;
    uniform vec2 uPoint;
    uniform float uRadius;
    uniform vec4 uColor;
    void main(){
      vec2 p = vUv - uPoint;
      float d = dot(p, p);
      float s = exp(-d / uRadius);
      vec4 base = texture2D(uTarget, vUv);
      gl_FragColor = base + uColor * s;
    }
  `;

  // 衰减着色器（每帧让染料慢慢淡出）
  const FS_FADE = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uSource;
    uniform float uDecay;
    void main(){
      vec4 c = texture2D(uSource, vUv);
      gl_FragColor = c * uDecay;
    }
  `;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }
  function program(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    return p;
  }

  const displayPrg = program(VS, FS_DISPLAY);
  const splatPrg = program(VS, FS_SPLAT);
  const fadePrg = program(VS, FS_FADE);

  // ── 全屏四边形 ──
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

  function blit() {
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // ── FBO 双缓冲 ──
  function createTex(w, h) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return { tex: t, fb: fb, w: w, h: h };
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(window.innerWidth * dpr);
    const h = Math.floor(window.innerHeight * dpr);
    canvas.width = w;
    canvas.height = h;

    // 染料分辨率 = 屏幕分辨率 / 2（性能）
    const dw = Math.floor(w / 2);
    const dh = Math.floor(h / 2);

    if (dyeA) { gl.deleteTexture(dyeA.tex); gl.deleteFramebuffer(dyeA.fb); }
    if (dyeB) { gl.deleteTexture(dyeB.tex); gl.deleteFramebuffer(dyeB.fb); }
    dyeA = createTex(dw, dh);
    dyeB = createTex(dw, dh);

    // 清空
    gl.bindFramebuffer(gl.FRAMEBUFFER, dyeA.fb);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, dyeB.fb);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 初始色斑
    initSplats();
  }

  let dyeA, dyeB;

  function swap() { const t = dyeA; dyeA = dyeB; dyeB = t; }

  // ── 主题色 ──
  const html = document.documentElement;
  let palette = CFG.getThemePalette(html.classList.contains('dark') ? 'dark' : 'light');
  let colorIdx = 0;

  function hexToRGBA(hex) {
    return [
      parseInt(hex.slice(1,3), 16) / 255,
      parseInt(hex.slice(3,5), 16) / 255,
      parseInt(hex.slice(5,7), 16) / 255,
      palette.dyeAlpha
    ];
  }

  function nextColor() {
    const c = palette.colors[colorIdx % palette.colors.length];
    colorIdx++;
    return c;
  }

  // ── Splat ──
  function splat(nx, ny, colorHex) {
    const rgba = hexToRGBA(colorHex);
    gl.useProgram(splatPrg);

    // 读取当前 dyeA
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dyeA.tex);
    gl.uniform1i(gl.getUniformLocation(splatPrg, 'uTarget'), 0);
    gl.uniform2f(gl.getUniformLocation(splatPrg, 'uPoint'), nx, 1.0 - ny);
    gl.uniform1f(gl.getUniformLocation(splatPrg, 'uRadius'), 0.0008);
    gl.uniform4f(gl.getUniformLocation(splatPrg, 'uColor'), rgba[0], rgba[1], rgba[2], rgba[3]);

    gl.bindFramebuffer(gl.FRAMEBUFFER, dyeB.fb);
    gl.viewport(0, 0, dyeB.w, dyeB.h);
    blit();
    swap();
  }

  // ── 初始色斑 ──
  function initSplats() {
    for (let i = 0; i < 6; i++) {
      splat(0.1 + Math.random() * 0.8, 0.1 + Math.random() * 0.8, nextColor());
    }
  }

  // ── 鼠标 ──
  let mx = 0.5, my = 0.5;
  window.addEventListener('mousemove', function(e) {
    mx = e.clientX / window.innerWidth;
    my = e.clientY / window.innerHeight;
    const dx = (mx - (window._lastMx || mx));
    const dy = (my - (window._lastMy || my));
    const speed = Math.sqrt(dx*dx + dy*dy);
    if (speed > 0.002) {
      splat(mx, my, nextColor());
    }
    window._lastMx = mx;
    window._lastMy = my;
  }, { passive: true });

  window.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if (e.touches[0]) {
      mx = e.touches[0].clientX / window.innerWidth;
      my = e.touches[0].clientY / window.innerHeight;
      splat(mx, my, nextColor());
    }
  }, { passive: false });

  // ── 自动喷溅 ──
  setInterval(function() {
    splat(0.15 + Math.random() * 0.7, 0.15 + Math.random() * 0.7, nextColor());
  }, 2500);

  // ── 主题切换 ──
  window.addEventListener('themechange', function() {
    palette = CFG.getThemePalette(html.classList.contains('dark') ? 'dark' : 'light');
    initSplats();
  });

  // ── 渲染循环 ──
  function render() {
    // 1. 衰减上一帧
    gl.useProgram(fadePrg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dyeA.tex);
    gl.uniform1i(gl.getUniformLocation(fadePrg, 'uSource'), 0);
    gl.uniform1f(gl.getUniformLocation(fadePrg, 'uDecay'), 0.985);
    gl.bindFramebuffer(gl.FRAMEBUFFER, dyeB.fb);
    gl.viewport(0, 0, dyeB.w, dyeB.h);
    blit();
    swap();

    // 2. 显示到屏幕
    gl.useProgram(displayPrg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dyeA.tex);
    gl.uniform1i(gl.getUniformLocation(displayPrg, 'uDye'), 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    blit();

    requestAnimationFrame(render);
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  render();
})();
