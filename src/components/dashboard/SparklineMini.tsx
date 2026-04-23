/**
 * SparklineMini — linha minimalista sem eixos (Recharts).
 * Cor herda de "primary" (ciano do hub) por default.
 */
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface Props {
  data: number[];
  positive?: boolean;
}

export function SparklineMini({ data, positive = true }: Props) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={positive ? "hsl(var(--accent))" : "hsl(var(--destructive))"}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
