/**
 * OHM SHOP Security System
 * Anti-Inspect & Console Warnings
 */

(function () {
    // 0. Developer Mode Bypass (Backdoor) 🗝️
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('dev') === 'ohm') {
        localStorage.setItem('OHM_DEV_MODE', 'true');
        alert('admin mode enabled 🛡️🔓\nSecurity systems disabled for this browser.');
    }

    if (localStorage.getItem('OHM_DEV_MODE') === 'true') {
        console.log('%c🛡️ Developer Mode Active', 'background: #222; color: #bada55; font-size: 14px; padding: 4px; border-radius: 4px;');
        return; // Exit security script
    }

    // 1. Console Warning & IP Bluff
    const showSecurityWarning = async () => {
        // Clear initial console
        console.clear();

        // Big Red STOP
        console.log('%c🛑 STOP!', 'color: #ff0000; font-size: 60px; font-weight: bold; text-shadow: 2px 2px #000;');

        console.log('%cThis is a browser feature intended for developers. If someone told you to copy-paste something here to enable a feature or hack someone\'s account, it is a scam and will give them access to your account.', 'font-size: 18px; color: #ffffff; background: #222; padding: 10px; border-radius: 5px;');

        console.log('%c⚠️ SECURITY ALERT', 'font-size: 24px; color: #ff0000; font-weight: bold;');

        try {
            // Fetch IP for "Security Theater"
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();

            console.log(`%cYour IP Address: ${data.ip}`, 'font-size: 16px; color: #00ff00; font-family: monospace;');
            console.log('%cSystem has logged your request details and location for security monitoring.', 'font-size: 14px; color: #aaa;');
            console.log('%cAttempting to bypass security protocols may result in a permanent ban.', 'font-size: 14px; color: #ff4444;');

        } catch (e) {
            // Fallback if API fails
            console.log('%cSystem monitoring active.', 'font-size: 14px; color: #00ff00;');
        }
    };

    // Execute immediately
    showSecurityWarning();

    // Re-show warning if console is cleared/refreshed
    setInterval(() => {
        // Just keeping the warning visible periodically if they try to clear it
        // Not spamming, just ensuring it's the last thing seen
    }, 2000);

    // 2. Disable Key Shortcuts (F12, Ctrl+Shift+I/J/U/C)
    document.addEventListener('keydown', function (e) {
        // F12
        if (e.key === 'F12' || e.keyCode === 123) {
            e.preventDefault();
            e.stopPropagation();
            showSecurityWarning();
            return false;
        }

        // Ctrl + Shift + Key
        if (e.ctrlKey && e.shiftKey) {
            // I (Inspect), J (Console), C (Elements), U (Source)
            if (['I', 'J', 'C', 'U'].includes(e.key.toUpperCase())) {
                e.preventDefault();
                e.stopPropagation();
                showSecurityWarning();
                return false;
            }
        }

        // Ctrl + U (View Source)
        if (e.ctrlKey && e.key.toUpperCase() === 'U') {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    });

    // 3. Detect DevTools Open (Advanced DOM Masking) 🎭
    // This watches for significant window resize or console threshold to detect inspection
    const threshold = 160;

    const checkDevTools = () => {
        if (localStorage.getItem('OHM_DEV_MODE') === 'true') return;

        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;

        if ((widthThreshold || heightThreshold) && (window.firebug || (window.console && window.console.profiles && window.console.profiles.length > 0))) {
            lockdownMode();
        }
    };

    // Modern detection utilizing 'debugger' timing attack to verify if devtools is slowing down execution
    // This is more robust against undocked devtools
    let devtoolsOpen = false;
    const element = new Image();
    Object.defineProperty(element, 'id', {
        get: function () {
            lockdownMode();
            devtoolsOpen = true;
        }
    });

    const lockdownMode = () => {
        if (document.getElementById('security-lockout')) return; // Already locked
        if (localStorage.getItem('OHM_DEV_MODE') === 'true') return; // Bypass

        // Nuke the body
        document.body.innerHTML = `
            <div id="security-lockout" style="
                position: fixed; top: 0; left: 0; width: 100%; height: 100vh;
                background: #000; color: #ff0000; z-index: 999999;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                text-align: center; font-family: sans-serif; padding: 20px;
            ">
                <h1 style="font-size: 4rem; margin-bottom: 20px;">⚠️ SECURITY ALERT</h1>
                <p style="font-size: 1.5rem; color: #fff;">System has detected unauthorized inspection tools.</p>
                <div style="margin-top: 30px; font-size: 1.2rem; color: #aaa;">
                    Your IP Address <span style="color: #0f0;">${window.userIp || 'LOGGED'}</span> has been recorded.
                    <br>Please close Developer Tools to continue.
                </div>
            </div>
        `;

        // Loop warning in console
        setInterval(() => {
            console.clear();
            console.log('%c⚠️ INSPECTION DETECTED', 'color: red; font-size: 50px; font-weight: bold;');
        }, 100);
    }

    // Interval check for resizing (Docked DevTools)
    setInterval(() => {
        checkDevTools();
        // Trigger the element id getter check (Chrome specific trick)
        console.log(element);
        console.clear();
    }, 1000);

    // 4. Debugger Trap (The most annoying/effective method for all browsers) 🪤
    // This freezes the page if DevTools is open because it hits a breakpoint repeatedly.
    setInterval(() => {
        if (localStorage.getItem('OHM_DEV_MODE') === 'true') return;

        // This function detects if the debugging cycle is taking too long
        // If DevTools is open, 'debugger' stops execution, causing a delay.
        const start = performance.now();
        (function () { debugger; })(); // 🛑 Trap hits here if DevTools open
        const end = performance.now();

        if (end - start > 100) {
            lockdownMode();
        }
    }, 500);

    // 5. Attribute Injection (The "Rexzy" Style) 🤬
    // Injects random insults into data attributes of html/body/head tags
    const insults = [
        "อย่าก็อปเลยพี่ขอ",
        "คิดเองบ้างก็ได้นะ",
        "Stop_Stealing_My_Code",
        "Why_Are_You_Here?",
        "Get_A_Life_Bro",
        "หัดเขียนเองบ้างนะจ๊ะ",
        "Copy_Paste_Expert",
        "Failed_To_Crack_Me"
    ];

    const injectInsults = () => {
        if (localStorage.getItem('OHM_DEV_MODE') === 'true') return;

        const targetTags = [document.documentElement, document.head, document.body];
        targetTags.forEach(tag => {
            if (!tag) return;
            // Generate random ID-like string
            const randomId = Math.random().toString(36).substring(7);
            const randomInsult = insults[Math.floor(Math.random() * insults.length)];

            tag.setAttribute(`data-protect-${randomId}`, randomInsult);
        });
    };

    // Inject immediately and periodically
    injectInsults();
    setInterval(injectInsults, 2000);

})();
