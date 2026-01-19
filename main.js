const { event, overlay, core, console } = iina;

let timer = null;
let lastTick = 0;
let lastCorePos = -1;
let virtualPos = 0;

function formatTime(seconds) {
    if (seconds === null || seconds === undefined || isNaN(seconds)) return "00:00";
    seconds = Math.max(0, seconds);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateClock() {
    try {
        const now = Date.now();
        if (lastTick === 0) {
            lastTick = now;
        }
        const dt = (now - lastTick) / 1000;
        lastTick = now;

        const date = new Date();
        const systemTimeString = date.toLocaleTimeString('en-US', { hour12: false });

        let leftText = "00:00 : 00:00 - 00:00";
        let centerText = systemTimeString;
        let rightText = "";

        if (core && core.status) {
            // Fetch title or filename safely
            const title = core.status.title;
            const filename = core.status.filename;
            if (title) {
                rightText = title;
            } else if (filename) {
                rightText = filename;
            }
            
            const duration = core.status.duration;
            const corePos = core.status.position;
            const paused = core.status.paused;

            if (typeof duration === 'number' && duration > 0) {
                if (typeof corePos === 'number') {
                    if (corePos !== lastCorePos) {
                        virtualPos = corePos;
                        lastCorePos = corePos;
                    } else {
                        if (!paused) {
                            virtualPos += dt;
                        }
                    }
                }

                if (virtualPos < 0) virtualPos = 0;
                if (virtualPos > duration) virtualPos = duration;

                const remaining = Math.max(0, duration - virtualPos);
                
                // Format: Total : Played - Remaining
                leftText = `${formatTime(duration)} : ${formatTime(virtualPos)} - ${formatTime(remaining)}`;
            }
        }

        // Use fixed positioning relative to viewport to avoid container collapsing issues
        overlay.setContent(`
            <div id="osd-container">
                <div id="left" class="osd-item">${leftText}</div>
                <div id="center" class="osd-item">${centerText}</div>
                <div id="right" class="osd-item">${rightText}</div>
            </div>
        `);
    } catch (e) {
        console.error("Error in updateClock: " + e);
    }
}

function init() {
    console.log("Initializing TimeDisplay...");

    lastTick = 0;
    lastCorePos = -1;
    virtualPos = 0;

    // Reset to simple mode to ensure clean slate
    overlay.simpleMode();

    // Force full viewport size and fixed positioning
    overlay.setStyle(`
        body {
            margin: 0;
            padding: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            overflow: hidden;
            background: transparent;
        }
        #osd-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
        }
        .osd-item {
            position: fixed;
            top: 24px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 18px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.95);
            background-color: rgba(0, 0, 0, 0.5);
            padding: 6px 12px;
            border-radius: 6px;
            text-shadow: 1px 1px 2px black;
            white-space: nowrap;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        #left {
            left: 24px;
        }
        #center {
            left: 50%;
            transform: translateX(-50%);
        }
        #right {
            right: 24px;
            max-width: 35vw;
            overflow: hidden;
            text-overflow: ellipsis;
            display: block;
        }
    `);

    updateClock();
    overlay.show();

    if (timer) clearInterval(timer);
    timer = setInterval(updateClock, 500);
}

event.on("iina.plugin-loaded", () => {
    console.log("Event: plugin-loaded");
    init();
});

event.on("iina.file-loaded", () => {
    console.log("Event: file-loaded");
    init();
});

event.on("iina.plugin-unloaded", () => {
    if (timer) clearInterval(timer);
    overlay.hide();
});