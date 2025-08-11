// statsCalculator.js — Statistics calculation logic
export function computeStats(rows, userFilter) {
  const data = rows.filter(r => !userFilter || r.user === userFilter);

  const n = data.length;
  const totals = Array.from({ length: 19 }, () => 0); // 0..18; usamos 3..18
  const diceCount = { 1:0,2:0,3:0,4:0,5:0,6:0 };
  let succ = 0, fail = 0;
  let critSucc = 0, critFail = 0;
  let sumMoS = 0, nMoS = 0, sumMoFabs = 0, nMoF = 0;

  for (const r of data) {
    if (Number.isFinite(r.total) && r.total >= 3 && r.total <= 18) totals[r.total]++;
    if (Array.isArray(r.dice) && r.dice.length === 3) {
      for (const d of r.dice) if (diceCount[d] != null) diceCount[d]++;
    }
    if (r.success === true) {
      succ++; if (Number.isFinite(r.margin) && r.margin > 0) { sumMoS += r.margin; nMoS++; }
    } else if (r.success === false) {
      fail++; if (Number.isFinite(r.margin) && r.margin < 0) { sumMoFabs += Math.abs(r.margin); nMoF++; }
    }
    const txt = (r.text || "");
    if (/Critical\s+Success!/i.test(txt)) critSucc++;
    if (/Critical\s+Failure!/i.test(txt)) critFail++;
  }

  let sum = 0, cnt = 0;
  for (let t = 3; t <= 18; t++) { sum += t * totals[t]; cnt += totals[t]; }
  const avgTotal = cnt ? sum / cnt : null;

  return {
    n, totals, diceCount, avgTotal,
    succ, fail, succPct: n ? (succ / n * 100) : 0, failPct: n ? (fail / n * 100) : 0,
    critSucc, critFail,
    usuallyPassBy: nMoS ? (sumMoS / nMoS) : null,
    usuallyFailBy: nMoF ? (sumMoFabs / nMoF) : null
  };
}