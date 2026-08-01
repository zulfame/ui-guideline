import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Download,
  DatabaseBackup,
  HardDriveDownload,
  Loader2,
  RefreshCw,
  RotateCcw,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import API from "@/lib/api";
import { SortHead, useSortableRows } from "@/components/composite/sortable-table";
import { EmptyState } from "@/components/composite/EmptyState";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
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

  // Restore dialog state
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [source, setSource] = useState(null); // {type:'upload'|'server', file?, id?, filename?}
  const [verify, setVerify] = useState(null); // verification summary
  const [mode, setMode] = useState("update");
  const [phase, setPhase] = useState("idle"); // idle | verifying | applying

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

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const createBackup = async () => {
    setBackingUp(true);
    try {
      const { data } = await API.post("/database/backup");
      toast.success("Backup created", {
        description: `${data.filename} — ${data.total} documents (${formatBytes(data.size)})`,
      });
      // also download the just-created file
      try {
        const dl = await API.get(`/database/backups/${data.id}/download`, { responseType: "blob" });
        downloadBlob(dl.data, data.filename);
      } catch {
        /* download is best-effort; file is safely stored on the server */
      }
      fetchBackups();
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

  // Open the restore dialog for a given source and run verification (dry-run).
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
              Create a full snapshot of the entire database. The file is stored on the server and
              downloaded to your device.
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

      {/* Row 2: Backup history */}
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

      {/* Restore verify + confirm dialog */}
      <Dialog open={restoreOpen} onOpenChange={(v) => !busy && setRestoreOpen(v)}>
        <DialogContent className="sm:max-w-lg" data-testid="database-restore-dialog">
          <DialogHeader>
            <DialogTitle>Restore database</DialogTitle>
            <DialogDescription>
              {source?.type === "upload"
                ? source?.file?.name
                : source?.filename}
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
                Cancel
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
