import React, { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { Download, FileImage, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * SVG-based organization chart with horizontal swimlanes (by level).
 * - Nodes grouped into swimlanes ordered by each level's `order`.
 * - Within a swimlane, nodes are ordered left→right by role `order` then name.
 * - Solid connectors = direct superior (parent_id).
 * - Dashed connectors = dotted-line superior (dotted_parent_id).
 * - Each level can carry a `color` used for node fill/border + swimlane band.
 * - Export the chart to PNG or PDF.
 */

const LABEL_W = 132;
const NODE_W = 156;
const NODE_H = 46;
const H_GAP = 28;
const ROW_GAP = 82;
const PAD = 24;
const NO_LEVEL = "__no_level__";

function withAlpha(hex, a) {
  if (!hex) return undefined;
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function OrgChart({ roles = [], levels = [] }) {
  const chartRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  const colorByLevel = useMemo(() => {
    const m = {};
    levels.forEach((l) => (m[l.id] = l.color || null));
    return m;
  }, [levels]);

  const { nodes, links, totalW, totalH, swimlanes } = useMemo(() => {
    const levelIds = new Set(levels.map((l) => l.id));
    const sortedLevels = [...levels].sort(
      (a, b) => a.order - b.order || a.name.localeCompare(b.name),
    );

    const byLevel = (lid) =>
      roles
        .filter((r) =>
          lid === NO_LEVEL
            ? !r.level_id || !levelIds.has(r.level_id)
            : r.level_id === lid,
        )
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

    const lanes = sortedLevels
      .map((l) => ({ id: l.id, name: l.name, color: l.color || null, roles: byLevel(l.id) }))
      .filter((l) => l.roles.length > 0);
    const orphans = byLevel(NO_LEVEL);
    if (orphans.length)
      lanes.push({ id: NO_LEVEL, name: "No level", color: null, roles: orphans });

    const maxCount = Math.max(1, ...lanes.map((l) => l.roles.length));
    const contentW = maxCount * (NODE_W + H_GAP) - H_GAP;

    const posMap = {};
    const nodeList = [];
    lanes.forEach((lane, ri) => {
      const rowY = PAD + ri * (NODE_H + ROW_GAP);
      const n = lane.roles.length;
      const rowW = n * (NODE_W + H_GAP) - H_GAP;
      const startX = LABEL_W + PAD + (contentW - rowW) / 2;
      lane.roles.forEach((r, i) => {
        const x = startX + i * (NODE_W + H_GAP);
        posMap[r.id] = { x, y: rowY, cx: x + NODE_W / 2, top: rowY, bottom: rowY + NODE_H };
        nodeList.push({ ...r, _x: x, _y: rowY });
      });
    });

    const totalWidth = LABEL_W + PAD * 2 + contentW;
    const totalHeight = PAD * 2 + lanes.length * (NODE_H + ROW_GAP) - ROW_GAP;

    const path = (child, parent) => {
      const c = posMap[child];
      const p = posMap[parent];
      if (!c || !p) return null;
      if (p.bottom < c.top) {
        const midY = (p.bottom + c.top) / 2;
        return `M ${c.cx} ${c.top} L ${c.cx} ${midY} L ${p.cx} ${midY} L ${p.cx} ${p.bottom}`;
      }
      const pcy = p.top + NODE_H / 2;
      const ccy = c.top + NODE_H / 2;
      return `M ${c.cx} ${ccy} L ${p.cx} ${pcy}`;
    };

    const linkList = [];
    roles.forEach((r) => {
      if (r.parent_id && posMap[r.parent_id]) {
        const d = path(r.id, r.parent_id);
        if (d) linkList.push({ id: `s-${r.id}`, d, dashed: false });
      }
      if (r.dotted_parent_id && posMap[r.dotted_parent_id]) {
        const d = path(r.id, r.dotted_parent_id);
        if (d) linkList.push({ id: `d-${r.id}`, d, dashed: true });
      }
    });

    return {
      nodes: nodeList,
      links: linkList,
      totalW: totalWidth,
      totalH: totalHeight,
      swimlanes: lanes,
    };
  }, [roles, levels]);

  const doExport = async (kind) => {
    if (!chartRef.current) return;
    setExporting(true);
    try {
      const node = chartRef.current;
      const w = node.scrollWidth;
      const h = node.scrollHeight;
      const dataUrl = await toPng(node, {
        backgroundColor: "#ffffff", // guard-allow: exported image needs a solid white canvas
        pixelRatio: 2,
        width: w,
        height: h,
        style: { margin: "0" },
      });
      if (kind === "png") {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "org-chart.png";
        a.click();
      } else {
        const pdf = new jsPDF({
          orientation: w >= h ? "landscape" : "portrait",
          unit: "pt",
          format: [w, h],
        });
        pdf.addImage(dataUrl, "PNG", 0, 0, w, h);
        pdf.save("org-chart.pdf");
      }
    } finally {
      setExporting(false);
    }
  };

  if (!nodes.length) {
    return <p className="text-sm text-muted-foreground">No roles yet.</p>;
  }

  return (
    <div className="space-y-3" data-testid="org-chart">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <svg width="26" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="26" y2="4" style={{ stroke: "hsl(var(--foreground))" }} strokeWidth="1.5" />
            </svg>
            Direct superior
          </span>
          <span className="inline-flex items-center gap-2">
            <svg width="26" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="26" y2="4" style={{ stroke: "hsl(var(--muted-foreground))" }} strokeWidth="1.5" strokeDasharray="4 3" />
            </svg>
            Dotted-line superior
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={exporting} data-testid="org-export-btn">
              <Download className="size-4" /> {exporting ? "Exporting..." : "Export"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => doExport("png")} data-testid="org-export-png">
              <FileImage className="size-4" /> Download PNG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => doExport("pdf")} data-testid="org-export-pdf">
              <FileText className="size-4" /> Download PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div ref={chartRef} className="relative min-w-max" style={{ width: totalW, height: totalH }}>
        {swimlanes.map((lane, ri) => {
          const rowY = PAD + ri * (NODE_H + ROW_GAP);
          return (
            <React.Fragment key={lane.id}>
              <div
                className="absolute rounded-md"
                style={{
                  left: LABEL_W + PAD - 8,
                  top: rowY - 10,
                  width: totalW - LABEL_W - PAD * 2 + 16,
                  height: NODE_H + 20,
                  backgroundColor: lane.color ? withAlpha(lane.color, 0.1) : "hsl(var(--muted) / 0.4)",
                }}
                aria-hidden="true"
              />
              <div
                className="absolute flex items-center gap-2 text-xs font-medium text-muted-foreground"
                style={{ left: PAD, top: rowY, width: LABEL_W - 12, height: NODE_H }}
                data-testid={`org-lane-${lane.id}`}
              >
                {lane.color && (
                  <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: lane.color }} aria-hidden="true" />
                )}
                {lane.name}
              </div>
            </React.Fragment>
          );
        })}

        <svg className="pointer-events-none absolute inset-0" width={totalW} height={totalH}>
          {links.map((l) => (
            <path
              key={l.id}
              d={l.d}
              fill="none"
              style={{ stroke: l.dashed ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))" }}
              strokeWidth="1.5"
              strokeDasharray={l.dashed ? "4 3" : undefined}
            />
          ))}
        </svg>

        {nodes.map((n) => {
          const c = colorByLevel[n.level_id];
          return (
            <div
              key={n.id}
              className="absolute flex items-center justify-center rounded-md border bg-card px-2 text-center text-xs font-medium text-card-foreground shadow-sm"
              style={{
                left: n._x,
                top: n._y,
                width: NODE_W,
                height: NODE_H,
                ...(c ? { backgroundColor: withAlpha(c, 0.18), borderColor: c } : {}),
              }}
              data-testid={`org-node-${n.id}`}
            >
              <span className="line-clamp-2">{n.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
