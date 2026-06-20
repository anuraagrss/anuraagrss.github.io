// ZNMD Ambient — YouTube IFrame Player + Web Speech poem narration
// BGM: Shankar-Ehsaan-Loy, Zindagi Na Milegi Dobara (2011)

const VIDEO_IDS = [
  'FCM297g53u8', // ZNMD BGM — Shankar-Ehsaan-Loy full background score
  '57xlfYZxF-c', // ZNMD background scores compilation (fallback)
];

export class ZNMDAmbient {
  constructor() {
    this.player = null;
    this._ready  = false;
    this._vol    = 18;
    this._vidIdx = 0;
  }

  _loadAPI() {
    return new Promise(resolve => {
      if (window.YT?.Player) { resolve(); return; }
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(); };
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(s);
      }
    });
  }

  async start(vol = 18) {
    this._vol = vol;
    await this._loadAPI();

    if (this.player && this._ready) {
      this.player.setVolume(vol);
      this.player.playVideo();
      return;
    }

    this.player = new window.YT.Player('ytPlayer', {
      videoId: VIDEO_IDS[0],
      width: '1', height: '1',
      playerVars: {
        autoplay: 1, controls: 0, disablekb: 1,
        fs: 0, loop: 1, playlist: VIDEO_IDS[0],
        modestbranding: 1, rel: 0, iv_load_policy: 3,
      },
      events: {
        onReady: e => {
          this._ready = true;
          e.target.setVolume(this._vol);
          e.target.playVideo();
        },
        onStateChange: e => {
          if (e.data === 0) e.target.playVideo(); // loop on end
        },
        onError: e => {
          // try next video on error
          this._vidIdx = (this._vidIdx + 1) % VIDEO_IDS.length;
          if (this.player && this._ready) {
            this.player.loadVideoById(VIDEO_IDS[this._vidIdx]);
          }
        },
      },
    });
  }

  stop() {
    if (this.player && this._ready) this.player.pauseVideo();
  }

  setVol(v) {
    this._vol = v;
    if (this.player && this._ready) this.player.setVolume(v);
  }
}

// ── Poem narration — Web Speech API ─────────────────
const _voicesReady = new Promise(resolve => {
  if (!window.speechSynthesis) { resolve(); return; }
  const v = window.speechSynthesis.getVoices();
  if (v.length) { resolve(); return; }
  window.speechSynthesis.addEventListener('voiceschanged', resolve, { once: true });
});

function _pickVoice() {
  const voices = window.speechSynthesis?.getVoices() || [];
  return (
    voices.find(v => v.name === 'Google UK English Male') ||
    voices.find(v => /daniel/i.test(v.name) && v.lang === 'en-GB') ||
    voices.find(v => v.lang === 'en-GB') ||
    voices.find(v => v.lang.startsWith('en') && !v.localService) ||
    voices.find(v => v.lang.startsWith('en'))
  );
}

export async function speakPoem(text) {
  if (!window.speechSynthesis) return;
  await _voicesReady;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\n/g, ', '));
  u.rate   = 0.64;
  u.pitch  = 0.80;
  u.volume = 0.50;
  const voice = _pickVoice();
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

export function stopSpeech() {
  window.speechSynthesis?.cancel();
}
