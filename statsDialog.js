// statsDialog.js - Statistics dialog UI for displaying roll analysis and charts
import { MOD_ID, SET_LOG } from './constants.js';
import { computeStats } from './statsCalculator.js';
import { drawRollsChart } from './chartUtils.js';
import { escapeHtml } from './utils.js';

function getActorNameForUser(rolls, userName) {
  const userRoll = rolls.find(r => r.user === userName && r.actor);
  return userRoll?.actor || userName;
}

/* ---------- build full rankings (ALL players, sorted) ---------- */
function buildRankings(currentRolls) {
  const users = [...new Set(currentRolls.map(r => r.user))].sort();
  const rows = users.map(user => {
    const s = computeStats(currentRolls, user);
    return {
      user,
      actor: getActorNameForUser(currentRolls, user),
      critSucc: s.critSucc || 0,
      critFail: s.critFail || 0,
      succPct:  s.succPct  || 0,
      failPct:  s.failPct  || 0,
    };
  });

  const sortBy = (key, desc = true) =>
    [...rows].sort((a,b) => (desc ? (b[key] - a[key]) : (a[key] - b[key])) || a.user.localeCompare(b.user));

  return {
    luckiest:     sortBy("critSucc", true),
    unluckiest:   sortBy("critFail", true),
    bestSuccess:  sortBy("succPct",  true),
    worstSuccess: sortBy("failPct",  true),
  };
}

/* ---------- only top cards (for UI), ties allowed ---------- */
function findTopPerformers(currentRolls) {
  const users = [...new Set(currentRolls.map(r => r.user))].sort();
  const statsByUser = {};
  users.forEach(u => {
    const s = computeStats(currentRolls, u);
    statsByUser[u] = { ...s, actorName: getActorNameForUser(currentRolls, u) };
  });

  const max = (fn) => Math.max(...users.map(u => fn(statsByUser[u]) || 0));
  const maxCritSucc = max(s => s.critSucc);
  const maxCritFail = max(s => s.critFail);
  const maxSuccPct  = max(s => s.succPct);
  const maxFailPct  = max(s => s.failPct);

  const pick = (pred, map) => {
    const list = users.filter(pred).map(map);
    return list.length ? list : null;
  };

  return {
    luckiest: pick(u => statsByUser[u].critSucc === maxCritSucc && maxCritSucc > 0,
      u => ({ user: u, actor: statsByUser[u].actorName, critSucc: statsByUser[u].critSucc })),
    unluckiest: pick(u => statsByUser[u].critFail === maxCritFail && maxCritFail > 0,
      u => ({ user: u, actor: statsByUser[u].actorName, critFail: statsByUser[u].critFail })),
    bestSuccess: pick(u => statsByUser[u].succPct === maxSuccPct && maxSuccPct > 0,
      u => ({ user: u, actor: statsByUser[u].actorName, succPct: statsByUser[u].succPct })),
    worstSuccess: pick(u => statsByUser[u].failPct === maxFailPct && maxFailPct > 0,
      u => ({ user: u, actor: statsByUser[u].actorName, failPct: statsByUser[u].failPct })),
  };
}

/* ---------- /stats show (2x2 cards + button at bottom) ---------- */
function renderComparativeStats() {
  const currentRolls = game.settings.get(MOD_ID, SET_LOG) ?? [];
  if (currentRolls.length === 0) {
    return `
      <div style="padding: 2rem; text-align: center;">
        <p><strong>No rolls recorded yet.</strong></p>
        <p>Statistics will appear here when players start making 3d6 rolls.</p>
      </div>
    `;
  }

  const performers = findTopPerformers(currentRolls);

  // CSS only (no JS hover listeners)
  const css = `
    <style>
      .grs-grid { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 1rem; }
      .player-entry { transition: all .2s ease-in-out; border-radius: 4px; }
      .player-entry:hover {
        background-color: var(--color-control-bg-hover, rgba(233,236,239,.2));
        transform: translateY(-2px);
        box-shadow: 0 3px 10px rgba(0,0,0,.2);
      }
      .grs-print-btn {
        padding: .5rem .75rem;
        border: 1px solid var(--color-border, #888);
        border-radius: 6px;
        cursor: pointer;
        background: var(--color-control-bg, #f5f5f5);
      }
      .grs-print-btn:hover { background: var(--color-control-bg-hover, #eee); }
    </style>
  `;

  function getActorImage(actorName) {
    if (!actorName) return '';
    const actor = game.actors.find(a => a.name === actorName);
    if (actor?.img) {
      return `<img src="${actor.img}" style="width:60px; height:60px; border-radius:50%; margin-right:.5rem; object-fit:cover;" alt="${actorName}">`;
    }
    return '';
  }

  const section = (title, color, bodyHtml) => `
    <div class="player-stat-card" style="padding:1rem; border-radius:6px; border-left:3px solid ${color};">
      <h3 style="margin:0 0 .5rem 0; color:var(--color-text-highlight,#4aa); font-size:1.2rem; font-weight:700;">${title}</h3>
      ${bodyHtml}
    </div>
  `;

  const listOrEmpty = (arr, mapMetric) => arr
    ? arr.map(p => `
      <div class="player-entry" style="display:flex; align-items:center; padding:.5rem; margin:.25rem 0;">
        ${getActorImage(p.actor)}
        <div>
          <strong>${escapeHtml(p.actor)}</strong>
          <span style="color:#666; font-size:.9rem;">(${escapeHtml(p.user)})</span><br>
          <span style="font-weight:700;">${mapMetric(p)}</span>
        </div>
      </div>
    `).join('')
    : `<p style="color:#666; font-style:italic;">No data.</p>`;

  const luckyHtml      = listOrEmpty(performers.luckiest,     p => `${p.critSucc} critical successes`);
  const unluckyHtml    = listOrEmpty(performers.unluckiest,   p => `${p.critFail} critical failures`);
  const bestHtml       = listOrEmpty(performers.bestSuccess,  p => `${formatValue(p.succPct, 1)}% success rate`);
  const worstHtml      = listOrEmpty(performers.worstSuccess, p => `${formatValue(p.failPct, 1)}% failure rate`);

  return `
    ${css}
    <div style="padding:1rem; display:grid; gap:1rem; ">
      <div style="text-align:center; margin-bottom:1rem; border-bottom:2px solid #ccc; padding-bottom:1rem;">
        <h2 style="margin:0; font-size:1.5rem;">Ranking</h2>
        <p style="margin:.5rem 0; color:#666; font-size:.9rem;">Total rolls recorded: ${currentRolls.length}</p>
      </div>

      <div class="grs-grid">
        ${section("Luckiest", "#28a745", luckyHtml)}
        ${section("Unluckiest", "#dc3545", unluckyHtml)}
        ${section("Best Success", "#007bff", bestHtml)}
        ${section("Worst Success", "#ffc107", worstHtml)}
      </div>

    </div>
  `;
}

/* ---------- Chat printing (ALL players, sorted best -> worst) ---------- */
function sortForRanking(type, arr) {
  if (!arr) return null;
  const a = [...arr];
  switch (type) {
    case "luckiest":
      return a.sort((x,y) => (y.critSucc ?? 0) - (x.critSucc ?? 0) || x.user.localeCompare(y.user));
    case "unluckiest":
      return a.sort((x,y) => (y.critFail ?? 0) - (x.critFail ?? 0) || x.user.localeCompare(y.user));
    case "bestSuccess":
      return a.sort((x,y) => (y.succPct  ?? 0) - (x.succPct  ?? 0) || x.user.localeCompare(y.user));
    case "worstSuccess":
      return a.sort((x,y) => (y.failPct  ?? 0) - (x.failPct  ?? 0) || x.user.localeCompare(y.user));
    default:
      return a;
  }
}

async function printRankingToChat(rankingType, rankingData) {
  const sorted = sortForRanking(rankingType, rankingData);
  if (!sorted || sorted.length === 0) {
    ui.notifications?.info("No data available for this ranking.");
    return;
  }

  const titles = {
    luckiest: "🍀 Luckiest Players",
    unluckiest: "💀 Unluckiest Players",
    bestSuccess: "🎯 Best Success Rate",
    worstSuccess: "📉 Worst Success Rate"
  };
  const title = titles[rankingType] || "Player Ranking";

  function getActorImage(actorName) {
    if (!actorName) return '';
    const actor = game.actors.find(a => a.name === actorName);
    if (actor?.img) {
      return `<img src="${actor.img}" style="width:40px; height:40px; border-radius:50%; margin-right:.5rem; object-fit:cover;" alt="${actorName}">`;
    }
    return '';
  }

  // Group players by their metric value to handle ties
  const groups = [];
  let currentRank = 1;
  let rankCounter = 0;
  
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    rankCounter = i + 1;
    
    // Get the metric value for the current item based on ranking type
    let metricValue;
    switch (rankingType) {
      case 'luckiest':     metricValue = p.critSucc; break;
      case 'unluckiest':   metricValue = p.critFail; break;
      case 'bestSuccess':  metricValue = p.succPct; break;
      case 'worstSuccess': metricValue = p.failPct; break;
      default: metricValue = 0;
    }
    
    // Check if this is a new group or continuation of current group
    const lastGroup = groups[groups.length - 1];
    if (!lastGroup || lastGroup.metricValue !== metricValue) {
      // New group - update rank if not first group
      if (lastGroup) {
        currentRank = rankCounter;
      }
      
      groups.push({
        rank: currentRank,
        metricValue,
        players: [p]
      });
    } else {
      // Same metric value - add to current group
      lastGroup.players.push(p);
    }
  }
  
  // Generate HTML for each group
  const entries = groups.map(group => {
    const playersHtml = group.players.map(p => {
      let metric = '';
      switch (rankingType) {
        case 'luckiest':     metric = `${p.critSucc} critical successes`; break;
        case 'unluckiest':   metric = `${p.critFail} critical failures`;  break;
        case 'bestSuccess':  metric = `${formatValue(p.succPct, 1)}% success rate`; break;
        case 'worstSuccess': metric = `${formatValue(p.failPct, 1)}% failure rate`;  break;
      }
      
      return `
        <div style="display:flex; align-items:center; padding:.5rem; ${group.players.length > 1 ? 'border-bottom:1px solid #eee;' : ''} ${group.players.indexOf(p) === group.players.length - 1 ? 'border-bottom:none;' : ''}">
          ${getActorImage(p.actor)}
          <div>
            <strong>${escapeHtml(p.actor)}</strong>
            <span style="color:#666; font-size:.9rem;">(${escapeHtml(p.user)})</span><br>
            <span style="font-weight:700;">${metric}</span>
          </div>
        </div>
      `;
    }).join('');
    
    return `
      <div style="margin:.5rem 0; border-radius:6px; background:var(--color-bg-option,#f8f9fa); border:1px solid #ddd;">
        <div style="display:flex; align-items:center; padding:.75rem; background:var(--color-control-bg,#e9ecef); border-radius:6px 6px 0 0; border-bottom:2px solid #ccc;">
          <span style="font-weight:700; font-size:1.1rem; color:var(--color-text-highlight,#4aa); min-width:30px;">#${group.rank}</span>
          <span style="font-weight:600; margin-left:.5rem;">${group.players.length > 1 ? `${group.players.length} players tied` : group.players[0].actor}</span>
        </div>
        <div style="padding:${group.players.length > 1 ? '0' : '.5rem'};">
          ${playersHtml}
        </div>
      </div>
    `;
  }).join('');

  const content = `
    <div style="border-radius:8px; padding:1rem; margin:.5rem 0; max-width:420px;">
      <h3 style="margin:0 0 1rem 0; text-align:center; font-size:1.2rem;">${title}</h3>
      ${entries}
    </div>
  `;

  await ChatMessage.create({ content, speaker: ChatMessage.getSpeaker() });
}

async function printAllRankingsToChat(rankings) {
  if (!rankings) return;
  if (rankings.luckiest?.length)     await printRankingToChat("luckiest",     rankings.luckiest);
  if (rankings.unluckiest?.length)   await printRankingToChat("unluckiest",   rankings.unluckiest);
  if (rankings.bestSuccess?.length)  await printRankingToChat("bestSuccess",  rankings.bestSuccess);
  if (rankings.worstSuccess?.length) await printRankingToChat("worstSuccess", rankings.worstSuccess);
}

/* ---------- /stats show dialog (button prints ALL rankings) ---------- */
export async function showComparativeStatsDialog() {
  const currentRolls = game.settings.get(MOD_ID, SET_LOG) ?? [];
  const rankings = buildRankings(currentRolls);       // << FULL lists for chat
  // Cards still show only the top/ties (visual)
  await foundry.applications.api.DialogV2.wait({
    window: { 
      title: "GURPS - Player Performance Statistics",
      resizable: true,
      height: "auto",
      maxHeight: "80vh"
    },
    content: renderComparativeStats(),
    buttons: [
      { 
        action: "print-ranking", 
        label: "Print Ranking to Chat", 
        icon: "fa-solid fa-list-ol",
        callback: async () => {
          await printAllRankingsToChat(rankings);
        }
      },
      { action: "close", label: "Close", icon: "fa-solid fa-xmark", default: true }
    ],
    render: (event, dialog) => {
      const wc = dialog.element.querySelector(".window-content");
      if (wc) {
        wc.style.paddingTop = "40px";
        wc.style.overflowY = "auto";
        wc.style.maxHeight = "70vh";
      }
    }
  });
}

/* ---------- Comparison utility functions ---------- */
/* ---------- /stats (chart dialog — mantido) ---------- */
const formatValue = (value, decimals = 2) =>
  (value == null || Number.isNaN(value)) ? "—" : Number(value).toFixed(decimals);

function renderStats(selectedUser) {
  const currentRolls = game.settings.get(MOD_ID, SET_LOG) ?? [];
  const uniqueUsers = [...new Set(currentRolls.map(r => r.user))].sort();
  const stats = computeStats(currentRolls, selectedUser);

  // Check if there's no data
  const hasData = currentRolls.length > 0;
  const noDataMessage = hasData ? '' : `
    <div style="background: var(--color-bg-option, #f8f9fa); border: 1px solid #ddd; border-radius: 6px; padding: 1rem; margin-bottom: 1rem; text-align: center;">
      <p style="margin: 0; color: #666; font-style: italic;">
        <i class="fa-solid fa-info-circle"></i> No rolls recorded yet.
      </p>
      <p style="margin: 0.5rem 0 0 0; color: #666; font-size: 0.9rem;">
        Statistics and charts will appear here when players start making 3d6 rolls.
      </p>
    </div>
  `;

  const faceCountRow = [1,2,3,4,5,6].map(face => `<td>${stats.diceCount?.[face] ?? 0}</td>`).join("");
  const sumHeaders = Array.from({ length: 16 }, (_, i) => `<th>${i + 3}</th>`).join("");
  const sumCells = Array.from({ length: 16 }, (_, i) => `<td>${stats.totals[i + 3] || 0}</td>`).join("");

  return `
    <div class="p-2" style="display:grid; gap:.5rem; ">
      <div style="display:flex; gap:.5rem; align-items:center;">
        <label>Player:</label>
        <select id="grs-user" style="flex:1;">
          <option value="">(All Players)</option>
          ${uniqueUsers.map(user =>
            `<option value="${escapeHtml(user)}" ${user === selectedUser ? "selected" : ""}>${escapeHtml(user)}</option>`
          ).join("")}
        </select>
      </div>

      <div><strong>Total Rolls:</strong> ${stats.n}</div>
      <div><strong>Average Roll (3d6):</strong> ${formatValue(stats.avgTotal, 2)}</div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:.5rem;">
        <div><strong>Successes:</strong> ${stats.succ} (${formatValue(stats.succPct, 1)}%)</div>
        <div><strong>Failures:</strong> ${stats.fail} (${formatValue(stats.failPct, 1)}%)</div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:.5rem;">
        <div><strong>Average Success Margin:</strong> ${formatValue(stats.usuallyPassBy, 2)}</div>
        <div><strong>Average Failure Margin:</strong> ${formatValue(stats.usuallyFailBy, 2)}</div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:.5rem;">
        <div><strong>Critical Successes:</strong> ${stats.critSucc}</div>
        <div><strong>Critical Failures:</strong> ${stats.critFail}</div>
      </div>

      <hr/>
      <div>
        <strong>Roll Distribution (3d6 Totals)</strong>
      </div>
      ${noDataMessage}
      <div id="grs-chart" style="width:100%; height:300px; max-width:100%;"></div>

      <div>
        <strong>Sum Distribution (3-18):</strong>
        <table class="grs-table" style="margin-top:.25rem;">
          <thead><tr>${sumHeaders}</tr></thead>
          <tbody><tr>${sumCells}</tr></tbody>
        </table>
        <strong>Individual Die Face Counts:</strong>
        <table class="grs-table" style="margin-top:.25rem;">
          <thead><tr><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th></tr></thead>
          <tbody><tr>${faceCountRow}</tr></tbody>
        </table>
      </div>
    </div>
  `;
}

function attachHandlers(windowContent, selectedUser, dialog) {
  const userSelect = windowContent.querySelector("#grs-user");
  const chartContainer = windowContent.querySelector("#grs-chart");

  if (userSelect) {
    userSelect.addEventListener("change", (event) => {
      const newUser = event.target.value || "";
      dialog.close();
      setTimeout(() => showStatsDialog(newUser), 100);
    });
  }

  if (chartContainer) {
    drawRollsChart(chartContainer, selectedUser);
  }
}

export async function showStatsDialog(selectedUser = "") {
  async function sendStatsToChat() {
    const currentRolls = game.settings.get(MOD_ID, SET_LOG) ?? [];
    const stats = computeStats(currentRolls, selectedUser);
    
    // Calculate global stats for comparison (only when viewing individual user)
    let globalStats = null;
    if (selectedUser) {
      globalStats = computeStats(currentRolls, ""); // All users
    }
    
    // Get actor info for selected user
    let playerDisplayName = "All Players";
    let actorImage = "";
    
    if (selectedUser) {
      const actorName = getActorNameForUser(currentRolls, selectedUser);
      playerDisplayName = actorName || selectedUser;
      
      // Get actor image
      if (actorName) {
        const actor = game.actors.find(a => a.name === actorName);
        if (actor?.img) {
          actorImage = `<img src="${actor.img}" style="width:50px; height:50px; border-radius:50%; margin-right:.75rem; object-fit:cover;" alt="${actorName}">`;
        }
      }
    }

    // Function to get comparison indicator and styling
    function getComparisonStyling(playerValue, globalValue, metricType) {
      if (!globalStats) return { style: 'font-weight:600;', indicator: '' };
      
      let isHigherBetter = true;
      if (metricType === 'critFail' || metricType === 'failPct' || metricType === 'failMargin') {
        isHigherBetter = false;
      }
      
      let color = '';
      let indicator = '';
      
      if (playerValue > globalValue) {
        color = isHigherBetter ? '#28a745' : '#dc3545'; // green for good, red for bad
        indicator = isHigherBetter ? '▲' : '▲';
      } else if (playerValue < globalValue) {
        color = isHigherBetter ? '#dc3545' : '#28a745'; // red for bad, green for good
        indicator = isHigherBetter ? '▼' : '▼';
      }
      
      return {
        style: `font-weight:600; color:${color};`,
        indicator
      };
    }
    
    const content = `
      <div style="border-radius:8px; max-width:420px;">
        <div style="display:flex; align-items:center; padding:.75rem; border-bottom:2px solid #ccc;">
          ${actorImage}
          <div>
            <h3 style="margin:0; font-size:1.1rem; color:var(--color-text-highlight,#4aa);">
              <i class="fa-solid fa-chart-simple"></i> GURPS Roll Statistics
            </h3>
            <div style="font-size:.9rem; color:#666; margin-top:.25rem;">
              ${escapeHtml(playerDisplayName)}${selectedUser && playerDisplayName !== selectedUser ? ` (${escapeHtml(selectedUser)})` : ''}
            </div>
          </div>
        </div>
        
        ${globalStats ? `
          <table style="width:100%; font-size:.8rem; line-height:1.3; border-collapse:collapse; ">
            <thead style="border:none !important; background: #33333356; color: #f4f4f4;">
  <tr style="border:none !important;">
    <th style="text-align:left; padding:.4rem; font-weight:600; border:none !important;">Metric</th>
    <th style="text-align:center; padding:.4rem; font-weight:600; border:none !important;">Player</th>
    <th style="text-align:center; padding:.4rem; font-weight:600; border:none !important;">Global</th>
  </tr>
</thead>

            <tbody>
              <tr style="border-bottom:1px solid #ccc;">
                <td style="padding:.3rem; border:none;">Total Rolls</td>
                <td style="text-align:center; padding:.3rem; font-weight:600; border:none;">${stats.n}</td>
                <td style="text-align:center; padding:.3rem; color:#666; border:none;">${globalStats.n}</td>
              </tr>
              <tr style="border-bottom:1px solid #ccc;">
                <td style="padding:.3rem; border:none;">Average Roll (3d6)</td>
                <td style="text-align:center; padding:.3rem; border:none; ${getComparisonStyling(stats.avgTotal, globalStats.avgTotal, 'avgTotal').style}">${getComparisonStyling(stats.avgTotal, globalStats.avgTotal, 'avgTotal').indicator} ${formatValue(stats.avgTotal, 2)}</td>
                <td style="text-align:center; padding:.3rem; color:#666; border:none;">${formatValue(globalStats.avgTotal, 2)}</td>
              </tr>
              <tr style="border-bottom:1px solid #ccc;">
                <td style="padding:.3rem; border:none;">Success Rate</td>
                <td style="text-align:center; padding:.3rem; border:none; ${getComparisonStyling(stats.succPct, globalStats.succPct, 'succPct').style}">${getComparisonStyling(stats.succPct, globalStats.succPct, 'succPct').indicator} ${formatValue(stats.succPct, 1)}%</td>
                <td style="text-align:center; padding:.3rem; color:#666; border:none;">${formatValue(globalStats.succPct, 1)}%</td>
              </tr>
              <tr style="border-bottom:1px solid #ccc;">
                <td style="padding:.3rem; border:none;">Failure Rate</td>
                <td style="text-align:center; padding:.3rem; border:none; ${getComparisonStyling(stats.failPct, globalStats.failPct, 'failPct').style}">${getComparisonStyling(stats.failPct, globalStats.failPct, 'failPct').indicator} ${formatValue(stats.failPct, 1)}%</td>
                <td style="text-align:center; padding:.3rem; color:#666; border:none;">${formatValue(globalStats.failPct, 1)}%</td>
              </tr>
              <tr style="border-bottom:1px solid #ccc;">
                <td style="padding:.3rem; border:none;">Avg Success Margin</td>
                <td style="text-align:center; padding:.3rem; border:none; ${getComparisonStyling(stats.usuallyPassBy, globalStats.usuallyPassBy, 'successMargin').style}">${getComparisonStyling(stats.usuallyPassBy, globalStats.usuallyPassBy, 'successMargin').indicator} ${formatValue(stats.usuallyPassBy, 2)}</td>
                <td style="text-align:center; padding:.3rem; color:#666; border:none;">${formatValue(globalStats.usuallyPassBy, 2)}</td>
              </tr>
              <tr style="border-bottom:1px solid #ccc;">
                <td style="padding:.3rem; border:none;">Avg Failure Margin</td>
                <td style="text-align:center; padding:.3rem; border:none; ${getComparisonStyling(stats.usuallyFailBy, globalStats.usuallyFailBy, 'failMargin').style}">${getComparisonStyling(stats.usuallyFailBy, globalStats.usuallyFailBy, 'failMargin').indicator} ${formatValue(stats.usuallyFailBy, 2)}</td>
                <td style="text-align:center; padding:.3rem; color:#666; border:none;">${formatValue(globalStats.usuallyFailBy, 2)}</td>
              </tr>
              <tr style="border-bottom:1px solid #ccc;">
                <td style="padding:.3rem; border:none;">Critical Successes</td>
                <td style="text-align:center; padding:.3rem; border:none; ${getComparisonStyling(stats.critSucc, globalStats.critSucc, 'critSucc').style}">${getComparisonStyling(stats.critSucc, globalStats.critSucc, 'critSucc').indicator} ${stats.critSucc}</td>
                <td style="text-align:center; padding:.3rem; color:#666; border:none;">${globalStats.critSucc}</td>
              </tr>
              <tr>
                <td style="padding:.3rem; border:none;">Critical Failures</td>
                <td style="text-align:center; padding:.3rem; border:none; ${getComparisonStyling(stats.critFail, globalStats.critFail, 'critFail').style}">${getComparisonStyling(stats.critFail, globalStats.critFail, 'critFail').indicator} ${stats.critFail}</td>
                <td style="text-align:center; padding:.3rem; color:#666; border:none;">${globalStats.critFail}</td>
              </tr>
            </tbody>
          </table>
        ` : `
          <div style="font-size:.8rem; line-height:1.3;">
            <div style="display:flex; justify-content:space-between; padding:.2rem 0; border-bottom:1px solid #eee;">
              <span>Total Rolls:</span> 
              <span style="font-weight:600;">${stats.n}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:.2rem 0; border-bottom:1px solid #eee;">
              <span>Average Roll (3d6):</span> 
              <span style="font-weight:600;">${formatValue(stats.avgTotal, 2)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:.2rem 0; border-bottom:1px solid #eee;">
              <span>Successes:</span> 
              <span style="font-weight:600;">${stats.succ} (${formatValue(stats.succPct, 1)}%)</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:.2rem 0; border-bottom:1px solid #eee;">
              <span>Failures:</span> 
              <span style="font-weight:600;">${stats.fail} (${formatValue(stats.failPct, 1)}%)</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:.2rem 0; border-bottom:1px solid #eee;">
              <span>Avg Success Margin:</span> 
              <span style="font-weight:600;">${formatValue(stats.usuallyPassBy, 2)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:.2rem 0; border-bottom:1px solid #eee;">
              <span>Avg Failure Margin:</span> 
              <span style="font-weight:600;">${formatValue(stats.usuallyFailBy, 2)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:.2rem 0; border-bottom:1px solid #eee;">
              <span>Critical Successes:</span> 
              <span style="font-weight:600;">${stats.critSucc}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding:.2rem 0;">
              <span>Critical Failures:</span> 
              <span style="font-weight:600;">${stats.critFail}</span>
            </div>
          </div>
        `}
      </div>
    `;
    
    await ChatMessage.create({ 
      content, 
      speaker: ChatMessage.getSpeaker() 
    });
    
    ui.notifications?.info("Statistics sent to chat!");
  }

  await foundry.applications.api.DialogV2.wait({
    window: { 
      title: "GURPS Roll Statistics",
      resizable: true,
      height: "auto",
      maxHeight: "80vh"
    },
    content: renderStats(selectedUser),
    buttons: [
      { 
        action: "show-rankings", 
        label: "Show Rankings", 
        icon: "fa-solid fa-trophy",
        callback: async (event, button, dialog) => {
          dialog.close();
          setTimeout(() => showComparativeStatsDialog(), 100);
        }
      },
      { 
        action: "send-to-chat", 
        label: "Enviar para Chat", 
        icon: "fa-solid fa-paper-plane",
        callback: async (event, button, dialog) => {
          await sendStatsToChat();
          dialog.close();
        },
        default: true
      }
    ],
    render: (event, dialog) => {
      const wc = dialog.element.querySelector(".window-content");
      if (wc) {
        wc.style.paddingTop = "40px";
        wc.style.overflowY = "auto";
        wc.style.maxHeight = "70vh";
      }
      attachHandlers(wc, selectedUser, dialog);
    }
  });
}