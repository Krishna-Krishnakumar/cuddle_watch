import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Gauge, Sliders } from "lucide-react";
import type { SettingsPayload } from "@/lib/monitor-api";

interface Props {
  settings: SettingsPayload;
  onChange: (s: SettingsPayload) => void;
}

export function ControlsPanel({ settings, onChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Sliders className="h-4 w-4 text-primary" />
          Controls &amp; Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Motion sensitivity */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm">
              <Gauge className="h-3.5 w-3.5 text-primary" />
              Video sensitivity buffer
            </Label>
            <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium tabular-nums text-foreground">
              {settings.motion_buffer} frames
            </span>
          </div>
          <Slider
            value={[settings.motion_buffer]}
            min={10}
            max={90}
            step={1}
            onValueChange={([v]) => onChange({ ...settings, motion_buffer: v })}
          />
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>10 (sensitive)</span>
            <span>90 (steady)</span>
          </div>
        </div>

        {/* Audio threshold */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Audio feature threshold</Label>
            <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium tabular-nums text-foreground">
              {settings.audio_threshold}
            </span>
          </div>
          <Slider
            value={[settings.audio_threshold]}
            min={0}
            max={100}
            step={1}
            onValueChange={([v]) => onChange({ ...settings, audio_threshold: v })}
          />
          <div className="relative h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent via-primary to-destructive transition-all"
              style={{ width: `${settings.audio_threshold}%` }}
            />
          </div>
        </div>

        {/* Notifications */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-3">
          <div className="flex items-center gap-3">
            <Bell className="h-4 w-4 text-primary" />
            <div>
              <div className="text-sm font-medium text-foreground">Native alerts</div>
              <div className="text-xs text-muted-foreground">System notifications on cry/motion</div>
            </div>
          </div>
          <Switch
            checked={settings.notifications}
            onCheckedChange={(v) => onChange({ ...settings, notifications: v })}
          />
        </div>
      </CardContent>
    </Card>
  );
}