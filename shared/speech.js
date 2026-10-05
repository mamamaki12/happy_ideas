// 音声認識（Web Speech API）と音声合成の薄いラッパー
export const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : undefined;
export const recognitionSupported = () => !!SR;
export const synthesisSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

/**
 * 音声認識を1回分開始する。onResult(finalText, interimText) を呼ぶ。
 * @returns {{stop: () => void}}
 */
export function listen({ lang = 'ja-JP', continuous = false, onResult, onEnd, onError }) {
  if (!SR) throw new Error('このブラウザは音声認識に対応していません（Chrome/Safari推奨）');
  const r = new SR();
  r.lang = lang; r.interimResults = true; r.continuous = continuous; r.maxAlternatives = 1;
  let finalText = '';
  r.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += t; else interim += t;
    }
    onResult?.(finalText, interim);
  };
  r.onerror = (e) => onError?.(e.error === 'not-allowed' ? 'マイクの利用が許可されていません' : e.error === 'no-speech' ? '声が聞き取れませんでした' : e.error === 'network' ? '音声認識にはネット接続が必要です' : `音声認識エラー（${e.error}）`);
  r.onend = () => onEnd?.(finalText);
  r.start();
  return { stop: () => { try { r.stop(); } catch { /* noop */ } } };
}

/** 読み上げ。終わったら resolve */
export function speak(text, { lang = 'ja-JP', rate = 1, pitch = 1 } = {}) {
  return new Promise((resolve) => {
    if (!synthesisSupported()) return resolve(false);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = rate; u.pitch = pitch;
    const v = speechSynthesis.getVoices().find((x) => x.lang.replace('_', '-').startsWith(lang.slice(0, 2)));
    if (v) u.voice = v;
    u.onend = () => resolve(true); u.onerror = () => resolve(false);
    speechSynthesis.speak(u);
  });
}
export const stopSpeaking = () => { if (synthesisSupported()) speechSynthesis.cancel(); };
