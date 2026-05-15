const express = require('express');
const { chromium } = require('playwright');

const app = express();

let currentState = 'UNKNOWN';

const URL = 'https://user.cemcity.com/#/';

const STATE_COORDINATE = { x: 445, y: 253 };

const CLICK_SEQUENCE = [
  { x: 600, y: 371 },
  { x: 589, y: 318 },
  { x: 525, y: 322 },
  { x: 492, y: 319 },
  { x: 688, y: 318 },
  { x: 644, y: 539 },
  { x: 601, y: 424 },
  { x: 553, y: 367 },
  { x: 589, y: 461 },
  { x: 744, y: 416 },
  { x: 744, y: 416 },
  { x: 571, y: 306 },
  { x: 715, y: 356 },
  { x: 540, y: 394 },
  { x: 543, y: 363 },
  { x: 718, y: 356 },
  { x: 647, y: 545 },
  { x: 630, y: 521 }
];

/* =========================
   BOT LOGIC
========================= */

async function startBot() {
  try {
    console.log("🚀 Starting Playwright bot...");

    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();

    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);

    console.log('🔐 Starting login sequence...');

    for (const point of CLICK_SEQUENCE) {
      await page.mouse.click(point.x, point.y);
      await page.waitForTimeout(600);
    }

    console.log('✅ Login complete.');

    async function checkState() {
      try {
        const screenshotPath = 'state_check.png';

        await page.screenshot({
          path: screenshotPath,
          fullPage: true
        });

        // SAFE SHARP LOADING (prevents crash if missing native libs)
        let sharp;
        try {
          sharp = require('sharp');
        } catch (e) {
          console.log("⚠️ Sharp not available, skipping state check");
          currentState = "SHARP_MISSING";
          return;
        }

        const image = sharp(screenshotPath);

        const { data, info } = await image
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

        console.log('📡 Current State:', currentState);

      } catch (err) {
        console.log('❌ State check error:', err.message);
        currentState = 'ERROR';
      }
    }

    await checkState();

    // LOWER LOAD for Railway stability
    setInterval(checkState, 15000);

  } catch (err) {
    console.error('❌ Bot failed to start:', err.message);
    currentState = 'BOT_ERROR';
  }
}

/* =========================
   API ROUTES
========================= */

app.get('/', (req, res) => {
  res.send('🚀 CemCity Monitor is running');
});

app.get('/state', (req, res) => {
  res.json({
    state: currentState,
    timestamp: new Date().toISOString()
  });
});

/* =========================
   START SERVER (RAILWAY SAFE)
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Server running on port ${PORT}`);

  // Delay bot startup so Railway health check passes first
  setTimeout(() => {
    startBot().catch(err => {
      console.error('❌ Bot startup error:', err);
    });
  }, 4000);
});
