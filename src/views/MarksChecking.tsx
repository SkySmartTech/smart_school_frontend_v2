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
} from "@mui/material";
import DateRange from "@mui/icons-material/DateRange";
import School from "@mui/icons-material/School";
import CalendarMonth from "@mui/icons-material/CalendarMonth";
import Sidebar from "../components/Sidebar";
import { useCustomTheme } from "../context/ThemeContext";
import Navbar from "../components/Navbar";
import { fetchGradesFromApi, fetchMarksStatus, type DropdownOption, type MarksStatusItem } from "../api/marksCheckingApi";

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

const hardcodedYears = (() => {
    const thisYear = new Date().getFullYear();
    const startYear = thisYear - 5;
    const endYear = thisYear + 5;
    return Array.from({ length: endYear - startYear + 1 }, (_, i) =>
        String(startYear + i)
    );
})();


const MarksChecking = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [hovered] = useState(false);
    const theme = useTheme();
    useCustomTheme();

    // dropdown states
    const [year, setYear] = useState<string>(hardcodedYears[0]);
    const [examYear, setExamYear] = useState<string>(hardcodedYears[0]);
    const [gradeOptions, setGradeOptions] = useState<DropdownOption[]>([]);
    const [grade, setGrade] = useState<string>("");
    const [exam, setExam] = useState<string>("");
    const [month, setMonth] = useState<string>("01");

    // data
    const [rows, setRows] = useState<MarksStatusItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingGrades, setLoadingGrades] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isLoading = loading || loadingGrades;
    const years = hardcodedYears;

    // fetch grades on mount
    useEffect(() => {
        let mounted = true;
        const load = async () => {
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
        load();
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
            <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
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

                <Box sx={{ p: 3 }}>
                    <Stack spacing={3} sx={{ px: 4, py: 3 }}>
                        {/* Top Filters */}
                        <Paper elevation={1} sx={{ p: 2 }}>
                            <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                spacing={3}
                                flexWrap="wrap"
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
                                        minWidth: 150,
                                        flex: 1,
                                        maxWidth: 250,
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
                                        minWidth: 150,
                                        flex: 1,
                                        maxWidth: 250,
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
                                        minWidth: 150,
                                        flex: 1,
                                        maxWidth: 250,
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
                                        minWidth: 150,
                                        flex: 1,
                                        maxWidth: 250,
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
                            </Stack>
                        </Paper>

                        <Paper sx={{ p: 2 }}>
                            <Stack spacing={1}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between">
                                    <Typography variant="h6">Marks Submission Status</Typography>
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

                                {/* Header Row */}
                                {!loading && rows.length > 0 && (
                                    <Stack direction="row" spacing={1} sx={{ fontWeight: 600, py: 1 }}>
                                        <Box sx={{ flex: 1 / 6, minWidth: 120 }}>Staff No</Box>
                                        <Box sx={{ flex: 2 / 6, minWidth: 160 }}>Teacher</Box>
                                        <Box sx={{ flex: 1 / 6, minWidth: 140 }}>Grade</Box>
                                        <Box sx={{ flex: 1 / 6, minWidth: 140 }}>Subject</Box>
                                        <Box sx={{ flex: 1 / 6, minWidth: 120 }}>Class</Box>
                                        <Box sx={{ flex: 1 / 6, minWidth: 140, textAlign: 'center' }}>Student Count</Box>
                                        <Box sx={{ flex: 1 / 6, minWidth: 140, textAlign: 'center' }}>Given Marks</Box>
                                        <Box sx={{ flex: 1 / 6, minWidth: 140, textAlign: 'center' }}>Submitted</Box>
                                    </Stack>
                                )}

                                {/* Rows (use Stack) */}
                                <Stack spacing={1}>
                                    {rows.map((r, idx) => (
                                        <Paper key={`${r.staffNo}-${r.subject}-${idx}`} variant="outlined" sx={{ p: 1 }}>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Box sx={{ flex: 1 / 6, minWidth: 120 }}>
                                                    <Typography variant="body2">{r.staffNo}</Typography>
                                                </Box>

                                                <Box sx={{ flex: 2 / 6, minWidth: 160 }}>
                                                    <Typography variant="body2">{r.teacher_name ?? "—"}</Typography>
                                                </Box>

                                                <Box sx={{ flex: 1 / 6, minWidth: 140 }}>
                                                    <Typography variant="body2">{r.teacherGrade}</Typography>
                                                </Box>

                                                <Box sx={{ flex: 1 / 6, minWidth: 140 }}>
                                                    <Typography variant="body2">{r.subject}</Typography>
                                                </Box>

                                                <Box sx={{ flex: 1 / 6, minWidth: 120 }}>
                                                    <Typography variant="body2">{r.teacherClass}</Typography>
                                                </Box>

                                                <Box sx={{ flex: 1 / 6, minWidth: 140, textAlign: 'center' }}>
                                                    <Typography variant="body2">{r.student_count}</Typography>
                                                </Box>

                                                <Box sx={{ flex: 1 / 6, minWidth: 140, textAlign: 'center' }}>
                                                    <Typography variant="body2">{r.given_marks_count}</Typography>
                                                </Box>

                                                <Box sx={{ flex: 1 / 6, minWidth: 140, display: 'flex', justifyContent: 'center' }}>
                                                    {r.marks_submitted ? (
                                                        <Chip label="Submitted" color="success" size="small" />
                                                    ) : (
                                                        <Chip label="Pending" color="warning" size="small" />
                                                    )}
                                                </Box>
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