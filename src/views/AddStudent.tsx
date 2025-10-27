import { useState, useEffect, useRef } from "react";

interface GradeOption {
  id: string;
  grade: string;
}

import {
  Box,
  AppBar,
  CssBaseline,
  useTheme,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Typography,
  IconButton,
  Stack,
  CircularProgress,
  Snackbar,
  Alert,
  Checkbox,
} from "@mui/material";
import { Close, Add, Delete } from "@mui/icons-material";

import Sidebar from "../components/Sidebar";
import { useCustomTheme } from "../context/ThemeContext";
import Navbar from "../components/Navbar";
import {
  promoteStudents,
  getAvailableGrades,
  getAvailableClasses,
  fetchClassStudents,
  type Student,
  type PromoteStudentsRequest
} from "../api/studentApi";

import * as XLSX from "xlsx";

const AddStudent = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hovered] = useState(false);
  const theme = useTheme();
  useCustomTheme();

  // Filter states
  const [year, setYear] = useState("");
  const [grade, setGrade] = useState("");
  const [classFilter, setClassFilter] = useState("");

  // Available options
  const YEARS = ["2023", "2024", "2025", "2026", "2027", "2028", "2029", "2030"];
  const [years] = useState<string[]>(YEARS);
  const [grades, setGrades] = useState<(string | GradeOption)[]>([]);
  const [classes, setClasses] = useState<string[]>([]);

  // Students data
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);

  // Current year filter in dialog
  const [currentYearFilter, setCurrentYearFilter] = useState("");
  const [currentGradeFilter, setCurrentGradeFilter] = useState("");
  const [currentClassFilter, setCurrentClassFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Next year details
  const [nextYear, setNextYear] = useState("");
  const [nextGrade, setNextGrade] = useState("");
  const [nextClass, setNextClass] = useState("");

  // Excel upload states
  const [excelUploaded, setExcelUploaded] = useState(false);
  const [uploadedStudents, setUploadedStudents] = useState<Student[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Notification
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" as "success" | "error" });

  // Load available grade options on mount
  useEffect(() => {
    void loadAvailableGrades();
  }, []);

  // Load students when filters change (year, grade, class)
  useEffect(() => {
    if (year && grade && classFilter) {
      void loadStudents();
    } else {
      setStudents([]);
    }
  }, [year, grade, classFilter]);

  // Load classes when grade changes
  useEffect(() => {
    if (grade) {
      const loadClassesForGrade = async () => {
        try {
          const classesData = await getAvailableClasses(grade);
          setClasses(classesData);
        } catch (error) {
          showSnackbar("Failed to load classes", "error");
          setClasses([]); // Clear classes on error
        }
      };
      void loadClassesForGrade();
    } else {
      setClasses([]);
      setClassFilter("");
    }
  }, [grade]);

  // Also add a similar effect for the promotion dialog's next grade
  useEffect(() => {
    if (nextGrade) {
      const loadClassesForNextGrade = async () => {
        try {
          const classesData = await getAvailableClasses(nextGrade);
          setClasses(classesData);
        } catch (error) {
          showSnackbar("Failed to load classes for next grade", "error");
        }
      };
      void loadClassesForNextGrade();
    }
  }, [nextGrade]);

  const loadAvailableGrades = async () => {
    try {
      const gradesData = await getAvailableGrades();
      setGrades(gradesData);
    } catch (error) {
      showSnackbar("Failed to load available grades", "error");
    }
  };

  const loadStudents = async () => {
    if (!year || !grade || !classFilter) return;

    setLoading(true);
    try {
      // Use the new endpoint that returns class students for year/grade/class
      const studentsData = await fetchClassStudents(year, grade, classFilter);
      setStudents(studentsData);
    } catch (error) {
      showSnackbar("Failed to load students", "error");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setDialogOpen(true);
    // Set current filters to match main page filters
    setCurrentYearFilter(year);
    setCurrentGradeFilter(grade);
    setCurrentClassFilter(classFilter);
    setSelectedStudents([]);

  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedStudents([]);
    setSearchTerm("");

  };

  const handleSelectStudent = (student: Student) => {
    // prevent duplicates
    setSelectedStudents(prev => {
      if (prev.some(s => s.id === student.id)) return prev;
      return [...prev, student];
    });
  };

  const handleRemoveStudent = (studentId: string) => {
    setSelectedStudents(prev => prev.filter(s => s.id !== studentId));
  };

  const handlePromoteStudents = async () => {
    if (selectedStudents.length === 0) {
      showSnackbar("Please select at least one student", "error");
      return;
    }

    if (!nextYear || !nextGrade || !nextClass) {
      showSnackbar("Please select next year details", "error");
      return;
    }

    try {
      const request: PromoteStudentsRequest = {
        students: selectedStudents.map(student => ({
          name: student.name,
          studentAdmissionNo: student.admissionNo,
          year: nextYear,
          studentGrade: nextGrade,
          studentClass: nextClass
        }))
      };

      const result = await promoteStudents(request);

      if (result.success) {
        showSnackbar(result.message, "success");
        handleCloseDialog();
        // Refresh the students list for the same filters
        void loadStudents();
        // Also clear the uploaded state after a successful promotion (optional)
        setExcelUploaded(false);
        setUploadedStudents([]);
      } else {
        showSnackbar(result.message, "error");
      }
    } catch (error) {
      showSnackbar("Failed to promote students", "error");
    }
  };

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({ open: true, message, severity });
  };

  // Filter students for current year table (exclude selected ones in dialog)
  const filteredStudents = students.filter(student =>
    (!currentYearFilter || student.year === currentYearFilter) &&
    (!currentGradeFilter || student.grade === currentGradeFilter) &&
    (!currentClassFilter || student.class === currentClassFilter) &&
    (!searchTerm ||
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.admissionNo.toLowerCase().includes(searchTerm.toLowerCase())
    ) &&
    !selectedStudents.some(selected => selected.id === student.id)
  );

  // normalize grade/class values before rendering menu items
  const gradeToValue = (g: any) => {
    if (!g && g !== 0) return "";
    if (typeof g === "string") return g;
    // common shapes: { grade: "Grade 1" } or { id, grade, description, ... }
    return String(g.grade ?? g.name ?? g.value ?? JSON.stringify(g));
  };

  // Dialog display list:
  const dialogDisplayStudents = (excelUploaded ? uploadedStudents : filteredStudents)
    .filter(student => !selectedStudents.some(s => s.id === student.id)) // exclude already selected
    .filter(student =>
      !searchTerm ||
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.admissionNo.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Select all toggle
  const isAllSelected = dialogDisplayStudents.length > 0 && dialogDisplayStudents.every(s => selectedStudents.some(sel => sel.id === s.id));

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      // add all visible ones (avoid duplicates)
      setSelectedStudents(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const toAdd = dialogDisplayStudents.filter(s => !existingIds.has(s.id));
        return [...prev, ...toAdd];
      });
    } else {
      // remove all visible ones from selectedStudents
      setSelectedStudents(prev => prev.filter(s => !dialogDisplayStudents.some(ds => ds.id === s.id)));
    }
  };

  // First, add this function after handleToggleSelectAll
  const handleSelectAllAction = () => {
    // Get all unselected students from the current display list
    const unselectedStudents = dialogDisplayStudents.filter(
      student => !selectedStudents.some(s => s.id === student.id)
    );

    // Add all unselected students to selection
    if (unselectedStudents.length > 0) {
      setSelectedStudents(prev => [...prev, ...unselectedStudents]);
    } else {
      // If all are selected, remove all displayed students from selection
      setSelectedStudents(prev =>
        prev.filter(selected =>
          !dialogDisplayStudents.some(ds => ds.id === selected.id)
        )
      );
    }
  };

  // Excel parsing utilities
  const getCellValue = (row: any, variants: string[]) => {
    for (const v of variants) {
      if (row[v] !== undefined && row[v] !== null) return String(row[v]);
      // also try lowercase / trimmed keys
      const lowerKey = Object.keys(row).find(k => k && k.toLowerCase().replace(/\s+/g, "") === v.toLowerCase().replace(/\s+/g, ""));
      if (lowerKey) return String(row[lowerKey]);
    }
    return "";
  };

  const parseExcelFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      // map rows to Student
      const mapped: Student[] = rawJson.map((row: any, idx: number) => {
        const admissionNo = getCellValue(row, ["admissionNo", "AdmissionNo", "Admission No", "studentAdmissionNo", "student_admission_no"]);
        const name = getCellValue(row, ["name", "Name", "studentName", "student_name"]);
        const gradeVal = getCellValue(row, ["grade", "Grade", "studentGrade", "student_grade"]);
        const classVal = getCellValue(row, ["class", "Class", "studentClass", "student_class"]);
        const medium = getCellValue(row, ["medium", "Medium"]);
        const yearVal = getCellValue(row, ["year", "Year"]);

        return {
          id: String(row.id ?? row.ID ?? admissionNo ?? `uploaded-${idx}`),
          admissionNo: admissionNo || "",
          name: name || "",
          grade: gradeVal || "",
          class: classVal || "",
          medium: medium || "",
          year: yearVal || ""
        } as Student;
      });

      // Filter out completely empty rows
      const cleaned = mapped.filter(m => (m.admissionNo || m.name));

      if (cleaned.length === 0) {
        showSnackbar("No valid student rows found in the uploaded Excel.", "error");
        return;
      }

      setUploadedStudents(cleaned);
      setExcelUploaded(true);
      showSnackbar(`Loaded ${cleaned.length} students from Excel.`, "success");
    } catch (e) {
      console.error(e);
      showSnackbar("Failed to parse Excel file. Make sure it's a valid .xlsx or .xls file.", "error");
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    // basic file type check
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      showSnackbar("Unsupported file format. Upload .xlsx, .xls or .csv", "error");
      return;
    }
    void parseExcelFile(file);
    // reset input so same file can be uploaded again if needed
    e.target.value = "";
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // new: download a sample Excel file with expected headers and one example row
  const downloadSampleExcel = () => {
    try {
      const sample = [
        {
          "Admission No": "A001",
          "Name": "Sunita Suren",
          "Grade": "Grade 1",
          "Class": "A",
          "Medium": "English",
          "Year": "2024"
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(sample, { header: ["Admission No", "Name", "Grade", "Class", "Medium", "Year"] });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
      // triggers browser download
      XLSX.writeFile(workbook, "student_promotion_sample.xlsx");
    } catch (err) {
      console.error("Failed to generate sample Excel", err);
      showSnackbar("Failed to generate sample file", "error");
    }
  };

  const clearUploadedData = () => {
    setExcelUploaded(false);
    setUploadedStudents([]);
  };

  // new: clear the main filter dropdowns and clear the students list
  const clearFilters = () => {
    setYear("");
    setGrade("");
    setClassFilter("");
    // clear currently loaded students (so user knows filters are cleared)
    setStudents([]);
  };

  return (
    <Box sx={{ display: "flex", width: "100vw", height: "100vh", minHeight: "100vh", bgcolor: theme.palette.background.default }}>
      <CssBaseline />
      <Sidebar
        open={sidebarOpen || hovered}
        setOpen={setSidebarOpen}
      />
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <AppBar
          position="static"
          sx={{
            bgcolor: 'background.paper',
            boxShadow: 'none',
            borderBottom: `1px solid ${theme.palette.divider}`,
            zIndex: theme.zIndex.drawer + 1,
            color: theme.palette.text.primary
          }}
        >
          <Navbar
            title="Student Promotion"
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
        </AppBar>

        <Box sx={{ p: 3, flex: 1 }}>
          {/* Header with button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 3 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleOpenDialog}
              sx={{ minWidth: 200 }}
            >
              Add Students to Next Year
            </Button>
          </Box>

          {/* Filter Section */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Filter Students
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
              {/* First dropdown - Left aligned */}
              <Stack sx={{ flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>
                <FormControl
                  sx={{
                    minWidth: 250,
                    maxWidth: 350,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "10px",
                      height: "50px",
                    },
                  }}
                >
                  <InputLabel>Year</InputLabel>
                  <Select
                    value={year}
                    label="Year"
                    onChange={(e) => setYear(e.target.value)}
                  >
                    {years.map((y) => (
                      <MenuItem key={y} value={y}>{y}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              {/* Middle dropdown - Centered */}
              <Stack sx={{ flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>
                <FormControl
                  sx={{
                    minWidth: 250,
                    maxWidth: 350,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "10px",
                      height: "50px",
                    },
                  }}
                >
                  <InputLabel>Grade</InputLabel>
                  <Select
                    value={grade}
                    label="Grade"
                    onChange={(e) => setGrade(e.target.value)}
                  >
                    {grades.map((g) => {
                      const gv = gradeToValue(g);
                      return (
                        <MenuItem key={gv || `grade-${grades.indexOf(g)}`} value={gv}>
                          {gv}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              </Stack>

              {/* Third dropdown - Right aligned */}
              <Stack sx={{ flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>
                <FormControl
                  sx={{
                    minWidth: 250,
                    maxWidth: 350,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "10px",
                      height: "50px",
                    },
                  }}
                >
                  <InputLabel>Class</InputLabel>
                  <Select
                    value={classFilter}
                    label="Class"
                    onChange={(e) => setClassFilter(e.target.value)}
                  >
                    {classes.map((c) => (
                      <MenuItem key={c} value={c}>{c}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              {/* Clear button styled like the dropdown */}
              <Stack sx={{ flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>
                <FormControl
                  sx={{
                    minWidth: 250,
                    maxWidth: 350,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "10px",
                      height: "50px",
                    },
                  }}
                >
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={clearFilters}
                    sx={{
                      borderRadius: "10px",
                      height: "50px",
                      width: "100%",
                      textTransform: "none",
                      fontWeight: 500,
                      fontSize: "1rem",
                      borderWidth: 2,
                      "&:hover": {
                        borderWidth: 2,
                        backgroundColor: "rgba(25, 118, 210, 0.08)", // subtle hover like select
                      },
                    }}
                  >
                    Clear Filters
                  </Button>
                </FormControl>
              </Stack>

            </Stack>
          </Paper>

          {/* Students Table */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Students List
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Admission No</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Grade</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Class</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Medium</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.admissionNo}</TableCell>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.grade}</TableCell>
                        <TableCell>{student.class}</TableCell>
                        <TableCell>{student.medium}</TableCell>
                      </TableRow>
                    ))}
                    {students.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          No students found. Please select filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Box>
      </Box>

      {/* Promotion Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Promote Students to Next Year</Typography>
            <IconButton onClick={handleCloseDialog}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {/* Current Year Details */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6" gutterBottom>
                Current Year Details
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: "none" }}
                  onChange={onFileInputChange}
                />
                <Button variant="outlined" onClick={triggerFileSelect}>
                  Upload Excel
                </Button>

                <Button variant="outlined" onClick={downloadSampleExcel}>
                  Download Sample
                </Button>

                {excelUploaded && (
                  <Button color="error" variant="text" onClick={clearUploadedData}>
                    Clear Upload
                  </Button>
                )}
              </Stack>
            </Box>

            {/* Filters */}
            <Stack direction="row" spacing={2}>
              <Stack sx={{ flex: { xs: '1 1 100%', sm: '1 1 25%' } }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Year</InputLabel>
                  <Select
                    value={currentYearFilter}
                    label="Year"
                    onChange={(e) => setCurrentYearFilter(e.target.value)}
                  >
                    {years.map((y) => (
                      <MenuItem key={y} value={y}>{y}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
              <Stack sx={{ flex: { xs: '1 1 100%', sm: '1 1 33.33%' } }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Grade</InputLabel>
                  <Select
                    value={currentGradeFilter}
                    label="Grade"
                    onChange={(e) => setCurrentGradeFilter(e.target.value)}
                  >
                    {grades.map((g, index) => {
                      const gradeValue = typeof g === 'object' ? g.grade : g;
                      return (
                        <MenuItem
                          key={typeof g === 'object' ? g.id : `grade-${index}-${gradeValue}`}
                          value={gradeValue}
                        >
                          {gradeValue}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              </Stack>
              <Stack sx={{ flex: { xs: '1 1 100%', sm: '1 1 33.33%' } }}>

                <FormControl fullWidth size="small" disabled={!currentGradeFilter}>
                  <InputLabel>Class</InputLabel>
                  <Select
                    value={currentClassFilter}
                    label="Class"
                    onChange={(e) => setCurrentClassFilter(e.target.value)}
                  >
                    {classes.map((c) => (
                      <MenuItem key={c} value={c}>{c}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
              <Stack sx={{ flex: { xs: '1 1 100%', sm: '1 1 33.33%' } }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search Students"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Stack>
            </Stack>

            {/* Students Table */}
            <TableContainer sx={{ maxHeight: 300 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isAllSelected}
                        indeterminate={!isAllSelected && dialogDisplayStudents.length > 0 && dialogDisplayStudents.some(s => selectedStudents.some(sel => sel.id === s.id))}
                        onChange={(e) => handleToggleSelectAll(e.target.checked)}
                        inputProps={{ 'aria-label': 'select all students' }}
                      />
                    </TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Admission No</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleSelectAllAction}
                        sx={{ minWidth: 85 }}
                      >
                        {isAllSelected ? "Unselect All" : "Select All"}
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dialogDisplayStudents.map((student) => {
                    const alreadySelected = selectedStudents.some(s => s.id === student.id);
                    return (
                      <TableRow key={student.id}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={alreadySelected}
                            onChange={(e) => {
                              if (e.target.checked) handleSelectStudent(student);
                              else handleRemoveStudent(student.id);
                            }}
                          />
                        </TableCell>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.admissionNo}</TableCell>
                        <TableCell>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleSelectStudent(student)}
                            disabled={alreadySelected}
                            sx={{ minWidth: 85 }}
                          >
                            {alreadySelected ? "Selected" : "Select"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {dialogDisplayStudents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No students found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Next Year Details */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Next Year Details
            </Typography>

            {/* Next Year Filters */}
            <Stack direction="row" spacing={2}>
              <Stack sx={{ flex: { xs: '1 1 100%', sm: '1 1 33.33%' } }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Next Year</InputLabel>
                  <Select
                    value={nextYear}
                    label="Next Year"
                    onChange={(e) => setNextYear(e.target.value)}
                  >
                    {years.map((y) => (
                      <MenuItem key={y} value={y}>{y}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
              <Stack sx={{ flex: { xs: '1 1 100%', sm: '1 1 33.33%' } }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Next Grade</InputLabel>
                  <Select
                    value={nextGrade}
                    label="Next Grade"
                    onChange={(e) => setNextGrade(e.target.value)}
                  >
                    {grades.map((g, index) => {
                      const gradeValue = typeof g === 'object' ? g.grade : g;
                      return (
                        <MenuItem
                          key={typeof g === 'object' ? g.id : `next-grade-${index}-${gradeValue}`}
                          value={gradeValue}
                        >
                          {gradeValue}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              </Stack>
              <Stack sx={{ flex: { xs: '1 1 100%', sm: '1 1 33.33%' } }}>
                <FormControl fullWidth size="small" disabled={!nextGrade}>
                  <InputLabel>Next Class</InputLabel>
                  <Select
                    value={nextClass}
                    label="Next Class"
                    onChange={(e) => setNextClass(e.target.value)}
                  >
                    {nextGrade ? classes.map((c) => (
                      <MenuItem key={c} value={c}>{c}</MenuItem>
                    )) : []}
                  </Select>
                </FormControl>
              </Stack>
            </Stack>

            {/* Selected Students Table */}
            <Typography variant="subtitle1" gutterBottom>
              Selected Students ({selectedStudents.length})
            </Typography>
            <TableContainer sx={{ maxHeight: 300 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Admission No</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.admissionNo}</TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveStudent(student.id)}
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {selectedStudents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        No students selected
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handlePromoteStudents}
              disabled={selectedStudents.length === 0 || !nextYear || !nextGrade || !nextClass}
            >
              Save Promotion
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AddStudent;