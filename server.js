const express = require('express');
const { chromium } = require('playwright');

const app = express();

let currentState = 'UNKNOWN';

const URL = 'https://user.cemcity.com/#/';
const STATE_COORDINATE = { x: 445, y: 253 };

const CLICK_SEQUENCE = [
  { x: 600, y: 371 }, { x: 589, y: 318 }, { x: 525, y: 322 },
  { x: 492, y: 319 }, { x: 688, y: 318 }, { x: 644, y: 539 },
  { x: 601, y: 424 }, { x: 553, y: 367 }, { x: 589, y: 461 },
  { x: 744, y: 416 }, { x: 744, y: 416 }, { x: 571, y: 306 },
  { x: 715, y: 356 }, { x: 540, y: 394 }, { x: 543, y: 363 },
  { x: 718, y: 356 }, { x: 647, y: 545 }, { x: 630, y: 521 }
];

async function startBot() {
  try {
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(10000);

    console.log('Starting login...');

    for (const point of CLICK_SEQUENCE) {
      await page.mouse.click(point.x, point.y);
      await page.waitForTimeout(700);
    }

    console.log('Login complete.');

    async function checkState() {
      try {
        const screenshotPath = 'state_check.png';

        await page.screenshot({ path: screenshotPath, fullPage: true });

        const sharp = require('sharp');
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

        console.log('Current State:', currentState);

      } catch (err) {
        console.log(err);
        currentState = 'ERROR';
      }
    }

    await checkState();
    setInterval(checkState, 5000);

  } catch (err) {
    console.error('Bot failed to start:', err);
  }
}

---

/* =======================
   ROUTES
======================= */

// ✅ HOME ROUTE (FIX YOUR "NOT FOUND")
app.get('/', (req, res) => {
  res.send('🚀 CemCity Monitor is running');
});

// API ROUTE
app.get('/state', (req, res) => {
  res.json({ state: currentState });
});

/* =======================
   START SERVER
======================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // start bot AFTER server is ready
  startBot();
});
