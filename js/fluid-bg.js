/* ============================================================
   fluid-bg.js — WebGL Navier-Stokes 流体背景引擎
   基于 PavelDoGreat/WebGL-Fluid-Simulation (MIT) 精简改造
   算法: Stable Fluids (Jos Stam, GPU Gems Ch.38)
   Pass: advection → divergence → pressure → gradient subtract → splat → display

   职责：渲染流体、自动喷溅、鼠标交互、监听主题切换、降级
   依赖：window.LiquidFluidConfig (纯函数配置层, js/fluid-config.js)
   ============================================================ */
(function() {
  'use strict';

  const CFG = window.LiquidFluidConfig;
  if (!CFG) { console.error('[fluid-bg] fluid-config.js 未加载'); return; }

  const canvas = document.getElementById('fluid-canvas');
  if (!canvas) return; // 非主页不初始化

  const html = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── WebGL 1.0 支持检测 ── */
  function getWebGLContext() {
    const ext = ['webgl2', 'webgl', 'experimental-webgl'];
    for (const name of ext) {
      try {
        const gl = canvas.getContext(name, {
          alpha: true, depth: false, stencil: false,
          preserveDrawingBuffer: false, antialias: false
        });
        if (gl) return gl;
      } catch (e) { /* skip */ }
    }
    return null;
  }

  const gl = getWebGLContext();
  const webglSupported = !!gl;

  /* ── 降级路径 ── */
  if (CFG.shouldUseFallback({ webglSupported, reducedMotion })) {
    canvas.style.display = 'none';
    const fb = document.getElementById('fluid-fallback');
    if (fb) fb.style.display = 'block';
    console.info('[fluid-bg] 降级到 CSS 后备方案');
    return;
  }

  /* ── 浮点纹理支持检测 ── */
  let halfFloatExt = null;
  let floatExt = null;
  if (gl.getExtension('OES_texture_half_float')) {
    halfFloatExt = gl.getExtension('OES_texture_half_float');
  }
  if (gl.getExtension('OES_texture_half_float_linear')) {
    // 半精度线性过滤，质量更好
  }
  if (gl.getExtension('OES_texture_float')) {
    floatExt = gl.getExtension('OES_texture_float');
  }
  const texType = halfFloatExt ? halfFloatExt.HALF_FLOAT_OES : gl.UNSIGNED_BYTE;

  /* ── 分辨率配置（调用纯函数）── */
  let res = CFG.getSimResolution(window.innerWidth);
  let simW, simH, dyeW, dyeH;

  function calcResolutions() {
    res = CFG.getSimResolution(window.innerWidth);
    simW = Math.floor(window.innerWidth * res.simResolution);
    simH = Math.floor(window.innerHeight * res.simResolution);
    dyeW = Math.floor(window.innerWidth * res.dyeResolution);
    dyeH = Math.floor(window.innerHeight * res.dyeResolution);
  }
  calcResolutions();

  /* ── Shader 编译 ── */
  function compileShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('[fluid-bg] shader error:', gl.getShaderInfoLog(s));
    }
    return s;
  }

  function createProgram(vsSrc, fsSrc) {
    const p = gl.createProgram();
    gl.attachShader(p, compileShader(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(p, compileShader(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error('[fluid-bg] link error:', gl.getProgramInfoLog(p));
    }
    // 收集 uniform locations
    const uniforms = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      uniforms[info.name] = gl.getUniformLocation(p, info.name);
    }
    return { program: p, uniforms };
  }

  /* ── 顶点着色器（全屏四边形）── */
  const VS = `
    attribute vec2 aPos;
    varying vec2 vUv;
    void main() {
      vUv = aPos * 0.5 + 0.5;
      gl_Position = vec4(aPos, 0.0, 1.0);
    }
  `;

  /* ── 片段着色器组 ── */

  // Advection：沿速度场移动
  const FS_ADVECTION = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 texelSize;
    uniform float dt;
    uniform float dissipation;
    void main() {
      vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
      gl_FragColor = dissipation * texture2D(uSource, coord);
    }
  `;

  // Splat：在指定位置注入速度/颜色
  const FS_SPLAT = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTarget;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;
    void main() {
      vec2 p = vUv - point;
      p.x *= aspectRatio;
      vec3 splat = exp(-dot(p, p) / radius) * color;
      vec3 base = texture2D(uTarget, vUv).xyz;
      gl_FragColor = vec4(base + splat, 1.0);
    }
  `;

  // Divergence
  const FS_DIVERGENCE = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform vec2 texelSize;
    void main() {
      float L = texture2D(uVelocity, vUv - vec2(texelSize.x, 0.0)).x;
      float R = texture2D(uVelocity, vUv + vec2(texelSize.x, 0.0)).x;
      float T = texture2D(uVelocity, vUv + vec2(0.0, texelSize.y)).y;
      float B = texture2D(uVelocity, vUv - vec2(0.0, texelSize.y)).y;
      gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
    }
  `;

  // Pressure (Jacobi iteration)
  const FS_PRESSURE = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;
    uniform vec2 texelSize;
    void main() {
      float L = texture2D(uPressure, vUv - vec2(texelSize.x, 0.0)).x;
      float R = texture2D(uPressure, vUv + vec2(texelSize.x, 0.0)).x;
      float T = texture2D(uPressure, vUv + vec2(0.0, texelSize.y)).x;
      float B = texture2D(uPressure, vUv - vec2(0.0, texelSize.y)).x;
      float div = texture2D(uDivergence, vUv).x;
      gl_FragColor = vec4((L + R + T + B - div) * 0.25, 0.0, 0.0, 1.0);
    }
  `;

  // Gradient Subtract
  const FS_GRADIENT = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;
    uniform vec2 texelSize;
    void main() {
      float L = texture2D(uPressure, vUv - vec2(texelSize.x, 0.0)).x;
      float R = texture2D(uPressure, vUv + vec2(texelSize.x, 0.0)).x;
      float T = texture2D(uPressure, vUv + vec2(0.0, texelSize.y)).x;
      float B = texture2D(uPressure, vUv - vec2(0.0, texelSize.y)).x;
      vec2 vel = texture2D(uVelocity, vUv).xy;
      vel -= vec2(R - L, T - B);
      gl_FragColor = vec4(vel, 0.0, 1.0);
    }
  `;

  // Display（染料到屏幕）
  const FS_DISPLAY = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uDye;
    void main() {
      vec3 c = texture2D(uDye, vUv).xyz;
      // 亮度限制防止过曝
      float brightness = max(c.r, max(c.g, c.b));
      if (brightness > 1.0) c *= 1.0 / brightness;
      gl_FragColor = vec4(c, 1.0);
    }
  `;

  /* ── 编译所有 shader 程序 ── */
  const advectionProg = createProgram(VS, FS_ADVECTION);
  const splatProg = createProgram(VS, FS_SPLAT);
  const divergenceProg = createProgram(VS, FS_DIVERGENCE);
  const pressureProg = createProgram(VS, FS_PRESSURE);
  const gradientProg = createProgram(VS, FS_GRADIENT);
  const displayProg = createProgram(VS, FS_DISPLAY);

  /* ── 全屏四边形 ── */
  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

  function blit(prog) {
    const loc = gl.getAttribLocation(prog.program, 'aPos');
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /* ── FBO 工厂（浮点纹理帧缓冲）── */
  function createFBO(w, h, internalFormat, format, type) {
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    return { texture, fbo, width: w, height: h };
  }

  // 双缓冲（读写交替）
  function createDoubleFBO(w, h, intFmt, fmt, type) {
    let fbo1 = createFBO(w, h, intFmt, fmt, type);
    let fbo2 = createFBO(w, h, intFmt, fmt, type);
    return {
      get read() { return fbo1; },
      get write() { return fbo2; },
      swap() { const tmp = fbo1; fbo1 = fbo2; fbo2 = tmp; }
    };
  }

  /* ── 创建所有 FBO ── */
  let velocity, dye, divergenceFBO, pressureFBO;
  const PRESSURE_ITERATIONS = 20;

  function initFBOs() {
    velocity = createDoubleFBO(simW, simH, gl.RGBA, gl.RGBA, texType);
    dye = createDoubleFBO(dyeW, dyeH, gl.RGBA, gl.RGBA, texType);
    divergenceFBO = createFBO(simW, simH, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
    pressureFBO = createDoubleFBO(simW, simH, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
  }
  initFBOs();

  /* ── 主题色板 ── */
  let currentPalette = CFG.getThemePalette(
    html.classList.contains('dark') ? 'dark' : 'light'
  );
  let splatterIndex = 0;

  /* ── 解析 hex 颜色到 0-1 ── */
  function hexToVec3(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b];
  }

  /* ── Splat：注入速度 + 染料 ── */
  function splat(x, y, dx, dy, colorHex) {
    const [r, g, b] = hexToVec3(colorHex);
    const alpha = currentPalette.dyeAlpha;
    const aspectRatio = canvas.width / canvas.height;

    // 注入速度
    gl.useProgram(splatProg.program);
    gl.uniform1i(splatProg.uniforms.uTarget, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
    gl.uniform1f(splatProg.uniforms.aspectRatio, aspectRatio);
    gl.uniform2f(splatProg.uniforms.point, x, y);
    gl.uniform3f(splatProg.uniforms.color, dx, dy, 0.0);
    gl.uniform1f(splatProg.uniforms.radius, 0.0005);
    gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.write.fbo);
    gl.viewport(0, 0, simW, simH);
    blit(splatProg.program);
    velocity.swap();

    // 注入染料
    gl.uniform1i(splatProg.uniforms.uTarget, 0);
    gl.bindTexture(gl.TEXTURE_2D, dye.read.texture);
    gl.uniform3f(splatProg.uniforms.color, r * alpha, g * alpha, b * alpha);
    gl.uniform1f(splatProg.uniforms.radius, 0.0015);
    gl.bindFramebuffer(gl.FRAMEBUFFER, dye.write.fbo);
    gl.viewport(0, 0, dyeW, dyeH);
    blit(splatProg.program);
    dye.swap();
  }

  /* ── 流体模拟步进 ── */
  function step(dt) {
    const simTexelX = 1.0 / simW;
    const simTexelY = 1.0 / simH;

    // 1. Advect velocity
    gl.useProgram(advectionProg.program);
    gl.uniform2f(advectionProg.uniforms.texelSize, simTexelX, simTexelY);
    gl.uniform1f(advectionProg.uniforms.dt, dt);
    gl.uniform1f(advectionProg.uniforms.dissipation, 0.98);
    gl.uniform1i(advectionProg.uniforms.uVelocity, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
    gl.uniform1i(advectionProg.uniforms.uSource, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
    gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.write.fbo);
    gl.viewport(0, 0, simW, simH);
    blit(advectionProg.program);
    velocity.swap();

    // 2. Advect dye
    gl.uniform1i(advectionProg.uniforms.uVelocity, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
    gl.uniform1i(advectionProg.uniforms.uSource, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, dye.read.texture);
    gl.uniform1f(advectionProg.uniforms.dissipation, 0.97);
    gl.bindFramebuffer(gl.FRAMEBUFFER, dye.write.fbo);
    gl.viewport(0, 0, dyeW, dyeH);
    blit(advectionProg.program);
    dye.swap();

    // 3. Divergence
    gl.useProgram(divergenceProg.program);
    gl.uniform2f(divergenceProg.uniforms.texelSize, simTexelX, simTexelY);
    gl.uniform1i(divergenceProg.uniforms.uVelocity, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
    gl.bindFramebuffer(gl.FRAMEBUFFER, divergenceFBO.fbo);
    gl.viewport(0, 0, simW, simH);
    blit(divergenceProg.program);

    // 4. Clear pressure
    gl.bindFramebuffer(gl.FRAMEBUFFER, pressureFBO.read.fbo);
    gl.viewport(0, 0, simW, simH);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 5. Pressure solve (Jacobi iterations)
    gl.useProgram(pressureProg.program);
    gl.uniform2f(pressureProg.uniforms.texelSize, simTexelX, simTexelY);
    gl.uniform1i(pressureProg.uniforms.uDivergence, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, divergenceFBO.texture);
    for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, pressureFBO.write.fbo);
      gl.uniform1i(pressureProg.uniforms.uPressure, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, pressureFBO.read.texture);
      blit(pressureProg.program);
      pressureFBO.swap();
    }

    // 6. Gradient subtract
    gl.useProgram(gradientProg.program);
    gl.uniform2f(gradientProg.uniforms.texelSize, simTexelX, simTexelY);
    gl.uniform1i(gradientProg.uniforms.uPressure, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pressureFBO.read.texture);
    gl.uniform1i(gradientProg.uniforms.uVelocity, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, velocity.read.texture);
    gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.write.fbo);
    gl.viewport(0, 0, simW, simH);
    blit(gradientProg.program);
    velocity.swap();
  }

  /* ── 显示到屏幕 ── */
  function display() {
    gl.useProgram(displayProg.program);
    gl.uniform1i(displayProg.uniforms.uDye, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dye.read.texture);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    blit(displayProg.program);
  }

  /* ── 鼠标/触摸交互 ── */
  let lastX = 0, lastY = 0;
  let pointerDown = false;

  function handlePointer(clientX, clientY) {
    const x = clientX / window.innerWidth;
    const y = 1.0 - clientY / window.innerHeight;
    const dx = (x - lastX) * 10.0;
    const dy = (y - lastY) * 10.0;
    const color = CFG.pickAutoSplatterColor(currentPalette, splatterIndex++);
    splat(x, y, dx, dy, color);
    lastX = x; lastY = y;
  }

  window.addEventListener('mousemove', e => handlePointer(e.clientX, e.clientY), { passive: true });
  window.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches[0]) handlePointer(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });
  window.addEventListener('mousedown', e => { pointerDown = true; lastX = e.clientX / window.innerWidth; lastY = 1.0 - e.clientY / window.innerHeight; });
  window.addEventListener('mouseup', () => { pointerDown = false; });

  /* ── 自动喷溅（背景持续流动）── */
  function getInterval() {
    try {
      return parseFloat(getComputedStyle(html).getPropertyValue('--neon-splatter-interval')) || 3000;
    } catch (e) { return 3000; }
  }

  let autoTimer = setInterval(autoSplatter, getInterval());

  function autoSplatter() {
    const x = 0.15 + Math.random() * 0.7;
    const y = 0.15 + Math.random() * 0.7;
    const dx = (Math.random() - 0.5) * 0.5;
    const dy = (Math.random() - 0.5) * 0.5;
    const color = CFG.pickAutoSplatterColor(currentPalette, splatterIndex++);
    splat(x, y, dx, dy, color);
  }

  /* ── 初始喷几个色斑让页面一打开就有液体 ── */
  for (let i = 0; i < 5; i++) {
    const x = 0.2 + Math.random() * 0.6;
    const y = 0.2 + Math.random() * 0.6;
    const color = CFG.pickAutoSplatterColor(currentPalette, i);
    splat(x, y, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, color);
  }

  /* ── 主渲染循环 ── */
  let rafId = null;
  let lastTime = performance.now();

  function render() {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.016); // 最大 16ms
    lastTime = now;

    step(dt);
    display();
    rafId = requestAnimationFrame(render);
  }

  /* ── Resize ── */
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    calcResolutions();
    initFBOs();
    // 重新喷几个色斑
    for (let i = 0; i < 3; i++) {
      const color = CFG.pickAutoSplatterColor(currentPalette, splatterIndex++);
      splat(Math.random(), Math.random(), (Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2, color);
    }
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  /* ── 主题切换监听 ── */
  window.addEventListener('themechange', () => {
    const isDark = html.classList.contains('dark');
    currentPalette = CFG.getThemePalette(isDark ? 'dark' : 'light');
    // 淡入过渡：清屏后重新喷溅建立新色调
    gl.bindFramebuffer(gl.FRAMEBUFFER, dye.read.fbo);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, dye.write.fbo);
    gl.clear(gl.COLOR_BUFFER_BIT);
    for (let i = 0; i < 5; i++) {
      const color = CFG.pickAutoSplatterColor(currentPalette, i);
      splat(Math.random(), Math.random(), (Math.random()-0.5)*0.3, (Math.random()-0.5)*0.3, color);
    }
  });

  /* ── 标签页隐藏暂停 ── */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      clearInterval(autoTimer);
    } else {
      lastTime = performance.now();
      autoTimer = setInterval(autoSplatter, getInterval());
      render();
    }
  });

  /* ── 启动 ── */
  render();
})();
