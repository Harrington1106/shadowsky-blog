/* ============================================================
   fluid-bg.js — WebGL Navier-Stokes 流体背景引擎
   基于 PavelDoGreat/WebGL-Fluid-Simulation (MIT) 精简改造
   职责：渲染流体、自动喷溅、监听主题切换、降级
   依赖：window.LiquidFluidConfig (纯函数配置层)
   ============================================================ */
(function() {
  'use strict';

  const CFG = window.LiquidFluidConfig;
  if (!CFG) { console.warn('[fluid-bg] fluid-config.js 未加载，跳过初始化'); return; }

  const canvas = document.getElementById('fluid-canvas');
  if (!canvas) return; // 非主页不初始化

  const html = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── WebGL 支持检测 ──
  function detectWebGL() {
    try {
      const gl = canvas.getContext('webgl', { alpha: true, depth: false, stencil: false, preserveDrawingBuffer: false })
              || canvas.getContext('experimental-webgl');
      if (!gl) return false;
      // 需要 floating-point texture 扩展支持流体精度
      const halfFloat = gl.getExtension('OES_texture_half_float');
      const floatTex = gl.getExtension('OES_texture_float');
      return !!(halfFloat || floatTex);
    } catch (e) { return false; }
  }

  // ── 降级路径 ──
  if (CFG.shouldUseFallback({ webglSupported: detectWebGL(), reducedMotion })) {
    canvas.style.display = 'none';
    const fb = document.getElementById('fluid-fallback');
    if (fb) fb.style.display = 'block';
    console.info('[fluid-bg] 降级到 CSS 后备方案 (WebGL: ' + detectWebGL() + ', reducedMotion: ' + reducedMotion + ')');
    return;
  }

  const gl = canvas.getContext('webgl', {
    alpha: true,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    antialias: false
  });
  if (!gl) return;

  // 获取 float texture 支持
  const halfFloat = gl.getExtension('OES_texture_half_float');
  const floatTex = gl.getExtension('OES_texture_float');
  const texType = halfFloat ? halfFloat.HALF_FLOAT_OES : (floatTex ? gl.FLOAT : gl.UNSIGNED_BYTE);

  // ── 分辨率（调用纯函数）──
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let res = CFG.getSimResolution(window.innerWidth);
  let simW, simH, dyeW, dyeH;

  function updateResolutions() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    res = CFG.getSimResolution(window.innerWidth);
    simW = Math.max(16, Math.floor(window.innerWidth * res.simResolution));
    simH = Math.max(16, Math.floor(window.innerHeight * res.simResolution));
    dyeW = Math.max(32, Math.floor(window.innerWidth * res.dyeResolution));
    dyeH = Math.max(32, Math.floor(window.innerHeight * res.dyeResolution));
  }
  updateResolutions();

  // ── Shader 编译辅助 ──
  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('[fluid-bg] Shader compile error:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function createProgram(vsSrc, fsSrc) {
    const vs = compile(gl.VERTEX_SHADER, vsSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error('[fluid-bg] Program link error:', gl.getProgramInfoLog(p));
      gl.deleteProgram(p);
      return null;
    }
    return p;
  }

  // ── 基础着色器 ──
  const baseVS = [
    'attribute vec2 aPos;',
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = aPos * 0.5 + 0.5;',
    '  gl_Position = vec4(aPos, 0.0, 1.0);',
    '}'
  ].join('\n');

  // Display: 渲染染料到屏幕，增强颜色，暗区透明露出 CSS 背景
  const displayFS = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform sampler2D uDye;',
    'uniform float uIntensity;',
    'void main() {',
    '  vec3 c = texture2D(uDye, vUv).rgb;',
    '  float brightness = dot(c, vec3(0.299, 0.587, 0.114));',
    '  vec3 enhanced = c * (1.0 + uIntensity * (1.0 - brightness));',
    '  float alpha = smoothstep(0.0, 0.15, brightness);',  // 暗区透明
    '  gl_FragColor = vec4(enhanced, alpha);',
    '}'
  ].join('\n');

  // Splat: 在指定位置添加颜色和速度
  const splatFS = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform sampler2D uTarget;',
    'uniform vec2 uPoint;',
    'uniform float uRadius;',
    'uniform vec3 uColor;',
    'uniform vec2 uAspect;',
    'void main() {',
    '  vec2 p = vUv - uPoint;',
    '  p.x *= uAspect.x / uAspect.y;',
    '  float dist = dot(p, p);',
    '  float splat = exp(-dist / uRadius) * step(dist, uRadius * 4.0);',
    '  vec3 base = texture2D(uTarget, vUv).rgb;',
    '  gl_FragColor = vec4(base + splat * uColor, 1.0);',
    '}'
  ].join('\n');

  // Advection: 根据速度场移动染料/速度
  const advectionFS = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform sampler2D uVelocity;',
    'uniform sampler2D uSource;',
    'uniform vec2 uTexelSize;',
    'uniform float uDt;',
    'uniform float uDissipation;',
    'void main() {',
    '  vec2 vel = texture2D(uVelocity, vUv).xy;',
    '  vec2 pos = vUv - vel * uDt * uTexelSize;',
    '  // 半拉格朗日回溯，双线性采样',
    '  vec3 result = texture2D(uSource, pos).rgb;',
    '  float decay = 1.0 + uDissipation * uDt;',
    '  gl_FragColor = vec4(result / decay, 1.0);',
    '}'
  ].join('\n');

  // Jacobi: 迭代求解压力
  const jacobiFS = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform sampler2D uPressure;',
    'uniform sampler2D uDivergence;',
    'uniform vec2 uTexelSize;',
    'void main() {',
    '  // 5点模板',
    '  float pL = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;',
    '  float pR = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;',
    '  float pB = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;',
    '  float pT = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;',
    '  float div = texture2D(uDivergence, vUv).x;',
    '  float p = (pL + pR + pB + pT - div) * 0.25;',
    '  gl_FragColor = vec4(p, 0.0, 0.0, 1.0);',
    '}'
  ].join('\n');

  // Divergence: 计算速度场的散度
  const divergenceFS = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform sampler2D uVelocity;',
    'uniform vec2 uTexelSize;',
    'void main() {',
    '  float vL = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).x;',
    '  float vR = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).x;',
    '  float vB = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).y;',
    '  float vT = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).y;',
    '  float div = 0.5 * ((vR - vL) / uTexelSize.x + (vT - vB) / uTexelSize.y);',
    '  gl_FragColor = vec4(div, 0.0, 0.0, 1.0);',
    '}'
  ].join('\n');

  // Gradient Subtract: 从速度场中减去压力梯度
  const gradientFS = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform sampler2D uPressure;',
    'uniform sampler2D uVelocity;',
    'uniform vec2 uTexelSize;',
    'void main() {',
    '  float pL = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;',
    '  float pR = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;',
    '  float pB = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;',
    '  float pT = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;',
    '  vec2 vel = texture2D(uVelocity, vUv).xy;',
    '  vel -= 0.5 * vec2(pR - pL, pT - pB) / uTexelSize;',
    '  gl_FragColor = vec4(vel, 0.0, 1.0);',
    '}'
  ].join('\n');

  // Vorticity: 增强小尺度涡旋
  const vorticityFS = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform sampler2D uVelocity;',
    'uniform vec2 uTexelSize;',
    'uniform float uCurl;',
    'void main() {',
    '  float vL = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).y;',
    '  float vR = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).y;',
    '  float vB = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).x;',
    '  float vT = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).x;',
    '  float curl = 0.5 * ((vR - vL) / uTexelSize.x - (vT - vB) / uTexelSize.y);',
    '  // 计算涡旋力的方向',
    '  float cL = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).x;',
    '  float cR = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).x;',
    '  float cB = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).x;',
    '  float cT = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).x;',
    '  float gradX = (abs(cT) - abs(cB)) / uTexelSize.y;',
    '  float gradY = (abs(cR) - abs(cL)) / uTexelSize.x;',
    '  float len = length(vec2(gradX, gradY)) + 0.0001;',
    '  vec2 force = uCurl * vec2(gradX, -gradY) / len * curl;',
    '  vec2 vel = texture2D(uVelocity, vUv).xy + force * uTexelSize;',
    '  gl_FragColor = vec4(vel, 0.0, 1.0);',
    '}'
  ].join('\n');

  // Clear
  const clearFS = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform vec3 uColor;',
    'void main() {',
    '  gl_FragColor = vec4(uColor, 1.0);',
    '}'
  ].join('\n');

  // ── 编译所有着色器程序 ──
  const displayProg = createProgram(baseVS, displayFS);
  const splatProg = createProgram(baseVS, splatFS);
  const advectionProg = createProgram(baseVS, advectionFS);
  const jacobiProg = createProgram(baseVS, jacobiFS);
  const divergenceProg = createProgram(baseVS, divergenceFS);
  const gradientProg = createProgram(baseVS, gradientFS);
  const vorticityProg = createProgram(baseVS, vorticityFS);
  const clearProg = createProgram(baseVS, clearFS);

  if (!displayProg || !splatProg || !advectionProg) {
    console.error('[fluid-bg] Shader compilation failed, falling back');
    canvas.style.display = 'none';
    const fb = document.getElementById('fluid-fallback');
    if (fb) fb.style.display = 'block';
    return;
  }

  // ── FBO 工具函数 ──
  function createFBO(w, h, internalFormat, format, type) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

    return { fbo, tex, w, h, attach(id) { return id; } };
  }

  function createDoubleFBO(w, h, internalFormat, format, type) {
    return {
      read: createFBO(w, h, internalFormat, format, type),
      write: createFBO(w, h, internalFormat, format, type),
      swap() {
        const tmp = this.read;
        this.read = this.write;
        this.write = tmp;
      }
    };
  }

  // ── 全屏四边形 ──
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  function blit(prog) {
    const loc = gl.getAttribLocation(prog, 'aPos');
    if (loc < 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // ── 创建纹理 ──
  function createTextures() {
    return {
      dye: createDoubleFBO(dyeW, dyeH, gl.RGBA, gl.RGBA, texType),
      velocity: createDoubleFBO(simW, simH, gl.RGBA, gl.RGBA, texType),
      pressure: createDoubleFBO(simW, simH, gl.RGBA, gl.RGBA, texType),
      divergence: createFBO(simW, simH, gl.RGBA, gl.RGBA, texType)
    };
  }

  let textures = createTextures();

  // ── 配置参数 ──
  let currentPalette = CFG.getThemePalette(html.classList.contains('dark') ? 'dark' : 'light');
  let splatterIndex = 0;
  let splatQueue = []; // 待喷溅队列 [{x, y, dx, dy, colorHex}]

  const config = {
    simResolution: res.simResolution,
    dyeResolution: res.dyeResolution,
    densityDissipation: 0.985,   // 染料消散
    velocityDissipation: 0.992,  // 速度消散
    pressureDissipation: 0.6,    // 压力消散
    pressureIterations: 20,      // 压力迭代次数
    curl: 18,                    // 涡旋强度
    splatRadius: 0.003,          // 喷溅半径
    splatForce: 5000,            // 喷溅力度
    dt: 0.016                    // 时间步长(约60fps)
  };

  // ── 喷溅函数 ──
  function splat(x, y, dx, dy, colorHex, radius) {
    const rgb = CFG.hexToRGB(colorHex);
    const r = radius || config.splatRadius;

    gl.useProgram(splatProg);
    gl.bindFramebuffer(gl.FRAMEBUFFER, textures.velocity.write.fbo);
    gl.viewport(0, 0, simW, simH);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.velocity.read.tex);
    gl.uniform1i(gl.getUniformLocation(splatProg, 'uTarget'), 0);
    gl.uniform2f(gl.getUniformLocation(splatProg, 'uPoint'), x, y);
    gl.uniform1f(gl.getUniformLocation(splatProg, 'uRadius'), r);
    gl.uniform3f(gl.getUniformLocation(splatProg, 'uColor'),
      dx * config.splatForce, dy * config.splatForce, 0.0);
    gl.uniform2f(gl.getUniformLocation(splatProg, 'uAspect'), simW, simH);
    blit(splatProg);
    textures.velocity.swap();

    gl.bindFramebuffer(gl.FRAMEBUFFER, textures.dye.write.fbo);
    gl.viewport(0, 0, dyeW, dyeH);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.dye.read.tex);
    gl.uniform1i(gl.getUniformLocation(splatProg, 'uTarget'), 0);
    gl.uniform2f(gl.getUniformLocation(splatProg, 'uPoint'), x, y);
    gl.uniform1f(gl.getUniformLocation(splatProg, 'uRadius'), r);
    gl.uniform3f(gl.getUniformLocation(splatProg, 'uColor'),
      rgb.r * currentPalette.dyeAlpha,
      rgb.g * currentPalette.dyeAlpha,
      rgb.b * currentPalette.dyeAlpha);
    gl.uniform2f(gl.getUniformLocation(splatProg, 'uAspect'), dyeW, dyeH);
    blit(splatProg);
    textures.dye.swap();
  }

  // ── 鼠标交互 ──
  let mouseX = 0, mouseY = 0;
  let prevMouseX = 0, prevMouseY = 0;
  let mouseDown = false;

  function onMouseMove(clientX, clientY) {
    prevMouseX = mouseX;
    prevMouseY = mouseY;
    mouseX = clientX / window.innerWidth;
    mouseY = 1.0 - clientY / window.innerHeight;
    const dx = mouseX - prevMouseX;
    const dy = mouseY - prevMouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0.0001) {
      const color = CFG.pickAutoSplatterColor(currentPalette, splatterIndex++);
      // 多点插值使拖尾更平滑
      const steps = Math.min(4, Math.ceil(dist / 0.005));
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const ix = prevMouseX + dx * t;
        const iy = prevMouseY + dy * t;
        splatQueue.push({ x: ix, y: iy, dx: dx * 0.8, dy: dy * 0.8, colorHex: color });
      }
    }
  }

  function onMouseDown(e) {
    mouseDown = true;
    prevMouseX = e.clientX / window.innerWidth;
    prevMouseY = 1.0 - e.clientY / window.innerHeight;
    mouseX = prevMouseX;
    mouseY = prevMouseY;
  }

  function onMouseUp() { mouseDown = false; }
  function onTouchMove(e) {
    if (e.touches[0]) {
      onMouseMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }
  function onTouchStart(e) {
    if (e.touches[0]) {
      mouseDown = true;
      prevMouseX = e.touches[0].clientX / window.innerWidth;
      prevMouseY = 1.0 - e.touches[0].clientY / window.innerHeight;
      mouseX = prevMouseX;
      mouseY = prevMouseY;
    }
  }

  window.addEventListener('mousemove', function(e) { onMouseMove(e.clientX, e.clientY); }, { passive: true });
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchend', onMouseUp);

  // ── 自动喷溅（背景持续流动）──
  let autoSplatterInterval = parseFloat(getComputedStyle(html).getPropertyValue('--neon-splatter-interval')) || 3000;
  let autoTimer = null;

  function startAutoSplatter() {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = setInterval(function() {
      const x = 0.15 + Math.random() * 0.7;
      const y = 0.15 + Math.random() * 0.7;
      const angle = Math.random() * Math.PI * 2;
      const force = 0.3 + Math.random() * 0.7;
      const dx = Math.cos(angle) * force;
      const dy = Math.sin(angle) * force;
      const color = CFG.pickAutoSplatterColor(currentPalette, splatterIndex++);
      splatQueue.push({ x, y, dx, dy, colorHex: color });
    }, autoSplatterInterval);
  }

  startAutoSplatter();

  // ── 处理喷溅队列 ──
  function processSplatQueue() {
    const maxPerFrame = 8;
    for (let i = 0; i < Math.min(splatQueue.length, maxPerFrame); i++) {
      const s = splatQueue.shift();
      splat(s.x, s.y, s.dx, s.dy, s.colorHex);
    }
    if (splatQueue.length > 30) {
      splatQueue.length = 30; // 防止队列堆积
    }
  }

  // ── 单步流体模拟 ──
  function step(dt) {
    // 处理喷溅队列
    processSplatQueue();

    const texelSizeSim = { x: 1.0 / simW, y: 1.0 / simH };
    const texelSizeDye = { x: 1.0 / dyeW, y: 1.0 / dyeH };

    // 1. Vorticity
    if (vorticityProg) {
      gl.useProgram(vorticityProg);
      gl.bindFramebuffer(gl.FRAMEBUFFER, textures.velocity.write.fbo);
      gl.viewport(0, 0, simW, simH);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textures.velocity.read.tex);
      gl.uniform1i(gl.getUniformLocation(vorticityProg, 'uVelocity'), 0);
      gl.uniform2f(gl.getUniformLocation(vorticityProg, 'uTexelSize'), texelSizeSim.x, texelSizeSim.y);
      gl.uniform1f(gl.getUniformLocation(vorticityProg, 'uCurl'), config.curl);
      blit(vorticityProg);
      textures.velocity.swap();
    }

    // 2. Advect velocity
    gl.useProgram(advectionProg);
    gl.bindFramebuffer(gl.FRAMEBUFFER, textures.velocity.write.fbo);
    gl.viewport(0, 0, simW, simH);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.velocity.read.tex);
    gl.uniform1i(gl.getUniformLocation(advectionProg, 'uVelocity'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures.velocity.read.tex);
    gl.uniform1i(gl.getUniformLocation(advectionProg, 'uSource'), 1);
    gl.uniform2f(gl.getUniformLocation(advectionProg, 'uTexelSize'), texelSizeSim.x, texelSizeSim.y);
    gl.uniform1f(gl.getUniformLocation(advectionProg, 'uDt'), dt);
    gl.uniform1f(gl.getUniformLocation(advectionProg, 'uDissipation'), config.velocityDissipation);
    blit(advectionProg);
    textures.velocity.swap();

    // 3. Divergence
    gl.useProgram(divergenceProg);
    gl.bindFramebuffer(gl.FRAMEBUFFER, textures.divergence.fbo);
    gl.viewport(0, 0, simW, simH);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.velocity.read.tex);
    gl.uniform1i(gl.getUniformLocation(divergenceProg, 'uVelocity'), 0);
    gl.uniform2f(gl.getUniformLocation(divergenceProg, 'uTexelSize'), texelSizeSim.x, texelSizeSim.y);
    blit(divergenceProg);

    // 4. Clear pressure
    gl.useProgram(clearProg);
    gl.bindFramebuffer(gl.FRAMEBUFFER, textures.pressure.read.fbo);
    gl.viewport(0, 0, simW, simH);
    gl.uniform3f(gl.getUniformLocation(clearProg, 'uColor'), 0, 0, 0);
    blit(clearProg);
    gl.bindFramebuffer(gl.FRAMEBUFFER, textures.pressure.write.fbo);
    blit(clearProg);

    // 5. Pressure solve (Jacobi iterations)
    gl.useProgram(jacobiProg);
    gl.uniform2f(gl.getUniformLocation(jacobiProg, 'uTexelSize'), texelSizeSim.x, texelSizeSim.y);
    for (let i = 0; i < config.pressureIterations; i++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, textures.pressure.write.fbo);
      gl.viewport(0, 0, simW, simH);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textures.pressure.read.tex);
      gl.uniform1i(gl.getUniformLocation(jacobiProg, 'uPressure'), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, textures.divergence.tex);
      gl.uniform1i(gl.getUniformLocation(jacobiProg, 'uDivergence'), 1);
      blit(jacobiProg);
      textures.pressure.swap();
    }

    // 6. Gradient subtract
    gl.useProgram(gradientProg);
    gl.bindFramebuffer(gl.FRAMEBUFFER, textures.velocity.write.fbo);
    gl.viewport(0, 0, simW, simH);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.pressure.read.tex);
    gl.uniform1i(gl.getUniformLocation(gradientProg, 'uPressure'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures.velocity.read.tex);
    gl.uniform1i(gl.getUniformLocation(gradientProg, 'uVelocity'), 1);
    gl.uniform2f(gl.getUniformLocation(gradientProg, 'uTexelSize'), texelSizeSim.x, texelSizeSim.y);
    blit(gradientProg);
    textures.velocity.swap();

    // 7. Advect dye
    gl.useProgram(advectionProg);
    gl.bindFramebuffer(gl.FRAMEBUFFER, textures.dye.write.fbo);
    gl.viewport(0, 0, dyeW, dyeH);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.velocity.read.tex);
    gl.uniform1i(gl.getUniformLocation(advectionProg, 'uVelocity'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures.dye.read.tex);
    gl.uniform1i(gl.getUniformLocation(advectionProg, 'uSource'), 1);
    gl.uniform2f(gl.getUniformLocation(advectionProg, 'uTexelSize'), texelSizeDye.x, texelSizeDye.y);
    gl.uniform1f(gl.getUniformLocation(advectionProg, 'uDt'), dt);
    gl.uniform1f(gl.getUniformLocation(advectionProg, 'uDissipation'), config.densityDissipation);
    blit(advectionProg);
    textures.dye.swap();
  }

  // ── 渲染循环 ──
  let rafId = null;
  let lastTime = performance.now();

  function render(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000); // cap at ~30fps equivalent
    lastTime = now;

    // 运行流体模拟
    step(dt || config.dt);

    // 渲染到屏幕
    gl.useProgram(displayProg);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.dye.read.tex);
    gl.uniform1i(gl.getUniformLocation(displayProg, 'uDye'), 0);
    gl.uniform1f(gl.getUniformLocation(displayProg, 'uIntensity'), currentPalette.glowIntensity);
    blit(displayProg);

    rafId = requestAnimationFrame(render);
  }

  // ── Resize ──
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';

    updateResolutions();
    textures = createTextures();

    // 重设后添加初始喷溅
    for (let i = 0; i < 4; i++) {
      const color = CFG.pickAutoSplatterColor(currentPalette, i);
      splatQueue.push({
        x: 0.2 + Math.random() * 0.6,
        y: 0.2 + Math.random() * 0.6,
        dx: (Math.random() - 0.5) * 0.6,
        dy: (Math.random() - 0.5) * 0.6,
        colorHex: color
      });
    }
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function() {
    setTimeout(resize, 100);
  });

  // ── 主题切换监听 ──
  window.addEventListener('themechange', function() {
    const isDark = html.classList.contains('dark');
    currentPalette = CFG.getThemePalette(isDark ? 'dark' : 'light');

    // 更新自动喷溅间隔
    autoSplatterInterval = parseFloat(getComputedStyle(html).getPropertyValue('--neon-splatter-interval')) || 3000;
    startAutoSplatter();

    // 添加新主题色喷溅
    for (let i = 0; i < 6; i++) {
      const color = CFG.pickAutoSplatterColor(currentPalette, i);
      splatQueue.push({
        x: 0.1 + Math.random() * 0.8,
        y: 0.1 + Math.random() * 0.8,
        dx: (Math.random() - 0.5) * 1.0,
        dy: (Math.random() - 0.5) * 1.0,
        colorHex: color
      });
    }
  });

  // ── 标签页可见性 ──
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    } else {
      lastTime = performance.now();
      if (!autoTimer) startAutoSplatter();
      rafId = requestAnimationFrame(render);
    }
  });

  // ── 启动 ──
  // 初始喷溅：让背景一开始就有色彩
  for (let i = 0; i < 8; i++) {
    const color = CFG.pickAutoSplatterColor(currentPalette, i);
    splatQueue.push({
      x: 0.05 + Math.random() * 0.9,
      y: 0.05 + Math.random() * 0.9,
      dx: (Math.random() - 0.5) * 1.2,
      dy: (Math.random() - 0.5) * 1.2,
      colorHex: color
    });
  }

  rafId = requestAnimationFrame(render);

  console.info('[fluid-bg] WebGL 流体引擎已启动 | 分辨率: sim=' + simW + 'x' + simH + ' dye=' + dyeW + 'x' + dyeH + ' | 主题: ' + currentPalette.theme);

})();
