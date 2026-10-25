import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DecisionRow } from "../types";

function formatHour(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function ForecastChart({ rows }: { rows: DecisionRow[] }) {
  const data = rows.map((row) => ({
    ...row,
    time: formatHour(row.target_time),
    forecast: row.forecast_mw,
    actual: row.actual_mw,
  }));

  return (
    <div className="chart-wrap chart-tall">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dbe7ec" vertical={false} />
          <XAxis dataKey="time" tick={{ fill: "#627782", fontSize: 12 }} interval={2} />
          <YAxis tick={{ fill: "#627782", fontSize: 12 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "1px solid #dbe7ec" }}
            formatter={(value, name) => [`${Number(value).toLocaleString()} MW`, name === "forecast" ? "Forecast" : "Actual"]}
            labelFormatter={(label) => `Delivery ${label}`}
          />
          <Legend />
          <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#1c72c8" strokeWidth={3} dot={false} connectNulls />
          <Line type="monotone" dataKey="actual" name="Actual" stroke="#1ca679" strokeWidth={3} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
