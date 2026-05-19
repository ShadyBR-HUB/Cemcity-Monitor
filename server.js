const { chromium } = require('playwright');
const path = require('path');

const URL = 'https://cemcity.com'; 
const BLOCK_DELAY = 250;         
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

async function runTrackerEngine() {
    let browser;
    let isWebSocketActive = false; 

    try {
        console.log("\n[Engine Initialization]: Launching cloud browser instance...");
        browser = await chromium.launch({
            headless: true, 
            args: [
                '--disable-blink-features=AutomationControlled', 
                '--no-sandbox',
                '--disable-gpu',
                '--touch-events=disabled',
                '--disable-touch-drag-drop',
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
            console.log(`[WebSocket Connected Successfully]: Tracking active device streams...`);
            isWebSocketActive = true; 
            
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

        console.log(`Navigating to dashboard login gateway -> ${URL}...`);
        await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
        
        console.log("Waiting for cloud asset compiler layers (20s)...");
        await page.waitForTimeout(20000);
        
        // FIX: Replaced simulated coordinate click with direct element focus hook 
        // This forces headless Linux instances to select the active Flutter interface frame
        await page.focus('body');
        await page.waitForTimeout(1000);   

        console.log("Executing entry authorization processing payload...");
        
        // Move selection focus down inside the username textbox
        await page.keyboard.press('Tab'); 
        await page.waitForTimeout(BLOCK_DELAY);

        // Force select all pre-filled layout string properties (Control + A)
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.waitForTimeout(BLOCK_DELAY);

        // Clear out the textbox input completely
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(BLOCK_DELAY);

        // Input account code
        await page.keyboard.type('4217', { delay: 100 }); // Bumped delay for stability
        await page.waitForTimeout(BLOCK_DELAY);

        // Trigger submission form verification
        await page.keyboard.press('Enter');
        
        console.log("Bypass payload transmitted. Waiting for secure WebSocket link verification...");
        
        // FIX: Bumped lookup iterations to 45 seconds to accommodate remote infrastructure handshakes
        for (let check = 0; check < 45; check++) {
            await page.waitForTimeout(1000);
            if (isWebSocketActive) break;
        }

        // --- WATCHDOG FAILURE VALIDATION CHECK ---
        if (!isWebSocketActive) {
            const errorSnapshot = path.join(process.cwd(), 'stuck_error.png');
            try {
                await page.screenshot({ path: errorSnapshot });
                console.log(`[Diagnostic Trace Captured]: Saved snapshot layout view to -> ${errorSnapshot}`);
            } catch (snapErr) {
                // Bypass snapshot failures silently
            }
            
            throw new Error("Cloud validation timeout. WebSocket network handshake remained unestablished.");
        }

        console.log("Entering continuous live monitoring cycle...");
        while (true) {
            await page.waitForTimeout(POLL_INTERVAL);
        }

    } catch (err) {
        console.error(`[System Monitor Recovery Exception]: ${err.message}`);
        console.log("Re-initializing execution thread loops in 7 seconds...");
        
        if (browser) {
            try { await browser.close(); } catch (e) {}
        }
        
        await new Promise(resolve => setTimeout(resolve, 7000));
        return runTrackerEngine(); 
    }
}

// Fire application loops execution entry thread
runTrackerEngine();
