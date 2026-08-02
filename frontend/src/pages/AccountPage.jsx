import { useCallback, useEffect, useMemo, useState } from "react";
import { LogIn } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DataTableCard,
  SortableHeader,
  fmtDate,
} from "@/components/composite/DataTableCard";
import { toast } from "@/components/ui/sonner";
import API from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

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
  const { user } = useAuth();
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

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
    </div>
  );
}
