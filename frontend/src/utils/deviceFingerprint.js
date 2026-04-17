/**
 * Device Fingerprinting Utility  v2.0
 * ─────────────────────────────────────────────────────────────
 * Generates a stable, unique device_id from browser signals.
 *  • Uses SubtleCrypto SHA-256 (async) for a strong 64-char hex hash
 *  • Falls back to a synchronous djb2-based ID for older browsers
 *  • Persisted in localStorage so the same browser always returns
 *    the same ID across sessions
 *  • No fake MAC address formatting — sends a clean hex string
 * ─────────────────────────────────────────────────────────────
 */

// ─── Canvas fingerprint (GPU/font rendering differences) ─────
function getCanvasFingerprint() {
    try {
        const canvas = document.createElement('canvas');
        canvas.width  = 240;
        canvas.height = 60;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle   = '#1a1a2e';
        ctx.fillRect(0, 0, 240, 60);

        ctx.font      = '18px Arial, sans-serif';
        ctx.fillStyle = '#e94560';
        ctx.fillText('SmartCampus🔐Device', 4, 24);

        ctx.font      = '12px monospace';
        ctx.fillStyle = 'rgba(99,102,241,0.8)';
        ctx.fillText(navigator.userAgent.slice(0, 40), 4, 44);

        return canvas.toDataURL();
    } catch {
        return 'canvas-blocked';
    }
}

// ─── Audio fingerprint (DSP processing differences) ──────────
async function getAudioFingerprint() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return 'no-audio';

        const ctx    = new AudioContext();
        const osc    = ctx.createOscillator();
        const anal   = ctx.createAnalyser();
        const merger = ctx.createChannelMerger(1);
        const proc   = ctx.createScriptProcessor(4096, 1, 1);

        osc.connect(anal);
        anal.connect(merger);
        merger.connect(proc);
        proc.connect(ctx.destination);

        osc.start(0);

        const data = await new Promise(resolve => {
            proc.onaudioprocess = e => {
                const buf = e.inputBuffer.getChannelData(0);
                resolve(Array.from(buf.slice(0, 32)).join(','));
                osc.stop();
                ctx.close();
            };
        });
        return data;
    } catch {
        return 'audio-blocked';
    }
}

// ─── Collect all signals ──────────────────────────────────────
async function collectSignals() {
    const nav  = navigator;
    const scr  = screen;

    const [audioFP] = await Promise.all([getAudioFingerprint()]);
    const canvasFP  = getCanvasFingerprint();

    const signals = [
        // Browser & OS
        nav.userAgent,
        nav.language || nav.userLanguage || 'unknown',
        nav.languages?.join(',') || 'unknown',
        nav.platform   || 'unknown',
        nav.vendor     || 'unknown',
        String(nav.hardwareConcurrency || 0),
        String(nav.deviceMemory        || 0),
        String(nav.maxTouchPoints      || 0),

        // Screen
        `${scr.width}x${scr.height}`,
        `${scr.availWidth}x${scr.availHeight}`,
        String(scr.colorDepth),
        String(scr.pixelDepth),
        String(window.devicePixelRatio || 1),

        // Time & Locale
        Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
        String(new Date().getTimezoneOffset()),

        // Rendering
        canvasFP,

        // Audio DSP
        audioFP,

        // Installed plugins (desktop)
        Array.from(nav.plugins || []).map(p => p.name).sort().join(','),

        // WebGL renderer
        getWebGLFingerprint(),

        // Connection
        nav.connection?.effectiveType || 'unknown',
    ];

    return signals.join('|||');
}

// ─── WebGL GPU info ───────────────────────────────────────────
function getWebGLFingerprint() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return 'no-webgl';

        const ext      = gl.getExtension('WEBGL_debug_renderer_info');
        const vendor   = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)   : gl.getParameter(gl.VENDOR);
        const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
        return `${vendor}::${renderer}`;
    } catch {
        return 'webgl-blocked';
    }
}

// ─── SHA-256 hash via SubtleCrypto (async, strong) ───────────
async function sha256(str) {
    try {
        const encoded = new TextEncoder().encode(str);
        const hash    = await crypto.subtle.digest('SHA-256', encoded);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join(''); // 64-char hex string
    } catch {
        return null;
    }
}

// ─── djb2 fallback (sync, for very old browsers) ─────────────
function djb2(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) + h) ^ str.charCodeAt(i);
        h = h >>> 0; // keep unsigned 32-bit
    }
    return h.toString(16).padStart(8, '0');
}

// ─── PUBLIC API ───────────────────────────────────────────────

const STORAGE_KEY = 'sc_device_id_v2';

/**
 * getDeviceId()
 * Returns a promise that resolves to a stable 64-char SHA-256 hex
 * device identifier for this browser/device combination.
 *
 * @returns {Promise<string>}
 */
export async function getDeviceId() {
    // 1. Return stored ID if already computed this session
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && stored.length >= 16) {
            return stored;
        }
    } catch { /* localStorage blocked */ }

    // 2. Collect browser signals
    const raw = await collectSignals();

    // 3. Hash with SHA-256 (strong) or djb2 (fallback)
    const hash = (await sha256(raw)) || djb2(raw);

    // 4. Persist
    try {
        localStorage.setItem(STORAGE_KEY, hash);
    } catch { /* ignore */ }

    return hash;
}

/**
 * clearDeviceId()
 * Wipes the stored device ID — next call to getDeviceId() will
 * recompute (new fingerprint for this browser).
 */
export function clearDeviceId() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        // Also wipe the old v1 key if present
        localStorage.removeItem('smart_campus_device_mac');
    } catch { /* ignore */ }
}

/**
 * getDeviceInfo()
 * Returns a human-readable object for debugging / admin UI.
 *
 * @returns {Promise<object>}
 */
export async function getDeviceInfo() {
    const id = await getDeviceId();
    return {
        device_id:  id,
        short_id:   id.slice(0, 16) + '…',
        userAgent:  navigator.userAgent,
        screen:     `${screen.width}x${screen.height}`,
        language:   navigator.language,
        timezone:   Intl.DateTimeFormat().resolvedOptions().timeZone,
        platform:   navigator.platform,
        webgl:      getWebGLFingerprint(),
    };
}

// ─── Backward-compat shim (Login.jsx imports getDeviceMAC) ───
// Keeps the old synchronous import working while we migrate.
export function getDeviceMAC() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
                    || localStorage.getItem('smart_campus_device_mac');
        if (stored) return stored;
    } catch { /* ignore */ }
    // Sync fallback: djb2 of userAgent + screen + timezone
    const raw = [
        navigator.userAgent,
        `${screen.width}x${screen.height}`,
        new Date().getTimezoneOffset(),
    ].join('|');
    return djb2(raw);
}
