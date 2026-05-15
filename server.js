const express = require('express');
const { chromium } = require('playwright');
const axios = require('axios');

const app = express();

/* =========================
   PUSH NOTIFICATIONS
========================= */

const PUSHCUT_ON_URL =
  'https://api.pushcut.io/2s-fteOdASSoBDR6YOitm/notifications/Cemcity%20Alert%20-%20ON';

const PUSHCUT_OFF_URL =
  'https://api.pushcut.io/2s-fteOdASSoBDR6YOitm/notifications/Cemcity%20Alert%20-%20OFF';

/* =========================
   STATE TRACKING
========================= */

let currentState = 'UNKNOWN';
let previousState = 'UNKNOWN';

let browserInstance = null;
let intervalHandle = null;
let pageInstance = null;

/* =========================
   CONFIG
========================= */

const URL = 'https://user.cemcity.com/#/';
const STATE_COORDINATE = { x: 445, y: 253 };

/* =========================
   BOT START
========================= */

async function startBot() {
  try {
    console.log('🚀 Starting bot...');

    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    pageInstance = await browserInstance.newPage();

    await pageInstance.goto(URL, { waitUntil: 'domcontentloaded' });

    await pageInstance.waitForTimeout(8000);

    console.log('✅ Page loaded');

    /* =========================
       STATE CHECK (RUN EVERY 1s)
    ========================= */

    async function checkState() {
      try {
        const screenshotPath = 'state.png';

        await pageInstance.screenshot({
          path: screenshotPath,
          fullPage: true
        });

        const sharp = require('sharp');

        const { data, info } = await sharp(screenshotPath)
          .raw()
          .ensureAlpha()
          .toBuffer({ resolveWithObject: true });

        const { x, y } = STATE_COORDINATE;

        const index = (y * info.width + x) * 4;

        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];

        const isOn =
          (r === 255 && g === 255 && b === 255) ||
          (r === 0 && g === 255 && b === 0);

        currentState = isOn ? 'ON' : 'OFF';

        console.log('📡 State:', currentState);

        /* =========================
           OFF → ON EVENT
        ========================= */

        if (currentState === 'ON' && previousState !== 'ON') {
          console.log('📲 OFF → ON detected');

          try {
            await axios.post(PUSHCUT_ON_URL);
            console.log('✅ ON notification sent');
          } catch (err) {
            console.log('❌ ON error:', err.message);
          }
        }

        /* =========================
           ON → OFF EVENT
        ========================= */

        if (currentState === 'OFF' && previousState === 'ON') {
          console.log('📴 ON → OFF detected');

          try {
            await axios.post(PUSHCUT_OFF_URL);
            console.log('✅ OFF notification sent');
          } catch (err) {
            console.log('❌ OFF error:', err.message);
          }
        }

        /* =========================
           UPDATE STATE
        ========================= */

        previousState = currentState;
      } catch (err) {
        console.log('❌ State check error:', err.message);
        currentState = 'ERROR';
      }
    }

    await checkState();

    intervalHandle = setInterval(checkState, 1000);
  } catch (err) {
    console.error('❌ Bot failed:', err.message);
    currentState = 'BOT_ERROR';
  }
}

/* =========================
   API
========================= */

app.get('/state', (req, res) => {
  res.json({
    state: currentState,
    timestamp: new Date().toISOString()
  });
});

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Server running on port ${PORT}`);

  setTimeout(() => {
    startBot().catch(console.error);
  }, 3000);
});

/* =========================
   GRACEFUL SHUTDOWN
========================= */

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down...');

  try {
    if (intervalHandle) clearInterval(intervalHandle);
    if (browserInstance) await browserInstance.close();
  } catch (err) {
    console.log('Shutdown error:', err.message);
  }

  process.exit(0);
});
