import { OFFICIAL_LOGO } from '../branding';
import { VIDEO_THUMBNAIL } from '../branding';
import { useThumb } from '../utils/thumb';
import shaka from 'shaka-player/dist/shaka-player.compiled.js';
import HlsJs from 'hls.js';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lesson } from '../types';
import { resolveVideoStream, StreamResolution } from '../services/streamResolver';
import { fetchVideoInfo, API_BASE } from '../services/tbApi';
import { PlayerLoader } from './PlayerLoader';
import { splitTitle } from '../utils/format';
import {
  Play, Pause, RotateCcw, RotateCw, Maximize, Minimize,
  Volume2, VolumeX, AlertCircle, RotateCw as ReloadIcon,
  CheckCircle2, Circle, ChevronLeft, ChevronRight,
  ShieldCheck, PictureInPicture2, ExternalLink, Smartphone, X,
  Settings, SlidersHorizontal, Captions, Gauge, Download, Check, Minus, Plus
} from 'lucide-react';

declare global {
  interface Window {
    shaka?: any;
    Hls?: any;
    dashjs?: any;
    Plyr?: any;
  }
}

interface VideoPlayerProps {
  lesson: Lesson;
  courseId: string;
  courseTitle?: string;
  subtitle?: string;
  position?: { index: number; total: number };
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  isCompleted?: boolean;
  onToggleComplete?: () => void;
  /** hide the title / prev-next card under the video (the page draws its own) */
  hideDetails?: boolean;
  /** edge-to-edge video on phones (no rounded border) */
  flush?: boolean;
}

// Opens the official player in real Chrome (Android). In-app WebViews have no Widevine, which gives "DRM Error Code: 5".
const openInChrome = (url: string) => {
  try {
    if (/Android/i.test(navigator.userAgent)) {
      const u = new URL(url);
      const scheme = u.protocol.replace(':', '');
      window.location.href = `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
      return;
    }
  } catch (e) { /* fall through */ }
  window.open(url, '_blank', 'noopener,noreferrer');
};

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  lesson,
  courseId,
  courseTitle,
  subtitle,
  position,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
  isCompleted = false,
  onToggleComplete,
  hideDetails = false,
  flush = false,
}) => {
  const posterUrl = useThumb();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [stage, setStage] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [webUrl, setWebUrl] = useState<string | null>(null);
  const [lazyPage, setLazyPage] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [streamInfo, setStreamInfo] = useState<StreamResolution | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<'main' | 'speed' | 'quality' | 'captions'>('main');
  const [quality, setQuality] = useState<'auto' | number>('auto');
  const [caption, setCaption] = useState<string>('off');
  const [isFullscreen, setIsFullscreen] = useState(false);
  // 'native' = real fullscreen + landscape lock, 'css' = fallback (iPhone etc.) rotated with CSS
  const [rotateMode, setRotateMode] = useState<'none' | 'native' | 'css'>('none');
  const [seekFlash, setSeekFlash] = useState<null | { side: 'left' | 'right'; key: number }>(null);

  const hideTimeoutRef = useRef<any>(null);
  const watchdogRef = useRef<any>(null);
  const runIdRef = useRef(0);
  const logRef = useRef<string[]>([]);
  const lastTapRef = useRef<{ t: number; x: number }>({ t: 0, x: 0 });
  const tapTimerRef = useRef<any>(null);

  const engineRef = useRef<'' | 'hls' | 'native' | 'shaka' | 'file'>('');
  const [isBuffering, setIsBuffering] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const hlsInstanceRef = useRef<any>(null);
  const shakaInstanceRef = useRef<any>(null);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast((p) => (p === m ? null : p)), 3500);
  };

  const cleanupEngines = async () => {
    if (hlsInstanceRef.current) {
      try { hlsInstanceRef.current.destroy(); } catch (e) {}
      hlsInstanceRef.current = null;
    }
    if (shakaInstanceRef.current) {
      try { await shakaInstanceRef.current.destroy(); } catch (e) {}
      shakaInstanceRef.current = null;
    }
    engineRef.current = '';
    const v = videoRef.current;
    if (v) {
      try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) {}
    }
  };

  const log = (m: string) => { logRef.current.push(m); console.info('[player]', m); };

  const failNow = (msg: string) => {
    clearTimeout(watchdogRef.current);
    cleanupEngines();
    setErrorDetails([...logRef.current]);
    setErrorMsg(msg);
    setIsLoading(false);
    setIsBuffering(false);
  };

  // Unmuted autoplay first; if the browser blocks it, play muted and tell the student
  const attemptAutoplay = (video: HTMLVideoElement) => {
    video.playbackRate = playbackSpeed;
    video.play().catch((err: any) => {
      if (err?.name === 'NotAllowedError') {
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => {});
        showToast('Sound is off (browser rule). Tap the speaker to turn it on.');
      }
    });
  };

  /**
   * Try one HLS source. Resolves true only when real media is buffered (not just the manifest),
   * so a stream that parses but cannot decode (DRM) falls through to the next method.
   */
  const playHls = (url: string, token: string | null, timeoutMs = 9000) =>
    new Promise<boolean>((resolve) => {
      const video = videoRef.current;
      const Hls: any = HlsJs;
      if (!video) return resolve(false);
      const short = url.replace(/^https?:\/\//, '').slice(0, 48);

      // Native HLS (iPhone / Safari)
      if (!(Hls && Hls.isSupported())) {
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          const done = (ok: boolean) => {
            clearTimeout(timer);
            video.removeEventListener('loadeddata', onData);
            video.removeEventListener('error', onErr);
            if (!ok) log(`native HLS failed: ${short}`);
            resolve(ok);
          };
          const onData = () => { engineRef.current = 'native'; attemptAutoplay(video); done(true); };
          const onErr = () => done(false);
          const timer = setTimeout(() => done(false), timeoutMs);
          video.addEventListener('loadeddata', onData);
          video.addEventListener('error', onErr);
          video.src = url;
          video.load();
          return;
        }
        log('HLS not supported in this browser');
        return resolve(false);
      }

      let settled = false;
      let retries = 0;
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 60,
        capLevelToPlayerSize: true,
        startLevel: -1,
        manifestLoadingMaxRetry: 1,
        levelLoadingMaxRetry: 2,
        fragLoadingMaxRetry: 4,
        xhrSetup: (xhr: XMLHttpRequest, reqUrl: string) => {
          if (token && reqUrl.includes('tpstreams.com') && !reqUrl.includes('access_token')) {
            try { xhr.open('GET', reqUrl + (reqUrl.includes('?') ? '&' : '?') + 'access_token=' + token, true); } catch (e) {}
          }
        },
      });
      hlsInstanceRef.current = hls;

      const finish = (ok: boolean, why?: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (!ok) {
          log(`HLS ${why || 'failed'}: ${short}`);
          try { hls.destroy(); } catch (e) {}
          if (hlsInstanceRef.current === hls) hlsInstanceRef.current = null;
        } else {
          engineRef.current = 'hls';
          attemptAutoplay(video);
        }
        resolve(ok);
      };

      const timer = setTimeout(() => finish(false, 'timeout'), timeoutMs);

      hls.on(Hls.Events.FRAG_BUFFERED, () => finish(true));
      hls.on(Hls.Events.ERROR, (_e: any, data: any) => {
        if (!data.fatal) return;
        if (!settled) return finish(false, data.details || 'fatal error');
        if (retries < 3) {
          retries += 1;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) return hls.startLoad();
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) return hls.recoverMediaError();
        }
        setErrorDetails([...logRef.current]);
        setErrorMsg('Playback stopped unexpectedly. Please press Retry.');
      });

      hls.loadSource(url);
      hls.attachMedia(video);
    });

  /**
   * Main method: Shaka + Widevine DASH (works for the protected TPStreams videos).
   * Needs the software (L3) robustness list and the binary license header, otherwise many devices fail.
   */
  const tryShaka = async (resolution: StreamResolution, alive: () => boolean): Promise<boolean> => {
    const video = videoRef.current;
    if (!video || !resolution.dashUrl) return false;
    const sk: any = shaka;
    try {
      sk.polyfill.installAll();
      if (!sk.Player.isBrowserSupported()) { log('Shaka not supported in this browser'); return false; }

      const player = new sk.Player();
      await player.attach(video);
      shakaInstanceRef.current = player;

      if (resolution.drmLicenseUrl) {
        player.configure({
          drm: {
            servers: {
              'com.widevine.alpha': resolution.drmLicenseUrl,
              'com.microsoft.playready': resolution.drmLicenseUrl,
            },
            advanced: {
              'com.widevine.alpha': {
                videoRobustness: ['SW_SECURE_CRYPTO', 'SW_SECURE_DECODE'],
                audioRobustness: ['SW_SECURE_CRYPTO', 'SW_SECURE_DECODE'],
              },
            },
          },
        });
        player.getNetworkingEngine()?.registerRequestFilter((type: number, request: any) => {
          if (type === 2) {
            request.headers['Content-Type'] = 'application/octet-stream';
            request.allowCrossSiteCredentials = false;
          }
        });
      } else {
        log('no DRM key available, trying DASH without it');
      }

      player.configure({
        manifest: { dash: { ignoreMinBufferTime: true } },
        streaming: {
          bufferingGoal: 20,
          rebufferingGoal: 2,
          bufferBehind: 30,
          retryParameters: { maxAttempts: 3, baseDelay: 1000, backoffFactor: 2, fuzzFactor: 0.5, timeout: 10000 },
        },
      });

      let loaded = false;
      player.addEventListener('error', (event: any) => {
        const d = event?.detail;
        if (!d || d.severity !== 2 || !loaded || !alive()) return; // only fatal errors after start
        console.warn('Shaka fatal error', d);
        setErrorDetails([...logRef.current, `shaka ${d.code}`]);
        setErrorMsg([6001, 6006, 6007, 6008, 6012].includes(d.code)
          ? 'This browser does not support the secure (Widevine) player. Please use Chrome, Edge or an Android browser.'
          : `Playback error (${d.code || 'DRM'}). Please press Retry.`);
        setIsLoading(false);
      });

      await withTimeout(player.load(resolution.dashUrl), 25000);
      if (!alive()) { try { await player.destroy(); } catch (_) {} return false; }
      loaded = true;
      engineRef.current = 'shaka';
      return true;
    } catch (e: any) {
      log(`DASH/Widevine failed: ${e?.message || e?.code || 'error'}`);
      try { await shakaInstanceRef.current?.destroy(); } catch (_) {}
      shakaInstanceRef.current = null;
      return false;
    }
  };

  const initPlayerEngine = async () => {
    const runId = ++runIdRef.current;
    const alive = () => runId === runIdRef.current;
    logRef.current = [];
    clearTimeout(watchdogRef.current);
    setIsLoading(true);
    setIsBuffering(false);
    setErrorMsg(null);
    setErrorDetails([]);
    setWebUrl(null);
    setStage(0);
    setQuality('auto');
    setCaption('off');
    setSettingsOpen(false);
    await cleanupEngines();
    if (!alive()) return;

    const fail = (msg: string) => { if (alive()) failNow(msg); };
    const succeed = () => {
      if (!alive()) return;
      clearTimeout(watchdogRef.current);
      setIsLoading(false);
    };

    // Never let the loader spin forever
    watchdogRef.current = setTimeout(() => fail('This video is taking too long to start.'), 70000);

    try {
      const video = videoRef.current;
      if (!video) return fail('Player is not ready.');
      video.muted = false;
      video.volume = volume;
      setIsMuted(false);

      setStage(1);
      const resolution = await resolveVideoStream(lesson.assetId || '', lesson.playerUrl || '', lesson.title, courseId, log);
      if (!alive()) return;
      setStreamInfo(resolution);
      setStage(2);

      // New video API only. Try what the API gave us, simplest first:
      // 1) HLS link  2) DASH (+Widevine when a token came back)  3) plain mp4  4) the API's web player page
      for (const url of resolution.hlsCandidates) {
        if (!alive()) return;
        await cleanupEngines();
        if (await playHls(url, resolution.drmToken, 15000)) return succeed();
      }
      if (!alive()) return;

      if (resolution.dashUrl && (await tryShaka(resolution, alive))) {
        if (!alive()) return;
        attemptAutoplay(video);
        return succeed();
      }
      if (!alive()) return;

      if (resolution.directMediaUrl) {
        await cleanupEngines();
        video.src = resolution.directMediaUrl;
        engineRef.current = 'file';
        attemptAutoplay(video);
        return succeed();
      }

      if (resolution.pageUrl) {
        // own player could not get a stream: show the targetboard player inside the app.
        // First time it asks for login; the browser keeps that login for this site, so next classes start directly.
        log('built-in player could not get a stream; using the web player inside the app');
        setWebUrl(resolution.pageUrl);
        return succeed();
      }

      fail(lesson.assetId
        ? 'The video server did not answer (the free API host may be blocking this site). Press Retry in a few seconds.'
        : 'This lesson has no video id, so it cannot be played.');
    } catch (err: any) {
      log(`unexpected: ${err?.message || err}`);
      fail('This video could not be loaded right now.');
    }
  };

  // When the built-in player fails, make sure the web-player link (api.php?video=) is ready for the buttons
  useEffect(() => {
    setLazyPage('');
  }, [lesson.id, lesson.assetId]);
  useEffect(() => {
    if (!errorMsg || streamInfo?.pageUrl || !lesson.assetId) return;
    let live = true;
    fetchVideoInfo(lesson.assetId).then((i) => { if (live && i?.pageUrl) setLazyPage(i.pageUrl); });
    return () => { live = false; };
  }, [errorMsg, lesson.assetId, streamInfo?.pageUrl]);

  useEffect(() => {
    initPlayerEngine();
    return () => {
      runIdRef.current++;
      clearTimeout(watchdogRef.current);
      cleanupEngines();
    };
  }, [lesson.id, lesson.assetId]);

  // Video element listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTime = () => {
      setCurrentTime(video.currentTime);
      const b = video.buffered;
      if (b.length) setBuffered(b.end(b.length - 1));
    };
    const onMeta = () => setDuration(video.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => { setIsPlaying(false); if (onNext && hasNext) onNext(); };
    const onError = () => {
      // engines clear the src while switching sources; that fires a harmless error
      if (!video.currentSrc || !video.error || video.error.code === 1) return;
      if (hlsInstanceRef.current || shakaInstanceRef.current) return; // the engine handles its own recovery
      setIsLoading(false);
      setErrorDetails([...logRef.current, `media error ${video.error.code}`]);
      setErrorMsg('The video could not be played. Please try again.');
    };
    const onPlaying = () => { setErrorMsg(null); setIsLoading(false); setIsBuffering(false); };
    const onWaiting = () => { if (!video.paused) setIsBuffering(true); };
    const onCanPlay = () => setIsBuffering(false);

    video.addEventListener('timeupdate', onTime);
    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('durationchange', onMeta);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('durationchange', onMeta);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
    };
  }, [onNext, hasNext]);

  // Fullscreen state + clean-up of orientation lock
  useEffect(() => {
    const onFs = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (!fs) {
        try { (screen as any).orientation?.unlock?.(); } catch (e) {}
        setRotateMode((m) => (m === 'native' ? 'none' : m));
      }
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // Lock page scroll while the CSS-rotated player is open
  useEffect(() => {
    if (rotateMode !== 'css') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [rotateMode]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      else if (e.code === 'ArrowLeft') { e.preventDefault(); seekDelta(-10); }
      else if (e.code === 'ArrowRight') { e.preventDefault(); seekDelta(10); }
      else if (e.code === 'KeyM') { e.preventDefault(); toggleMute(); }
      else if (e.code === 'KeyF') { e.preventDefault(); toggleFullscreen(); }
      else if (e.code === 'KeyR') { e.preventDefault(); toggleRotate(); }
      else if (e.code === 'Escape' && rotateMode === 'css') setRotateMode('none');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPlaying, isMuted, volume, rotateMode]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {}); else v.pause();
  };

  const seekDelta = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const t = Number(e.target.value);
    v.currentTime = t;
    setCurrentTime(t);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const val = Number(e.target.value);
    v.volume = val;
    v.muted = val === 0;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const handleSpeedChange = (spd: number) => {
    const v = videoRef.current;
    if (!v) return;
    const val = Math.min(3, Math.max(0.25, Math.round(spd * 20) / 20));
    v.playbackRate = val;
    setPlaybackSpeed(val);
  };

  // ---- Settings sheet helpers (quality / captions / download) ----
  const getQualityOptions = (): { height: number; label: string }[] => {
    const hls = hlsInstanceRef.current;
    const pl = shakaInstanceRef.current;
    const heights = new Set<number>();
    try {
      if (hls?.levels?.length) hls.levels.forEach((l: any) => { if (l.height) heights.add(l.height); });
      else if (pl) pl.getVariantTracks().forEach((t: any) => { if (t.height) heights.add(t.height); });
    } catch (e) { /* engine busy */ }
    return [...heights].sort((a, b) => b - a).map((h) => ({ height: h, label: `${h}p` }));
  };

  const applyQuality = (q: 'auto' | number) => {
    const hls = hlsInstanceRef.current;
    const pl = shakaInstanceRef.current;
    try {
      if (hls) {
        if (q === 'auto') hls.currentLevel = -1;
        else {
          let idx = -1;
          hls.levels.forEach((l: any, i: number) => { if (l.height === q && (idx < 0 || l.bitrate > hls.levels[idx].bitrate)) idx = i; });
          if (idx >= 0) hls.currentLevel = idx;
        }
      } else if (pl) {
        if (q === 'auto') pl.configure({ abr: { enabled: true } });
        else {
          const best = pl.getVariantTracks().filter((t: any) => t.height === q).sort((a: any, b: any) => b.bandwidth - a.bandwidth)[0];
          if (best) { pl.configure({ abr: { enabled: false } }); pl.selectVariantTrack(best, true); }
        }
      }
      setQuality(q);
    } catch (e) {
      showToast('Quality could not be changed.');
    }
    setSettingsView('main');
  };

  const getCaptionOptions = (): { id: string; label: string }[] => {
    const hls = hlsInstanceRef.current;
    const pl = shakaInstanceRef.current;
    try {
      if (hls?.subtitleTracks?.length) return hls.subtitleTracks.map((t: any, i: number) => ({ id: String(i), label: t.name || t.lang || `Track ${i + 1}` }));
      if (pl) return pl.getTextTracks().map((t: any) => ({ id: String(t.id), label: t.label || t.language || 'Captions' }));
    } catch (e) { /* engine busy */ }
    return [];
  };

  const applyCaption = (id: string) => {
    const hls = hlsInstanceRef.current;
    const pl = shakaInstanceRef.current;
    try {
      if (hls) {
        if (id === 'off') hls.subtitleTrack = -1;
        else { hls.subtitleDisplay = true; hls.subtitleTrack = Number(id); }
      } else if (pl) {
        if (id === 'off') pl.setTextTrackVisibility(false);
        else {
          const t = pl.getTextTracks().find((x: any) => String(x.id) === id);
          if (t) { pl.selectTextTrack(t); pl.setTextTrackVisibility(true); }
        }
      }
      setCaption(id);
    } catch (e) {
      showToast('Captions could not be changed.');
    }
    setSettingsView('main');
  };

  // Only plain video files can be saved. Protected (DRM) streams cannot be downloaded.
  const handleDownload = () => {
    const url = streamInfo?.directMediaUrl || '';
    const plain = engineRef.current === 'file' && !!url && !url.includes('.m3u8') && !url.includes('.mpd');
    setSettingsOpen(false);
    if (!plain) { showToast('Download is not available for this video.'); return; }
    const a = document.createElement('a');
    a.href = url; a.download = ''; a.target = '_blank'; a.rel = 'noreferrer';
    document.body.appendChild(a); a.click(); a.remove();
  };

  const toggleFullscreen = () => {
    const el: any = containerRef.current;
    const v: any = videoRef.current;
    if (rotateMode === 'css') { setRotateMode('none'); return; }
    if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
    if (el?.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (v?.webkitEnterFullscreen) v.webkitEnterFullscreen(); // iPhone
  };

  /**
   * Rotate: real fullscreen + landscape lock where the browser allows it (Android Chrome),
   * otherwise a CSS-rotated full-screen player (iPhone, in-app browsers).
   */
  const toggleRotate = async () => {
    const el: any = containerRef.current;
    if (!el) return;

    if (rotateMode === 'css') { setRotateMode('none'); return; }
    if (rotateMode === 'native') {
      try { (screen as any).orientation?.unlock?.(); } catch (e) {}
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      setRotateMode('none');
      return;
    }

    try {
      if (!el.requestFullscreen) throw new Error('no fullscreen api');
      if (!document.fullscreenElement) await el.requestFullscreen();
      await (screen as any).orientation.lock('landscape');
      setRotateMode('native');
    } catch {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      setRotateMode('css');
    }
  };

  const togglePiP = async () => {
    const v: any = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (document.pictureInPictureEnabled) await v.requestPictureInPicture();
    } catch (e) {
      console.warn('PiP error:', e);
    }
  };

  const showControls = () => {
    setControlsVisible(true);
    clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) { setControlsVisible(false); }
    }, 3500);
  };

  // Single tap = show/hide controls, double tap on the left/right half = seek 10s
  const handleStageTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-controls]')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rotated = rotateMode === 'css';
    const pos = rotated ? (e.clientY - rect.top) / rect.height : (e.clientX - rect.left) / rect.width;
    const now = Date.now();
    const last = lastTapRef.current;
    clearTimeout(tapTimerRef.current);

    if (now - last.t < 280) {
      lastTapRef.current = { t: 0, x: 0 };
      const side: 'left' | 'right' = pos < 0.5 ? 'left' : 'right';
      seekDelta(side === 'left' ? -10 : 10);
      setSeekFlash({ side, key: now });
      setTimeout(() => setSeekFlash(null), 650);
      return;
    }
    lastTapRef.current = { t: now, x: pos };
    tapTimerRef.current = setTimeout(() => {
      if (controlsVisible && isPlaying) setControlsVisible(false);
      else if (!controlsVisible) showControls();
      else togglePlay();
    }, 260);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPct = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration ? Math.min(100, (buffered / duration) * 100) : 0;
  const cssRotated = rotateMode === 'css';
  const immersive = cssRotated || isFullscreen;

  const stageStyle: React.CSSProperties = cssRotated
    ? {
        position: 'fixed', top: 0, left: 0, zIndex: 100,
        width: '100dvh', height: '100dvw',
        transformOrigin: 'top left',
        transform: 'translateX(100dvw) rotate(90deg)',
      }
    : {};

  return (
    <div className="space-y-4 w-full animate-fade-in">

      {/* Video stage */}
      <div
        ref={containerRef}
        style={stageStyle}
        onMouseMove={showControls}
        onTouchStart={showControls}
        onClick={handleStageTap}
        className={`group select-none overflow-hidden bg-black ${
          immersive
            ? 'w-full h-full'
            : flush
              ? 'relative w-full aspect-video lg:rounded-2xl'
              : 'relative w-full aspect-video rounded-2xl border border-white/10 shadow-xl'
        }`}
      >
        <video
          ref={videoRef}
          playsInline
          poster={posterUrl || undefined}
          className="absolute inset-0 w-full h-full object-contain"
        />

        {/* Brand tag */}
        <div className="absolute top-3 right-3 z-20 pointer-events-none flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/50 text-[11px] font-semibold text-white/80">
          <img src={OFFICIAL_LOGO} alt="" className="w-4 h-4 rounded-full object-cover" />
          <span>STUDYMODSHRRY</span>
        </div>

        {/* Title (+ close button when rotated) */}
        <div className={`absolute top-3 left-3 right-28 z-20 flex items-center gap-2 transition-opacity duration-300 ${controlsVisible || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} data-controls>
          {cssRotated && (
            <button onClick={() => setRotateMode('none')} className="p-1.5 rounded-lg bg-black/60 border border-white/10 text-white cursor-pointer" aria-label="Exit full screen">
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="min-w-0 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs text-white truncate">
            <span className="font-bold">{splitTitle(lesson.title).main}</span>
          </div>
        </div>

        {/* Double-tap seek feedback */}
        {seekFlash && (
          <div
            key={seekFlash.key}
            className={`absolute top-1/2 -translate-y-1/2 z-20 pointer-events-none animate-fade-in px-4 py-3 rounded-full bg-black/60 text-white text-sm font-bold ${seekFlash.side === 'left' ? 'left-[12%]' : 'right-[12%]'}`}
          >
            {seekFlash.side === 'left' ? '−10s' : '+10s'}
          </div>
        )}

        {isLoading && <PlayerLoader stage={stage} title={splitTitle(lesson.title).main} />}

        {isBuffering && !isLoading && !errorMsg && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="tb-spin w-11 h-11 rounded-full border-[3px] border-white/20 border-t-blue-400" />
          </div>
        )}

        {toast && !errorMsg && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 rounded-lg bg-black/75 text-[11px] text-white pointer-events-none text-center max-w-[90%]">{toast}</div>
        )}

        {webUrl && !errorMsg && (
          <div className="absolute inset-0 z-30 bg-black" data-controls>
            <img src={VIDEO_THUMBNAIL} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 px-2 pb-1.5 pt-6 bg-gradient-to-t from-black/80 to-transparent">
              <a
                href={webUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); openInChrome(webUrl); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFD60A] text-[#1A1405] font-extrabold text-[12px] whitespace-nowrap shadow-lg active:scale-95 transition-transform"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Watch On Official Player</span>
              </a>
              <button
                onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(webUrl).then(() => showToast('Link copied. Paste it in Chrome.')).catch(() => {}); }}
                className="px-2.5 py-1.5 rounded-lg bg-white/20 text-white font-bold text-[11px] whitespace-nowrap cursor-pointer"
                aria-label="Copy link"
              >
                Copy link
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); initPlayerEngine(); }}
                className="px-2 py-1.5 rounded-lg bg-white/20 text-white font-bold text-xs cursor-pointer"
                aria-label="Retry"
              >
                <ReloadIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="absolute inset-0 z-30 bg-[#0E0F13]/95 backdrop-blur-md flex flex-col items-center justify-center p-5 text-center animate-fade-in overflow-y-auto" data-controls>
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white font-heading">Video unavailable</h4>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm">{errorMsg}</p>
            <div className="flex items-center justify-center gap-2 flex-wrap mt-4">
              <button
                onClick={(e) => { e.stopPropagation(); initPlayerEngine(); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-[#1A1405] font-bold text-xs shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
              >
                <ReloadIcon className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
              {(streamInfo?.pageUrl || lazyPage) && (
                <button
                  onClick={(e) => { e.stopPropagation(); setErrorMsg(null); setWebUrl(streamInfo?.pageUrl || lazyPage); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-[#1A1405] font-bold text-xs transition-all cursor-pointer"
                >
                  <span>Web player</span>
                </button>
              )}
              {(streamInfo?.pageUrl || lazyPage || streamInfo?.directPlayerLink) && (
                <a
                  href={streamInfo?.pageUrl || lazyPage || streamInfo?.directPlayerLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in new tab</span>
                </a>
              )}
            </div>
            {lesson.assetId && !(streamInfo?.pageUrl || lazyPage) && (
              <div className="mt-3 max-w-sm text-[11px] text-zinc-400">
                <a
                  href={`${API_BASE}?video=${encodeURIComponent(lesson.assetId)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-[#1A1405] font-bold text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Get video link (manual)</span>
                </a>
                <p className="mt-1.5">Opens the API in your own browser (it passes the host check there). Tap the <b>video_url</b> inside to watch.</p>
              </div>
            )}
            {errorDetails.length > 0 && (
              <details className="mt-4 max-w-sm w-full text-left">
                <summary className="text-[11px] text-zinc-500 cursor-pointer text-center">Technical details</summary>
                <ul className="mt-2 p-2.5 rounded-lg bg-black/50 border border-white/5 text-[10px] font-mono text-zinc-400 space-y-0.5 break-all">
                  {errorDetails.map((d, i) => <li key={i}>• {d}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}

        {/* Settings sheet: Quality / Captions / Playback speed / Download */}
        {settingsOpen && (() => {
          const qOpts = getQualityOptions();
          const cOpts = getCaptionOptions();
          const qLabel = quality === 'auto' ? 'Auto' : `${quality}p`;
          const cLabel = caption === 'off' ? 'Off' : (cOpts.find((o) => o.id === caption)?.label || 'On');
          const row = (Icon: React.ElementType, label: string, value: string, onClick: () => void) => (
            <button key={label} onClick={onClick} className="w-full flex items-center gap-4 px-6 py-3.5 text-left active:bg-black/5 cursor-pointer">
              <Icon className="w-5 h-5 text-[#333] shrink-0" />
              <span className="flex-1 text-[15px] font-medium">{label}</span>
              {value && <span className="text-[14px] text-black/55">{value}</span>}
              <ChevronRight className="w-4 h-4 text-black/35 shrink-0" />
            </button>
          );
          const sub = (title: string) => (
            <button onClick={() => setSettingsView('main')} className="flex items-center gap-2 px-4 py-3 text-[15px] font-bold cursor-pointer">
              <ChevronLeft className="w-5 h-5" /> {title}
            </button>
          );
          const opt = (key: string, label: string, on: boolean, onClick: () => void) => (
            <button key={key} onClick={onClick} className="w-full flex items-center justify-between px-6 py-3 text-left text-[15px] active:bg-black/5 cursor-pointer">
              <span className={on ? 'font-bold' : 'font-medium'}>{label}</span>
              {on && <Check className="w-4 h-4 text-emerald-600" />}
            </button>
          );
          const node = (
            <div data-controls className={`${immersive ? 'absolute' : 'fixed'} inset-0 z-[1000] flex items-end justify-center`} onClick={(e) => { e.stopPropagation(); setSettingsOpen(false); }}>
              <div className="absolute inset-0 bg-black/45" />
              <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-md max-h-[92%] overflow-y-auto rounded-t-3xl bg-white text-[#111] shadow-2xl animate-fade-in"
                style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
              >
                <div className="mx-auto mt-2.5 mb-1 h-1 w-10 rounded-full bg-black/15" />

                {settingsView === 'main' && (
                  <div className="py-1">
                    {row(SlidersHorizontal, 'Quality', qLabel, () => setSettingsView('quality'))}
                    {row(Captions, 'Captions', cLabel, () => setSettingsView('captions'))}
                    {row(Gauge, 'Playback Speed', `${playbackSpeed.toFixed(2)}x`, () => setSettingsView('speed'))}
                    <button onClick={handleDownload} className="w-full flex items-center gap-4 px-6 py-3.5 text-left active:bg-black/5 cursor-pointer">
                      <Download className="w-5 h-5 text-[#333] shrink-0" />
                      <span className="flex-1 text-[15px] font-medium">Download</span>
                    </button>
                  </div>
                )}

                {settingsView === 'quality' && (
                  <div className="pb-2">
                    {sub('Quality')}
                    {opt('auto', 'Auto', quality === 'auto', () => applyQuality('auto'))}
                    {qOpts.map((o) => opt(String(o.height), o.label, quality === o.height, () => applyQuality(o.height)))}
                    {qOpts.length === 0 && <p className="px-6 pb-3 text-xs text-black/55">Only automatic quality is available for this video.</p>}
                  </div>
                )}

                {settingsView === 'captions' && (
                  <div className="pb-2">
                    {sub('Captions')}
                    {opt('off', 'Off', caption === 'off', () => applyCaption('off'))}
                    {cOpts.map((o) => opt(o.id, o.label, caption === o.id, () => applyCaption(o.id)))}
                    {cOpts.length === 0 && <p className="px-6 pb-3 text-xs text-black/55">No captions are available for this video.</p>}
                  </div>
                )}

                {settingsView === 'speed' && (
                  <div className="pb-3">
                    {sub('Playback Speed')}
                    <p className="text-center text-3xl font-heading font-bold tabular-nums py-2">{playbackSpeed.toFixed(2)}x</p>
                    <div className="flex items-center gap-3 px-6">
                      <button onClick={() => handleSpeedChange(playbackSpeed - 0.05)} aria-label="Slower" className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center cursor-pointer"><Minus className="w-4 h-4" /></button>
                      <input
                        type="range" min={0.25} max={3} step={0.05} value={playbackSpeed}
                        onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                        aria-label="Playback speed" className="flex-1 accent-[#F4A100] cursor-pointer"
                      />
                      <button onClick={() => handleSpeedChange(playbackSpeed + 0.05)} aria-label="Faster" className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center cursor-pointer"><Plus className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-5 gap-2 px-5 pt-4">
                      {[1, 1.25, 1.5, 2, 3].map((v) => (
                        <button
                          key={v}
                          onClick={() => handleSpeedChange(v)}
                          className={`h-10 rounded-full text-sm font-semibold cursor-pointer border ${playbackSpeed === v ? 'bg-[#111] text-white border-[#111]' : 'border-black/20'}`}
                        >
                          {v.toFixed(v === 1.25 ? 2 : 1)}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-black/50 px-5 pt-1.5">1.0 = Normal</p>
                  </div>
                )}
              </div>
            </div>
          );
          // Normal view: draw the sheet on <body> so nothing in the page (video list cards etc.) can paint over it.
          // Full screen / rotated view: keep it inside the player, which is the only thing visible there.
          return immersive || typeof document === 'undefined' ? node : createPortal(node, document.body);
        })()}

        {/* Big play button */}
        {!isPlaying && !isLoading && !errorMsg && (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-6 bg-black/25" data-controls>
            <button onClick={(e) => { e.stopPropagation(); seekDelta(-10); }} className="sm:hidden p-2.5 rounded-full bg-black/55 text-white cursor-pointer" aria-label="Back 10 seconds">
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              className="p-4 rounded-full bg-blue-600/95 text-[#1A1405] shadow-2xl hover:scale-110 transition-transform cursor-pointer"
              aria-label="Play"
            >
              <Play className="w-8 h-8 fill-current ml-0.5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); seekDelta(10); }} className="sm:hidden p-2.5 rounded-full bg-black/55 text-white cursor-pointer" aria-label="Forward 10 seconds">
              <RotateCw className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Controls */}
        <div
          data-controls
          className={`absolute bottom-0 inset-x-0 z-20 px-3 sm:px-4 pb-2.5 pt-8 bg-gradient-to-t from-black via-black/70 to-transparent transition-opacity duration-300 ${
            controlsVisible || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Seek bar */}
          <div className="relative h-5 flex items-center">
            <div className="absolute inset-x-0 h-1 rounded-full bg-white/20 overflow-hidden pointer-events-none">
              <div className="absolute inset-y-0 left-0 bg-white/25" style={{ width: `${bufferedPct}%` }} />
              <div className="absolute inset-y-0 left-0 bg-blue-500" style={{ width: `${progressPct}%` }} />
            </div>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step="any"
              value={currentTime}
              onChange={handleSeekChange}
              aria-label="Seek"
              className="relative w-full h-5 opacity-0 cursor-pointer"
            />
            <div
              className="absolute w-3 h-3 -ml-1.5 rounded-full bg-blue-400 shadow pointer-events-none"
              style={{ left: `${progressPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-1 text-white text-xs mt-0.5">
            <div className="flex items-center gap-0.5 sm:gap-1.5 min-w-0">
              <button onClick={togglePlay} className="p-2 rounded-lg hover:bg-white/15 cursor-pointer" aria-label={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              </button>
              <button onClick={() => seekDelta(-10)} className="hidden sm:inline-flex p-2 rounded-lg hover:bg-white/15 text-zinc-300 cursor-pointer" aria-label="Back 10 seconds">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button onClick={() => seekDelta(10)} className="hidden sm:inline-flex p-2 rounded-lg hover:bg-white/15 text-zinc-300 cursor-pointer" aria-label="Forward 10 seconds">
                <RotateCw className="w-4 h-4" />
              </button>
              <div className="hidden sm:flex items-center gap-1">
                <button onClick={toggleMute} className="p-2 rounded-lg hover:bg-white/15 text-zinc-300 cursor-pointer" aria-label="Mute">
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input type="range" min={0} max={1} step={0.05} value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="w-16 h-1 appearance-none rounded bg-white/20 accent-blue-500 cursor-pointer" />
              </div>
              <span className="font-mono text-[10px] sm:text-[11px] text-zinc-300 ml-1 whitespace-nowrap tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
              <button
                onClick={() => { setSettingsView('main'); setSettingsOpen(true); }}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold cursor-pointer tabular-nums"
                aria-label="Settings"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden min-[400px]:inline">{playbackSpeed}x</span>
              </button>

              {/* Rotate */}
              <button
                onClick={toggleRotate}
                className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                  rotateMode !== 'none' ? 'bg-blue-500 text-[#1A1405]' : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
                aria-label="Rotate screen"
                title="Rotate (R)"
              >
                <Smartphone className="w-3.5 h-3.5 -rotate-90" />
                <span className="hidden sm:inline">{rotateMode !== 'none' ? 'Exit' : 'Rotate'}</span>
              </button>

              <button onClick={togglePiP} className="hidden sm:inline-flex p-2 rounded-lg hover:bg-white/15 text-zinc-300 cursor-pointer" aria-label="Picture in picture">
                <PictureInPicture2 className="w-4 h-4" />
              </button>

              <button onClick={toggleFullscreen} className="p-2 rounded-lg hover:bg-white/15 text-zinc-300 cursor-pointer" aria-label="Fullscreen">
                {immersive ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lesson Details & Navigation Bar below player */}
      {!hideDetails && <div className="p-4 sm:p-5 rounded-2xl bg-[#15171C]/90 border border-white/10 shadow-xl space-y-4">
        
        {/* Title & Complete Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div className="min-w-0">
            <h2 className="text-base sm:text-xl font-heading font-black text-white leading-snug">
              {splitTitle(lesson.title).main}
            </h2>
            {(splitTitle(lesson.title).context || subtitle) && (
              <p className="text-xs text-blue-300 mt-1 truncate">
                {[splitTitle(lesson.title).context, subtitle].filter(Boolean).join(' · ')}
              </p>
            )}
            {courseTitle && (
              <p className="text-xs text-zinc-500 mt-0.5 truncate">{courseTitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onToggleComplete && (
              <button
                onClick={onToggleComplete}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isCompleted
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                    : 'bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10'
                }`}
              >
                {isCompleted ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>✓ Completed</span>
                  </>
                ) : (
                  <>
                    <Circle className="w-4 h-4 text-zinc-500" />
                    <span>Mark as Complete</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Previous / Next Lesson Navigation Buttons */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <button
            onClick={onPrev}
            disabled={!hasPrev}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all ${
              hasPrev
                ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10 cursor-pointer'
                : 'bg-white/5 text-zinc-600 border border-white/5 cursor-not-allowed opacity-50'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {position ? (
            <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-semibold tabular-nums">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>{position.index} / {position.total}</span>
            </div>
          ) : <span />}

          <button
            onClick={onNext}
            disabled={!hasNext}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all ${
              hasNext
                ? 'bg-blue-600 hover:bg-blue-500 text-[#1A1405] shadow-lg shadow-blue-600/20 cursor-pointer'
                : 'bg-white/5 text-zinc-600 border border-white/5 cursor-not-allowed opacity-50'
            }`}
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>}

    </div>
  );
};
