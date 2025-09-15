// statsDialog.js - Statistics dialog UI for displaying roll analysis and charts
import { MOD_ID, SET_LOG, SET_DAMAGE_LOG, SET_FATIGUE_LOG } from './constants.js';
import { computeStats } from './statsCalculator.js';
import { drawRollsChart } from './chartUtils.js';
import { escapeHtml } from './utils.js';
import { getGMUserIds, getGMUserNames, getActorImage, getActorIdsForUser } from './foundryUtils.js';

/**
 * Computes damage and fatigue statistics for actors
 * @param {string} selectedUserId - Optional user ID filter
 * @param {boolean} hideGMData - Whether to hide GM data
 * @returns {Object} Computed actor statistics
 */
function computeActorStats(selectedUserId = "", hideGMData = false) {
  const damageLog = game.settings.get(MOD_ID, SET_DAMAGE_LOG) ?? [];
  const fatigueLog = game.settings.get(MOD_ID, SET_FATIGUE_LOG) ?? [];
  
  // Filter out GM data if hideGMData is true
  let filteredDamageLog = damageLog;
  let filteredFatigueLog = fatigueLog;
  
  if (hideGMData) {
    const gmUserIds = getGMUserIds();
    filteredDamageLog = damageLog.filter(entry => !gmUserIds.includes(entry.changedByUserId));
    filteredFatigueLog = fatigueLog.filter(entry => !gmUserIds.includes(entry.changedByUserId));
  }
  
  // Filter by user's actors if specified
  let filteredDamage, filteredFatigue;
  
  if (selectedUserId) {
    const userActorIds = getActorIdsForUser(selectedUserId);
    filteredDamage = filteredDamageLog.filter(entry => userActorIds.includes(entry.actorId));
    filteredFatigue = filteredFatigueLog.filter(entry => userActorIds.includes(entry.actorId));
  } else {
    filteredDamage = filteredDamageLog;
    filteredFatigue = filteredFatigueLog;
  }
  
  // Calculate totals
  const totalDamage = filteredDamage.reduce((sum, entry) => sum + (entry.damageTaken || 0), 0);
  const totalFatigue = filteredFatigue.reduce((sum, entry) => sum + (entry.fatigueSpent || 0), 0);
  
  return {
    totalDamage,
    totalFatigue,
    damageEntries: filteredDamage.length,
    fatigueEntries: filteredFatigue.length
  };
}

function getActorNameForUser(rolls, userName) {
  const userRoll = rolls.find(r => r.user === userName && r.actor);
  return userRoll?.actor || userName;
}

/* ---------- build full rankings (ALL players, sorted) ---------- */
function buildRankings(currentRolls) {
  const hideGMData = game.settings.get(MOD_ID, "hide-gm-data") ?? false;
  
  // Filter out GM users if hideGMData is true
  let users = [...new Set(currentRolls.map(r => r.user))];
  if (hideGMData) {
    const gmUserNames = getGMUserNames();
    users = users.filter(userName => !gmUserNames.includes(userName));
  }
  users.sort();
  
  const rows = users.map(user => {
    const s = computeStats(currentRolls, user, hideGMData);
    const userId = game.users.find(u => u.name === user)?.id || "";
    const actorStats = computeActorStats(userId);
    return {
      user,
      actor: getActorNameForUser(currentRolls, user),
      critSucc: s.critSucc || 0,
      critFail: s.critFail || 0,
      succPct:  s.succPct  || 0,
      failPct:  s.failPct  || 0,
      totalDamage: actorStats.totalDamage || 0,
      totalFatigue: actorStats.totalFatigue || 0,
    };
  });

  const sortBy = (key, desc = true) =>
    [...rows].sort((a,b) => (desc ? (b[key] - a[key]) : (a[key] - b[key])) || a.user.localeCompare(b.user));

  return {
    luckiest:     sortBy("critSucc", true),
    unluckiest:   sortBy("critFail", true),
    bestSuccess:  sortBy("succPct",  true),
    worstSuccess: sortBy("failPct",  true),
    mostDamageTaken: sortBy("totalDamage", true),
    mostFatigueSpent: sortBy("totalFatigue", true),
  };
}

/* ---------- only top cards (for UI), ties allowed ---------- */
function findTopPerformers(currentRolls) {
  const hideGMData = game.settings.get(MOD_ID, "hide-gm-data") ?? false;
  
  // Filter out GM users if hideGMData is true
  let users = [...new Set(currentRolls.map(r => r.user))];
  if (hideGMData) {
    const gmUserNames = getGMUserNames();
    users = users.filter(userName => !gmUserNames.includes(userName));
  }
  users.sort();
  
  const statsByUser = {};
  users.forEach(u => {
    const s = computeStats(currentRolls, u, hideGMData);
    const userId = game.users.find(user => user.name === u)?.id || "";
    const actorStats = computeActorStats(userId, hideGMData);
    statsByUser[u] = { ...s, ...actorStats, actorName: getActorNameForUser(currentRolls, u) };
  });

  const max = (fn) => Math.max(...users.map(u => fn(statsByUser[u]) || 0));
  const maxCritSucc = max(s => s.critSucc);
  const maxCritFail = max(s => s.critFail);
  const maxSuccPct  = max(s => s.succPct);
  const maxFailPct  = max(s => s.failPct);
  const maxTotalDamage = max(s => s.totalDamage);
  const maxTotalFatigue = max(s => s.totalFatigue);

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
    mostDamageTaken: pick(u => statsByUser[u].totalDamage === maxTotalDamage && maxTotalDamage > 0,
      u => ({ user: u, actor: statsByUser[u].actorName, totalDamage: statsByUser[u].totalDamage })),
    mostFatigueSpent: pick(u => statsByUser[u].totalFatigue === maxTotalFatigue && maxTotalFatigue > 0,
      u => ({ user: u, actor: statsByUser[u].actorName, totalFatigue: statsByUser[u].totalFatigue })),
  };
}

/* ---------- /stats show (2x2 cards + button at bottom) ---------- */
function renderComparativeStats() {
  const currentRolls = game.settings.get(MOD_ID, SET_LOG) ?? [];
  if (currentRolls.length === 0) {
    return `
      <link rel="stylesheet" href="roll-stats.css">
      <div class="grs-no-data">
        <p><strong>No rolls recorded yet.</strong></p>
        <p>Statistics will appear here when players start making 3d6 rolls.</p>
      </div>
    `;
  }

  const performers = findTopPerformers(currentRolls);

  const section = (title, color, bodyHtml) => `
    <div class="player-stat-card" style="border-left-color: ${color};">
      <h3>${title}</h3>
      ${bodyHtml}
    </div>
  `;

  const listOrEmpty = (arr, mapMetric) => arr
    ? arr.map(p => `
      <div class="grs-player-ranking-entry">
        ${getActorImage(p.actor)}
        <div>
          <span class="grs-ranking-player-name">${escapeHtml(p.actor)}</span>
          <span class="grs-ranking-player-user">(${escapeHtml(p.user)})</span><br>
          <span class="grs-ranking-player-metric">${mapMetric(p)}</span>
        </div>
      </div>
    `).join('')
    : `<p class="grs-text-muted grs-text-italic">No data.</p>`;

  const luckyHtml      = listOrEmpty(performers.luckiest,     p => `${p.critSucc} critical successes`);
  const unluckyHtml    = listOrEmpty(performers.unluckiest,   p => `${p.critFail} critical failures`);
  const bestHtml       = listOrEmpty(performers.bestSuccess,  p => `${formatValue(p.succPct, 1)}% success rate`);
  const worstHtml      = listOrEmpty(performers.worstSuccess, p => `${formatValue(p.failPct, 1)}% failure rate`);
  const damageHtml     = listOrEmpty(performers.mostDamageTaken, p => `${p.totalDamage} total damage taken`);
  const fatigueHtml    = listOrEmpty(performers.mostFatigueSpent, p => `${p.totalFatigue} total fatigue spent`);

  return `
    <link rel="stylesheet" href="roll-stats.css">
    <div class="grs-stats-container">
      <div class="grs-stats-header">
        <h2>Ranking</h2>
        <p>Total rolls recorded: ${currentRolls.length}</p>
      </div>

      <div class="grs-grid">
        ${section("Luckiest", "#28a745", luckyHtml)}
        ${section("Unluckiest", "#dc3545", unluckyHtml)}
        ${section("Best Success", "#007bff", bestHtml)}
        ${section("Worst Success", "#ffc107", worstHtml)}
        ${section("Most Damage Taken", "#dc3545", damageHtml)}
        ${section("Most Fatigue Spent", "#ffc107", fatigueHtml)}
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
    case "mostDamageTaken":
      return a.sort((x,y) => (y.totalDamage ?? 0) - (x.totalDamage ?? 0) || x.user.localeCompare(y.user));
    case "mostFatigueSpent":
      return a.sort((x,y) => (y.totalFatigue ?? 0) - (x.totalFatigue ?? 0) || x.user.localeCompare(y.user));
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
    worstSuccess: "📉 Worst Success Rate",
    mostDamageTaken: "💔 Most Damage Taken",
    mostFatigueSpent: "💧 Most Fatigue Spent"
  };
  const title = titles[rankingType] || "Player Ranking";

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
        case 'mostDamageTaken': metric = `${p.totalDamage} damage taken`; break;
        case 'mostFatigueSpent': metric = `${p.totalFatigue} fatigue spent`; break;
      }
      
      return `
        <div class="grs-ranking-player${group.players.indexOf(p) === group.players.length - 1 ? '' : ' grs-border-bottom'}">
          ${getActorImage(p.actor, 'grs-actor-image-small')}
          <div class="grs-ranking-player-info">
            <span class="grs-ranking-player-name">${escapeHtml(p.actor)}</span>
            <span class="grs-ranking-player-user">(${escapeHtml(p.user)})</span><br>
            <span class="grs-ranking-player-metric">${metric}</span>
          </div>
        </div>
      `;
    }).join('');
    
    return `
      <div class="grs-ranking-group">
        <div class="grs-ranking-header">
          <span class="grs-ranking-number">#${group.rank}</span>
          <span class="grs-ranking-title">${group.players.length > 1 ? `${group.players.length} players tied` : group.players[0].actor}</span>
        </div>
        <div class="grs-ranking-players${group.players.length === 1 ? ' single-player' : ''}">
          ${playersHtml}
        </div>
      </div>
    `;
  }).join('');

  const content = `
    <link rel="stylesheet" href="roll-stats.css">
    <div class="grs-chat-stats">
      <h3 class="grs-text-center grs-mb-1" style="margin:0 0 1rem 0; font-size:1.2rem;">${title}</h3>
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
  if (rankings.mostDamageTaken?.length) await printRankingToChat("mostDamageTaken", rankings.mostDamageTaken);
  if (rankings.mostFatigueSpent?.length) await printRankingToChat("mostFatigueSpent", rankings.mostFatigueSpent);
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
  
  const hideGMData = game.settings.get(MOD_ID, "hide-gm-data") ?? false;
  
  // Build list of users - include all game users who have made rolls or own actors with damage/fatigue
  let rollUsers = new Set(currentRolls.map(r => r.user));
  
  // Filter out GM users from roll users if hideGMData is true
  if (hideGMData) {
    const gmUserNames = getGMUserNames();
    rollUsers = new Set([...rollUsers].filter(userName => !gmUserNames.includes(userName)));
  }
  
  const damageLog = game.settings.get(MOD_ID, SET_DAMAGE_LOG) ?? [];
  const fatigueLog = game.settings.get(MOD_ID, SET_FATIGUE_LOG) ?? [];
  
  // Get users who have actors with damage/fatigue entries
  const usersWithActorData = new Set();
  [...damageLog, ...fatigueLog].forEach(entry => {
    // Skip GM entries if hideGMData is true
    if (hideGMData) {
      const gmUserIds = getGMUserIds();
      if (gmUserIds.includes(entry.changedByUserId)) {
        return;
      }
    }
    
    const actor = game.actors.get(entry.actorId);
    if (actor) {
      // Find users who own this actor
      Object.keys(actor.ownership || {}).forEach(userId => {
        if (actor.ownership[userId] === 3) { // OWNER permission
          const user = game.users.get(userId);
          if (user && (!hideGMData || !user.isGM)) {
            usersWithActorData.add(user.name);
          }
        }
      });
    }
  });
  
  // Combine and sort unique users
  const allRelevantUsers = [...new Set([...rollUsers, ...usersWithActorData])].sort();
  
  // Convert selectedUser (name) to userId for internal processing
  let selectedUserId = "";
  if (selectedUser) {
    const user = game.users.find(u => u.name === selectedUser);
    selectedUserId = user?.id || "";
  }
  
  const stats = computeStats(currentRolls, selectedUser, hideGMData);
  const actorStats = computeActorStats(selectedUserId, hideGMData);

  // Check if there's no data
  const hasData = currentRolls.length > 0;
  
  // Check if we have data after GM filtering
  const filteredRolls = hideGMData ? currentRolls.filter(r => {
    const gmUserNames = getGMUserNames();
    return !gmUserNames.includes(r.user);
  }) : currentRolls;
  
  const hasFilteredData = filteredRolls.length > 0;
  
  const noDataMessage = hasData ? '' : `
    <div style=" border: 1px solid #ddd; border-radius: 6px; padding: 1rem; margin-bottom: 1rem; text-align: center;">
      <p style="margin: 0; color: #666; font-style: italic;">
        <i class="fa-solid fa-info-circle"></i> No rolls recorded yet.
      </p>
      <p style="margin: 0.5rem 0 0 0; color: #666; font-size: 0.9rem;">
        Statistics and charts will appear here when players start making 3d6 rolls.
      </p>
    </div>
  `;
  
  const noFilteredDataMessage = hasFilteredData ? '' : `
    <div style="border: 1px solid #ddd; border-radius: 6px; padding: 1rem; margin-bottom: 1rem; text-align: center;">
      <p style="margin: 0; color: #666; font-style: italic;">
        <i class="fa-solid fa-info-circle"></i> No player data available (GM data is hidden).
      </p>
      <p style="margin: 0.5rem 0 0 0; color: #666; font-size: 0.9rem;">
        Try disabling "Hide GM Data" in settings or wait for players to make rolls.
      </p>
    </div>
  `;

  const faceCountRow = [1,2,3,4,5,6].map(face => `<td>${stats.diceCount?.[face] ?? 0}</td>`).join("");
  const sumHeaders = Array.from({ length: 16 }, (_, i) => `<th>${i + 3}</th>`).join("");
  const sumCells = Array.from({ length: 16 }, (_, i) => `<td>${stats.totals[i + 3] || 0}</td>`).join("");

  return `
    <link rel="stylesheet" href="roll-stats.css">
    <div class="grs-dialog-content">
      <div class="grs-player-select-row">
        <label>Player:</label>
        <select id="grs-user">
          <option value="">(All Players)</option>
          ${allRelevantUsers.map(userName =>
            `<option value="${escapeHtml(userName)}" ${userName === selectedUser ? "selected" : ""}>${escapeHtml(userName)}</option>`
          ).join("")}
        </select>
      </div>

      <hr class="grs-hr"/>
      
      <div class="grs-attribute-section">
        <h4>
          <i class="fa-solid fa-heart-pulse"></i> Attribute Tracking 
        </h4>
        <div class="grs-attribute-grid">
          <div class="grs-attribute-card grs-attribute-card-damage">
            <div class="grs-attribute-value grs-attribute-value-damage">${actorStats.totalDamage}</div>
            <div class="grs-attribute-label">Damage Taken</div>
          </div>
          <div class="grs-attribute-card grs-attribute-card-fatigue">
            <div class="grs-attribute-value grs-attribute-value-fatigue">${actorStats.totalFatigue}</div>
            <div class="grs-attribute-label">Fatigue Spent</div>
          </div>
        </div>
      </div>

      <hr class="grs-hr"/>

      <div><strong>Total Rolls:</strong> ${stats.n}</div>
      <div><strong>Average Roll (3d6):</strong> ${formatValue(stats.avgTotal, 2)}</div>

      <div class="grs-stats-grid-2col">
        <div><strong>Successes:</strong> ${stats.succ} (${formatValue(stats.succPct, 1)}%)</div>
        <div><strong>Failures:</strong> ${stats.fail} (${formatValue(stats.failPct, 1)}%)</div>
      </div>

      <div class="grs-stats-grid-2col">
        <div><strong>Average Success Margin:</strong> ${formatValue(stats.usuallyPassBy, 2)}</div>
        <div><strong>Average Failure Margin:</strong> ${formatValue(stats.usuallyFailBy, 2)}</div>
      </div>

      <div class="grs-stats-grid-2col">
        <div><strong>Critical Successes:</strong> ${stats.critSucc}</div>
        <div><strong>Critical Failures:</strong> ${stats.critFail}</div>
      </div>

      <hr/>
      <div>
        <strong>Roll Distribution (3d6 Totals)</strong>
      </div>
      ${hideGMData ? noFilteredDataMessage : noDataMessage}
      <div id="grs-chart" class="grs-chart-container"></div>

      <div>
        <strong>Sum Distribution (3-18):</strong>
        <table class="grs-table">
          <thead><tr>${sumHeaders}</tr></thead>
          <tbody><tr>${sumCells}</tr></tbody>
        </table>
        <strong>Individual Die Face Counts:</strong>
        <table class="grs-table">
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
    const hideGMData = game.settings.get(MOD_ID, "hide-gm-data") ?? false;
    const stats = computeStats(currentRolls, selectedUser, hideGMData);
    
    // Convert selectedUser (name) to userId for actor stats
    let selectedUserId = "";
    if (selectedUser) {
      const user = game.users.find(u => u.name === selectedUser);
      selectedUserId = user?.id || "";
    }
    const actorStats = computeActorStats(selectedUserId, hideGMData);
    
    // Calculate global stats for comparison (only when viewing individual user)
    let globalStats = null;
    if (selectedUser) {
      globalStats = computeStats(currentRolls, "", hideGMData); // All users (filtered)
      const globalActorStats = computeActorStats("", hideGMData); // All users' actors (filtered)
      globalStats.totalDamage = globalActorStats.totalDamage;
      globalStats.totalFatigue = globalActorStats.totalFatigue;
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
          actorImage = `<img src="${actor.img}" class="grs-actor-image-medium" alt="${actorName}">`;
        }
      }
    }

    // Function to get comparison indicator and styling
    function getComparisonStyling(playerValue, globalValue, metricType) {
      if (!globalStats) return { style: 'font-weight:600;', indicator: '' };
      
      let isHigherBetter = true;
      if (metricType === 'critFail' || metricType === 'failPct' || metricType === 'failMargin' || metricType === 'totalDamage' || metricType === 'totalFatigue') {
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
      <link rel="stylesheet" href="roll-stats.css">
      <div class="grs-chat-stats">
        <div class="grs-chat-stats-header">
          ${actorImage}
          <div>
            <h3 class="grs-chat-stats-centered-title">
              <i class="fa-solid fa-chart-simple"></i> GURPS Roll Statistics
            </h3>
            <div class="grs-chat-stats-subtitle">
              ${escapeHtml(playerDisplayName)}${selectedUser && playerDisplayName !== selectedUser ? ` (${escapeHtml(selectedUser)})` : ''}
            </div>
            ${selectedUser ? `<div class="grs-chat-stats-meta">Damage: ${actorStats.totalDamage} | Fatigue: ${actorStats.totalFatigue}</div>` : ''}
          </div>
        </div>
        
        ${globalStats ? `
          <table class="grs-stats-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th class="center">Player</th>
                <th class="center">Global</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Total Rolls</td>
                <td class="center highlight">${stats.n}</td>
                <td class="center muted">${globalStats.n}</td>
              </tr>
              <tr>
                <td>Average Roll (3d6)</td>
                <td class="center" style="${getComparisonStyling(stats.avgTotal, globalStats.avgTotal, 'avgTotal').style}">${getComparisonStyling(stats.avgTotal, globalStats.avgTotal, 'avgTotal').indicator} ${formatValue(stats.avgTotal, 2)}</td>
                <td class="center muted">${formatValue(globalStats.avgTotal, 2)}</td>
              </tr>
              <tr>
                <td>Success Rate</td>
                <td class="center" style="${getComparisonStyling(stats.succPct, globalStats.succPct, 'succPct').style}">${getComparisonStyling(stats.succPct, globalStats.succPct, 'succPct').indicator} ${formatValue(stats.succPct, 1)}%</td>
                <td class="center muted">${formatValue(globalStats.succPct, 1)}%</td>
              </tr>
              <tr>
                <td>Failure Rate</td>
                <td class="center" style="${getComparisonStyling(stats.failPct, globalStats.failPct, 'failPct').style}">${getComparisonStyling(stats.failPct, globalStats.failPct, 'failPct').indicator} ${formatValue(stats.failPct, 1)}%</td>
                <td class="center muted">${formatValue(globalStats.failPct, 1)}%</td>
              </tr>
              <tr>
                <td>Avg Success Margin</td>
                <td class="center" style="${getComparisonStyling(stats.usuallyPassBy, globalStats.usuallyPassBy, 'successMargin').style}">${getComparisonStyling(stats.usuallyPassBy, globalStats.usuallyPassBy, 'successMargin').indicator} ${formatValue(stats.usuallyPassBy, 2)}</td>
                <td class="center muted">${formatValue(globalStats.usuallyPassBy, 2)}</td>
              </tr>
              <tr>
                <td>Avg Failure Margin</td>
                <td class="center" style="${getComparisonStyling(stats.usuallyFailBy, globalStats.usuallyFailBy, 'failMargin').style}">${getComparisonStyling(stats.usuallyFailBy, globalStats.usuallyFailBy, 'failMargin').indicator} ${formatValue(stats.usuallyFailBy, 2)}</td>
                <td class="center muted">${formatValue(globalStats.usuallyFailBy, 2)}</td>
              </tr>
              <tr>
                <td>Critical Successes</td>
                <td class="center" style="${getComparisonStyling(stats.critSucc, globalStats.critSucc, 'critSucc').style}">${getComparisonStyling(stats.critSucc, globalStats.critSucc, 'critSucc').indicator} ${stats.critSucc}</td>
                <td class="center muted">${globalStats.critSucc}</td>
              </tr>
              <tr>
                <td>Critical Failures</td>
                <td class="center" style="${getComparisonStyling(stats.critFail, globalStats.critFail, 'critFail').style}">${getComparisonStyling(stats.critFail, globalStats.critFail, 'critFail').indicator} ${stats.critFail}</td>
                <td class="center muted">${globalStats.critFail}</td>
              </tr>
              <tr>
                <td>Damage Taken</td>
                <td class="center" style="${getComparisonStyling(actorStats.totalDamage, globalStats.totalDamage, 'totalDamage').style}">${getComparisonStyling(actorStats.totalDamage, globalStats.totalDamage, 'totalDamage').indicator} ${actorStats.totalDamage}</td>
                <td class="center muted">${globalStats.totalDamage}</td>
              </tr>
              <tr>
                <td>Fatigue Spent</td>
                <td class="center" style="${getComparisonStyling(actorStats.totalFatigue, globalStats.totalFatigue, 'totalFatigue').style}">${getComparisonStyling(actorStats.totalFatigue, globalStats.totalFatigue, 'totalFatigue').indicator} ${actorStats.totalFatigue}</td>
                <td class="center muted">${globalStats.totalFatigue}</td>
              </tr>
            </tbody>
          </table>
        ` : `
          <div class="grs-stats-summary">
            <div class="grs-stats-row">
              <span>Total Rolls:</span> 
              <span class="grs-stats-value">${stats.n}</span>
            </div>
            <div class="grs-stats-row">
              <span>Average Roll (3d6):</span> 
              <span class="grs-stats-value">${formatValue(stats.avgTotal, 2)}</span>
            </div>
            <div class="grs-stats-row">
              <span>Successes:</span> 
              <span class="grs-stats-value">${stats.succ} (${formatValue(stats.succPct, 1)}%)</span>
            </div>
            <div class="grs-stats-row">
              <span>Failures:</span> 
              <span class="grs-stats-value">${stats.fail} (${formatValue(stats.failPct, 1)}%)</span>
            </div>
            <div class="grs-stats-row">
              <span>Avg Success Margin:</span> 
              <span class="grs-stats-value">${formatValue(stats.usuallyPassBy, 2)}</span>
            </div>
            <div class="grs-stats-row">
              <span>Avg Failure Margin:</span> 
              <span class="grs-stats-value">${formatValue(stats.usuallyFailBy, 2)}</span>
            </div>
            <div class="grs-stats-row">
              <span>Critical Successes:</span> 
              <span class="grs-stats-value">${stats.critSucc}</span>
            </div>
            <div class="grs-stats-row">
              <span>Critical Failures:</span> 
              <span class="grs-stats-value">${stats.critFail}</span>
            </div>
            <div class="grs-stats-row">
              <span>Damage Taken:</span> 
              <span class="grs-stats-value">${actorStats.totalDamage}</span>
            </div>
            <div class="grs-stats-row">
              <span>Fatigue Spent:</span> 
              <span class="grs-stats-value">${actorStats.totalFatigue}</span>
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