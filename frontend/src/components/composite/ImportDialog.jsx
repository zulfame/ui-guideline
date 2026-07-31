import { useEffect, useRef, useState } from "react";
import { AlertCircle, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import API from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

/**
 * Reusable Excel import dialog with template download, real upload progress,
 * and an all-or-nothing result view. `resource` is the API path segment,
 * e.g. "offices", "roles", "users".
 */
export function ImportDialog({
  open,
  onOpenChange,
  title,
  resource,
  templateFilename,
  instructions,
  onImported,
}) {
  const [file, setFile] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | uploading | processing
  const [progress, setProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [rowErrors, setRowErrors] = useState([]);
  const inputRef = useRef(null);

  const busy = phase !== "idle";

  useEffect(() => {
    if (open) {
      setFile(null);
      setRowErrors([]);
      setPhase("idle");
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [open]);

  const downloadTemplate = async () => {
    setDownloading(true);
    try {
      const res = await API.get(`/${resource}/import/template`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = templateFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download template");
    } finally {
      setDownloading(false);
    }
  };

  const submit = async () => {
    if (!file) return;
    setRowErrors([]);
    setPhase("uploading");
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await API.post(`/${resource}/import`, fd, {
        onUploadProgress: (e) => {
          if (e.total) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setProgress(pct);
            if (pct >= 100) setPhase("processing");
          } else {
            setPhase("processing");
          }
        },
      });
      toast.success("Import complete", {
        description: `${data.created} created, ${data.updated} updated (${data.total} rows).`,
      });
      onOpenChange(false);
      onImported?.();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (detail && typeof detail === "object") {
        setRowErrors(detail.errors || []);
        toast.error(detail.message || "Import canceled");
      } else {
        toast.error(typeof detail === "string" ? detail : "Import failed. Please try again.");
      }
      setPhase("idle");
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg" data-testid="import-dialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {instructions ||
              "Upload an .xlsx file. All rows are validated first — if any row has a problem the whole import is canceled."}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {busy ? (
            <div
              className="space-y-3 rounded-md border bg-muted/30 p-4"
              data-testid="import-progress"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Loader2 className="size-4 animate-spin text-primary" />
                {phase === "uploading" ? "Uploading file..." : "Validating & saving rows..."}
              </div>
              <Progress
                value={phase === "uploading" ? progress : 100}
                className={phase === "processing" ? "animate-pulse" : undefined}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <FileSpreadsheet className="size-3.5" />
                  {file?.name}
                </span>
                {phase === "uploading" && <span data-testid="import-progress-pct">{progress}%</span>}
              </div>
            </div>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                disabled={downloading}
                data-testid="import-download-template"
              >
                <Download className="size-4" />
                {downloading ? "Preparing..." : "Download template"}
              </Button>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="import-file">
                  Excel file (.xlsx)
                </label>
                <input
                  id="import-file"
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] || null);
                    setRowErrors([]);
                  }}
                  className="block w-full rounded-md border border-input bg-background text-sm text-foreground file:mr-3 file:cursor-pointer file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-muted/80"
                  data-testid="import-file-input"
                />
                {file && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="import-file-name">
                    <FileSpreadsheet className="size-3.5" />
                    {file.name}
                  </p>
                )}
              </div>

              {rowErrors.length > 0 && (
                <div
                  className="max-h-56 space-y-2 overflow-auto rounded-md border border-destructive/40 bg-destructive/5 p-3"
                  data-testid="import-errors"
                >
                  <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                    <AlertCircle className="size-4" />
                    {rowErrors.length} row(s) need attention
                  </p>
                  <ul className="space-y-1 text-xs">
                    {rowErrors.map((e) => (
                      <li key={e.row} data-testid={`import-error-row-${e.row}`}>
                        <span className="font-medium text-foreground">Row {e.row}:</span>{" "}
                        <span className="text-muted-foreground">
                          {(e.errors || []).join("; ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={busy} data-testid="import-cancel">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={submit} disabled={!file || busy} data-testid="import-submit">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {phase === "uploading" ? "Uploading..." : phase === "processing" ? "Processing..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
