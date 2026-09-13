/* ui.js — 分頁、回饋、關卡、課堂實作卡 */
(function (root) {
  'use strict';

  var store = {
    get: function (k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { root.localStorage.setItem(k, v); } catch (e) { /* 預覽或私密模式 */ } }
  };

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function h(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }

  /* 分頁：按鈕 [data-tab=x] 對應 section [data-panel=x] */
  function tabs(onChange) {
    var btns = $$('.tabs button');
    function show(name) {
      btns.forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === name); });
      $$('[data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== name; });
      if (onChange) onChange(name);
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-tab')); }); });
    show(btns[0].getAttribute('data-tab'));
    return show;
  }

  function say(box, text, kind) {
    box.className = 'msg' + (kind ? ' ' + kind : '');
    box.textContent = text || '';
  }

  /* 課堂實作卡 */
  var CARD_PREFIX = 'ap-card-';
  function card(container, opt, onNext) {
    var key = CARD_PREFIX + opt.id;
    var box = h('div', { 'class': 'card-task', 'data-card': opt.id }, [
      h('div', { 'class': 'who', text: '課堂實作卡　' + (opt.src || '') }),
      h('h3', { text: opt.title }),
      h('p', { html: opt.text }),
      h('div', { 'class': 'row' }, [
        h('button', { 'class': 'btn primary', 'data-act': 'done', text: '我做完了', onclick: function () { store.set(key, 'done'); onNext('done'); } }),
        h('button', { 'class': 'btn', 'data-act': 'later', text: '稍後在課堂做', onclick: function () { store.set(key, 'later'); onNext('later'); } })
      ])
    ]);
    container.appendChild(box);
    return box;
  }
  function cardState(id) { return store.get(CARD_PREFIX + id); }
  function laterCount() {
    var n = 0;
    try {
      for (var i = 0; i < root.localStorage.length; i++) {
        var k = root.localStorage.key(i);
        if (k.indexOf(CARD_PREFIX) === 0 && root.localStorage.getItem(k) === 'later') n++;
      }
    } catch (e) { return 0; }
    return n;
  }

  /* 關卡：levels = [{ id, label, card?, render(stage, api) }]
   * api.pass()  本關完成，自動解鎖下一關
   * 課堂實作卡關以 card 屬性描述 */
  function levels(navBox, stageBox, list, pageKey) {
    var cur = 0;
    var doneKey = 'ap-lv-' + pageKey + '-';
    function mark(i, state) {
      var b = navBox.children[i];
      b.classList.remove('done', 'later');
      if (state) b.classList.add(state);
    }
    function go(i) {
      cur = i;
      Array.prototype.forEach.call(navBox.children, function (b, j) { b.classList.toggle('on', j === i); });
      stageBox.innerHTML = '';
      var lv = list[i];
      var api = {
        pass: function () { store.set(doneKey + lv.id, 'done'); mark(i, 'done'); },
        next: function () { if (i + 1 < list.length) go(i + 1); },
        index: i
      };
      if (lv.card) {
        card(stageBox, lv.card, function (state) { mark(i, state); api.next(); });
      } else {
        lv.render(stageBox, api);
      }
    }
    list.forEach(function (lv, i) {
      var b = h('button', { text: lv.label, 'data-level': lv.id, onclick: function () { go(i); } });
      navBox.appendChild(b);
      var st = lv.card ? cardState(lv.card.id) : store.get(doneKey + lv.id);
      if (st) b.classList.add(st);
    });
    go(0);
    return { go: go, current: function () { return cur; } };
  }

  function shuffle(a, rng) {
    rng = rng || Math.random;
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  root.UI = { store: store, $: $, $$: $$, h: h, tabs: tabs, say: say, card: card, cardState: cardState, laterCount: laterCount, levels: levels, shuffle: shuffle };
})(this);
