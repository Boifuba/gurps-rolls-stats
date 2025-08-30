// chartUtils.js - Chart utilities using chart-mini.js for roll statistics
import { MOD_ID, SET_LOG } from './constants.js';
import { computeStats } from './statsCalculator.js';
import { MiniChart } from './chart-mini.js';

/**
 * Creates and renders a chart showing 3d6 roll distribution
 * @param {HTMLElement} containerEl - Container element for the chart
 * @param {string} userFilter - Optional user filter for data
 * @returns {MiniChart} The created chart instance
 */
export function drawRollsChart(containerEl, userFilter) {
  const rowsNow = game.settings.get(MOD_ID, SET_LOG) ?? [];
  const hideGMData = game.settings.get(MOD_ID, "hide-gm-data") ?? false;

  // Clear container
  containerEl.innerHTML = '';

  // Prepare labels (3-18)
  const labels = Array.from({ length: 16 }, (_, i) => i + 3);

  if (!userFilter) {
    // Show all players for comparison when no specific user is selected
    let uniqueUsers = [...new Set(rowsNow.map(r => r.user))];
    
    // Filter out GM users if hideGMData is true
    if (hideGMData) {
      const gmUserNames = game.users.filter(user => user.isGM).map(user => user.name);
      uniqueUsers = uniqueUsers.filter(userName => !gmUserNames.includes(userName));
    }
    
    uniqueUsers.sort();
    
    if (uniqueUsers.length === 0) {
      const noDataMessage = hideGMData ? 
        'No player data available (GM data is hidden)' : 
        'No roll data available';
      containerEl.innerHTML = `<p style="text-align: center; color: #666; padding: 2rem;">${noDataMessage}</p>`;
      return null;
    }

    // Generate colors for each user using CSS variables with fallbacks
    const colors = [
      getComputedStyle(document.documentElement).getPropertyValue("--color-border-highlight").trim() || "#4aa",
      getComputedStyle(document.documentElement).getPropertyValue("--color-text-highlight").trim() || "#a4a",
      getComputedStyle(document.documentElement).getPropertyValue("--color-control-bg-hover").trim() || "#aa4",
      "#28a745", "#dc3545", "#ffc107", "#17a2b8", "#6f42c1", "#fd7e14"
    ];

    // Prepare series data for each user
    const series = uniqueUsers.map((user, index) => {
      const userStats = computeStats(rowsNow, user, hideGMData);
      const data = labels.map(total => userStats.totals[total] || 0);
      
      return {
        name: user,
        data: data,
        color: colors[index % colors.length],
        type: "bar"
      };
    });

    // Create multi-series bar chart
    const chart = new MiniChart(containerEl, {
      type: "bar",
      series: series,
      showLegend: true,
      yTicks: 6
    });

    chart.setMultiSeriesData(labels, series);
    return chart;

  } else {
    // Show single user with combo chart (bars + line)
    const stats = computeStats(rowsNow, userFilter, hideGMData);
    const data = labels.map(total => stats.totals[total] || 0);

    // Create bar chart (no line overlay for individual users)
    const chart = new MiniChart(containerEl, {
      type: "bar",
      yTicks: 6
    });

    chart.setData(labels, data);
    return chart;
  }
}

/**
 * Exports the current chart as PNG
 * @param {string} userFilter - Optional user filter for data
 * @param {string} filename - Filename for the exported image
 */
export async function exportChartAsPNG(userFilter = "", filename = "gurps-3d6-distribution.png") {
  try {
    const hideGMData = game.settings.get(MOD_ID, "hide-gm-data") ?? false;
    
    // Create temporary hidden container for chart rendering
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.width = '800px';
    tempDiv.style.height = '300px';
    tempDiv.style.visibility = 'hidden';
    document.body.appendChild(tempDiv);
    
    // Get current roll data
    const currentRolls = game.settings.get(MOD_ID, SET_LOG) ?? [];
    
    // Check if we have data after potential GM filtering
    let dataToCheck = currentRolls;
    if (hideGMData) {
      const gmUserNames = game.users.filter(user => user.isGM).map(user => user.name);
      dataToCheck = currentRolls.filter(r => !gmUserNames.includes(r.user));
    }
    
    if (dataToCheck.length === 0) {
      const noDataMessage = hideGMData ? 
        "No player data available to export (GM data is hidden)." : 
        "No roll data available to export.";
      ui.notifications?.warn(noDataMessage);
      tempDiv.remove();
      return;
    }
    
    // Draw chart in temporary container
    const chart = drawRollsChart(tempDiv, userFilter);
    
    if (!chart) {
      ui.notifications?.warn("Failed to create chart for export.");
      tempDiv.remove();
      return;
    }
    
    // Wait a moment for chart to fully render
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Export PNG using chart's built-in method
    chart.exportPNG(filename);
    
    // Clean up
    chart.destroy();
    tempDiv.remove();
    
    ui.notifications?.info("Chart exported successfully!");
    
  } catch (error) {
    ui.notifications?.error("Failed to export chart. Please try again.");
  }
}