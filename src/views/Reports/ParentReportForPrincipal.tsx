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
    TextField,
    CircularProgress,
    Snackbar,
    Alert,
    Autocomplete,
    Button,
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
import axios from "axios";
import * as XLSX from 'xlsx';

import {
    fetchParentReport,
    type ParentReportData,
    type DetailedMarksTableRow,
    fetchClassStudents,
    getAvailableYears,
    type YearOption
} from "../../api/parentReportForPrincipalApi.ts";

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
    const [startYear, setStartYear] = useState<string>('');
    const [endYear, setEndYear] = useState<string>('');

    // New states for Year / Grade / Class / Students
    const [yearOptions, setYearOptions] = useState<YearOption[]>([]);
    const [gradeOptions, setGradeOptions] = useState<string[]>([]);
    const [classOptions, setClassOptions] = useState<string[]>([]);
    const [studentOptions, setStudentOptions] = useState<Student[]>([]);

    const [selectedYear, setSelectedYear] = useState<string>('');
    const [selectedGrade, setSelectedGrade] = useState<string>('');
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    // text input for student search (freeSolo)
    const [, setStudentSearchText] = useState<string>('');

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

    // Fetch years on component mount
    useEffect(() => {
        let mounted = true;
        const loadYears = async () => {
            try {
                const yearsData = await getAvailableYears();
                if (mounted) {
                    setYearOptions(yearsData);
                }
            } catch (error: any) {
                console.error("Failed to fetch years:", error);
                setSnackbar({
                    open: true,
                    message: `Failed to load year options: ${error.message}`,
                    severity: "error"
                });
            }
        };
        loadYears();
        return () => { mounted = false; };
    }, []);

    const hasValidFilters = (): boolean => {
        const hasExamFilter = Boolean(exam);
        return hasExamFilter;
    };

    // Initial data loading effect
    useEffect(() => {
        let mounted = true;
        const loadInitialData = async () => {
            try {
                const gradesResponse = await axios.get(
                    `${API_BASE_URL}/api/grades`,
                    getAuthHeader()
                );

                if (!mounted) return;

                if (Array.isArray(gradesResponse.data)) {
                    const grades = gradesResponse.data.map((item: any) => item.grade);

                    // ✅ Sort by the number inside the "Grade X" string
                    const sortedGrades = [...grades].sort((a, b) => {
                        const numA = parseInt(a.replace(/[^\d]/g, ""), 10);
                        const numB = parseInt(b.replace(/[^\d]/g, ""), 10);
                        return numA - numB;
                    });

                    setGradeOptions(sortedGrades);
                }

            } catch (err: any) {
                if (mounted) {
                    setSnackbar({
                        open: true,
                        message: `Failed to load grades: ${err.message}`,
                        severity: "error"
                    });
                }
            }
        };

        loadInitialData();
        return () => { mounted = false; };
    }, []);

    // Effect to load classes when grade is selected
    useEffect(() => {
        let mounted = true;
        const loadClasses = async () => {
            if (!selectedGrade) {
                setClassOptions([]);
                return;
            }

            try {
                // Fetch classes from /api/grade-classes endpoint
                const classesResponse = await axios.get(
                    `${API_BASE_URL}/api/grade-classes`,
                    getAuthHeader()
                );

                if (!mounted) return;

                if (Array.isArray(classesResponse.data)) {
                    const classes = classesResponse.data.map((item: any) => item.class);
                    setClassOptions(classes.sort());
                }

            } catch (err: any) {
                if (mounted) {
                    setSnackbar({
                        open: true,
                        message: `Failed to load classes: ${err.message}`,
                        severity: "error"
                    });
                }
            }
        };

        loadClasses();
        return () => { mounted = false; };
    }, [selectedGrade]);

    // Effect to load students when year, grade and class are all selected
    useEffect(() => {
        let mounted = true;
        setStudentOptions([]);
        setSelectedStudent(null);
        setStudentSearchText('');

        if (!selectedYear || !selectedGrade || !selectedClass) {
            return;
        }

        const loadStudents = async () => {
            try {
                const students = await fetchClassStudents(selectedYear, selectedGrade, selectedClass);
                if (!mounted) return;

                if (students && students.length > 0) {
                    setStudentOptions(students);
                }
            } catch (err: any) {
                if (mounted) {
                    setSnackbar({
                        open: true,
                        message: `Failed to load students: ${err.message}`,
                        severity: "error"
                    });
                }
            }
        };

        loadStudents();
        return () => { mounted = false; };
    }, [selectedYear, selectedGrade, selectedClass]);

    // When studentSearchText changes we can attempt local filter - actual selection is on Enter or on option click

    // Fetches report data for the selected student
    const {
        data: reportData,
        isLoading: isLoadingReport,
        isError: isErrorReport,
        error: errorReport
    } = useQuery<ParentReportData, Error>({
        queryKey: [
            "parent-report",
            selectedYear,
            selectedGrade,
            selectedClass,
            selectedStudent?.admissionNo || '',
            exam,
            month
        ],
        queryFn: () => {
            const admissionNo = selectedStudent?.student.studentAdmissionNo;
            const studentGrade = selectedGrade;
            const studentClass = selectedClass;

            if (!admissionNo || !studentGrade || !studentClass) {
                throw new Error("Student information not available");
            }

            const startYearValue = startYear || '';
            const endYearValue = endYear || '';
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
        enabled: Boolean(selectedStudent?.student.studentAdmissionNo) && hasValidFilters() && Boolean(selectedYear && selectedGrade && selectedClass),
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

    const handleStudentSelect = (value: Student | string | null) => {
        if (!value) {
            setSelectedStudent(null);
            return;
        }
        if (typeof value === 'string') {
            const typed = value.trim();
            // try to find in options by admissionNo
            const found = studentOptions.find(s => s.student.studentAdmissionNo === typed);
            if (found) {
                setSelectedStudent(found);
            } else {
                // If not found but grade/class/year are present, create a minimal student object so query can run
                if (selectedYear && selectedGrade && selectedClass) {
                    setSelectedStudent({
                        id: 0,
                        name: typed,
                        student: {
                            id: 0,
                            studentGrade: selectedGrade,
                            studentClass: selectedClass,
                            medium: '',
                            studentAdmissionNo: typed,
                            year: selectedYear,
                            userId: ''
                        }
                    });
                } else {
                    setSnackbar({ open: true, message: 'Please select Year/Grade/Class before searching by admission number', severity: 'warning' });
                }
            }
            return;
        }
        // Student object selected
        setSelectedStudent(value);
        // prefill year/grade/class if available from student
        if (value.student.year && !selectedYear) setSelectedYear(value.student.year);
        if (value.student.studentGrade && !selectedGrade) setSelectedGrade(value.student.studentGrade);
        if (value.student.studentClass && !selectedClass) setSelectedClass(value.student.studentClass);
    };

    // Export to PDF function
    const exportToPDF = () => {
        if (!reportData) return;

        try {
            // Create a simple PDF export using HTML to canvas
            const element = document.getElementById('performance-table');
            if (!element) {
                setSnackbar({
                    open: true,
                    message: 'Table not found for export',
                    severity: 'error'
                });
                return;
            }

            // Create PDF content
            const headers = ['Subject', 'Highest Marks', 'Highest Grade', 'Student Marks', 'Student Grade'];
            const rows = reportData.studentMarksDetailedTable.map(row => [
                row.subject,
                row.highestMarks,
                row.highestMarkGrade,
                row.studentMarks > 0 ? row.studentMarks : 'N/A',
                row.studentGrade
            ]);

            let pdfContent = `STUDENT PERFORMANCE REPORT\n`;
            pdfContent += `Student: ${reportData.studentName}\n`;
            pdfContent += `Grade: ${reportData.studentGrade}\n`;
            pdfContent += `Class: ${reportData.studentClass}\n`;
            if (reportData.current_year && reportData.current_term) {
                pdfContent += `Year: ${reportData.current_year} | Term: ${reportData.current_term}\n`;
            }
            pdfContent += `Date: ${new Date().toLocaleDateString()}\n\n`;
            pdfContent += headers.join('\t') + '\n';
            pdfContent += rows.map(row => row.join('\t')).join('\n');

            const blob = new Blob([pdfContent], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Student_Performance_${selectedStudent?.name}_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setSnackbar({
                open: true,
                message: 'Report exported successfully',
                severity: 'success'
            });
        } catch (error) {
            console.error('Error exporting PDF:', error);
            setSnackbar({
                open: true,
                message: 'Failed to export report as PDF',
                severity: 'error'
            });
        }
    };

    // Export to Excel function
    const exportToExcel = () => {
        if (!reportData) return;

        try {
            // Create workbook and worksheet
            const ws_data = [
                ['STUDENT PERFORMANCE REPORT'],
                [''],
                ['Student', reportData.studentName],
                ['Grade', reportData.studentGrade],
                ['Class', reportData.studentClass],
                ...(reportData.current_year && reportData.current_term ? [
                    ['Year', reportData.current_year],
                    ['Term', reportData.current_term]
                ] : []),
                ['Date', new Date().toLocaleDateString()],
                [''],
                ['Subject', 'Highest Marks', 'Highest Grade', 'Student Marks', 'Student Grade'],
                ...reportData.studentMarksDetailedTable.map(row => [
                    row.subject,
                    row.highestMarks,
                    row.highestMarkGrade,
                    row.studentMarks > 0 ? row.studentMarks : 'N/A',
                    row.studentGrade
                ])
            ];

            const ws = XLSX.utils.aoa_to_sheet(ws_data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Performance');
            XLSX.writeFile(wb, `Student_Performance_${selectedStudent?.name}_${new Date().toISOString().split('T')[0]}.xlsx`);

            setSnackbar({
                open: true,
                message: 'Report exported to Excel successfully',
                severity: 'success'
            });
        } catch (error) {
            console.error('Error exporting Excel:', error);
            setSnackbar({
                open: true,
                message: 'Failed to export report as Excel',
                severity: 'error'
            });
        }
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
                        <Navbar title="Student Report For Principal" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
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

                                    {/* All dropdowns in one row */}
                                    <Stack
                                        direction={{ xs: 'column', md: 'row' }}
                                        spacing={2}
                                    >
                                        {/* Exam Type */}
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

                                        {/* Month (only visible if exam === MONTHLY_EXAM_VALUE) */}
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

                                        {/* Start Year */}
                                        <TextField
                                            select
                                            label="Start Year"
                                            value={startYear}
                                            onChange={(e) => setStartYear(e.target.value)}
                                            fullWidth
                                            size="small"
                                        >
                                            <MenuItem value=""><em>None</em></MenuItem>
                                            {yearOptions.map((y) => (
                                                <MenuItem key={y.year} value={y.year}>{y.year}</MenuItem>
                                            ))}
                                        </TextField>

                                        {/* End Year */}
                                        <TextField
                                            select
                                            label="End Year"
                                            value={endYear}
                                            onChange={(e) => setEndYear(e.target.value)}
                                            fullWidth
                                            size="small"
                                        >
                                            <MenuItem value=""><em>None</em></MenuItem>
                                            {yearOptions.map((y) => (
                                                <MenuItem key={y.year} value={y.year}>{y.year}</MenuItem>
                                            ))}
                                        </TextField>
                                    </Stack>

                                    <Typography variant="h6" sx={{ mb: 3, mt: 5, fontWeight: 600 }}>
                                        Student Details
                                    </Typography>
                                    <Stack spacing={2}>
                                        {/* Row for Year, Grade, and Class */}
                                        <Stack direction="row" spacing={2.5}>
                                            <TextField
                                                select
                                                label="Year"
                                                value={selectedYear}
                                                onChange={(e) => setSelectedYear(e.target.value)}
                                                fullWidth
                                                size="small"
                                            >

                                                <MenuItem value=""><em>None</em></MenuItem>
                                                {yearOptions.map((y) => (
                                                    <MenuItem key={y.year} value={y.year}>{y.year}</MenuItem>
                                                ))}
                                            </TextField>

                                            <TextField
                                                select
                                                label="Grade"
                                                value={selectedGrade}
                                                onChange={(e) => setSelectedGrade(e.target.value)}
                                                fullWidth
                                                size="small"
                                                disabled={!selectedYear}
                                            >
                                                <MenuItem value=""><em>None</em></MenuItem>
                                                {gradeOptions.map((g) => (
                                                    <MenuItem key={g} value={g}>{g}</MenuItem>
                                                ))}
                                            </TextField>

                                            <TextField
                                                select
                                                label="Class"
                                                value={selectedClass}
                                                onChange={(e) => setSelectedClass(e.target.value)}
                                                fullWidth
                                                size="small"
                                                disabled={!selectedGrade}
                                            >
                                                <MenuItem value=""><em>None</em></MenuItem>
                                                {classOptions.map((c) => (
                                                    <MenuItem key={c} value={c}>{c}</MenuItem>
                                                ))}
                                            </TextField>
                                        </Stack>

                                        {/* Student Autocomplete (remains below) */}
                                        <Autocomplete
                                            options={studentOptions}
                                            value={selectedStudent}
                                            onChange={(_, newValue) => handleStudentSelect(newValue)}
                                            disabled={!selectedClass}
                                            getOptionLabel={(option) =>
                                                `${option.name} (${option.student.studentAdmissionNo})`
                                            }
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Student"
                                                    size="small"
                                                    placeholder={
                                                        selectedClass
                                                            ? "Search by name or admission no."
                                                            : "Select class first"
                                                    }
                                                />
                                            )}
                                            renderOption={(props, option) => (
                                                <li {...props}>
                                                    {option.name} ({option.student.studentAdmissionNo})
                                                </li>
                                            )}
                                        />

                                        {/* Student Info Box (unchanged) */}
                                        <Box
                                            sx={{
                                                p: 2,
                                                border: `1px solid ${theme.palette.divider}`,
                                                borderRadius: theme.shape.borderRadius,
                                                textAlign: "left",
                                            }}
                                        >
                                            {selectedStudent ? (
                                                <Stack spacing={1}>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        Student: {selectedStudent.name}
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        Grade: {selectedGrade || selectedStudent.student.studentGrade}
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        Class: {selectedClass || selectedStudent.student.studentClass}
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        Admission No: {selectedStudent.student.studentAdmissionNo}
                                                    </Typography>
                                                </Stack>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    No student selected
                                                </Typography>
                                            )}
                                        </Box>
                                    </Stack>

                                </Stack>
                            </Paper>

                        </Stack>

                        {/* Show message if no valid filters */}
                        {!hasValidFilters() && (
                            <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
                                <Typography variant="h6" color="text.secondary" gutterBottom>
                                    Please select exam filter to view report data
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Choose an exam type (First Term, Second Term, Third Term, or Monthly Test) to load the report.
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
                                        <Typography fontWeight={600} mb={2}>
                                            Overall Subject
                                            {reportData?.current_year && reportData?.current_term && (
                                                <Typography component="span" variant="body2" sx={{ ml: 2, color: 'text.secondary' }}>
                                                    (Year: {reportData.current_year} | Term: {reportData.current_term})
                                                </Typography>
                                            )}
                                        </Typography>
                                        <ResponsiveContainer width="100%" height={250}>
                                            {isLoadingReport ? (
                                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 250 }}>
                                                    <CircularProgress />
                                                </Box>
                                            ) : reportData?.overallSubjectLineGraph && reportData.overallSubjectLineGraph.length > 0 ? (
                                                <BarChart data={reportData.overallSubjectLineGraph} barSize={50}>
                                                    <XAxis dataKey="year" />
                                                    <YAxis domain={[0, 100]} />
                                                    <ReTooltip />
                                                    {/* Dynamically render bars for each term in the data */}
                                                    {reportData.overallSubjectLineGraph[0] && Object.keys(reportData.overallSubjectLineGraph[0]).filter(k => k !== 'year').map((termName, idx) => (
                                                        <Bar key={termName} dataKey={termName} fill={['#0d1542ff', '#1310b6ff', '#77aef5ff'][idx % 3]} name={termName} />
                                                    ))}
                                                </BarChart>
                                            ) : (
                                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 250 }}>
                                                    <Typography color="text.secondary">No data available</Typography>
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
                                                                <tspan x={x}>{name}</tspan>
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
                                        <Typography variant="h6" fontWeight={600}>
                                            Students Performance {reportData?.current_year && reportData?.current_term && (
                                                <Typography component="span" variant="body2" color="text.secondary">
                                                    ({reportData.current_year} - {reportData.current_term})
                                                </Typography>
                                            )}
                                        </Typography>
                                        <Stack direction="row" spacing={1}>
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={exportToPDF}
                                                sx={{ textTransform: 'none' }}
                                            >
                                                Export PDF
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={exportToExcel}
                                                sx={{ textTransform: 'none' }}
                                            >
                                                Export Excel
                                            </Button>
                                        </Stack>
                                    </Stack>
                                    <TableContainer id="performance-table">
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function getAuthHeader() {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('access_token');

    if (!token) {
        throw new Error('Authentication token not found. Please login again.');
    }

    return {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };
}
