// chart-mini.js - Lightweight chart utility for Foundry VTT (no dependencies)
// v0.3 - Bar, line & combo charts with multi-series support, HiDPI and responsive resize handling

export class MiniChart {
  constructor(container, opts = {}) {
    if (!container) throw new Error("MiniChart: container required");
    this.container = container;
    this.opts = {
      type: opts.type ?? "line", // "bar" | "line" | "combo"
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
      yMax: opts.yMax ?? null,
      // Multi-series support
      series: opts.series ?? [], // Array of {name, data, color, type}
      showLegend: opts.showLegend ?? false
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

  setMultiSeriesData(labels, series) {
    this.labels = labels ?? [];
    this.opts.series = series ?? [];
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
    let vals = [];
    
    // Collect all values from single series or multi-series data
    if (this.opts.series && this.opts.series.length > 0) {
      this.opts.series.forEach(series => {
        if (Array.isArray(series.data)) {
          vals.push(...series.data.filter(v => Number.isFinite(v)));
        }
      });
    } else {
      vals = this.values.filter(v => Number.isFinite(v));
    }
    
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
    const legendHeight = this.opts.showLegend ? 30 : 0;
    const left = padding, right = W - padding, top = padding * 0.5, bottom = H - padding - legendHeight;
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
    if (this.opts.series && this.opts.series.length > 0) {
      this._drawMultiSeries({ left, bottom, plotW, yToPx });
    } else if (this.opts.type === "combo") {
      this._drawBars({ left, bottom, plotW, yToPx });
      this._drawLine({ left, bottom, plotW, yToPx });
    } else if (this.opts.type === "bar") {
      this._drawBars({ left, bottom, plotW, yToPx });
    } else {
      this._drawLine({ left, bottom, plotW, yToPx });
    }

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

    // Draw legend if enabled
    if (this.opts.showLegend && this.opts.series && this.opts.series.length > 0) {
      this._drawLegend({ left, right, bottom: bottom + 20 });
    }
    
    ctx.restore();
  }

  _drawMultiSeries({ left, bottom, plotW, yToPx }) {
    const { ctx } = this;
    const n = this.labels.length;
    const step = plotW / n;
    const seriesCount = this.opts.series.length;
    const barWidth = Math.max(4, (step * 0.8) / seriesCount);
    
    this.opts.series.forEach((series, seriesIndex) => {
      const data = series.data || [];
      const color = series.color || this.opts.bar;
      const type = series.type || "bar";
      
      if (type === "bar") {
        ctx.fillStyle = color;
        for (let i = 0; i < n; i++) {
          const v = Number(data[i]) || 0;
          const x = left + step * (i + 0.5) - (seriesCount * barWidth) / 2 + seriesIndex * barWidth;
          const y = yToPx(v);
          ctx.fillRect(x, y, barWidth, Math.max(1, bottom - y));
        }
      } else if (type === "line") {
        // Draw line
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < n; i++) {
          const v = Number(data[i]) || 0;
          const x = left + step * (i + 0.5);
          const y = yToPx(v);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Draw data points
        ctx.fillStyle = color;
        for (let i = 0; i < n; i++) {
          const v = Number(data[i]) || 0;
          const x = left + step * (i + 0.5);
          const y = yToPx(v);
          ctx.beginPath();
          ctx.arc(x, y, this.opts.pointRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
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

  _drawLegend({ left, right, bottom }) {
    const { ctx } = this;
    const legendY = bottom + 5;
    const itemWidth = 100;
    const startX = left + (right - left - this.opts.series.length * itemWidth) / 2;
    
    ctx.font = "11px sans-serif";
    
    this.opts.series.forEach((series, index) => {
      const x = startX + index * itemWidth;
      const color = series.color || this.opts.bar;
      
      // Draw color indicator
      ctx.fillStyle = color;
      ctx.fillRect(x, legendY, 12, 12);
      
      // Draw series name
      ctx.fillStyle = this.opts.fg;
      ctx.fillText(series.name || `Series ${index + 1}`, x + 16, legendY + 9);
    });
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