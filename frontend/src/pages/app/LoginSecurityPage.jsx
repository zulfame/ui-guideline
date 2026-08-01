import { useCallback, useEffect, useState } from "react";
import { ShieldAlert, RefreshCw, LockOpen, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/composite/EmptyState";
import { toast } from "@/components/ui/sonner";
import API from "@/lib/api";

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "—";
  }
}

export default function LoginSecurityPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/login-attempts");
      setRows(data);
    } catch {
      toast.error("Failed to load login attempts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unlock = async (row) => {
    setUnlocking(row.key);
    try {
      await API.post("/login-attempts/unlock", { key: row.key });
      toast.success(`Unlocked ${row.identifier}`);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to unlock");
    } finally {
      setUnlocking(null);
    }
  };

  const hasRows = rows.length > 0;

  return (
    <div className="space-y-6" data-testid="login-security-page">
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Login Security</CardTitle>
            <CardDescription>
              Recent failed-login activity and temporary lockouts (per IP + identifier).
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} data-testid="login-security-refresh">
            <RefreshCw className="size-4" /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !hasRows ? (
            <EmptyState
              icon={ShieldAlert}
              title="No suspicious activity"
              description="There are no recorded failed-login attempts right now."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Identifier</TableHead>
                    <TableHead>IP address</TableHead>
                    <TableHead>Failed attempts</TableHead>
                    <TableHead>Last attempt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.key} data-testid={`login-attempt-row-${r.key}`}>
                      <TableCell className="font-medium">{r.identifier}</TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.ip || "—"}</code>
                      </TableCell>
                      <TableCell>{r.fails}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(r.last_fail_at)}</TableCell>
                      <TableCell>
                        {r.is_locked ? (
                          <Badge variant="destructive" className="font-normal" data-testid={`login-attempt-status-${r.key}`}>
                            Locked until {fmtDate(r.locked_until)}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="font-normal" data-testid={`login-attempt-status-${r.key}`}>
                            Not locked
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unlock(r)}
                          disabled={unlocking === r.key}
                          data-testid={`login-attempt-unlock-${r.key}`}
                        >
                          {unlocking === r.key ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <LockOpen className="size-4" />
                          )}
                          Unlock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
