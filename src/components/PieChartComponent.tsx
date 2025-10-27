// src/components/PieChartComponent.tsx
import React from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Paper, Typography } from "@mui/material";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AB47BC", "#26C6DA"];

interface PieChartProps {
  data: { name: string; value: number }[];
  title?: string;
}

const PieChartComponent: React.FC<PieChartProps> = ({ data, title }) => {
  return (
    <Paper sx={{ p: 2, height: 400 }}>
      {title && <Typography variant="h6" gutterBottom>{title}</Typography>}
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={120} label>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default PieChartComponent;
