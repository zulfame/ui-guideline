import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { History, Loader2, Send, TriangleAlert, Users } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

export default function PushNotificationsPage() {
  const [cfg, setCfg] = useState(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const loadConfig = async () => {
    try {
      const { data } = await API.get("/notifications/config");
      setCfg(data);
    } catch {
      setCfg({ configured: false, recipient_count: 0 });
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const send = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and message are required");
      return;
    }
    setSending(true);
    try {
      const { data } = await API.post("/notifications/broadcast", {
        title: title.trim(),
        body: body.trim(),
      });
      toast.success("Broadcast sent", {
        description: `Sent ${data.sent}/${data.total} · failed ${data.failed} · cleaned ${data.invalid_removed}`,
      });
      setTitle("");
      setBody("");
      loadConfig();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to send broadcast");
    } finally {
      setSending(false);
    }
  };

  const configured = cfg?.configured;
  const count = cfg?.recipient_count ?? 0;

  return (
    <div className="space-y-6" data-testid="push-page">
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Push Notifications</CardTitle>
            <CardDescription>
              Broadcast a message to every active user that has the mobile app installed.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={configured ? "secondary" : "outline"}
              className="gap-1"
              data-testid="push-recipient-count"
            >
              <Users className="size-3" /> {count} recipient{count === 1 ? "" : "s"}
            </Badge>
            <Button asChild variant="outline" size="sm" data-testid="push-history-link">
              <Link to="/audit-log">
                <History className="size-4" /> History
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-[var(--field-gap)]">
          {cfg && !configured && (
            <Alert data-testid="push-not-configured">
              <TriangleAlert className="size-4" />
              <AlertTitle>Firebase not configured</AlertTitle>
              <AlertDescription>
                Add your Firebase service account to{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  FIREBASE_SERVICE_ACCOUNT_JSON
                </code>{" "}
                in <code className="rounded bg-muted px-1 py-0.5 text-xs">backend/.env</code> to
                enable sending. You can still compose a message below.
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="push-title">Title</Label>
            <Input
              id="push-title"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. New feature available"
              data-testid="push-title"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="push-body">Message</Label>
            <Textarea
              id="push-body"
              rows={5}
              value={body}
              maxLength={500}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write the notification your users will see..."
              data-testid="push-body"
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            onClick={send}
            size="sm"
            disabled={sending || !configured}
            data-testid="push-send"
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="size-4" aria-hidden="true" />
            )}
            Send broadcast
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
