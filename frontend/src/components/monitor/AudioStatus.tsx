import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Volume2, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { AudioStatus as Status } from "@/lib/monitor-api";
import { cn } from "@/lib/utils";

interface Props {
  status: Status;
  flag: 0 | 1;
}

export function AudioStatus({ status, flag }: Props) {
  const isAlert = status === "not ok" || flag === 1;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Volume2 className="h-4 w-4 text-primary" />
          Sound Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 pb-6">
        <div
          className={cn(
            "flex h-28 w-28 items-center justify-center rounded-full border-2 transition-all",
            isAlert
              ? "animate-alert-pulse border-destructive/60 bg-destructive/15 text-destructive glow-danger"
              : "border-accent/50 bg-accent/10 text-accent glow-success",
          )}
        >
          {isAlert ? (
            <AlertTriangle className="h-12 w-12" strokeWidth={2.2} />
          ) : (
            <CheckCircle2 className="h-12 w-12" strokeWidth={2.2} />
          )}
        </div>

        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Status
          </div>
          <div
            className={cn(
              "mt-1 text-2xl font-semibold tracking-tight",
              isAlert ? "text-destructive" : "text-accent",
            )}
          >
            {isAlert ? "NOT OK" : "OK"}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {isAlert ? "Cry detected — check the baby" : "Baby is calm"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}