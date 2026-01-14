/**
 * Device Fingerprinting (Otimizado para UX)
 * Gera identificador único baseado em características do dispositivo
 * - Inicialização instantânea (<10ms)
 * - Cache inteligente com validade de 30 dias
 * - Sem bloqueio de UI
 */

const CACHE_VALIDITY_DAYS = 30;
const FINGERPRINT_KEY = 'visitor_fingerprint';
const STORAGE_KEY = 'visitor_presence_id';

interface FingerprintCache {
  fingerprint: string;
  generatedAt: number;
}

// Canvas Fingerprint - diferenças de renderização entre dispositivos
const getCanvasFingerprint = (): string => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';

    canvas.width = 200;
    canvas.height = 50;

    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Lovable fp', 2, 15);

    ctx.beginPath();
    ctx.arc(50, 25, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#0f0';
    ctx.fill();

    const gradient = ctx.createLinearGradient(0, 0, 200, 0);
    gradient.addColorStop(0, '#ff0000');
    gradient.addColorStop(1, '#0000ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 40, 200, 10);

    return canvas.toDataURL();
  } catch {
    return 'canvas-error';
  }
};

// WebGL Fingerprint - informações do GPU/driver
const getWebGLFingerprint = (): string => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) return 'no-webgl';

    const glContext = gl as WebGLRenderingContext;
    const debugInfo = glContext.getExtension('WEBGL_debug_renderer_info');

    const vendor = debugInfo
      ? glContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
      : glContext.getParameter(glContext.VENDOR);

    const renderer = debugInfo
      ? glContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : glContext.getParameter(glContext.RENDERER);

    return `${vendor}|${renderer}`;
  } catch {
    return 'webgl-error';
  }
};

// Hardware/Browser Info
const getHardwareInfo = (): string => {
  try {
    const info = [
      screen.width,
      screen.height,
      screen.colorDepth,
      screen.pixelDepth,
      navigator.hardwareConcurrency || 'unknown',
      (navigator as any).deviceMemory || 'unknown',
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.language,
      navigator.languages?.join(',') || navigator.language,
      navigator.maxTouchPoints || 0,
      navigator.platform,
      new Date().getTimezoneOffset(),
    ];

    return info.join('|');
  } catch {
    return 'hardware-error';
  }
};

// Fonts disponíveis (método leve)
const getFontsFingerprint = (): string => {
  try {
    const testFonts = [
      'Arial',
      'Courier New',
      'Georgia',
      'Times New Roman',
      'Trebuchet MS',
      'Verdana',
      'Comic Sans MS',
      'Impact',
      'Lucida Console',
    ];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-fonts';

    const testString = 'mmmmmmmmlli';
    const baseFont = 'monospace';

    ctx.font = `72px ${baseFont}`;
    const baseWidth = ctx.measureText(testString).width;

    const availableFonts = testFonts.filter((font) => {
      ctx.font = `72px "${font}", ${baseFont}`;
      return ctx.measureText(testString).width !== baseWidth;
    });

    return availableFonts.join(',');
  } catch {
    return 'fonts-error';
  }
};

// Hash SHA-256
const hashString = async (str: string): Promise<string> => {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
};

// Cache com validade
const getCachedFingerprint = (): string | null => {
  try {
    const cached = localStorage.getItem(FINGERPRINT_KEY) || sessionStorage.getItem(FINGERPRINT_KEY);
    if (!cached) return null;

    const data: FingerprintCache = JSON.parse(cached);
    const ageInDays = (Date.now() - data.generatedAt) / (1000 * 60 * 60 * 24);

    if (ageInDays < CACHE_VALIDITY_DAYS && data.fingerprint?.startsWith('fp_')) {
      return data.fingerprint;
    }
  } catch {}
  return null;
};

const saveFingerprintCache = (fingerprint: string): void => {
  const cache: FingerprintCache = {
    fingerprint,
    generatedAt: Date.now(),
  };
  const cacheStr = JSON.stringify(cache);
  try { localStorage.setItem(FINGERPRINT_KEY, cacheStr); } catch {}
  try { sessionStorage.setItem(FINGERPRINT_KEY, cacheStr); } catch {}
};

/**
 * Gera fingerprint único do dispositivo (síncrono, <10ms)
 */
export const generateDeviceFingerprint = async (): Promise<string> => {
  try {
    // Sem Audio Fingerprint - muito lento (500ms+)
    const components = [
      getCanvasFingerprint(),
      getWebGLFingerprint(),
      getHardwareInfo(),
      getFontsFingerprint(),
    ];

    const combined = components.join('|||');
    const hash = await hashString(combined);

    return `fp_${hash.slice(0, 32)}`;
  } catch {
    return `fp_error_${Date.now()}`;
  }
};

/**
 * Obtém ID do visitante com fallbacks inteligentes
 * Prioridade: fingerprint > localStorage > sessionStorage > random
 */
export const getVisitorIdWithFingerprint = async (): Promise<string> => {
  // 1. Retorno IMEDIATO se existe cache válido (sem espera)
  const cached = getCachedFingerprint();
  if (cached) {
    // Atualizar em background se cache > 15 dias (não bloqueia)
    queueMicrotask(async () => {
      try {
        const cachedData = localStorage.getItem(FINGERPRINT_KEY);
        if (cachedData) {
          const data: FingerprintCache = JSON.parse(cachedData);
          const ageInDays = (Date.now() - data.generatedAt) / (1000 * 60 * 60 * 24);
          if (ageInDays > 15) {
            const newFp = await generateDeviceFingerprint();
            if (newFp && !newFp.includes('error')) {
              saveFingerprintCache(newFp);
            }
          }
        }
      } catch {}
    });
    return cached;
  }

  // 2. Gerar novo fingerprint
  try {
    const fingerprint = await generateDeviceFingerprint();

    if (fingerprint && !fingerprint.includes('error')) {
      saveFingerprintCache(fingerprint);
      return fingerprint;
    }
  } catch {
    if (import.meta.env.DEV) {
      console.warn('[Fingerprint] Fallback ativado');
    }
  }

  // 3. Fallback: localStorage ID
  const storedId = localStorage.getItem(STORAGE_KEY);
  if (storedId) return storedId;

  // 4. Fallback: sessionStorage ID
  const sessionId = sessionStorage.getItem(STORAGE_KEY);
  if (sessionId) return sessionId;

  // 5. Último recurso: gerar ID aleatório
  const randomId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    localStorage.setItem(STORAGE_KEY, randomId);
  } catch {
    try {
      sessionStorage.setItem(STORAGE_KEY, randomId);
    } catch {}
  }

  return randomId;
};
