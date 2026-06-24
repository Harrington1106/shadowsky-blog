class ActivityChart {
  constructor(container, options={}){
    this.container = typeof container === 'string' ? document.getElementById(container) : container
    this.options = Object.assign({ count: 12, height: 48, padding: 6 }, options)
    this.data = []
    this._resizeTimer = null
    
    // Listen for theme changes
    window.addEventListener('themeChange', () => {
      this.render(this.data)
    })
  }
  safeDate(s){
    if(!s) return new Date()
    let d = new Date(s)
    if(!isNaN(d.getTime())) return d
    d = new Date(String(s).replace(/-/g,'/'))
    return isNaN(d.getTime()) ? new Date() : d
  }
  render(data){
    if(!this.container) return
    this.data = data || []
    
    // Process Data
    const now = new Date()
    const months = []
    for(let i=0;i<this.options.count;i++){
      const y = new Date(now.getFullYear(), now.getMonth()-i, 1)
      const key = `${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,'0')}`
      months.push({ key, value:0 })
    }
    const map = new Map(months.map(m=>[m.key,m]))
    this.data.forEach(item=>{
      const d = this.safeDate(item.date)
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      if(map.has(k)) map.get(k).value += 1
    })
    const series = months.reverse()
    const max = Math.max(1, ...series.map(s=>s.value))
    
    // Setup Container & Canvas
    let root = this.container.querySelector('#activity-chart-root')
    if(!root){
      root = document.createElement('div')
      root.id = 'activity-chart-root'
      root.style.width = '100%'
      // Allow relative positioning for absolute tooltip if we used DOM tooltip (but we use canvas here)
      root.style.position = 'relative' 
      this.container.appendChild(root)
    }
    
    let width = root.clientWidth || this.container.clientWidth || 0
    if(!width || width < 50){
      width = ((this.container.parentElement && this.container.parentElement.clientWidth) || 320)
    }
    const height = this.options.height
    const dpr = window.devicePixelRatio || 1
    
    // Re-use canvas if exists to avoid flicker
    let canvas = root.querySelector('#activity-chart-canvas')
    if(!canvas){
        canvas = document.createElement('canvas')
        canvas.id = 'activity-chart-canvas'
        root.appendChild(canvas)
    }
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'
    canvas.style.cursor = 'crosshair'
    
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    // Calculate Points
    const pad = this.options.padding
    const step = (width - pad*2) / Math.max(1, (series.length - 1))
    const points = series.map((s, idx) => ({
      x: pad + step * idx,
      y: height - pad - (s.value/max) * (height - pad*2),
      value: s.value,
      key: s.key
    }))
    
    // Draw Function Closure
    const draw = (activeIndex = -1) => {
        ctx.clearRect(0,0,width,height)

        // Theme detection
        const isDark = document.documentElement.classList.contains('dark')
        const theme = {
          axis: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(100,116,139,0.2)',
          lineStart: isDark ? '#2dd4bf' : '#0d9488',
          lineEnd: isDark ? '#5eead4' : '#14b8a6',
          dot: isDark ? '#2dd4bf' : '#0d9488',
          tooltipBg: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          tooltipText: isDark ? '#f1f5f9' : '#0f172a',
          tooltipBorder: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(226, 232, 240, 1)'
        }

        // Draw Axis
        ctx.strokeStyle = theme.axis
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(pad, height - pad)
        ctx.lineTo(width - pad, height - pad)
        ctx.stroke()

        // Prepare Gradient
        const grad = ctx.createLinearGradient(0,0,width,0)
        grad.addColorStop(0, theme.lineStart)
        grad.addColorStop(1, theme.lineEnd)

        // Draw Fill (Area)
        const fillGrad = ctx.createLinearGradient(0, 0, 0, height)
        fillGrad.addColorStop(0, isDark ? 'rgba(45, 212, 191, 0.2)' : 'rgba(13, 148, 136, 0.2)')
        fillGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
        
        ctx.fillStyle = fillGrad
        ctx.beginPath()
        ctx.moveTo(points[0].x, height - pad)
        ctx.lineTo(points[0].x, points[0].y)
        
        for (let i = 0; i < points.length - 1; i++) {
          const curr = points[i]
          const next = points[i+1]
          const mx = (curr.x + next.x) / 2
          const my = (curr.y + next.y) / 2
          ctx.quadraticCurveTo(curr.x, curr.y, mx, my)
          ctx.quadraticCurveTo(mx, my, next.x, next.y)
        }
        
        const last = points[points.length-1]
        ctx.lineTo(last.x, height - pad)
        ctx.closePath()
        ctx.fill()

        // Draw Line (Stroke)
        ctx.lineWidth = 2
        ctx.strokeStyle = grad
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)

        if (points.length > 1) {
            for (let i = 0; i < points.length - 1; i++) {
                const p0 = points[i]
                const p1 = points[i + 1]
                const xc = (p0.x + p1.x) / 2;
                const yc = (p0.y + p1.y) / 2;
                if (i === 0) ctx.lineTo(p0.x, p0.y);
                ctx.quadraticCurveTo(p0.x, p0.y, xc, yc);
            }
            const last = points[points.length-1]
            ctx.lineTo(last.x, last.y)
        }
        ctx.stroke()
        
        // Draw Dots & Hover Effects
        points.forEach((p, idx)=>{
          const isActive = idx === activeIndex
          
          // Draw Hover Line
          if (isActive) {
              ctx.beginPath()
              ctx.moveTo(p.x, pad) // From top (ish)
              ctx.lineTo(p.x, height - pad)
              ctx.strokeStyle = theme.axis
              ctx.setLineDash([4, 4])
              ctx.stroke()
              ctx.setLineDash([])
          }

          if(p.value > 0 || isActive){
            ctx.beginPath()
            // Larger dot on hover
            const r = isActive ? 5 : 3
            ctx.arc(p.x, p.y, r, 0, Math.PI*2)
            ctx.fillStyle = theme.dot
            ctx.fill()
            
            ctx.lineWidth = isActive ? 2 : 1.5
            ctx.strokeStyle = isDark ? '#0f172a' : '#ffffff'
            ctx.stroke()
          }

          // Draw Tooltip
          if (isActive) {
              const text = `${p.key}: ${p.value}`
              ctx.font = '10px sans-serif'
              const tm = ctx.measureText(text)
              const tw = tm.width + 12
              const th = 24
              let tx = p.x - tw/2
              let ty = p.y - th - 8
              
              // Clamp tooltip position
              if (tx < 0) tx = 0
              if (tx + tw > width) tx = width - tw
              if (ty < 0) ty = p.y + 12

              // Tooltip bg
              ctx.fillStyle = theme.tooltipBg
              ctx.strokeStyle = theme.tooltipBorder
              ctx.lineWidth = 1
              
              // Rounded rect
              const r = 4
              ctx.beginPath()
              ctx.moveTo(tx+r, ty)
              ctx.lineTo(tx+tw-r, ty)
              ctx.quadraticCurveTo(tx+tw, ty, tx+tw, ty+r)
              ctx.lineTo(tx+tw, ty+th-r)
              ctx.quadraticCurveTo(tx+tw, ty+th, tx+tw-r, ty+th)
              ctx.lineTo(tx+r, ty+th)
              ctx.quadraticCurveTo(tx, ty+th, tx, ty+th-r)
              ctx.lineTo(tx, ty+r)
              ctx.quadraticCurveTo(tx, ty, tx+r, ty)
              ctx.closePath()
              ctx.fill()
              ctx.stroke()

              // Tooltip text
              ctx.fillStyle = theme.tooltipText
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillText(text, tx + tw/2, ty + th/2)
          }
        })
    }

    // Initial Draw
    draw(-1)
    
    // Event Handling
    const getMousePos = (evt) => {
        const rect = canvas.getBoundingClientRect()
        return {
            x: (evt.clientX - rect.left), // No DPR here for logic, logic uses CSS pixels
            y: (evt.clientY - rect.top)
        }
    }
    
    const handleMove = (e) => {
        e.preventDefault() // Prevent scrolling on touch
        let clientX
        if(e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX
        } else {
            clientX = e.clientX
        }
        
        const rect = canvas.getBoundingClientRect()
        const x = clientX - rect.left
        
        // Find nearest point
        // x = pad + step * idx  =>  idx = (x - pad) / step
        let idx = Math.round((x - pad) / step)
        if (idx < 0) idx = 0
        if (idx >= points.length) idx = points.length - 1
        
        draw(idx)
    }
    
    const handleLeave = () => {
        draw(-1)
    }

    // Attach Event Listeners
    // Use DOM Level 0 properties (onclick, etc.) to automatically replace old handlers
    canvas.onmousemove = handleMove
    canvas.onmouseleave = handleLeave
    canvas.ontouchstart = handleMove
    canvas.ontouchmove = handleMove
    
    root.style.minHeight = height + 'px'

    if(!this._resizeBound){
      this._resizeBound = true
      window.addEventListener('resize', () => {
        if(this._resizeTimer) clearTimeout(this._resizeTimer)
        this._resizeTimer = setTimeout(() => this.render(this.data), 200)
      })
    }
  }
}

// 兼容性：在非模块脚本中显式导出到 window，确保可访问
if (typeof window !== 'undefined') {
  window.ActivityChart = ActivityChart;
}