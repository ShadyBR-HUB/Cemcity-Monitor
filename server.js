const express = require('express');
const { chromium } = require('playwright');

const app = express();

let currentState = 'UNKNOWN';
let browserInstance = null;
let intervalHandle = null;
let pageInstance = null;

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

    console.log("🚀 Starting bot...");

    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    pageInstance = await browserInstance.newPage();

    await pageInstance.goto(URL, {
      waitUntil: 'domcontentloaded'
    });

    await pageInstance.waitForTimeout(8000);

    console.log('🔐 Starting login sequence...');

    for (const point of CLICK_SEQUENCE) {

      await pageInstance.mouse.click(point.x, point.y);

      await pageInstance.waitForTimeout(600);
    }

    console.log('✅ Login complete.');

    async function checkState() {

      try {

        const screenshotPath = 'state_check.png';

        await pageInstance.screenshot({
          path: screenshotPath,
          fullPage: true
        });

        let sharp;

        try {

          sharp = require('sharp');

        } catch (e) {

          console.log("⚠️ Sharp missing");

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

        console.log('📡 State:', currentState);

      } catch (err) {

        console.log('❌ State check error:', err.message);

        currentState = 'ERROR';
      }
    }

    await checkState();

    intervalHandle = setInterval(checkState, 15000);

  } catch (err) {

    console.error('❌ Bot failed:', err.message);

    currentState = 'BOT_ERROR';
  }
}

/* =========================
   API ROUTES
========================= */

app.get('/', (req, res) => {

  res.send(`
    <h1>🚀 CemCity Monitor Running</h1>

    <p>Current State (KAHRABA DAWLE): <strong>${currentState}</strong></p>

    <p>
      <a href="/screen" target="_blank">
        Open Live Portal Screenshot
      </a>
    </p>

    <img src="/screen" width="100%" />
  `);

});

app.get('/state', (req, res) => {

  res.json({
    state: currentState,
    timestamp: new Date().toISOString()
  });

});

/* =========================
   LIVE SCREENSHOT ROUTE
========================= */

app.get('/screen', async (req, res) => {

  try {

    if (!pageInstance) {

      return res.status(503).send('Page not ready');
    }

    const screenshot = await pageInstance.screenshot({
      type: 'png',
      fullPage: true
    });

    res.set('Content-Type', 'image/png');

    res.send(screenshot);

  } catch (err) {

    console.log('❌ Screenshot route error:', err.message);

    res.status(500).send('Screenshot failed');
  }
});

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {

  console.log(`🌐 Server running on port ${PORT}`);

  setTimeout(() => {

    startBot().catch(console.error);

  }, 4000);

});

/* =========================
   GRACEFUL SHUTDOWN
========================= */

process.on('SIGTERM', async () => {

  console.log('🛑 SIGTERM received, shutting down...');

  try {

    if (intervalHandle) {

      clearInterval(intervalHandle);

      console.log('⏹ Interval cleared');
    }

    if (browserInstance) {

      await browserInstance.close();

      console.log('🧹 Browser closed');
    }

  } catch (err) {

    console.log('Shutdown error:', err.message);
  }

  process.exit(0);
});
