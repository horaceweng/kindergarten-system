部署說明（systemd + nginx 範例，將後端設定在 port 3002）

下面是一套可直接在 Ubuntu 伺服器執行的步驟，假設你的專案放在 /var/www/kindergarten：

準備（只需執行一次）
1. 確認你已把程式碼放到 /var/www/kindergarten，或修改路徑為實際路徑。
2. 確認 node.js 與 npm 已安裝（建議 Node 18+）。
3. 確認後端已 build (`npm run build`)，dist 目錄存在。
4. 確認 `backend/.env` 中的 `PORT=3002` 與 `DATABASE_URL` 設定正確，且檔案可以被 systemd 指定的 User 讀取（或複製環境至 /etc/default）

步驟 A - 建立 systemd service
------------------------------
以下命令示範如何把 example service 放到 systemd 目錄並啟動：

# 以 sudo 執行
sudo cp deploy/kindergarten-backend.service.example /etc/systemd/system/kindergarten-backend.service

# 檢查 service 檔案（視需要修改 User/Group/WorkingDirectory/EnvironmentFile 路徑）
sudo nano /etc/systemd/system/kindergarten-backend.service

# 重新載入 systemd daemon
sudo systemctl daemon-reload

# 啟用並啟動服務
sudo systemctl enable kindergarten-backend.service
sudo systemctl start kindergarten-backend.service

# 檢查狀態與日誌
sudo systemctl status kindergarten-backend.service
sudo journalctl -u kindergarten-backend.service -f

步驟 B - nginx 設定
-------------------
將 nginx 範本複製到 sites-available 並啟用：

sudo cp deploy/nginx-kindergarten.conf.example /etc/nginx/sites-available/kindergarten
# 編輯配置，把 server_name、root 路徑、以及 proxy_pass 目標調整為 127.0.0.1:3002
sudo nano /etc/nginx/sites-available/kindergarten

# 啟用站台
sudo ln -s /etc/nginx/sites-available/kindergarten /etc/nginx/sites-enabled/kindergarten

# 測試 nginx 配置
sudo nginx -t

# 重新載入 nginx
sudo systemctl reload nginx

# 檢查 nginx 日誌（如有錯誤）
sudo tail -n 200 /var/log/nginx/error.log

步驟 C - 前端部署
-----------------
1. 在 frontend 下 build：

cd frontend
VITE_API_BASE_URL='/api' npm run build

2. 將 build artifact 複製到 nginx root（預設上面範例為 /var/www/kindergarten/html）：

sudo mkdir -p /var/www/kindergarten/html
sudo rm -rf /var/www/kindergarten/html/*
sudo cp -r frontend/dist/* /var/www/kindergarten/html/
sudo chown -R www-data:www-data /var/www/kindergarten/html

步驟 D - 防火牆與 SSL（可選）
---------------------------
允許 HTTP/HTTPS 與取得 Let's Encrypt：

sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo apt update && sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d kindergarten.example.com

注意事項
- 如果 systemd 使用的 User 不是 root，請確保該 User 有讀取 `backend/.env` 的權限，或把必要的環境變數放到 `/etc/environment` 或 systemd 的 EnvironmentFile（絕對路徑）。
- 如果要使用 pm2 而不是 systemd，pm2 可以接收 env 檔，但仍然建議建立 pm2 ecosystem 檔。

若要我幫你把 `kindergarten-backend.service.example` 轉成符合你伺服器路徑與 user 的最終 service 檔，我可以直接改檔並產生你可貼上到伺服器的完整內容。
