import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AccuracyResponse } from "../types";

function mw(value: unknown) {
  return value === null || value === undefined ? "—" : `${Math.round(Number(value)).toLocaleString()} MW`;
}

function DetailTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: Record<string, unknown> }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      <span>MAE <b>{mw(row.mae)}</b></span>
      <span>Bias <b>{mw(row.bias)}</b></span>
      <span>Periods <b>{row.samples == null ? "—" : String(row.samples)}</b></span>
    </div>
  );
}

export function AccuracyCharts({ data }: { data: AccuracyResponse }) {
  const daily = data.daily.map((row) => ({
    date: String(row.date).slice(5),
    mae: row.mae_mw,
    bias: row.bias_mw,
    samples: row.sample_count,
  }));
  const hourly = data.hourly.map((row) => ({
    hour: `${String(row.hour).padStart(2, "0")}:00`,
    bias: row.bias_mw,
    mae: row.mae_mw,
    samples: row.sample_count,
  }));
  const distribution = data.distribution.map((row, index) => ({
    period: index + 1,
    error: row.error_mw,
  }));

  return (
    <div className="chart-grid">
      <section className="panel chart-panel">
        <div className="panel-heading"><div><span className="eyebrow">Daily quality</span><h3>MAE by day</h3><p className="chart-description">Which delivery days carried the most forecast error?</p></div><span className="chart-key">MW · LOWER IS BETTER</span></div>
        <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={daily}><CartesianGrid strokeDasharray="3 3" stroke="#dbe7ec" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 11, fill: "#627782" }} /><YAxis tick={{ fontSize: 11, fill: "#627782" }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} /><Tooltip content={<DetailTooltip />} /><Bar dataKey="mae" fill="#1c72c8" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </section>
      <section className="panel chart-panel">
        <div className="panel-heading"><div><span className="eyebrow">Intraday pattern</span><h3>Bias by hour</h3><p className="chart-description">Positive means overforecast; negative means underforecast.</p></div><span className="chart-key">SIGNED ERROR</span></div>
        <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={hourly}><CartesianGrid strokeDasharray="3 3" stroke="#dbe7ec" vertical={false} /><XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#627782" }} interval={2} /><YAxis tick={{ fontSize: 11, fill: "#627782" }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} /><Tooltip content={<DetailTooltip />} /><Line type="monotone" dataKey="bias" stroke="#e07739" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div>
      </section>
      <section className="panel chart-panel chart-panel-wide">
        <div className="panel-heading"><div><span className="eyebrow">Risk surface</span><h3>Forecast error across the month</h3><p className="chart-description">Each bar is one delivery hour; orange is underforecast, green is overforecast.</p></div><span className="chart-key">FORECAST − ACTUAL</span></div>
        <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={distribution}><CartesianGrid strokeDasharray="3 3" stroke="#dbe7ec" vertical={false} /><XAxis dataKey="period" hide /><YAxis tick={{ fontSize: 11, fill: "#627782" }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} /><Tooltip formatter={(v) => [`${Number(v).toLocaleString()} MW`, "Signed error"]} /><Bar dataKey="error" radius={[3, 3, 0, 0]}>{distribution.map((entry) => <Cell key={entry.period} fill={Number(entry.error) < 0 ? "#e07739" : "#1ca679"} />)}</Bar></BarChart></ResponsiveContainer></div>
      </section>
    </div>
  );
}
