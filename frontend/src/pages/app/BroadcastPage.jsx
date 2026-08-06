import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Hash,
  Loader2,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Save,
  Send,
  SendHorizontal,
  Settings2,
  Webhook,
  Wifi,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import API from "@/lib/api";
import { SortHead, useSortableRows } from "@/components/composite/sortable-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CHANNEL_ICONS = {
  telegram: Send,
  discord: MessageSquare,
  slack: Hash,
  webhook: Webhook,
  email: Mail,
};

const STATUS_META = {
  connected: { label: "Connected", variant: "default", icon: CheckCircle2 },
  error: { label: "Error", variant: "destructive", icon: XCircle },
  configured: { label: "Configured", variant: "secondary", icon: null },
  not_configured: { label: "Not configured", variant: "outline", icon: null },
};

const BROADCAST_SORT = {
  label: (c) => c.label,
  description: (c) => c.description,
  status: (c) => c.status,
  last: (c) => (c.status === "connected" ? c.last_tested_at || "" : ""),
};

const formatTime = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.not_configured;
  const Icon = meta.icon;
  return (
    <Badge variant={meta.variant} className="gap-1" data-testid={`broadcast-status-${status}`}>
      {Icon ? <Icon className="size-3" /> : null}
      {meta.label}
    </Badge>
  );
}

export default function BroadcastPage() {
  const [channels, setChannels] = useState([]);
  const [status, setStatus] = useState("loading");

  // Modify dialog
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null); // channel object
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null); // {ok, message}

  // Send test message dialog
  const [sendOpen, setSendOpen] = useState(false);
  const [sendActive, setSendActive] = useState(null);
  const [sendTo, setSendTo] = useState("");
  const [sendMsg, setSendMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await API.get("/broadcast/channels");
      setChannels(res.data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const openModify = (channel) => {
    setActive(channel);
    const initial = {};
    channel.fields.forEach((f) => {
      const v = channel.config?.[f.name];
      initial[f.name] = f.type === "boolean" ? Boolean(v) : v ?? "";
    });
    setForm(initial);
    setResult(null);
    setOpen(true);
  };

  const setField = (name, value) => setForm((p) => ({ ...p, [name]: value }));

  const testConnection = async () => {
    if (!active) return;
    setTesting(true);
    setResult(null);
    try {
      const { data } = await API.post(`/broadcast/channels/${active.key}/test`, { config: form });
      setResult({ ok: data.ok, message: data.message });
      if (data.ok) toast.success(`${active.label} connected`, { description: data.message });
      else toast.error(`${active.label} test failed`, { description: data.message });
      fetchChannels();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Test failed. Please try again.";
      setResult({ ok: false, message: msg });
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    if (!active) return;
    setSaving(true);
    try {
      await API.put(`/broadcast/channels/${active.key}`, { config: form });
      toast.success(`${active.label} configuration saved`);
      setOpen(false);
      fetchChannels();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Save failed. Please try again.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const openSend = (channel) => {
    setSendActive(channel);
    setSendTo("");
    setSendMsg("");
    setSendResult(null);
    setSendOpen(true);
  };

  const sendTest = async () => {
    if (!sendActive) return;
    setSending(true);
    setSendResult(null);
    try {
      const { data } = await API.post(`/broadcast/channels/${sendActive.key}/send-test`, {
        to: sendTo,
        message: sendMsg,
      });
      setSendResult({ ok: data.ok, message: data.message });
      if (data.ok) toast.success(`${sendActive.label}: message sent`, { description: data.message });
      else toast.error(`${sendActive.label}: send failed`, { description: data.message });
    } catch (err) {
      const msg = err?.response?.data?.detail || "Send failed. Please try again.";
      setSendResult({ ok: false, message: msg });
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const { sorted: sortedChannels, sort, toggle } = useSortableRows(channels, BROADCAST_SORT);

  return (
    <div className="space-y-6" data-testid="broadcast-page">
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Channel List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "error" ? (
            <Alert variant="destructive" data-testid="broadcast-error">
              <XCircle className="size-4" />
              <AlertTitle>Failed to load channels</AlertTitle>
              <AlertDescription>Please refresh the page and try again.</AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table
                data-testid="broadcast-table"
                className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap"
              >
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>
                      <SortHead label="Channel" sortKey="label" sort={sort} onToggle={toggle} />
                    </TableHead>
                    <TableHead>
                      <SortHead label="Description" sortKey="description" sort={sort} onToggle={toggle} />
                    </TableHead>
                    <TableHead>
                      <SortHead label="Status" sortKey="status" sort={sort} onToggle={toggle} />
                    </TableHead>
                    <TableHead>
                      <SortHead label="Last verified" sortKey="last" sort={sort} onToggle={toggle} />
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {status === "loading" ? (
                    [0, 1, 2, 3, 4].map((i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    sortedChannels.map((channel) => {
                      const Icon = CHANNEL_ICONS[channel.key] || Send;
                      const notConfigured = channel.status === "not_configured";
                      return (
                        <TableRow key={channel.key} data-testid={`broadcast-row-${channel.key}`}>
                          <TableCell>
                            <div className="flex items-center gap-2 font-medium">
                              <Icon className="size-4 text-muted-foreground" /> {channel.label}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-sm truncate text-muted-foreground">
                            {channel.description}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={channel.status} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {channel.status === "connected" && channel.last_tested_at
                              ? formatTime(channel.last_tested_at)
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  aria-label="Row actions"
                                  data-testid={`broadcast-row-actions-${channel.key}`}
                                >
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => openModify(channel)}
                                  data-testid={`broadcast-modify-${channel.key}`}
                                >
                                  <Settings2 className="size-4" /> Modify
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  disabled={notConfigured}
                                  onClick={() => openSend(channel)}
                                  data-testid={`broadcast-send-${channel.key}`}
                                >
                                  <SendHorizontal className="size-4" /> Send test
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="broadcast-dialog">
          <DialogHeader>
            <DialogTitle>Configure {active?.label}</DialogTitle>
            <DialogDescription>{active?.description}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="grid grid-cols-1 gap-4">
              {active?.fields.map((f) => {
                if (f.type === "boolean") {
                  return (
                    <div
                      key={f.name}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <Label htmlFor={`bc-${f.name}`} className="text-sm font-normal">
                        {f.label}
                      </Label>
                      <Switch
                        id={`bc-${f.name}`}
                        checked={Boolean(form[f.name])}
                        onCheckedChange={(v) => setField(f.name, v)}
                        data-testid={`broadcast-field-${f.name}`}
                      />
                    </div>
                  );
                }
                const isSet = active.config?.[`${f.name}_set`];
                return (
                  <div key={f.name} className="space-y-1.5">
                    <Label htmlFor={`bc-${f.name}`}>{f.label}</Label>
                    <Input
                      id={`bc-${f.name}`}
                      type={f.type === "number" ? "number" : f.type === "password" ? "password" : "text"}
                      value={form[f.name] ?? ""}
                      onChange={(e) => setField(f.name, e.target.value)}
                      placeholder={
                        f.secret && isSet ? "Leave blank to keep current" : f.placeholder || ""
                      }
                      data-testid={`broadcast-field-${f.name}`}
                    />
                  </div>
                );
              })}

              {result ? (
                <Alert
                  variant={result.ok ? "default" : "destructive"}
                  data-testid="broadcast-test-result"
                >
                  {result.ok ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                  <AlertTitle>{result.ok ? "Connection successful" : "Connection failed"}</AlertTitle>
                  <AlertDescription>{result.message}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={testConnection}
              disabled={testing || saving}
              data-testid="broadcast-test-btn"
            >
              {testing ? <Loader2 className="size-4 animate-spin" /> : <Wifi className="size-4" />}
              Test connection
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <DialogClose asChild>
                <Button variant="outline" className="w-full sm:w-auto" disabled={testing || saving}>
                  <X className="size-4" /> Cancel
                </Button>
              </DialogClose>
              <Button
                className="w-full sm:w-auto"
                onClick={save}
                disabled={saving || testing}
                data-testid="broadcast-save-btn"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="broadcast-send-dialog">
          <DialogHeader>
            <DialogTitle>Send test message — {sendActive?.label}</DialogTitle>
            <DialogDescription>
              Delivers a real message using the saved configuration to confirm it arrives.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="grid grid-cols-1 gap-4">
              {sendActive?.key === "email" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="bc-send-to">Recipient</Label>
                  <Input
                    id="bc-send-to"
                    type="email"
                    value={sendTo}
                    onChange={(e) => setSendTo(e.target.value)}
                    placeholder="recipient@example.com"
                    data-testid="broadcast-send-to"
                  />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="bc-send-message">Message</Label>
                <Textarea
                  id="bc-send-message"
                  rows={4}
                  value={sendMsg}
                  onChange={(e) => setSendMsg(e.target.value)}
                  placeholder="Test broadcast message from the CMS."
                  data-testid="broadcast-send-message"
                />
              </div>

              {sendResult ? (
                <Alert
                  variant={sendResult.ok ? "default" : "destructive"}
                  data-testid="broadcast-send-result"
                >
                  {sendResult.ok ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <XCircle className="size-4" />
                  )}
                  <AlertTitle>{sendResult.ok ? "Message sent" : "Send failed"}</AlertTitle>
                  <AlertDescription>{sendResult.message}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto" disabled={sending}>
                <X className="size-4" /> Cancel
              </Button>
            </DialogClose>
            <Button
              className="w-full sm:w-auto"
              onClick={sendTest}
              disabled={sending}
              data-testid="broadcast-send-submit"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
              Send message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
