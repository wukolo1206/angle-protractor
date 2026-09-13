/* angle-core.js — 四上第三單元「角度」核心教學邏輯
 *
 * 網頁與測試共用同一份。只回傳代碼與參數，不回傳中文；中文回饋放在各頁 UI 層。
 * 規格：docs/superpowers/specs/2026-09-13-u3-angle-design.md v1.1
 *
 * 座標約定（規格 §2.2）：
 *   θ ＝ 射線與量角器底線向右方向的夾角，逆時針為正，0 ≤ θ ≤ 180
 *   L 款（課本款）：外圈 0 在左、內圈 0 在右 → 內圈讀數 ＝ θ、外圈讀數 ＝ 180－θ
 *   R 款：外圈 0 在右、內圈 0 在左 → 外圈讀數 ＝ θ、內圈讀數 ＝ 180－θ
 *
 * 診斷函式一律「先收集所有成立的條件，再看是不是恰好一個」，
 * 不用判定順序去裁決（U2 教訓）。若同時成立多個，回傳 AMBIGUOUS 作為守門，
 * 測試會斷言可用題目中 AMBIGUOUS 出現 0 次。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AngleCore = factory();
})(this, function () {
  'use strict';

  var ALIGN_CENTER_RATIO = 0.03;
  var ALIGN_DEG = 1;
  var READ_TOL = 1;
  var MARK_TOL = 2;
  var MAX_TURN = 360;

  function pick(cands) {
    if (cands.length === 1) return cands[0];
    if (cands.length === 0) return 'OTHER';
    return 'AMBIGUOUS';
  }

  function norm360(d) {
    d = d % 360;
    return d < 0 ? d + 360 : d;
  }

  /* ================================================================
   * 1. 量角器讀數
   * ============================================================== */

  // 直接等於 θ 的那一圈
  function directRing(style) {
    return style === 'L' ? 'inner' : 'outer';
  }

  function ringReading(theta, style, ring) {
    return ring === directRing(style) ? theta : 180 - theta;
  }

  // 該圈讀數隨哪個方向增加：等於 θ 的那圈隨逆時針增加
  function ringIncreasesWith(style, ring) {
    return ring === directRing(style) ? 'ccw' : 'cw';
  }

  function edgeReadings(theta) {
    return [theta, 180 - theta];
  }

  function isZeroStart(rays) {
    return rays.some(function (t) { return t === 0 || t === 180; });
  }

  function correctAngle(rays) {
    return Math.abs(rays[0] - rays[1]);
  }

  /* 單一答案：act1 關 1–7、隨機題、act2 關 2–3
   * input: { answer, rays:[θa, θb], style } */
  function diagnoseReadingSingle(input) {
    var c = correctAngle(input.rays);
    var ans = input.answer;
    if (ans === c) return { code: 'CORRECT' };

    var cands = [];
    if (isZeroStart(input.rays)) {
      if (ans === 180 - c) cands.push('WRONG_RING');
    } else {
      var edges = edgeReadings(input.rays[0]).concat(edgeReadings(input.rays[1]));
      if (edges.indexOf(ans) >= 0) cands.push('ONE_EDGE');
    }
    var d = Math.abs(ans - c);
    if (d > 0 && d <= 9) cands.push('NEAR_MISS');
    // 不用順序裁決：同時成立時回 AMBIGUOUS，UI 給兩種讀法都成立的通用回饋。
    // 可用題保證其他類的值與正解相差 ≥ 10，所以可用題不會出現 AMBIGUOUS（測試斷言）。
    // 課本做做看① 印p35（外圈70～135）在單一答案形式下答 70 會 AMBIGUOUS，
    // 因此該題只放在關 8 三格相減形式。
    return { code: pick(cands) };
  }

  /* 三格相減：act1 關 8
   * input: { big, small, diff, rays:[θa, θb], style }
   * 逐格判定，回傳 { scale, diff } 兩個代碼 */
  function diagnoseReadingSubtraction(input) {
    var a = input.rays[0], b = input.rays[1], style = input.style;
    var c = correctAngle(input.rays);
    var big = input.big, small = input.small;

    // 每個讀數值屬於哪些（射線, 圈）
    var owners = [];
    [['A', a], ['B', b]].forEach(function (rt) {
      ['inner', 'outer'].forEach(function (ring) {
        owners.push({ ray: rt[0], ring: ring, value: ringReading(rt[1], style, ring) });
      });
    });
    function ownersOf(v) {
      return owners.filter(function (o) { return o.value === v; });
    }
    var ob = ownersOf(big), os = ownersOf(small);

    var scale;
    if (ob.length === 0 || os.length === 0) {
      scale = 'NOT_EDGE';
    } else {
      var same = false, cross = false, anyTwoRays = false;
      ob.forEach(function (x) {
        os.forEach(function (y) {
          if (x.ray === y.ray) return;
          anyTwoRays = true;
          if (x.ring === y.ring) same = true;
          else cross = true;
        });
      });
      if (same) scale = 'CORRECT';            // 同圈兩邊（一邊在 90° 時兩圈同值，自然歸此）
      else if (cross) scale = 'CROSS_RING';
      else scale = 'SAME_EDGE';               // 兩格都是同一條邊的讀數
      void anyTwoRays;
    }

    var diffCode;
    var sub = Math.abs(big - small);
    if (scale === 'CORRECT') {
      diffCode = (input.diff === c) ? 'CORRECT' : 'SUB_ERROR';
    } else {
      diffCode = (input.diff === sub) ? 'FOLLOWS_WRONG_READING' : 'OTHER';
    }
    return { scale: scale, diff: diffCode };
  }

  /* 消歧義規則（規格 §3） */
  function isReadingItemUsable(item) {
    var rays = item.rays;
    var a = rays[0], b = rays[1];
    if (a < 0 || a > 180 || b < 0 || b > 180) return false;
    var c = correctAngle(rays);
    if (c <= 0 || c >= 180) return false;
    if (isZeroStart(rays)) {
      // 兩條都在底線上＝平角，不是報讀題
      if ((a === 0 || a === 180) && (b === 0 || b === 180)) return false;
      // 規則 1：正解不在 81～99
      return !(c >= 81 && c <= 99);
    }
    // 規則 2：單邊讀數（排除等於正解者）與正解相差須 ≥ 10
    // 規則 3：跨圈差等於正解不算歧義（不檢查跨圈差）
    var edges = edgeReadings(a).concat(edgeReadings(b));
    for (var i = 0; i < edges.length; i++) {
      var v = edges[i];
      if (v !== c && Math.abs(v - c) < 10) return false;
    }
    return true;
  }

  /* 產生器
   * kind: 'zero'（始邊在 0）｜'nonzero'（兩邊都不在 0）
   * step: 10｜5｜1
   * style: 'L'｜'R'｜'random' */
  function enumerateReadingItems(kind, step) {
    var out = [];
    if (kind === 'zero') {
      for (var c = step; c < 180; c += step) {
        out.push({ rays: [0, c] });
        out.push({ rays: [180, 180 - c] });
      }
    } else {
      for (var a = step; a < 180; a += step) {
        for (var b = a + step; b < 180; b += step) {
          out.push({ rays: [a, b] });
        }
      }
    }
    return out.filter(isReadingItemUsable);
  }

  function makeReadingItem(kind, step, style, rng) {
    rng = rng || Math.random;
    var pool = enumerateReadingItems(kind, step);
    var it = pool[Math.floor(rng() * pool.length)];
    var s = style === 'random' ? (rng() < 0.5 ? 'L' : 'R') : style;
    var rays = rng() < 0.5 ? [it.rays[0], it.rays[1]] : [it.rays[1], it.rays[0]];
    if (kind === 'zero' && !(rays[0] === 0 || rays[0] === 180)) rays = [rays[1], rays[0]];
    return { rays: rays, style: s, correct: correctAngle(rays) };
  }

  /* ================================================================
   * 2. 擺放量角器、定刻度點（act2）
   * ============================================================== */

  /* prot:  { cx, cy, rot, r }  rot＝量角器 θ＝0 方向（數學座標，度）
   * angle: { vx, vy, e1, e2 }  兩邊方向（數學座標，度） */
  function checkAlignment(prot, angle) {
    var dist = Math.sqrt(Math.pow(prot.cx - angle.vx, 2) + Math.pow(prot.cy - angle.vy, 2));
    if (dist > ALIGN_CENTER_RATIO * prot.r) return { code: 'CENTER_OFF', dist: dist };

    var t1 = norm360(angle.e1 - prot.rot), t2 = norm360(angle.e2 - prot.rot);
    function offBase(t) {
      return Math.min(Math.min(t, 360 - t), Math.abs(t - 180));
    }
    var o1 = offBase(t1), o2 = offBase(t2);
    var baseT, otherT, off;
    if (o1 <= ALIGN_DEG && (o2 > ALIGN_DEG || o1 <= o2)) { baseT = t1; otherT = t2; off = o1; }
    else if (o2 <= ALIGN_DEG) { baseT = t2; otherT = t1; off = o2; }
    else return { code: 'ZERO_LINE_OFF', off: Math.min(o1, o2) };

    if (otherT > 180) return { code: 'ANGLE_OUTSIDE' };
    return { code: 'ALIGNED', baseTheta: baseT, otherTheta: otherT, off: off };
  }

  /* input: { markDeg, target }  markDeg＝學生記號與底線形成的角 */
  function diagnoseMark(input) {
    var m = input.markDeg, t = input.target;
    var cands = [];
    if (Math.abs(m - t) <= MARK_TOL) cands.push('CORRECT');
    if (Math.abs(m - (180 - t)) <= MARK_TOL) cands.push('WRONG_RING');
    return { code: pick(cands) };
  }

  function isMarkTargetUsable(t) {
    return t > 0 && t < 180 && !(t >= 81 && t <= 99);
  }

  /* ================================================================
   * 3. 鐘面旋轉（act3）
   * ============================================================== */

  function clockTurn(from, to, dir) {
    var s = dir === 'cw' ? (to - from + 12) % 12 : (from - to + 12) % 12;
    if (s === 0) s = 12; // 起點＝終點 視為轉一整圈
    return { steps: s, degrees: s * 30 };
  }

  function clockAfter(from, dir, deg) {
    var s = deg / 30;
    var p = dir === 'cw' ? from + s : from - s;
    p = ((p - 1) % 12 + 12) % 12 + 1;
    return p;
  }

  /* input: { inDir, inSteps, inDeg, from, to, targetDir }
   * 方向、格數、度數三格各自判定 */
  function diagnoseClock(input) {
    var n = clockTurn(input.from, input.to, input.targetDir).steps;
    var dirCode = null;
    if (input.inDir !== undefined && input.inDir !== null) {
      dirCode = input.inDir === input.targetDir ? 'CORRECT' : 'WRONG_DIR';
    }

    var k = input.inSteps, cands = [];
    var stepCode;
    if (k === n) stepCode = 'CORRECT';
    else {
      if (n === 12 && k === 0) cands.push('ZERO_FULL_TURN');
      if (n < 12 && k === n + 1) cands.push('COUNTED_START');
      if (n !== 6 && n !== 12 && k === 12 - n) cands.push('OTHER_ARC');
      stepCode = pick(cands);
    }

    var degCode = null;
    if (input.inDeg !== undefined && input.inDeg !== null) {
      degCode = input.inDeg === k * 30 ? 'CORRECT' : 'MUL_ERROR';
    }
    return { dir: dirCode, steps: stepCode, deg: degCode, correctSteps: n };
  }

  function minutesToSteps(min) {
    return min / 5;
  }

  /* ================================================================
   * 4. 量角器上的竹籤旋轉（act3）
   * ============================================================== */

  function stickAfter(start, dir, deg, style, ring) {
    return dir === ringIncreasesWith(style, ring) ? start + deg : start - deg;
  }

  /* 逆向：從 from 轉到 to 要往哪個方向轉幾度 */
  function stickNeeded(from, to, style, ring) {
    var inc = ringIncreasesWith(style, ring);
    if (to >= from) return { dir: inc, deg: to - from };
    return { dir: inc === 'cw' ? 'ccw' : 'cw', deg: from - to };
  }

  function inScale(v) {
    return v >= 0 && v <= 180;
  }

  /* input: { answer, start, dir, deg, style, ring } */
  function diagnoseStick(input) {
    var inc = ringIncreasesWith(input.style, input.ring);
    var ok = stickAfter(input.start, input.dir, input.deg, input.style, input.ring);
    var rev = input.dir === inc ? input.start - input.deg : input.start + input.deg;
    var base = { ring: input.ring, dir: input.dir, increasesWith: inc };
    if (input.answer === ok) { base.code = 'CORRECT'; return base; }
    var cands = [];
    if (input.deg > 0 && inScale(rev) && input.answer === rev) cands.push('REVERSED_OP');
    base.code = pick(cands);
    return base;
  }

  /* 產生連續旋轉題：每一步中間值都在 0～180 內 */
  function makeStickItem(steps, style, ring, rng) {
    rng = rng || Math.random;
    var pos = 0, list = [];
    var inc = ringIncreasesWith(style, ring);
    for (var i = 0; i < steps; i++) {
      for (var tries = 0; tries < 200; tries++) {
        var deg = (1 + Math.floor(rng() * 16)) * 10;
        var dir = rng() < 0.5 ? 'cw' : 'ccw';
        var next = stickAfter(pos, dir, deg, style, ring);
        // 只要求轉後仍在刻度內。反方向若出界，該步 REVERSED_OP 不診斷（diagnoseStick 已處理）；
        // 起點 0 時反方向必出界，若兩向都要求在內，第一步永遠出不了題。
        if (inScale(next) && next !== pos) {
          list.push({ dir: dir, deg: deg, after: next });
          pos = next;
          break;
        }
      }
    }
    return { start: 0, style: style, ring: ring, turns: list };
  }

  /* ================================================================
   * 5. 金庫密碼（教冊 PDF p40／印 p38）
   * ============================================================== */

  function vaultDecode(turns) {
    var pos = 12, code = [];
    for (var i = 0; i < turns.length; i++) {
      var t = turns[i];
      if (t.deg < 0 || t.deg > MAX_TURN || t.deg % 30 !== 0) return null;
      pos = t.deg === 0 ? pos : clockAfter(pos, t.dir, t.deg);
      code.push(pos);
    }
    return code;
  }

  function vaultCheck(turns, code) {
    var got = vaultDecode(turns);
    return !!got && got.length === code.length && got.every(function (v, i) { return v === code[i]; });
  }

  // 每一格可行的兩種轉法
  function vaultTurns(code) {
    var pos = 12;
    return code.map(function (target) {
      var cw = (target - pos + 12) % 12, ccw = (pos - target + 12) % 12;
      pos = target;
      return { cw: cw * 30, ccw: ccw * 30 };
    });
  }

  /* ================================================================
   * 6. 角的合成與分解（act4）
   * ============================================================== */

  /* item: { op:'add'|'sub', total, parts:[..], askTotal }
   *   add：answer ＝ parts 總和
   *   sub：answer ＝ total － parts 總和
   * input: { inOp, inTotal, answer, item }
   * 回傳 { op, total, answer } 三格各自的代碼 */
  function composeCorrect(item) {
    var s = item.parts.reduce(function (x, y) { return x + y; }, 0);
    return item.op === 'add' ? s : item.total - s;
  }

  function diagnoseCompose(input) {
    var item = input.item;
    var correct = composeCorrect(item);
    var opCode = input.inOp === undefined ? null : (input.inOp === item.op ? 'CORRECT' : 'WRONG_OP');
    var totalCode = null;
    if (item.askTotal && input.inTotal !== undefined) {
      totalCode = input.inTotal === item.total ? 'CORRECT' : 'WRONG_TOTAL';
    }
    var ansCode;
    if (input.answer === correct) ansCode = 'CORRECT';
    else {
      var cands = [];
      if (item.op === 'sub' && item.parts.length >= 2) {
        var omit = item.parts.map(function (p) { return item.total - p; });
        if (omit.indexOf(input.answer) >= 0) cands.push('OMIT_ONE');
      }
      ansCode = pick(cands);
    }
    return { op: opCode, total: totalCode, answer: ansCode, correct: correct };
  }

  /* ================================================================
   * 7. 考古題用小工具
   * ============================================================== */

  // 連續旋轉的淨量：順時針為正
  function netTurn(turns) {
    return turns.reduce(function (s, t) { return s + (t.dir === 'cw' ? t.deg : -t.deg); }, 0);
  }

  // 每 size 度一段，deg 落在第幾段（1 起算）
  function sweepSegment(deg, size) {
    return Math.floor(deg / size) + 1;
  }

  return {
    ALIGN_CENTER_RATIO: ALIGN_CENTER_RATIO,
    ALIGN_DEG: ALIGN_DEG,
    READ_TOL: READ_TOL,
    MARK_TOL: MARK_TOL,
    MAX_TURN: MAX_TURN,
    ringReading: ringReading,
    ringIncreasesWith: ringIncreasesWith,
    correctAngle: correctAngle,
    isZeroStart: isZeroStart,
    diagnoseReadingSingle: diagnoseReadingSingle,
    diagnoseReadingSubtraction: diagnoseReadingSubtraction,
    isReadingItemUsable: isReadingItemUsable,
    enumerateReadingItems: enumerateReadingItems,
    makeReadingItem: makeReadingItem,
    checkAlignment: checkAlignment,
    diagnoseMark: diagnoseMark,
    isMarkTargetUsable: isMarkTargetUsable,
    clockTurn: clockTurn,
    clockAfter: clockAfter,
    diagnoseClock: diagnoseClock,
    minutesToSteps: minutesToSteps,
    stickAfter: stickAfter,
    stickNeeded: stickNeeded,
    diagnoseStick: diagnoseStick,
    makeStickItem: makeStickItem,
    vaultDecode: vaultDecode,
    vaultCheck: vaultCheck,
    vaultTurns: vaultTurns,
    composeCorrect: composeCorrect,
    diagnoseCompose: diagnoseCompose,
    netTurn: netTurn,
    sweepSegment: sweepSegment
  };
});
