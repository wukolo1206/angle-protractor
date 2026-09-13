# handoff — 量角器與角度

## 目前狀態
- v1.0：`index.html`＋`act1`～`act4` 四頁**已部署**
- GitHub：https://github.com/wukolo1206/angle-protractor
- 網址：https://wukolo1206.github.io/angle-protractor/
- 2026-09-13 安裝 GitHub CLI（`C:\Program Files\GitHub CLI\gh.exe`）並登入 wukolo1206，用 `gh repo create` 建 repo、`gh api` 開 Pages
- 已加入 **Vibe Coding 資源庫**（專案統整網頁的試算表 `1bjyBnYAB7CAT7cmoaXnHrDewzjrzgMonzsD4dVDAC-8`，工作表1 第 45 列）：
  名稱「四上U3 角度（量角器與角度）」、大類 學科、小類 數學（四上）、排序 1130（接在 U1＝1110、U2＝1120 之後）
- 設計規格 v1.2：`../docs/superpowers/specs/2026-09-13-u3-angle-design.md`
- 已同步：`../專案總表.md`、`../CLAUDE.md` 子工具一覽、`knowledge-map/data/units.json` 的 `tools`、`../docs/互動教具設計流程.md`（U3 心得）

## 本次驗證
- `python run-tests.py`：核心邏輯 141 項全過；五頁端到端全部通過
- Playwright 煙霧測試四頁截圖：量角器兩款刻度字正向、各關回饋與規格一致，無 JS 錯誤
- `knowledge-map` 的 `check-data-quality.js`、`check-all-completion-gaps.js` 通過

## 下次接續
1. 在 GitHub 網頁建立**空的** repo `angle-protractor`（不要勾 README），之後 `git remote add origin` → `git push -u origin main`
2. repo Settings → Pages → Branch `main` / root，確認 `https://wukolo1206.github.io/angle-protractor/` 可開
3. 部署後更新 `CLAUDE.md` frontmatter 的 `url`、`status`，以及 `../專案總表.md`、`../CLAUDE.md` 的網址
4. **iPad 實機試用**：拖量角器中心容差 3% 是否太嚴、圓環與竹籤拖曳手感

## 注意事項
- 回饋語不可出現「讀內圈／讀外圈」
- 課本做做看① 印p35 只能用三格相減形式
- `knowledge-map` 同日有另一個 session 在改（U1/U2 回寫），動 `units.json` 前先重新讀
- 可拖曳元素不可放在會被 `AP.clear()` 的圖層
