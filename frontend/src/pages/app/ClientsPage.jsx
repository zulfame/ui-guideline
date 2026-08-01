import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  Ban,
  Trash2,
  ShieldCheck,
  Loader2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [scopes, setScopes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState([]);
  const [saving, setSaving] = useState(false);

  const [revealKey, setRevealKey] = useState(null); // { key, name }
  const [copied, setCopied] = useState(false);

  const [revokeTarget, setRevokeTarget] = useState(null);
  const [regenTarget, setRegenTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([API.get("/clients"), API.get("/clients/scopes")]);
      setClients(c.data);
      setScopes(s.data.scopes || []);
    } catch {
      toast.error("Failed to load API clients");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleScope = (scope) =>
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );

  const openCreate = () => {
    setName("");
    setSelectedScopes([]);
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const { data } = await API.post("/clients", { name: name.trim(), scopes: selectedScopes });
      setCreateOpen(false);
      setRevealKey({ key: data.api_key, name: data.name });
      await load();
      toast.success("API client created");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to create client");
    } finally {
      setSaving(false);
    }
  };

  const doRegenerate = async () => {
    setActing(true);
    try {
      const { data } = await API.post(`/clients/${regenTarget.id}/regenerate`);
      setRegenTarget(null);
      setRevealKey({ key: data.api_key, name: data.name });
      await load();
      toast.success("Key regenerated");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to regenerate key");
    } finally {
      setActing(false);
    }
  };

  const doRevoke = async () => {
    setActing(true);
    try {
      await API.post(`/clients/${revokeTarget.id}/revoke`);
      setRevokeTarget(null);
      await load();
      toast.success("Client revoked");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to revoke client");
    } finally {
      setActing(false);
    }
  };

  const doDelete = async () => {
    setActing(true);
    try {
      await API.delete(`/clients/${deleteTarget.id}`);
      setDeleteTarget(null);
      await load();
      toast.success("Client deleted");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to delete client");
    } finally {
      setActing(false);
    }
  };

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(revealKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy — please copy manually");
    }
  };

  const hasClients = clients.length > 0;
  const scopeOptions = useMemo(() => scopes, [scopes]);

  return (
    <div className="space-y-6" data-testid="clients-page">
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">API Clients</CardTitle>
            <CardDescription>
              Manage API credentials and their access scopes. Keys are shown only once.
            </CardDescription>
          </div>
          <Button size="sm" onClick={openCreate} data-testid="clients-add">
            <Plus className="size-4" /> New Client
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !hasClients ? (
            <EmptyState
              icon={KeyRound}
              title="No API clients yet"
              description="Create your first API client to issue a scoped key."
              action={
                <Button size="sm" onClick={openCreate} data-testid="clients-empty-add">
                  <Plus className="size-4" /> New Client
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Scopes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last used</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((c) => (
                    <TableRow key={c.id} data-testid={`client-row-${c.id}`}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{c.key_masked}</code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {c.scopes.length ? (
                            c.scopes.map((s) => (
                              <Badge key={s} variant="secondary" className="font-normal">
                                {s}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">none</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={c.active ? "secondary" : "destructive"}
                          className="font-normal"
                          data-testid={`client-status-${c.id}`}
                        >
                          {c.active ? "Active" : "Revoked"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(c.created_at)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(c.last_used_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label="Regenerate key"
                            onClick={() => setRegenTarget(c)}
                            data-testid={`client-regenerate-${c.id}`}
                          >
                            <RefreshCw className="size-4" />
                          </Button>
                          {c.active && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              aria-label="Revoke client"
                              onClick={() => setRevokeTarget(c)}
                              data-testid={`client-revoke-${c.id}`}
                            >
                              <Ban className="size-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            aria-label="Delete client"
                            onClick={() => setDeleteTarget(c)}
                            data-testid={`client-delete-${c.id}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent data-testid="clients-create-dialog">
          <DialogHeader>
            <DialogTitle>New API client</DialogTitle>
            <DialogDescription>Name the client and choose its access scopes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">Name</Label>
              <Input
                id="client-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mobile App"
                data-testid="client-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Scopes</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {scopeOptions.map((s) => (
                  <label
                    key={s}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={selectedScopes.includes(s)}
                      onCheckedChange={() => toggleScope(s)}
                      data-testid={`client-scope-${s}`}
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitCreate} disabled={saving} data-testid="clients-create-submit">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              Create client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reveal key dialog (once) */}
      <Dialog open={!!revealKey} onOpenChange={(o) => !o && setRevealKey(null)}>
        <DialogContent data-testid="client-key-dialog">
          <DialogHeader>
            <DialogTitle>Copy your API key</DialogTitle>
            <DialogDescription>
              This is the only time the full key for <strong>{revealKey?.name}</strong> is shown.
              Store it securely.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3">
            <code className="flex-1 break-all text-xs" data-testid="client-key-value">
              {revealKey?.key}
            </code>
            <Button size="icon" variant="ghost" className="size-8" onClick={copyKey} data-testid="client-key-copy">
              {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setRevealKey(null)} data-testid="client-key-done">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate confirm */}
      <AlertDialog open={!!regenTarget} onOpenChange={(o) => !o && setRegenTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate key?</AlertDialogTitle>
            <AlertDialogDescription>
              The current key for <strong>{regenTarget?.name}</strong> will stop working immediately
              and a new key will be issued.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doRegenerate} disabled={acting} data-testid="client-regenerate-confirm">
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke confirm */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke client?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{revokeTarget?.name}</strong> will be disabled and its key will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doRevoke} disabled={acting} data-testid="client-revoke-confirm">
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete client?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{deleteTarget?.name}</strong> and its key. This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={doDelete}
              disabled={acting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="client-delete-confirm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
