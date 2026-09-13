/* ui.js — 分頁、回饋、關卡、課堂實作卡、過關打勾與獎勵畫面 */
(function (root) {
  'use strict';

  var store = {
    get: function (k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { root.localStorage.setItem(k, v); } catch (e) { /* 預覽或私密模式 */ } },
    remove: function (k) { try { root.localStorage.removeItem(k); } catch (e) { /* 同上 */ } }
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

  /* ---------- 過關獎勵 ---------- */
  var REWARD_PREFIX = 'ap-reward-';
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function fmtTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function rewardTime(pageKey) { return store.get(REWARD_PREFIX + pageKey); }

  /* opt: { title, count, time, onClear } */
  function showReward(opt) {
    var old = $('.reward');
    if (old) old.remove();
    var confetti = h('div', { 'class': 'confetti', 'aria-hidden': 'true' });
    ['🎉', '⭐', '✨', '🎊', '⭐', '🎉', '✨', '⭐', '🎊', '✨', '⭐', '🎉'].forEach(function (m, i) {
      confetti.appendChild(h('span', { text: m, style: 'left:' + (3 + i * 8) + '%;animation-delay:' + (i * 0.18) + 's' }));
    });
    var box = h('div', { 'class': 'reward', role: 'dialog', 'aria-label': '過關獎勵' }, [
      confetti,
      h('div', { 'class': 'reward-card' }, [
        h('div', { 'class': 'reward-trophy', text: '🏆' }),
        h('div', { 'class': 'reward-title', text: opt.title }),
        h('div', { 'class': 'reward-big', text: '練習全部過關！' }),
        h('div', { 'class': 'reward-stars', text: '⭐⭐⭐' }),
        h('div', { 'class': 'reward-meta', text: '共 ' + opt.count + ' 關都答對了　完成時間 ' + fmtTime(opt.time) }),
        h('div', { 'class': 'row', style: 'justify-content:center' }, [
          h('button', { 'class': 'btn primary', 'data-act': 'reward-close', text: '太棒了！關閉', onclick: function () { box.remove(); } }),
          h('button', { 'class': 'btn', 'data-act': 'reward-clear', text: '清除紀錄，重新開始', onclick: function () {
            if (root.confirm('要清除這個活動的過關紀錄嗎？\n（換下一位同學使用這台平板時再按）')) opt.onClear();
          } })
        ])
      ])
    ]);
    document.body.appendChild(box);
    return box;
  }

  /* 關卡：levels = [{ id, label, card?, render(stage, api) }]
   * api.pass()  本關完成：打勾；若本活動所有練習關（不含課堂實作卡）都過了，跳出獎勵畫面
   * 課堂實作卡不列入獎勵條件：網頁無法確認學生真的做了；按「我做完了」仍會打勾 */
  function levels(navBox, stageBox, list, pageKey) {
    var cur = 0;
    var doneKey = 'ap-lv-' + pageKey + '-';
    var h1 = $('header.top h1');
    var title = h1 ? h1.textContent : '';
    var required = list.filter(function (lv) { return !lv.card; });

    function allPassed() {
      return required.every(function (lv) { return store.get(doneKey + lv.id) === 'done'; });
    }
    function openReward() {
      showReward({ title: title, count: required.length, time: rewardTime(pageKey) || new Date().toISOString(), onClear: clearAll });
    }
    function clearAll() {
      list.forEach(function (lv) {
        store.remove(doneKey + lv.id);
        if (lv.card) store.remove(CARD_PREFIX + lv.card.id);
      });
      store.remove(REWARD_PREFIX + pageKey);
      root.location.reload();
    }

    var banner = h('button', { 'class': 'reward-banner', 'data-act': 'reward-banner', hidden: 'hidden', onclick: openReward });
    navBox.parentNode.insertBefore(banner, navBox);
    function updateBanner() {
      var t = rewardTime(pageKey);
      banner.hidden = !t;
      if (t) banner.textContent = '🏆 ' + title + '　練習全部過關（' + fmtTime(t) + '）　點這裡看獎勵畫面';
    }

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
        pass: function () {
          var before = allPassed();
          store.set(doneKey + lv.id, 'done');
          mark(i, 'done');
          if (!before && allPassed()) {
            store.set(REWARD_PREFIX + pageKey, new Date().toISOString());
            updateBanner();
            openReward();
          }
        },
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
    // 功能上線前就已全部過關的，補記完成時間，讓橫幅出現
    if (allPassed() && !rewardTime(pageKey)) store.set(REWARD_PREFIX + pageKey, new Date().toISOString());
    updateBanner();
    go(0);
    return { go: go, current: function () { return cur; } };
  }

  function shuffle(a, rng) {
    rng = rng || Math.random;
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  root.UI = {
    store: store, $: $, $$: $$, h: h, tabs: tabs, say: say,
    card: card, cardState: cardState, laterCount: laterCount,
    levels: levels, shuffle: shuffle, rewardTime: rewardTime, showReward: showReward
  };
})(this);
