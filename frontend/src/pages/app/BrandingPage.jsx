import { useEffect, useRef, useState } from "react";
import { Eye, ImageIcon, Info, Loader2, Plus, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import API from "@/lib/api";
import { SortHead, useSortableRows } from "@/components/composite/sortable-table";
import { useBranding } from "@/context/BrandingContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  "brand_initial",
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

/** Reusable section wrapper — bordered card with a title header (reference layout). */
function Section({ title, children, testid }) {
  return (
    <Card data-testid={testid}>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

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
      toast.success(`${label} diperbarui`);
      await onChanged();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Unggah gagal. Silakan coba lagi.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const reset = async () => {
    setBusy(true);
    try {
      await API.delete(`/branding/assets/${kind}`);
      toast.success(`${label} direset`);
      await onChanged();
    } catch {
      toast.error("Reset gagal. Silakan coba lagi.");
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
            {previewUrl ? "Ganti" : "Unggah"}
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
      toast.error("Gagal memuat URL sitemap.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUrls();
  }, []);

  const add = async () => {
    if (!newPath.trim()) {
      toast.error("Path wajib diisi.");
      return;
    }
    setAdding(true);
    try {
      await API.post("/sitemap-urls", {
        path: newPath.trim(),
        changefreq: newFreq,
        priority: newPriority,
      });
      toast.success("URL ditambahkan");
      setNewPath("");
      setNewFreq("weekly");
      setNewPriority("0.5");
      fetchUrls();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal menambahkan URL.");
    } finally {
      setAdding(false);
    }
  };

  const patch = async (id, field, value) => {
    setUrls((prev) => prev.map((u) => (u.id === id ? { ...u, [field]: value } : u)));
    try {
      await API.put(`/sitemap-urls/${id}`, { [field]: value });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Pembaruan gagal.");
      fetchUrls();
    }
  };

  const remove = async (id) => {
    try {
      await API.delete(`/sitemap-urls/${id}`);
      toast.success("URL dihapus");
      fetchUrls();
    } catch {
      toast.error("Hapus gagal.");
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Kelola halaman publik yang disertakan pada{" "}
        <span className="font-medium text-foreground">sitemap.xml</span>. Root situs ditambahkan
        otomatis; tambah, ubah, atau hapus entri sesuai kebutuhan. Path digabung dengan alamat
        aplikasi Anda yang <span className="font-medium text-foreground">terdeteksi otomatis</span>{" "}
        dari server.
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
          <Label>Frekuensi</Label>
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
          <Label>Prioritas</Label>
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
          size="sm"
          disabled={adding}
          className="w-full sm:w-auto"
          data-testid="sitemap-add-btn"
        >
          {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Tambah
        </Button>
      </div>

      <div className="rounded-md border">
        <Table
          data-testid="sitemap-table"
          className="tbl-density [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap"
        >
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>
                <SortHead label="Path" sortKey="path" sort={sort} onToggle={toggle} />
              </TableHead>
              <TableHead>Frekuensi</TableHead>
              <TableHead>Prioritas</TableHead>
              <TableHead>Aktif</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Memuat…
                </TableCell>
              </TableRow>
            ) : urls.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Belum ada URL.
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
                      aria-label="Hapus URL"
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

  useEffect(() => {
    if (form === null && branding) setForm(extract(branding));
  }, [branding, form]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await API.put("/branding", form);
      await refresh();
      toast.success("Branding tersimpan");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Simpan gagal. Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  if (!form) return null;

  const initial =
    (form.brand_initial || "").trim() ||
    (form.app_name || "A").trim().slice(0, 2).toUpperCase();
  const ogUrl = assetUrl("og_image");

  return (
    <div className="space-y-6 pb-24" data-testid="branding-page">
      {/* Identitas Aplikasi */}
      <Section title="Identitas Aplikasi" testid="branding-section-identity">
        <div className="grid grid-cols-1 items-end gap-4 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="app_name">Nama Aplikasi</Label>
            <Input
              id="app_name"
              value={form.app_name || ""}
              onChange={(e) => set("app_name", e.target.value)}
              placeholder="mis. BPR Bangun Arta"
              data-testid="branding-app_name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tagline">Tagline / Sub Judul</Label>
            <Input
              id="tagline"
              value={form.tagline || ""}
              onChange={(e) => set("tagline", e.target.value)}
              placeholder="Subjudul singkat di bawah nama"
              data-testid="branding-tagline"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand_initial">Inisial Brand</Label>
            <Input
              id="brand_initial"
              maxLength={3}
              value={form.brand_initial || ""}
              onChange={(e) => set("brand_initial", e.target.value)}
              placeholder="mis. BA"
              data-testid="branding-brand_initial"
            />
            <p className="text-xs text-muted-foreground">Dipakai bila logo belum diunggah.</p>
          </div>
          <div
            className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3"
            data-testid="branding-identity-preview"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold uppercase text-primary-foreground">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{form.app_name || "Application Name"}</p>
              {form.tagline ? (
                <p className="truncate text-xs text-muted-foreground">{form.tagline}</p>
              ) : null}
            </div>
          </div>
        </div>
      </Section>

      {/* Aset Merek */}
      <Section title="Aset Merek" testid="branding-section-assets">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <AssetField
            kind="logo_light"
            label="Logo (latar terang)"
            hint="Logo gelap untuk latar terang. PNG/SVG, maks 512 KB."
            previewUrl={assetUrl("logo_light")}
            onChanged={refresh}
          />
          <AssetField
            kind="logo_dark"
            label="Logo (latar gelap)"
            hint="Logo terang untuk latar gelap, mis. panel login."
            previewUrl={assetUrl("logo_dark")}
            onChanged={refresh}
          />
          <AssetField
            kind="favicon"
            label="Favicon"
            hint="Ikon persegi (PNG/ICO), 32-512 px."
            previewUrl={assetUrl("favicon")}
            onChanged={refresh}
          />
        </div>
        <div className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Semua aset disimpan langsung di database (bukan penyimpanan berkas), sehingga otomatis
            ikut terbawa saat Backup &amp; Restore.
          </span>
        </div>
      </Section>

      {/* SEO & Metadata */}
      <Section title="SEO & Metadata" testid="branding-section-seo">
        <div className="space-y-1.5">
          <Label htmlFor="meta_description">Meta Description</Label>
          <Textarea
            id="meta_description"
            rows={3}
            value={form.meta_description || ""}
            onChange={(e) => set("meta_description", e.target.value)}
            placeholder="Ringkasan singkat situs (≈155 karakter)."
            data-testid="branding-meta_description"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="meta_keywords">Meta Keywords</Label>
            <Input
              id="meta_keywords"
              value={form.meta_keywords || ""}
              onChange={(e) => set("meta_keywords", e.target.value)}
              placeholder="kata, kunci, dipisah, koma"
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
        <div className="flex items-center justify-between gap-4 rounded-md border px-3 py-2">
          <div>
            <Label htmlFor="allow_indexing" className="text-sm font-normal">
              Terlihat di mesin pencari
            </Label>
            <p className="text-xs text-muted-foreground">
              Bila nonaktif, halaman meminta mesin pencari untuk tidak mengindeks (noindex,
              nofollow). Disarankan tetap nonaktif untuk konsol internal.
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
          <span className="font-medium text-foreground">Berkas otomatis:</span>{" "}
          <a
            href="/robots.txt"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
            data-testid="branding-robots-link"
          >
            /robots.txt
          </a>{" "}
          (mengikuti toggle visibilitas) dan{" "}
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
            data-testid="branding-sitemap-link"
          >
            /sitemap.xml
          </a>{" "}
          (URL terdeteksi otomatis dari alamat aplikasi). Simpan perubahan dulu untuk melihat
          pembaruannya.
        </div>
      </Section>

      {/* Sitemap */}
      <Section title="Sitemap" testid="branding-section-sitemap">
        <SitemapManager />
      </Section>

      {/* Pratinjau Tautan (Open Graph) */}
      <Section title="Pratinjau Tautan (Open Graph)" testid="branding-section-social">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="og_title">OG Title</Label>
            <Input
              id="og_title"
              value={form.og_title || ""}
              onChange={(e) => set("og_title", e.target.value)}
              placeholder="Default mengikuti nama aplikasi"
              data-testid="branding-og_title"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="og_description">OG Description</Label>
            <Input
              id="og_description"
              value={form.og_description || ""}
              onChange={(e) => set("og_description", e.target.value)}
              placeholder="Default mengikuti meta description"
              data-testid="branding-og_description"
            />
          </div>
        </div>
        <AssetField
          kind="og_image"
          label="OG Image"
          hint="Gambar pratinjau tautan (disarankan 1200×630)."
          previewUrl={ogUrl}
          onChanged={refresh}
        />
        <p className="text-xs text-muted-foreground">
          Pratinjau tautan dipakai oleh crawler WhatsApp, Facebook, Telegram, dan X. Setelah
          mengubah, minta ulang pratinjau di aplikasi chat (cache crawler bisa bertahan beberapa
          jam).
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!ogUrl}
          onClick={() => ogUrl && window.open(ogUrl, "_blank", "noopener")}
          data-testid="branding-og-test"
        >
          <Eye className="size-4" /> Uji
        </Button>
      </Section>

      {/* Kontak & Footer */}
      <Section title="Kontak & Footer" testid="branding-section-contact">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="support_email">Email Dukungan</Label>
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
            <Label htmlFor="copyright_text">Teks Hak Cipta / Footer</Label>
            <Input
              id="copyright_text"
              value={form.copyright_text || ""}
              onChange={(e) => set("copyright_text", e.target.value)}
              placeholder="© 2026 Perusahaan Anda"
              data-testid="branding-copyright_text"
            />
          </div>
        </div>
      </Section>

      {/* Sticky save bar (aligned right, all screens) */}
      <div className="sticky bottom-0 z-10 -mx-4 flex justify-end border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6">
        <Button
          onClick={save}
          size="sm"
          disabled={saving}
          data-testid="branding-save-btn"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Simpan
        </Button>
      </div>
    </div>
  );
}
