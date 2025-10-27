import React, { useState, useEffect } from "react";
import {
    Box,
    CssBaseline,
    AppBar,
    Stack,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    useTheme,
    TextField,
    CircularProgress,
    Snackbar,
    Alert,
    Autocomplete,
} from "@mui/material";

import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import {
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip as ReTooltip,
    Legend,
    ResponsiveContainer,
    BarChart,
    Bar
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { type Dayjs } from "dayjs";

import {
    fetchParentReport,
    type ParentReportData,
    type DetailedMarksTableRow,
    fetchClassStudents
} from "../../api/parentReportForTeacherApi";

interface Student {
    [x: string]: any;
    id: number;
    name: string;
    student: {
        id: number;
        studentGrade: string;
        studentClass: string;
        medium: string;
        studentAdmissionNo: string;
        year: string;
        userId: string;
    };
}
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

// Standardize the Monthly Exam value to 'Monthly'
const MONTHLY_EXAM_VALUE = 'Monthly';

const examOptions = [
    { label: 'First Term', value: 'First' },
    { label: 'Second Term', value: 'Mid' },
    { label: 'Third Term', value: 'End' },
    { label: 'Monthly Test', value: MONTHLY_EXAM_VALUE }
];

const months = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];
const COLORS = ["#4285F4", "#34A853", "#FBBC05", "#EA4335", "#9C27B0", "#FF5722", "#00BCD4"];

const ParentReport: React.FC = () => {
    const theme = useTheme();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [exam, setExam] = useState("");
    const [month, setMonth] = useState("");
    const [startDate, setStartDate] = useState<Dayjs | null>(null);
    const [endDate, setEndDate] = useState<Dayjs | null>(null);

    // Student related state
    const [studentOptions, setStudentOptions] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);

    type SnackbarState = {
        open: boolean;
        message: string;
        severity: "success" | "info" | "warning" | "error";
    };
    const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'info' });

    // Clear month when exam is not "Monthly"
    useEffect(() => {
        if (exam !== MONTHLY_EXAM_VALUE) {
            setMonth("");
        }
    }, [exam]);

    const hasValidFilters = (): boolean => {
        const hasExamFilter = Boolean(exam);
        const hasDateFilter = Boolean(startDate && endDate && startDate.isValid() && endDate.isValid());
        return hasExamFilter || hasDateFilter;
    };

    // Load students on mount using the teacher info inside /api/user processed by fetchClassStudents()
    useEffect(() => {
        let mounted = true;
        const loadStudents = async () => {
            setIsLoadingStudents(true);
            try {
                const students = await fetchClassStudents();
                if (!mounted) return;
                if (Array.isArray(students)) {
                    setStudentOptions(students);
                } else {
                    setStudentOptions([]);
                }
            } catch (err: any) {
                if (mounted) {
                    setSnackbar({
                        open: true,
                        message: `Failed to load students: ${err?.message || 'Unknown error'}`,
                        severity: "error"
                    });
                }
            } finally {
                if (mounted) setIsLoadingStudents(false);
            }
        };

        loadStudents();
        return () => { mounted = false; };
    }, []);

    // Fetches report data for the selected student
    const {
        data: reportData,
        isLoading: isLoadingReport,
        isError: isErrorReport,
        error: errorReport
    } = useQuery<ParentReportData, Error>({
        queryKey: [
            "parent-report",
            selectedStudent?.student.studentAdmissionNo || '',
            startDate?.format('YYYY-MM-DD') || '',
            endDate?.format('YYYY-MM-DD') || '',
            exam,
            month
        ],
        queryFn: () => {
            const admissionNo = selectedStudent?.student.studentAdmissionNo;
            const studentGrade = selectedStudent?.student.studentGrade;
            const studentClass = selectedStudent?.student.studentClass;

            if (!admissionNo || !studentGrade || !studentClass) {
                throw new Error("Student information not available");
            }

            const startDateValue = startDate?.format('YYYY-MM-DD') || '2024-01-01';
            const endDateValue = endDate?.format('YYYY-MM-DD') || '2024-12-31';
            const examValue = exam || 'First';
            const monthValue = exam === MONTHLY_EXAM_VALUE ? month : "";

            return fetchParentReport(
                admissionNo,
                startDateValue,
                endDateValue,
                examValue,
                monthValue,
                studentGrade,
                studentClass
            );
        },
        enabled: Boolean(selectedStudent?.student.studentAdmissionNo) && hasValidFilters(),
        retry: 1
    });

    // Handle side effects for errors
    useEffect(() => {
        if (isErrorReport && errorReport) {
            setSnackbar({
                open: true,
                message: `Failed to load report data: ${errorReport.message}`,
                severity: "error"
            });
        }
    }, [isErrorReport, errorReport]);

    useEffect(() => {
        if (startDate && endDate &&
            startDate.isValid() && endDate.isValid() &&
            startDate.isAfter(endDate)) {
            setSnackbar({
                open: true,
                message: "Start date cannot be after end date",
                severity: "warning"
            });
            setEndDate(null);
        }
    }, [startDate, endDate]);

    const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

    const handleStudentSelect = (value: Student | null) => {
        if (!value) {
            setSelectedStudent(null);
            return;
        }
        // Student object selected
        setSelectedStudent(value);
    };

    const renderDetailedMarksTable = (): React.ReactNode => {
        if (isLoadingReport) {
            return (
                <TableRow>
                    <TableCell colSpan={5} align="center"><CircularProgress size={24} /></TableCell>
                </TableRow>
            );
        }

        if (!reportData || !reportData.studentMarksDetailedTable || reportData.studentMarksDetailedTable.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={5} align="center">No detailed marks available for this period.</TableCell>
                </TableRow>
            );
        }

        const rowsWithMarks = reportData.studentMarksDetailedTable.filter(row => row.studentMarks > 0);
        const totalMarks = rowsWithMarks.reduce((sum: number, current: DetailedMarksTableRow) => sum + current.studentMarks, 0);
        const averageMarks = rowsWithMarks.length > 0 ? (totalMarks / rowsWithMarks.length).toFixed(1) : 'N/A';

        const rows = reportData.studentMarksDetailedTable.map((row: DetailedMarksTableRow, idx: number) => (
            <TableRow key={idx} hover>
                <TableCell sx={{ fontWeight: 'bold' }}>{row.subject}</TableCell>
                <TableCell align="center">{row.highestMarks}</TableCell>
                <TableCell align="center">{row.highestMarkGrade}</TableCell>
                <TableCell align="center">{row.studentMarks > 0 ? row.studentMarks : 'N/A'}</TableCell>
                <TableCell align="center">{row.studentGrade !== 'N/A' ? row.studentGrade : 'N/A'}</TableCell>
            </TableRow>
        ));

        if (rowsWithMarks.length > 0) {
            rows.push(
                <TableRow sx={{ backgroundColor: theme.palette.action.hover }} key="average-row">
                    <TableCell sx={{ fontWeight: 'bold' }}>Overall Average</TableCell>
                    <TableCell align="center"></TableCell>
                    <TableCell align="center"></TableCell>
                    <TableCell align="center">{averageMarks}</TableCell>
                    <TableCell align="center"></TableCell>
                </TableRow>
            );
        }
        return rows;
    };

    const renderSubjectAverageCharts = () => {
        if (isLoadingReport) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 250, width: '100%' }}>
                    <CircularProgress />
                </Box>
            );
        }

        const individualSubjectAverages = reportData?.individualSubjectAverages;

        if (!individualSubjectAverages || Object.keys(individualSubjectAverages).length === 0) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 250, width: '100%' }}>
                    <Typography variant="h6" color="text.secondary">No subject average data available.</Typography>
                </Box>
            );
        }

        const subjects = Object.keys(individualSubjectAverages);
        const subjectRows = [];
        for (let i = 0; i < subjects.length; i += 3) {
            subjectRows.push(subjects.slice(i, i + 3));
        }

        return (
            <Stack spacing={3}>
                {subjectRows.map((row, rowIndex) => (
                    <Stack key={rowIndex} direction={{ xs: 'column', md: 'row' }} spacing={3}>
                        {row.map((subjectName) => (
                            <Paper key={subjectName} sx={{ p: 3, flex: 1, minWidth: 0 }}>
                                <Typography fontWeight={600} mb={2}>{subjectName} Subject</Typography>
                                <ResponsiveContainer width="100%" height={250}>
                                    {individualSubjectAverages[subjectName] && individualSubjectAverages[subjectName]!.length > 0 ? (
                                        <LineChart data={individualSubjectAverages[subjectName]}>
                                            <XAxis dataKey="x" />
                                            <YAxis domain={[0, 100]} label={{ value: 'Marks', angle: -90, position: 'insideLeft' }} />
                                            <ReTooltip />
                                            <Line type="monotone" dataKey="y" stroke="#42A5F5" name="Average Marks" />
                                        </LineChart>
                                    ) : (
                                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 250 }}>
                                            <Typography variant="body2" color="text.secondary">No data for {subjectName}</Typography>
                                        </Box>
                                    )}
                                </ResponsiveContainer>
                            </Paper>
                        ))}
                        {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, emptyIndex) => (
                            <Box key={`empty-${rowIndex}-${emptyIndex}`} sx={{ flex: 1 }} />
                        ))}
                    </Stack>
                ))}
            </Stack>
        );
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{ display: "flex", width: "100vw", minHeight: "100vh" }}>
                <CssBaseline />
                <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
                <Box sx={{ flexGrow: 1, overflowX: 'hidden' }}>
                    <AppBar position="static" sx={{
                        boxShadow: "none", bgcolor: theme.palette.background.paper,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        color: theme.palette.text.primary
                    }}>
                        <Navbar title="Parent Report For Teacher" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                    </AppBar>

                    <Stack spacing={3} sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
                        {/* Single row for Filters and Student Details */}
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="stretch" sx={{ width: '100%' }}>
                            {/* Filter Section */}
                            <Paper elevation={2} sx={{ p: 3, flexGrow: 1 }}>
                                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                    Report Filters
                                </Typography>
                                <Stack spacing={2}>

                                    {/* Exam Type Selection */}
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                        <Autocomplete
                                            fullWidth
                                            options={examOptions}
                                            value={examOptions.find(opt => opt.value === exam) || null}
                                            onChange={(_, newValue) => setExam(newValue?.value || '')}
                                            getOptionLabel={(option) => option.label}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Exam Type"
                                                    size="small"
                                                />
                                            )}
                                        />
                                        {exam === MONTHLY_EXAM_VALUE && (
                                            <Autocomplete
                                                fullWidth
                                                options={months}
                                                value={month}
                                                onChange={(_, newValue) => setMonth(newValue || '')}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="Month"
                                                        size="small"
                                                    />
                                                )}
                                            />
                                        )}
                                    </Stack>

                                    {/* Date Range Selection */}
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                        <DatePicker
                                            label="Start Date"
                                            value={startDate}
                                            onChange={(newValue) => setStartDate(dayjs(newValue))}
                                            slotProps={{
                                                textField: { size: 'small', fullWidth: true }
                                            }}
                                        />
                                        <DatePicker
                                            label="End Date"
                                            value={endDate}
                                            onChange={(newValue) => setEndDate(dayjs(newValue))}
                                            slotProps={{
                                                textField: { size: 'small', fullWidth: true }
                                            }}
                                        />
                                    </Stack>
                                </Stack>
                            </Paper>

                            {/* Student Details Section (single dropdown) */}
                            <Paper elevation={2} sx={{ p: 3, flexShrink: 0, minWidth: { xs: '100%', md: 320 } }}>
                                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                    Student Details
                                </Typography>

                                <Stack spacing={2}>
                                    <Autocomplete
                                        fullWidth
                                        id="student-select"
                                        options={studentOptions}
                                        value={selectedStudent}
                                        onChange={(_event, newValue) => handleStudentSelect(newValue as Student | null)}
                                        getOptionLabel={(option) =>
                                            typeof option === 'string'
                                                ? option
                                                : `${option.name} (${option.student.studentAdmissionNo})`
                                        }
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Select Student"
                                                variant="outlined"
                                                size="small"
                                            />
                                        )}
                                        loading={isLoadingStudents}
                                        loadingText="Loading students..."
                                        noOptionsText="No students found"
                                    />

                                    {/* Display selected student info */}
                                    {selectedStudent && (
                                        <Box sx={{ mt: 2 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                Admission No: {selectedStudent.student.studentAdmissionNo}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Grade: {selectedStudent.student.studentGrade}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Class: {selectedStudent.student.studentClass}
                                            </Typography>
                                        </Box>
                                    )}
                                </Stack>
                            </Paper>
                        </Stack>

                        {/* Show message if no valid filters */}
                        {!hasValidFilters() && (
                            <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
                                <Typography variant="h6" color="text.secondary" gutterBottom>
                                    Please select the filters to view report data
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Choose either an exam (and month) or select a date range to load the report.
                                </Typography>
                            </Paper>
                        )}

                        {/* Charts and Data - Only show if valid filters are applied */}
                        {hasValidFilters() && selectedStudent && (
                            <>
                                {/* Charts Section */}
                                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} flexWrap="wrap">
                                    {/* Overall Subject Bar Chart */}
                                    <Paper sx={{ p: 3, flex: 2 }}>
                                        <Typography fontWeight={600} mb={2}>Overall Subject</Typography>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <BarChart data={reportData?.overallSubjectLineGraph || []}>
                                                <XAxis dataKey="year" />
                                                <YAxis />
                                                <ReTooltip />
                                                <Legend />
                                                <Bar dataKey="firstTerm" stackId="a" fill="#8884d8" name="First Term" />
                                                <Bar dataKey="secondTerm" stackId="a" fill="#82ca9d" name="Second Term" />
                                                <Bar dataKey="thirdTerm" stackId="a" fill="#ffc658" name="Third Term" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </Paper>

                                    {/* Subject Wise Marks (Pie Chart) */}
                                    <Paper sx={{ p: 3, flex: 1 }}>
                                        <Typography fontWeight={600} mb={2}>Subject Wise Marks.</Typography>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <PieChart>
                                                <Pie data={reportData?.subjectWiseMarksPie || []} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80} fill="#8884d8">
                                                    {(reportData?.subjectWiseMarksPie || []).map((_entry, idx) => (
                                                        <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <ReTooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </Paper>
                                </Stack>

                                {renderSubjectAverageCharts()}

                                {/* Detailed Marks Table */}
                                <Paper elevation={2} sx={{ p: 2, overflowX: 'auto' }}>
                                    <Typography variant="h6" fontWeight={600} mb={2}>
                                        Detailed Marks Breakdown
                                    </Typography>
                                    <TableContainer>
                                        <Table size="small" stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>Subject</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Highest Marks</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Highest Grade</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Student Marks</TableCell>
                                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Student Grade</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {renderDetailedMarksTable()}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Paper>
                            </>
                        )}
                    </Stack>
                    <Footer />
                </Box>
                <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                    <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
        </LocalizationProvider>
    );
};

export default ParentReport;