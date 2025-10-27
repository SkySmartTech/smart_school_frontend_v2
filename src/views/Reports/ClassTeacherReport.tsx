import React, { useState, useEffect } from "react";
import {
    Box, CssBaseline, AppBar, Stack, Typography, Paper, MenuItem, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, useTheme, InputAdornment, TextField, CircularProgress,
    Snackbar, Alert, Button
} from "@mui/material";
import { School, CalendarMonth, Group, Refresh } from "@mui/icons-material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
    Tooltip as ReTooltip, Legend, ResponsiveContainer, CartesianGrid
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { fetchClassTeacherReport, fetchGradesFromApi, type DropdownOption } from "../../api/classteacherApi";
import Footer from "../../components/Footer";

const classes = ["Araliya", "Olu", "Nelum", "Rosa", "Manel", "Sooriya", "Kumudu"];
const exams = [
    { label: 'First Term', value: 'First' },
    { label: 'Second Term', value: 'Mid' },
    { label: 'Third Term', value: 'End' },
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
const COLORS = ["#4285F4", "#34A853", "#FBBC05", "#EA4335", "#9C27B0", "#00ACC1"];
const BAR_COLORS = ["#E3B6E5", "#C5A6D9", "#A795CD", "#8A85C1", "#6D74B5", "#5163A9", "#34529C"];

interface StudentSubjectMark {
    subject: string;
    marks: number;
}

interface StudentMark {
    studentName: string;
    subjects: StudentSubjectMark[];
    total_marks: number;
    average_marks: number;
    rank: number;
}

interface SubjectMark {
    subject: string;
    average_marks: number;
    percentage: number;
}

interface YearlySubjectAverage {
    year: number;
    subjects: SubjectMark[];
}

interface ClassTeacherReportData {
    subject_marks: SubjectMark[];
    student_marks: StudentMark[];
    yearly_subject_averages: YearlySubjectAverage[];
}

const ClassTeacherReport: React.FC = () => {
    const theme = useTheme();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Initializing state with Dayjs objects for consistency
    const [startDate, setStartDate] = useState<Dayjs | null>(dayjs('2023-01-01'));
    const [endDate, setEndDate] = useState<Dayjs | null>(dayjs('2024-12-31'));
    const [month, setMonth] = useState<string>("01");
    const [grade, setGrade] = useState("1");
    const [className, setClassName] = useState("Olu");
    const [exam, setExam] = useState("First");
    const [grades, setGrades] = useState<DropdownOption[]>([]);

    type SnackbarState = {
        open: boolean;
        message: string;
        severity: "success" | "info" | "warning" | "error";
    };
    const [snackbar, setSnackbar] = useState<SnackbarState>({
        open: false,
        message: "",
        severity: "info",
    });

    const { data, isLoading, isError, error, refetch } = useQuery<ClassTeacherReportData, Error>({
        queryKey: ["class-teacher-report", startDate, endDate, grade, className, exam, month],
        queryFn: () => {
            const formattedStartDate = startDate ? startDate.format("YYYY-MM-DD") : "";
            const formattedEndDate = endDate ? endDate.format("YYYY-MM-DD") : "";
            return fetchClassTeacherReport(formattedStartDate, formattedEndDate, grade, className, exam, month);
        },
        retry: 1,
        enabled: exam !== "Monthly" || (exam === "Monthly" && !!month),
    });

    // Fetch grades from API
    const { data: gradesData, isLoading: isGradesLoading } = useQuery<DropdownOption[], Error>({
        queryKey: ["grades"],
        queryFn: fetchGradesFromApi,
        retry: 1,
    });

    useEffect(() => {
        if (gradesData) {
            setGrades(gradesData);
            // Set default grade if not already set
            if (gradesData.length > 0 && !grade) {
                setGrade(gradesData[0].value);
            }
        }
    }, [gradesData, grade]);

    // Refetch data when month changes for Monthly exams
    useEffect(() => {
        if (exam === "Monthly" && month) {
            refetch();
        }
    }, [month, exam, refetch]);

    useEffect(() => {
        if (isError && error) {
            setSnackbar({ open: true, message: error.message, severity: "error" });
        }
    }, [isError, error]);

    const handleCloseSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }));

    const handleRefresh = () => {
        refetch();
        setSnackbar({
            open: true,
            message: "Refreshing data...",
            severity: "info",
        });
    };

    const handleExamChange = (newExam: string) => {
        setExam(newExam);
        // Reset month to default when switching away from Monthly exam
        if (newExam !== "Monthly") {
            setMonth("01");
        }
    };

    // Prepare data for yearly subject averages chart
    const getYearlySubjectAveragesData = () => {
        if (!data?.yearly_subject_averages) return [];

        // First, get all unique subjects across all years
        const allSubjects = new Set<string>();
        data.yearly_subject_averages.forEach(yearData => {
            yearData.subjects.forEach(subject => {
                allSubjects.add(subject.subject);
            });
        });

        // Then transform the data into the format Recharts expects
        return data.yearly_subject_averages.map(yearData => {
            const yearEntry: any = { year: yearData.year.toString() };

            // Initialize all subjects to 0
            allSubjects.forEach(subject => {
                yearEntry[subject] = 0;
            });

            // Fill in the actual values
            yearData.subjects.forEach(subject => {
                yearEntry[subject.subject] = subject.percentage;
            });

            return yearEntry;
        });
    };

    return (
        <Box sx={{ display: "flex", width: "99vw", minHeight: "100vh" }}>
            <CssBaseline />
            <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
            <Box sx={{ flexGrow: 1 }}>
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
                        title="Class Teacher Report"
                        sidebarOpen={sidebarOpen}
                        setSidebarOpen={setSidebarOpen}
                    />
                </AppBar>

                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Stack spacing={3} sx={{ px: 4, py: 3 }}>
                        <Paper elevation={1} sx={{ p: 2 }}>
                            <Stack direction="row" spacing={3} flexWrap="wrap" justifyContent="space-between" alignItems="center">
                                {/* Start Date */}
                                <TextField
                                    type="date"
                                    label="Start Date"
                                    value={startDate ? startDate.format('YYYY-MM-DD') : ''}
                                    onChange={(e) => setStartDate(e.target.value ? dayjs(e.target.value) : null)}
                                    InputLabelProps={{ shrink: true }}
                                    sx={{ minWidth: { xs: '100%', sm: 150 } }}
                                />
                                {/* End Date */}
                                <TextField
                                    type="date"
                                    label="End Date"
                                    value={endDate ? endDate.format('YYYY-MM-DD') : ''}
                                    onChange={(e) => setEndDate(e.target.value ? dayjs(e.target.value) : null)}
                                    InputLabelProps={{ shrink: true }}
                                    sx={{ minWidth: { xs: '100%', sm: 150 } }}
                                />

                                {/* Grade */}
                                <TextField
                                    select
                                    label="Student Grade"
                                    value={grade}
                                    onChange={(e) => setGrade(e.target.value)}
                                    disabled={isGradesLoading}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <School />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ minWidth: { xs: '100%', sm: 150 }, flex: 1, maxWidth: 250, "& .MuiOutlinedInput-root": { borderRadius: "10px", height: "45px", }, }}
                                >
                                    {isGradesLoading ? (
                                        <MenuItem disabled>
                                            <CircularProgress size={16} sx={{ mr: 1 }} />
                                            Loading grades...
                                        </MenuItem>
                                    ) : (
                                        grades.map((g) => (
                                            <MenuItem key={g.value} value={g.value}>
                                                {g.label}
                                            </MenuItem>
                                        ))
                                    )}
                                </TextField>

                                {/* Class */}
                                <TextField
                                    select
                                    label="Class"
                                    value={className}
                                    onChange={(e) => setClassName(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Group />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ minWidth: { xs: '100%', sm: 150 }, flex: 1, maxWidth: 250, "& .MuiOutlinedInput-root": { borderRadius: "10px", height: "45px", }, }}
                                >
                                    {classes.map((c) => (
                                        <MenuItem key={c} value={c}>
                                            {c}
                                        </MenuItem>
                                    ))}
                                </TextField>

                                {/* Exam */}
                                <TextField
                                    select
                                    label="Exam"
                                    value={exam}
                                    onChange={(e) => handleExamChange(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <CalendarMonth />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ minWidth: { xs: '100%', sm: 150 }, flex: 1, maxWidth: 250, "& .MuiOutlinedInput-root": { borderRadius: "10px", height: "45px", }, }}
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
                                            minWidth: 150,
                                            flex: 1,
                                            maxWidth: 250,
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
                                        minWidth: 120,
                                    }}
                                >
                                    Refresh
                                </Button>
                            </Stack>
                        </Paper>

                        <Stack direction={{ xs: "column", md: "row" }} spacing={3} flexWrap="wrap">
                            <Paper sx={{ p: 3, flex: 1 }}>
                                <Typography fontWeight={600} mb={2}>
                                    Subject Wise Marks
                                </Typography>
                                <ResponsiveContainer width="90%" height={350}>
                                    {isLoading ? (
                                        <Box
                                            sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 250 }}
                                        >
                                            <CircularProgress />
                                        </Box>
                                    ) : (
                                        <PieChart>
                                            <Pie
                                                data={(data?.subject_marks || []).map((sm) => ({
                                                    name: sm.subject,
                                                    value: sm.average_marks,
                                                }))}
                                                dataKey="value"
                                                outerRadius={80}
                                                label={({ name, percent }) =>
                                                    `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`
                                                }
                                            >
                                                {(data?.subject_marks || []).map((_, idx) => (
                                                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <ReTooltip
                                                formatter={(value: number) => [`${value}`, "Average Marks"]}
                                                labelFormatter={(label) => label}
                                            />
                                            <Legend />
                                        </PieChart>
                                    )}
                                </ResponsiveContainer>
                            </Paper>

                            <Paper sx={{ p: 3, flex: 2 }}>
                                <Typography fontWeight={600} mb={2}>
                                    Yearly Subject Averages
                                </Typography>
                                <ResponsiveContainer width="100%" height={350}>
                                    {isLoading ? (
                                        <Box
                                            sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: 350 }}
                                        >
                                            <CircularProgress />
                                        </Box>
                                    ) : (
                                        <BarChart
                                            data={getYearlySubjectAveragesData()}
                                            margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis
                                                dataKey="year"
                                                label={{ value: 'Year', position: 'insideBottomRight', offset: -10 }}
                                            />
                                            <YAxis
                                                label={{ value: 'Total Marks', angle: -90, position: 'insideLeft' }}
                                                domain={[0, 100]}
                                            />
                                            <ReTooltip
                                                formatter={(value: number) => [`${value}%`, "Percentage"]}
                                                labelFormatter={(label) => `Year: ${label}`}
                                            />
                                            <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ paddingTop: 20 }} />
                                            {Array.from(new Set(data?.yearly_subject_averages.flatMap(y => y.subjects.map(s => s.subject)) || [])).map((subject, index) => (
                                                <Bar
                                                    key={subject}
                                                    dataKey={subject}
                                                    stackId="a"
                                                    fill={BAR_COLORS[index % BAR_COLORS.length]}
                                                    name={subject}
                                                />
                                            ))}
                                        </BarChart>
                                    )}
                                </ResponsiveContainer>
                            </Paper>
                        </Stack>

                        <Paper elevation={2} sx={{ p: 2, overflow: "auto" }}>
                            <Typography variant="h6" fontWeight={600} mb={2}>
                                Detailed Marks Breakdown
                            </Typography>
                            <TableContainer>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: "bold" }}>Student Name</TableCell>
                                            {(data?.subject_marks || []).map((subject) => (
                                                <TableCell key={subject.subject} align="right" sx={{ fontWeight: "bold" }}>
                                                    {subject.subject}
                                                </TableCell>
                                            ))}
                                            <TableCell align="right" sx={{ fontWeight: "bold" }}>
                                                Total
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: "bold" }}>
                                                Average
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: "bold" }}>
                                                Rank
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} align="center">
                                                    <CircularProgress size={24} />
                                                </TableCell>
                                            </TableRow>
                                        ) : (data?.student_marks || []).length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} align="center">
                                                    <Typography variant="body2" color="text.secondary">
                                                        {isError ? "Failed to load data." : "No records found for the selected filters."}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            (data?.student_marks || []).map((student) => (
                                                <TableRow key={student.studentName} hover>
                                                    <TableCell sx={{ fontWeight: "bold" }}>{student.studentName}</TableCell>
                                                    {(data?.subject_marks || []).map((subject) => {
                                                        const subjectMark = student.subjects.find((s) => s.subject === subject.subject);
                                                        return (
                                                            <TableCell key={`${student.studentName}-${subject.subject}`} align="right">
                                                                {subjectMark ? subjectMark.marks : "-"}
                                                            </TableCell>
                                                        );
                                                    })}
                                                    <TableCell align="right">{student.total_marks}</TableCell>
                                                    <TableCell align="right">{student.average_marks.toFixed(1)}</TableCell>
                                                    <TableCell align="right">{student.rank}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Stack>
                </LocalizationProvider>

                <Footer />
            </Box>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ClassTeacherReport;