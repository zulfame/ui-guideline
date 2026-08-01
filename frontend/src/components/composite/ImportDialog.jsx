import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Download,
  FileDown,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import API from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
 * Reusable Excel import dialog: template download → pick file → dry-run preview
 * (shows how many rows will be created / updated, or the failing rows) →
 * confirm to apply (all-or-nothing). `resource` is the API path segment.
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
  const [step, setStep] = useState("select"); // select | review
  const [phase, setPhase] = useState("idle"); // idle | uploading | processing
  const [progress, setProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [rowErrors, setRowErrors] = useState([]);
  const [plan, setPlan] = useState(null);
  const inputRef = useRef(null);

  const busy = phase !== "idle";

  useEffect(() => {
    if (open) {
      setFile(null);
      setRowErrors([]);
      setPlan(null);
      setStep("select");
      setPhase("idle");
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [open]);

  const trackUpload = (e) => {
    if (e.total) {
      const pct = Math.round((e.loaded / e.total) * 100);
      setProgress(pct);
      if (pct >= 100) setPhase("processing");
    } else {
      setPhase("processing");
    }
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

  const downloadTemplate = async () => {
    setDownloading(true);
    try {
      const res = await API.get(`/${resource}/import/template`, { responseType: "blob" });
      downloadBlob(res.data, templateFilename);
    } catch {
      toast.error("Failed to download template");
    } finally {
      setDownloading(false);
    }
  };

  const downloadErrors = async () => {
    try {
      const res = await API.post(
        `/import/errors/export`,
        { errors: rowErrors, filename: `${resource}_import_errors.xlsx` },
        { responseType: "blob" },
      );
      downloadBlob(res.data, `${resource}_import_errors.xlsx`);
    } catch {
      toast.error("Failed to download errors");
    }
  };

  const runPreview = async () => {
    if (!file) return;
    setRowErrors([]);
    setPlan(null);
    setPhase("uploading");
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await API.post(`/${resource}/import/preview`, fd, {
        onUploadProgress: trackUpload,
      });
      if (data.errors && data.errors.length) {
        setRowErrors(data.errors);
        toast.error(`${data.errors.length} row(s) need attention`);
      } else if (data.total === 0) {
        toast.error("No data rows found in the file.");
      } else {
        setPlan(data);
        setStep("review");
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (detail && typeof detail === "object") {
        setRowErrors(detail.errors || []);
        toast.error(detail.message || "Preview failed");
      } else {
        toast.error(typeof detail === "string" ? detail : "Preview failed. Please try again.");
      }
    } finally {
      setPhase("idle");
      setProgress(0);
    }
  };

  const confirmImport = async () => {
    if (!file) return;
    setPhase("uploading");
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await API.post(`/${resource}/import`, fd, { onUploadProgress: trackUpload });
      toast.success("Import complete", {
        description: `${data.created} created, ${data.updated} updated (${data.total} rows).`,
      });
      onOpenChange(false);
      onImported?.();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (detail && typeof detail === "object") {
        setRowErrors(detail.errors || []);
        setStep("select");
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
        </DialogHeader>
        <DialogBody className="space-y-4">
          {busy ? (
            <div className="space-y-3 rounded-md border bg-muted/30 p-4" data-testid="import-progress">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Loader2 className="size-4 animate-spin text-primary" />
                {phase === "uploading" ? "Uploading file..." : "Validating rows..."}
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
          ) : step === "review" && plan ? (
            <div className="space-y-4" data-testid="import-review">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-md border p-3 text-center">
                  <p className="text-2xl font-semibold" data-testid="import-summary-create">{plan.to_create}</p>
                  <p className="text-xs text-muted-foreground">To create</p>
                </div>
                <div className="rounded-md border p-3 text-center">
                  <p className="text-2xl font-semibold" data-testid="import-summary-update">{plan.to_update}</p>
                  <p className="text-xs text-muted-foreground">To update</p>
                </div>
                <div className="rounded-md border p-3 text-center">
                  <p className="text-2xl font-semibold" data-testid="import-summary-total">{plan.total}</p>
                  <p className="text-xs text-muted-foreground">Total rows</p>
                </div>
              </div>
              <div className="max-h-56 overflow-auto rounded-md border">
                <ul className="divide-y text-sm">
                  {plan.rows.map((r) => (
                    <li key={r.row} className="flex items-center gap-2 px-3 py-1.5" data-testid={`import-preview-row-${r.row}`}>
                      <Badge variant={r.action === "create" ? "secondary" : "outline"} className="font-normal">
                        {r.action === "create" ? "Create" : "Update"}
                      </Badge>
                      <span className="truncate text-muted-foreground">{r.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {plan.truncated && (
                <p className="text-xs text-muted-foreground">
                  Showing first {plan.rows.length} of {plan.total} rows.
                </p>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground" data-testid="import-instructions">
                {instructions ||
                  "Upload an .xlsx file. Rows are validated first — you'll see a preview before anything is saved."}
              </p>

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
                  className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3"
                  data-testid="import-errors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                      <AlertCircle className="size-4" />
                      {rowErrors.length} row(s) need attention
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={downloadErrors}
                      data-testid="import-download-errors"
                    >
                      <FileDown className="size-4" /> Download errors
                    </Button>
                  </div>
                  <ul className="max-h-40 space-y-1 overflow-auto text-xs">
                    {rowErrors.map((e) => (
                      <li key={e.row} data-testid={`import-error-row-${e.row}`}>
                        <span className="font-medium text-foreground">Row {e.row}:</span>{" "}
                        <span className="text-muted-foreground">{(e.errors || []).join("; ")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </DialogBody>
        <DialogFooter className={step === "review" ? undefined : "sm:justify-between"}>
          {step === "review" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("select")}
                disabled={busy}
                data-testid="import-back-btn"
              >
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button type="button" onClick={confirmImport} disabled={busy} data-testid="import-confirm-btn">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {busy ? "Importing..." : "Confirm import"}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={downloadTemplate}
                disabled={downloading || busy}
                data-testid="import-download-template"
              >
                <Download className="size-4" />
                {downloading ? "Preparing..." : "Template"}
              </Button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={busy} data-testid="import-cancel">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="button" onClick={runPreview} disabled={!file || busy} data-testid="import-preview-btn">
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  {busy ? "Checking..." : "Preview"}
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
