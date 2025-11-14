import { useEffect, useMemo, useState } from "react";
import {
    Box,
    AppBar,
    CssBaseline,
    useTheme,
    Stack,
    CircularProgress,
    Typography,
    Chip,
    Divider,
    Paper,
    TextField,
    InputAdornment,
    MenuItem,
    useMediaQuery,
} from "@mui/material";
import DateRange from "@mui/icons-material/DateRange";
import School from "@mui/icons-material/School";
import CalendarMonth from "@mui/icons-material/CalendarMonth";
import Sidebar from "../components/Sidebar";
import { useCustomTheme } from "../context/ThemeContext";
import Navbar from "../components/Navbar";
import { fetchGradesFromApi, fetchMarksStatus, fetchYearsFromApi, type DropdownOption, type MarksStatusItem } from "../api/marksCheckingApi";

const exams = [
    { label: "First Term", value: "First" },
    { label: "Second Term", value: "Mid" },
    { label: "Third Term", value: "End" },
    { label: "Monthly Test", value: "Monthly" },
];

const months = [
    { label: "Select Month", value: "" },
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

const MarksChecking = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [hovered] = useState(false);
    const theme = useTheme();
    useCustomTheme();

    // Responsive breakpoints
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // dropdown states
    const [years, setYears] = useState<string[]>([]);
    const [year, setYear] = useState<string>("");
    const [examYear, setExamYear] = useState<string>("");
    const [gradeOptions, setGradeOptions] = useState<DropdownOption[]>([]);
    const [grade, setGrade] = useState<string>("");
    const [exam, setExam] = useState<string>("");
    const [month, setMonth] = useState<string>("01");

    // data
    const [rows, setRows] = useState<MarksStatusItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingGrades, setLoadingGrades] = useState(false);
    const [loadingYears, setLoadingYears] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isLoading = loading || loadingGrades || loadingYears;

    // fetch grades and years on mount
    useEffect(() => {
        let mounted = true;
        const loadGrades = async () => {
            setLoadingGrades(true);
            try {
                const grades = await fetchGradesFromApi();
                if (!mounted) return;
                setGradeOptions(grades);
                if (grades.length > 0 && !grade) {
                    setGrade(grades[0].value);
                }
            } catch (err: any) {
                setError(err?.message || "Failed to load grades");
            } finally {
                if (mounted) setLoadingGrades(false);
            }
        };

        const loadYears = async () => {
            setLoadingYears(true);
            try {
                const yearsData = await fetchYearsFromApi();
                if (!mounted) return;
                setYears(yearsData);
                if (yearsData.length > 0) {
                    setYear(yearsData[0]);
                    setExamYear(yearsData[0]);
                }
            } catch (err: any) {
                setError(err?.message || "Failed to load years");
            } finally {
                if (mounted) setLoadingYears(false);
            }
        };

        loadGrades();
        loadYears();
        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // determine if month dropdown is enabled
    const isMonthly = useMemo(() => exam === "Monthly", [exam]);

    // fetch marks whenever required inputs change
    useEffect(() => {
        // must have year, grade, examYear, exam (and month if monthly)
        const shouldFetch = year && grade && examYear && exam && (!isMonthly || (isMonthly && month));
        if (!shouldFetch) {
            setRows([]);
            return;
        }

        let mounted = true;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchMarksStatus(year, grade, examYear, exam, month);
                if (!mounted) return;
                setRows(data);
            } catch (err: any) {
                setError(err?.message || "Failed to fetch marks status");
                setRows([]);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, [year, grade, examYear, exam, month, isMonthly]);

    // handle exam change: set exam and reset month if not Monthly
    const handleExamChange = (value: string) => {
        setExam(value);
        if (value !== "Monthly") {
            setMonth("01");
        }
    };

    return (
        <Box sx={{ display: "flex", width: "100vw", height: "100vh", minHeight: "100vh", bgcolor: theme.palette.background.default }}>
            <CssBaseline />
            <Sidebar open={sidebarOpen || hovered} setOpen={setSidebarOpen} />
            <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", overflow: 'hidden' }}>
                <AppBar
                    position="static"
                    sx={{
                        bgcolor: "background.paper",
                        boxShadow: "none",
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        zIndex: theme.zIndex.drawer + 1,
                        color: theme.palette.text.primary,
                    }}
                >
                    <Navbar title="Marks Checking" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                </AppBar>

                <Box sx={{ 
                    p: { xs: 1, sm: 2, md: 3 },
                    overflowY: 'auto',
                    height: '100%'
                }}>
                    <Stack spacing={{ xs: 2, md: 3 }} sx={{ px: { xs: 1, sm: 2, md: 4 }, py: { xs: 2, md: 3 } }}>
                        {/* Top Filters */}
                        <Paper elevation={1} sx={{ p: { xs: 1.5, sm: 2 } }}>
                            <Stack
                                direction={{ xs: 'column', md: 'row' }}
                                spacing={{ xs: 2, md: 3 }}
                                sx={{ width: "100%" }}
                            >
                                {/* Year */}
                                <TextField
                                    select
                                    label="Student Year"
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
                                        width: { xs: '100%', md: 'auto' },
                                        minWidth: { md: 150 },
                                        flex: { md: 1 },
                                        maxWidth: { md: 250 },
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
                                        width: { xs: '100%', md: 'auto' },
                                        minWidth: { md: 150 },
                                        flex: { md: 1 },
                                        maxWidth: { md: 250 },
                                        "& .MuiOutlinedInput-root": {
                                            borderRadius: "10px",
                                            height: "45px",
                                        },
                                    }}
                                >
                                    {isLoading ? (
                                        <MenuItem value="">
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <CircularProgress size={16} />
                                                <Typography>Loading...</Typography>
                                            </Stack>
                                        </MenuItem>
                                    ) : (
                                        gradeOptions.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))
                                    )}
                                </TextField>

                                {/* Exam Year - new dropdown */}
                                <TextField
                                    select
                                    label="Exam Year"
                                    variant="outlined"
                                    value={examYear}
                                    onChange={(e) => setExamYear(e.target.value)}
                                    disabled={isLoading}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <DateRange color="action" />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{
                                        width: { xs: '100%', md: 'auto' },
                                        minWidth: { md: 150 },
                                        flex: { md: 1 },
                                        maxWidth: { md: 250 },
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
                                        width: { xs: '100%', md: 'auto' },
                                        minWidth: { md: 150 },
                                        flex: { md: 1 },
                                        maxWidth: { md: 250 },
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
                                            width: { xs: '100%', md: 'auto' },
                                            minWidth: { md: 150 },
                                            flex: { md: 1 },
                                            maxWidth: { md: 250 },
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
                            </Stack>
                        </Paper>

                        <Paper sx={{ p: { xs: 1.5, sm: 2 } }}>
                            <Stack spacing={1}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                                    <Typography variant={isMobile ? "subtitle1" : "h6"}>Marks Submission Status</Typography>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        {loading && <CircularProgress size={20} />}
                                        {!loading && (
                                            <Typography variant="body2" color="text.secondary">
                                                {rows.length} record{rows.length !== 1 ? "s" : ""}
                                            </Typography>
                                        )}
                                    </Stack>
                                </Stack>

                                <Divider />

                                {error && (
                                    <Typography color="error" sx={{ py: 2 }}>
                                        {error}
                                    </Typography>
                                )}

                                {!error && !loading && rows.length === 0 && (
                                    <Typography sx={{ py: 2 }} color="text.secondary">
                                        No data found for selected filters.
                                    </Typography>
                                )}

                                {/* Desktop Header Row */}
                                {!isMobile && !loading && rows.length > 0 && (
                                    <Stack direction="row" spacing={1} sx={{ fontWeight: 600, py: 1, display: { xs: 'none', md: 'flex' } }}>
                                        <Box sx={{ flex: 1 / 8, minWidth: 100 }}>Staff No</Box>
                                        <Box sx={{ flex: 2 / 8, minWidth: 140 }}>Teacher</Box>
                                        <Box sx={{ flex: 1 / 8, minWidth: 100 }}>Grade</Box>
                                        <Box sx={{ flex: 1 / 8, minWidth: 120 }}>Subject</Box>
                                        <Box sx={{ flex: 1 / 8, minWidth: 80 }}>Class</Box>
                                        <Box sx={{ flex: 1 / 8, minWidth: 100, textAlign: 'center' }}>Students</Box>
                                        <Box sx={{ flex: 1 / 8, minWidth: 100, textAlign: 'center' }}>Given</Box>
                                        <Box sx={{ flex: 1 / 8, minWidth: 100, textAlign: 'center' }}>Status</Box>
                                    </Stack>
                                )}

                                {/* Rows */}
                                <Stack spacing={1}>
                                    {rows.map((r, idx) => (
                                        <Paper key={`${r.staffNo}-${r.subject}-${idx}`} variant="outlined" sx={{ p: { xs: 1.5, sm: 1 } }}>
                                            {/* Desktop Layout */}
                                            <Stack 
                                                direction="row" 
                                                alignItems="center" 
                                                spacing={1}
                                                sx={{ display: { xs: 'none', md: 'flex' } }}
                                            >
                                                <Box sx={{ flex: 1 / 8, minWidth: 100 }}>
                                                    <Typography variant="body2">{r.staffNo}</Typography>
                                                </Box>

                                                <Box sx={{ flex: 2 / 8, minWidth: 140 }}>
                                                    <Typography variant="body2">{r.teacher_name ?? "—"}</Typography>
                                                </Box>

                                                <Box sx={{ flex: 1 / 8, minWidth: 100 }}>
                                                    <Typography variant="body2">{r.teacherGrade}</Typography>
                                                </Box>

                                                <Box sx={{ flex: 1 / 8, minWidth: 120 }}>
                                                    <Typography variant="body2">{r.subject}</Typography>
                                                </Box>

                                                <Box sx={{ flex: 1 / 8, minWidth: 80 }}>
                                                    <Typography variant="body2">{r.teacherClass}</Typography>
                                                </Box>

                                                <Box sx={{ flex: 1 / 8, minWidth: 100, textAlign: 'center' }}>
                                                    <Typography variant="body2">{r.student_count}</Typography>
                                                </Box>

                                                <Box sx={{ flex: 1 / 8, minWidth: 100, textAlign: 'center' }}>
                                                    <Typography variant="body2">{r.given_marks_count}</Typography>
                                                </Box>

                                                <Box sx={{ flex: 1 / 8, minWidth: 100, display: 'flex', justifyContent: 'center' }}>
                                                    {r.marks_submitted ? (
                                                        <Chip label="Submitted" color="success" size="small" />
                                                    ) : (
                                                        <Chip label="Pending" color="warning" size="small" />
                                                    )}
                                                </Box>
                                            </Stack>

                                            {/* Mobile/Tablet Layout */}
                                            <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                    <Stack spacing={0.5}>
                                                        <Typography variant="body2" fontWeight={600}>
                                                            {r.teacher_name ?? "—"}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Staff No: {r.staffNo}
                                                        </Typography>
                                                    </Stack>
                                                    {r.marks_submitted ? (
                                                        <Chip label="Submitted" color="success" size="small" />
                                                    ) : (
                                                        <Chip label="Pending" color="warning" size="small" />
                                                    )}
                                                </Stack>

                                                <Divider />

                                                <Stack spacing={1}>
                                                    <Stack direction="row" justifyContent="space-between">
                                                        <Typography variant="caption" color="text.secondary">Grade:</Typography>
                                                        <Typography variant="body2">{r.teacherGrade}</Typography>
                                                    </Stack>
                                                    
                                                    <Stack direction="row" justifyContent="space-between">
                                                        <Typography variant="caption" color="text.secondary">Subject:</Typography>
                                                        <Typography variant="body2">{r.subject}</Typography>
                                                    </Stack>
                                                    
                                                    <Stack direction="row" justifyContent="space-between">
                                                        <Typography variant="caption" color="text.secondary">Class:</Typography>
                                                        <Typography variant="body2">{r.teacherClass}</Typography>
                                                    </Stack>
                                                    
                                                    <Stack direction="row" justifyContent="space-between">
                                                        <Typography variant="caption" color="text.secondary">Students:</Typography>
                                                        <Typography variant="body2">{r.student_count}</Typography>
                                                    </Stack>
                                                    
                                                    <Stack direction="row" justifyContent="space-between">
                                                        <Typography variant="caption" color="text.secondary">Given Marks:</Typography>
                                                        <Typography variant="body2">{r.given_marks_count}</Typography>
                                                    </Stack>
                                                </Stack>
                                            </Stack>
                                        </Paper>
                                    ))}
                                </Stack>
                            </Stack>
                        </Paper>
                    </Stack>
                </Box>
            </Box>
        </Box>
    );
};

export default MarksChecking;