// googleChartUtils.js - Google Charts integration utilities for roll statistics
import { MOD_ID, SET_LOG } from './constants.js';
import { computeStats } from './statsCalculator.js';

/**
 * Loads Google Charts library asynchronously if not already loaded
 * @returns {Promise<void>} Promise that resolves when charts are ready
 */
export async function loadGoogleCharts() {
  if (globalThis.google?.charts && globalThis.google.visualization) return;
  
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://www.gstatic.com/charts/loader.js";
    script.async = true;
    script.onload = () => {
      /* global google */
      google.charts.load("current", { packages: ["corechart"] });
      google.charts.setOnLoadCallback(resolve);
    };
    script.onerror = () => reject(new Error("Failed to load Google Charts."));
    document.head.appendChild(script);
  });
}

/**
 * Creates and renders a combo chart showing 3d6 roll distribution
 * @param {HTMLElement} containerEl - Container element for the chart
 * @param {string} userFilter - Optional user filter for data
 * @returns {Promise<google.visualization.ComboChart>} The created chart instance
 */
export async function drawGoogleChart(containerEl, userFilter) {
  await loadGoogleCharts();
  const rowsNow = game.settings.get(MOD_ID, SET_LOG) ?? [];

  const data = new google.visualization.DataTable();
  data.addColumn("number", "Total");

  let maxCount = 0;
  let seriesConfig = {};

  if (!userFilter) {
    // Show all players for comparison when no specific user is selected
    const uniqueUsers = [...new Set(rowsNow.map(r => r.user))].sort();
    
    // Add columns for each user
    uniqueUsers.forEach(user => {
      data.addColumn("number", user);
    });

    // Prepare data for rolls 3-18 with all users
    for (let total = 3; total <= 18; total++) {
      const row = [total];
      uniqueUsers.forEach(user => {
        const userStats = computeStats(rowsNow, user);
        const count = userStats.totals[total] || 0;
        row.push(count);
        maxCount = Math.max(maxCount, count);
      });
      data.addRow(row);
    }

    // Configure all series as bars for comparison
    uniqueUsers.forEach((_, index) => {
      seriesConfig[index] = { type: "bars" };
    });

  } else {
    // Show single user with bar+line combo
    const stats = computeStats(rowsNow, userFilter);
    data.addColumn("number", "Count (bars)");
    data.addColumn("number", "Count (line)");

    for (let total = 3; total <= 18; total++) {
      const count = stats.totals[total] || 0;
      maxCount = Math.max(maxCount, count);
      data.addRow([total, count, count]);
    }

    // Configure combo chart (bars + line)
    seriesConfig = { 1: { type: "line", lineWidth: 2, pointSize: 4 } };
  }

  // Calculate nice Y-axis scale with minimum at 0
  const top = calculateNiceTop(Math.max(maxCount, 1));
  const steps = 5;
  const ticks = Array.from({ length: steps + 1 }, (_, i) => Math.round((top * i) / steps));

  const options = {
    legend: userFilter ? "none" : "top",
    seriesType: "bars",
    series: seriesConfig,
    hAxis: { 
      viewWindow: { min: 3, max: 18 }, 
      ticks: Array.from({length: 16}, (_, i) => i + 3) 
    },
    vAxis: { 
      viewWindow: { min: 0, max: top }, 
      ticks, 
      baseline: 0 
    },
    chartArea: { 
      left: 40, 
      top: 50, 
      width: "90%", 
      height: "70%" 
    }
  };

  const chart = new google.visualization.ComboChart(containerEl);
  chart.draw(data, options);

  // Set up responsive chart redrawing
  const resizeObserver = new ResizeObserver(() => chart.draw(data, options));
  resizeObserver.observe(containerEl);

  return chart;

  /**
   * Calculates a "nice" maximum value for chart scaling using 1/2/5 * 10^k pattern
   * @param {number} n - Input value
   * @returns {number} Nice rounded maximum
   */
  function calculateNiceTop(n) {
    const power = Math.pow(10, Math.floor(Math.log10(n)));
    const digit = n / power;
    let multiplier = digit <= 1 ? 1 : digit <= 2 ? 2 : digit <= 5 ? 5 : 10;
    return multiplier * power;
  }
}
