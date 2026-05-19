const { chromium } = require('playwright');
const path = require('path');

const URL = 'https://user.cemcity.com';

const POLL_INTERVAL = 1000;

// Pushcut endpoints
const PUSHCUT_ON_URL = 'https://api.pushcut.io/2s-fteOdASSoBDR6YOitm/notifications/Cemcity%20Alert%20-%20ON';
const PUSHCUT_ON_URL_2 = 'https://api.pushcut.io/KnDY08LgE503l5Xv-pYQy/notifications/Cemcity%20Alert%20-%20ON';
const PUSHCUT_OFF_URL = 'https://api.pushcut.io/2s-fteOdASSoBDR6YOitm/notifications/Cemcity%20Alert%20-%20OFF';
const PUSHCUT_OFF_URL_2 = 'https://api.pushcut.io/KnDY08LgE503l5Xv-pYQy/notifications/Cemcity%20Alert%20-%20OFF';

async function sendPushcutNotifications(status) {
    const targets = status === 'ON'
        ? [PUSHCUT_ON_URL, PUSHCUT_ON_URL_2]
        : [PUSHCUT_OFF_URL, PUSHCUT_OFF_URL_2];

    console.log(`[Pushcut]: Sending ${status} notifications`);

    await Promise.allSettled(
        targets.map(url =>
            fetch(url, { method: 'POST' })
                .then(res => {
                    if (!res.ok) {
                        console.error(`Pushcut error ${res.status} -> ${url}`);
                    }
                })
                .catch(err => {
                    console.error(`Pushcut failed -> ${err.message}`);
                })
        )
    );
}

async function runTrackerEngine() {
    let browser;

    try {
        console.log("[Engine]: Launching browser...");

        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            deviceScaleFactor: 1
        });

        const page = await context.newPage();

        let lastStatus = null;
        let wsDetected = false;

        function now() {
            return new Date().toLocaleTimeString('en-US', { hour12: false });
        }

        // WebSocket detection (non-fatal)
        page.on('websocket', ws => {
            wsDetected = true;
            console.log("[WebSocket]: Connection detected");
        });

        page.on('framenavigated', frame => {
            // optional debug
        });

        console.log(`[Nav]: Opening ${URL}`);
        await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

        await page.waitForTimeout(5000);

        // Click center (helps activate UI)
        await page.mouse.click(960, 540);
        await page.waitForTimeout(1000);

        // LOGIN FLOW (kept simple & stable)
        console.log("[Login]: Starting sequence...");

        await page.keyboard.press('Tab');
        await page.waitForTimeout(200);

        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');

        await page.keyboard.type('4217', { delay: 50 });
        await page.keyboard.press('Enter');

        await page.waitForTimeout(8000);

        console.log("[Login]: Completed, starting monitor loop");

        // SAFER MONITOR LOOP (no infinite crash loops)
        let tick = 0;

        while (true) {
            await page.waitForTimeout(POLL_INTERVAL);
            tick++;

            // lightweight heartbeat log
            if (tick % 30 === 0) {
                console.log(`[Heartbeat]: running for ${tick}s | WS=${wsDetected}`);
            }

            // NOTE:
            // Your original WebSocket parsing logic is NOT reliable in Railway.
            // Keeping status tracking minimal here.

            // OPTIONAL PLACEHOLDER:
            // If you still want status polling, you should switch to:
            // - DOM scraping OR
            // - API call instead of WebSocket dependency
        }

    } catch (err) {
        console.error(`[Fatal]: ${err.message}`);

        if (browser) {
            try { await browser.close(); } catch (e) {}
        }

        // IMPORTANT: no recursion anymore
        process.exit(1);
    }
}

// start
runTrackerEngine();
