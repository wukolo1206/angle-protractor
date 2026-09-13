/* protractor.js — SVG 繪圖與拖曳共用工具（量角器、鐘面、射線、扇形、放大鏡）
 *
 * 座標：螢幕 SVG 座標 y 向下；角度一律用數學角（逆時針為正、0＝向右），
 *       與 angle-core.js 的 θ 約定一致。
 * 量角器以自身中心為原點繪製，底線在 y=0，半圓朝上；
 * 放到畫面上時用 place(g, cx, cy, rot)，rot 為量角器 θ=0 方向的數學角。
 * 刻度字只旋轉、不鏡像（規格 §2.1）。
 */
(function (root) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function clear(g) { while (g.firstChild) g.removeChild(g.firstChild); }
  function rad(d) { return d * Math.PI / 180; }
  function norm360(d) { d = d % 360; return d < 0 ? d + 360 : d; }

  // 數學角 θ、半徑 ρ → 以原點為中心的螢幕座標
  function pt(theta, rho) {
    return { x: rho * Math.cos(rad(theta)), y: -rho * Math.sin(rad(theta)) };
  }

  // 螢幕點相對中心的數學角
  function angleAt(cx, cy, x, y) {
    return norm360(Math.atan2(cy - y, x - cx) * 180 / Math.PI);
  }

  function arcPath(t1, t2, rho) {
    var a = pt(t1, rho), b = pt(t2, rho);
    var span = t2 - t1;
    var large = Math.abs(span) > 180 ? 1 : 0;
    var sweep = span > 0 ? 0 : 1; // 螢幕上數學逆時針＝sweep 0
    return 'M ' + a.x + ' ' + a.y + ' A ' + rho + ' ' + rho + ' 0 ' + large + ' ' + sweep + ' ' + b.x + ' ' + b.y;
  }

  function wedgePath(t1, t2, rho) {
    var a = pt(t1, rho);
    return 'M 0 0 L ' + a.x + ' ' + a.y + arcPath(t1, t2, rho).replace(/^M [^A]+/, ' ') + ' Z';
  }

  function place(g, cx, cy, rot) {
    g.setAttribute('transform', 'translate(' + cx + ' ' + cy + ') rotate(' + (-(rot || 0)) + ')');
  }

  /* 量角器。opt: { r, style:'L'|'R' } */
  function drawProtractor(parent, opt) {
    var r = opt.r, style = opt.style || 'L';
    var C = root.AngleCore;
    var g = el('g', { 'class': 'protractor', 'data-style': style }, parent);

    el('path', { d: 'M ' + (-r) + ' 0 A ' + r + ' ' + r + ' 0 0 1 ' + r + ' 0 Z', 'class': 'pr-body' }, g);
    el('rect', { x: -r, y: 0, width: 2 * r, height: r * 0.08, 'class': 'pr-body' }, g);

    for (var t = 10; t < 180; t += 10) {
      var g1 = pt(t, r * 0.62), g2 = pt(t, r * 0.18);
      el('line', { x1: g1.x, y1: g1.y, x2: g2.x, y2: g2.y, 'class': 'pr-guide' }, g);
    }
    for (t = 0; t <= 180; t++) {
      var len = t % 10 === 0 ? r * 0.12 : (t % 5 === 0 ? r * 0.08 : r * 0.045);
      var a = pt(t, r), b = pt(t, r - len);
      el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, 'class': t % 10 === 0 ? 'pr-tick10' : 'pr-tick' }, g);
    }
    el('path', { d: arcPath(0, 180, r * 0.18), 'class': 'pr-guide', fill: 'none' }, g);
    el('line', { x1: -r, y1: 0, x2: r, y2: 0, 'class': 'pr-base' }, g);

    var fs = Math.max(10, r * 0.058);
    var labels = { outer: {}, inner: {} };
    for (t = 0; t <= 180; t += 10) {
      labels.outer[t] = label(g, t, r * 0.815, C.ringReading(t, style, 'outer'), 'pr-outer', fs);
      labels.inner[t] = label(g, t, r * 0.68, C.ringReading(t, style, 'inner'), 'pr-inner', fs * 0.9);
    }
    el('circle', { cx: 0, cy: 0, r: 3.5, 'class': 'pr-center' }, g);
    g.labels = labels;
    g.r = r;
    g.style_ = style;
    return g;
  }

  function label(g, t, rho, val, cls, fs) {
    var p = pt(t, rho);
    var txt = el('text', {
      x: p.x, y: p.y, 'class': cls, 'font-size': fs,
      'text-anchor': 'middle', 'dominant-baseline': 'middle',
      transform: 'rotate(' + (90 - t) + ' ' + p.x + ' ' + p.y + ')'
    }, g);
    txt.textContent = val;
    return txt;
  }

  // 標示某圈的 0 與某讀數（亮底）
  function highlightLabel(prot, ring, theta) {
    var t = Math.round(theta / 10) * 10;
    var node = prot.labels[ring][t];
    if (!node) return null;
    var bb = node.getBBox();
    var hl = el('rect', {
      x: bb.x - 3, y: bb.y - 2, width: bb.width + 6, height: bb.height + 4, rx: 4,
      'class': 'pr-lit', transform: node.getAttribute('transform')
    });
    prot.insertBefore(hl, node);
    return hl;
  }

  function ray(parent, cx, cy, theta, len, cls) {
    var p = pt(theta, len);
    return el('line', { x1: cx, y1: cy, x2: cx + p.x, y2: cy + p.y, 'class': cls || 'ray' }, parent);
  }

  function setRay(line, cx, cy, theta, len) {
    var p = pt(theta, len);
    line.setAttribute('x1', cx); line.setAttribute('y1', cy);
    line.setAttribute('x2', cx + p.x); line.setAttribute('y2', cy + p.y);
  }

  function wedge(parent, cx, cy, t1, t2, rho, cls) {
    var w = el('path', { d: wedgePath(t1, t2, rho), 'class': cls || 'wedge', transform: 'translate(' + cx + ' ' + cy + ')' }, parent);
    return w;
  }
  function setWedge(w, t1, t2, rho) { w.setAttribute('d', wedgePath(t1, t2, rho)); }

  /* 鐘面：數字 n 的數學角 */
  function numberAngle(n) { return norm360(90 - n * 30); }

  function drawClock(parent, cx, cy, r) {
    var g = el('g', { 'class': 'clock', transform: 'translate(' + cx + ' ' + cy + ')' }, parent);
    el('circle', { cx: 0, cy: 0, r: r, 'class': 'clock-face' }, g);
    for (var m = 0; m < 60; m++) {
      var th = 90 - m * 6, a = pt(th, r - 6), b = pt(th, r - (m % 5 === 0 ? 20 : 12));
      el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#455a64', 'stroke-width': m % 5 === 0 ? 2.5 : 1 }, g);
    }
    for (var n = 1; n <= 12; n++) {
      var p = pt(numberAngle(n), r * 0.74);
      var tx = el('text', { x: p.x, y: p.y, 'class': 'clock-num' }, g);
      tx.textContent = n;
    }
    el('circle', { cx: 0, cy: 0, r: 6, fill: '#1565c0' }, g);
    return g;
  }

  /* 鐘面上從 from 往 dir 轉 steps 大格的弧（以 g 為原點） */
  function clockArcPath(from, dir, steps, rho) {
    var t1 = numberAngle(from);
    var span = steps * 30 * (dir === 'cw' ? -1 : 1);
    if (Math.abs(span) >= 360) span = span > 0 ? 359.5 : -359.5;
    return arcPath(t1, t1 + span, rho);
  }

  /* 指標座標 → SVG 座標 */
  function svgPoint(svg, evt) {
    var p = svg.createSVGPoint();
    p.x = evt.clientX; p.y = evt.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }

  /* 拖曳（Pointer Events，滑鼠與 iPad 觸控共用） */
  function drag(svg, target, h) {
    var active = false;
    target.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      active = true;
      try { target.setPointerCapture(e.pointerId); } catch (err) { /* 某些瀏覽器不支援 */ }
      if (h.start) h.start(svgPoint(svg, e), e);
    });
    target.addEventListener('pointermove', function (e) {
      if (!active) return;
      e.preventDefault();
      if (h.move) h.move(svgPoint(svg, e), e);
    });
    function end(e) {
      if (!active) return;
      active = false;
      if (h.end) h.end(svgPoint(svg, e), e);
    }
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);
  }

  /* 放大鏡：scene 為要放大的 <g>（須有 id）
   * 長按 board 顯示，放開隱藏 */
  function lens(svg, sceneId, opt) {
    opt = opt || {};
    var zoom = opt.zoom || 3, rad_ = opt.r || 70;
    var defs = svg.querySelector('defs') || el('defs', {}, svg);
    var clipId = sceneId + '-lensclip';
    var clip = el('clipPath', { id: clipId }, defs);
    var cc = el('circle', { cx: 0, cy: 0, r: rad_ }, clip);
    var g = el('g', { 'clip-path': 'url(#' + clipId + ')', visibility: 'hidden', 'pointer-events': 'none' }, svg);
    el('rect', { x: -5000, y: -5000, width: 10000, height: 10000, fill: '#fff' }, g);
    var use = el('use', { href: '#' + sceneId }, g);
    var ring = el('circle', { cx: 0, cy: 0, r: rad_, 'class': 'lens-ring', visibility: 'hidden', 'pointer-events': 'none' }, svg);
    return {
      show: function (x, y) {
        var lx = x, ly = y - rad_ - 20;
        cc.setAttribute('cx', lx); cc.setAttribute('cy', ly);
        use.setAttribute('transform', 'translate(' + lx + ' ' + ly + ') scale(' + zoom + ') translate(' + (-x) + ' ' + (-y) + ')');
        ring.setAttribute('cx', lx); ring.setAttribute('cy', ly);
        g.setAttribute('visibility', 'visible'); ring.setAttribute('visibility', 'visible');
      },
      hide: function () {
        g.setAttribute('visibility', 'hidden'); ring.setAttribute('visibility', 'hidden');
      }
    };
  }

  /* 放大時拖空白處移動畫面
   * - 只在 viewBox 不等於 baseVB（放大中）時作用
   * - 按在把手、圓環、可點的格子上不移動畫面，讓原本的拖曳照常
   * - 移動超過 4px 才算拖曳；拖曳後吃掉那一次 click，避免誤點
   * - 以按下當時的 viewBox 為基準計算，拖曳中改 viewBox 不會累積誤差 */
  function pan(svg, baseVB) {
    var st = null, moved = false;
    var base = baseVB.split(/\s+/).map(Number);
    function vbNow() { return svg.getAttribute('viewBox').split(/\s+/).map(Number); }
    svg.addEventListener('pointerdown', function (e) {
      if (svg.getAttribute('viewBox') === baseVB) return;
      if (e.target.closest && e.target.closest('.handle, .ring-handle, [data-seg], [data-hit], [data-num]')) return;
      var v = vbNow();
      st = { x: e.clientX, y: e.clientY, v: v, k: v[2] / svg.getBoundingClientRect().width };
      moved = false;
      try { svg.setPointerCapture(e.pointerId); } catch (err) { /* 不支援就算了 */ }
    });
    svg.addEventListener('pointermove', function (e) {
      if (!st) return;
      var dx = (e.clientX - st.x) * st.k, dy = (e.clientY - st.y) * st.k;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 4 * st.k) return;
      moved = true;
      e.preventDefault();
      var w = st.v[2], hgt = st.v[3];
      var nx = Math.max(base[0] - w / 2, Math.min(base[0] + base[2] - w / 2, st.v[0] - dx));
      var ny = Math.max(base[1] - hgt / 2, Math.min(base[1] + base[3] - hgt / 2, st.v[1] - dy));
      svg.setAttribute('viewBox', nx + ' ' + ny + ' ' + w + ' ' + hgt);
    });
    function end() { st = null; }
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    svg.addEventListener('click', function (e) {
      if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; }
    }, true);
  }

  root.AP = {
    pan: pan,
    el: el, clear: clear, pt: pt, angleAt: angleAt, norm360: norm360,
    arcPath: arcPath, wedgePath: wedgePath, place: place,
    drawProtractor: drawProtractor, highlightLabel: highlightLabel,
    ray: ray, setRay: setRay, wedge: wedge, setWedge: setWedge,
    numberAngle: numberAngle, drawClock: drawClock, clockArcPath: clockArcPath,
    svgPoint: svgPoint, drag: drag, lens: lens
  };
})(this);
