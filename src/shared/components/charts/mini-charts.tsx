import { cn } from "@/lib/utils";

/**
 * Two small single-series charts for the dashboard.
 *
 * Server components, pure SVG — the data is settled on the server and a trend
 * that never changes after paint has no reason to ship JavaScript. The colour is
 * the brand sakura and nothing else: one series needs no palette and no legend,
 * because the panel title already names what is plotted. Everything that is text
 * — labels, values, the peak call-out — wears an ink token, never the series
 * colour, so identity is carried by the mark and meaning by the type.
 *
 * They follow the dataviz mark specs: rounded data-ends on the bars, a 2px gap
 * between them, a single recessive baseline, and selective direct labels (the
 * peak, and the latest value on the line) rather than a number on every point.
 *
 * Static, not hovered: a crosshair tooltip is the usual companion to an SVG
 * chart, and these are built to be legible without one — the peak and latest are
 * labelled, and a screen-reader list carries the full series. A hover layer is a
 * clean later addition if the dashboard wants it.
 */

const VIEW_W = 320;
const VIEW_H = 120;
const PAD = { top: 16, right: 6, bottom: 18, left: 6 };
const PLOT_W = VIEW_W - PAD.left - PAD.right;
const PLOT_H = VIEW_H - PAD.top - PAD.bottom;
const BASELINE = PAD.top + PLOT_H;

export type ChartPoint = { label: string; value: number };

const fmt = (n: number) => n.toLocaleString("en-US");

/** At most `max` evenly spaced tick indices, always including first and last. */
function ticks(n: number, max = 4): number[] {
  if (n <= max) return Array.from({ length: n }, (_, i) => i);
  const out = new Set<number>([0, n - 1]);
  const step = (n - 1) / (max - 1);
  for (let i = 1; i < max - 1; i++) out.add(Math.round(i * step));
  return [...out].sort((a, b) => a - b);
}

/** The full series as text, for screen readers — the chart's table view. */
function SrSeries({ data, unit }: { data: ChartPoint[]; unit: string }) {
  return (
    <ul className="sr-only">
      {data.map((p, i) => (
        <li key={i}>
          {p.label}: {fmt(p.value)} {unit}
        </li>
      ))}
    </ul>
  );
}

function XLabels({ data }: { data: ChartPoint[] }) {
  return (
    <>
      {ticks(data.length).map((i) => {
        const anchor = i === 0 ? "start" : i === data.length - 1 ? "end" : "middle";
        const x = PAD.left + (data.length <= 1 ? PLOT_W / 2 : (i / (data.length - 1)) * PLOT_W);
        return (
          <text
            key={i}
            x={x}
            y={VIEW_H - 5}
            textAnchor={anchor}
            className="fill-muted-foreground text-[8px]"
          >
            {data[i].label}
          </text>
        );
      })}
    </>
  );
}

/* --------------------------------------------------------------------- bars */

export function MiniBarChart({
  data,
  unit,
  className,
  title,
}: {
  data: ChartPoint[];
  unit: string;
  title: string;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((p) => p.value));
  const peakIndex = data.reduce((best, p, i) => (p.value > data[best].value ? i : best), 0);
  const slot = PLOT_W / data.length;
  const barW = Math.max(1, slot - 2); // the 2px surface gap between bars

  return (
    <figure className={cn("min-w-0", className)}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${title}. Peak ${fmt(data[peakIndex]?.value ?? 0)} ${unit} on ${data[peakIndex]?.label ?? "—"}.`}
      >
        {/* Recessive baseline. */}
        <line
          x1={PAD.left}
          y1={BASELINE}
          x2={VIEW_W - PAD.right}
          y2={BASELINE}
          className="stroke-border"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />

        {data.map((p, i) => {
          if (p.value <= 0) return null;
          const h = (p.value / max) * PLOT_H;
          const x = PAD.left + i * slot + (slot - barW) / 2;
          const y = BASELINE - h;
          const r = Math.min(2, barW / 2);
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={r}
              className={cn("fill-sakura", i === peakIndex ? "opacity-100" : "opacity-70")}
            />
          );
        })}

        {/* The peak, labelled once. */}
        {data[peakIndex] && data[peakIndex].value > 0 ? (
          <text
            x={Math.min(
              VIEW_W - PAD.right,
              Math.max(PAD.left, PAD.left + peakIndex * slot + slot / 2)
            )}
            y={BASELINE - (data[peakIndex].value / max) * PLOT_H - 4}
            textAnchor="middle"
            className="fill-foreground text-[9px] font-medium tabular-nums"
          >
            {fmt(data[peakIndex].value)}
          </text>
        ) : null}

        <XLabels data={data} />
      </svg>
      <SrSeries data={data} unit={unit} />
    </figure>
  );
}

/* --------------------------------------------------------------------- line */

export function MiniLineChart({
  data,
  unit,
  className,
  title,
}: {
  data: ChartPoint[];
  unit: string;
  title: string;
  className?: string;
}) {
  const gradientId = `spark-${title.replace(/[^a-z0-9]/gi, "")}`;

  if (data.length < 2) {
    return (
      <figure className={cn("min-w-0", className)}>
        <div className="grid h-24 place-items-center rounded-lg border border-dashed border-border text-center">
          <p className="text-xs text-muted-foreground">
            {data.length === 1 ? (
              <>
                <span className="tabular text-foreground">{fmt(data[0].value)}</span> {unit} so far —
                a trend needs a second week.
              </>
            ) : (
              "Not enough runs yet to trend."
            )}
          </p>
        </div>
      </figure>
    );
  }

  const max = Math.max(1, ...data.map((p) => p.value));
  const min = Math.min(...data.map((p) => p.value));
  const span = Math.max(1, max - min);
  const peakIndex = data.reduce((best, p, i) => (p.value > data[best].value ? i : best), 0);
  const last = data.length - 1;

  // A little top/bottom breathing room so the peak dot is not clipped.
  const xy = (i: number, v: number) => {
    const x = PAD.left + (i / (data.length - 1)) * PLOT_W;
    const y = PAD.top + (1 - (v - min) / span) * (PLOT_H - 6) + 3;
    return { x, y };
  };

  const pts = data.map((p, i) => xy(i, p.value));
  const line = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${PAD.left},${BASELINE} ${line} ${PAD.left + PLOT_W},${BASELINE}`;

  return (
    <figure className={cn("min-w-0", className)}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${title}. Latest ${fmt(data[last].value)} ${unit}; peak ${fmt(data[peakIndex].value)} ${unit}.`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--sakura)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--sakura)" stopOpacity={0} />
          </linearGradient>
        </defs>

        <line
          x1={PAD.left}
          y1={BASELINE}
          x2={VIEW_W - PAD.right}
          y2={BASELINE}
          className="stroke-border"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />

        <polygon points={area} fill={`url(#${gradientId})`} />
        <polyline
          points={line}
          fill="none"
          className="stroke-sakura"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* The latest point, marked and labelled. */}
        <circle cx={pts[last].x} cy={pts[last].y} r={3} className="fill-sakura" />
        <text
          x={pts[last].x}
          y={Math.max(10, pts[last].y - 6)}
          textAnchor="end"
          className="fill-foreground text-[9px] font-medium tabular-nums"
        >
          {fmt(data[last].value)}
        </text>

        <XLabels data={data} />
      </svg>
      <SrSeries data={data} unit={unit} />
    </figure>
  );
}
