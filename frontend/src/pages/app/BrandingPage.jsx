import { useEffect, useRef, useState } from "react";
import { ImageIcon, Loader2, Plus, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import API from "@/lib/api";
import { SortHead, useSortableRows } from "@/components/composite/sortable-table";
import { useBranding } from "@/context/BrandingContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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

const CHANGEFREQS = ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"];
const PRIORITIES = ["1.0", "0.9", "0.8", "0.7", "0.6", "0.5", "0.4", "0.3", "0.2", "0.1", "0.0"];
const SITEMAP_SORT = { path: (u) => u.path };

const TEXT_FIELDS = [
  "app_name",
  "tagline",
  "meta_description",
  "meta_keywords",
  "og_title",
  "og_description",
  "canonical_url",
  "allow_indexing",
  "support_email",
  "copyright_text",
];

const extract = (b) => {
  const out = {};
  TEXT_FIELDS.forEach((k) => (out[k] = b[k]));
  return out;
};

function AssetField({ kind, label, hint, previewUrl, onChanged }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      await API.post(`/branding/assets/${kind}`, fd);
      toast.success(`${label} updated`);
      await onChanged();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const reset = async () => {
    setBusy(true);
    try {
      await API.delete(`/branding/assets/${kind}`);
      toast.success(`${label} reset`);
      await onChanged();
    } catch {
      toast.error("Reset failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2" data-testid={`branding-asset-${kind}`}>
      <div>
        <Label>{label}</Label>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
          {previewUrl ? (
            <img src={previewUrl} alt={label} className="size-full object-contain" />
          ) : (
            <ImageIcon className="size-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
            data-testid={`branding-file-${kind}`}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            data-testid={`branding-upload-${kind}`}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {previewUrl ? "Replace" : "Upload"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy || !previewUrl}
            onClick={reset}
            data-testid={`branding-reset-${kind}`}
          >
            <RotateCcw className="size-4" /> Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

function SitemapManager() {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPath, setNewPath] = useState("");
  const [newFreq, setNewFreq] = useState("weekly");
  const [newPriority, setNewPriority] = useState("0.5");
  const [adding, setAdding] = useState(false);
  const { sorted, sort, toggle } = useSortableRows(urls, SITEMAP_SORT);

  const fetchUrls = async () => {
    try {
      const { data } = await API.get("/sitemap-urls");
      setUrls(data);
    } catch {
      toast.error("Failed to load sitemap URLs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUrls();
  }, []);

  const add = async () => {
    if (!newPath.trim()) {
      toast.error("Path is required.");
      return;
    }
    setAdding(true);
    try {
      await API.post("/sitemap-urls", {
        path: newPath.trim(),
        changefreq: newFreq,
        priority: newPriority,
      });
      toast.success("URL added");
      setNewPath("");
      setNewFreq("weekly");
      setNewPriority("0.5");
      fetchUrls();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to add URL.");
    } finally {
      setAdding(false);
    }
  };

  const patch = async (id, field, value) => {
    setUrls((prev) => prev.map((u) => (u.id === id ? { ...u, [field]: value } : u)));
    try {
      await API.put(`/sitemap-urls/${id}`, { [field]: value });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Update failed.");
      fetchUrls();
    }
  };

  const remove = async (id) => {
    try {
      await API.delete(`/sitemap-urls/${id}`);
      toast.success("URL removed");
      fetchUrls();
    } catch {
      toast.error("Delete failed.");
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Manage the public pages included in <span className="font-medium text-foreground">sitemap.xml</span>.
        The site root is added automatically; add, edit, or remove entries as needed. Paths combine
        with your app&apos;s address, which is <span className="font-medium text-foreground">detected automatically</span> from the server.
      </p>

      {/* Add row */}
      <div className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="sitemap-new-path">Path</Label>
          <Input
            id="sitemap-new-path"
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            placeholder="/about"
            data-testid="sitemap-new-path"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Change freq</Label>
          <Select value={newFreq} onValueChange={setNewFreq}>
            <SelectTrigger className="w-full sm:w-36" data-testid="sitemap-new-freq">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANGEFREQS.map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={newPriority} onValueChange={setNewPriority}>
            <SelectTrigger className="w-full sm:w-24" data-testid="sitemap-new-priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={add}
          disabled={adding}
          className="w-full sm:w-auto"
          data-testid="sitemap-add-btn"
        >
          {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Add
        </Button>
      </div>

      <div className="rounded-md border">
        <Table
          data-testid="sitemap-table"
          className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap"
        >
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>
                <SortHead label="Path" sortKey="path" sort={sort} onToggle={toggle} />
              </TableHead>
              <TableHead>Change freq</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : urls.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No URLs yet.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((u) => (
                <TableRow key={u.id} data-testid={`sitemap-row-${u.id}`}>
                  <TableCell className="font-medium">{u.path}</TableCell>
                  <TableCell>
                    <Select value={u.changefreq} onValueChange={(v) => patch(u.id, "changefreq", v)}>
                      <SelectTrigger className="w-full sm:w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CHANGEFREQS.map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={u.priority} onValueChange={(v) => patch(u.id, "priority", v)}>
                      <SelectTrigger className="w-full sm:w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={Boolean(u.enabled)}
                      onCheckedChange={(v) => patch(u.id, "enabled", v)}
                      data-testid={`sitemap-enabled-${u.id}`}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      onClick={() => remove(u.id)}
                      aria-label="Delete URL"
                      data-testid={`sitemap-delete-${u.id}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function BrandingPage() {
  const { branding, refresh, assetUrl } = useBranding();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("general");

  useEffect(() => {
    if (form === null && branding) setForm(extract(branding));
  }, [branding, form]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await API.put("/branding", form);
      await refresh();
      toast.success("Branding saved");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!form) return null;

  return (
    <div className="space-y-6" data-testid="branding-page">
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="general" data-testid="branding-tab-general">General</TabsTrigger>
            <TabsTrigger value="logos" data-testid="branding-tab-logos">Logos & Favicon</TabsTrigger>
            <TabsTrigger value="seo" data-testid="branding-tab-seo">SEO</TabsTrigger>
            <TabsTrigger value="sitemap" data-testid="branding-tab-sitemap">Sitemap</TabsTrigger>
            <TabsTrigger value="social" data-testid="branding-tab-social">Social</TabsTrigger>
            <TabsTrigger value="contact" data-testid="branding-tab-contact">Contact</TabsTrigger>
          </TabsList>
          <Button
            onClick={save}
            disabled={saving}
            className="hidden sm:inline-flex sm:w-auto"
            data-testid="branding-save-btn"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save changes
          </Button>
        </div>

        {/* General */}
        <TabsContent value="general">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="app_name">Application name</Label>
                  <Input
                    id="app_name"
                    value={form.app_name || ""}
                    onChange={(e) => set("app_name", e.target.value)}
                    placeholder="e.g. BPR Bangun Arta"
                    data-testid="branding-app_name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={form.tagline || ""}
                    onChange={(e) => set("tagline", e.target.value)}
                    placeholder="Short subtitle shown under the name"
                    data-testid="branding-tagline"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logos & Favicon */}
        <TabsContent value="logos">
          <Card>
            <CardContent className="grid grid-cols-1 gap-6 pt-6 sm:grid-cols-3">
              <AssetField
                kind="logo_light"
                label="Logo (light background)"
                hint="Dark logo for light backgrounds."
                previewUrl={assetUrl("logo_light")}
                onChanged={refresh}
              />
              <AssetField
                kind="logo_dark"
                label="Logo (dark background)"
                hint="Light logo for dark backgrounds."
                previewUrl={assetUrl("logo_dark")}
                onChanged={refresh}
              />
              <AssetField
                kind="favicon"
                label="Favicon"
                hint="Square icon (PNG/ICO), 32-512px."
                previewUrl={assetUrl("favicon")}
                onChanged={refresh}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-1.5">
                <Label htmlFor="meta_description">Meta description</Label>
                <Textarea
                  id="meta_description"
                  rows={3}
                  value={form.meta_description || ""}
                  onChange={(e) => set("meta_description", e.target.value)}
                  placeholder="A concise summary of the site (≈155 characters)."
                  data-testid="branding-meta_description"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="meta_keywords">Meta keywords</Label>
                  <Input
                    id="meta_keywords"
                    value={form.meta_keywords || ""}
                    onChange={(e) => set("meta_keywords", e.target.value)}
                    placeholder="comma, separated, keywords"
                    data-testid="branding-meta_keywords"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="canonical_url">Canonical URL</Label>
                  <Input
                    id="canonical_url"
                    value={form.canonical_url || ""}
                    onChange={(e) => set("canonical_url", e.target.value)}
                    placeholder="https://app.example.com"
                    data-testid="branding-canonical_url"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <Label htmlFor="allow_indexing" className="text-sm font-normal">
                    Search engine visibility
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    When off, search engines are asked not to index this site (noindex).
                  </p>
                </div>
                <Switch
                  id="allow_indexing"
                  checked={Boolean(form.allow_indexing)}
                  onCheckedChange={(v) => set("allow_indexing", v)}
                  data-testid="branding-allow_indexing"
                />
              </div>
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Auto-served files:</span>{" "}
                <a
                  href="/robots.txt"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-foreground"
                  data-testid="branding-robots-link"
                >
                  /robots.txt
                </a>{" "}
                (reflects the visibility toggle) and{" "}
                <a
                  href="/sitemap.xml"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-foreground"
                  data-testid="branding-sitemap-link"
                >
                  /sitemap.xml
                </a>{" "}
                (URL detected automatically from your app&apos;s address). Save your changes first to see them update.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sitemap */}
        <TabsContent value="sitemap">
          <Card>
            <CardContent className="pt-6">
              <SitemapManager />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social */}
        <TabsContent value="social">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="og_title">OG title</Label>
                  <Input
                    id="og_title"
                    value={form.og_title || ""}
                    onChange={(e) => set("og_title", e.target.value)}
                    placeholder="Falls back to application name"
                    data-testid="branding-og_title"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="og_description">OG description</Label>
                  <Input
                    id="og_description"
                    value={form.og_description || ""}
                    onChange={(e) => set("og_description", e.target.value)}
                    placeholder="Falls back to meta description"
                    data-testid="branding-og_description"
                  />
                </div>
              </div>
              <AssetField
                kind="og_image"
                label="OG image"
                hint="Preview image for shared links (recommended 1200×630)."
                previewUrl={assetUrl("og_image")}
                onChanged={refresh}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact */}
        <TabsContent value="contact">
          <Card>
            <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="support_email">Support email</Label>
                <Input
                  id="support_email"
                  type="email"
                  value={form.support_email || ""}
                  onChange={(e) => set("support_email", e.target.value)}
                  placeholder="support@example.com"
                  data-testid="branding-support_email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="copyright_text">Copyright / footer text</Label>
                <Input
                  id="copyright_text"
                  value={form.copyright_text || ""}
                  onChange={(e) => set("copyright_text", e.target.value)}
                  placeholder="© 2026 Your Company"
                  data-testid="branding-copyright_text"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Mobile-only save bar (desktop save lives in the tab toolbar). */}
      <div className="sticky bottom-0 -mx-4 border-t bg-background p-4 sm:hidden">
        <Button
          onClick={save}
          disabled={saving}
          className="w-full"
          data-testid="branding-save-btn-mobile"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
