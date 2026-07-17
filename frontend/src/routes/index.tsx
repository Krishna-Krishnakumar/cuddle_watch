import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Baby,
  Wifi,
  WifiOff,
  Cpu,
  Volume2,
  AlertTriangle,
  History,
  Info,
} from "lucide-react";
import { LiveVideo } from "@/components/monitor/LiveVideo";
import { MotionGraph, type MotionPoint } from "@/components/monitor/MotionGraph";
import { AudioStatus } from "@/components/monitor/AudioStatus";
import { ListenAnalyze } from "@/components/monitor/ListenAnalyze";
import { ControlsPanel } from "@/components/monitor/ControlsPanel";
import { ActivityLog, type LogEntry } from "@/components/monitor/ActivityLog";
import { QuickStats } from "@/components/monitor/QuickStats";
import type { AudioStatus as Status, SettingsPayload, StatusPayload } from "@/lib/monitor-api";
import { WS_URL, API_BASE } from "@/lib/monitor-api";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nursery Monitor — Premium Baby IoT Dashboard" },
      {
        name: "description",
        content:
          "Real-time baby monitor dashboard with cry detection and motion mapping powered by a Python backend.",
      },
    ],
  }),
  component: Index,
});

type SimMode = "sleeping" | "moving" | "crying";

interface NurseryAlert {
  type: "motion" | "cry";
  message: string;
  time: string;
}

function Index() {
  const lastMotionToastRef = useRef<number>(0);
  const lastCryToastRef = useRef<number>(0);

  const triggerNurseryToast = (type: "motion" | "cry", message: string) => {
    const now = Date.now();
    const isCry = type === "cry";
    const ref = isCry ? lastCryToastRef : lastMotionToastRef;
    
    // Throttle alert toasts to fire at most once every 6 seconds to avoid flood
    if (now - ref.current < 6000) return;
    ref.current = now;

    toast.custom((t) => (
      <div className={`flex w-80 items-start gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-md transition-all duration-300 ${
        isCry
          ? "bg-rose-950/90 border-rose-500/30 text-rose-100 shadow-rose-500/10"
          : "bg-slate-900/90 border-amber-500/30 text-amber-100 shadow-amber-500/10"
      }`}>
        <AlertTriangle className={`h-5 w-5 shrink-0 animate-bounce ${
          isCry ? "text-rose-400" : "text-amber-400"
        }`} />
        <div className="flex-1 space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider">
            {isCry ? "👶 Cry Detected" : "⚠️ Motion Detected"}
          </p>
          <p className="text-[11px] opacity-80 leading-normal">{message}</p>
        </div>
        <button
          onClick={() => toast.dismiss(t)}
          className="text-xs opacity-50 hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
        >
          ✕
        </button>
      </div>
    ), { duration: 5000 });
  };
  // Telemetry state
  const [motionData, setMotionData] = useState<MotionPoint[]>(() => seedMotion());
  const [audioStatus, setAudioStatus] = useState<Status>("ok");
  const [flag, setFlag] = useState<0 | 1>(0);
  const [connected, setConnected] = useState(false);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const isWebcamActiveRef = useRef(false);

  useEffect(() => {
    isWebcamActiveRef.current = isWebcamActive;
  }, [isWebcamActive]);

  const [logs, setLogs] = useState<LogEntry[]>(() => seedLogs());

  // Quick stats variables
  const [temperature, setTemperature] = useState(22.4);
  const [humidity, setHumidity] = useState(48);
  const [sleepStage, setSleepStage] = useState<"Deep" | "Light" | "REM" | "Awake">("Light");
  const [heartRate, setHeartRate] = useState(82);

  // Hardware Simulator Mode
  const [isSimulated, setIsSimulated] = useState(false);
  const [simPreset, setSimPreset] = useState<SimMode>("sleeping");

  // Keep ref to latest variables for WebSocket or Simulator callback access
  const simulatorTimerRef = useRef<number | null>(null);

  // Settings
  const [settings, setSettings] = useState<SettingsPayload>({
    motion_buffer: 30,
    audio_threshold: 55,
    notifications: true,
  });

  // Load initial settings on mount
  useEffect(() => {
    if (isSimulated) return;
    fetch(`${API_BASE}/api/settings`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((data) => setSettings(data))
      .catch(() => console.log("Backend offline, using fallback settings."));
  }, [isSimulated]);

  // Sync settings changes to the backend in real-time
  const handleSettingsChange = async (newSettings: SettingsPayload) => {
    setSettings(newSettings);
    if (isSimulated) return;
    try {
      await fetch(`${API_BASE}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });
    } catch {
      console.warn("Could not sync settings to backend.");
    }
  };

  const handleLocalMotionUpdate = (score: number) => {
    // Process and append local webcam motion data point
    setMotionData((prev) => {
      const nextTime = (prev[prev.length - 1]?.t ?? 0) + 1;
      const nextArr = [...prev, { t: nextTime, v: score }];
      return nextArr.length > 60 ? nextArr.slice(nextArr.length - 60) : nextArr;
    });

    // Trigger local webcam motion alert toast
    if (score > baselineHigh) {
      triggerNurseryToast("motion", `Movement observed in the baby cot (Intensity: ${score})`);
    }

    // Simulate organic fluctuations in vitals based on real local webcam movement
    const isMoving = score > 1500;
    setTemperature((t) => Math.min(24, Math.max(20, t + (Math.random() - 0.5) * 0.03)));
    setHumidity((h) => Math.min(60, Math.max(40, h + Math.floor((Math.random() - 0.5) * 2))));
    setHeartRate((hr) => {
      const base = isMoving ? 115 : 82;
      return Math.floor(base + Math.sin(Date.now() / 4000) * 4 + Math.random() * 3);
    });
    setSleepStage(isMoving ? "Awake" : "Light");
  };

  // Dynamic graph bounds linked to the sensitivity buffer
  const baselineHigh = useMemo(() => settings.motion_buffer * 60, [settings.motion_buffer]);
  const baselineLow = useMemo(() => Math.round(baselineHigh / 2), [baselineHigh]);

  // 1. WebSocket Telemetry Channel (Runs if NOT in simulation mode)
  useEffect(() => {
    if (isSimulated) {
      setConnected(true);
      return;
    }

    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setConnected(true);
        console.log("Telemetry engine connected.");
      };

      ws.onmessage = (event) => {
        if (isWebcamActiveRef.current) return;
        try {
          const payload = JSON.parse(event.data);
          
          // Process and append motion data point
          const nextValue = payload.motion_thresh ?? 0;
          setMotionData((prev) => {
            const nextTime = (prev[prev.length - 1]?.t ?? 0) + 1;
            const nextArr = [...prev, { t: nextTime, v: nextValue }];
            return nextArr.length > 60 ? nextArr.slice(nextArr.length - 60) : nextArr;
          });

          // Trigger alert toasts on threshold bounds
          if (nextValue > baselineHigh) {
            triggerNurseryToast("motion", `Movement observed in the baby cot (Intensity: ${nextValue})`);
          }

          // Synchronize current Audio status
          const incomingAudio: Status = payload.audio_status;
          setAudioStatus(incomingAudio);
          setFlag(incomingAudio === "not ok" ? 1 : 0);

          if (incomingAudio === "not ok") {
            triggerNurseryToast("cry", "Cry distress patterns detected by sound analyzer.");
          }

          // Simulate organic fluctuations in vitals based on real incoming telemetry
          const isMoving = nextValue > 1000;
          setTemperature((t) => Math.min(24, Math.max(20, t + (Math.random() - 0.5) * 0.05)));
          setHumidity((h) => Math.min(60, Math.max(40, h + Math.floor((Math.random() - 0.5) * 2))));
          setHeartRate((hr) => {
            const base = isMoving ? 110 : 80;
            return Math.floor(base + Math.sin(Date.now() / 5000) * 5 + Math.random() * 3);
          });
          setSleepStage(isMoving ? "Awake" : "Light");

        } catch (err) {
          console.error("Payload parse error:", err);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        console.log("Telemetry channel offline. Reconnecting in 3s...");
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error("Telemetry error:", err);
        ws?.close();
      };
    }

    connect();

    return () => {
      ws?.close();
      clearTimeout(reconnectTimeout);
    };
  }, [isSimulated]);

  // 2. Hardware Local Simulation Engine
  useEffect(() => {
    if (!isSimulated) {
      if (simulatorTimerRef.current) clearInterval(simulatorTimerRef.current);
      return;
    }

    // Set simulator interval to push custom data to graph
    simulatorTimerRef.current = window.setInterval(() => {
      let mockMotion = 0;
      let mockAudio: Status = "ok";
      let targetHeartRate = 80;
      let targetSleep: typeof sleepStage = "Light";

      switch (simPreset) {
        case "sleeping":
          mockMotion = Math.floor(100 + Math.random() * 200);
          mockAudio = "ok";
          targetHeartRate = 74 + Math.floor(Math.random() * 4);
          targetSleep = Math.random() > 0.6 ? "Deep" : "Light";
          break;
        case "moving":
          mockMotion = Math.floor(1800 + Math.random() * 1200);
          mockAudio = "ok";
          targetHeartRate = 102 + Math.floor(Math.random() * 12);
          targetSleep = "Awake";
          break;
        case "crying":
          mockMotion = Math.floor(600 + Math.random() * 900);
          mockAudio = "not ok";
          targetHeartRate = 135 + Math.floor(Math.random() * 15);
          targetSleep = "Awake";
          break;
      }

      // Add to motion graph
      setMotionData((prev) => {
        const nextTime = (prev[prev.length - 1]?.t ?? 0) + 1;
        const nextArr = [...prev, { t: nextTime, v: mockMotion }];
        return nextArr.length > 60 ? nextArr.slice(nextArr.length - 60) : nextArr;
      });

      // Synchronize audio classify states
      setAudioStatus(mockAudio);
      setFlag(mockAudio === "not ok" ? 1 : 0);

      // Trigger simulator alert toasts on threshold bounds
      if (mockMotion > baselineHigh) {
        triggerNurseryToast("motion", `[SIMULATOR] Movement observed in the baby cot (Intensity: ${mockMotion})`);
      }

      if (mockAudio === "not ok") {
        triggerNurseryToast("cry", "[SIMULATOR] Baby cry distress patterns detected in the nursery.");
      }

      // Adjust vitals stats
      setHeartRate(targetHeartRate);
      setSleepStage(targetSleep);
      setTemperature((t) => {
        const target = simPreset === "crying" ? 22.8 : 22.2;
        return t + (target - t) * 0.05 + (Math.random() - 0.5) * 0.03;
      });
      setHumidity((h) => Math.min(60, Math.max(40, h + Math.floor((Math.random() - 0.5) * 2))));

    }, 1000);

    return () => {
      if (simulatorTimerRef.current) clearInterval(simulatorTimerRef.current);
    };
  }, [isSimulated, simPreset]);

  // Audio simulation callback (invoked when manual "Listen & Analyze" is clicked under Simulation)
  const handleSimulateAudioAnalyze = async (): Promise<StatusPayload> => {
    // If presets are crying, always return crying, else random
    const statusResult: Status = simPreset === "crying" ? "not ok" : "ok";
    return {
      motion_thresh: 0,
      audio_status: statusResult,
      flag: statusResult === "not ok" ? 1 : 0,
    };
  };

  // 3. Monitor alert events to append items to the log checklist
  useEffect(() => {
    if (audioStatus === "not ok") {
      setLogs((l) => [
        {
          id: crypto.randomUUID(),
          ts: new Date(),
          type: "Cry Detected",
          duration: "5.0s",
          status: "Active",
        },
        ...l,
      ]);
    }
  }, [audioStatus]);

  // Peak calculations
  const peakMotion = useMemo(
    () => Math.round(Math.max(0, ...motionData.map((p) => p.v))),
    [motionData],
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-accent selection:text-accent-foreground font-sans">
      <Toaster />

      {/* Futuristic Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent glow-success animate-pulse-ring">
              <Baby className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-slate-100">Nursery Monitor</h1>
                <Badge variant="secondary" className="text-[9px] bg-slate-800 text-accent border-accent/20">v2.0 PRO</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Premium Baby IoT Suite · Room 01</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Simulation Badge Indicator */}
            {isSimulated && (
              <Badge className="bg-amber-500/10 border-amber-500/20 text-amber-400 gap-1 hidden sm:flex">
                <Cpu className="h-3 w-3" />
                SIMULATOR
              </Badge>
            )}

            {/* Connection status badge */}
            <Badge
              variant="outline"
              className={
                connected
                  ? "gap-1.5 border-accent/30 text-accent bg-accent/5 shadow-[0_0_10px_rgba(52,211,153,0.1)]"
                  : "gap-1.5 border-destructive/30 text-destructive bg-destructive/5"
              }
            >
              {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {connected ? "Connected" : "Disconnected"}
            </Badge>

            <Badge variant="outline" className="hidden gap-1.5 border-white/5 bg-white/5 text-muted-foreground sm:flex font-mono">
              peak {peakMotion}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 w-full">
        
        {/* Vitals quickstats banner */}
        <QuickStats
          temperature={temperature}
          humidity={humidity}
          sleepStage={sleepStage}
          heartRate={heartRate}
        />

        {/* Core telemetry widgets section */}
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* The live video stream frame */}
            <LiveVideo
              frameSrc={`${API_BASE}/api/video-feed`}
              isSimulated={isSimulated}
              simPreset={simPreset}
              isMotionDetected={motionData[motionData.length - 1]?.v > baselineHigh}
              motionScore={motionData[motionData.length - 1]?.v ?? 0}
              onLocalMotionUpdate={handleLocalMotionUpdate}
              onWebcamToggle={setIsWebcamActive}
            />

            {/* The motion telemetry chart */}
            <MotionGraph data={motionData} baselineLow={baselineLow} baselineHigh={baselineHigh} />
          </div>
          
          <div className="space-y-6 lg:col-span-1">
            {/* Current Audio Alert state */}
            <AudioStatus status={audioStatus} flag={flag} />

            {/* Listen analyze sound clasifier */}
            <ListenAnalyze
              onResult={(r) => {
                setAudioStatus(r.audio_status);
                setFlag(r.flag);
              }}
              isSimulated={isSimulated}
              onSimulateAudioAnalyze={handleSimulateAudioAnalyze}
            />
          </div>
        </section>

        {/* Controls, simulation control panel, activity logs */}
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-6">
            
            {/* Virtual simulator hardware controller */}
            <Card className="glass-panel border-border bg-slate-900/40 p-5 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <Label htmlFor="simulator-toggle" className="flex items-center gap-2 text-sm font-semibold text-slate-200 cursor-pointer">
                  <Cpu className="h-4.5 w-4.5 text-amber-400" />
                  Hardware Simulator
                </Label>
                <Switch
                  id="simulator-toggle"
                  checked={isSimulated}
                  onCheckedChange={(checked) => {
                    setIsSimulated(checked);
                    if (checked) {
                      toast.info("Virtual Simulation Mode enabled.");
                    } else {
                      toast.success("Streaming hardware enabled.");
                    }
                  }}
                />
              </div>

              {isSimulated ? (
                <div className="pt-4 space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed flex gap-1.5 items-start">
                    <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    Simulating sensor and camera feed telemetry inputs locally. Select a baby state preset below to test dashboard alerts:
                  </p>
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    {([
                      { id: "sleeping", name: "Sleep" },
                      { id: "moving", name: "Waking" },
                      { id: "crying", name: "Crying" },
                    ] as const).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSimPreset(p.id);
                          toast.success(`Preset loaded: ${p.name}`);
                        }}
                        className={`py-2 text-[11px] font-semibold rounded-lg border transition-all ${
                          simPreset === p.id
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm"
                            : "bg-slate-950/60 text-muted-foreground border-white/5 hover:text-foreground"
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="pt-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Connected directly to active physical Python endpoints. If your macOS blocks camera access, toggle the simulator switch above to inject virtual telemetry.
                  </p>
                </div>
              )}
            </Card>

            <ControlsPanel settings={settings} onChange={handleSettingsChange} />
          </div>
          
          <div className="lg:col-span-2">
            <ActivityLog entries={logs} />
          </div>
        </section>

        {/* Footer info links */}
        <footer className="pb-6 pt-4 text-center text-[11px] text-muted-foreground font-mono">
          Nursery Hub Core · REST API <code className="text-accent bg-slate-900 px-1 py-0.5 rounded">/api/analyze</code> ·
          WebSocket <code className="text-accent bg-slate-900 px-1 py-0.5 rounded">{WS_URL}</code>
        </footer>
      </main>
    </div>
  );
}

function seedMotion(): MotionPoint[] {
  return Array.from({ length: 30 }, (_, i) => ({
    t: i,
    v: 0,
  }));
}

function seedLogs(): LogEntry[] {
  const now = Date.now();
  return [
    {
      id: "1",
      ts: new Date(now - 1000 * 60 * 12),
      type: "Cry Detected",
      duration: "5.0s",
      status: "Resolved",
    },
  ];
}