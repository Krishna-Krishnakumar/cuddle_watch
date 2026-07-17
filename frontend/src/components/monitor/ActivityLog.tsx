import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History, Activity, Volume2 } from "lucide-react";

export interface LogEntry {
  id: string;
  ts: Date;
  type: "Motion Detected" | "Cry Detected";
  duration: string;
  status: "Resolved" | "Active" | "Acknowledged";
}

interface Props {
  entries: LogEntry[];
}

export function ActivityLog({ entries }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <History className="h-4 w-4 text-primary" />
          Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                <TableHead className="text-[10px] uppercase tracking-wider">Timestamp</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">Event</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">Duration</TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-wider">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    No events yet. The nursery is quiet.
                  </TableCell>
                </TableRow>
              )}
              {entries.map((e) => {
                const isCry = e.type === "Cry Detected";
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {e.ts.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        {isCry ? (
                          <Volume2 className="h-3.5 w-3.5 text-destructive" />
                        ) : (
                          <Activity className="h-3.5 w-3.5 text-primary" />
                        )}
                        {e.type}
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums text-sm">{e.duration}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={
                          e.status === "Active"
                            ? "border-destructive/50 text-destructive"
                            : e.status === "Acknowledged"
                            ? "border-warning/50 text-warning"
                            : "border-accent/50 text-accent"
                        }
                      >
                        {e.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}