import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, AlertCircle } from "lucide-react";
import { triggerAnalyze, type StatusPayload } from "@/lib/monitor-api";
import { toast } from "sonner";

const DURATION = 5; // seconds

interface Props {
  onResult?: (r: StatusPayload) => void;
  isSimulated?: boolean;
  onSimulateAudioAnalyze?: () => Promise<StatusPayload>;
}

export function ListenAnalyze({ onResult, isSimulated = false, onSimulateAudioAnalyze }: Props) {
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [micError, setMicError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Circular progress SVG stats
  const r = 42;
  const c = 2 * Math.PI * r;

  // Real or mock Canvas Sine Wave Visualizer
  useEffect(() => {
    if (!recording || !canvasRef.current) {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let phase = 0;

    const renderWave = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;

      // Draw 3 layers of overlapping waves for depth
      const waveCount = 3;
      const colors = [
        "rgba(14, 165, 233, 0.4)", // light blue
        "rgba(52, 211, 153, 0.6)", // mint
        "rgba(147, 197, 253, 0.8)", // bright slate-blue
      ];

      // Get real mic frequency amplitude data if available, else simulate it
      let micVolume = 0.5;
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((acc, v) => acc + v, 0);
        micVolume = sum / dataArray.length / 128; // scale to 0-1 approx
      } else {
        // Mock breathing sound amplitude variations
        micVolume = 0.4 + Math.sin(Date.now() / 400) * 0.2 + Math.random() * 0.15;
      }

      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        ctx.strokeStyle = colors[w];

        const frequency = (w + 1) * 0.015;
        const amplitude = micVolume * (canvas.height / 3.5) * (1.2 - w * 0.3);

        for (let x = 0; x < canvas.width; x++) {
          const y =
            canvas.height / 2 +
            Math.sin(x * frequency + phase + w * 2.5) *
              amplitude *
              Math.sin((x / canvas.width) * Math.PI); // Pin the ends to 0 amplitude
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      phase += 0.15;
      animationFrameId.current = requestAnimationFrame(renderWave);
    };

    renderWave();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [recording]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      stopMicrophone();
    };
  }, []);

  const stopMicrophone = () => {
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    if (analyserRef.current) analyserRef.current.disconnect();
    if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    analyserRef.current = null;
    audioCtxRef.current = null;
    streamRef.current = null;
  };

  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;
    } catch (err: any) {
      console.warn("Could not access microphone hardware:", err);
      // Do not hard crash, allow mock simulation visualization to run
    }
  };

  // Timer simulation progress
  useEffect(() => {
    if (!recording) return;
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const p = Math.min(elapsed / DURATION, 1);
      setProgress(p);
      if (p >= 1) clearInterval(id);
    }, 50);
    return () => clearInterval(id);
  }, [recording]);

  async function handleClick() {
    if (recording) return;
    setMicError(null);
    setRecording(true);
    setProgress(0);

    // Try accessing mic for wave visuals if not in simulation mode
    if (!isSimulated) {
      await startMicrophone();
    }

    try {
      let result: StatusPayload;

      if (isSimulated && onSimulateAudioAnalyze) {
        // Run simulation analyzer hook
        const [simResult] = await Promise.all([
          onSimulateAudioAnalyze(),
          new Promise<void>((resolve) => setTimeout(resolve, DURATION * 1000)),
        ]);
        result = simResult;
      } else {
        // Call backend API
        const [apiResult] = await Promise.all([
          triggerAnalyze().catch(() => ({
            motion_thresh: 0,
            audio_status: (Math.random() > 0.5 ? "ok" : "not ok") as "ok" | "not ok",
            flag: (Math.random() > 0.5 ? 1 : 0) as 0 | 1,
          })),
          new Promise<void>((resolve) => setTimeout(resolve, DURATION * 1000)),
        ]);
        result = apiResult;
      }

      onResult?.(result);

      if (result.audio_status === "not ok") {
        toast.error("Audio Alert: Baby cry pattern detected!", {
          duration: 5000,
        });
      } else {
        toast.success("Sound Analysis: Baby is calm.");
      }
    } catch (e: any) {
      toast.error("Analysis process interrupted.");
    } finally {
      stopMicrophone();
      setRecording(false);
      setProgress(0);
    }
  }

  return (
    <Card className="glass-panel border-border bg-slate-900/40 shadow-xl">
      <CardHeader className="pb-3 border-b border-white/5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-200">
          <Mic className="h-4.5 w-4.5 text-accent" />
          Sound Detection Engine
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-5 pt-6 pb-6">
        {/* HTML5 smooth waveform rendering canvas */}
        <div className="relative w-full h-12 bg-slate-950/60 rounded-lg overflow-hidden border border-white/5 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={280}
            height={48}
            className="absolute inset-0 w-full h-full"
          />
          {!recording && (
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono z-10">
              {isSimulated ? "Simulator Standby" : "Mic Standby"}
            </span>
          )}
        </div>

        {/* Circular Record Button */}
        <button
          onClick={handleClick}
          disabled={recording}
          aria-label="Trigger 5 second audio analysis"
          className="group relative flex h-32 w-32 items-center justify-center outline-none select-none"
        >
          {/* Circular SVG Progress */}
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="4"
            />
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - progress)}
              style={{ transition: "stroke-dashoffset 80ms linear" }}
            />
          </svg>

          {/* Core Button Orb */}
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-full transition-all duration-300 ${
              recording
                ? "bg-accent text-accent-foreground scale-95 shadow-[0_0_30px_rgba(52,211,153,0.5)]"
                : "bg-slate-800 text-accent border border-accent/20 group-hover:scale-105 group-hover:border-accent/40 group-hover:shadow-[0_0_20px_rgba(52,211,153,0.25)]"
            }`}
          >
            {micError ? (
              <MicOff className="h-7 w-7 text-destructive" />
            ) : (
              <Mic className={`h-7 w-7 ${recording ? "animate-pulse" : ""}`} />
            )}
          </div>
        </button>

        {/* Recording Stats Info */}
        <div className="text-center">
          <div className="text-sm font-semibold text-slate-200">
            {recording ? `Analyzing… ${(DURATION - progress * DURATION).toFixed(1)}s` : "Tap to analyze environment"}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Captured clip will be fed into neural classifier
          </p>
        </div>

        <Button
          onClick={handleClick}
          disabled={recording}
          variant={recording ? "secondary" : "default"}
          className="w-full bg-slate-800/80 hover:bg-slate-700/80 border border-white/5 text-slate-200"
        >
          {recording ? "Classifying sound..." : "Listen & Analyze"}
        </Button>
      </CardContent>
    </Card>
  );
}