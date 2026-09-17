/**
 * Verifies the SHIPPED momentum engine reproduces the numbers the mechanic was
 * approved on. Compiles src/lib/momentum.ts and asserts against the simulation.
 *
 *   node scripts/verify-engine.mjs
 */

import { resolveDay, protection, angularVelocity } from '../build-check/momentum.js';

let failures = 0;
const near = (a, b, tol = 0.05) => Math.abs(a - b) <= tol;

function check(label, actual, expected, tol) {
  const ok = typeof expected === 'number' ? near(actual, expected, tol) : actual === expected;
  if (!ok) {
    failures += 1;
    console.error(`  FAIL  ${label}\n        expected ${expected}, got ${actual}`);
  } else {
    console.log(`  ok    ${label}  (${typeof actual === 'number' ? actual.toFixed(2) : actual})`);
  }
}

function runDays(momentum, streak, resilience, days) {
  let s = { momentum, streak, resilience };
  const trace = [];
  for (const spec of days) {
    const ratio = typeof spec === 'number' ? spec : spec.ratio;
    const requiredCount = 4;
    const out = resolveDay({ ...s, ratio, requiredCount, bigPush: spec.bigPush ?? false });
    s = { momentum: out.momentum, streak: out.streak, resilience: out.resilience };
    trace.push({ ...s, outcome: out.outcome });
  }
  return trace;
}

console.log('\nA — cold start, 14 full days');
{
  const t = runDays(20, 0, 0, Array(14).fill(1));
  check('day 1 momentum', t[0].momentum, 31.98);
  check('day 3 momentum', t[2].momentum, 52.67);
  check('day 7 momentum', t[6].momentum, 81.28);
  check('day 14 momentum', t[13].momentum, 99.35);
  check('day 14 streak', t[13].streak, 14);
  check('never exceeds 100', t[13].momentum < 100, true);
}

console.log('\nB — 4 skipped days from a fragile 3-day streak');
{
  const t = runDays(75, 3, 3, [0, 0, 0, 0]);
  check('day 1', t[0].momentum, 61.4);
  check('day 2', t[1].momentum, 49.17);
  check('day 4', t[3].momentum, 30.49);
  check('streak reset', t[0].streak, 0);
}

console.log('\nC — same collapse, armoured 30-day streak');
{
  const t = runDays(75, 30, 30, [0, 0, 0, 0]);
  check('day 1', t[0].momentum, 69.83);
  check('day 2', t[1].momentum, 62.49);
  check('day 4', t[3].momentum, 44.28);
  // the whole point of the resilience refactor: pain must ramp, not spike then ease
  const drops = [75 - t[0].momentum, t[0].momentum - t[1].momentum, t[1].momentum - t[2].momentum];
  check('collapse is monotonic (d1 < d2 < d3)', drops[0] < drops[1] && drops[1] < drops[2], true);
  check('armour beats fragile after 4 days', t[3].momentum > 30.49, true);
}

console.log('\nD — partial days freeze the streak');
{
  const out = resolveDay({ momentum: 55, streak: 10, resilience: 10, ratio: 0.6, requiredCount: 5 });
  check('streak frozen, not reset', out.streak, 10);
  check('outcome', out.outcome, 'partial');
  check('net gain is small but positive', out.momentum > 55 && out.momentum < 56.5, true);
}

console.log('\nE — equilibrium: what rate merely holds momentum');
{
  const solve = (target) => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 60; i += 1) {
      const mid = (lo + hi) / 2;
      const out = resolveDay({ momentum: target, streak: 10, resilience: 10, ratio: mid, requiredCount: 100 });
      if (out.momentum < target) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  check('hold 50 needs ~39.5%', solve(50) * 100, 39.5, 0.5);
  check('hold 70 needs ~61.9%', solve(70) * 100, 61.9, 0.5);
  check('hold 85 needs ~94.0%', solve(85) * 100, 94.0, 0.5);
}

console.log('\nF — guards');
{
  const neutral = resolveDay({ momentum: 42, streak: 5, resilience: 5, ratio: 0, requiredCount: 0 });
  check('empty chain is a no-op', neutral.momentum, 42);
  check('empty chain keeps streak', neutral.streak, 5);
  check('outcome neutral', neutral.outcome, 'neutral');

  const floor = runDays(3, 0, 0, Array(30).fill(0));
  check('momentum never goes negative', floor[29].momentum >= 0, true);

  check('armour caps at 0.85', protection(100000), 0.85, 0.001);
  check('flywheel stalls at zero momentum', angularVelocity(0), 0);
  check('flywheel spins at full momentum', angularVelocity(100), 96, 0.5);
}

console.log(
  failures === 0 ? '\n✓ engine matches the approved mechanic\n' : `\n✗ ${failures} assertion(s) failed\n`,
);
process.exit(failures === 0 ? 0 : 1);
