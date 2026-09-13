/* angle-core.test.js — 核心邏輯回歸測試
 *
 * 期望值一律取自課本／習作／教冊標準答案或考古題正解，每筆標明出處。
 * 課本印刷頁＝PDF頁＋30；習作印刷頁＝PDF頁＋27；教冊印刷頁＝PDF頁－2。
 * 執行：node angle-core.test.js
 */
'use strict';
var C = require('./angle-core.js');

var pass = 0, fail = 0;
function group(n) { console.log('\n── ' + n); }
function eq(label, actual, expected) {
  var a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; console.log('  PASS  ' + label); }
  else { fail++; console.log('  FAIL  ' + label + '\n        得到 ' + a + '\n        預期 ' + e); }
}

/* 課本款 L：外圈 0 在左，外圈讀數＝180－θ。由外圈讀數換回 θ */
function thetaFromOuterL(outer) { return 180 - outer; }

/* =============================================================
 * 1. 量角器讀數（act1）
 * =========================================================== */
group('1. 讀數與圈別');
eq('課本問5① 印p34 L款 θ=50 內圈', C.ringReading(50, 'L', 'inner'), 50);
eq('課本問5① 印p34 L款 θ=50 外圈', C.ringReading(50, 'L', 'outer'), 130);
eq('R款 θ=50 外圈', C.ringReading(50, 'R', 'outer'), 50);
eq('ringIncreasesWith L外 cw', C.ringIncreasesWith('L', 'outer'), 'cw');
eq('ringIncreasesWith L內 ccw', C.ringIncreasesWith('L', 'inner'), 'ccw');
eq('ringIncreasesWith R外 ccw', C.ringIncreasesWith('R', 'outer'), 'ccw');
eq('ringIncreasesWith R內 cw', C.ringIncreasesWith('R', 'inner'), 'cw');

group('1b. 課本固定題的正解');
// 問5① 始邊在右（內圈0，θ=0），終邊內圈50
eq('問5① 印p34', C.correctAngle([0, 50]), 50);
// 問5② 始邊在左（外圈0，θ=180），終邊外圈45
eq('問5② 印p34', C.correctAngle([180, thetaFromOuterL(45)]), 45);
// 做做看 印p34：① 始邊外圈0、終邊外圈80；② 始邊內圈0、終邊內圈65
eq('做做看① 印p34', C.correctAngle([180, thetaFromOuterL(80)]), 80);
eq('做做看② 印p34', C.correctAngle([0, 65]), 65);
// 問6 印p35：始邊外圈0，終邊外圈140／內圈40
var q6 = [180, thetaFromOuterL(140)];
eq('問6 印p35 正解 140', C.correctAngle(q6), 140);
eq('問6 答 40 → WRONG_RING', C.diagnoseReadingSingle({ answer: 40, rays: q6, style: 'L' }).code, 'WRONG_RING');
eq('問6 答 140 → CORRECT', C.diagnoseReadingSingle({ answer: 140, rays: q6, style: 'L' }).code, 'CORRECT');
// 問7 印p35：外圈 50、120（教冊 PDF p36 指導重點2 明文）
var q7 = [thetaFromOuterL(50), thetaFromOuterL(120)];
eq('問7 印p35 正解 70', C.correctAngle(q7), 70);
eq('問7 答 120 → ONE_EDGE', C.diagnoseReadingSingle({ answer: 120, rays: q7, style: 'L' }).code, 'ONE_EDGE');
eq('問7 答 72 → NEAR_MISS', C.diagnoseReadingSingle({ answer: 72, rays: q7, style: 'L' }).code, 'NEAR_MISS');
// 做做看 印p35：① 外圈 70～135；② 外圈 60～160
var p35a = [thetaFromOuterL(70), thetaFromOuterL(135)];
var p35b = [thetaFromOuterL(60), thetaFromOuterL(160)];
eq('做做看① 印p35 正解 65', C.correctAngle(p35a), 65);
eq('做做看② 印p35 正解 100', C.correctAngle(p35b), 100);

group('1c. 關8 三格相減（做做看① 印p35）');
eq('填 135、70、65 → 全對',
  C.diagnoseReadingSubtraction({ big: 135, small: 70, diff: 65, rays: p35a, style: 'L' }),
  { scale: 'CORRECT', diff: 'CORRECT' });
eq('填 110、45、65（內圈）→ 全對',
  C.diagnoseReadingSubtraction({ big: 110, small: 45, diff: 65, rays: p35a, style: 'L' }),
  { scale: 'CORRECT', diff: 'CORRECT' });
eq('填 135、110、25 → CROSS_RING＋FOLLOWS_WRONG_READING',
  C.diagnoseReadingSubtraction({ big: 135, small: 110, diff: 25, rays: p35a, style: 'L' }),
  { scale: 'CROSS_RING', diff: 'FOLLOWS_WRONG_READING' });
eq('填 135、70、55 → CORRECT＋SUB_ERROR',
  C.diagnoseReadingSubtraction({ big: 135, small: 70, diff: 55, rays: p35a, style: 'L' }),
  { scale: 'CORRECT', diff: 'SUB_ERROR' });
eq('填 135、45、90 → SAME_EDGE（同一條邊兩圈）',
  C.diagnoseReadingSubtraction({ big: 135, small: 45, diff: 90, rays: p35a, style: 'L' }),
  { scale: 'SAME_EDGE', diff: 'FOLLOWS_WRONG_READING' });
eq('填 140、70、70 → NOT_EDGE',
  C.diagnoseReadingSubtraction({ big: 140, small: 70, diff: 70, rays: p35a, style: 'L' }).scale,
  'NOT_EDGE');
// 109-15：一邊在 90，兩圈同值，不判 CROSS_RING
var e10915 = [90, thetaFromOuterL(40)];
eq('109-15 填 90、40、50 → 全對',
  C.diagnoseReadingSubtraction({ big: 90, small: 40, diff: 50, rays: e10915, style: 'L' }),
  { scale: 'CORRECT', diff: 'CORRECT' });

group('1d. 可用性（消歧義規則）');
// 做做看① 印p35 在單一答案形式下答 70 同時是「讀一邊」與「差一點點」→ 只用於關 8 三格相減
eq('做做看① 印p35 單一答案形式不可用（答70歧義）', C.isReadingItemUsable({ rays: p35a }), false);
eq('做做看① 印p35 單一答案答70 → AMBIGUOUS', C.diagnoseReadingSingle({ answer: 70, rays: p35a, style: 'L' }).code, 'AMBIGUOUS');
[['問7', q7], ['做做看② 印p35', p35b], ['問6', q6],
 ['問5①', [0, 50]], ['問5②', [180, 135]], ['做做看① 印p34', [180, 100]], ['做做看② 印p34', [0, 65]],
 ['109-15（90／外圈40）', e10915],
 ['110-2（外圈20／150）', [thetaFromOuterL(20), thetaFromOuterL(150)]],
 // 112-8 原圖：L 款，兩邊在內圈（紅字）40、110 → θ＝40、110
 ['112-8（內圈40／110）', [40, 110]]
].forEach(function (t) {
  eq(t[0] + ' 可用', C.isReadingItemUsable({ rays: t[1] }), true);
});
eq('考古題正解 109-15=50', C.correctAngle(e10915), 50);
eq('考古題正解 110-2=130', C.correctAngle([thetaFromOuterL(20), thetaFromOuterL(150)]), 130);
eq('考古題正解 112-8=70', C.correctAngle([40, 110]), 70);
eq('112-8 誘答 40／110 → ONE_EDGE', [40, 110].map(function (a) {
  return C.diagnoseReadingSingle({ answer: a, rays: [40, 110], style: 'L' }).code; }), ['ONE_EDGE', 'ONE_EDGE']);
eq('始邊在0、正解90 不可用', C.isReadingItemUsable({ rays: [0, 90] }), false);
eq('始邊在0、正解85 不可用', C.isReadingItemUsable({ rays: [0, 85] }), false);
eq('始邊在0、正解80 可用', C.isReadingItemUsable({ rays: [0, 80] }), true);

group('1e. 窮舉：每關可用題數、無歧義、代碼皆可達');
[['zero', 10], ['zero', 5], ['zero', 1], ['nonzero', 10], ['nonzero', 5]].forEach(function (k) {
  var pool = C.enumerateReadingItems(k[0], k[1]);
  eq(k[0] + ' 每 ' + k[1] + '° 可用題 ≥ 20（實得 ' + pool.length + '）', pool.length >= 20, true);
});
(function () {
  var seen = {}, ambiguous = 0;
  ['zero', 'nonzero'].forEach(function (kind) {
    C.enumerateReadingItems(kind, 5).forEach(function (it) {
      ['L', 'R'].forEach(function (style) {
        for (var ans = 0; ans <= 180; ans++) {
          var code = C.diagnoseReadingSingle({ answer: ans, rays: it.rays, style: style }).code;
          seen[code] = true;
          if (code === 'AMBIGUOUS') ambiguous++;
        }
      });
    });
  });
  eq('diagnoseReadingSingle 可用題全輸入 AMBIGUOUS=0', ambiguous, 0);
  ['CORRECT', 'WRONG_RING', 'ONE_EDGE', 'NEAR_MISS', 'OTHER'].forEach(function (c) {
    eq('代碼可達 ' + c, !!seen[c], true);
  });
})();
(function () {
  var seen = {};
  C.enumerateReadingItems('nonzero', 10).forEach(function (it) {
    var vals = [];
    for (var v = 0; v <= 180; v += 5) vals.push(v);
    vals.forEach(function (big) {
      vals.forEach(function (small) {
        [0, 5, 10, 65, 100].concat([Math.abs(big - small)]).forEach(function (diff) {
          var r = C.diagnoseReadingSubtraction({ big: big, small: small, diff: diff, rays: it.rays, style: 'L' });
          seen['s:' + r.scale] = true; seen['d:' + r.diff] = true;
        });
      });
    });
  });
  ['s:CORRECT', 's:CROSS_RING', 's:SAME_EDGE', 's:NOT_EDGE',
   'd:CORRECT', 'd:SUB_ERROR', 'd:FOLLOWS_WRONG_READING', 'd:OTHER'].forEach(function (c) {
    eq('相減代碼可達 ' + c, !!seen[c], true);
  });
})();
(function () {
  var rng = (function () { var s = 7; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  var bad = 0;
  for (var i = 0; i < 500; i++) {
    var it = C.makeReadingItem(i % 2 ? 'zero' : 'nonzero', 5, 'random', rng);
    if (!C.isReadingItemUsable(it)) bad++;
    if (i % 2 && !C.isZeroStart([it.rays[0]])) bad++;
  }
  eq('產生器 500 題皆可用、始邊題的第一條射線在底線', bad, 0);
})();

/* =============================================================
 * 2. 擺放與定刻度點（act2）
 * =========================================================== */
group('2. checkAlignment');
var prot = { cx: 100, cy: 100, rot: 30, r: 200 };
eq('中心偏 10px（>6px）→ CENTER_OFF',
  C.checkAlignment(prot, { vx: 110, vy: 100, e1: 30, e2: 90 }).code, 'CENTER_OFF');
eq('中心偏 5px、0線偏 3° → ZERO_LINE_OFF',
  C.checkAlignment(prot, { vx: 105, vy: 100, e1: 33, e2: 90 }).code, 'ZERO_LINE_OFF');
var al = C.checkAlignment(prot, { vx: 100, vy: 100, e1: 30.5, e2: 90 });
eq('對齊 → ALIGNED，另一邊 θ=60', [al.code, al.otherTheta], ['ALIGNED', 60]);
eq('邊對到底線另一端（θ=180）也算對齊',
  C.checkAlignment(prot, { vx: 100, vy: 100, e1: 210, e2: 120 }).code, 'ALIGNED');
eq('另一邊在下半圈 → ANGLE_OUTSIDE',
  C.checkAlignment(prot, { vx: 100, vy: 100, e1: 30, e2: 300 }).code, 'ANGLE_OUTSIDE');

group('2b. 定刻度點（課本問9 印p40，容許2°）');
eq('65° 點在 66 → CORRECT', C.diagnoseMark({ markDeg: 66, target: 65 }).code, 'CORRECT');
eq('65° 點在 115 → WRONG_RING', C.diagnoseMark({ markDeg: 115, target: 65 }).code, 'WRONG_RING');
eq('做做看 70° 點在 110 → WRONG_RING', C.diagnoseMark({ markDeg: 110, target: 70 }).code, 'WRONG_RING');
eq('做做看 135° 點在 45 → WRONG_RING', C.diagnoseMark({ markDeg: 45, target: 135 }).code, 'WRONG_RING');
eq('135° 點在 100 → OTHER', C.diagnoseMark({ markDeg: 100, target: 135 }).code, 'OTHER');
(function () {
  var amb = 0;
  for (var t = 1; t < 180; t++) {
    if (!C.isMarkTargetUsable(t)) continue;
    for (var m = 0; m <= 180; m++) if (C.diagnoseMark({ markDeg: m, target: t }).code === 'AMBIGUOUS') amb++;
  }
  eq('定刻度點 可用 target 全輸入 AMBIGUOUS=0', amb, 0);
})();

/* =============================================================
 * 3. 鐘面旋轉（act3）
 * =========================================================== */
group('3. 鐘面（課本 印p42–43、p46）');
eq('問4① 12順→3', C.clockTurn(12, 3, 'cw'), { steps: 3, degrees: 90 });
eq('問4② 12順→6', C.clockTurn(12, 6, 'cw'), { steps: 6, degrees: 180 });
eq('問4③ 12順→8', C.clockTurn(12, 8, 'cw'), { steps: 8, degrees: 240 });
eq('問4④ 12順→12 周角', C.clockTurn(12, 12, 'cw'), { steps: 12, degrees: 360 });
eq('問5① 12逆→5', C.clockTurn(12, 5, 'ccw').degrees, 210);
eq('問5② 9順→1', C.clockTurn(9, 1, 'cw').degrees, 120);
eq('問5③ 9逆→1', C.clockTurn(9, 1, 'ccw').degrees, 240);
eq('做做看① 3順→11', C.clockTurn(3, 11, 'cw').degrees, 240);
eq('練習百分百第2題① 2逆→10', C.clockTurn(2, 10, 'ccw').degrees, 120);
eq('練習百分百第2題② 4順→7', C.clockTurn(4, 7, 'cw').degrees, 90);

eq('周角題填 0 格 → ZERO_FULL_TURN',
  C.diagnoseClock({ inSteps: 0, inDeg: 0, from: 12, to: 12, targetDir: 'cw' }).steps, 'ZERO_FULL_TURN');
eq('9逆→1 選逆填4格 → 方向對、OTHER_ARC',
  (function (r) { return [r.dir, r.steps]; })(C.diagnoseClock({ inDir: 'ccw', inSteps: 4, inDeg: 120, from: 9, to: 1, targetDir: 'ccw' })),
  ['CORRECT', 'OTHER_ARC']);
eq('練習百分百第2題① 選順 → WRONG_DIR',
  C.diagnoseClock({ inDir: 'cw', inSteps: 4, inDeg: 120, from: 2, to: 10, targetDir: 'ccw' }).dir, 'WRONG_DIR');
eq('12順→3 填4格 → COUNTED_START',
  C.diagnoseClock({ inSteps: 4, from: 12, to: 3, targetDir: 'cw' }).steps, 'COUNTED_START');
eq('格數對、度數算錯 → MUL_ERROR',
  C.diagnoseClock({ inSteps: 7, inDeg: 200, from: 12, to: 5, targetDir: 'ccw' }).deg, 'MUL_ERROR');
eq('半圈 12順→6 填6格 → CORRECT（不判另一邊）',
  C.diagnoseClock({ inSteps: 6, from: 12, to: 6, targetDir: 'cw' }).steps, 'CORRECT');
(function () {
  var seen = {}, amb = 0;
  for (var from = 1; from <= 12; from++) for (var to = 1; to <= 12; to++) {
    ['cw', 'ccw'].forEach(function (dir) {
      for (var k = 0; k <= 13; k++) {
        var s = C.diagnoseClock({ inSteps: k, from: from, to: to, targetDir: dir }).steps;
        seen[s] = true; if (s === 'AMBIGUOUS') amb++;
      }
    });
  }
  eq('鐘面格數 全輸入 AMBIGUOUS=0', amb, 0);
  ['CORRECT', 'ZERO_FULL_TURN', 'COUNTED_START', 'OTHER_ARC', 'OTHER'].forEach(function (c) {
    eq('鐘面代碼可達 ' + c, !!seen[c], true);
  });
})();

/* =============================================================
 * 4. 竹籤連續旋轉（act3）
 * =========================================================== */
group('4. 竹籤（課本 印p43、習作 印p37、p41）');
(function () {
  var p = C.stickAfter(0, 'cw', 80, 'L', 'outer');
  eq('做做看② 外圈0 順80', p, 80);
  p = C.stickAfter(p, 'cw', 40, 'L', 'outer'); eq('再順40', p, 120);
  p = C.stickAfter(p, 'ccw', 50, 'L', 'outer'); eq('再逆50', p, 70);
})();
(function () {
  var p = C.stickAfter(0, 'ccw', 160, 'L', 'inner');
  eq('習作p37 內圈0 逆160', p, 160);
  eq('再順75', C.stickAfter(p, 'cw', 75, 'L', 'inner'), 85);
})();
eq('習作p41③ 內圈0 逆77 逆65',
  C.stickAfter(C.stickAfter(0, 'ccw', 77, 'L', 'inner'), 'ccw', 65, 'L', 'inner'), 142);
eq('習作p41④ 外圈0 順136 逆49',
  C.stickAfter(C.stickAfter(0, 'cw', 136, 'L', 'outer'), 'ccw', 49, 'L', 'outer'), 87);
eq('習作p41① 內圈 70→115', C.stickNeeded(70, 115, 'L', 'inner'), { dir: 'ccw', deg: 45 });
eq('習作p41② 內圈 150→83', C.stickNeeded(150, 83, 'L', 'inner'), { dir: 'cw', deg: 67 });
eq('114-12 外圈60 順40 逆80 順20',
  C.stickAfter(C.stickAfter(C.stickAfter(60, 'cw', 40, 'L', 'outer'), 'ccw', 80, 'L', 'outer'), 'cw', 20, 'L', 'outer'), 40);
(function () {
  var r = C.diagnoseStick({ answer: 235, start: 160, dir: 'cw', deg: 75, style: 'L', ring: 'inner' });
  eq('習作p37 答反方向但出界（235）→ OTHER', r.code, 'OTHER');
  r = C.diagnoseStick({ answer: 45, start: 120, dir: 'cw', deg: 75, style: 'L', ring: 'inner' });
  eq('L款內圈 120 順75 → 45（內圈順時針減少）', r.code, 'CORRECT');
  r = C.diagnoseStick({ answer: 135, start: 60, dir: 'ccw', deg: 75, style: 'L', ring: 'inner' });
  eq('L款內圈 60 逆75 → 135（內圈逆時針增加）', r.code, 'CORRECT');
  r = C.diagnoseStick({ answer: 120, start: 80, dir: 'ccw', deg: 40, style: 'L', ring: 'outer' });
  eq('外圈80 逆40 答120 → REVERSED_OP，increasesWith=cw',
    [r.code, r.ring, r.dir, r.increasesWith], ['REVERSED_OP', 'outer', 'ccw', 'cw']);
  r = C.diagnoseStick({ answer: 40, start: 80, dir: 'ccw', deg: 40, style: 'L', ring: 'inner' });
  eq('內圈80 逆40 答40 → REVERSED_OP，increasesWith=ccw',
    [r.code, r.increasesWith], ['REVERSED_OP', 'ccw']);
})();
(function () {
  var rng = (function () { var s = 11; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  var bad = 0;
  for (var i = 0; i < 300; i++) {
    var style = i % 2 ? 'L' : 'R', ring = i % 3 ? 'outer' : 'inner';
    var it = C.makeStickItem(3, style, ring, rng);
    if (it.turns.length !== 3) bad++;
    it.turns.forEach(function (t) { if (t.after < 0 || t.after > 180 || t.deg > C.MAX_TURN) bad++; });
  }
  eq('竹籤產生器 300 題中間值皆在 0～180', bad, 0);
})();

/* =============================================================
 * 5. 金庫密碼（教冊 PDF p40／印 p38）
 * =========================================================== */
group('5. 金庫密碼');
var vaultEx = [{ dir: 'cw', deg: 150 }, { dir: 'ccw', deg: 60 }, { dir: 'ccw', deg: 60 }, { dir: 'cw', deg: 240 }];
eq('教冊例 順150 逆60 逆60 順240 → 5 3 1 9', C.vaultDecode(vaultEx), [5, 3, 1, 9]);
eq('vaultCheck 教冊例', C.vaultCheck(vaultEx, [5, 3, 1, 9]), true);
eq('教冊說明2 4到8 逆240 也可以', C.clockAfter(4, 'ccw', 240), 8);
eq('vaultTurns 5 3 1 9 兩方向',
  C.vaultTurns([5, 3, 1, 9]), [{ cw: 150, ccw: 210 }, { cw: 300, ccw: 60 }, { cw: 300, ccw: 60 }, { cw: 240, ccw: 120 }]);
eq('超過360不接受', C.vaultDecode([{ dir: 'cw', deg: 390 }]), null);

/* =============================================================
 * 6. 合成分解（act4）
 * =========================================================== */
group('6. 合成分解（課本 印p44–46）');
[
  ['問1① 印p44 ∠4+∠2', { op: 'add', parts: [45, 60] }, 105],
  ['問1② 印p44 ∠4−∠1', { op: 'sub', total: 45, parts: [30] }, 15],
  ['做做看① 印p44', { op: 'add', parts: [96, 37] }, 133],
  ['做做看② 印p44', { op: 'sub', total: 70, parts: [20] }, 50],
  ['問2 印p45 直線', { op: 'sub', total: 180, parts: [120], askTotal: true }, 60],
  ['問3 印p45 直角', { op: 'sub', total: 90, parts: [34], askTotal: true }, 56],
  ['做做看① 印p45', { op: 'sub', total: 180, parts: [40, 35], askTotal: true }, 105],
  ['做做看② 印p45', { op: 'sub', total: 90, parts: [52, 18], askTotal: true }, 20],
  ['練習百分百第3題① 印p46 合成', { op: 'add', parts: [40, 57] }, 97],
  ['練習百分百第3題② 印p46 直線', { op: 'sub', total: 180, parts: [55, 55], askTotal: true }, 70],
  ['112-25 平角＋35', { op: 'add', parts: [180, 35] }, 215]
].forEach(function (t) { eq(t[0], C.composeCorrect(t[1]), t[2]); });

var p46b = { op: 'sub', total: 180, parts: [55, 55], askTotal: true };
eq('印p46② 答 125 → OMIT_ONE', C.diagnoseCompose({ inOp: 'sub', inTotal: 180, answer: 125, item: p46b }).answer, 'OMIT_ONE');
eq('印p46① 選「－」→ WRONG_OP',
  C.diagnoseCompose({ inOp: 'sub', answer: 17, item: { op: 'add', parts: [40, 57] } }).op, 'WRONG_OP');
eq('問2 選總量90 → WRONG_TOTAL',
  C.diagnoseCompose({ inOp: 'sub', inTotal: 90, answer: -30, item: { op: 'sub', total: 180, parts: [120], askTotal: true } }).total, 'WRONG_TOTAL');
eq('做做看② 印p45 答 38 → OMIT_ONE',
  C.diagnoseCompose({ inOp: 'sub', inTotal: 90, answer: 38, item: { op: 'sub', total: 90, parts: [52, 18], askTotal: true } }).answer, 'OMIT_ONE');

/* =============================================================
 * 7. 考古題
 * =========================================================== */
group('7. 考古題');
eq('108-19 9點到21點 時針順轉一圈', C.clockTurn(9, 9, 'cw'), { steps: 12, degrees: 360 });
eq('109-20 面向10點鐘順轉120 → 2點鐘', C.clockAfter(10, 'cw', 120), 2);
eq('109-20 誘答② 逆轉 → 6點鐘', C.clockAfter(10, 'ccw', 120), 6);
eq('111-4 順90 逆135 淨轉 −45（逆45，指向左上）', C.netTurn([{ dir: 'cw', deg: 90 }, { dir: 'ccw', deg: 135 }]), -45);
eq('111-17 118° 每色30° → 第4段（紅橙黃綠 → 綠）', C.sweepSegment(118, 30), 4);
eq('113-9 15分 → 3大格 → 90°', C.minutesToSteps(15) * 30, 90);
eq('114-20 10:10→10:45 35分 → 7大格 → 210°', C.minutesToSteps(35) * 30, 210);

console.log('\n' + '='.repeat(50));
console.log('  通過 ' + pass + '　失敗 ' + fail);
console.log('='.repeat(50));
process.exit(fail ? 1 : 0);
