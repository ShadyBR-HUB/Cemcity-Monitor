const { chromium } = require('playwright');
const path = require('path');

const URL = 'https://user.cemcity.com'; 
const STEP_DELAY = 50;           
const BLOCK_DELAY = 200;         
const AFTER_ENTER_DELAY = 200;   
const POLL_INTERVAL = 1000;      

// --- PUSHCUT API ENDPOINTS ---
const PUSHCUT_ON_URL = 'https://api.pushcut.io/2s-fteOdASSoBDR6YOitm/notifications/Cemcity%20Alert%20-%20ON';
const PUSHCUT_ON_URL_2 = 'https://api.pushcut.io/KnDY08LgE503l5Xv-pYQy/notifications/Cemcity%20Alert%20-%20ON';
const PUSHCUT_OFF_URL = 'https://api.pushcut.io/2s-fteOdASSoBDR6YOitm/notifications/Cemcity%20Alert%20-%20OFF';
const PUSHCUT_OFF_URL_2 = 'https://api.pushcut.io/KnDY08LgE503l5Xv-pYQy/notifications/Cemcity%20Alert%20-%20OFF';

async function sendPushcutNotifications(status) {
    const targets = status === 'ON' 
        ? [PUSHCUT_ON_URL, PUSHCUT_ON_URL_2] 
        : [PUSHCUT_OFF_URL, PUSHCUT_OFF_URL_2];

    console.log(`[Notification Engine]: Status shifted to ${status}. Dispatching webhook signals...`);
    
    Promise.all(
        targets.map(url => 
            fetch(url, { method: 'POST' })
                .then(res => {
                    if (!res.ok) console.error(`Pushcut error response (${res.status}) from: ${url}`);
                })
                .catch(err => console.error(`Failed to connect to Pushcut: ${err.message}`))
        )
    );
}

// Core execution block wrapped inside a named function to allow recursive re-runs
async function runTrackerEngine() {
    let browser;
    let isWebSocketActive = false; // Watchdog tracker flag

    try {
        console.log("\n[Engine Initialization]: Launching background headless browser...");
        
        // FIX: Removed channel: 'chrome' so it works natively on Linux containers
        browser = await chromium.launch({
            headless: true, 
            args: [
                '--disable-blink-features=AutomationControlled', 
                '--no-sandbox',
                '--disable-gpu',
                '--touch-events=disabled',
                '--disable-touch-drag-drop',
                '--disable-features=TouchpadAndWheelScrollLatching',
                '--window-size=1920,1080', 
                '--force-device-scale-factor=1' 
            ]
        });

        const context = await browser.newContext({ 
            viewport: { width: 1920, height: 1080 },
            deviceScaleFactor: 1,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            hasTouch: false,
            isMobile: false,
            ignoreHTTPSErrors: true 
        });
        
        const page = await context.newPage();
        let lastLoggedStatus = null;

        function now() {
            return new Date().toLocaleTimeString('en-US', { hour12: false });
        }

        // --- NATIVE WEBSOCKET INTERCEPTOR ---
        page.on('websocket', (ws) => {
            console.log(`[WebSocket Connected]: Tracking device streams...`);
            isWebSocketActive = true; // Set flag to true when connection is verified
            
            ws.on('framereceived', (frame) => {
                try {
                    const payloadStr = frame.payload.toString().trim();
                    if (!payloadStr.startsWith('{')) return;
                    
                    const packet = JSON.parse(payloadStr);

                    if (packet.amcb_list && Array.isArray(packet.amcb_list)) {
                        for (const device of packet.amcb_list) {
                            const deviceState = device.state;
                            
                            let evaluatedState = 'ON';
                            if (deviceState === -1 || deviceState === 0 || deviceState === undefined) {
                                evaluatedState = 'OFF';
                            }

                            let displayStatus = 'ON';
                            if (evaluatedState === 'ON') {
                                displayStatus = 'OFF';
                            }

                            if (lastLoggedStatus === null || displayStatus !== lastLoggedStatus) {
                                console.log(`${now()} Status=${displayStatus}`);
                                
                                if (lastLoggedStatus !== null) {
                                    sendPushcutNotifications(displayStatus);
                                }
                                
                                lastLoggedStatus = displayStatus;
                            }
                        }
                    }
                } catch (jsonErr) {
                    // Fail silently
                }
            });
        });

        console.log(`Navigating to ${URL}...`);
        await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
        
        console.log("Waiting for CanvasKit engine initialization (20s)...");
        await page.waitForTimeout(20000);
        
        await page.mouse.click(960, 540); 
        await page.waitForTimeout(1000);   

        async function pressKeys(key, count) {
            for (let i = 0; i < count; i++) {
                if (key === 'Shift+Tab') {
                    await page.keyboard.down('Shift');
                    await page.keyboard.press('Tab');
                    await page.keyboard.up('Shift');
                } else {
                    await page.keyboard.press(key);
                }
                await page.waitForTimeout(STEP_DELAY);
            }
        }

        async function runStep(key, count) {
            await pressKeys(key, count);
            await page.waitForTimeout(BLOCK_DELAY);
            if (key === 'Enter') {
                await page.waitForTimeout(AFTER_ENTER_DELAY);
            }
        }

        console.log("Executing automatic text-clearing login bypass sequence...");
        await page.keyboard.press('Tab'); 
        await page.waitForTimeout(BLOCK_DELAY);

        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.waitForTimeout(STEP_DELAY);

        await page.keyboard.press('Backspace');
        await page.waitForTimeout(BLOCK_DELAY);

        await page.keyboard.type('4217', { delay: 50 });
        await page.waitForTimeout(BLOCK_DELAY);

        await page.keyboard.press('Enter');
        await page.waitForTimeout(AFTER_ENTER_DELAY * 2); 

        console.log("Executing remaining UI Macro Sequence navigation steps...");
        const sequence = [
            ['Tab', 2], ['Enter', 1], ['Tab', 5], ['Enter', 1],
            ['Shift+Tab', 2], ['Enter', 1], ['Shift+Tab', 1], ['Enter', 1],
            ['Tab', 6], ['Enter', 1], ['Tab', 32], ['Enter', 1],
            ['Tab', 1], ['Enter', 1], ['Tab', 7], ['Enter', 1],
            ['Tab', 6], ['Enter', 1], ['Shift+Tab', 1], ['Enter', 2],
            ['Tab', 7], ['Enter', 1], ['Tab', 5], ['Enter', 1],
            ['Tab', 1], ['Enter', 1], ['Shift+Tab', 3], ['Enter', 1],
            ['Tab', 2], ['Enter', 1], ['Tab', 6], ['Enter', 1],
            ['Tab', 1], ['Enter', 1]
        ];

        for (const [key, count] of sequence) {
            await runStep(key, count);
        }

        console.log("Macro setup finished. Waiting for loop confirmation validation...");
        await page.waitForTimeout(15000); // 15-second grace period for connection response

        // --- WATCHDOG FAILURE VALIDATION CHECK ---
        if (!isWebSocketActive) {
            const errorSnapshot = path.join(process.cwd(), 'stuck_error.png');
            await page.screenshot({ path: errorSnapshot });
            console.log(`[Diagnostic Saved]: Snapshot captured at -> ${errorSnapshot}`);
            
            throw new Error("Login macro verification stalled. WebSocket channel remained closed.");
        }

        console.log("Entering active surveillance monitor...");
        while (true) {
            await page.waitForTimeout(POLL_INTERVAL);
        }

    // --- FIX: Added the missing closure logic properties ---
    } catch (err) {
        console.error(`\n[Execution Failure Error]: ${err.message}`);
        console.log("Initiating immediate browser restart cycle...");
        
        if (browser) {
            try { await browser.close(); } catch (e) {}
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        return runTrackerEngine(); // Triggers automated crash recovery cycle
    }
}

// Start execution
runTrackerEngine();
