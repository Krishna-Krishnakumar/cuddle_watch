import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Shield } from "lucide-react";

export interface MotionPoint {
  t: number; // seconds since start
  v: number; // motion intensity value
}

interface Props {
  data: MotionPoint[];
  baselineLow?: number;
  baselineHigh?: number;
}

export function MotionGraph({ data, baselineLow = 1000, baselineHigh = 2000 }: Props) {
  const latest = data[data.length - 1]?.v ?? 0;

  // Evaluate current safety index based on motion threshold limits
  const getMotionStatus = (val: number) => {
    if (val > baselineHigh) return { text: "Heavy Motion", color: "text-rose-400" };
    if (val > baselineLow) return { text: "Light Motion", color: "text-amber-400" };
    return { text: "Calm / Sleep", color: "text-accent" };
  };

  const status = getMotionStatus(latest);

  return (
    <Card className="glass-panel border-border bg-slate-900/40 shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-white/5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-200">
          <Activity className="h-4.5 w-4.5 text-accent" />
          Motion Analysis Log
        </CardTitle>
        <div className="flex items-center gap-4 text-right">
          <div>
            <div className={`text-base font-bold tracking-tight ${status.color}`}>
              {status.text}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Motion Index
            </div>
          </div>
          <div className="border-l border-white/10 pl-4">
            <div className="text-2xl font-black tracking-tight text-foreground tabular-nums">
              {Math.round(latest)}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Intensity
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="motionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="t"
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(255, 255, 255, 0.08)" }}
              />
              <YAxis
                domain={[0, 4000]}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(255, 255, 255, 0.08)" }}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(15, 23, 42, 0.9)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 12,
                  fontSize: 12,
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
                }}
                labelStyle={{ color: "var(--muted-foreground)" }}
              />
              <ReferenceLine y={baselineHigh} stroke="var(--destructive)" strokeDasharray="3 3" label={{ value: 'Danger Limit', fill: 'var(--destructive)', fontSize: 9, position: 'top' }} />
              <ReferenceLine y={baselineLow} stroke="var(--warning)" strokeDasharray="3 3" label={{ value: 'Motion Limit', fill: 'var(--warning)', fontSize: 9, position: 'top' }} />
              <Area
                type="monotone"
                dataKey="v"
                stroke="var(--accent)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#motionGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
          <span className="flex items-center gap-1">
            <Shield className="h-3.5 w-3.5 text-accent" />
            Safety baselines: {baselineLow} – {baselineHigh}
          </span>
          <span>Active streaming telemetry · 60s frame</span>
        </div>
      </CardContent>
    </Card>
  );
}