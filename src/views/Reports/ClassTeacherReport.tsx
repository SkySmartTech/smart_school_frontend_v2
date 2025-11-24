import React, { useState, useEffect } from "react";
import {
    Box, CssBaseline, AppBar, Stack, Typography, Paper, MenuItem, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, useTheme, InputAdornment, TextField, CircularProgress,
    Snackbar, Alert, Button, useMediaQuery
} from "@mui/material";
import { School, CalendarMonth, Group, Refresh } from "@mui/icons-material";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
    Tooltip as ReTooltip, Legend, ResponsiveContainer, CartesianGrid
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { fetchClassTeacherReport, fetchGradesFromApi, fetchClassesFromApi, fetchYearsFromApi, type DropdownOption } from "../../api/classteacherApi";
import Footer from "../../components/Footer";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const exams = [
    { label: 'First Term', value: 'First Term' },
    { label: 'Second Term', value: 'Second Term' },
    { label: 'Third Term', value: 'Third Term' },
    { label: 'Monthly Test', value: 'Monthly Test' }
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
    end_year?: number;
    end_term?: string;
}

// Export functions for table data
const exportToExcel = (data: StudentMark[], subjects: SubjectMark[], endYear?: number, endTerm?: string) => {
    const tableData: any[] = [];
    
    // Add header row with title
    tableData.push([`Student Performance Report - ${endYear || 'N/A'} ${endTerm || ''}`]);
    tableData.push([]);
    
    // Create header row
    const headers = ['Student Name'];
    subjects.forEach((s) => headers.push(s.subject));
    headers.push('Total', 'Average', 'Rank');
    tableData.push(headers);
    
    // Add data rows
    data.forEach((student) => {
        const row: any[] = [student.studentName];
        subjects.forEach((subject) => {
            const subjectMark = student.subjects.find(s => s.subject === subject.subject);
            row.push(subjectMark ? subjectMark.marks : 0);
        });
        row.push(student.total_marks);
        row.push(student.average_marks.toFixed(2));
        row.push(student.rank);
        tableData.push(row);
    });
    
    // Create worksheet and workbook
    const worksheet = XLSX.utils.aoa_to_sheet(tableData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    
    // Download the file
    XLSX.writeFile(workbook, `Student_Performance_${endYear || 'Report'}.xlsx`);
};

const exportToPDF = (data: StudentMark[], subjects: SubjectMark[], endYear?: number, endTerm?: string) => {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    // Add title
    doc.setFontSize(16);
    doc.text(`Student Performance Report - ${endYear || 'N/A'} ${endTerm || ''}`, 15, 15);

    // Prepare table data
    const tableData: any[] = [];
    const headers = ['Student Name', ...subjects.map(s => s.subject), 'Total', 'Average', 'Rank'];
    
    data.forEach((student) => {
        const row = [
            student.studentName,
            ...subjects.map(subject => {
                const subjectMark = student.subjects.find(s => s.subject === subject.subject);
                return subjectMark ? subjectMark.marks : 0;
            }),
            student.total_marks.toFixed(2),
            student.average_marks.toFixed(2),
            student.rank
        ];
        tableData.push(row);
    });

    // @ts-ignore
    doc.autoTable({
        head: [headers],
        body: tableData,
        startY: 25,
        margin: { top: 25 },
        styles: {
            fontSize: 10,
            cellPadding: 3
        },
        headerStyles: {
            fillColor: [100, 150, 200],
            textColor: 255,
            fontStyle: 'bold'
        }
    });

    // Save the PDF
    doc.save(`Student_Performance_${endYear || 'Report'}.pdf`);
};

const ClassTeacherReport: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Year states instead of date states
    const [startYear, setStartYear] = useState<string>("");
    const [endYear, setEndYear] = useState<string>("");
    const [month, setMonth] = useState<string>("01");
    const [grade, setGrade] = useState<string>("");
    const [className, setClassName] = useState("Olu");
    const [exam, setExam] = useState("First Term");
    const [grades, setGrades] = useState<DropdownOption[]>([]);
    const [classes, setClasses] = useState<DropdownOption[]>([]);
    const [years, setYears] = useState<DropdownOption[]>([]);

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
        queryKey: ["class-teacher-report", startYear, endYear, grade, className, exam, month],
        queryFn: () => {
            return fetchClassTeacherReport(startYear, endYear, grade, className, exam, month);
        },
        retry: 1,
        enabled: !!startYear && !!endYear && (exam !== "Monthly Test" || (exam === "Monthly Test" && !!month)),
    });

    // Fetch grades from API
    const { data: gradesData, isLoading: isGradesLoading } = useQuery<DropdownOption[], Error>({
        queryKey: ["grades"],
        queryFn: fetchGradesFromApi,
        retry: 1,
    });

    // Fetch classes from API
    const { data: classesData, isLoading: isClassesLoading } = useQuery<DropdownOption[], Error>({
        queryKey: ["classes"],
        queryFn: fetchClassesFromApi,
        retry: 1,
    });

    // Fetch years from API
    const { data: yearsData, isLoading: isYearsLoading } = useQuery<DropdownOption[], Error>({
        queryKey: ["years"],
        queryFn: fetchYearsFromApi,
        retry: 1,
    });

    useEffect(() => {
        if (gradesData) {
            // Ensure grades are sorted numerically (Grade 1..Grade 20)
            const sortedGrades = [...gradesData].sort((a, b) => {
                const na = parseInt((a.value || '').toString().replace(/\D/g, ''), 10);
                const nb = parseInt((b.value || '').toString().replace(/\D/g, ''), 10);

                const aIsNum = !isNaN(na);
                const bIsNum = !isNaN(nb);

                if (aIsNum && bIsNum) return na - nb;
                if (aIsNum) return -1;
                if (bIsNum) return 1;
                return a.label.localeCompare(b.label);
            });

            setGrades(sortedGrades);
            // Set default grade (use the label, e.g. "Grade 8") if not already set
            if (sortedGrades.length > 0 && !grade) {
                setGrade(sortedGrades[0].label);
            }
        }
    }, [gradesData, grade]);

    useEffect(() => {
        if (classesData) {
            setClasses(classesData);
            // Set default class if not already set
            if (classesData.length > 0 && !className) {
                setClassName(classesData[0].value);
            }
        }
    }, [classesData, className]);

    useEffect(() => {
        if (yearsData) {
            setYears(yearsData);
            // Set default years if not already set
            if (yearsData.length > 0 && !startYear) {
                setStartYear(yearsData[0].value);
            }
            if (yearsData.length > 0 && !endYear) {
                setEndYear(yearsData[yearsData.length - 1].value);
            }
        }
    }, [yearsData, startYear, endYear]);

    // Refetch data when month changes for Monthly exams
    useEffect(() => {
        if (exam === "Monthly Test" && month) {
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
        if (newExam !== "Monthly Test") {
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
        <Box sx={{ display: "flex", width: "100vw", minHeight: "100vh", overflow: "hidden" }}>
            <CssBaseline />
            <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
            <Box sx={{ flexGrow: 1, width: "100%", overflow: "hidden" }}>
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

                <Stack spacing={3} sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, sm: 3 } }}>
                    <Paper elevation={1} sx={{ p: { xs: 2, sm: 2 } }}>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={2}
                            flexWrap="wrap"
                            alignItems={{ xs: "stretch", sm: "center" }}
                        >
                            {/* Start Year */}
                            <TextField
                                select
                                label="Start Year"
                                value={startYear}
                                onChange={(e) => setStartYear(e.target.value)}
                                disabled={isYearsLoading}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <CalendarMonth fontSize={isMobile ? "small" : "medium"} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    width: { xs: '100%', sm: 'auto' },
                                    minWidth: { sm: 150 },
                                    flex: { sm: 1 },
                                    maxWidth: { sm: 200 }
                                }}
                                size={isMobile ? "small" : "medium"}
                            >
                                {isYearsLoading ? (
                                    <MenuItem disabled>
                                        <CircularProgress size={16} sx={{ mr: 1 }} />
                                        Loading years...
                                    </MenuItem>
                                ) : (
                                    years.map((y) => (
                                        <MenuItem key={y.value} value={y.value}>
                                            {y.label}
                                        </MenuItem>
                                    ))
                                )}
                            </TextField>
                            {/* End Year */}
                            <TextField
                                select
                                label="End Year"
                                value={endYear}
                                onChange={(e) => setEndYear(e.target.value)}
                                disabled={isYearsLoading}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <CalendarMonth fontSize={isMobile ? "small" : "medium"} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    width: { xs: '100%', sm: 'auto' },
                                    minWidth: { sm: 150 },
                                    flex: { sm: 1 },
                                    maxWidth: { sm: 200 }
                                }}
                                size={isMobile ? "small" : "medium"}
                            >
                                {isYearsLoading ? (
                                    <MenuItem disabled>
                                        <CircularProgress size={16} sx={{ mr: 1 }} />
                                        Loading years...
                                    </MenuItem>
                                ) : (
                                    years.map((y) => (
                                        <MenuItem key={y.value} value={y.value}>
                                            {y.label}
                                        </MenuItem>
                                    ))
                                )}
                            </TextField>

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
                                            <School fontSize={isMobile ? "small" : "medium"} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    width: { xs: '100%', sm: 'auto' },
                                    minWidth: { sm: 150 },
                                    flex: { sm: 1 },
                                    maxWidth: { sm: 200 }
                                }}
                                    size={isMobile ? "small" : "medium"}
                                >
                                    {isGradesLoading ? (
                                        <MenuItem disabled>
                                            <CircularProgress size={16} sx={{ mr: 1 }} />
                                            Loading grades...
                                        </MenuItem>
                                    ) : (
                                        // Use the label as the selected value so the API receives "Grade X"
                                        grades.map((g) => (
                                            <MenuItem key={g.value} value={g.label}>
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
                                    disabled={isClassesLoading}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Group fontSize={isMobile ? "small" : "medium"} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{
                                        width: { xs: '100%', sm: 'auto' },
                                        minWidth: { sm: 150 },
                                        flex: { sm: 1 },
                                        maxWidth: { sm: 200 }
                                    }}
                                    size={isMobile ? "small" : "medium"}
                                >
                                    {isClassesLoading ? (
                                        <MenuItem disabled>
                                            <CircularProgress size={16} sx={{ mr: 1 }} />
                                            Loading classes...
                                        </MenuItem>
                                    ) : (
                                        classes.map((c) => (
                                            <MenuItem key={c.value} value={c.value}>
                                                {c.label}
                                            </MenuItem>
                                        ))
                                    )}
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
                                                <CalendarMonth fontSize={isMobile ? "small" : "medium"} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{
                                        width: { xs: '100%', sm: 'auto' },
                                        minWidth: { sm: 150 },
                                        flex: { sm: 1 },
                                        maxWidth: { sm: 200 }
                                    }}
                                    size={isMobile ? "small" : "medium"}
                                >
                                    {exams.map((examOption) => (
                                        <MenuItem key={examOption.value} value={examOption.value}>
                                            {examOption.label}
                                        </MenuItem>
                                    ))}
                                </TextField>

                                {/* Month - visible only if Monthly Test is selected */}
                                {exam === "Monthly Test" && (
                                    <TextField
                                        select
                                        label="Month"
                                        value={month}
                                        onChange={(e) => setMonth(e.target.value)}
                                        disabled={isLoading}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <CalendarMonth fontSize={isMobile ? "small" : "medium"} />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            width: { xs: '100%', sm: 'auto' },
                                            minWidth: { sm: 150 },
                                            flex: { sm: 1 },
                                            maxWidth: { sm: 200 }
                                        }}
                                        size={isMobile ? "small" : "medium"}
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
                                    startIcon={<Refresh fontSize={isMobile ? "small" : "medium"} />}
                                    sx={{
                                        borderRadius: "10px",
                                        height: { xs: "40px", sm: "45px" },
                                        width: { xs: '100%', sm: 'auto' },
                                        minWidth: { sm: 120 },
                                    }}
                                    size={isMobile ? "small" : "medium"}
                                >
                                    Refresh
                                </Button>
                            </Stack>
                        </Paper>

                        <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
                            <Paper sx={{ p: { xs: 2, sm: 3 }, flex: 1, width: "100%" }}>
                                <Typography fontWeight={600} mb={2} variant={isMobile ? "body1" : "h6"}>
                                    Subject Wise Marks
                                </Typography>
                                <ResponsiveContainer width="100%" height={isMobile ? 300 : 350}>
                                    {isLoading ? (
                                        <Box
                                            sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}
                                        >
                                            <CircularProgress />
                                        </Box>
                                    ) : (

                                        <PieChart>
                                            <Pie
                                                data={(data?.subject_marks || []).map((s: any) => ({ name: s.subject, value: s.percentage }))}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="40%"
                                                outerRadius={80}
                                                label={({ name, value, cx, cy, midAngle, outerRadius }) => {
                                                    // Calculate label position OUTSIDE the pie
                                                    const RADIAN = Math.PI / 180;
                                                    // provide safe defaults in case values are undefined
                                                    const safeMidAngle = typeof midAngle === 'number' ? midAngle : 0;
                                                    const safeCx = typeof cx === 'number' ? cx : 0;
                                                    const safeCy = typeof cy === 'number' ? cy : 0;
                                                    const safeOuterRadius = typeof outerRadius === 'number' ? outerRadius : 0;
                                                    const radius = safeOuterRadius + 25; // distance outside
                                                    const x = safeCx + radius * Math.cos(-safeMidAngle * RADIAN);
                                                    const y = safeCy + radius * Math.sin(-safeMidAngle * RADIAN);

                                                    return (
                                                        <text
                                                            x={x}
                                                            y={y}
                                                            textAnchor={x > safeCx ? "start" : "end"}
                                                            dominantBaseline="central"
                                                            style={{ fontSize: "12px", fill: "#333" }}
                                                        >
                                                            <tspan>{name}</tspan>
                                                            <tspan x={x} dy="1.2em">{value}%</tspan>
                                                        </text>
                                                    );
                                                }}
                                                labelLine={true}
                                            >
                                                {((data?.subject_marks || []).map((s: any) => ({ name: s.subject, value: s.percentage }))).map((_entry: any, idx: number) => (
                                                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                                ))}
                                            </Pie>

                                            <ReTooltip formatter={(value) => `${value}%`} />

                                            <Legend
                                                verticalAlign="bottom"
                                                height={36}
                                                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                                            />
                                        </PieChart>
                                    )}
                                </ResponsiveContainer>
                            </Paper>

                            <Paper sx={{ p: { xs: 2, sm: 3 }, flex: { xs: 1, md: 2 }, width: "100%" }}>
                                <Typography fontWeight={600} mb={2} variant={isMobile ? "body1" : "h6"}>
                                    Yearly Subject Averages
                                </Typography>
                                <ResponsiveContainer width="100%" height={isMobile ? 300 : 350}>
                                    {isLoading ? (
                                        <Box
                                            sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}
                                        >
                                            <CircularProgress />
                                        </Box>
                                    ) : (
                                        <BarChart
                                            data={getYearlySubjectAveragesData()}
                                            margin={{
                                                top: 20,
                                                right: isMobile ? 10 : 30,
                                                left: isMobile ? 0 : 60,
                                                bottom: isMobile ? 80 : 60
                                            }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis
                                                dataKey="year"
                                                label={!isMobile ? { value: 'Year', position: 'insideBottomRight', offset: -10 } : undefined}
                                                tick={{ fontSize: isMobile ? 10 : 12 }}
                                            />
                                            <YAxis
                                                label={!isMobile ? { value: 'Total Marks', angle: -90, position: 'insideLeft' } : undefined}
                                                domain={[0, 100]}
                                                tick={{ fontSize: isMobile ? 10 : 12 }}
                                            />
                                            <ReTooltip
                                                formatter={(value: number, name: string) => [`${value}%`, name]}
                                                labelFormatter={(label) => `Year: ${label}`}
                                            />
                                            <Legend
                                                layout="horizontal"
                                                verticalAlign="bottom"
                                                wrapperStyle={{
                                                    paddingTop: 20,
                                                    fontSize: isMobile ? '10px' : '12px'
                                                }}
                                            />
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

                        <Paper elevation={2} sx={{ p: { xs: 1, sm: 2 }, overflow: "auto" }}>
                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                justifyContent="space-between"
                                alignItems={{ xs: "flex-start", sm: "center" }}
                                mb={2}
                                px={isMobile ? 1 : 0}
                                spacing={1}
                            >
                                <Stack spacing={0.5}>
                                    <Typography
                                        variant={isMobile ? "body1" : "h6"}
                                        fontWeight={600}
                                    >
                                        Students Performance
                                    </Typography>
                                    {data?.end_year && data?.end_term && (
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ fontWeight: 500 }}
                                        >
                                            Year: {data.end_year} | Term: {data.end_term}
                                        </Typography>
                                    )}
                                </Stack>
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
                                    <Typography
                                        variant={isMobile ? "body2" : "subtitle1"}
                                        color="text.secondary"
                                    >
                                        Total Students: {(data?.student_marks || []).length}
                                    </Typography>
                                    {(data?.student_marks || []).length > 0 && (
                                        <>
                                            <Button
                                                variant="outlined"
                                                size={isMobile ? "small" : "medium"}
                                                onClick={() => exportToExcel(data?.student_marks || [], data?.subject_marks || [], data?.end_year, data?.end_term)}
                                                sx={{ 
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 0.5,
                                                    minWidth: 'auto'
                                                }}
                                            >
                                                {!isMobile && 'Export'}
                                                <span>📊</span>
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                size={isMobile ? "small" : "medium"}
                                                onClick={() => exportToPDF(data?.student_marks || [], data?.subject_marks || [], data?.end_year, data?.end_term)}
                                                sx={{ 
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 0.5,
                                                    minWidth: 'auto'
                                                }}
                                            >
                                                {!isMobile && 'PDF'}
                                                <span>📄</span>
                                            </Button>
                                        </>
                                    )}
                                </Stack>
                            </Stack>
                            <TableContainer sx={{ maxHeight: { xs: 400, sm: 600 } }}>
                                <Table size={isMobile ? "small" : "medium"} stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell
                                                sx={{
                                                    fontWeight: "bold",
                                                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                                                    minWidth: isMobile ? 80 : 120,
                                                    position: 'sticky',
                                                    left: 0,
                                                    bgcolor: 'background.paper',
                                                    zIndex: 2
                                                }}
                                            >
                                                Student
                                            </TableCell>
                                            {(data?.subject_marks || []).map((subject) => (
                                                <TableCell
                                                    key={subject.subject}
                                                    align="right"
                                                    sx={{
                                                        fontWeight: "bold",
                                                        fontSize: isMobile ? '0.75rem' : '0.875rem',
                                                        minWidth: isMobile ? 60 : 80
                                                    }}
                                                >
                                                    {subject.subject}
                                                </TableCell>
                                            ))}
                                            <TableCell
                                                align="right"
                                                sx={{
                                                    fontWeight: "bold",
                                                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                                                    minWidth: isMobile ? 50 : 70
                                                }}
                                            >
                                                Total
                                            </TableCell>
                                            <TableCell
                                                align="right"
                                                sx={{
                                                    fontWeight: "bold",
                                                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                                                    minWidth: isMobile ? 50 : 70
                                                }}
                                            >
                                                Avg
                                            </TableCell>
                                            <TableCell
                                                align="right"
                                                sx={{
                                                    fontWeight: "bold",
                                                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                                                    minWidth: isMobile ? 50 : 70
                                                }}
                                            >
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
                                                        {isError ? "Failed to load data." : "Marks have not been added to the subjects yet. Please check after submitting the marks."}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            (data?.student_marks || []).map((student) => (
                                                <TableRow key={student.studentName} hover>
                                                    <TableCell
                                                        sx={{
                                                            fontWeight: "bold",
                                                            fontSize: isMobile ? '0.75rem' : '0.875rem',
                                                            position: 'sticky',
                                                            left: 0,
                                                            bgcolor: 'background.paper',
                                                            zIndex: 1
                                                        }}
                                                    >
                                                        {student.studentName}
                                                    </TableCell>
                                                    {(data?.subject_marks || []).map((subject) => {
                                                        const subjectMark = student.subjects.find((s) => s.subject === subject.subject);
                                                        return (
                                                            <TableCell
                                                                key={`${student.studentName}-${subject.subject}`}
                                                                align="right"
                                                                sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
                                                            >
                                                                {subjectMark ? subjectMark.marks : "-"}
                                                            </TableCell>
                                                        );
                                                    })}
                                                    <TableCell
                                                        align="right"
                                                        sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
                                                    >
                                                        {student.total_marks}
                                                    </TableCell>
                                                    <TableCell
                                                        align="right"
                                                        sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
                                                    >
                                                        {student.average_marks.toFixed(1)}
                                                    </TableCell>
                                                    <TableCell
                                                        align="right"
                                                        sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
                                                    >
                                                        {student.rank}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Stack>

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