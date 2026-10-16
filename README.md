# 行政日課

普考一般行政考古題練習：選擇題與申論題分開、隨機比例抽題、錯題演練、筆記與錯誤標籤、英文翻譯及備份匯出。

## GitHub Pages 專案網站

建議儲存庫名稱：`admin-exam-practice`。

此儲存庫包含 GitHub Actions 自動發布流程，推送到 `main` 時會測試、建置並發布 GitHub Pages。

若首次發布因尚未啟用 Pages 而失敗：前往 **Settings → Pages → Build and deployment → Source**，選 **GitHub Actions**，再到 Actions 重跑失敗的工作。

`docs/` 同時保留可直接部署的靜態版本；若選擇從分支發布，可使用 **main /docs**。

資源使用相對路徑，可支援專案網站。

## 更新題庫或介面

修改 `data/`、`client.js` 或 `page.html` 後執行：

```sh
node scripts/test.mjs
node scripts/build-pages.mjs
```

將更新後的來源與 `docs/` 一起提交到 GitHub；Pages 會重新發布。

## 學習紀錄

紀錄儲存在目前裝置及網域的瀏覽器中。從原站搬移時，請先在原站匯出完整備份，再到 GitHub Pages 新站匯入。程式碼與題庫不包含個人作答紀錄或筆記。兩個網站的紀錄不會自動同步。
