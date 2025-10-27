// src/components/MarksTable.tsx
import React from "react";
import { Table, TableHead, TableBody, TableRow, TableCell, Paper, Typography } from "@mui/material";

interface MarksTableProps {
  data: any[];
  title?: string;
}

const MarksTable: React.FC<MarksTableProps> = ({ data, title }) => {
  if (!data || data.length === 0) return null;

  const columns = Object.keys(data[0]);

  return (
    <Paper sx={{ p: 2 }}>
      {title && <Typography variant="h6" gutterBottom>{title}</Typography>}
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell key={col} sx={{ fontWeight: "bold" }}>
                {col.toUpperCase()}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, i) => (
            <TableRow key={i}>
              {columns.map((col) => (
                <TableCell key={col}>{row[col]}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};

export default MarksTable;
