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
    Button,
} from "@mui/material";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

import {
    fetchParentReport,
    type ParentReportData,
    type DetailedMarksTableRow,
    fetchClassStudents,
    getAvailableYears
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

// Standardize the Monthly Exam value to 'Monthly'
const MONTHLY_EXAM_VALUE = 'Monthly';

const examOptions = [
    { label: 'First Term', value: 'First Term' },
    { label: 'Second Term', value: 'Second Term' },
    { label: 'Third Term', value: 'Third Term' },
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
    const [startYear, setStartYear] = useState<string | null>(null);
    const [endYear, setEndYear] = useState<string | null>(null);
    const [availableYears, setAvailableYears] = useState<string[]>([]);
    const [isLoadingYears, setIsLoadingYears] = useState(false);

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

    // Load available years on mount
    useEffect(() => {
        let mounted = true;
        const loadYears = async () => {
            setIsLoadingYears(true);
            try {
                const years = await getAvailableYears();
                if (mounted) {
                    setAvailableYears(years);
                }
            } catch (err: any) {
                if (mounted) {
                    setSnackbar({
                        open: true,
                        message: `Failed to load years: ${err?.message || 'Unknown error'}`,
                        severity: "error"
                    });
                }
            } finally {
                if (mounted) setIsLoadingYears(false);
            }
        };

        loadYears();
        return () => { mounted = false; };
    }, []);

    // Clear month when exam is not "Monthly"
    useEffect(() => {
        if (exam !== MONTHLY_EXAM_VALUE) {
            setMonth("");
        }
    }, [exam]);

    const hasValidFilters = (): boolean => {
        const hasExamFilter = Boolean(exam);
        const hasYearFilter = Boolean(startYear && endYear);
        return hasExamFilter || hasYearFilter;
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
            startYear || '',
            endYear || '',
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

            const startYearValue = startYear || '2024';
            const endYearValue = endYear || '2024';
            const examValue = exam || 'First';
            const monthValue = exam === MONTHLY_EXAM_VALUE ? month : "";

            return fetchParentReport(
                admissionNo,
                startYearValue,
                endYearValue,
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

    const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

    const handleStudentSelect = (value: Student | null) => {
        if (!value) {
            setSelectedStudent(null);
            return;
        }
        // Student object selected
        setSelectedStudent(value);
    };

    // Get the term key based on selected exam
    const getTermKeyForExam = (examValue: string): 'firstTerm' | 'secondTerm' | 'thirdTerm' | null => {
        switch (examValue) {
            case 'First Term':
                return 'firstTerm';
            case 'Second Term':
                return 'secondTerm';
            case 'Third Term':
                return 'thirdTerm';
            default:
                return null;
        }
    };

    // Filter bar chart data to show only selected term
    const getFilteredBarChartData = () => {
        if (!reportData?.overallSubjectLineGraph) {
            return [];
        }

        const termKey = getTermKeyForExam(exam);
        if (!termKey) {
            return [];
        }

        return reportData.overallSubjectLineGraph.map(item => ({
            year: item.year,
            value: item[termKey as keyof typeof item] || 0
        }));
    };

    // Export to PDF
    const exportToPDF = () => {
        if (!reportData || !reportData.studentMarksDetailedTable) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        
        // Add title
        doc.setFontSize(16);
        doc.text(`Student Performance Report`, pageWidth / 2, 15, { align: 'center' });
        
        // Add student info
        doc.setFontSize(10);
        doc.text(`Student: ${reportData.studentName}`, 15, 25);
        doc.text(`Grade: ${reportData.studentGrade} | Class: ${reportData.studentClass}`, 15, 32);
        if (reportData.currentYear && reportData.currentTerm) {
            doc.text(`Current Year: ${reportData.currentYear} | Current Term: ${reportData.currentTerm}`, 15, 39);
        }
        
        // Add table
        const tableData = reportData.studentMarksDetailedTable.map(row => [
            row.subject,
            String(row.highestMarks),
            row.highestMarkGrade,
            row.studentMarks > 0 ? String(row.studentMarks) : 'N/A',
            row.studentGrade !== 'N/A' ? row.studentGrade : 'N/A'
        ]);

        autoTable(doc, {
            head: [['Subject', 'Highest Marks', 'Highest Grade', 'Student Marks', 'Student Grade']],
            body: tableData,
            startY: 50,
            theme: 'grid',
            headStyles: { fillColor: [13, 21, 66], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [240, 240, 240] }
        });

        doc.save(`Student_Performance_${reportData.studentName}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // Export to Excel
    const exportToExcel = () => {
        if (!reportData || !reportData.studentMarksDetailedTable) return;

        const worksheet = XLSX.utils.json_to_sheet([
            {
                'Student Name': reportData.studentName,
                'Grade': reportData.studentGrade,
                'Class': reportData.studentClass,
                'Current Year': reportData.currentYear || '',
                'Current Term': reportData.currentTerm || ''
            },
            {},
            ...reportData.studentMarksDetailedTable.map(row => ({
                'Subject': row.subject,
                'Highest Marks': row.highestMarks,
                'Highest Grade': row.highestMarkGrade,
                'Student Marks': row.studentMarks > 0 ? row.studentMarks : 'N/A',
                'Student Grade': row.studentGrade !== 'N/A' ? row.studentGrade : 'N/A'
            }))
        ]);

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Performance');
        XLSX.writeFile(workbook, `Student_Performance_${reportData.studentName}_${new Date().toISOString().split('T')[0]}.xlsx`);
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
                    <TableCell colSpan={5} align="center">Marks have not been added to the subjects yet. Please check after submitting the marks.</TableCell>
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
                        <Navbar title="Student Report For Teacher" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                    </AppBar>

                    <Stack spacing={3} sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
                        {/* Single row for Filters and Student Details */}
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="stretch" sx={{ width: '100%' }}>
                            {/* Filter Section */}
                            <Paper elevation={2} sx={{ p: 3, flexGrow: 1 }}>
                                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                    Report Filters
                                </Typography>
                                <Stack
                                    direction="row"
                                    spacing={2}
                                    flexWrap="wrap" // allows wrapping on smaller screens
                                    alignItems="center"
                                >

                                    {/* Exam Type Selection */}
                                    <Autocomplete
                                        sx={{ minWidth: 200, flex: 1 }}
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
                                            sx={{ minWidth: 200, flex: 1 }}
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

                                    {/* Start Year */}
                                    <Autocomplete
                                        sx={{ minWidth: 200, flex: 1 }}
                                        options={availableYears}
                                        value={startYear}
                                        onChange={(_, newValue) => setStartYear(newValue || null)}
                                        loading={isLoadingYears}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Start Year"
                                                size="small"
                                                placeholder="Select year"
                                            />
                                        )}
                                    />

                                    {/* End Year */}
                                    <Autocomplete
                                        sx={{ minWidth: 200, flex: 1 }}
                                        options={availableYears}
                                        value={endYear}
                                        onChange={(_, newValue) => setEndYear(newValue || null)}
                                        loading={isLoadingYears}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="End Year"
                                                size="small"
                                                placeholder="Select year"
                                            />
                                        )}
                                    />

                                </Stack>
                                <Typography variant="h6" sx={{ mb: 2, mt: 5, fontWeight: 600, }}>
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
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                            <Typography fontWeight={600}>Overall Subject</Typography>
                                            {exam && getTermKeyForExam(exam) && (
                                                <Typography variant="body2" color="text.secondary">
                                                    {exam}
                                                </Typography>
                                            )}
                                        </Stack>
                                        <ResponsiveContainer width="100%" height={250}>
                                            {isLoadingReport ? (
                                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 250 }}>
                                                    <CircularProgress />
                                                </Box>
                                            ) : getFilteredBarChartData().length > 0 ? (
                                                <BarChart data={getFilteredBarChartData()} barSize={50}>
                                                    <XAxis dataKey="year" />
                                                    <YAxis domain={[0, 100]} />
                                                    <ReTooltip />
                                                    <Bar dataKey="value" fill="#0d1542ff" name={exam || 'Term'} />
                                                </BarChart>
                                            ) : (
                                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 250 }}>
                                                    <Typography color="text.secondary">Select a term to view data</Typography>
                                                </Box>
                                            )}
                                        </ResponsiveContainer>
                                    </Paper>

                                    {/* Subject Wise Marks (Pie Chart) */}
                                    <Paper sx={{ p: 3, flex: 1 }}>
                                        <Typography fontWeight={600} mb={2}>Subject Wise Marks</Typography>

                                        <ResponsiveContainer width="100%" height={320}>
                                            <PieChart>
                                                <Pie
                                                    data={reportData?.subjectWiseMarksPie || []}
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
                                                    {(reportData?.subjectWiseMarksPie || []).map((_entry, idx) => (
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
                                        </ResponsiveContainer>
                                    </Paper>


                                </Stack>

                                {renderSubjectAverageCharts()}

                                {/* Detailed Marks Table */}
                                <Paper elevation={2} sx={{ p: 2, overflowX: 'auto' }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                        <Stack>
                                            <Typography variant="h6" fontWeight={600}>
                                                Students Performance
                                            </Typography>
                                            {reportData?.currentYear && reportData?.currentTerm && (
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                    Current Year: {reportData.currentYear} | Current Term: {reportData.currentTerm}
                                                </Typography>
                                            )}
                                        </Stack>
                                        <Stack direction="row" spacing={1}>
                                            <Button
                                                variant="contained"
                                                size="small"
                                                onClick={exportToPDF}
                                                disabled={isLoadingReport || !reportData?.studentMarksDetailedTable}
                                            >
                                                Export PDF
                                            </Button>
                                            <Button
                                                variant="contained"
                                                size="small"
                                                onClick={exportToExcel}
                                                disabled={isLoadingReport || !reportData?.studentMarksDetailedTable}
                                            >
                                                Export Excel
                                            </Button>
                                        </Stack>
                                    </Stack>
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