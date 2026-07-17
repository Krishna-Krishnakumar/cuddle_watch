import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Thermometer, Droplets, Moon, HeartPulse, Info, X, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  temperature?: number;
  humidity?: number;
  sleepStage?: "Deep" | "Light" | "REM" | "Awake";
  heartRate?: number;
}

export function QuickStats({
  temperature = 22.4,
  humidity = 48,
  sleepStage = "Light",
  heartRate = 82,
}: Props) {
  const [activeInfo, setActiveInfo] = useState<string | null>(null);

  // Maintain local history queues for rendering real-time SVG sparklines
  const [tempHistory, setTempHistory] = useState<number[]>([22.2, 22.3, 22.4, 22.4, 22.3, 22.4]);
  const [humidHistory, setHumidHistory] = useState<number[]>([47, 48, 48, 49, 48, 48]);
  const [hrHistory, setHrHistory] = useState<number[]>([80, 82, 81, 83, 82, 82]);

  useEffect(() => {
    setTempHistory((prev) => [...prev.slice(-10), temperature]);
  }, [temperature]);

  useEffect(() => {
    setHumidHistory((prev) => [...prev.slice(-10), humidity]);
  }, [humidity]);

  useEffect(() => {
    setHrHistory((prev) => [...prev.slice(-10), heartRate]);
  }, [heartRate]);

  // Render tiny SVG sparkline path
  const renderSparkline = (points: number[], minVal: number, maxVal: number) => {
    if (points.length < 2) return null;
    const width = 60;
    const height = 18;
    const padding = 2;
    const range = maxVal - minVal || 1;
    const xStep = width / (points.length - 1);

    const coords = points.map((p, i) => {
      const x = i * xStep;
      const normalizedY = (p - minVal) / range;
      const y = height - (normalizedY * (height - padding * 2) + padding);
      return `${x},${y}`;
    });

    return (
      <svg width={width} height={height} className="opacity-60">
        <path
          d={`M ${coords.join(" L ")}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  // Clinical Evaluations & pediatric guidelines
  const getTempStatus = (t: number) => {
    if (t < 18) return { label: "Too Cold (Under 18°C)", badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20", color: "text-blue-400" };
    if (t >= 18 && t < 20) return { label: "Cool (Dress baby warm)", badgeClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20", color: "text-indigo-400" };
    if (t >= 20 && t <= 22.2) return { label: "Pediatric Ideal (20-22°C)", badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", color: "text-emerald-400" };
    if (t > 22.2 && t <= 24) return { label: "Warm room (Monitor)", badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20", color: "text-amber-400" };
    return { label: "Too Hot (Overheating Risk)", badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20", color: "text-rose-400" };
  };

  const getHumidityStatus = (h: number) => {
    if (h < 30) return { label: "Dry (Use humidifier)", badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20", color: "text-amber-400" };
    if (h >= 30 && h <= 60) return { label: "Ideal (30-60%)", badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", color: "text-emerald-400" };
    return { label: "Damp (Dehumidify)", badgeClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20", color: "text-indigo-400" };
  };

  const getSleepStageStatus = (stage: typeof sleepStage) => {
    switch (stage) {
      case "Deep": return { label: "Restorative NREM", badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/20", color: "text-purple-400" };
      case "REM": return { label: "Active dreaming", badgeClass: "bg-violet-500/10 text-violet-400 border-violet-500/20", color: "text-violet-400" };
      case "Awake": return { label: "Awake / Active", badgeClass: "bg-sky-500/10 text-sky-400 border-sky-500/20", color: "text-sky-400" };
      default: return { label: "Light sleep cycle", badgeClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20", color: "text-indigo-400" };
    }
  };

  const getHeartRateStatus = (hr: number) => {
    if (hr < 75) return { label: "Low vitals warning", badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20", color: "text-rose-400" };
    if (hr >= 75 && hr <= 115) return { label: "Normal sleep vitals", badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", color: "text-emerald-400" };
    if (hr > 115 && hr <= 130) return { label: "Active / Awake", badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20", color: "text-amber-400" };
    return { label: "Elevated (Crying Distress)", badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20", color: "text-rose-400" };
  };

  const tempStatus = getTempStatus(temperature);
  const humidStatus = getHumidityStatus(humidity);
  const sleepStatus = getSleepStageStatus(sleepStage);
  const hrStatus = getHeartRateStatus(heartRate);

  const toggleInfo = (panel: string) => {
    setActiveInfo(activeInfo === panel ? null : panel);
  };

  return (
    <div className="space-y-4">
      {/* Vitals Cards Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        
        {/* Temperature Card */}
        <Card
          onClick={() => toggleInfo("temp")}
          className={`glass-panel glass-panel-hover overflow-hidden border-border bg-slate-900/40 p-4 cursor-pointer select-none transition-all duration-300 ${
            activeInfo === "temp" ? "border-accent/40 bg-accent/5 ring-1 ring-accent/20" : ""
          }`}
        >
          <CardContent className="flex flex-col gap-3 p-0 justify-between h-full">
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Thermometer className="h-5.5 w-5.5" />
              </div>
              <div className="text-accent/50 text-emerald-400">
                {activeInfo === "temp" ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
              </div>
            </div>
            
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Nursery Temp</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h3 className={`text-2xl font-black tracking-tight ${tempStatus.color}`}>
                  {temperature.toFixed(1)}°C
                </h3>
                <div className="text-accent/50 text-xs">
                  {renderSparkline(tempHistory, 20, 25)}
                </div>
              </div>
            </div>

            <div className={`text-[10px] px-2 py-0.5 rounded-full border w-fit font-medium ${tempStatus.badgeClass}`}>
              {tempStatus.label}
            </div>
          </CardContent>
        </Card>

        {/* Humidity Card */}
        <Card
          onClick={() => toggleInfo("humidity")}
          className={`glass-panel glass-panel-hover overflow-hidden border-border bg-slate-900/40 p-4 cursor-pointer select-none transition-all duration-300 ${
            activeInfo === "humidity" ? "border-sky-400/40 bg-sky-500/5 ring-1 ring-sky-500/20" : ""
          }`}
        >
          <CardContent className="flex flex-col gap-3 p-0 justify-between h-full">
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
                <Droplets className="h-5.5 w-5.5" />
              </div>
              <div className="text-sky-400/50">
                {activeInfo === "humidity" ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Humidity</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h3 className={`text-2xl font-black tracking-tight ${humidStatus.color}`}>
                  {humidity}%
                </h3>
                <div className="text-sky-400/50 text-xs">
                  {renderSparkline(humidHistory, 30, 60)}
                </div>
              </div>
            </div>

            <div className={`text-[10px] px-2 py-0.5 rounded-full border w-fit font-medium ${humidStatus.badgeClass}`}>
              {humidStatus.label}
            </div>
          </CardContent>
        </Card>

        {/* Sleep State Card */}
        <Card
          onClick={() => toggleInfo("sleep")}
          className={`glass-panel glass-panel-hover overflow-hidden border-border bg-slate-900/40 p-4 cursor-pointer select-none transition-all duration-300 ${
            activeInfo === "sleep" ? "border-violet-400/40 bg-violet-500/5 ring-1 ring-violet-500/20" : ""
          }`}
        >
          <CardContent className="flex flex-col gap-3 p-0 justify-between h-full">
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                <Moon className="h-5.5 w-5.5" />
              </div>
              <div className="text-violet-400/50">
                {activeInfo === "sleep" ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Sleep State</p>
              <h3 className={`mt-0.5 text-2xl font-black tracking-tight ${sleepStatus.color}`}>
                {sleepStage}
              </h3>
            </div>

            <div className={`text-[10px] px-2 py-0.5 rounded-full border w-fit font-medium ${sleepStatus.badgeClass}`}>
              {sleepStatus.label}
            </div>
          </CardContent>
        </Card>

        {/* Heart Rate Card */}
        <Card
          onClick={() => toggleInfo("heart")}
          className={`glass-panel glass-panel-hover overflow-hidden border-border bg-slate-900/40 p-4 cursor-pointer select-none transition-all duration-300 ${
            activeInfo === "heart" ? "border-rose-400/40 bg-rose-500/5 ring-1 ring-rose-500/20" : ""
          }`}
        >
          <CardContent className="flex flex-col gap-3 p-0 justify-between h-full">
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                <HeartPulse className="h-5.5 w-5.5 animate-pulse" />
              </div>
              <div className="text-rose-400/50">
                {activeInfo === "heart" ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Heart Rate</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h3 className={`text-2xl font-black tracking-tight ${hrStatus.color}`}>
                  {heartRate} <span className="text-[11px] font-normal text-muted-foreground">BPM</span>
                </h3>
                <div className="text-rose-400/50 text-xs">
                  {renderSparkline(hrHistory, 60, 150)}
                </div>
              </div>
            </div>

            <div className={`text-[10px] px-2 py-0.5 rounded-full border w-fit font-medium ${hrStatus.badgeClass}`}>
              {hrStatus.label}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Expanded Clinical Guidance Panel */}
      {activeInfo && (
        <div className="glass-panel rounded-xl border border-white/5 bg-slate-900/80 p-4 backdrop-blur-md relative animate-fade-in shadow-lg">
          <button
            onClick={() => setActiveInfo(null)}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="flex gap-3 items-start pr-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
              <Info className="h-4.5 w-4.5" />
            </div>
            
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300">
                {activeInfo === "temp" && "Pediatric Nursery Temperature Guidelines"}
                {activeInfo === "humidity" && "Ideal Nursery Humidity Guidelines"}
                {activeInfo === "sleep" && "Infant Sleep Stage Clinical Insights"}
                {activeInfo === "heart" && "Normal Sleeping Heart Rate Standards"}
              </h4>
              
              <div className="text-xs text-muted-foreground leading-relaxed pt-1.5 space-y-2">
                {activeInfo === "temp" && (
                  <>
                    <p>
                      Paediatricians recommend maintaining nursery temperatures between **20°C and 22.2°C** (68°F–72°F). 
                      Overheating is a key environmental risk factor linked to **Sudden Infant Death Syndrome (SIDS)**.
                    </p>
                    <p className="text-[11px] text-accent font-medium">
                      💡 Action Plan: Keep clothing light when room is above 22°C. Avoid heavy blankets or head coverings during sleep.
                    </p>
                  </>
                )}

                {activeInfo === "humidity" && (
                  <>
                    <p>
                      The ideal relative humidity level in a nursery is **30% to 60%**. Dry air (below 30%) can dry out your baby's nasal passages, leading to congestion and throat irritation, whereas high humidity (above 60%) fosters mold, dust mites, and bacteria growth.
                    </p>
                    <p className="text-[11px] text-sky-400 font-medium">
                      💡 Action Plan: Use a cool-mist humidifier in dry winter conditions, and ventilate or dehumidify if humidity exceeds 60%.
                    </p>
                  </>
                )}

                {activeInfo === "sleep" && (
                  <>
                    <p>
                      Infants cycle through NREM (Deep/Quiet) sleep and REM (Active/Light) sleep. Infants spend up to **50% of their sleep time in REM cycle** (dreaming), compared to only 20% for adults. Frequent muscle twitches or whimpers are normal in REM sleep and do not necessarily mean the baby is waking up.
                    </p>
                    <p className="text-[11px] text-violet-400 font-medium">
                      💡 Action Plan: Avoid picking up the baby immediately during minor stirring; wait a moment to see if they transition back into deep sleep.
                    </p>
                  </>
                )}

                {activeInfo === "heart" && (
                  <>
                    <p>
                      A sleeping baby's typical heart rate ranges between **75 BPM and 115 BPM**. Vitals naturally fluctuate, rising when they transition into lighter sleep stages or are waking up. A heart rate exceeding **130 BPM** while lying still typically indicates emotional or physical distress (e.g., crying, fever, or startle reflex).
                    </p>
                    <p className="text-[11px] text-rose-400 font-medium">
                      💡 Action Plan: If the heart rate spikes alongside sound alerts, check the nursery. Vitals will normalize once comforted.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
