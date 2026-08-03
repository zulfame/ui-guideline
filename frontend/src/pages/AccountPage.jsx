import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, LogIn, LogOut, Monitor, MonitorSmartphone, Smartphone } from "lucide-react";

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DataTableCard,
  SortableHeader,
  fmtDate,
} from "@/components/composite/DataTableCard";
import { toast } from "@/components/ui/sonner";
import API from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

/** Compact "Browser · OS" (web) or device name (mobile) from a session row. */
function deviceLabel(r) {
  if (r.token_type === "mobile") return r.label || "Mobile device";
  const s = (r.user_agent || "").toLowerCase();
  let browser = "Browser";
  if (s.includes("edg")) browser = "Edge";
  else if (s.includes("chrome")) browser = "Chrome";
  else if (s.includes("safari")) browser = "Safari";
  else if (s.includes("firefox")) browser = "Firefox";
  else if (s.includes("curl")) browser = "curl";
  let os = "";
  if (s.includes("windows")) os = "Windows";
  else if (s.includes("mac os") || s.includes("macintosh")) os = "macOS";
  else if (s.includes("android")) os = "Android";
  else if (s.includes("iphone") || s.includes("ipad")) os = "iOS";
  else if (s.includes("linux")) os = "Linux";
  return os ? `${browser} · ${os}` : browser;
}

const PW_STATUS = {
  active: { label: "Active", variant: "secondary" },
  expiring: { label: "Expiring soon", variant: "outline" },
  expired: { label: "Expired", variant: "destructive" },
};

const ACTION_META = {
  login: { label: "Login", variant: "secondary" },
  login_failed: { label: "Failed", variant: "destructive" },
  login_locked: { label: "Locked", variant: "destructive" },
};

function Field({ label, value, testId }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium" data-testid={testId}>
        {value || <span className="text-muted-foreground">—</span>}
      </p>
    </div>
  );
}

/**
 * AccountPage
 * Any authenticated user can view their profile and their own login history
 * (success + failed) sourced from the durable audit log.
 */
export default function AccountPage() {
  const { user, logout } = useAuth();
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revoking, setRevoking] = useState(null);
  const [revokeOthersOpen, setRevokeOthersOpen] = useState(false);
  const [acting, setActing] = useState(false);

  const loadActivity = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/account/login-activity", { params: { limit: 100 } });
      setActivity(data);
    } catch {
      toast.error("Failed to load login activity");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const { data } = await API.get("/account/sessions");
      setSessions(data);
    } catch {
      toast.error("Failed to load your devices");
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivity();
    loadSessions();
  }, [loadActivity, loadSessions]);

  const doRevoke = useCallback(
    async (row) => {
      setRevoking(row.id);
      try {
        await API.post(`/account/sessions/${encodeURIComponent(row.id)}/revoke`);
        if (row.is_current) {
          toast.success("Signed out this device");
          logout();
          return;
        }
        toast.success("Device signed out");
        await loadSessions();
      } catch (e) {
        toast.error(e?.response?.data?.detail || "Failed to sign out device");
      } finally {
        setRevoking(null);
      }
    },
    [loadSessions, logout],
  );

  const doRevokeOthers = async () => {
    setActing(true);
    try {
      const { data } = await API.post("/account/sessions/revoke-others");
      toast.success(`Signed out ${data.revoked} other device(s)`);
      setRevokeOthersOpen(false);
      await loadSessions();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to sign out other devices");
    } finally {
      setActing(false);
    }
  };

  const otherCount = useMemo(() => sessions.filter((s) => !s.is_current).length, [sessions]);

  const pwMeta = PW_STATUS[user?.password_status] || PW_STATUS.active;
  const expires = user?.password_expires_at
    ? new Date(user.password_expires_at).toLocaleDateString()
    : "—";

  const columns = useMemo(
    () => [
      {
        accessorKey: "created_at",
        header: ({ column }) => <SortableHeader column={column}>Time</SortableHeader>,
        cell: ({ row }) => <span className="text-muted-foreground">{fmtDate(row.original.created_at)}</span>,
      },
      {
        accessorKey: "action",
        header: ({ column }) => <SortableHeader column={column}>Action</SortableHeader>,
        cell: ({ row }) => {
          const meta = ACTION_META[row.original.action] || { label: row.original.action, variant: "outline" };
          return (
            <Badge variant={meta.variant} className="font-normal" data-testid={`account-activity-action-${row.original.id}`}>
              {meta.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: "ip",
        header: ({ column }) => <SortableHeader column={column}>IP address</SortableHeader>,
        cell: ({ row }) => (
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.original.ip || "—"}</code>
        ),
      },
      {
        accessorKey: "status_code",
        header: ({ column }) => <SortableHeader column={column} align="right">Status</SortableHeader>,
        cell: ({ row }) => {
          const code = row.original.status_code;
          const ok = code && code >= 200 && code < 300;
          return (
            <div className="text-right">
              <Badge variant={ok ? "secondary" : "destructive"} className="font-normal tabular-nums">
                {code ?? "—"}
              </Badge>
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="space-y-6" data-testid="account-page">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Your account details.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Name" value={user?.name} testId="account-name" />
            <Field label="Email" value={user?.email} testId="account-email" />
            <Field label="Username" value={user?.username} testId="account-username" />
            <Field label="Phone" value={user?.phone} testId="account-phone" />
            <Field label="Role" value={user?.is_admin ? "Administrator" : user?.role_name} testId="account-role" />
            <Field label="Office" value={user?.office_name} testId="account-office" />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Password status</p>
              <div className="flex items-center gap-2">
                <Badge variant={pwMeta.variant} className="font-normal" data-testid="account-pw-status">
                  {pwMeta.label}
                </Badge>
                <span className="text-xs text-muted-foreground">expires {expires}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="my-devices-card">
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">My Devices</CardTitle>
            <CardDescription>
              Devices currently signed in to your account. Sign out any you don&apos;t recognise.
            </CardDescription>
          </div>
          {otherCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setRevokeOthersOpen(true)}
              data-testid="my-devices-signout-others"
            >
              <LogOut className="size-4" /> Sign out other devices
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            {sessionsLoading ? (
              <div className="space-y-2 p-4" data-testid="my-devices-loading">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground" data-testid="my-devices-empty">
                No active devices.
              </div>
            ) : (
              <Table data-testid="my-devices-table" className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Device</TableHead>
                    <TableHead>IP address</TableHead>
                    <TableHead>Signed in</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((r) => {
                    const isMobile = r.token_type === "mobile";
                    const DeviceIcon = isMobile ? Smartphone : Monitor;
                    return (
                      <TableRow key={r.id} data-testid={`my-device-row-${r.id}`}>
                        <TableCell>
                          <span className="flex items-center gap-2 text-sm">
                            <DeviceIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                            {deviceLabel(r)}
                            {r.is_current && (
                              <Badge className="font-normal text-[10px]" data-testid={`my-device-current-${r.id}`}>
                                This device
                              </Badge>
                            )}
                            <Badge variant="outline" className="font-normal text-[10px] uppercase">
                              {isMobile ? "Mobile" : "Web"}
                            </Badge>
                          </span>
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.ip || "—"}</code>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{fmtDate(r.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={revoking === r.id}
                            onClick={() => doRevoke(r)}
                            data-testid={`my-device-signout-${r.id}`}
                          >
                            {revoking === r.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <LogOut className="size-4" />
                            )}
                            {r.is_current ? "Sign out" : "Sign out"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <DataTableCard
        title="Login Security"
        description="Your recent login history (successful and failed sign-ins) with IP and status."
        onRefresh={loadActivity}
        refreshTestId="account-activity-refresh"
        columns={columns}
        data={activity}
        loading={loading}
        searchPlaceholder="Search action or IP..."
        testid="account-activity"
        emptyIcon={LogIn}
        emptyTitle="No login history yet"
        emptyDescription="Your successful and failed sign-ins will appear here."
      />

      <AlertDialog open={revokeOthersOpen} onOpenChange={(v) => !acting && setRevokeOthersOpen(v)}>
        <AlertDialogContent data-testid="my-devices-signout-others-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out all other devices?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="px-6 py-4 text-sm text-muted-foreground">
            This signs you out everywhere except this device. Those devices will need to log in again.
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="my-devices-signout-others-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); doRevokeOthers(); }}
              disabled={acting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="my-devices-signout-others-confirm"
            >
              {acting ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
              Sign out others
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
