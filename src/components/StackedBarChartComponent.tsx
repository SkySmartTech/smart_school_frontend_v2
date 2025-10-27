// src/components/StackedBarChartComponent.tsx
import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Paper, Typography } from "@mui/material";

interface StackedBarChartProps {
  data: any[];
  subjects: string[];
  title?: string;
}

const StackedBarChartComponent: React.FC<StackedBarChartProps> = ({ data, subjects, title }) => {
  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#a4de6c", "#d0ed57"];

  return (
    <Paper sx={{ p: 2, height: 400 }}>
      {title && <Typography variant="h6" gutterBottom>{title}</Typography>}
      <ResponsiveContainer>
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          {subjects.map((subj, index) => (
            <Bar key={subj} dataKey={subj} stackId="a" fill={COLORS[index % COLORS.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default StackedBarChartComponent;
