"""e2e.spec.py —— 五頁端到端測試（規格 §8.2）

執行：python run-tests.py        （自動起 http server）
或：  python -m http.server 8898 --bind 127.0.0.1
      python e2e.spec.py 8898
"""
import sys
import math
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

PORT = sys.argv[1] if len(sys.argv) > 1 else '8898'
BASE = 'http://127.0.0.1:%s/' % PORT

failed = []


def ck(cond, name):
    print(('  PASS ' if cond else '  FAIL ') + name)
    if not cond:
        failed.append(name)


def msg(pg):
    return pg.inner_text('#lvStage .msg')


def to_client(pg, sel, x, y):
    return pg.evaluate('''([sel,x,y])=>{const s=document.querySelector(sel);const p=s.createSVGPoint();
      p.x=x;p.y=y;const q=p.matrixTransform(s.getScreenCTM());return [q.x,q.y];}''', [sel, x, y])


def center_of(pg, sel):
    return pg.evaluate('''(sel)=>{const c=document.querySelector(sel).getBoundingClientRect();
      return [c.x+c.width/2,c.y+c.height/2];}''', sel)


def no_forbidden_words(pg, page):
    txt = pg.inner_text('body')
    ck('讀外圈' not in txt and '讀內圈' not in txt, page + ' 畫面沒有「讀外圈／讀內圈」')


def no_mirror(pg, page):
    n = pg.evaluate('''()=>[...document.querySelectorAll('[transform]')].filter(e=>/scale\\(\\s*-1/.test(e.getAttribute('transform'))).length''')
    ck(n == 0, page + ' 沒有鏡像翻轉 scale(-1)')


def drag(pg, frm, to, steps=8):
    pg.mouse.move(frm[0], frm[1]); pg.mouse.down(); pg.mouse.move(to[0], to[1], steps=steps); pg.mouse.up()


def run(pg):
    # ── index ─────────────────────────────
    print('== index.html')
    pg.goto(BASE + 'index.html'); pg.wait_for_load_state('networkidle')
    links = pg.eval_on_selector_all('a.card', 'e=>e.map(x=>x.getAttribute("href"))')
    ck(links == ['act1.html', 'act2.html', 'act3.html', 'act4.html'], '四張卡片連結正確')
    ck(not pg.is_visible('#later'), '一開始沒有待做實作卡')

    # ── act1 ──────────────────────────────
    print('== act1.html')
    pg.goto(BASE + 'act1.html'); pg.wait_for_load_state('networkidle')
    ck(pg.evaluate('typeof AngleCore') == 'object', 'core 模組已載入')
    no_mirror(pg, 'act1')
    pg.click('button[data-ex=e4]'); pg.click('button[data-act=style]')
    no_mirror(pg, 'act1 R 款')
    pg.click('button[data-tab=practice]')
    pg.click('button[data-level=l6]')
    pg.fill('#lvStage input[data-f=ans]', '40'); pg.click('#lvStage [data-act=check]')
    ck('比直角（90°）大還是小' in msg(pg), '問6 答 40 → 回饋問「比直角（90°）大還是小」')
    no_forbidden_words(pg, 'act1 練習')
    pg.fill('#lvStage input[data-f=ans]', '140'); pg.click('#lvStage [data-act=check]')
    ck('答對了' in msg(pg), '問6 答 140 → 答對')

    pg.click('button[data-level=l7]')
    ck(pg.is_disabled('#lvStage input[data-f=ans]'), '問7 未點大格前不能填度數')
    pg.locator('#lvStage [data-seg="3"]').dispatch_event('click')
    ck('開始點' in msg(pg), '問7 從中間開始點 → 被擋下')
    for k in range(6):
        pg.locator('#lvStage [data-seg="%d"]' % k).dispatch_event('click')
    ck(pg.is_disabled('#lvStage input[data-f=ans]'), '問7 點了 6/7 格仍不能填')
    pg.locator('#lvStage [data-seg="6"]').dispatch_event('click')
    ck(not pg.is_disabled('#lvStage input[data-f=ans]'), '問7 點完 7 格才能填')
    pg.fill('#lvStage input[data-f=ans]', '120'); pg.click('#lvStage [data-act=check]')
    ck('其中一條邊' in msg(pg), '問7 答 120 → 只讀一邊')

    pg.click('button[data-level=l8]')
    pg.fill('#lvStage input[data-f=big]', '135'); pg.fill('#lvStage input[data-f=small]', '70'); pg.fill('#lvStage input[data-f=diff]', '55')
    pg.click('#lvStage [data-act=check]')
    cls = pg.evaluate('''()=>['big','small','diff'].map(f=>document.querySelector('#lvStage input[data-f='+f+']').className)''')
    ck('okf' in cls[0] and 'okf' in cls[1] and 'badf' in cls[2], '做做看① 135－70＝55 → 刻度兩格對、差格錯')
    ck('再算一次相減' in msg(pg), '做做看① 回饋「再算一次相減」')

    # ── act2 ──────────────────────────────
    print('== act2.html')
    pg.goto(BASE + 'act2.html'); pg.wait_for_load_state('networkidle')
    no_mirror(pg, 'act2')
    pg.click('button[data-tab=practice]'); pg.click('button[data-level=l2]')
    ck(pg.is_disabled('#lvStage input[data-f=ans]'), '自己量：擺好前讀數格停用')
    ring_r = pg.evaluate('''()=>{const d=document.querySelector('#lvStage .ring-handle').getAttribute('d');return +d.split(' A ')[1].split(' ')[0];}''')
    ck(ring_r > 190, '旋轉圓環在量角器弧外（半徑 %s > 190）' % ring_r)
    vx = pg.evaluate('''()=>{const v=[...document.querySelectorAll('#lvStage svg circle')].find(e=>e.getAttribute('fill')==='#1e88e5');return [+v.getAttribute('cx'),+v.getAttribute('cy')];}''')
    pc = center_of(pg, '#lvStage .pr-center'); vc = center_of(pg, '#lvStage svg circle[fill="#1e88e5"]')
    drag(pg, (pc[0], pc[1] - 60), (vc[0] + 3, vc[1] - 60))
    pg.wait_for_timeout(500)
    tr = pg.evaluate("document.querySelector('#lvStage .protractor').getAttribute('transform')")
    cx, cy = [float(x) for x in tr.split('(')[1].split(')')[0].split()]
    ck(abs(cx - vx[0]) < 0.5 and abs(cy - vx[1]) < 0.5, '中心進容差帶後吸附到頂點')
    ck('中心點對好了' in msg(pg), '吸附後顯示「中心點對好了」')
    ck(pg.is_disabled('#lvStage input[data-f=ans]'), '0 線未對齊前讀數格仍停用')
    ok = False
    for i in range(361):
        if '0 線壓在邊上了' in msg(pg):
            ok = True; break
        pg.click('#lvStage [data-act=rotL]')
    ck(ok and not pg.is_disabled('#lvStage input[data-f=ans]'), '0 線對齊後讀數格解鎖')

    pg.click('button[data-level=l3]')
    pc = center_of(pg, '#lvStage .pr-center'); vc = center_of(pg, '#lvStage svg circle[fill="#1e88e5"]')
    drag(pg, (pc[0], pc[1] - 60), (vc[0], vc[1] - 60)); pg.wait_for_timeout(500)
    short_seen = False
    for i in range(361):
        t = msg(pg)
        if '邊太短' in t:
            short_seen = True; break
        if '0 線壓在邊上了' in t:
            break
        pg.click('#lvStage [data-act=rotL]')
    ck(short_seen and pg.is_disabled('#lvStage input[data-f=ans]'), '邊太短：0 線對好了但邊沒延長 → 讀數格停用')
    handles = pg.evaluate('''()=>[...document.querySelectorAll('#lvStage svg > circle.handle')].map(c=>[+c.getAttribute('cx'),+c.getAttribute('cy')])''')
    V = vx = pg.evaluate('''()=>{const v=[...document.querySelectorAll('#lvStage svg circle')].find(e=>e.getAttribute('fill')==='#1e88e5');return [+v.getAttribute('cx'),+v.getAttribute('cy')];}''')
    for hx, hy in handles:
        dx, dy = hx - V[0], hy - V[1]; n = math.hypot(dx, dy)
        frm = to_client(pg, '#lvStage svg', hx, hy)
        to = to_client(pg, '#lvStage svg', V[0] + dx / n * 280, V[1] + dy / n * 280)
        drag(pg, frm, to)
    ck(not pg.is_disabled('#lvStage input[data-f=ans]'), '邊太短：延長後讀數格解鎖')

    pg.click('button[data-level=c3]')
    ck(pg.is_visible('#lvStage [data-card="act2-q3"]'), '附件7 顯示課堂實作卡')
    ck(pg.evaluate("document.querySelector('#lvNav button.on').dataset.level") == 'c3', '實作卡未按鈕前停在該關')
    pg.click('#lvStage [data-act=later]')
    ck(pg.evaluate("document.querySelector('#lvNav button.on').dataset.level") == 'l4', '按「稍後在課堂做」後進下一關')

    pg.click('button[data-level=l4]')
    ck(not pg.is_visible('#lvStage [data-reason]'), '量法對嗎：選「不正確」之前不顯示原因按鈕（hidden 不可被 .row 蓋掉）')

    pg.click('button[data-level=l5]')
    pt = to_client(pg, '#lvStage svg', 320 + 230 * math.cos(math.radians(115)), 400 - 230 * math.sin(math.radians(115)))
    pg.mouse.click(pt[0], pt[1])
    ck('比直角大還是小' in msg(pg), '畫 65° 點在 115 → 讀錯圈回饋')

    pg.goto(BASE + 'index.html'); pg.wait_for_load_state('networkidle')
    ck(pg.is_visible('#later') and '1 張' in pg.inner_text('#later'), '首頁顯示 1 張待做實作卡')

    # ── act3 ──────────────────────────────
    print('== act3.html')
    pg.goto(BASE + 'act3.html'); pg.wait_for_load_state('networkidle')
    pg.click('button[data-tab=practice]'); pg.click('button[data-level=l2]')

    def clock(s, d):
        pg.fill('#lvStage input[data-f=steps]', str(s)); pg.fill('#lvStage input[data-f=deg]', str(d))
        pg.click('#lvStage [data-act=check]')
        return msg(pg)
    ck('答對了' in clock(3, 90), '12 順→3 答 3 格 90°')
    pg.click('#lvStage [data-act=next]'); clock(6, 180); pg.click('#lvStage [data-act=next]'); clock(8, 240); pg.click('#lvStage [data-act=next]')
    ck('一整圈' in clock(0, 0), '12 順→12 答 0 格 → 回饋「一整圈」')

    pg.click('button[data-level=l3]'); pg.click('#lvStage [data-act=check]')
    clock(7, 210); pg.click('#lvStage [data-act=next]'); clock(4, 120); pg.click('#lvStage [data-act=next]')
    ck('另一邊' in clock(4, 120), '9 逆→1 答 4 格 → 回饋「數的是另一邊」')

    pg.click('button[data-level=l5]'); pg.click('#lvStage [data-dir=cw]')
    ck('看箭頭' in clock(4, 120), '練習百分百 2 逆→10 選順時針 → 回饋「看箭頭」')

    pg.click('button[data-level=l6]')
    pg.fill('#lvStage input[data-f=ans]', '80'); pg.click('#lvStage [data-act=check]')
    before = msg(pg)
    hc = center_of(pg, '#lvStage circle.handle')
    tgt = to_client(pg, '#lvStage svg', 320 + 300 * math.cos(math.radians(100)), 420 - 300 * math.sin(math.radians(100)))
    pg.mouse.move(hc[0], hc[1]); pg.mouse.down(); pg.mouse.move(tgt[0], tgt[1], steps=10)
    ck(msg(pg) == before, '拖動竹籤途中畫面不出現讀數')
    pg.mouse.up(); pg.wait_for_timeout(150)
    ck('停在 80 度' in msg(pg), '竹籤拖到 80 → 驗證通過')

    pg.click('button[data-level=l8]')
    pg.fill('#lvStage input[data-f=ans]', '77'); pg.click('#lvStage [data-act=check]')
    hc = center_of(pg, '#lvStage circle.handle')
    tgt = to_client(pg, '#lvStage svg', 320 + 300 * math.cos(math.radians(77)), 420 - 300 * math.sin(math.radians(77)))
    drag(pg, hc, tgt, 10); pg.wait_for_timeout(150)
    pg.fill('#lvStage input[data-f=ans]', '12'); pg.click('#lvStage [data-act=check]')
    t = msg(pg)
    ck('內圈' in t and '逆時針' in t and '變大還是變小' in t, '習作 p41③ 第二步答反方向 → 回饋依參數組字（內圈、逆時針）')

    pg.click('button[data-tab=challenge]')
    pg.fill('[data-q="113-9"] input', '15'); pg.click('[data-q="113-9"] .row button')
    ck('5 分鐘是一大格' in pg.inner_text('[data-q="113-9"] .msg'), '113-9 把 15 分當 15 格 → 回饋時間換算，不當角度錯')
    no_forbidden_words(pg, 'act3')

    # ── act4 ──────────────────────────────
    print('== act4.html')
    pg.goto(BASE + 'act4.html'); pg.wait_for_load_state('networkidle')
    before = pg.inner_text('#exMsg')
    hc = center_of(pg, '#exSvg circle.handle')
    tgt = to_client(pg, '#exSvg', 320 + 140 * math.cos(math.radians(75)), 360 - 140 * math.sin(math.radians(75)))
    drag(pg, hc, tgt)
    after = pg.inner_text('#exMsg')
    ck(after != before and '45°＋60°＝105°' in after, '拖動三角板，算式即時更新')
    pg.click('button[data-tab=practice]')
    pg.click('button[data-level="p45-2"]')
    ck(not pg.is_visible('#lvStage [data-total="180"]'), '問2：選「從大角拿掉」之前不顯示總量選項')
    pg.click('#lvStage [data-op=sub]')
    ck(pg.is_visible('#lvStage [data-total="180"]'), '問2：選「從大角拿掉」之後才顯示總量選項')

    def compose(level, op, total, v):
        pg.click('button[data-level="%s"]' % level)
        pg.click('#lvStage [data-op=%s]' % op)
        if total:
            pg.click('#lvStage [data-total="%d"]' % total)
        pg.fill('#lvStage input[data-f=ans]', str(v)); pg.click('#lvStage [data-act=check]')
        return msg(pg)
    ck('合起來的大角' in compose('p46-1', 'sub', None, 17), '練習百分百③① 選「拿掉」→ WRONG_OP')
    ck('97°' in compose('p46-1', 'add', None, 97), '練習百分百③① 40＋57＝97')
    ck('另一個角' in compose('p46-2', 'sub', 180, 125), '練習百分百③② 答 125 → 漏扣一個角')
    ck('直線' in compose('p45-2', 'sub', 90, 60), '問2 選直角 → WRONG_TOTAL')

    # ── 過關打勾與獎勵畫面（用活動四：10 關、答案都是課本標準答案） ──
    print('== 過關打勾與獎勵')
    answers = [('p44-1', 'add', None, 105), ('p44-2', 'sub', None, 15), ('p44-d1', 'add', None, 133),
               ('p44-d2', 'sub', None, 50), ('p45-2', 'sub', 180, 60), ('p45-3', 'sub', 90, 56),
               ('p45-d1', 'sub', 180, 105), ('p45-d2', 'sub', 90, 20), ('p46-1', 'add', None, 97),
               ('p46-2', 'sub', 180, 70)]
    ck(not pg.is_visible('[data-act=reward-banner]'), '還沒全部過關時沒有過關橫幅')
    for lv, op, total, v in answers[:-1]:
        compose(lv, op, total, v)
    ck(not pg.is_visible('.reward'), '還差一關時沒有獎勵畫面')
    ck(pg.eval_on_selector_all('#lvNav button.done', 'e=>e.length') == 9, '答對的 9 關都打勾')
    chip = pg.evaluate('''()=>getComputedStyle(document.querySelector('#lvNav button.done'),'::before').content''')
    ck('✓' in chip, '打勾符號顯示在關卡按鈕上')
    compose(*answers[-1])
    rw = pg.inner_text('.reward') if pg.is_visible('.reward') else ''
    ck('全部過關' in rw and '活動四' in rw and '10 關' in rw, '10 關全對 → 出現活動四獎勵畫面（含關數與完成時間）')
    pg.click('[data-act=reward-close]')
    ck(not pg.is_visible('.reward') and pg.is_visible('[data-act=reward-banner]'), '關閉獎勵後上方保留「全部過關」橫幅')
    pg.click('[data-act=reward-banner]')
    ck(pg.is_visible('.reward'), '點橫幅可再打開獎勵畫面')
    pg.click('[data-act=reward-close]')
    pg.reload(); pg.wait_for_load_state('networkidle'); pg.click('button[data-tab=practice]')
    ck(pg.eval_on_selector_all('#lvNav button.done', 'e=>e.length') == 10 and pg.is_visible('[data-act=reward-banner]'),
       '重新整理後打勾與過關橫幅都還在')
    pg.goto(BASE + 'index.html'); pg.wait_for_load_state('networkidle')
    ck(pg.is_visible('a.card[href="act4.html"] .trophy'), '首頁活動四卡片顯示 🏆')
    ck(not pg.is_visible('a.card[href="act1.html"] .trophy'), '首頁活動一沒有 🏆（尚未全部過關）')

    # ── 隨時清除本活動紀錄 ──
    print('== 清除紀錄')
    pg.goto(BASE + 'act4.html'); pg.wait_for_load_state('networkidle'); pg.click('button[data-tab=practice]')
    ck(pg.is_visible('[data-act=clear-progress]'), '練習分頁上方有「清除這個活動的紀錄」按鈕')
    pg.once('dialog', lambda d: d.dismiss())
    pg.click('[data-act=clear-progress]'); pg.wait_for_timeout(300)
    ck(pg.eval_on_selector_all('#lvNav button.done', 'e=>e.length') == 10, '按「取消」→ 紀錄不變')
    pg.once('dialog', lambda d: d.accept())
    pg.click('[data-act=clear-progress]'); pg.wait_for_load_state('networkidle'); pg.wait_for_timeout(300)
    pg.click('button[data-tab=practice]')
    ck(pg.eval_on_selector_all('#lvNav button.done', 'e=>e.length') == 0 and not pg.is_visible('[data-act=reward-banner]'),
       '按「確定」→ 打勾與過關橫幅都清掉')
    pg.goto(BASE + 'index.html'); pg.wait_for_load_state('networkidle')
    ck(not pg.is_visible('a.card[href="act4.html"] .trophy'), '清除後首頁活動四不再顯示 🏆')


def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 1100, 'height': 900})
        pg = ctx.new_page()
        errs = []
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        try:
            run(pg)
        finally:
            ck(not errs, '整個流程沒有 JS 錯誤' + ('' if not errs else '：' + '；'.join(errs[:3])))
            b.close()
    print()
    print('端到端：%s' % ('全部通過' if not failed else '失敗 %d 項' % len(failed)))
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
