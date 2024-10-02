// index.js

require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 從 .env 讀取 BOT_TOKEN 和 CHANNEL_ID
const { BOT_TOKEN, CHANNEL_ID } = process.env;

if (!BOT_TOKEN || !CHANNEL_ID) {
    console.error('請在 .env 檔案中設置 BOT_TOKEN 和 CHANNEL_ID');
    process.exit(1);
}

// 建立 Discord 客戶端
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// 設定儲存最後的 IP 地址的檔案路徑
const lastIPFile = path.join(__dirname, 'last_ip.txt');

// 初始化最後的 IP 地址
let lastIP = null;

// 讀取最後的 IP 地址（如果存在）
if (fs.existsSync(lastIPFile)) {
    lastIP = fs.readFileSync(lastIPFile, 'utf8').trim();
    log(`載入最後的 IP 地址：${lastIP}`);
}

/**
 * 取得格式化後的時間戳 [yyyy/mm/dd hh:mm]
 * @returns {string} 格式化的時間戳
 */
function getFormattedTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `[${year}/${month}/${day} ${hours}:${minutes}]`;
}

/**
 * 包裝 console.log，並在訊息前加上時間戳
 * @param {string} message - 要輸出的訊息
 */
function log(message) {
    console.log(`${getFormattedTimestamp()} ${message}`);
}

// 當 Bot 準備就緒時觸發
client.once('ready', () => {
    log(`已登入為 ${client.user.tag}!`);
    checkAndSendIP();
    setInterval(checkAndSendIP, 5 * 60 * 1000); // 每五分鐘檢查一次
});

/**
 * 檢查 IP 是否變更，若變更則發送新 IP 到指定 Discord 頻道
 */
async function checkAndSendIP() {
    try {
        const response = await axios.get('https://api.ipify.org?format=json');
        const currentIP = response.data.ip;

        if (currentIP === lastIP) {
            log(`IP 地址未變更：${currentIP}`);
            return;
        }

        const channel = await client.channels.fetch(CHANNEL_ID);
        if (!channel || !channel.isTextBased()) {
            log('無法找到指定的文字頻道。');
            return;
        }

        await channel.send(`:information_source: 伺服器目前IP為 \`${currentIP}\``);
        log(`已發送新的 IP 地址到頻道 ${CHANNEL_ID}: ${currentIP}`);

        lastIP = currentIP;
        fs.writeFileSync(lastIPFile, lastIP, 'utf8');
    } catch (error) {
        log(`取得 IP 地址時發生錯誤：${error}`);
    }
}

// 處理訊息事件（可選）
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content === '!getip') {
        await checkAndSendIP();
    }
});

// 登入 Discord
client.login(BOT_TOKEN);
