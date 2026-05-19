const { chromium } = require('playwright');
const path = require('path');

const URL = 'https://user.cemcity.com'; 
const BLOCK_DELAY = 250;         
const AFTER_ENTER_DELAY = 300;   
const POLL_INTERVAL = 1000;      

// --- PUSHCUT API ENDPOINTS ---
const PUSHCUT_ON_URL = 'https://pushcut.io';
const PUSHCUT_ON_URL_2 = 'https://pushcut.io';
const PUSHCUT_OFF_URL = 'https://pushcut.io';
const PUSHCUT_OFF_URL_2 = 'https://pushcut.io';

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
        
        console.log("Waiting for cloud asset compiler layers (15s)...");
        await page.waitForTimeout(15000);
        
        // Target the absolute text interaction layer frame center core
        await page.mouse.click(960, 540); 
        await page.waitForTimeout(800);   

        console.log("Executing entry authorization processing payload...");
        
        // Move layout focus into the username textbox
        await page.keyboard.press('Tab'); 
        await page.waitForTimeout(BLOCK_DELAY);

        // Select all arbitrary prefilled garbage string data characters
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.waitForTimeout(BLOCK_DELAY);

        // Wipe the text field clean
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(BLOCK_DELAY);

        // Type the active account ID identifier
        await page.keyboard.type('4217', { delay: 60 });
        await page.waitForTimeout(BLOCK_DELAY);

        // Submit the forms sequence parameters
        await page.keyboard.press('Enter');
        
        // --- RELIABLE EVENT DRIVEN WAIT BINDING ---
        console.log("Bypass payload transmitted. Waiting for secure WebSocket link verification...");
        
        // Give the network 25 seconds to establish connection streams 
        for (let check = 0; check < 25; check++) {
            await page.waitForTimeout(1000);
            if (isWebSocketActive) break;
        }

        // --- WATCHDOG FAILURE VALIDATION CHECK ---
        if (!isWebSocketActive) {
            const errorSnapshot = path.join(process.cwd(), 'stuck_error.png');
            await page.screenshot({ path: errorSnapshot });
            console.log(`[Diagnostic Trace Captured]: Saved snapshot layout view to -> ${errorSnapshot}`);
            
            throw new Error("Cloud validation timeout. WebSocket network handshake remained unestablished.");
        }

        console.log("Entering continuous live monitoring cycle...");
        while (true) {
            await page.waitForTimeout(POLL_INTERVAL);
        }

    } catch (err) {
        console.error(`[System Monitor Recovery Exception]: ${err.message}`);
        console.log("Re-initializing execution thread loops in 5 seconds...");
        
        if (browser) {
            try { await browser.close(); } catch (e) {}
        }
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        return runTrackerEngine(); 
    }
}

// Fire application loops execution entry thread
runTrackerEngine();
