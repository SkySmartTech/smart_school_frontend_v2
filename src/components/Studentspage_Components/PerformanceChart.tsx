// components/PerformanceChart.tsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Define the structure for a single term's performance data
interface PerformanceTermData {
  term: string; // Name of the term (e.g., "Term 1")
  marks: number; // Marks obtained in that term
}

// Define the props for the PerformanceChart component
interface PerformanceChartProps {
  performanceData: PerformanceTermData[]; // Array of performance data for different terms
}

/**
 * PerformanceChart component displays a line chart showing student performance trends over terms.
 * It also includes a summary of marks for each term below the chart.
 *
 * @param {PerformanceChartProps} { performanceData } - Props for the component.
 * @returns {JSX.Element} A React component rendering the performance chart and summary.
 */
const PerformanceChart: React.FC<PerformanceChartProps> = ({ performanceData }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-blue-900 mb-4">Performance View</h2>
      <div className="h-80">
        {/* Responsive container for the chart to ensure it scales correctly */}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={performanceData}>
            {/* Grid lines for the chart */}
            <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
            {/* X-axis (terms) */}
            <XAxis
              dataKey="term"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#1e40af', fontSize: 12 }}
            />
            {/* Y-axis (marks) */}
            <YAxis
              domain={[60, 100]} // Set the domain for the Y-axis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#1e40af', fontSize: 12 }}
              label={{ value: 'Marks', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#1e40af' } }}
            />
            {/* Tooltip that appears on hover */}
            <Tooltip
              contentStyle={{
                backgroundColor: '#f0f9ff',
                border: '1px solid #3b82f6',
                borderRadius: '8px',
                color: '#1e40af'
              }}
            />
            {/* The line representing the marks data */}
            <Line
              type="monotone" // Smooth curve
              dataKey="marks"
              stroke="#3b82f6" // Line color
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }} // Style for data points
              activeDot={{ r: 8, stroke: '#1d4ed8', strokeWidth: 2, fill: '#3b82f6' }} // Style for active data point on hover
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Performance Summary below the chart */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {/* Map through performance data to display summary for each term */}
        {performanceData.map((data, index) => (
          <div key={index} className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-600">{data.term}</p>
            <p className="text-lg font-bold text-blue-900">{data.marks}%</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PerformanceChart;
