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

export function AccuracyCharts({ data }: { data: AccuracyResponse }) {
  const daily = data.daily.map((row) => ({
    date: String(row.date).slice(5),
    mae: row.mae_mw,
  }));
  const hourly = data.hourly.map((row) => ({
    hour: `${String(row.hour).padStart(2, "0")}:00`,
    bias: row.bias_mw,
  }));
  const distribution = data.distribution.map((row, index) => ({
    period: index + 1,
    error: row.error_mw,
  }));

  return (
    <div className="chart-grid">
      <section className="panel chart-panel">
        <div className="panel-heading"><div><span className="eyebrow">Daily quality</span><h3>MAE by day</h3></div></div>
        <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={daily}><CartesianGrid strokeDasharray="3 3" stroke="#dbe7ec" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 11, fill: "#627782" }} /><YAxis tick={{ fontSize: 11, fill: "#627782" }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} /><Tooltip formatter={(v) => [`${Number(v).toLocaleString()} MW`, "MAE"]} /><Bar dataKey="mae" fill="#1c72c8" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </section>
      <section className="panel chart-panel">
        <div className="panel-heading"><div><span className="eyebrow">Intraday pattern</span><h3>Bias by hour</h3></div></div>
        <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={hourly}><CartesianGrid strokeDasharray="3 3" stroke="#dbe7ec" vertical={false} /><XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#627782" }} interval={2} /><YAxis tick={{ fontSize: 11, fill: "#627782" }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} /><Tooltip formatter={(v) => [`${Number(v).toLocaleString()} MW`, "Bias"]} /><Line type="monotone" dataKey="bias" stroke="#e07739" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div>
      </section>
      <section className="panel chart-panel chart-panel-wide">
        <div className="panel-heading"><div><span className="eyebrow">Risk surface</span><h3>Forecast error across the month</h3></div></div>
        <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={distribution}><CartesianGrid strokeDasharray="3 3" stroke="#dbe7ec" vertical={false} /><XAxis dataKey="period" hide /><YAxis tick={{ fontSize: 11, fill: "#627782" }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} /><Tooltip formatter={(v) => [`${Number(v).toLocaleString()} MW`, "Signed error"]} /><Bar dataKey="error" radius={[3, 3, 0, 0]}>{distribution.map((entry) => <Cell key={entry.period} fill={Number(entry.error) < 0 ? "#e07739" : "#1ca679"} />)}</Bar></BarChart></ResponsiveContainer></div>
      </section>
    </div>
  );
}
