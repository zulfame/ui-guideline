import { useEffect, useRef, useState } from "react";
import { ImageIcon, Loader2, RotateCcw, Save, Upload } from "lucide-react";
import { toast } from "sonner";

import API from "@/lib/api";
import { useBranding } from "@/context/BrandingContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const TEXT_FIELDS = [
  "app_name",
  "tagline",
  "meta_description",
  "meta_keywords",
  "og_title",
  "og_description",
  "site_url",
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
                  <Label htmlFor="site_url">Site URL</Label>
                  <Input
                    id="site_url"
                    value={form.site_url || ""}
                    onChange={(e) => set("site_url", e.target.value)}
                    placeholder="https://app.example.com"
                    data-testid="branding-site_url"
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
