import { useEffect, useRef, useState } from "react";
import { Loader2, Save, Send, RotateCcw, Mail, Info } from "lucide-react";
import { toast } from "sonner";

import API from "@/lib/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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

function errDetail(e, fallback) {
  const d = e?.response?.data?.detail;
  if (typeof d === "string") return d;
  return fallback;
}

export default function EmailTemplatesPage() {
  const [status, setStatus] = useState("loading");
  const [templates, setTemplates] = useState([]);
  const [activeKey, setActiveKey] = useState("");
  const [form, setForm] = useState({ subject: "", body_html: "", enabled: true });
  const [preview, setPreview] = useState({ subject: "", html: "" });
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const bodyRef = useRef(null);

  const active = templates.find((t) => t.key === activeKey) || null;

  const loadPreview = async (key) => {
    try {
      const { data } = await API.post(`/email-templates/${key}/preview`);
      setPreview(data);
    } catch {
      setPreview({ subject: "", html: "" });
    }
  };

  const selectTemplate = (key, list) => {
    const src = list || templates;
    const t = src.find((x) => x.key === key);
    if (!t) return;
    setActiveKey(key);
    setForm({
      subject: t.subject || "",
      body_html: t.body_html || "",
      enabled: t.enabled !== false,
    });
    loadPreview(key);
  };

  useEffect(() => {
    (async () => {
      try {
        const { data } = await API.get("/email-templates");
        setTemplates(data);
        setStatus("ready");
        if (data.length) selectTemplate(data[0].key, data);
      } catch {
        setStatus("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const insertVariable = (name) => {
    const el = bodyRef.current;
    const token = `{{${name}}}`;
    if (!el) {
      set("body_html", (form.body_html || "") + token);
      return;
    }
    const start = el.selectionStart ?? form.body_html.length;
    const end = el.selectionEnd ?? form.body_html.length;
    const next = form.body_html.slice(0, start) + token + form.body_html.slice(end);
    set("body_html", next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await API.put(`/email-templates/${activeKey}`, {
        subject: form.subject,
        body_html: form.body_html,
        enabled: form.enabled,
      });
      setTemplates((list) => list.map((t) => (t.key === activeKey ? data : t)));
      toast.success("Template saved");
      loadPreview(activeKey);
    } catch (e) {
      toast.error(errDetail(e, "Failed to save template"));
    } finally {
      setSaving(false);
    }
  };

  const resetToActive = () => {
    if (active) selectTemplate(active.key);
  };

  const sendTest = async () => {
    if (!testEmail.trim()) {
      toast.error("Enter a recipient email");
      return;
    }
    setSendingTest(true);
    try {
      const { data } = await API.post(`/email-templates/${activeKey}/send-test`, {
        to: testEmail.trim(),
      });
      toast.success(data.message || "Test email sent");
    } catch (e) {
      toast.error(errDetail(e, "Failed to send test email"));
    } finally {
      setSendingTest(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="space-y-4" data-testid="email-templates-loading">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <Alert variant="destructive" data-testid="email-templates-error">
        <Info className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>Couldn&apos;t load templates</AlertTitle>
        <AlertDescription>Please refresh the page and try again.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4" data-testid="email-templates-page">
      <p className="text-sm text-muted-foreground">
        Customize the transactional emails your app sends. Templates use{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">{`{{variable}}`}</code>{" "}
        placeholders and are delivered through the{" "}
        <span className="font-medium text-foreground">Email (SMTP)</span> channel
        configured in Broadcast.
      </p>

      {templates.length > 1 ? (
        <div className="w-full max-w-xs space-y-1.5">
          <Label>Template</Label>
          <Select value={activeKey} onValueChange={(v) => selectTemplate(v)}>
            <SelectTrigger data-testid="email-template-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.key} value={t.key}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4" aria-hidden="true" />
                {active?.name || "Template"}
              </CardTitle>
              <CardDescription>{active?.description}</CardDescription>
            </div>
            <div className="flex items-center gap-2 rounded-md border px-3 py-1.5">
              <Switch
                id="tpl-enabled"
                checked={form.enabled}
                onCheckedChange={(v) => set("enabled", v)}
                data-testid="email-template-enabled"
              />
              <Label htmlFor="tpl-enabled" className="text-sm font-normal">
                Enabled
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="editor" className="space-y-4">
            <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
              <TabsTrigger value="editor" data-testid="email-tab-editor">
                Editor
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                data-testid="email-tab-preview"
                onClick={() => loadPreview(activeKey)}
              >
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="tpl-subject">Subject</Label>
                <Input
                  id="tpl-subject"
                  value={form.subject}
                  onChange={(e) => set("subject", e.target.value)}
                  placeholder="Email subject line"
                  data-testid="email-template-subject"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tpl-body">Body (HTML)</Label>
                <Textarea
                  id="tpl-body"
                  ref={bodyRef}
                  value={form.body_html}
                  onChange={(e) => set("body_html", e.target.value)}
                  rows={14}
                  className="font-mono text-xs"
                  data-testid="email-template-body"
                />
              </div>

              {active?.variables?.length ? (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Click to insert a variable at the cursor
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {active.variables.map((v) => (
                      <Badge
                        key={v}
                        variant="secondary"
                        className="cursor-pointer font-mono text-xs hover:bg-secondary/80"
                        onClick={() => insertVariable(v)}
                        data-testid={`email-var-${v}`}
                      >
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="preview" className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Subject</p>
                <p className="text-sm font-medium" data-testid="email-preview-subject">
                  {preview.subject || "—"}
                </p>
              </div>
              <div className="overflow-hidden rounded-md border">
                <iframe
                  title="Email preview"
                  srcDoc={preview.html || "<p style='font-family:sans-serif;padding:16px;color:gray'>Save the template to render a preview.</p>"}
                  className="h-[420px] w-full bg-background"
                  sandbox=""
                  data-testid="email-preview-frame"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Preview uses sample data. Real emails fill variables with the
                recipient&apos;s details and a live reset link.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-2">
            <Button onClick={save} disabled={saving} data-testid="email-template-save">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-4 w-4" aria-hidden="true" />
              )}
              Save changes
            </Button>
            <Button
              variant="outline"
              onClick={resetToActive}
              disabled={saving}
              data-testid="email-template-reset"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Revert
            </Button>
          </div>

          <div className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-test" className="text-xs text-muted-foreground">
                Send a test to
              </Label>
              <Input
                id="tpl-test"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full sm:w-56"
                data-testid="email-template-test-input"
              />
            </div>
            <Button
              variant="secondary"
              onClick={sendTest}
              disabled={sendingTest}
              data-testid="email-template-send-test"
            >
              {sendingTest ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              Send test
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
