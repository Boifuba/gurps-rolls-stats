// chart-mini.js - Lightweight chart utility for Foundry VTT (no dependencies)
// v0.2 - Bar & line charts with HiDPI support and responsive resize handling

export class MiniChart {
  constructor(container, opts = {}) {
    if (!container) throw new Error("MiniChart: container required");
    this.container = container;
    this.opts = {
      type: opts.type ?? "line", // "bar" | "line"
      padding: 28,
      font: opts.font ?? "12px sans-serif",
      // Extract CSS custom properties with fallbacks for styling
      fg: opts.fg ?? (getComputedStyle(document.documentElement).getPropertyValue("--color-text").trim() || "#ddd"),
      grid: opts.grid ?? (getComputedStyle(document.documentElement).getPropertyValue("--color-text-light-highlight").trim() || "#666"),
      bar: opts.bar ?? (getComputedStyle(document.documentElement).getPropertyValue("--color-border-highlight").trim() || "#4aa"),
      line: opts.line ?? (getComputedStyle(document.documentElement).getPropertyValue("--color-border-highlight").trim() || "#4aa"),
      pointRadius: 3,
      yTicks: opts.yTicks ?? 6,
      yMin: opts.yMin ?? null,
      yMax: opts.yMax ?? null
    };
    
    // Create and configure canvas element
    this.canvas = document.createElement("canvas");
    this.canvas.style.width = "100%";
    this.canvas.style.height = "260px";
    this.canvas.style.display = "block";
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    
    // Set up responsive resize handling
    this._observer = new ResizeObserver(() => this._resize());
    this._observer.observe(this.canvas);
  }

  destroy() { 
    this._observer?.disconnect(); 
    this.canvas?.remove(); 
  }

  setData(labels, values) {
    this.labels = labels ?? [];
    this.values = values ?? [];
    this._resize();
  }

  exportPNG(filename = "chart.png") {
    const a = document.createElement("a");
    a.href = this.canvas.toDataURL("image/png");
    a.download = filename;
    a.click();
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._draw();
  }

  _calcScale() {
    const vals = this.values.filter(v => Number.isFinite(v));
    let min = this.opts.yMin ?? 0;
    let max = this.opts.yMax ?? (vals.length ? Math.max(...vals) : 1);
    if (max === min) max = min + 1;
    const span = max - min;
    const step = Math.pow(10, Math.floor(Math.log10(span / (this.opts.yTicks || 5))));
    const niceMax = Math.ceil(max / step) * step;
    const niceMin = Math.floor(min / step) * step;
    return { min: niceMin, max: niceMax };
  }

  _draw() {
    const { ctx, canvas } = this;
    const { padding, font, fg, grid } = this.opts;

    // Clear canvas and set up drawing context
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.font = font;
    ctx.fillStyle = fg;
    ctx.strokeStyle = grid;

    // Calculate plot area dimensions
    const W = canvas.clientWidth, H = canvas.clientHeight;
    const left = padding, right = W - padding, top = padding * 0.5, bottom = H - padding;
    const plotW = Math.max(10, right - left), plotH = Math.max(10, bottom - top);

    const { min, max } = this._calcScale();
    const yToPx = v => bottom - ((v - min) / (max - min)) * plotH;

    // Draw Y-axis grid and labels
    const ticks = this.opts.yTicks;
    ctx.strokeStyle = grid; 
    ctx.lineWidth = 1; 
    ctx.globalAlpha = 0.35;
    
    for (let i = 0; i <= ticks; i++) {
      const y = top + (plotH * i) / ticks;
      ctx.beginPath(); 
      ctx.moveTo(left, y); 
      ctx.lineTo(right, y); 
      ctx.stroke();
      
      const val = (max - (max - min) * (i / ticks)).toFixed(0);
      ctx.globalAlpha = 1; 
      ctx.fillText(val, 4, y - 2);
      ctx.globalAlpha = 0.35;
    }
    ctx.globalAlpha = 1;

    // Check if there's data to render
    const n = this.labels?.length || 0;
    if (!n) { 
      ctx.restore(); 
      return; 
    }

    // Render chart series based on type
    if (this.opts.type === "bar") this._drawBars({ left, bottom, plotW, yToPx });
    else this._drawLine({ left, bottom, plotW, yToPx });

    // Draw X-axis labels with rotation for narrow spacing
    ctx.fillStyle = fg;
    const step = plotW / n;
    const rotate = step < 24;
    
    for (let i = 0; i < n; i++) {
      const x = left + step * (i + 0.5);
      const lbl = String(this.labels[i]);
      
      if (rotate) {
        ctx.save(); 
        ctx.translate(x, bottom + 4); 
        ctx.rotate(-Math.PI / 4); 
        ctx.fillText(lbl, 0, 0); 
        ctx.restore();
      } else {
        const w = ctx.measureText(lbl).width;
        ctx.fillText(lbl, x - w / 2, bottom + 14);
      }
    }
    ctx.restore();
  }

  _drawBars({ left, bottom, plotW, yToPx }) {
    const { ctx } = this;
    const n = this.values.length;
    const step = plotW / n;
    const barW = Math.max(6, step * 0.6);
    
    ctx.fillStyle = this.opts.bar;
    for (let i = 0; i < n; i++) {
      const v = Number(this.values[i]) || 0;
      const x = left + step * (i + 0.5) - barW / 2;
      const y = yToPx(v);
      ctx.fillRect(x, y, barW, Math.max(1, bottom - y));
    }
  }

  _drawLine({ left, plotW, yToPx }) {
    const { ctx } = this;
    const n = this.values.length;
    const step = plotW / n;
    
    // Draw line
    ctx.strokeStyle = this.opts.line; 
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < n; i++) {
      const v = Number(this.values[i]) || 0;
      const x = left + step * (i + 0.5);
      const y = yToPx(v);
      if (i === 0) ctx.moveTo(x, y); 
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw data points
    ctx.fillStyle = this.opts.line;
    for (let i = 0; i < n; i++) {
      const v = Number(this.values[i]) || 0;
      const x = left + step * (i + 0.5);
      const y = yToPx(v);
      ctx.beginPath(); 
      ctx.arc(x, y, this.opts.pointRadius, 0, Math.PI * 2); 
      ctx.fill();
    }
  }
}