import React, { useState, useEffect } from "react";
import {
  Box,
  CssBaseline,
  AppBar,
  Stack,
  Typography,
  Paper,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  useMediaQuery,
  InputAdornment,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Button,
} from "@mui/material";
import { DateRange, School, CalendarMonth, Refresh } from "@mui/icons-material";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import {
  fetchManagementStaffReport,
  checkAuthStatus,
  fetchGradesFromApi,
  fetchYearsFromApi,
  type DropdownOption,
  type ClassMarks,
  type ManagementStaffReportData,
  type SubjectMark,
} from "../../api/managementStaffApi";

const exams = [
  { label: 'First Term', value: 'First Term' },
  { label: 'Second Term', value: 'Second Term' },
  { label: 'Third Term', value: 'Third Term' },
  { label: 'Monthly Test', value: 'Monthly' }
];
const months = [
  { label: "January", value: "01" },
  { label: "February", value: "02" },
  { label: "March", value: "03" },
  { label: "April", value: "04" },
  { label: "May", value: "05" },
  { label: "June", value: "06" },
  { label: "July", value: "07" },
  { label: "August", value: "08" },
  { label: "September", value: "09" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" },
];
const BAR_COLORS = ['#E3B6E5', '#C5A6D9', '#A795CD', '#8A85C1', '#6D74B5', '#5163A9', '#34529C'];
const COLORS = ["#4285F4", "#34A853", "#FBBC05", "#EA4335"];

const transformClassDataForStackedBarChart = (classData: ClassMarks | undefined) => {
  if (!classData) return [];

  return Object.entries(classData).map(([className, subjects]) => {
    const classEntry: Record<string, string | number> = { name: className };

    subjects.forEach((subject) => {
      classEntry[subject.subject] = subject.subject_percentage || 0;
    });

    return classEntry;
  });
};

const ManagementStaff: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [years, setYears] = useState<string[]>([]);
  const [year, setYear] = useState<string>("");
  const [grade, setGrade] = useState<string>("");
  const [gradeOptions, setGradeOptions] = useState<DropdownOption[]>([]);
  const [exam, setExam] = useState<string>(exams[0].value);
  const [month, setMonth] = useState<string>("01");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({ open: false, message: "", severity: "info" });

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const grades = await fetchGradesFromApi();
        setGradeOptions(grades);
        if (grades.length > 0) {
          setGrade(grades[0].value);
        }
      } catch (error) {
        console.error("Failed to fetch grades:", error);
        setSnackbar({
          open: true,
          message: "Failed to load grade options",
          severity: "error",
        });
      }
    };

    const fetchYears = async () => {
      try {
        const yearsData = await fetchYearsFromApi();
        setYears(yearsData);
        if (yearsData.length > 0) {
          setYear(yearsData[0]);
        }
      } catch (error) {
        console.error("Failed to fetch years:", error);
        setSnackbar({
          open: true,
          message: "Failed to load year options",
          severity: "error",
        });
      }
    };

    if (checkAuthStatus()) {
      fetchGrades();
      fetchYears();
    }
  }, []);

  useEffect(() => {
    if (!checkAuthStatus()) {
      setSnackbar({
        open: true,
        message: "Please login to view this report",
        severity: "warning",
      });
    }
  }, []);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ManagementStaffReportData, Error>({
    queryKey: ["managementReport", year, grade, exam, month],
    queryFn: () => fetchManagementStaffReport(year, grade, exam, month),
    retry: (failureCount, error) => {
      if (error.message.includes('login') || error.message.includes('Session expired')) {
        return false;
      }
      return failureCount < 2;
    },
    enabled: exam !== "Monthly" || (exam === "Monthly" && !!month),
  });

  useEffect(() => {
    if (exam === "Monthly" && month) {
      refetch();
    }
  }, [month, exam, refetch]);

  useEffect(() => {
    if (isError && error) {
      const isAuthError = error.message.includes('login') || error.message.includes('Session expired');
      setSnackbar({
        open: true,
        message: error.message || "Error loading management report data",
        severity: isAuthError ? "warning" : "error",
      });
    }
  }, [isError, error]);

  const handleCloseSnackbar = () =>
    setSnackbar((prev) => ({ ...prev, open: false }));

  const handleRefresh = () => {
    if (checkAuthStatus()) {
      refetch();
      setSnackbar({
        open: true,
        message: "Refreshing data...",
        severity: "info",
      });
    } else {
      setSnackbar({
        open: true,
        message: "Please login to refresh data",
        severity: "warning",
      });
    }
  };

  const handleExamChange = (newExam: string) => {
    setExam(newExam);
    if (newExam !== "Monthly") {
      setMonth("01");
    }
  };

  return (
    <Box sx={{ display: "flex", width: "100%", minHeight: "100vh", overflow: "hidden" }}>
      <CssBaseline />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <Box sx={{ flexGrow: 1, width: "100%", overflow: "auto" }}>
        <AppBar
          position="static"
          sx={{
            boxShadow: "none",
            bgcolor: theme.palette.background.paper,
            borderBottom: `1px solid ${theme.palette.divider}`,
            color: theme.palette.text.primary,
          }}
        >
          <Navbar
            title="Management Staff Report"
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
        </AppBar>
        <Stack spacing={isMobile ? 2 : 3} sx={{ px: isMobile ? 2 : isTablet ? 3 : 4, py: isMobile ? 2 : 3 }}>
          {/* Top Filters */}
          <Paper elevation={1} sx={{ p: isMobile ? 1.5 : 2 }}>
            <Stack
              direction={isMobile ? "column" : "row"}
              justifyContent="space-between"
              alignItems={isMobile ? "stretch" : "center"}
              spacing={isMobile ? 1.5 : 2}
              sx={{ width: "100%" }}
            >
              {/* Year */}
              <TextField
                select
                label="Year"
                variant="outlined"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                disabled={isLoading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <DateRange color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: isMobile ? "100%" : "auto",
                  minWidth: isMobile ? "auto" : 150,
                  flex: isMobile ? "unset" : 1,
                  maxWidth: isMobile ? "100%" : 250,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    height: "45px",
                  },
                }}
              >
                {years.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </TextField>

              {/* Grade */}
              <TextField
                select
                label="Student Grade"
                variant="outlined"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                disabled={isLoading || gradeOptions.length === 0}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <School color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: isMobile ? "100%" : "auto",
                  minWidth: isMobile ? "auto" : 150,
                  flex: isMobile ? "unset" : 1,
                  maxWidth: isMobile ? "100%" : 250,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    height: "45px",
                  },
                }}
              >
                {gradeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              {/* Exam */}
              <TextField
                select
                label="Exam"
                variant="outlined"
                value={exam}
                onChange={(e) => handleExamChange(e.target.value)}
                disabled={isLoading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarMonth color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: isMobile ? "100%" : "auto",
                  minWidth: isMobile ? "auto" : 150,
                  flex: isMobile ? "unset" : 1,
                  maxWidth: isMobile ? "100%" : 250,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    height: "45px",
                  },
                }}
              >
                {exams.map((examOption) => (
                  <MenuItem key={examOption.value} value={examOption.value}>
                    {examOption.label}
                  </MenuItem>
                ))}
              </TextField>

              {/* Month - visible only if Monthly Test is selected */}
              {exam === "Monthly" && (
                <TextField
                  select
                  label="Month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarMonth />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    width: isMobile ? "100%" : "auto",
                    minWidth: isMobile ? "auto" : 150,
                    flex: isMobile ? "unset" : 1,
                    maxWidth: isMobile ? "100%" : 250,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "10px",
                      height: "45px",
                    },
                  }}
                >
                  {months.map((m) => (
                    <MenuItem key={m.value} value={m.value}>
                      {m.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              {/* Refresh Button */}
              <Button
                variant="outlined"
                onClick={handleRefresh}
                disabled={isLoading}
                startIcon={<Refresh />}
                sx={{
                  borderRadius: "10px",
                  height: "45px",
                  width: isMobile ? "100%" : "auto",
                  minWidth: isMobile ? "auto" : 120,
                }}
              >
                Refresh
              </Button>
            </Stack>
          </Paper>

          {/* Error State */}
          {isError && (
            <Paper elevation={1} sx={{ p: isMobile ? 2 : 3, bgcolor: "error.light", color: "error.contrastText" }}>
              <Typography variant="body1" align="center" sx={{ fontSize: isMobile ? "0.875rem" : "1rem" }}>
                {error?.message || "Failed to load data"}
              </Typography>
            </Paper>
          )}

          {/* Charts Section */}
          <Stack direction="column" spacing={isMobile ? 2 : 3}>
            {/* Subject Distribution Chart */}
            <Paper elevation={2} sx={{ p: isMobile ? 2 : 3, width: "100%" }}>
              <Typography variant={isMobile ? "subtitle1" : "h6"} fontWeight={600} mb={2}>
                Subject Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={isMobile ? 280 : 350}>
                {isLoading ? (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "100%",
                    }}
                  >
                    <CircularProgress />
                  </Box>
                ) : (
                  <PieChart>
                    <Pie
                      data={data?.subject_marks || []}
                      dataKey="percentage"
                      nameKey="subject"
                      cx="50%"
                      cy="50%"
                      outerRadius={isMobile ? 60 : 80}
                      label={(props) => {
                        const { subject, percentage } = props.payload;
                        if (isMobile) {
                          return `${percentage.toFixed(0)}%`;
                        }
                        return `${subject}: ${percentage.toFixed(0)}%`;
                      }}
                      labelLine={!isMobile}
                    >
                      {(data?.subject_marks || []).map((_entry: SubjectMark, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: number, _name: string, props: any) => [
                        `${value}%`,
                        props.payload.subject
                      ]}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: isMobile ? "12px" : "14px" }}
                      iconSize={isMobile ? 10 : 14}
                    />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </Paper>

            {/* Class Performance Chart */}
            <Paper elevation={2} sx={{ p: isMobile ? 2 : 3, width: "100%" }}>
              <Typography variant={isMobile ? "subtitle1" : "h6"} fontWeight={600} mb={2}>
                Class Performance
              </Typography>
              <Box sx={{ overflowX: "auto", width: "100%" }}>
                <ResponsiveContainer width={isMobile ? 600 : "100%"} height={isMobile ? 280 : 350}>
                  {isLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <BarChart data={transformClassDataForStackedBarChart(data?.class_subject_marks)}>
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: isMobile ? 10 : 12 }}
                        angle={isMobile ? -45 : 0}
                        textAnchor={isMobile ? "end" : "middle"}
                        height={isMobile ? 60 : 30}
                      />
                      <YAxis
                        label={{ 
                          value: 'Total Marks', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { fontSize: isMobile ? 10 : 12 }
                        }}
                        domain={[0, 100]}
                        tick={{ fontSize: isMobile ? 10 : 12 }}
                      />
                      <RechartsTooltip
                        formatter={(value: number, name: string) => [
                          `${value}%`,
                          name,
                        ]}
                        contentStyle={{ fontSize: isMobile ? "12px" : "14px" }}
                      />
                      <Legend 
                        wrapperStyle={{ fontSize: isMobile ? "10px" : "12px" }}
                        iconSize={isMobile ? 10 : 14}
                      />
                      <Bar
                        dataKey="Mathematics"
                        name="Mathematics"
                        stackId="1"
                        fill={BAR_COLORS[0]}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="Science"
                        name="Science"
                        stackId="1"
                        fill={BAR_COLORS[1]}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="English"
                        name="English"
                        stackId="1"
                        fill={BAR_COLORS[2]}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="Sinhala"
                        name="Sinhala"
                        stackId="1"
                        fill={BAR_COLORS[4]}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="History"
                        name="History"
                        stackId="1"
                        fill={BAR_COLORS[6]}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="Buddhism"
                        name="Buddhism"
                        stackId="1"
                        fill={BAR_COLORS[0]}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Stack>

          {/* Table Section */}
          <Paper elevation={2} sx={{ p: isMobile ? 1.5 : 2, overflow: "auto" }}>
            <Typography variant={isMobile ? "subtitle1" : "h6"} fontWeight={600} mb={2} sx={{ px: isMobile ? 1 : 0 }}>
              Detailed Marks Breakdown
            </Typography>
            <TableContainer sx={{ maxHeight: isMobile ? 400 : 600 }}>
              <Table size={isMobile ? "small" : "medium"} stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold", fontSize: isMobile ? "0.75rem" : "0.875rem", minWidth: isMobile ? 60 : 80 }}>Class</TableCell>
                    <TableCell align="right" sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem", minWidth: isMobile ? 50 : 70 }}>English</TableCell>
                    <TableCell align="right" sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem", minWidth: isMobile ? 50 : 70 }}>Mathematics</TableCell>
                    <TableCell align="right" sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem", minWidth: isMobile ? 50 : 70 }}>Science</TableCell>
                    <TableCell align="right" sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem", minWidth: isMobile ? 50 : 70 }}>History</TableCell>
                    <TableCell align="right" sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem", minWidth: isMobile ? 50 : 70 }}>Sinhala</TableCell>
                    <TableCell align="right" sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem", minWidth: isMobile ? 50 : 70 }}>Buddhism</TableCell>
                    <TableCell align="right" sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem", minWidth: isMobile ? 50 : 70 }}>Average</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : data?.tableData && data.tableData.length > 0 ? (
                    data.tableData.map((row, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontWeight: "bold", fontSize: isMobile ? "0.75rem" : "0.875rem" }}>
                          {row.class}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem" }}>{row.english}</TableCell>
                        <TableCell align="right" sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem" }}>{row.mathematics}</TableCell>
                        <TableCell align="right" sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem" }}>{row.science}</TableCell>
                        <TableCell align="right" sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem" }}>{row.history}</TableCell>
                        <TableCell align="right" sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem" }}>{row.sinhala}</TableCell>
                        <TableCell align="right" sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem" }}>{row.buddhism}</TableCell>
                        <TableCell align="right" sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem" }}>
                          {row.overall_average || 0}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: isMobile ? "0.75rem" : "0.875rem" }}>
                          No data available for the selected criteria
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Stack>
        <Footer />
      </Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ManagementStaff;