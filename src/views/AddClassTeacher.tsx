import { useState, useEffect } from "react";
import {
  Box,
  AppBar,
  CssBaseline,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton
} from "@mui/material";
import { Search, Close, Add as AddIcon } from "@mui/icons-material";
import Sidebar from "../components/Sidebar";
import { useCustomTheme } from "../context/ThemeContext";
import Navbar from "../components/Navbar";
import { fetchTeachersByGradeAndClass, assignClassTeacher, deleteClassTeacher, getAllClassTeachers, fetchGrades, fetchGradeClasses, type Teacher, type GradeClass } from "../api/teacherApi";

// Note: removed import of global `classOptions` — we'll compute class list per grade from API data

interface ClassTeacherData {
  grade: string;
  classes: {
    className: string;
    teacherId: string;
    teacherName: string;
    staffNo: string;
    isEditing: boolean;
    assignmentId?: number | string; // track backend record id for delete
  }[];
}

interface PopupFormData {
  searchTerm: string;
  selectedGrade: string;
  selectedClass: string;
  teachers: Teacher[];
}

const AddClassTeacher = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hovered] = useState(false);
  const [classTeachers, setClassTeachers] = useState<ClassTeacherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Popup states
  const [popupOpen, setPopupOpen] = useState(false);
  const [currentClass, setCurrentClass] = useState<{grade: string; className: string; teacherId: string} | null>(null);
  const [isNewAssignment, setIsNewAssignment] = useState(false); // new mode vs edit mode
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupFormData, setPopupFormData] = useState<PopupFormData>({
    searchTerm: "",
    selectedGrade: "",
    selectedClass: "",
    teachers: []
  });
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false); // loading flag for delete action

  // New states for grades and classes
  const [allGrades, setAllGrades] = useState<string[]>([]);
  const [allClasses, setAllClasses] = useState<GradeClass[]>([]);

  const theme = useTheme();
  useCustomTheme();

  // Refresh helper to (re)load assignments from server and update state
  const refreshClassTeachers = async () => {
    try {
      setLoading(true);
      const assignments = await getAllClassTeachers();
      const grouped = assignments.reduce<Record<string, ClassTeacherData["classes"]>>((acc, item) => {
        const grade = item.grade || "Unknown";
        if (!acc[grade]) acc[grade] = [];
        acc[grade].push({
          className: item.className,
          teacherId: item.teacherId || "",
          teacherName: item.teacherName || "Not assigned",
          staffNo: item.staffNo || "",
          isEditing: false,
          assignmentId: item.id
        });
        return acc;
      }, {});

      const initialData: ClassTeacherData[] = Object.keys(grouped).map(grade => ({
        grade,
        classes: grouped[grade]
      }));

      setClassTeachers(initialData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load class teachers");
    } finally {
      setLoading(false);
    }
  };

  // Load assignments on mount
  useEffect(() => {
    void refreshClassTeachers();
  }, []);

  // Get all classes across grades (unique)

  // Get classes for a grade (derived from fetched classTeachers)

  // Make handleOpenPopup async so we can prefetch teachers for the selected grade+class (edit mode)
  const handleOpenPopup = async (grade: string, className: string, teacherId: string) => {
    setIsNewAssignment(false);
    setCurrentClass({ grade, className, teacherId });
    setPopupFormData({
      searchTerm: "",
      selectedGrade: grade, 
      selectedClass: className,
      teachers: []
    });
    setSelectedTeacher(null);
    setPopupOpen(true);

    // Pre-fetch teachers for this grade+class so table shows only relevant teachers by default
    try {
      setPopupLoading(true);
      const searchedTeachers = await fetchTeachersByGradeAndClass(grade, className);
      setPopupFormData(prev => ({
        ...prev,
        teachers: searchedTeachers
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search teachers");
    } finally {
      setPopupLoading(false);
    }
  };

  // New assignment opener (no preselected grade/class)
  const handleOpenNew = async () => {
    setIsNewAssignment(true);
    setCurrentClass(null);
    setPopupFormData({
      searchTerm: "",
      selectedGrade: "",
      selectedClass: "",
      teachers: [] // Start with empty teachers list
    });
    setSelectedTeacher(null);
    setPopupOpen(true);

    // Only load grades and classes when opening the form
    await loadGradesAndClasses();
  };

  // Load grades and classes for the form
  const loadGradesAndClasses = async () => {
    try {
      setPopupLoading(true);
      const [grades, classes] = await Promise.all([
        fetchGrades(),
        fetchGradeClasses()
      ]);
      setAllGrades(grades);
      setAllClasses(classes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load grades and classes");
    } finally {
      setPopupLoading(false);
    }
  };

  // Add helper to get classes for selected grade
const getAvailableClasses = (grade: string) => {
  // collect unique class names from API data
  const allUniqueClasses = Array.from(new Set(allClasses.map(c => c.className).filter(Boolean)));

  // If no grade selected, show all classes (makes class dropdown usable even if grades->classes mapping is missing)
  if (!grade) return allUniqueClasses.sort();

  // Try to find classes that have a non-empty grade and match the selected grade (case-insensitive)
  const filtered = allClasses
    .filter(c => c.grade && String(c.grade).toLowerCase() === String(grade).toLowerCase())
    .map(c => c.className)
    .filter(Boolean);

  // If we found classes specifically linked to the grade, return them; otherwise fall back to showing all classes.
  const result = filtered.length ? Array.from(new Set(filtered)) : allUniqueClasses;
  return result.sort();
};

  const handleClosePopup = () => {
    setPopupOpen(false);
    setCurrentClass(null);
    setIsNewAssignment(false);
    setPopupFormData({
      searchTerm: "",
      selectedGrade: "",
      selectedClass: "",
      teachers: []
    });
    setSelectedTeacher(null);
  };

  const handleSearch = async () => {
    try {
      setPopupLoading(true);

      let searchedTeachers: Teacher[] = [];
      
      // Case 1: Both grade and class are selected
      if (popupFormData.selectedGrade && popupFormData.selectedClass) {
        searchedTeachers = await fetchTeachersByGradeAndClass(
          popupFormData.selectedGrade, 
          popupFormData.selectedClass
        );
      }
      // Case 2: Only grade is selected
      else if (popupFormData.selectedGrade) {
        searchedTeachers = await fetchTeachersByGradeAndClass(
          popupFormData.selectedGrade,
          "" // empty class name
        );
      }
      // Case 3: Neither grade nor class is selected (search by term only)
      else if (popupFormData.searchTerm) {
        // Use the search term to filter teachers
        searchedTeachers = await fetchTeachersByGradeAndClass("", "");
      }
      // Case 4: Default - return empty array if no filters
      else {
        searchedTeachers = [];
      }

      setPopupFormData(prev => ({
        ...prev,
        teachers: searchedTeachers
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search teachers");
    } finally {
      setPopupLoading(false);
    }
  };

  // auto-select first class when grade changes (auto-fill Class)
  const onGradeChange = (newGrade: string) => {
    // Update selected grade and clear selected class/teachers
    setPopupFormData(prev => ({
      ...prev,
      selectedGrade: newGrade,
      selectedClass: "",
      teachers: []
    }));

    // No additional action needed here; user can pick class next.
    // For better UX, if you want to auto-fetch teachers for a grade-only selection, you can uncomment the block below.
    /*
    if (newGrade) {
      (async () => {
        try {
          setPopupLoading(true);
          const teachers = await fetchTeachers({ grade: newGrade });
          setPopupFormData(prev => ({ ...prev, teachers }));
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to fetch teachers");
        } finally {
          setPopupLoading(false);
        }
      })();
    }
    */
  };

  // Replace onClassChange with:
const onClassChange = async (newClass: string) => {
  // Read the currently selected grade synchronously (this is the current state, not the value we just set)
  const currentGrade = popupFormData.selectedGrade;

  // Update UI state immediately
  setPopupFormData(prev => ({
    ...prev,
    selectedClass: newClass,
    teachers: []
  }));

  // Only call grade-class specific endpoint when both grade and class are present
  if (currentGrade && newClass) {
    try {
      setPopupLoading(true);
      const teachers = await fetchTeachersByGradeAndClass(currentGrade, newClass);
      setPopupFormData(prev => ({ ...prev, teachers }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch teachers");
    } finally {
      setPopupLoading(false);
    }
  } else {
    // If grade->class mapping not available, you may choose to fetch by class-only or by grade-only.
    // For now we do nothing and let the user click Search (Search will call handleSearch).
  }
};

  const handleSaveAssignment = async () => {
    if (!selectedTeacher) {
      setError("Please select a teacher");
      return;
    }

    const gradeToAssign = currentClass?.grade ?? popupFormData.selectedGrade;
    const classToAssign = currentClass?.className ?? popupFormData.selectedClass;

    if (!gradeToAssign || !classToAssign) {
      setError("Please select both Grade and Class to assign the teacher.");
      return;
    }

    try {
      setPopupLoading(true);
      
      const assignment = {
        // keep the original fields the backend may expect
        grade: gradeToAssign,
        class: classToAssign,
        teacherId: selectedTeacher.id,
        staffNo: selectedTeacher.staffNo,
        teacherName: selectedTeacher.name,

        // add validation fields your backend requires:
        teacherGrade: selectedTeacher.grade || gradeToAssign,
        teacherClass: selectedTeacher.class || classToAssign,
        name: selectedTeacher.name
      };

      const result = await assignClassTeacher(assignment);
      
      if (result.success) {
        // refresh full assignments list from server so UI stays consistent and assignmentIds appear
        await refreshClassTeachers();
        setSuccess(result.message);
        handleClosePopup();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save assignment");
    } finally {
      setPopupLoading(false);
    }
  };

  const handleSave = async (grade: string, className: string) => {
    // This local save just toggles editing; ensure we refresh so other changes are reflected
    const gradeData = classTeachers.find(g => g.grade === grade);
    const classData = gradeData?.classes.find(c => c.className === className);
    
    if (!classData || !classData.teacherId) {
      setError("Please assign a teacher before saving");
      return;
    }

    setClassTeachers(prev => prev.map(g => {
      if (g.grade === grade) {
        return {
          ...g,
          classes: g.classes.map(c => {
            if (c.className === className) {
              return { ...c, isEditing: false };
            }
            return c;
          })
        };
      }
      return g;
    }));

    // refresh to reflect any server-side state changes
    await refreshClassTeachers();
    setSuccess(`Teacher assigned to ${className} successfully`);
  };

  const handleEdit = (grade: string, className: string) => {
    const gradeData = classTeachers.find(g => g.grade === grade);
    const classData = gradeData?.classes.find(c => c.className === className);
    
    if (classData) {
      void handleOpenPopup(grade, className, classData.teacherId);
    }
  };

  // Delete handler
  const handleDelete = async (grade: string, className: string, assignmentId?: number | string) => {
    if (!assignmentId) {
      setError("No assignment ID available to delete.");
      return;
    }

    const confirmed = window.confirm(`Delete class teacher assignment for ${grade} / ${className}?`);
    if (!confirmed) return;

    try {
      setDeleteLoading(true);
      const result = await deleteClassTeacher(assignmentId);
      if (result.success) {
        // refresh assignments so UI stays in sync
        await refreshClassTeachers();
        setSuccess(result.message);
      } else {
        setError(result.message || "Failed to delete assignment");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete assignment");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", width: "100vw", height: "100vh", bgcolor: theme.palette.background.default }}>
        <CssBaseline />
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%" }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  // Compose grade options from the fetched data

  return (
    <Box sx={{ display: "flex", width: "100vw", minHeight: "100vh", bgcolor: theme.palette.background.default }}>
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
            title="Class Teachers Management"
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
        </AppBar>

        <Box sx={{ p: 3, flexGrow: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          {/* Header row with Add New button on right */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Class Teacher Assignments</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenNew}
            >
              Add new teacher
            </Button>
          </Box>

          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: theme.palette.action.hover }}>Grade</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: theme.palette.action.hover }}>Class</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: theme.palette.action.hover }}>Class Teacher | Staff No</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: theme.palette.action.hover }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {classTeachers.map((gradeData, gradeIndex) =>
                  gradeData.classes.map((classData, classIndex) => (
                    <TableRow key={`${gradeIndex}-${classIndex}`}>
                      <TableCell>
                        {classIndex === 0 && (
                          <Typography variant="subtitle1" fontWeight="bold">
                            {gradeData.grade}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{classData.className}</TableCell>
                      <TableCell>
                        <Typography>
                          {classData.teacherName}
                          {classData.staffNo &&  ` (${classData.staffNo})`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleEdit(gradeData.grade, classData.className)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => void handleSave(gradeData.grade, classData.className)}
                            disabled={!classData.teacherId}
                          >
                            Save
                          </Button>

                          {/* Delete button: enabled only if we have an assignmentId */}
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => void handleDelete(gradeData.grade, classData.className, classData.assignmentId)}
                            disabled={!classData.assignmentId || deleteLoading}
                            sx={{ ml: 1 }}
                          >
                            {deleteLoading ? <CircularProgress size={18} /> : "Delete"}
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Popup Dialog */}
        <Dialog 
          open={popupOpen} 
          onClose={handleClosePopup}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">
                {isNewAssignment ? "Assign Class Teacher - New" : `Assign Class Teacher - ${currentClass?.grade} - ${currentClass?.className}`}
              </Typography>
              <IconButton onClick={handleClosePopup}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          
          <DialogContent>
            {/* Search and Filter Section */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, mt: 2 }}>
              <TextField
                placeholder="Search teachers by name or staff no..."
                value={popupFormData.searchTerm}
                onChange={(e) => setPopupFormData(prev => ({
                  ...prev,
                  searchTerm: e.target.value
                }))}
                sx={{ flex: 1 }}
                size="small"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
              
              {/* Grade Dropdown */}
              <FormControl sx={{ minWidth: 160 }} size="small">
                <InputLabel>Grade</InputLabel>
                <Select
                  value={popupFormData.selectedGrade}
                  label="Grade"
                  onChange={(e) => onGradeChange(e.target.value as string)}
                >
                  <MenuItem value="">All Grades</MenuItem>
                  {allGrades.map((grade) => (
                    <MenuItem key={`grade-${grade}`} value={grade}>
                      {grade}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Class Dropdown */}
              <FormControl sx={{ minWidth: 160 }} size="small">
                <InputLabel>Class</InputLabel>
                <Select
                  value={popupFormData.selectedClass}
                  label="Class"
                  onChange={(e) => onClassChange(e.target.value as string)}
                  disabled={!popupFormData.selectedGrade} // Disable if no grade selected
                >
                  <MenuItem value="">Select Class</MenuItem>
                  {getAvailableClasses(popupFormData.selectedGrade).map((cls) => (
                    <MenuItem key={`class-${cls}`} value={cls}>
                      {cls}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Button 
                variant="contained" 
                onClick={handleSearch}
                startIcon={<Search />}
                disabled={popupLoading}
              >
                Search
              </Button>
            </Box>

            {/* Teachers Table */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Staff No</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Grade</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Class</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {popupFormData.teachers.map((teacher, tIdx) => (
                    <TableRow 
                      key={teacher.id || `teacher-${tIdx}`}
                      onClick={() => setSelectedTeacher(teacher)}
                      sx={{ 
                        cursor: 'pointer',
                        backgroundColor: selectedTeacher?.id === teacher.id ? theme.palette.action.selected : 'inherit',
                        '&:hover': { backgroundColor: theme.palette.action.hover }
                      }}
                    >
                      <TableCell>{teacher.staffNo  || 'Not assigned'}</TableCell>
                      <TableCell>{teacher.name}</TableCell>
                      <TableCell>{teacher.grade || 'Not assigned'}</TableCell>
                      <TableCell>{teacher.class || 'Not assigned'}</TableCell>
                    </TableRow>
                  ))}
                  {popupFormData.teachers.length === 0 && !popupLoading && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography color="textSecondary">
                          No teachers found. Try searching with different criteria.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {popupLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <CircularProgress />
              </Box>
            )}

            {/* Selected Teacher Preview */}
            {selectedTeacher && (
              <Box sx={{ mt: 3, p: 2, bgcolor: theme.palette.success.light, borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Selected Teacher:
                </Typography>
                <Typography>
                  <strong>Name:</strong> {selectedTeacher.name}
                </Typography>
                <Typography>
                  <strong>Staff No:</strong> {selectedTeacher.staffNo}
                </Typography>
                <Typography>
                  <strong>Current Grade:</strong> {selectedTeacher.grade || 'Not assigned'}
                </Typography>
                <Typography>
                  <strong>Current Class:</strong> {selectedTeacher.class || 'Not assigned'}
                </Typography>
              </Box>
            )}
          </DialogContent>

          <DialogActions>
            <Button onClick={handleClosePopup} disabled={popupLoading}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveAssignment} 
              variant="contained"
              disabled={popupLoading || !selectedTeacher || !(popupFormData.selectedGrade || currentClass?.grade) || !(popupFormData.selectedClass || currentClass?.className)}
            >
              {popupLoading ? <CircularProgress size={24} /> : "Assign Teacher"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default AddClassTeacher;