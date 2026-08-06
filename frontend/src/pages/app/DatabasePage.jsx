import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Cloud,
  Download,
  DatabaseBackup,
  HardDriveDownload,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import API from "@/lib/api";
import { SortHead, useSortableRows } from "@/components/composite/sortable-table";
import { EmptyState } from "@/components/composite/EmptyState";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const BACKUP_SORT = {
  filename: (b) => b.filename,
  created_at: (b) => b.created_at,
  total: (b) => b.total ?? 0,
  size: (b) => b.size ?? 0,
};

const WEEKDAYS = [
  { value: "0", label: "Monday" },
  { value: "1", label: "Tuesday" },
  { value: "2", label: "Wednesday" },
  { value: "3", label: "Thursday" },
  { value: "4", label: "Friday" },
  { value: "5", label: "Saturday" },
  { value: "6", label: "Sunday" },
];

const formatBytes = (n) => {
  if (!n && n !== 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const formatTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export default function DatabasePage() {
  const [backups, setBackups] = useState([]);
  const { sorted: sortedBackups, sort, toggle } = useSortableRows(backups, BACKUP_SORT);
  const [status, setStatus] = useState("loading");
  const [backingUp, setBackingUp] = useState(false);
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);

  // Backup settings (retention / schedule / S3)
  const [settings, setSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingS3, setTestingS3] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Restore dialog state
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [source, setSource] = useState(null);
  const [verify, setVerify] = useState(null);
  const [mode, setMode] = useState("update");
  const [phase, setPhase] = useState("idle");

  const fetchBackups = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await API.get("/database/backups");
      setBackups(res.data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await API.get("/database/settings");
      setSettings(res.data);
    } catch {
      /* settings are optional; leave null on failure */
    }
  }, []);

  useEffect(() => {
    fetchBackups();
    fetchSettings();
  }, [fetchBackups, fetchSettings]);

  const setField = (key, value) => setSettings((s) => ({ ...s, [key]: value }));

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const payload = {
        retention_count: Number(settings.retention_count) || 7,
        schedule_enabled: settings.schedule_enabled,
        schedule_interval: settings.schedule_interval,
        schedule_time: settings.schedule_time,
        schedule_weekday: Number(settings.schedule_weekday) || 0,
        s3_enabled: settings.s3_enabled,
        s3_endpoint_url: settings.s3_endpoint_url,
        s3_region: settings.s3_region,
        s3_bucket: settings.s3_bucket,
        s3_access_key_id: settings.s3_access_key_id,
        s3_prefix: settings.s3_prefix,
      };
      if (settings.s3_secret_access_key) payload.s3_secret_access_key = settings.s3_secret_access_key;
      const res = await API.put("/database/settings", payload);
      setSettings(res.data);
      toast.success("Backup settings saved");
    } catch {
      toast.error("Could not save settings. Please try again.");
    } finally {
      setSavingSettings(false);
    }
  };

  const testS3 = async () => {
    setTestingS3(true);
    try {
      const body = {
        s3_endpoint_url: settings.s3_endpoint_url,
        s3_region: settings.s3_region,
        s3_bucket: settings.s3_bucket,
        s3_access_key_id: settings.s3_access_key_id,
        s3_prefix: settings.s3_prefix,
      };
      if (settings.s3_secret_access_key) body.s3_secret_access_key = settings.s3_secret_access_key;
      const { data } = await API.post("/database/s3/test", body);
      if (data.ok) toast.success(data.message || "S3 connection OK");
      else toast.error(data.error || "S3 connection failed");
    } catch {
      toast.error("S3 test failed. Please try again.");
    } finally {
      setTestingS3(false);
    }
  };

  const createBackup = async () => {
    setBackingUp(true);
    try {
      const { data } = await API.post("/database/backup");
      toast.success("Backup created", {
        description: `${data.filename} — ${data.total} documents (${formatBytes(data.size)})${data.s3_key ? " · uploaded to S3" : ""}`,
      });
      try {
        const dl = await API.get(`/database/backups/${data.id}/download`, { responseType: "blob" });
        downloadBlob(dl.data, data.filename);
      } catch {
        /* download is best-effort */
      }
      fetchBackups();
      fetchSettings();
    } catch {
      toast.error("Backup failed. Please try again.");
    } finally {
      setBackingUp(false);
    }
  };

  const downloadBackup = async (b) => {
    try {
      const res = await API.get(`/database/backups/${b.id}/download`, { responseType: "blob" });
      downloadBlob(res.data, b.filename);
    } catch {
      toast.error("Download failed");
    }
  };

  const confirmDeleteBackup = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await API.delete(`/database/backups/${deleteTarget.id}`);
      toast.success("Backup deleted", { description: deleteTarget.filename });
      setDeleteTarget(null);
      fetchBackups();
    } catch {
      toast.error("Delete failed. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const openRestore = async (src) => {
    setSource(src);
    setMode("update");
    setVerify(null);
    setRestoreOpen(true);
    setPhase("verifying");
    try {
      let data;
      if (src.type === "upload") {
        const fd = new FormData();
        fd.append("file", src.file);
        fd.append("dry_run", "true");
        ({ data } = await API.post("/database/restore/upload", fd));
      } else {
        ({ data } = await API.post("/database/restore/server", { id: src.id, dry_run: true }));
      }
      setVerify(data);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg = detail && typeof detail === "object" ? detail.message : detail;
      toast.error(msg || "This file is not a valid backup.");
      setRestoreOpen(false);
    } finally {
      setPhase("idle");
    }
  };

  const applyRestore = async () => {
    if (!source || !verify?.valid) return;
    setPhase("applying");
    try {
      let data;
      if (source.type === "upload") {
        const fd = new FormData();
        fd.append("file", source.file);
        fd.append("mode", mode);
        fd.append("dry_run", "false");
        ({ data } = await API.post("/database/restore/upload", fd));
      } else {
        ({ data } = await API.post("/database/restore/server", { id: source.id, mode, dry_run: false }));
      }
      toast.success("Restore complete", {
        description: `Mode: ${mode === "replace" ? "Replace all" : "Update"} — ${data.total} documents restored.`,
      });
      setRestoreOpen(false);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      fetchBackups();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg = detail && typeof detail === "object" ? detail.message : detail;
      toast.error(msg || "Restore failed. Please try again.");
    } finally {
      setPhase("idle");
    }
  };

  const busy = phase !== "idle";

  return (
    <div className="space-y-6" data-testid="database-page">
      {/* Row 1: Backup + Restore */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="database-backup-card" className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DatabaseBackup className="size-4" /> Backup
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <p className="text-sm text-muted-foreground">
              Create a full snapshot of the entire database. The file is stored on the server
              (and mirrored to S3 when configured) and downloaded to your device.
            </p>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button onClick={createBackup} disabled={backingUp} data-testid="database-backup-btn">
              {backingUp ? <Loader2 className="size-4 animate-spin" /> : <DatabaseBackup className="size-4" />}
              {backingUp ? "Creating backup..." : "Create backup"}
            </Button>
          </CardFooter>
        </Card>

        <Card data-testid="database-restore-card" className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HardDriveDownload className="size-4" /> Restore
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            <p className="text-sm text-muted-foreground">
              Restore from a backup file you upload. You'll verify its contents and choose a mode
              before anything changes.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full rounded-md border border-input bg-background text-sm text-foreground file:mr-3 file:cursor-pointer file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-muted/80"
              data-testid="database-restore-file"
            />
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button
              variant="outline"
              disabled={!file}
              onClick={() => openRestore({ type: "upload", file })}
              data-testid="database-restore-upload-btn"
            >
              <Upload className="size-4" /> Verify &amp; restore
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Row 2: Backup settings — retention, schedule, S3 */}
      {settings && (
        <Card data-testid="database-settings-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4" /> Backup Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Retention */}
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="retention">Keep last N backups</Label>
                <Input
                  id="retention"
                  type="number"
                  min={1}
                  max={365}
                  value={settings.retention_count ?? 7}
                  onChange={(e) => setField("retention_count", e.target.value)}
                  data-testid="settings-retention"
                />
                <p className="text-xs text-muted-foreground">Older backups are pruned automatically.</p>
              </div>
            </div>

            <Separator />

            {/* Schedule */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Scheduled backups</p>
                  <p className="text-xs text-muted-foreground">Automatically run a backup on a recurring schedule (times are UTC).</p>
                </div>
                <Switch
                  checked={!!settings.schedule_enabled}
                  onCheckedChange={(v) => setField("schedule_enabled", v)}
                  data-testid="settings-schedule-enabled"
                  aria-label="Enable scheduled backups"
                />
              </div>
              {settings.schedule_enabled && (
                <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label>Interval</Label>
                    <Select value={settings.schedule_interval} onValueChange={(v) => setField("schedule_interval", v)}>
                      <SelectTrigger data-testid="settings-schedule-interval">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {settings.schedule_interval !== "hourly" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="sched-time">Time (HH:MM)</Label>
                      <Input
                        id="sched-time"
                        type="time"
                        value={settings.schedule_time || "02:00"}
                        onChange={(e) => setField("schedule_time", e.target.value)}
                        data-testid="settings-schedule-time"
                      />
                    </div>
                  )}
                  {settings.schedule_interval === "hourly" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="sched-min">Minute</Label>
                      <Input
                        id="sched-min"
                        type="number"
                        min={0}
                        max={59}
                        value={(settings.schedule_time || "02:00").split(":")[1] || "0"}
                        onChange={(e) => setField("schedule_time", `00:${String(e.target.value).padStart(2, "0")}`)}
                        data-testid="settings-schedule-minute"
                      />
                    </div>
                  )}
                  {settings.schedule_interval === "weekly" && (
                    <div className="space-y-1.5">
                      <Label>Day of week</Label>
                      <Select value={String(settings.schedule_weekday ?? 0)} onValueChange={(v) => setField("schedule_weekday", v)}>
                        <SelectTrigger data-testid="settings-schedule-weekday">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WEEKDAYS.map((d) => (
                            <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Next run</Label>
                    <div className="flex h-8 items-center rounded-md border px-3 text-sm text-muted-foreground" data-testid="settings-next-run">
                      {formatTime(settings.next_run_at)}
                    </div>
                  </div>
                </div>
              )}
              {settings.last_run_at && (
                <p className="text-xs text-muted-foreground" data-testid="settings-last-run">
                  Last run: {formatTime(settings.last_run_at)}
                  {settings.last_status ? ` · ${settings.last_status}` : ""}
                  {settings.last_error ? ` · ${settings.last_error}` : ""}
                </p>
              )}
            </div>

            <Separator />

            {/* S3 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Cloud className="size-4" /> S3 storage
                  </p>
                  <p className="text-xs text-muted-foreground">Mirror each backup to AWS S3 or any S3-compatible bucket.</p>
                </div>
                <Switch
                  checked={!!settings.s3_enabled}
                  onCheckedChange={(v) => setField("s3_enabled", v)}
                  data-testid="settings-s3-enabled"
                  aria-label="Enable S3 backup"
                />
              </div>
              {settings.s3_enabled && (
                <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="s3-bucket">Bucket</Label>
                    <Input id="s3-bucket" value={settings.s3_bucket || ""} onChange={(e) => setField("s3_bucket", e.target.value)} data-testid="settings-s3-bucket" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="s3-region">Region</Label>
                    <Input id="s3-region" placeholder="us-east-1" value={settings.s3_region || ""} onChange={(e) => setField("s3_region", e.target.value)} data-testid="settings-s3-region" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="s3-endpoint">Endpoint URL</Label>
                    <Input id="s3-endpoint" placeholder="Leave blank for AWS S3" value={settings.s3_endpoint_url || ""} onChange={(e) => setField("s3_endpoint_url", e.target.value)} data-testid="settings-s3-endpoint" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="s3-prefix">Prefix / folder path</Label>
                    <Input id="s3-prefix" placeholder="backups/cms" value={settings.s3_prefix || ""} onChange={(e) => setField("s3_prefix", e.target.value)} data-testid="settings-s3-prefix" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="s3-access">Access key ID</Label>
                    <Input id="s3-access" value={settings.s3_access_key_id || ""} onChange={(e) => setField("s3_access_key_id", e.target.value)} data-testid="settings-s3-access-key" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="s3-secret">Secret access key</Label>
                    <Input
                      id="s3-secret"
                      type="password"
                      placeholder={settings.s3_secret_access_key_set ? "Leave blank to keep current" : ""}
                      value={settings.s3_secret_access_key || ""}
                      onChange={(e) => setField("s3_secret_access_key", e.target.value)}
                      data-testid="settings-s3-secret-key"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" variant="outline" onClick={testS3} disabled={testingS3} data-testid="settings-s3-test">
                      {testingS3 ? <Loader2 className="size-4 animate-spin" /> : <Cloud className="size-4" />}
                      Test connection
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button onClick={saveSettings} disabled={savingSettings} data-testid="settings-save">
              {savingSettings ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save settings
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Row 3: Backup history */}
      <Card data-testid="database-history-card">
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Backup History</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchBackups} data-testid="database-refresh">
            <RefreshCw className="size-4" /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            {status === "error" ? (
              <EmptyState
                variant="error"
                action={
                  <Button variant="outline" size="sm" onClick={fetchBackups}>
                    <RefreshCw className="size-4" /> Try again
                  </Button>
                }
              />
            ) : status === "loading" ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : backups.length === 0 ? (
              <EmptyState
                variant="first-time"
                title="No backups yet"
                description="Create your first backup to see it listed here."
              />
            ) : (
              <Table data-testid="database-backups-table" className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>
                      <SortHead label="Filename" sortKey="filename" sort={sort} onToggle={toggle} />
                    </TableHead>
                    <TableHead>
                      <SortHead label="Created" sortKey="created_at" sort={sort} onToggle={toggle} />
                    </TableHead>
                    <TableHead>
                      <SortHead label="Documents" sortKey="total" sort={sort} onToggle={toggle} />
                    </TableHead>
                    <TableHead>
                      <SortHead label="Size" sortKey="size" sort={sort} onToggle={toggle} />
                    </TableHead>
                    <TableHead>Storage</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedBackups.map((b) => (
                    <TableRow key={b.id} data-testid={`database-backup-row-${b.id}`}>
                      <TableCell className="font-medium">{b.filename}</TableCell>
                      <TableCell className="text-muted-foreground">{formatTime(b.created_at)}</TableCell>
                      <TableCell>{b.total ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{formatBytes(b.size)}</TableCell>
                      <TableCell>
                        {b.s3_key ? (
                          <Badge variant="secondary" className="font-normal" data-testid={`database-s3-badge-${b.id}`}>
                            <Cloud className="size-3" /> S3
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Server</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadBackup(b)}
                            data-testid={`database-download-${b.id}`}
                          >
                            <Download className="size-4" /> Download
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openRestore({ type: "server", id: b.id, filename: b.filename })}
                            data-testid={`database-restore-${b.id}`}
                          >
                            <RotateCcw className="size-4" /> Restore
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(b)}
                            data-testid={`database-delete-${b.id}`}
                          >
                            <Trash2 className="size-4" /> Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete backup confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent data-testid="database-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete backup?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="px-6 py-4 text-sm text-muted-foreground">
            This permanently deletes <span className="font-medium text-foreground">{deleteTarget?.filename}</span>
            {deleteTarget?.s3_key ? " from the server and S3." : " from the server."} This cannot be undone.
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="database-delete-cancel"><X className="size-4" /> Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteBackup();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="database-delete-confirm"
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore verify + confirm dialog */}
      <Dialog open={restoreOpen} onOpenChange={(v) => !busy && setRestoreOpen(v)}>
        <DialogContent className="sm:max-w-lg" data-testid="database-restore-dialog">
          <DialogHeader>
            <DialogTitle>Restore database</DialogTitle>
            <DialogDescription>
              {source?.type === "upload" ? source?.file?.name : source?.filename}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {phase === "verifying" || !verify ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="database-verifying">
                <Loader2 className="size-4 animate-spin" /> Verifying backup file...
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">
                    Contents — {verify.total} document(s) across {verify.collections.length} collection(s)
                  </p>
                  <div className="max-h-40 overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead>Collection</TableHead>
                          <TableHead className="text-right">Documents</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {verify.collections.map((c) => (
                          <TableRow key={c.name} data-testid={`database-verify-col-${c.name}`}>
                            <TableCell>{c.name}</TableCell>
                            <TableCell className="text-right">{c.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Restore mode</p>
                  <RadioGroup value={mode} onValueChange={setMode} className="gap-2">
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3" htmlFor="mode-update">
                      <RadioGroupItem value="update" id="mode-update" data-testid="database-mode-update" className="mt-0.5" />
                      <span className="text-sm">
                        <span className="font-medium">Update</span>
                        <span className="block text-xs text-muted-foreground">
                          Merge: insert new records and update existing ones (matched by id). Keeps
                          data not present in the backup.
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3" htmlFor="mode-replace">
                      <RadioGroupItem value="replace" id="mode-replace" data-testid="database-mode-replace" className="mt-0.5" />
                      <span className="text-sm">
                        <span className="font-medium">Replace all</span>
                        <span className="block text-xs text-muted-foreground">
                          Wipe each collection, then restore exactly from the backup. Current data
                          not in the backup will be lost.
                        </span>
                      </span>
                    </label>
                  </RadioGroup>
                </div>

                {mode === "replace" && (
                  <Alert variant="destructive" data-testid="database-replace-warning">
                    <AlertTriangle className="size-4" />
                    <AlertTitle>Destructive action</AlertTitle>
                    <AlertDescription>
                      Replace all permanently overwrites current data with this backup. Make a fresh
                      backup first if unsure.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={busy} data-testid="database-restore-cancel">
                <X className="size-4" /> Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={applyRestore}
              disabled={busy || !verify?.valid}
              className={mode === "replace" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
              data-testid="database-restore-confirm"
            >
              {phase === "applying" ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              {phase === "applying"
                ? "Restoring..."
                : mode === "replace"
                  ? "Replace all & restore"
                  : "Update & restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
