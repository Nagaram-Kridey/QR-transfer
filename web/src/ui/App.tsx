import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { LIMITS, Transfer, prepareContainer } from '../codec/core';
import type { ReceivedFile, ReceiveStats } from '../codec/core';
import { CameraDiagnostics, buildDiagnosticsExport } from '../diagnostics/camera';
import type { DiagnosticSnapshot } from '../diagnostics/camera';
import type { WorkerInput, WorkerOutput } from '../workers/messages';

const emptyStats = (): ReceiveStats => ({ state: 'IDLE', recovered: 0, total: 0, seen: 0, duplicates: 0, rejected: 0, session: '' });
const message = (error: unknown): string => error instanceof Error ? error.message : 'Something went wrong';
function download(name: string, data: BlobPart, type = 'application/octet-stream'): void {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function Sender(): React.JSX.Element {
  const [text, setText] = useState('Hello from LumenLink.');
  const [file, setFile] = useState<File | null>(null);
  const [size, setSize] = useState(256);
  const [fps, setFps] = useState(8);
  const [acknowledged, setAcknowledged] = useState(false);
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [displayed, setDisplayed] = useState(0);
  const [error, setError] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  async function draw(current: Transfer, sequence: number): Promise<void> {
    const encoded = await current.text(sequence);
    const qr = QRCode.create([{ data: encoded, mode: 'alphanumeric' }], { errorCorrectionLevel: 'M' });
    const target = canvas.current;
    if (!target) return;
    const count = qr.modules.size + 8;
    const available = Math.min(640, Math.floor(target.parentElement?.clientWidth ?? 400) - 32);
    const scale = Math.floor(available / count);
    if (scale < 2) throw new Error('This density does not fit the screen. Choose a smaller symbol size.');
    target.width = target.height = count * scale;
    const ctx = target.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, target.width, target.height);
    ctx.fillStyle = '#000';
    for (let row = 0; row < qr.modules.size; row++) {
      for (let col = 0; col < qr.modules.size; col++) {
        if (qr.modules.get(row, col)) ctx.fillRect((col + 4) * scale, (row + 4) * scale, scale, scale);
      }
    }
  }
  useEffect(() => {
    if (!playing || !transfer) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function tick(): Promise<void> {
      const start = performance.now();
      try {
        await draw(transfer!, seq.current);
        if (cancelled) return;
        seq.current++; setDisplayed(seq.current);
        timer = setTimeout(() => { void tick(); }, Math.max(0, 1000 / fps - (performance.now() - start)));
      } catch (reason) { if (!cancelled) { setError(message(reason)); setPlaying(false); } }
    }
    void tick();
    const pauseWhenHidden = (): void => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => { cancelled = true; clearTimeout(timer); document.removeEventListener('visibilitychange', pauseWhenHidden); };
  }, [playing, transfer, fps]);

  async function prepare(): Promise<void> {
    setError(''); setTransfer(null); setPreparing(true); seq.current = 0; setDisplayed(0);
    try {
      if (file && file.size > LIMITS.file) throw new Error('Choose a test file no larger than 1 MiB.');
      const bytes = file ? new Uint8Array(await file.arrayBuffer()) : new TextEncoder().encode(text);
      const prepared = new Transfer(await prepareContainer(bytes, file?.name ?? 'message.txt', file ? file.type || 'application/octet-stream' : 'text/plain'), size);
      await draw(prepared, 0); setTransfer(prepared);
    } catch (reason) { setError(message(reason)); }
    finally { setPreparing(false); }
  }
  async function exportFrames(): Promise<void> {
    if (!transfer) return;
    const frames: string[] = [];
    for (let i = 0; i < transfer.k; i++) frames.push(await transfer.text(i));
    download('lumenlink-frames.json', JSON.stringify({ format: 'lumenlink-frames-v2', frames }), 'application/json');
  }
  return <section className="panel" aria-labelledby="send-title">
    <div className="section-heading"><span className="step">01</span><div><h2 id="send-title">Send a test file</h2><p>Display here. Point the other device’s camera at the QR.</p></div></div>
    <fieldset disabled={playing || preparing}>
      <label>Choose file <input ref={fileInput} type="file" onChange={event => { setFile(event.target.files?.[0] ?? null); setTransfer(null); }} /></label>
      <label>Or write a message <textarea rows={3} value={text} disabled={file !== null} onChange={event => { setText(event.target.value); setTransfer(null); }} /></label>
      {file && <button className="secondary" onClick={() => { setFile(null); setTransfer(null); if (fileInput.current) fileInput.current.value = ''; }}>Use text instead</button>}
      <div className="settings">
        <label>Symbol size <select value={size} onChange={event => { setSize(Number(event.target.value)); setTransfer(null); }}><option value={256}>256 B · low density</option><option value={512}>512 B · medium</option><option value={1024}>1,024 B · high</option></select></label>
        <label>Playback rate <select value={fps} onChange={event => setFps(Number(event.target.value))}><option value={2}>2 fps · reduced flashing</option><option value={4}>4 fps</option><option value={8}>8 fps · default</option><option value={10}>10 fps · maximum</option></select></label>
      </div>
      <button onClick={() => { void prepare(); }}>{preparing ? 'Preparing…' : 'Prepare QR'}</button>
    </fieldset>
    <div className="qr-stage">
      <canvas ref={canvas} aria-label="Transfer QR code" hidden={!transfer} />
      {!transfer && <p className="placeholder">Your QR will appear here.<br /><small>Use a non-sensitive file, up to 1 MiB.</small></p>}
    </div>
    <label className="check"><input type="checkbox" checked={acknowledged} disabled={playing} onChange={event => setAcknowledged(event.target.checked)} />I understand that animated QR codes flash. I have checked the surroundings before playback.</label>
    <div className="actions"><button disabled={!transfer || !acknowledged} onClick={() => setPlaying(value => !value)}>{playing ? 'Pause' : 'Play QR stream'}</button><button className="secondary" disabled={!transfer || playing} onClick={() => { void exportFrames().catch(reason => setError(message(reason))); }}>Export frames</button></div>
    <p className="mono" aria-live="polite">{transfer ? `${transfer.k} symbols · ${displayed} frames displayed · cycle ${Math.floor(Math.max(0, displayed - 1) / transfer.k) + 1}` : 'No transfer prepared'}</p>
    <p className="hint">Stop manually when the receiver finishes. The sender receives no acknowledgements.</p>
    {error && <p className="error" role="alert">{error}</p>}
  </section>;
}

function CameraReceiver(): React.JSX.Element {
  const [status, setStatus] = useState('IDLE');
  const [stats, setStats] = useState<ReceiveStats>(emptyStats);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [result, setResult] = useState<ReceivedFile | null>(null);
  const [expectedKiB, setExpectedKiB] = useState(10);
  const [reportText, setReportText] = useState<string | null>(null);
  const [diagnosticsText, setDiagnosticsText] = useState<string | null>(null);
  const [diagnosticsStatus, setDiagnosticsStatus] = useState('');
  const video = useRef<HTMLVideoElement>(null);
  const runtime = useRef({ worker: null as Worker | null, stream: null as MediaStream | null, timer: 0, busy: false, scanning: false, started: 0, generation: 0, latest: emptyStats(), diagnostics: null as CameraDiagnostics | null, attemptId: 0 });

  function recordDiagnostics(action: (diagnostics: CameraDiagnostics) => void): void {
    const live = runtime.current;
    if (!live.diagnostics) return;
    try { action(live.diagnostics); }
    catch {
      live.diagnostics = null;
      setDiagnosticsText(null);
      setDiagnosticsStatus('Diagnostics unavailable. The trial observation remains exportable.');
    }
  }

  function stopHardware(): void {
    const live = runtime.current; live.generation++; live.scanning = false;
    window.clearTimeout(live.timer); live.worker?.terminate(); live.worker = null;
    live.stream?.getTracks().forEach(track => track.stop()); live.stream = null; live.busy = false;
    if (video.current) video.current.srcObject = null;
  }
  function finish(outcome: string, file?: ReceivedFile, reason?: string): void {
    const live = runtime.current;
    const now = performance.now();
    const observationText = live.started ? JSON.stringify({
      format: 'lumenlink-camera-observation-v1', outcome, reason: reason ?? '',
      elapsed_seconds: (now - live.started) / 1000,
      expected_payload_kib: expectedKiB, payload_bytes: file?.data.length ?? null,
      payload_sha256: file?.sha256 ?? null, stats: live.latest,
      browser: navigator.userAgent, recorded_at: new Date().toISOString(),
      note: 'Observation only: add device, commit, optical settings and trial metadata to the benchmark CSV.',
    }, null, 2) : null;
    let diagnosticSnapshot: DiagnosticSnapshot | undefined;
    recordDiagnostics(diagnostics => { diagnostics.finish(now); diagnosticSnapshot = diagnostics.snapshot(); });
    live.started = 0; stopHardware(); setStatus(outcome.toUpperCase());
    if (observationText) {
      // Download and hash these exact frozen UTF-8 bytes; diagnostics never
      // changes the strict v1 observation profile.
      setReportText(observationText); setDiagnosticsText(null);
      if (diagnosticSnapshot) {
        setDiagnosticsStatus('Preparing local diagnostics…');
        const generation = live.generation;
        void buildDiagnosticsExport(observationText, diagnosticSnapshot).then(exported => {
          if (generation !== runtime.current.generation) return;
          setDiagnosticsText(JSON.stringify(exported, null, 2));
          setDiagnosticsStatus('Local timing diagnostics ready. These are proxies, not physical qualification.');
        }).catch(() => {
          if (generation !== runtime.current.generation) return;
          setDiagnosticsStatus('Diagnostics unavailable. The trial observation remains exportable.');
        });
      }
    }
  }
  useEffect(() => () => stopHardware(), []);
  useEffect(() => {
    const failWhenHidden = (): void => {
      if (document.hidden && runtime.current.started) {
        const reason = 'Receiver was backgrounded during the trial.';
        setError(reason); finish('failed', undefined, reason);
      }
    };
    document.addEventListener('visibilitychange', failWhenHidden);
    return () => document.removeEventListener('visibilitychange', failWhenHidden);
  }, [expectedKiB]);

  function createWorker(onReady: () => void): Worker {
    const live = runtime.current;
    const generation = live.generation;
    const worker = new Worker(new URL('../workers/receiver.worker.ts', import.meta.url), { type: 'module' });
    live.worker = worker; live.busy = true;
    worker.onmessage = (event: MessageEvent<WorkerOutput>): void => {
      if (generation !== runtime.current.generation) return;
      const response = event.data;
      if (response.type === 'ready') { live.busy = false; onReady(); }
      if (response.type === 'idle') live.busy = false;
      if (response.type === 'scan') {
        recordDiagnostics(diagnostics => diagnostics.completed(response.metrics, performance.now()));
        live.latest = response.stats; setStats(response.stats);
      }
      if (response.type === 'progress' || response.type === 'complete') { live.latest = response.stats; setStats(response.stats); }
      if (response.type === 'progress') setWarning(response.warning ?? '');
      if (response.type === 'complete') {
        if (live.started && performance.now() - live.started >= Math.max(60, 3 * expectedKiB) * 1000) {
          const reason = 'Verification exceeded the trial timeout.';
          setError(reason); finish('timeout', undefined, reason);
        } else { setResult(response.file); finish('success', response.file); }
      }
      if (response.type === 'error') { setError(response.message); finish('failed', undefined, response.message); }
    };
    worker.onerror = (): void => {
      if (generation !== runtime.current.generation) return;
      setError('The decoder could not start. Reload and check that local WASM assets are available.'); finish('failed', undefined, 'worker error');
    };
    worker.postMessage({ type: 'start' } satisfies WorkerInput);
    return worker;
  }
  function reset(): void {
    const interruptedTrial = Boolean(runtime.current.started);
    if (interruptedTrial) finish('cancelled', undefined, 'Session reset during trial.');
    else stopHardware();
    runtime.current.started = 0; runtime.current.latest = emptyStats(); runtime.current.diagnostics = null;
    setStats(emptyStats()); setResult(null);
    if (!interruptedTrial) { setReportText(null); setDiagnosticsText(null); setDiagnosticsStatus(''); }
    setError(''); setWarning(''); setStatus('IDLE');
  }
  async function enableCamera(): Promise<void> {
    reset(); setStatus('OPENING');
    const generation = runtime.current.generation;
    try {
      if (!window.isSecureContext) throw new Error('Camera access needs HTTPS or localhost. Open the hosted HTTPS page on your phone.');
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser does not provide camera access. Try your phone’s main browser.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      if (generation !== runtime.current.generation) { stream.getTracks().forEach(track => track.stop()); return; }
      runtime.current.stream = stream;
      stream.getVideoTracks()[0].onended = () => {
        if (generation !== runtime.current.generation) return;
        setError('Camera disconnected or permission was revoked.'); finish('failed', undefined, 'camera ended');
      };
      if (video.current) { video.current.srcObject = stream; await video.current.play(); }
      if (generation !== runtime.current.generation) return;
      createWorker(() => setStatus('ARMED'));
    } catch (reason) {
      if (generation !== runtime.current.generation) return;
      setError(message(reason)); finish('failed', undefined, message(reason));
    }
  }
  function startReceiving(): void {
    const live = runtime.current;
    live.started = performance.now(); live.scanning = true; setStatus('RECEIVING');
    live.diagnostics = new CameraDiagnostics(live.started); live.attemptId = 0;
    let scratch: HTMLCanvasElement;
    let context: CanvasRenderingContext2D;
    try {
      scratch = document.createElement('canvas');
      const created = scratch.getContext('2d', { willReadFrequently: true });
      if (!created) throw new Error('Camera pixel capture is unavailable in this browser.');
      context = created;
    } catch (reason) { recordDiagnostics(diagnostics => diagnostics.initializationFailed()); setError(message(reason)); finish('failed', undefined, message(reason)); return; }
    const timeout = Math.max(60, 3 * expectedKiB) * 1000;
    function pump(): void {
      if (!live.scanning) return;
      if (performance.now() - live.started >= timeout) {
        const reason = 'Trial timed out. The failed observation can be exported.';
        setError(reason); finish('timeout', undefined, reason); return;
      }
      const source = video.current;
      if (live.busy) recordDiagnostics(diagnostics => diagnostics.busySkip());
      if (!live.busy && live.worker && source && source.readyState >= 2 && source.videoWidth) {
        let attempt: number | undefined;
        let stage: 'capture' | 'readback' | 'submit' = 'capture';
        let stageStarted = performance.now();
        try {
          const scale = Math.min(1, 960 / source.videoWidth);
          const width = Math.round(source.videoWidth * scale), height = Math.round(source.videoHeight * scale);
          attempt = ++live.attemptId;
          recordDiagnostics(diagnostics => { diagnostics.begin(stageStarted, source.videoWidth, source.videoHeight, width, height); });
          scratch.width = width; scratch.height = height;
          context.drawImage(source, 0, 0, scratch.width, scratch.height);
          recordDiagnostics(diagnostics => diagnostics.stage(attempt!, 'capture', performance.now() - stageStarted));
          stage = 'readback'; stageStarted = performance.now();
          const pixels = context.getImageData(0, 0, scratch.width, scratch.height).data;
          recordDiagnostics(diagnostics => diagnostics.stage(attempt!, 'readback', performance.now() - stageStarted));
          stage = 'submit';
          live.busy = true;
          const submittedAt = performance.now();
          live.worker.postMessage({ type: 'image', attempt_id: attempt, pixels, width: scratch.width, height: scratch.height } satisfies WorkerInput, [pixels.buffer]);
          // Only a successful dispatch is submitted. Dimensions were counted
          // before pixels.buffer became detached by transfer.
          recordDiagnostics(diagnostics => diagnostics.submitted(attempt!, submittedAt));
        } catch (reason) {
          if (attempt !== undefined) {
            recordDiagnostics(diagnostics => {
              if (stage !== 'submit') diagnostics.stage(attempt!, stage, performance.now() - stageStarted);
              diagnostics.captureFailed(attempt!, performance.now(), stage);
            });
          }
          setError(message(reason)); finish('failed', undefined, message(reason)); return;
        }
      }
      live.timer = window.setTimeout(pump, 33);
    }
    pump();
  }
  async function importFrames(file: File | undefined): Promise<void> {
    if (!file) return;
    reset(); setStatus('IMPORTING');
    const generation = runtime.current.generation;
    try {
      if (file.size > 4_000_000) throw new Error('Frame export exceeds 4 MB.');
      const exported: unknown = JSON.parse(await file.text());
      if (generation !== runtime.current.generation) return;
      if (!exported || typeof exported !== 'object' || !('format' in exported) || exported.format !== 'lumenlink-frames-v2' || !('frames' in exported) || !Array.isArray(exported.frames) || exported.frames.length > 2048) throw new Error('Invalid frame export.');
      const texts = exported.frames;
      if (texts.some(text => typeof text !== 'string' || text.length > LIMITS.text)) throw new Error('Invalid frame in export.');
      createWorker(() => {
        runtime.current.busy = true;
        runtime.current.worker?.postMessage({ type: 'texts', texts } satisfies WorkerInput);
      });
    } catch (reason) {
      if (generation !== runtime.current.generation) return;
      setError(message(reason)); finish('failed', undefined, message(reason));
    }
  }
  const active = ['OPENING', 'ARMED', 'RECEIVING', 'IMPORTING'].includes(status);
  return <section className="panel" aria-labelledby="receive-title">
    <div className="section-heading"><span className="step">02</span><div><h2 id="receive-title">Receive & verify</h2><p>Enable the camera, align the QR, then start receiving.</p></div></div>
    <div className="camera-stage"><video ref={video} muted playsInline aria-label="Camera preview" />{!active && <span>Camera is off</span>}</div>
    <div className="settings"><label>Expected test payload <select value={expectedKiB} disabled={active} onChange={event => setExpectedKiB(Number(event.target.value))}><option value={10}>10 KiB · 60 s timeout</option><option value={100}>100 KiB · 300 s timeout</option><option value={1024}>1 MiB · 3,072 s timeout</option></select></label><div className="state" aria-live="polite">{status}</div></div>
    <div className="actions"><button disabled={active} onClick={() => { void enableCamera(); }}>Enable camera</button><button disabled={status !== 'ARMED'} onClick={startReceiving}>Start receiving</button><button className="secondary" disabled={!active} onClick={() => finish('cancelled', undefined, 'User stopped receiving.')}>Stop</button><button className="secondary" onClick={reset}>Reset session</button></div>
    <progress value={stats.recovered} max={Math.max(stats.total, 1)} aria-label="Symbols recovered" />
    <p className="mono" aria-live="polite">{stats.recovered}/{stats.total} symbols · {stats.duplicates} duplicates · {stats.rejected} rejected</p>
    {warning && <p className="hint">{warning}</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {result && <div className="result"><strong>File verified</strong><p>{result.name} · {result.data.length.toLocaleString()} bytes</p><p className="hash">SHA-256 {result.sha256}</p><button onClick={() => download(result.name, result.data)}>Save verified file</button></div>}
    {reportText && <button className="secondary" onClick={() => download('camera-observation.json', reportText, 'application/json')}>Export trial observation</button>}
    {diagnosticsText && <button className="secondary" onClick={() => download('camera-diagnostics.json', diagnosticsText, 'application/json')}>Export camera diagnostics</button>}
    {diagnosticsStatus && <p className="hint" role="status">{diagnosticsStatus}</p>}
    <details><summary>Conformance testing without a camera</summary><p>Import an exported frame cycle. This checks the codec, not the optical channel.</p><label>Frame JSON <input type="file" accept="application/json,.json" disabled={active} onChange={event => { void importFrames(event.target.files?.[0]); event.target.value = ''; }} /></label></details>
  </section>;
}

export function App(): React.JSX.Element {
  return <main>
    <header><a className="brand" href={import.meta.env.BASE_URL}><span aria-hidden="true">▦</span> LumenLink</a><span className="badge">FEASIBILITY BUILD · WIRE V2</span></header>
    <div className="intro"><p className="eyebrow">SCREEN → CAMERA → FILE</p><h1>A little data.<br />A line of sight.</h1><p>Test file transfer using the screen on one device and the camera on another.</p></div>
    <aside className="notice"><strong>Experimental plaintext demo.</strong> Anyone who sees the QR stream can read the file. Use non-sensitive test data. Camera reliability and mobile support are awaiting physical trials.</aside>
    <div className="workspace"><Sender /><CameraReceiver /></div>
    <footer>No accounts. No file uploads. No analytics.<span>Keep both devices awake during a transfer. Offline installation is a later milestone.</span></footer>
  </main>;
}
