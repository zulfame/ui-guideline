import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  LogOut,
  Monitor,
  MonitorSmartphone,
  RefreshCw,
  Search,
  Smartphone,
} from "lucide-react";

import API from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/composite/EmptyState";
import { DensityToggle } from "@/components/density-toggle";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
};

/** Turn a raw User-Agent string into a compact "Browser · OS" label. */
function describeDevice(ua) {
  if (!ua) return { label: "Unknown device", mobile: false };
  const s = ua.toLowerCase();
  const mobile = /(iphone|android|ipad|mobile)/.test(s);
  let browser = "Browser";
  if (s.includes("edg")) browser = "Edge";
  else if (s.includes("chrome") && !s.includes("edg")) browser = "Chrome";
  else if (s.includes("safari") && !s.includes("chrome")) browser = "Safari";
  else if (s.includes("firefox")) browser = "Firefox";
  else if (s.includes("curl")) browser = "curl";
  else if (s.includes("okhttp") || s.includes("dart")) browser = "Mobile app";
  let os = "";
  if (s.includes("windows")) os = "Windows";
  else if (s.includes("mac os") || s.includes("macintosh")) os = "macOS";
  else if (s.includes("android")) os = "Android";
  else if (s.includes("iphone") || s.includes("ipad") || s.includes("ios")) os = "iOS";
  else if (s.includes("linux")) os = "Linux";
  return { label: os ? `${browser} · ${os}` : browser, mobile };
}

function StatusBadge({ row }) {
  if (row.is_current)
    return <Badge className="font-normal" data-testid={`session-status-${row.id}`}>Current</Badge>;
  if (row.revoked)
    return (
      <Badge variant="destructive" className="font-normal" data-testid={`session-status-${row.id}`}>
        Revoked
      </Badge>
    );
  if (row.is_expired)
    return (
      <Badge variant="outline" className="font-normal text-muted-foreground" data-testid={`session-status-${row.id}`}>
        Expired
      </Badge>
    );
  return (
    <Badge variant="secondary" className="font-normal" data-testid={`session-status-${row.id}`}>
      Active
    </Badge>
  );
}

export default function SessionsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRevoked, setShowRevoked] = useState(false);
  const [search, setSearch] = useState("");
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/sessions", {
        params: { include_revoked: showRevoked, limit: 500 },
      });
      setRows(data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [showRevoked]);

  useEffect(() => {
    load();
  }, [load]);

  const doRevoke = async () => {
    setActing(true);
    try {
      await API.post(`/sessions/${encodeURIComponent(revokeTarget.id)}/revoke`);
      toast.success(`Session revoked for ${revokeTarget.user_email || "user"}`);
      setRevokeTarget(null);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to revoke session");
    } finally {
      setActing(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.user_email, r.user_name, r.username, r.ip, r.user_agent]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const activeCount = useMemo(
    () => rows.filter((r) => !r.revoked && !r.is_expired).length,
    [rows],
  );

  return (
    <div className="space-y-6" data-testid="sessions-page">
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Active Sessions</CardTitle>
            <CardDescription>
              Signed-in devices across all users. Revoke a session to force that device to sign in again.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-md border px-3 py-1.5">
              <Switch
                id="show-revoked"
                checked={showRevoked}
                onCheckedChange={setShowRevoked}
                data-testid="sessions-show-revoked"
              />
              <Label htmlFor="show-revoked" className="text-sm font-normal text-muted-foreground">
                Show revoked &amp; expired
              </Label>
            </div>
            <Button variant="outline" size="sm" onClick={load} data-testid="sessions-refresh">
              <RefreshCw className="size-4" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user, email or IP..."
                className="pl-8"
                data-testid="sessions-search"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground" data-testid="sessions-active-count">
                {activeCount.toLocaleString()} active
              </span>
              <DensityToggle />
            </div>
          </div>

          <div className="rounded-md border">
            {loading ? (
              <div className="space-y-2 p-4" data-testid="sessions-loading">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <EmptyState
                variant="first-time"
                icon={MonitorSmartphone}
                title="No active sessions"
                description="There are no signed-in sessions to show right now."
              />
            ) : (
              <Table data-testid="sessions-table" className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>User</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>IP address</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length ? (
                    filtered.map((r) => {
                      const dev = describeDevice(r.user_agent);
                      const isMobile = r.token_type === "mobile";
                      const deviceText = isMobile ? (r.label || "Mobile device") : dev.label;
                      const DeviceIcon = isMobile || dev.mobile ? Smartphone : Monitor;
                      const canRevoke = !r.is_current && !r.revoked && !r.is_expired;
                      return (
                        <TableRow key={r.id} data-testid={`session-row-${r.id}`}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="flex items-center gap-2 font-medium">
                                {r.user_name || r.username || "—"}
                                {r.is_admin && (
                                  <Badge variant="outline" className="font-normal text-[10px]">Admin</Badge>
                                )}
                              </span>
                              <span className="text-xs text-muted-foreground">{r.user_email || "—"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-2 text-sm">
                              <DeviceIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                              {deviceText}
                              <Badge variant="outline" className="font-normal text-[10px] uppercase">
                                {isMobile ? "Mobile" : "Web"}
                              </Badge>
                            </span>
                          </TableCell>
                          <TableCell>
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.ip || "—"}</code>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{fmtDate(r.created_at)}</TableCell>
                          <TableCell className="text-muted-foreground">{fmtDate(r.expires_at)}</TableCell>
                          <TableCell><StatusBadge row={r} /></TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={!canRevoke}
                              onClick={() => setRevokeTarget(r)}
                              data-testid={`session-revoke-${r.id}`}
                            >
                              <LogOut className="size-4" />
                              {r.is_current ? "This device" : "Revoke"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        <span data-testid="sessions-empty-filtered">No sessions match your search.</span>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!revokeTarget} onOpenChange={(v) => !acting && !v && setRevokeTarget(null)}>
        <AlertDialogContent data-testid="session-revoke-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this session?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="px-6 py-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{revokeTarget?.user_email || "This user"}</span> will be
            signed out on that device and must log in again. This cannot be undone.
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="session-revoke-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); doRevoke(); }}
              disabled={acting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="session-revoke-confirm"
            >
              {acting ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
              Revoke session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
