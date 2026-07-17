import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff, Video, Cpu, ShieldAlert } from "lucide-react";
import { API_BASE } from "@/lib/monitor-api";

interface Props {
  frameSrc?: string;
  isSimulated?: boolean;
  simPreset?: "sleeping" | "moving" | "crying";
  isMotionDetected?: boolean;
  motionScore?: number;
  onLocalMotionUpdate?: (score: number) => void;
  onWebcamToggle?: (active: boolean) => void;
}

type VideoFilter = "normal" | "night" | "blueprint";

export function LiveVideo({
  frameSrc,
  isSimulated = false,
  simPreset = "sleeping",
  isMotionDetected = false,
  motionScore = 0,
}: Props) {
  const [filter, setFilter] = useState<VideoFilter>("normal");
  const [showHUD, setShowHUD] = useState(true);
  const [useWebcam, setUseWebcam] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const feedUrl = frameSrc ?? `${API_BASE}/api/video-feed`;

  // Use refs to store parent callback references so that their reference identity shifts
  // do not trigger useEffect dependency restarts (which leads to recursive getUserMedia crashes)
  const onLocalMotionUpdateRef = useRef(onLocalMotionUpdate);
  const onWebcamToggleRef = useRef(onWebcamToggle);

  useEffect(() => {
    onLocalMotionUpdateRef.current = onLocalMotionUpdate;
    onWebcamToggleRef.current = onWebcamToggle;
  });

  // Notify parent of webcam state changes
  useEffect(() => {
    if (onWebcamToggleRef.current) {
      onWebcamToggleRef.current(useWebcam && !isSimulated);
    }
  }, [useWebcam, isSimulated]);

  // Local WebCam handler & pixel-diff motion analysis loop
  useEffect(() => {
    if (!useWebcam || isSimulated) {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      return;
    }

    // Create a tiny offscreen canvas for super-fast, low-overhead pixel analysis
    const analysisCanvas = document.createElement("canvas");
    analysisCanvas.width = 80;
    analysisCanvas.height = 45;
    const analysisCtx = analysisCanvas.getContext("2d");

    let active = true;
    let frameId: number;
    let lastTime = Date.now();
    let prevData: Uint8ClampedArray | null = null;

    const analyzeFrame = () => {
      if (!active) return;

      const now = Date.now();
      // Cap analysis rate to ~15 FPS to conserve user CPU cycles
      if (now - lastTime > 66) {
        lastTime = now;
        if (videoRef.current && analysisCtx) {
          try {
            analysisCtx.drawImage(videoRef.current, 0, 0, 80, 45);
            const imgData = analysisCtx.getImageData(0, 0, 80, 45);
            const data = imgData.data;

            if (prevData) {
              let diffPixels = 0;
              for (let i = 0; i < data.length; i += 4) {
                const rDiff = Math.abs(data[i] - prevData[i]);
                const gDiff = Math.abs(data[i + 1] - prevData[i + 1]);
                const bDiff = Math.abs(data[i + 2] - prevData[i + 2]);
                const brightnessDiff = (rDiff + gDiff + bDiff) / 3;

                // Threshold difference (30 / 255 represents noticeable pixel color change)
                if (brightnessDiff > 30) {
                  diffPixels++;
                }
              }

              // Scale score to match backend bounds (0 to 5000+)
              // An 80x45 canvas has 3600 pixels.
              const score = Math.round((diffPixels / 3600) * 12000);
              if (onLocalMotionUpdateRef.current) {
                onLocalMotionUpdateRef.current(score);
              }
            }
            prevData = data;
          } catch (e) {
            // Suppress errors during stream setup
          }
        }
      }
      frameId = requestAnimationFrame(analyzeFrame);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { width: 1280, height: 720 } })
      .then((stream) => {
        localStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        // Start pixel difference capture loop
        frameId = requestAnimationFrame(analyzeFrame);
      })
      .catch((err) => {
        console.error("Webcam access failed:", err);
        alert("Failed to access local device camera. Please check your browser camera permissions.");
        setUseWebcam(false);
      });

    return () => {
      active = false;
      cancelAnimationFrame(frameId);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
    };
  }, [useWebcam, isSimulated]);

  // Procedural Canvas Animation for Simulated Nursery Video Feed
  useEffect(() => {
    if (!isSimulated || !canvasRef.current) {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameCount = 0;
    // Generate static particle list for simulated baby movements
    const particles = Array.from({ length: 6 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: 4 + Math.random() * 4,
    }));

    const render = () => {
      frameCount++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Base Grid Background
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 1;
      const gridSize = 32;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      if (simPreset === "sleeping") {
        // Preset 1: Sleeping (Calm breathing circle and slow wave)
        ctx.fillStyle = "rgba(14, 165, 233, 0.05)";
        ctx.beginPath();
        const pulse = 40 + Math.sin(frameCount * 0.03) * 10;
        ctx.arc(canvas.width / 2, canvas.height / 2, pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(14, 165, 233, 0.3)";
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, pulse + 15, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "rgba(147, 197, 253, 0.9)";
        ctx.font = "bold 10px monospace";
        ctx.fillText("STATUS: BABYSLEEP // PATTERN OK", 24, canvas.height - 30);

        // Breathing sine wave
        ctx.strokeStyle = "rgba(52, 211, 153, 0.4)";
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x++) {
          const y = canvas.height - 15 + Math.sin(x * 0.015 - frameCount * 0.04) * 4;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

      } else if (simPreset === "moving") {
        // Preset 2: Moving (Simulated OpenCV motion box detection)
        ctx.fillStyle = "rgba(245, 158, 11, 0.05)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Render target tracking boxes
        particles.forEach((p, idx) => {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

          ctx.strokeStyle = `rgba(245, 158, 11, ${0.1 + Math.sin(frameCount * 0.1 + idx) * 0.2})`;
          ctx.strokeRect(p.x - p.size * 2, p.y - p.size * 2, p.size * 4, p.size * 4);
        });

        // Main highlighted target lock
        const pulse = 10 + Math.sin(frameCount * 0.2) * 2;
        const targetX = canvas.width / 2 + Math.sin(frameCount * 0.02) * 50;
        const targetY = canvas.height / 2 + Math.cos(frameCount * 0.03) * 30;

        ctx.strokeStyle = "rgba(245, 158, 11, 0.8)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(targetX - 25, targetY - 25, 50, 50);

        ctx.fillStyle = "rgba(245, 158, 11, 0.8)";
        ctx.font = "bold 9px monospace";
        ctx.fillText(`MOTION DETECTED: [x:${Math.round(targetX)}, y:${Math.round(targetY)}]`, targetX - 55, targetY - 32);

        // Corner tickmarks
        ctx.beginPath();
        ctx.moveTo(targetX - 25, targetY - 15); ctx.lineTo(targetX - 25, targetY - 25); ctx.lineTo(targetX - 15, targetY - 25);
        ctx.moveTo(targetX + 25, targetY - 15); ctx.lineTo(targetX + 25, targetY - 25); ctx.lineTo(targetX + 15, targetY - 25);
        ctx.moveTo(targetX - 25, targetY + 15); ctx.lineTo(targetX - 25, targetY + 25); ctx.lineTo(targetX - 15, targetY + 25);
        ctx.moveTo(targetX + 25, targetY + 15); ctx.lineTo(targetX + 25, targetY + 25); ctx.lineTo(targetX + 15, targetY + 25);
        ctx.stroke();

        ctx.fillStyle = "rgba(245, 158, 11, 0.9)";
        ctx.font = "bold 10px monospace";
        ctx.fillText("STATUS: WARN // ACTIVE MOTION TRACKING", 24, canvas.height - 30);

      } else if (simPreset === "crying") {
        // Preset 3: Crying (High distress audio classifier, red strobe)
        const strobe = Math.floor(Math.sin(frameCount * 0.25) * 5);
        ctx.fillStyle = `rgba(239, 68, 68, ${0.05 + Math.abs(strobe) * 0.01})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Blinking alarm text
        if (Math.floor(frameCount / 15) % 2 === 0) {
          ctx.fillStyle = "rgba(239, 68, 68, 0.95)";
          ctx.font = "black 14px sans-serif";
          ctx.fillText("⚠️ AUDIO ALERT: CRY DISTRESS DETECTED", canvas.width / 2 - 130, canvas.height / 2 - 10);
        }

        // Fast high-pitch cry waveform
        ctx.strokeStyle = "rgba(239, 68, 68, 0.6)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x++) {
          const frequency = 0.05;
          const amp = 10 + Math.random() * 20;
          const y = canvas.height / 2 + 25 + Math.sin(x * frequency - frameCount * 0.8) * amp * Math.sin((x / canvas.width) * Math.PI);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
        ctx.font = "bold 10px monospace";
        ctx.fillText("STATUS: ALARM // NEURAL DETECTED CRY", 24, canvas.height - 30);
      }

      // Compass / Camera Angle Indicator
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(canvas.width - 40, 40, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(canvas.width - 40, 20);
      ctx.lineTo(canvas.width - 40, 60);
      ctx.moveTo(canvas.width - 60, 40);
      ctx.lineTo(canvas.width - 20, 40);
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "8px monospace";
      ctx.fillText("CAM-01", canvas.width - 55, 72);

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isSimulated, simPreset]);

  const getFilterClass = () => {
    switch (filter) {
      case "night":
        return "brightness-[1.15] contrast-[1.25] saturate-[0.1] hue-rotate-[90deg] sepia-[1] invert-[0.05]";
      case "blueprint":
        return "invert-[0.9] contrast-[1.5] brightness-[1.1] hue-rotate-[180deg]";
      default:
        return "";
    }
  };

  return (
    <Card className="relative overflow-hidden border-border bg-slate-950 p-0 shadow-2xl">
      <div className={`relative aspect-video w-full overflow-hidden bg-slate-950 ${filter === "night" ? "scanline" : ""}`}>
        
        {/* Render options: Simulator | Local WebCam | Backend MJPEG Feed */}
        {isSimulated ? (
          /* Procedural Interactive Simulator Screen (No Unsplash load) */
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            className={`h-full w-full object-cover transition-all duration-300 ${getFilterClass()}`}
          />
        ) : useWebcam ? (
          /* HTML5 MediaDevices client-side camera capture */
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover transition-all duration-300 ${getFilterClass()}`}
          />
        ) : (
          /* Python FastAPI backend stream */
          <img
            src={feedUrl}
            alt="Live nursery feed"
            className={`h-full w-full object-cover transition-all duration-300 ${getFilterClass()}`}
          />
        )}

        {/* HUD overlay */}
        {showHUD && (
          <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 pointer-events-none text-xs font-mono text-emerald-400">
            {/* Top row */}
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 bg-black/60 px-2 py-1 rounded backdrop-blur">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span>FEED://CAM-01 [LIVE]</span>
                </div>
                {isSimulated && (
                  <div className="flex items-center gap-1 bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 w-fit">
                    <Cpu className="h-3 w-3" />
                    <span>SIMULATION MODE</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1 items-end bg-black/60 px-2 py-1 rounded backdrop-blur text-right">
                <div>FPS: 30.0</div>
                <div>RES: 1280x720 (16:9)</div>
              </div>
            </div>

            {/* Emergency flash overlay for crying */}
            {isSimulated && simPreset === "crying" && (
              <div className="self-center flex items-center gap-2 bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-lg font-sans font-bold shadow-lg animate-bounce animate-alert-pulse">
                <ShieldAlert className="h-4 w-4" />
                <span>BABY CRY ALERT DETECTED</span>
              </div>
            )}

            {/* Bottom HUD row */}
            <div className="flex justify-between items-end">
              <div className="bg-black/60 px-2 py-1 rounded backdrop-blur">
                <span>FILTER: {filter.toUpperCase()}</span>
              </div>
              <div className="bg-black/60 px-2 py-1 rounded backdrop-blur">
                <span>SIGNAL: {isSimulated ? "SIMULATED" : "ACTIVE"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Live HUD control buttons */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 pointer-events-auto">
          <button
            onClick={() => setShowHUD(!showHUD)}
            title={showHUD ? "Hide HUD Overlay" : "Show HUD Overlay"}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/75 border border-white/10 text-white/80 hover:bg-black hover:text-white transition-all shadow"
          >
            {showHUD ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>

          {!isSimulated && (
            <button
              onClick={() => setUseWebcam(!useWebcam)}
              title={useWebcam ? "Use Server Feed" : "Use Browser Device Camera"}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all shadow ${
                useWebcam
                  ? "bg-emerald-500 border-emerald-400 text-slate-900 hover:bg-emerald-400 glow-success"
                  : "bg-black/75 border-white/10 text-white/80 hover:bg-black hover:text-white"
              }`}
            >
              <Video className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter controls at bottom right */}
        <div className="absolute bottom-4 right-4 z-20 flex gap-1 bg-black/75 p-1 rounded-lg border border-white/10 pointer-events-auto">
          {(["normal", "night", "blueprint"] as VideoFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-[10px] font-medium rounded uppercase transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}