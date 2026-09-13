# handoff — 量角器與角度

## 目前狀態
- v1.0：`index.html`＋`act1`～`act4` 四頁完成，本機測試中
- 尚未建 GitHub repo、尚未部署 Pages
- 設計規格 v1.2：`../docs/superpowers/specs/2026-09-13-u3-angle-design.md`

## 本次驗證
- `node angle-core.test.js`：141 項全過（課本／習作／教冊標準答案＋窮舉斷言）
- Playwright 手動煙霧測試四頁：各關回饋與規格一致，無 JS 錯誤
- `e2e.spec.py` 永久測試已寫，尚待 `python run-tests.py` 全跑

## 下次接續
1. `python run-tests.py` 全過後 commit
2. 建 GitHub repo `angle-protractor`、開 Pages、push（使用者已同意 repo 名）
3. 更新 `../專案總表.md`、`../CLAUDE.md` 子工具一覽、`knowledge-map/data/units.json` 的 `tools`
4. **iPad 實機試用**：拖量角器中心容差 3% 是否太嚴、圓環與竹籤拖曳手感

## 注意事項
- 回饋語不可出現「讀內圈／讀外圈」
- 課本做做看① 印p35 只能用三格相減形式
- `knowledge-map` 同日有另一個 session 在改（U1/U2 回寫），動 `units.json` 前先重新讀
- 可拖曳元素不可放在會被 `AP.clear()` 的圖層
