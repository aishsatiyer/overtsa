"use client";

import { useEffect, useMemo, useState } from "react";
import type { LocationHeatmapEntry, LocationHeatmapResponse, Overview } from "@overtly/shared";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { scaleLinear } from "d3-scale";
import {
  Activity,
  ArrowRight,
  BellRing,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CalendarX,
  Clock3,
  Globe2,
  Handshake,
  MessageCircleOff,
  MessagesSquare,
  Radar,
  Send,
  UserCheck
} from "lucide-react";
import { feature } from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";

const emptyOverview: Overview = {
  invitesSent: 0,
  accepted: 0,
  acceptedSilent: 0,
  followUpsDue: 0,
  positiveInterest: 0,
  callsBooked: 0
};

type DashboardRange = "today" | "thisWeek" | "thisMonth" | "custom";

type ActivityCell = {
  dateLabel: string;
  requestsSent: number;
  accepted: number;
  responded: number;
  level: "none" | "low" | "medium" | "high" | "peak";
};

type TrendSeries = "requests" | "accepted" | "responded";

type WorldCountryFeature = {
  id?: string;
  properties?: {
    name?: string;
  };
  geometry: unknown;
};

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = (day + 6) % 7;
  next.setDate(next.getDate() - diff);
  return next;
}

function startOfMonth(date: Date) {
  const next = startOfDay(date);
  next.setDate(1);
  return next;
}

function formatDisplayDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatRangeLabel(range: DashboardRange, startDate: string, endDate: string) {
  if (range === "today") return "Today";
  if (range === "thisWeek") return "This week";
  if (range === "thisMonth") return "This month";
  return `${formatDisplayDate(startDate)} to ${formatDisplayDate(endDate)}`;
}

function buildActivityData(startDate: Date, endDate: Date): ActivityCell[] {
  const cells: ActivityCell[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  while (current <= endDate) {
    const daySeed =
      current.getFullYear() * 10000 + (current.getMonth() + 1) * 100 + current.getDate();

    const requestsSent = daySeed % 5 === 0 ? 0 : (daySeed * 7) % 18;
    const accepted = requestsSent > 0 ? Math.floor(requestsSent / 4) : 0;
    const responded = accepted > 0 ? Math.floor(accepted / 2) : 0;

    let level: ActivityCell["level"] = "none";
    if (requestsSent >= 14) level = "peak";
    else if (requestsSent >= 9) level = "high";
    else if (requestsSent >= 4) level = "medium";
    else if (requestsSent > 0) level = "low";

    cells.push({
      dateLabel: current.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
      }),
      requestsSent,
      accepted,
      responded,
      level
    });

    current.setDate(current.getDate() + 1);
  }

  return cells;
}

function getCellClass(level: ActivityCell["level"]) {
  if (level === "peak") return "bg-[#df796e]";
  if (level === "high") return "bg-[#eba096]";
  if (level === "medium") return "bg-[#f3c7bf]";
  if (level === "low") return "bg-[#f8ded9]";
  return "bg-[#f5f3f1] ring-1 ring-black/5";
}

function getMonthLabel(dateLabel: string) {
  return dateLabel.split(" ")[0] || "";
}

function getTrendValue(cell: ActivityCell, series: TrendSeries) {
  if (series === "accepted") return cell.accepted;
  if (series === "responded") return cell.responded;
  return cell.requestsSent;
}

function buildTrendPath(values: number[], width: number, height: number) {
  const paddingX = 18;
  const paddingY = 22;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;
  const maxValue = Math.max(1, ...values);

  const points = values.map((value, index) => {
    const x =
      values.length <= 1
        ? width / 2
        : paddingX + (index / (values.length - 1)) * innerWidth;
    const y = height - paddingY - (value / maxValue) * innerHeight;

    return { x, y, value };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? width - paddingX} ${
    height - paddingY
  } L ${points[0]?.x ?? paddingX} ${height - paddingY} Z`;

  return { areaPath, linePath, maxValue, points, paddingX, paddingY, innerHeight };
}

const dashboardCards: Array<{
  label: string;
  key: keyof Overview;
  icon: typeof Send;
  eyebrow: string;
}> = [
    {
      label: "Invites sent",
      key: "invitesSent",
      icon: Send,
      eyebrow: "Outbound"
    },
    {
      label: "Accepted",
      key: "accepted",
      icon: Handshake,
      eyebrow: "Connected"
    },
    {
      label: "Accepted silent",
      key: "acceptedSilent",
      icon: MessageCircleOff,
      eyebrow: "Silent"
    },
    {
      label: "Follow-ups due",
      key: "followUpsDue",
      icon: BellRing,
      eyebrow: "Due now"
    }
  ];

const queueRows: Array<{
  label: string;
  key: "acceptedSilent" | "followUpsDue";
  helper: string;
  icon: typeof Clock3;
}> = [
    {
      label: "Accepted but silent",
      key: "acceptedSilent",
      helper: "Accepted, waiting for reply",
      icon: MessageCircleOff
    },
    {
      label: "Follow-up queue",
      key: "followUpsDue",
      helper: "Ready for next touch",
      icon: Radar
    }
  ];

const trendSeries: Array<{
  key: TrendSeries;
  label: string;
  accent: string;
  fill: string;
}> = [
  {
    key: "requests",
    label: "Requests",
    accent: "#c8675c",
    fill: "#fff0ed"
  },
  {
    key: "accepted",
    label: "Accepted",
    accent: "#69957f",
    fill: "#edf7f1"
  },
  {
    key: "responded",
    label: "Replies",
    accent: "#707fc7",
    fill: "#eef1ff"
  }
];

const worldCountries = (
  feature(worldAtlas as never, (worldAtlas as { objects: { countries: unknown } }).objects.countries) as {
    features: WorldCountryFeature[];
  }
).features;

const worldProjection = geoNaturalEarth1().fitExtent(
  [
    [8, 16],
    [712, 336]
  ],
  {
    type: "FeatureCollection",
    features: worldCountries as never[]
  } as never
);

const worldPath = geoPath(worldProjection);

const mapCountryAliases: Record<string, string> = {
  "w. sahara": "Western Sahara",
  "dominican rep.": "Dominican Republic",
  "dem. rep. congo": "Democratic Republic of the Congo",
  "eq. guinea": "Equatorial Guinea",
  "central african rep.": "Central African Republic",
  "côte d'ivoire": "Cote d'Ivoire",
  "cote d'ivoire": "Cote d'Ivoire",
  "solomon is.": "Solomon Islands",
  "bosnia and herz.": "Bosnia and Herzegovina",
  "s. sudan": "South Sudan",
  "n. cyprus": "Northern Cyprus",
  "falkland is.": "Falkland Islands",
  "fr. s. antarctic lands": "French Southern and Antarctic Lands"
};

function normalizeCountryName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getDashboardThemeClasses() {
  return [
    "[&_.text-black]:!text-[#171717]",
    "[&_.text-black\\/65]:!text-[#444444]",
    "[&_.text-black\\/55]:!text-[#555555]",
    "[&_.text-black\\/45]:!text-[#666666]",
    "[&_.text-black\\/42]:!text-[#666666]",
    "[&_.text-black\\/35]:!text-[#767676]",
    "[&_.text-black\\/32]:!text-[#808080]",
    "[&_.text-black\\/30]:!text-[#888888]",
    "[&_.text-black\\/25]:!text-[#969696]",
    "[&_.bg-white]:!bg-white",
    "[&_.border-black\\/10]:!border-[#e7e0dc]",
    "[&_.border-black\\/\\[0\\.06\\]]:!border-[#ece6e3]",
    "[&_svg_line]:!stroke-[#dfd7d3]"
  ].join(" ");
}

function MetricStrip({
  overview,
  isLoading
}: {
  overview: Overview;
  isLoading: boolean;
}) {
  return (
    <section className="grid overflow-hidden rounded-[20px] border border-black/[0.05] bg-[#fcfbfa] md:grid-cols-4">
      {dashboardCards.map((card, index) => {
        const Icon = card.icon;
        const value = isLoading ? "--" : overview[card.key];

        return (
          <article
            key={card.key}
            className="group relative min-h-[96px] border-black/[0.05] p-4 md:border-l md:first:border-l-0"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#fff0ed] text-[#c8675c]">
                <Icon className="h-3 w-3" />
              </span>

              <ArrowRight className="h-3.5 w-3.5 text-black/30 transition group-hover:translate-x-0.5" />
            </div>

            <div className="mt-3">
              <p className="text-[10px] font-medium text-black/42">{card.eyebrow}</p>
              <div className="mt-1 flex items-end justify-between gap-2.5">
                <h3 className="text-[22px] font-medium tracking-tight text-black">{value}</h3>
                <p className="text-[10px] font-medium text-black/65">{card.label}</p>
              </div>
            </div>

            {index === 0 ? (
              <div className="absolute bottom-0 left-0 h-1 w-full bg-[#ee9f96]" />
            ) : null}
          </article>
        );
      })}
    </section>
  );
}

function ActivityTrendPanel({
  overview,
  isLoading,
  rangeLabel,
  startDate,
  endDate
}: {
  overview: Overview;
  isLoading: boolean;
  rangeLabel: string;
  startDate: Date;
  endDate: Date;
}) {
  const cells = useMemo(() => buildActivityData(startDate, endDate), [startDate, endDate]);
  const [selectedSeries, setSelectedSeries] = useState<TrendSeries>("requests");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const selectedTrend = trendSeries.find((item) => item.key === selectedSeries) ?? trendSeries[0];
  const values = cells.map((cell) => getTrendValue(cell, selectedSeries));
  const chart = useMemo(() => buildTrendPath(values, 760, 240), [values]);
  const activeCell = hoveredIndex != null ? cells[hoveredIndex] : cells[cells.length - 1] ?? null;
  const activeValue =
    hoveredIndex != null ? values[hoveredIndex] : values[values.length - 1] ?? 0;
  const totalValue = values.reduce((sum, value) => sum + value, 0);
  const avgValue = values.length > 0 ? totalValue / values.length : 0;
  const peakValue = values.length > 0 ? Math.max(...values) : 0;
  const peakIndex = values.indexOf(peakValue);
  const peakCell = peakIndex >= 0 ? cells[peakIndex] : null;
  const activeDays = values.filter((value) => value > 0).length;

  return (
    <section
      className="overflow-hidden rounded-[20px] border border-black/[0.05] bg-[#fcfbfa]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/[0.05] p-4">
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-black/35">Live trend</p>
          <h3 className="text-[15px] font-medium tracking-tight text-black">Activity graph</h3>
          <p className="text-[10px] text-black/42">{rangeLabel} outreach rhythm</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {trendSeries.map((series) => {
            const isActive = series.key === selectedSeries;

            return (
              <button
                key={series.key}
                type="button"
                onClick={() => setSelectedSeries(series.key)}
                className={[
                  "inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-medium transition",
                  isActive
                    ? "border border-black/10 bg-black text-white"
                    : "border border-black/10 bg-[#fdfcfb] text-black/55 hover:bg-[#faf9f7]"
                ].join(" ")}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: series.accent }} />
                {series.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 p-3 xl:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-3">
          <div className="rounded-[18px] border border-black/[0.04] bg-white/75 p-4">
            <svg viewBox="0 0 760 240" className="h-[220px] w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={selectedTrend.fill} stopOpacity="0.9" />
                  <stop offset="100%" stopColor={selectedTrend.fill} stopOpacity="0.25" />
                </linearGradient>
              </defs>

              {[0.2, 0.4, 0.6, 0.8].map((position) => (
                <line
                  key={position}
                  x1={chart.paddingX}
                  x2={760 - chart.paddingX}
                  y1={chart.paddingY + chart.innerHeight * (1 - position)}
                  y2={chart.paddingY + chart.innerHeight * (1 - position)}
                  stroke="rgba(15,23,42,0.06)"
                  strokeWidth="1"
                />
              ))}

              <path d={chart.areaPath} fill="url(#trend-fill)" />
              <path
                d={chart.linePath}
                fill="none"
                stroke={selectedTrend.accent}
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {chart.points.map((point, index) => {
                const isActive = hoveredIndex === index;

                return (
                  <g
                    key={`${cells[index]?.dateLabel ?? index}`}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={isActive ? 5 : 3.5}
                      fill={selectedTrend.accent}
                      opacity={isActive ? 1 : 0.8}
                    />
                    <circle cx={point.x} cy={point.y} r={10} fill="transparent" />
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10px] text-black/42">
            {cells.slice(0, Math.min(cells.length, 6)).map((cell) => (
                <span
                  key={cell.dateLabel}
                  className="rounded-full border border-black/[0.06] bg-white/80 px-2 py-1"
                >
                  {cell.dateLabel}
                </span>
              ))}
          </div>
        </div>

        <aside className="space-y-2.5 rounded-[18px] border border-black/[0.05] bg-[#faf9f7] p-4">
          <div className="rounded-[14px] border border-black/[0.04] bg-white/80 p-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-black/32">Hovered day</p>
            <p className="mt-1 text-[12px] font-medium text-black">
              {activeCell?.dateLabel ?? "No data"}
            </p>
            <p className="mt-1 text-[10px] text-black/42">
              {selectedTrend.label} · {activeValue}
            </p>
          </div>

          <div className="grid gap-2">
            <div className="rounded-[14px] border border-black/[0.04] bg-white/80 p-3">
              <p className="text-[10px] text-black/35">Total</p>
              <p className="mt-1 text-[18px] font-medium text-black">{totalValue}</p>
            </div>
            <div className="rounded-[14px] border border-black/[0.04] bg-white/75 p-3">
              <p className="text-[10px] text-black/35">Average per day</p>
              <p className="mt-1 text-[18px] font-medium text-black">{avgValue.toFixed(1)}</p>
            </div>
            <div className="rounded-[14px] border border-black/[0.04] bg-white/75 p-3">
              <p className="text-[10px] text-black/35">Peak day</p>
              <p className="mt-1 text-[12px] font-medium text-black">{peakCell?.dateLabel ?? "No data"}</p>
              <p className="mt-1 text-[10px] text-black/42">{peakValue} max activity</p>
            </div>
            <div className="rounded-[14px] border border-black/[0.04] bg-white/75 p-3">
              <p className="text-[10px] text-black/35">Active days</p>
              <p className="mt-1 text-[18px] font-medium text-black">{activeDays}</p>
            </div>
          </div>

          <div
            className="rounded-[14px] border border-black/[0.04] bg-white/75 p-3 text-[10px] text-black/42"
          >
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-black/35" />
              <span>
                {isLoading ? "Loading live overview..." : `${overview.invitesSent} invites captured in overview`}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function LocationHeatmapPanel({
  entries,
  isLoading,
  rangeLabel
}: {
  entries: LocationHeatmapEntry[];
  isLoading: boolean;
  rangeLabel: string;
}) {
  const [hoveredCountry, setHoveredCountry] = useState<LocationHeatmapEntry | null>(null);

  const countsByCountry = useMemo(() => {
    const next = new Map<string, number>();

    for (const entry of entries) {
      next.set(normalizeCountryName(entry.country), entry.count);
    }

    return next;
  }, [entries]);

  const topCountries = useMemo(() => entries.slice(0, 6), [entries]);
  const maxCount = Math.max(1, ...entries.map((entry) => entry.count), 1);
  const fillScale = useMemo(
    () =>
      scaleLinear()
        .domain([0, Math.max(1, maxCount / 2), maxCount])
        .range(["#f5f3f1", "#f3c7bf", "#df796e"]),
    [maxCount]
  );

  const activeCountry = hoveredCountry ?? topCountries[0] ?? null;

  return (
      <section
        className="overflow-hidden rounded-[20px] border border-black/[0.05] bg-white/75 shadow-[0_8px_24px_rgba(17,17,17,0.03)]"
        style={{
          borderColor: "rgba(17,17,17,0.06)",
          backgroundColor: "rgba(255,255,255,0.78)"
        }}
      >
        <div
          className="flex flex-wrap items-start justify-between gap-3 border-b border-black/[0.05] p-4"
          style={{ borderColor: "rgba(17,17,17,0.05)" }}
        >
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-black/35">
            Targeting map
          </p>
          <h3 className="text-[15px] font-medium tracking-tight text-black">Where outreach is landing</h3>
          <p className="text-[10px] text-black/42">{rangeLabel} location mix</p>
        </div>

        <div
          className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] text-black/55"
          style={{
            borderColor: "var(--app-border)",
            backgroundColor: "var(--app-surface-subtle)"
          }}
        >
          <Globe2 className="h-3 w-3 text-black/45" />
          {isLoading ? "Loading map..." : `${entries.length} countries with captured targets`}
        </div>
      </div>

        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_240px]">
        <div
          className="rounded-[18px] border border-black/[0.05] bg-[#fcfbfa] p-4"
          style={{
            borderColor: "rgba(17,17,17,0.05)",
            backgroundColor: "rgba(252,251,250,0.9)"
          }}
        >
          <svg viewBox="0 0 720 360" className="h-[300px] w-full" role="img" aria-label="World targeting heatmap">
            {worldCountries.map((country) => {
              const rawName = country.properties?.name ?? "";
              const name =
                mapCountryAliases[normalizeCountryName(rawName)] ?? rawName;
              const count = countsByCountry.get(normalizeCountryName(name)) ?? 0;
              const pathValue = worldPath(country as never);

              if (!pathValue) return null;

              return (
                <path
                  key={`${country.id ?? name}`}
                  d={pathValue}
                  fill={fillScale(count)}
                  stroke="rgba(15,23,42,0.12)"
                  strokeWidth={0.5}
                  onMouseEnter={() => {
                    if (!count) {
                      setHoveredCountry({
                        country: name,
                        count: 0
                      });
                      return;
                    }

                    setHoveredCountry({
                      country: name,
                      count
                    });
                  }}
                  onMouseLeave={() => setHoveredCountry(null)}
                  className="transition-opacity hover:opacity-90"
                />
              );
            })}
          </svg>
        </div>

        <aside
          className="space-y-2.5 rounded-[18px] border border-black/[0.05] bg-[#fbfaf8] p-4"
          style={{
            borderColor: "rgba(17,17,17,0.05)",
            backgroundColor: "rgba(251,250,248,0.92)"
          }}
        >
          <div
            className="rounded-[14px] border border-black/[0.04] bg-white/75 p-3"
            style={{ backgroundColor: "rgba(255,255,255,0.8)" }}
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-black/32">Hover state</p>
            <p className="mt-1 text-[12px] font-medium text-black">
              {activeCountry?.country ?? "No location yet"}
            </p>
            <p className="mt-1 text-[10px] text-black/42">
              {activeCountry ? `${activeCountry.count} captured prospects` : "Move across the map"}
            </p>
          </div>

          <div className="rounded-[14px] border border-black/[0.04] bg-white/75 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-medium text-black">Top countries</p>
              <p className="text-[10px] text-black/35">{entries.reduce((sum, entry) => sum + entry.count, 0)} total</p>
            </div>

            <div className="space-y-2">
              {topCountries.length ? (
                topCountries.map((entry, index) => (
                  <div key={entry.country} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#fff0ed] text-[10px] font-medium text-[#c8675c]">
                        {index + 1}
                      </span>
                      <span className="truncate text-[10px] text-black/65">{entry.country}</span>
                    </div>
                    <span className="text-[10px] font-medium text-black">{entry.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-black/42">No saved locations in this range yet.</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-black/42">
            <span className="text-black/35">Less</span>
            {[0, maxCount * 0.33, maxCount * 0.66, maxCount].map((value, index) => (
              <span
                key={`${value}-${index}`}
                className="h-2.5 w-2.5 rounded-[4px]"
                style={{ backgroundColor: fillScale(value) }}
              />
            ))}
            <span className="text-black/35">More</span>
          </div>
        </aside>
      </div>
    </section>
  );
}

function WorkRequiredTable({
  overview,
  isLoading
}: {
  overview: Overview;
  isLoading: boolean;
}) {
  const rows = [
    {
      id: "OUT-1042",
      issue: "Follow up with accepted silent prospects",
      owner: "LinkedIn queue",
      partner: "Manual send",
      status: isLoading ? "--" : overview.acceptedSilent
    },
    {
      id: "OUT-1043",
      issue: "Review prospects due for next touch",
      owner: "Follow-up queue",
      partner: "Copy message",
      status: isLoading ? "--" : overview.followUpsDue
    },
    {
      id: "OUT-1044",
      issue: "Check accepted conversations",
      owner: "Reply capture",
      partner: "Update CRM",
      status: isLoading ? "--" : overview.accepted
    },
    {
      id: "OUT-1045",
      issue: "Audit invite logs captured",
      owner: "Outbound log",
      partner: "Dashboard",
      status: isLoading ? "--" : overview.invitesSent
    }
  ];

  return (
    <article className="rounded-[20px] border border-black/[0.05] bg-[#fcfbfa]">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-black/[0.05] p-4">
        <div>
          <h3 className="text-[15px] font-medium tracking-tight text-black">Work required</h3>
          <p className="mt-1 text-[10px] text-black/42">Several outreach tasks need review</p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="rounded-lg border px-3 py-2 text-[10px] text-black/55"
            style={{ borderColor: "var(--app-border)" }}
          >
            State: <b className="font-medium text-black">Open</b>
          </span>
          <span
            className="rounded-lg border px-3 py-2 text-[10px] text-black/55"
            style={{ borderColor: "var(--app-border)" }}
          >
            Period: <b className="font-medium text-black">Weekly</b>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[44px_1.3fr_1fr_1fr_70px] border-b border-black/[0.05] bg-white/70 px-4 py-2.5 text-[10px] text-black/30">
        <span />
        <span>Task</span>
        <span>Owner</span>
        <span>Action</span>
        <span className="text-right">Count</span>
      </div>

      <div className="divide-y divide-black/[0.05]">
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-[44px_1.3fr_1fr_1fr_70px] items-center px-3 py-2"
          >
            <div>
              <span className="inline-flex h-3 w-3 rounded border border-black/[0.08]" />
            </div>

            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#fff0ed] text-[10px] text-[#d87368]">
                !
              </span>
              <div>
                <p className="text-[10px] text-black/35">{row.id}</p>
                <p className="text-[10px] font-medium text-black">{row.issue}</p>
              </div>
            </div>

            <p className="text-[10px] text-black/65">{row.owner}</p>
            <p className="text-[10px] text-black/42">{row.partner}</p>
            <p className="text-right text-[10px] font-medium text-black">{row.status}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function QueuePanel({
  overview,
  isLoading
}: {
  overview: Overview;
  isLoading: boolean;
}) {
  return (
    <article className="rounded-[20px] border border-black/[0.05] bg-[#fcfbfa] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-medium tracking-tight text-black">Action queue</h3>
          <p className="mt-1 text-[10px] text-black/42">Today’s manual follow-up work</p>
        </div>

        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#ee9f96] text-base text-white"
        >
          +
        </button>
      </div>

      <div className="space-y-2.5">
        {queueRows.map((row) => {
          const Icon = row.icon;
          const value = isLoading ? "--" : overview[row.key];

          return (
            <div
              key={row.key}
            className="rounded-[16px] border border-black/[0.04] bg-white/75 p-3"
          >
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#c8675c] shadow-[0_18px_55px_rgba(15,23,42,0.04)]">
                    <Icon className="h-3 w-3" />
                  </span>
                  <div>
                    <p className="text-[10px] font-medium text-black">{row.label}</p>
                    <p className="mt-0.5 text-[10px] text-black/42">{row.helper}</p>
                  </div>
                </div>

                <span className="text-base font-medium text-black">{value}</span>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function DashboardActivityHeatmap({
  rangeLabel,
  startDate,
  endDate
}: {
  rangeLabel: string;
  startDate: Date;
  endDate: Date;
}) {
  const cells = useMemo(() => buildActivityData(startDate, endDate), [startDate, endDate]);
  const [hovered, setHovered] = useState<ActivityCell | null>(null);

  const weekCount = Math.ceil(cells.length / 7);
  const requestedCells = Array.from({ length: weekCount * 7 }, (_, index) => cells[index] ?? null);
  const activeCell = hovered ?? cells[cells.length - 1] ?? null;
  const requestsTotal = cells.reduce((sum, cell) => sum + cell.requestsSent, 0);

  return (
    <article className="rounded-[20px] border border-black/[0.05] bg-[#fcfbfa] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <h3 className="text-[15px] font-medium tracking-tight text-black">Total activity</h3>
          <p className="mt-1 text-[10px] text-black/42">{rangeLabel} outreach rhythm</p>
        </div>

        <span className="rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-[10px] text-black/45">
          {activeCell?.dateLabel ?? "No day"} · {activeCell?.requestsSent ?? 0} requests
        </span>
      </div>

      <div className="grid grid-cols-[22px_minmax(0,1fr)] gap-2.5">
        <div className="grid gap-1 pt-4 text-[10px] font-medium uppercase tracking-[0.12em] text-black/30">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="grid auto-cols-[12px] grid-flow-col gap-1.5">
            {Array.from({ length: weekCount }).map((_, weekIndex) => {
              const firstCell = requestedCells[weekIndex * 7];
              const monthLabel = firstCell ? getMonthLabel(firstCell.dateLabel) : "";

              return (
                <div key={weekIndex} className="grid gap-1.5">
                  <span className="h-3 text-[10px] uppercase tracking-[0.1em] text-black/25">
                    {monthLabel}
                  </span>

                  <div className="grid gap-1.5">
                    {Array.from({ length: 7 }).map((_, dayIndex) => {
                      const cell = requestedCells[weekIndex * 7 + dayIndex];

                      if (!cell) {
                        return (
                          <div
                            key={`${weekIndex}-${dayIndex}`}
                            className="h-3 w-3 rounded-[4px] bg-transparent"
                          />
                        );
                      }

                      return (
                        <button
                          key={cell.dateLabel}
                          type="button"
                          className={`h-3 w-3 rounded-[4px] transition hover:scale-110 ${getCellClass(
                            cell.level
                          )}`}
                          onMouseEnter={() => setHovered(cell)}
                          onMouseLeave={() => setHovered(null)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2.5 border-t border-black/[0.06] pt-3 text-[10px] text-black/42">
        <span className="font-medium text-black">{requestsTotal}</span>
        <span>total requests in selected range</span>
      </div>
    </article>
  );
}

function RecentStatus({
  overview,
  isLoading
}: {
  overview: Overview;
  isLoading: boolean;
}) {
  return (
    <article className="rounded-[20px] border border-black/[0.05] bg-[#fcfbfa] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-medium tracking-tight text-black">Recent status</h3>
          <p className="mt-1 text-[10px] text-black/42">Quick operating read</p>
        </div>
        <span className="text-black/30">•••</span>
      </div>

      <div className="space-y-2.5">
        <div className="flex gap-2.5">
          <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-[#ee9f96]" />
          <div>
            <p className="text-[10px] font-medium text-black">Invite flow captured</p>
            <p className="mt-1 text-[10px] leading-5 text-black/42">
              {isLoading ? "--" : overview.invitesSent} logged invites in this range.
            </p>
          </div>
        </div>

        <div className="flex gap-2.5">
          <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-[#f3c7bf]" />
          <div>
            <p className="text-[10px] font-medium text-black">Follow-up risk</p>
            <p className="mt-1 text-[10px] leading-5 text-black/42">
              {isLoading ? "--" : overview.followUpsDue} records need manual action.
            </p>
          </div>
        </div>

        <div className="flex gap-2.5">
          <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-black/20" />
          <div>
            <p className="text-[10px] font-medium text-black">Accepted silent</p>
            <p className="mt-1 text-[10px] leading-5 text-black/42">
              {isLoading ? "--" : overview.acceptedSilent} people accepted but have not replied.
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export function DashboardShell() {
  const apiBaseUrl = getApiBaseUrl();
  const [overview, setOverview] = useState<Overview>(emptyOverview);
  const [locationHeatmap, setLocationHeatmap] = useState<LocationHeatmapEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [range, setRange] = useState<DashboardRange>("thisMonth");
  const [customStart, setCustomStart] = useState(() => toDateInputValue(startOfMonth(new Date())));
  const [customEnd, setCustomEnd] = useState(() => toDateInputValue(new Date()));

  const rangeBounds = useMemo(() => {
    const now = new Date();

    if (range === "today") {
      const startDate = startOfDay(now);
      const endDate = endOfDay(now);

      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        label: "Today",
        heatmapStartDate: startDate,
        heatmapEndDate: endDate
      };
    }

    if (range === "thisWeek") {
      const startDate = startOfWeek(now);
      const endDate = endOfDay(now);

      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        label: "This week",
        heatmapStartDate: startDate,
        heatmapEndDate: endDate
      };
    }

    if (range === "thisMonth") {
      const startDate = startOfMonth(now);
      const endDate = endOfDay(now);

      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        label: "This month",
        heatmapStartDate: startDate,
        heatmapEndDate: endDate
      };
    }

    const parsedStart = new Date(`${customStart}T00:00:00`);
    const parsedEnd = new Date(`${customEnd}T23:59:59`);
    const safeStart = Number.isNaN(parsedStart.getTime()) ? startOfMonth(now) : parsedStart;
    const safeEnd = Number.isNaN(parsedEnd.getTime()) ? endOfDay(now) : parsedEnd;

    return {
      startDate: safeStart.toISOString(),
      endDate: safeEnd.toISOString(),
      label: formatRangeLabel(range, customStart, customEnd),
      heatmapStartDate: safeStart,
      heatmapEndDate: safeEnd
    };
  }, [customEnd, customStart, range]);

  useEffect(() => {
    let isMounted = true;

    async function loadOverview() {
      setIsLoading(true);

      try {
        const query = new URLSearchParams({
          startDate: rangeBounds.startDate,
          endDate: rangeBounds.endDate
        });

        const [overviewResponse, locationResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/v1/overview?${query.toString()}`, {
            cache: "no-store"
          }),
          fetch(`${apiBaseUrl}/v1/overview/locations?${query.toString()}`, {
            cache: "no-store"
          })
        ]);

        if (!overviewResponse.ok) throw new Error("Could not load dashboard overview.");
        if (!locationResponse.ok) throw new Error("Could not load dashboard locations.");

        const overviewData = (await overviewResponse.json()) as Overview;
        const locationData = (await locationResponse.json()) as LocationHeatmapResponse;

        if (isMounted) {
          setOverview(overviewData);
          setLocationHeatmap(locationData.items);
        }
      } catch (_error) {
        if (isMounted) {
          setOverview(emptyOverview);
          setLocationHeatmap([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadOverview();

    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl, rangeBounds.endDate, rangeBounds.startDate]);

  return (
    <main className={`dashboard-shell min-h-screen bg-[#f7f5f2] p-3 text-[#171717] md:p-5 ${getDashboardThemeClasses()}`}>
      <section
        className="mx-auto max-w-[1360px] overflow-hidden rounded-[28px] border border-black/[0.05] bg-white shadow-[0_10px_30px_rgba(17,17,17,0.03)]"
        style={{
          borderColor: "rgba(17,17,17,0.06)",
          backgroundColor: "rgba(255,255,255,0.9)"
        }}
      >
        <header
          className="flex flex-wrap items-center justify-between gap-2.5 border-b border-black/[0.05] px-5 py-4"
          style={{
            borderColor: "rgba(17,17,17,0.05)",
            backgroundColor: "rgba(255,255,255,0.85)"
          }}
        >
          <div>
            <h2 className="text-[18px] font-medium tracking-[-0.03em] text-black">
              Good morning, Aish.
            </h2>
            <p className="mt-1 text-[10px] text-black/42">
              Outbound operating dashboard
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: "today", label: "Today", icon: CalendarDays },
              { key: "thisWeek", label: "Week", icon: CalendarClock },
              { key: "thisMonth", label: "Month", icon: CalendarRange },
              { key: "custom", label: "Custom", icon: CalendarX }
            ].map((item) => {
              const Icon = item.icon;
              const active = range === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setRange(item.key as DashboardRange)}
                  className={[
                    "inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-medium transition",
                    active
                      ? "text-white"
                      : "border text-black/55"
                  ].join(" ")}
                  style={
                    active
                    ? { backgroundColor: "#171717", color: "#ffffff" }
                      : {
                          borderColor: "rgba(17,17,17,0.12)",
                          backgroundColor: "#fffdfc"
                        }
                  }
                >
                  <Icon className="h-3 w-3" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {range === "custom" ? (
            <div className="flex w-full flex-wrap items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
                className="rounded-full border border-black/[0.12] bg-[#fffdfc] px-3 py-2 text-[10px] text-black/65 outline-none"
                style={{
                  borderColor: "rgba(17,17,17,0.12)",
                  backgroundColor: "#fffdfc"
                }}
              />
              <span className="text-[10px] text-black/30">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
                className="rounded-full border border-black/[0.12] bg-[#fffdfc] px-3 py-2 text-[10px] text-black/65 outline-none"
                style={{
                  borderColor: "rgba(17,17,17,0.12)",
                  backgroundColor: "#fffdfc"
                }}
              />
            </div>
          ) : null}
        </header>

        <div className="p-4">
          <div className="space-y-2.5">
            <MetricStrip overview={overview} isLoading={isLoading} />
            <ActivityTrendPanel
              overview={overview}
              isLoading={isLoading}
              rangeLabel={rangeBounds.label}
              startDate={rangeBounds.heatmapStartDate}
              endDate={rangeBounds.heatmapEndDate}
            />
            <LocationHeatmapPanel
              entries={locationHeatmap}
              isLoading={isLoading}
              rangeLabel={rangeBounds.label}
            />
            <WorkRequiredTable overview={overview} isLoading={isLoading} />

            <DashboardActivityHeatmap
              rangeLabel={rangeBounds.label}
              startDate={rangeBounds.heatmapStartDate}
              endDate={rangeBounds.heatmapEndDate}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
