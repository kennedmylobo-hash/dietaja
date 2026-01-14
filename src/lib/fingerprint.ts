/**
 * Device Fingerprinting
 * Gera identificador único baseado em características do dispositivo
 * Funciona mesmo em navegação anônima ou após limpar dados
 */

// Canvas Fingerprint - diferenças de renderização entre dispositivos
const getCanvasFingerprint = (): string => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';

    canvas.width = 200;
    canvas.height = 50;

    // Texto com fonte específica
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Lovable fp', 2, 15);

    // Formas geométricas
    ctx.beginPath();
    ctx.arc(50, 25, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#0f0';
    ctx.fill();

    // Gradiente
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

    const version = glContext.getParameter(glContext.VERSION);
    const shadingVersion = glContext.getParameter(glContext.SHADING_LANGUAGE_VERSION);

    return `${vendor}|${renderer}|${version}|${shadingVersion}`;
  } catch {
    return 'webgl-error';
  }
};

// Audio Fingerprint - características do sistema de áudio
const getAudioFingerprint = async (): Promise<string> => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return 'no-audio';

    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const analyser = audioContext.createAnalyser();
    const gainNode = audioContext.createGain();
    const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

    gainNode.gain.value = 0; // Silencioso

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);

    oscillator.connect(analyser);
    analyser.connect(scriptProcessor);
    scriptProcessor.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(0);

    return new Promise((resolve) => {
      scriptProcessor.onaudioprocess = (event) => {
        const data = event.inputBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          sum += Math.abs(data[i]);
        }

        oscillator.disconnect();
        scriptProcessor.disconnect();
        gainNode.disconnect();
        audioContext.close();

        resolve(`audio-${sum.toFixed(10)}`);
      };

      // Timeout fallback
      setTimeout(() => {
        try {
          oscillator.disconnect();
          scriptProcessor.disconnect();
          gainNode.disconnect();
          audioContext.close();
        } catch {}
        resolve('audio-timeout');
      }, 500);
    });
  } catch {
    return 'audio-error';
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
    // Fallback simples
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
};

/**
 * Gera fingerprint único do dispositivo
 * @returns Promise<string> - ID único no formato fp_XXXX
 */
export const generateDeviceFingerprint = async (): Promise<string> => {
  try {
    const [audioFp] = await Promise.all([getAudioFingerprint()]);

    const components = [
      getCanvasFingerprint(),
      getWebGLFingerprint(),
      getHardwareInfo(),
      getFontsFingerprint(),
      audioFp,
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
  const storageKey = 'visitor_presence_id';
  const fingerprintKey = 'visitor_fingerprint';

  // 1. Tentar fingerprint armazenado
  const storedFingerprint =
    localStorage.getItem(fingerprintKey) || sessionStorage.getItem(fingerprintKey);

  if (storedFingerprint && storedFingerprint.startsWith('fp_') && !storedFingerprint.includes('error')) {
    return storedFingerprint;
  }

  // 2. Gerar novo fingerprint
  try {
    const fingerprint = await generateDeviceFingerprint();

    if (fingerprint && !fingerprint.includes('error')) {
      // Salvar em ambos os storages
      try {
        localStorage.setItem(fingerprintKey, fingerprint);
      } catch {}
      try {
        sessionStorage.setItem(fingerprintKey, fingerprint);
      } catch {}

      return fingerprint;
    }
  } catch {
    console.warn('[Fingerprint] Falha ao gerar fingerprint, usando fallback');
  }

  // 3. Fallback: localStorage ID
  const storedId = localStorage.getItem(storageKey);
  if (storedId) return storedId;

  // 4. Fallback: sessionStorage ID
  const sessionId = sessionStorage.getItem(storageKey);
  if (sessionId) return sessionId;

  // 5. Último recurso: gerar ID aleatório
  const randomId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    localStorage.setItem(storageKey, randomId);
  } catch {
    try {
      sessionStorage.setItem(storageKey, randomId);
    } catch {}
  }

  return randomId;
};
