// src/components/UserProfile.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  AppBar,
  Typography,
  Button,
  TextField,
  Dialog as MuiDialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CssBaseline,
  CircularProgress,
  Snackbar,
  Alert,
  useTheme,
  Avatar,
  Paper,
  Skeleton,
  Stack,
} from "@mui/material";
import { Edit as EditIcon, PhotoCamera, Refresh } from "@mui/icons-material";
import Sidebar from "../components/Sidebar";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCustomTheme } from "../context/ThemeContext";
import Navbar from "../components/Navbar";
import {
  fetchUserProfile,
  updateUserProfile,
  uploadUserPhoto,
  checkAuthStatus,
  updateUserProfileDetails,
} from "../api/userProfileApi";
import type { User, TeacherData, ParentData, StudentData, TeacherInfo } from "../types/userTypes";

// Custom Dialog component with proper focus management
const Dialog: React.FC<{
  children: React.ReactNode;
  onClose: () => void;
  open: boolean;
  [key: string]: any;
}> = ({ children, onClose, open, ...props }) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && dialogRef.current) {
      // Small delay to ensure the dialog is fully rendered
      setTimeout(() => {
        const focusableElements = dialogRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements && focusableElements.length > 0) {
          (focusableElements[0] as HTMLElement).focus();
        }
      }, 50);
    }
  }, [open]);

  return (
    <MuiDialog ref={dialogRef} open={open} onClose={onClose} {...props}>
      {children}
    </MuiDialog>
  );
};

const defaultUser: User = {
  id: 0,
  name: "",
  address: "",
  password: "********",
  birthDay: "",
  email: "",
  userType: "",
  gender: "",
  userRole: "",
  username: "",
  location: "",
  grade: "",
  contact: "",
  photo: "",
  subject: "",
  class: "",
  teacher_data: null,
  parent_data: null,
  student_data: null,
};

const UserProfile: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hovered] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openPhoto, setOpenPhoto] = useState(false);
  const [openOther, setOpenOther] = useState(false);
  const [editUser, setEditUser] = useState<User>(defaultUser);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });
  const [validationErrors, setValidationErrors] = useState<
    Partial<Record<keyof User, string>>
  >({});

  // New local state for editable "other profile data"
  const [editingTeacher, setEditingTeacher] = useState(false);
  const [editingParent, setEditingParent] = useState(false);
  const [editingStudent, setEditingStudent] = useState(false);

  const [localTeacherData, setLocalTeacherData] = useState<TeacherData | null>(null);
  const [localParentData, setLocalParentData] = useState<ParentData[]>([]);
  const [localStudentData, setLocalStudentData] = useState<StudentData | null>(null);

  const theme = useTheme();
  useCustomTheme();
  const queryClient = useQueryClient();

  // Check authentication status on component mount
  useEffect(() => {
    if (!checkAuthStatus()) {
      showSnackbar("Please login to view your profile", "warning");
    }
  }, []);

  const { data: user, isLoading: isDataLoading, isError, error, refetch } = useQuery<User>({
    queryKey: ["user-profile"],
    queryFn: fetchUserProfile,
    retry: (failureCount, error) => {
      if (error.message.includes("login") || error.message.includes("Session expired")) {
        return false;
      }
      return failureCount < 2;
    },
  });

  useEffect(() => {
    if (user) {
      setEditUser(user);
      const errors = Object.keys(defaultUser).reduce((acc, key) => {
        acc[key as keyof User] = "";
        return acc;
      }, {} as Partial<Record<keyof User, string>>);
      setValidationErrors(errors);
    }
  }, [user]);

  // Initialize local editable data when Other dialog opens
  useEffect(() => {
    if (openOther && user) {
      setLocalTeacherData(user.teacher_data ? JSON.parse(JSON.stringify(user.teacher_data)) : null);
      setLocalParentData(
        user.parent_data 
          ? Array.isArray(user.parent_data) 
            ? JSON.parse(JSON.stringify(user.parent_data))
            : [JSON.parse(JSON.stringify(user.parent_data))]
          : []
      );
      setLocalStudentData(user.student_data ? JSON.parse(JSON.stringify(user.student_data)) : null);

      setEditingTeacher(false);
      setEditingParent(false);
      setEditingStudent(false);
    }
  }, [openOther, user]);

  // Handle query errors
  useEffect(() => {
    if (isError && error) {
      const isAuthError = error.message.includes("login") || error.message.includes("Session expired");
      showSnackbar(error.message, isAuthError ? "warning" : "error");
    }
  }, [isError, error]);

  const updateProfileMutation = useMutation({
    mutationFn: ({ id, user }: { id: number; user: Partial<User> }) => updateUserProfile(id, user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      setOpenEdit(false);
      showSnackbar("Profile updated successfully!", "success");
    },
    onError: (error: any) => {
      const isAuthError = error.message.includes("login") || error.message.includes("Session expired");
      showSnackbar(error.message || "Failed to update profile", isAuthError ? "warning" : "error");
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: (file: File) => uploadUserPhoto(file),
    onSuccess: (photoUrl) => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      setEditUser((prev) => ({ ...prev, photo: photoUrl }));
      setOpenPhoto(false);
      showSnackbar("Photo uploaded successfully!", "success");
    },
    onError: (error: any) => {
      const isAuthError = error.message.includes("login") || error.message.includes("Session expired");
      showSnackbar(error.message || "Failed to upload photo", isAuthError ? "warning" : "error");
    },
  });

  // Mutation for other profile details (teacher/parent/student nested data)
  const otherProfileMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, any> }) =>
      updateUserProfileDetails(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      showSnackbar("Profile details updated successfully!!", "success");
      // after successful save, stop editing
      setEditingTeacher(false);
      setEditingParent(false);
      setEditingStudent(false);
    },
    onError: (error: any) => {
      const msg = error?.message || "Failed to update profile details";
      const isAuth = msg.includes("login") || msg.includes("Session expired");
      showSnackbar(msg, isAuth ? "warning" : "error");
    },
  });

  const showSnackbar = (message: string, severity: "success" | "error" | "warning" | "info") => {
    setSnackbar({ open: true, message, severity });
  };

  const validateField = (name: keyof User, value: string) => {
    let error = "";
    switch (name) {
      case "name":
        if (!value.trim()) error = "Name is required";
        else if (value.trim().length < 2) error = "Name must be at least 2 characters";
        break;
      case "username":
        if (!value.trim()) error = "Username is required";
        else if (!/^[a-zA-Z0-9_]+$/.test(value)) error = "Username can only contain letters, numbers, and underscores";
        else if (value.length < 3) error = "Username must be at least 3 characters";
        break;
      case "email":
        if (!value.trim()) error = "Email is required";
        else if (!/^\S+@\S+\.\S+$/.test(value)) error = "Please enter a valid email address";
        break;
      case "contact":
        if (!value.trim()) error = "Contact is required";
        else if (!/^\+?[0-9]{10,15}$/.test(value.replace(/\s|-/g, ""))) error = "Please enter a valid phone number (10-15 digits)";
        break;
      case "address":
        if (!value.trim()) error = "Address is required";
        else if (value.trim().length < 2) error = "Address must be at least 2 characters";
        break;
      case "birthDay":
        if (!value.trim()) error = "Birthday is required";
        else {
          const birthDate = new Date(value);
          const today = new Date();
          if (birthDate >= today) error = "Birthday must be in the past";
        }
        break;
    }
    setValidationErrors((prev) => ({ ...prev, [name]: error }));
    return !error;
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditUser((prev) => ({ ...prev, [name]: value }));
    validateField(name as keyof User, value);
  };

  const validateAllFields = () => {
    const requiredFields = ["name", "username", "email", "contact", "grade", "address", "birthDay", "location"];
    return requiredFields.every((field) => validateField(field as keyof User, editUser[field as keyof User] as string));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];

      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        showSnackbar("Please upload an image file (JPEG, PNG, GIF, or WebP)", "error");
        return;
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        showSnackbar("File is too large. Please upload an image smaller than 5MB", "error");
        return;
      }

      await uploadPhotoMutation.mutateAsync(file);
    }
  };

  const handleSaveEdit = async () => {
    if (!validateAllFields()) {
      showSnackbar("Please fix all validation errors before saving", "error");
      return;
    }

    if (!checkAuthStatus()) {
      showSnackbar("Please login to update your profile", "warning");
      return;
    }

    try {
      const { photo, ...userData } = editUser;
      await updateProfileMutation.mutateAsync({ id: editUser.id, user: userData });
    } catch (error) {
      console.error("Update error:", error);
    }
  };

  const handleRefresh = () => {
    if (checkAuthStatus()) {
      refetch();
      showSnackbar("Refreshing profile data...", "info");
    } else {
      showSnackbar("Please login to refresh data", "warning");
    }
  };

  const isMutating = updateProfileMutation.isPending || uploadPhotoMutation.isPending || otherProfileMutation.isPending;

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
      {[...Array(13)].map((_, i) => (
        <Skeleton key={i} variant="text" height={24} />
      ))}
    </Box>
  );

  // CRITICAL FIX: Handle teacher data structure properly
  const getTeacherInfoArray = (teacherData: TeacherData | null | undefined): TeacherInfo[] => {
    if (!teacherData) return [];
    
    // Handle both old array format and new object format with teacher_info array
    if (Array.isArray(teacherData)) {
      return teacherData as any; // Legacy format
    } else if (teacherData.teacher_info && Array.isArray(teacherData.teacher_info)) {
      return teacherData.teacher_info;
    } else if (teacherData.id) {
      // Single teacher info object - convert to array
      return [teacherData as any];
    }
    
    return [];
  };

  // Editable handlers for teacher data
  const handleTeacherFieldChange = (index: number, field: keyof TeacherInfo, value: any) => {
    setLocalTeacherData((prev) => {
      // parse a deep copy safely and type it
      const copy = prev ? (JSON.parse(JSON.stringify(prev)) as TeacherData) : ({ teacher_info: [] } as TeacherData);

      const teacherInfoArray = getTeacherInfoArray(copy);

      if (!teacherInfoArray[index]) {
        teacherInfoArray[index] = {} as TeacherInfo;
      }

      // field is a known key, but the runtime object may be a plain object - cast only where needed
      (teacherInfoArray[index] as any)[field] = value;
      copy.teacher_info = teacherInfoArray;
      return copy;
    });
  };

  const addTeacherRow = () => {
    setLocalTeacherData((prev) => {
      const copy = prev ? (JSON.parse(JSON.stringify(prev)) as TeacherData) : ({ teacher_info: [] } as TeacherData);
      const teacherInfoArray = getTeacherInfoArray(copy);
      teacherInfoArray.push({} as TeacherInfo);
      copy.teacher_info = teacherInfoArray;
      return copy;
    });
  };

  const removeTeacherRow = (index: number) => {
    setLocalTeacherData((prev) => {
      if (!prev) return prev;
      const copy = (JSON.parse(JSON.stringify(prev)) as TeacherData);
      const teacherInfoArray = getTeacherInfoArray(copy);
      if (teacherInfoArray.length > index) {
        teacherInfoArray.splice(index, 1);
        copy.teacher_info = teacherInfoArray;
      }
      return copy;
    });
  };

  const handleParentFieldChange = (fieldPath: string, value: any) => {
    setLocalParentData((prev) => {
      const copy = prev ? JSON.parse(JSON.stringify(prev)) : [];
      
      const [parentIndex, ...path] = fieldPath.split('.');
      const pIndex = parseInt(parentIndex, 10);
      
      if (!copy[pIndex]) {
        copy[pIndex] = { parent_info: {}, students_info: [] };
      }
      
      let target = copy[pIndex];
      let current = target;
      
      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (key === 'students_info') {
          const studentIndex = parseInt(path[i + 1], 10);
          if (!current.students_info[studentIndex]) {
            current.students_info[studentIndex] = {
              name: null,
              studentAdmissionNo: '',
              grade: '',
              class: null
            };
          }
          current = current.students_info[studentIndex];
          i++; // Skip the next index since we've handled it
        } else {
          if (!current[key]) current[key] = {};
          current = current[key];
        }
      }
      
      const lastKey = path[path.length - 1];
      current[lastKey] = value;
      
      return copy;
    });
  };

  const handleStudentFieldChange = (field: keyof StudentData, value: any) => {
    setLocalStudentData((prev) => {
      const copy = prev ? (JSON.parse(JSON.stringify(prev)) as StudentData) : ({} as StudentData);
      // single-field assignment, cast only here to keep types elsewhere
      (copy as any)[field] = value;
      return copy;
    });
  };

  /**
   * Build a full payload for /api/user/{id}/profile-update by merging
   * top-level required fields from the current user with only the nested changes.
   * This avoids server validation errors when backend expects required top-level fields.
   */
  const buildFullPayload = (user: User, changes: Record<string, any>) => {
    // top-level fields the backend validates as required
    const requiredTopLevel = [
      "name",
      "address",
      "email",
      "contact",
      "userType",
      "gender",
      "username",
    ];

    // include a few commonly used optional fields to be safe
    const optionalTopLevel = [
      "birthDay",
      "location",
      "userRole",
      "grade",
      "photo",
      "subject",
      "class",
    ];

    const base: Record<string, any> = {};

    requiredTopLevel.forEach((k) => {
      base[k] = (user as any)[k] ?? "";
    });

    optionalTopLevel.forEach((k) => {
      if ((user as any)[k] !== undefined) base[k] = (user as any)[k];
    });

    // merge nested changes (teacher_data/parent_data/student_data) on top
    const merged = { ...base, ...changes };

    // ensure we don't send unintended 'access' or other admin-only fields
    if (merged.access) {
      delete merged.access;
    }

    return merged;
  };

  const handleSaveOther = async () => {
    if (!user) {
      showSnackbar("User data not loaded", "error");
      return;
    }

    const changes: Record<string, any> = {};

    if (editingTeacher && localTeacherData) {
      changes.teacher_data = localTeacherData;
    }
    if (editingParent && localParentData) {
      changes.parent_data = localParentData;
    }
    if (editingStudent && localStudentData) {
      changes.student_data = localStudentData;
    }

    if (Object.keys(changes).length === 0) {
      showSnackbar("No changes to save", "info");
      return;
    }

    // Build a full payload including required top-level fields from current user
    const payloadToSend = buildFullPayload(user, changes);

    try {
      await otherProfileMutation.mutateAsync({ id: user.id, payload: payloadToSend });
      // onSuccess handles invalidation and UI feedback
    } catch (err) {
      console.error("Failed to save other profile data", err);
      // error handling already in mutation onError, but keep a fallback message
      showSnackbar("Failed to save profile details", "error");
    }
  };

  const handleCancelOtherEdit = () => {
    // revert to last fetched user data
    setLocalTeacherData(user?.teacher_data ? JSON.parse(JSON.stringify(user.teacher_data)) : null);
    setLocalParentData(user?.parent_data ? JSON.parse(JSON.stringify(user.parent_data)) : []);
    setLocalStudentData(user?.student_data ? JSON.parse(JSON.stringify(user.student_data)) : null);
    setEditingTeacher(false);
    setEditingParent(false);
    setEditingStudent(false);
  };

  // CRITICAL FIX: Updated renderTeacherEditable function
  const renderTeacherEditable = (teacherData: TeacherData | undefined | null) => {
    const dataToRender = editingTeacher ? localTeacherData : teacherData;
    const teacherInfoArray = getTeacherInfoArray(dataToRender);
    
    if (!teacherInfoArray || teacherInfoArray.length === 0) {
      return (
        <Stack spacing={2}>
          <Typography>No teacher profile data available.</Typography>
          {editingTeacher && (
            <Button variant="outlined" onClick={addTeacherRow} disabled={isMutating}>
              Add Teacher Entry
            </Button>
          )}
        </Stack>
      );
    }

    return (
      <Stack spacing={2}>
        {teacherInfoArray.map((t, idx) => (
          <Paper key={t.id ?? `t-${idx}`} variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                {editingTeacher ? (
                  <>
                    <TextField
                      label="Subject"
                      value={t.subject || ""}
                      onChange={(e) => handleTeacherFieldChange(idx, "subject", e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Staff No"
                      value={t.staffNo || ""}
                      onChange={(e) => handleTeacherFieldChange(idx, "staffNo", e.target.value)}
                      fullWidth
                    />
                  </>
                ) : (
                  <>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {t.subject || "No Subject"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Staff No: {t.staffNo || "-"}
                    </Typography>
                  </>
                )}
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems="center">
                {editingTeacher ? (
                  <>
                    <TextField
                      label="Grade"
                      value={t.teacherGrade || ""}
                      onChange={(e) => handleTeacherFieldChange(idx, "teacherGrade", e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Class"
                      value={t.teacherClass || ""}
                      onChange={(e) => handleTeacherFieldChange(idx, "teacherClass", e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Medium"
                      value={t.medium || ""}
                      onChange={(e) => handleTeacherFieldChange(idx, "medium", e.target.value)}
                      fullWidth
                    />
                  </>
                ) : (
                  <>
                    <Typography variant="body2"><strong>Grade:</strong> {t.teacherGrade || "-"}</Typography>
                    <Typography variant="body2"><strong>Class:</strong> {t.teacherClass || "-"}</Typography>
                    <Typography variant="body2"><strong>Medium:</strong> {t.medium || "-"}</Typography>
                  </>
                )}

                {editingTeacher && (
                  <Box>
                    <Button color="error" onClick={() => removeTeacherRow(idx)} disabled={isMutating}>
                      Remove
                    </Button>
                  </Box>
                )}
              </Stack>
            </Stack>
          </Paper>
        ))}
        {editingTeacher && (
          <Button variant="outlined" onClick={addTeacherRow} disabled={isMutating}>
            Add Teacher Entry
          </Button>
        )}
      </Stack>
    );
  };

  const renderParentEditable = (parentData: ParentData[] | undefined | null) => {
    // Handle both edit mode and view mode data consistently
    const data = editingParent 
      ? localParentData 
      : (Array.isArray(parentData) 
          ? parentData 
          : parentData 
            ? [parentData] 
            : []);
    
    if (!data || data.length === 0) {
      return <Typography>No parent profile data available.</Typography>;
    }

    return (
      <Stack spacing={3}>
        {data.map((parentEntry, parentIndex) => (
          <Stack key={parentEntry.parent_info?.id || parentIndex} spacing={2}>
            {/* Parent Information Card */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={2}>
                <Typography variant="h6" gutterBottom>
                  Parent Information #{parentIndex + 1}
                </Typography>
                
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {editingParent ? (
                      <>
                        <TextField
                          fullWidth
                          label="Profession"
                          value={parentEntry.parent_info?.profession || ''}
                          disabled={!editingParent}
                          onChange={(e) => handleParentFieldChange(`${parentIndex}.parent_info.profession`, e.target.value)}
                        />
                        
                        <TextField
                          fullWidth
                          label="Relation"
                          value={parentEntry.parent_info?.relation || ''}
                          disabled={!editingParent}
                          onChange={(e) => handleParentFieldChange(`${parentIndex}.parent_info.relation`, e.target.value)}
                        />
                        
                        <TextField
                          fullWidth
                          label="Contact"
                          value={parentEntry.parent_info?.parent_contact || ''}
                          disabled={!editingParent}
                          onChange={(e) => handleParentFieldChange(`${parentIndex}.parent_info.parent_contact`, e.target.value)}
                        />
                      </>
                    ) : (
                      // View mode - display as text
                      <>
                        <Typography><strong>Profession:</strong> {parentEntry.parent_info?.profession || '-'}</Typography>
                        <Typography><strong>Relation:</strong> {parentEntry.parent_info?.relation || '-'}</Typography>
                        <Typography><strong>Contact:</strong> {parentEntry.parent_info?.parent_contact || '-'}</Typography>
                      </>
                    )}
                  </Box>
                </Stack>
              </Stack>
            </Paper>

            {/* Students Information Card */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={2}>
                <Typography variant="h6" gutterBottom>
                  Associated Students
                </Typography>
                
                {parentEntry.students_info?.map((student, studentIndex) => (
                  <Stack 
                    key={student.studentAdmissionNo || studentIndex} 
                    spacing={2}
                    sx={{ 
                      p: 2, 
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1
                    }}
                  >
                    <Typography variant="subtitle1">
                      Student #{studentIndex + 1}
                    </Typography>
                    
                    {editingParent ? (
                      // Edit mode - show text fields
                      <>
                        <TextField
                          fullWidth
                          label="Name"
                          value={student.name || ''}
                          disabled={!editingParent}
                          onChange={(e) => handleParentFieldChange(
                            `${parentIndex}.students_info.${studentIndex}.name`,
                            e.target.value
                          )}
                        />
                        
                        <TextField
                          fullWidth
                          label="Admission No"
                          value={student.studentAdmissionNo || ''}
                          disabled={!editingParent}
                          onChange={(e) => handleParentFieldChange(
                            `${parentIndex}.students_info.${studentIndex}.studentAdmissionNo`,
                            e.target.value
                          )}
                        />
                        
                        <TextField
                          fullWidth
                          label="Grade"
                          value={student.grade || ''}
                          disabled={!editingParent}
                          onChange={(e) => handleParentFieldChange(
                            `${parentIndex}.students_info.${studentIndex}.grade`,
                            e.target.value
                          )}
                        />
                        
                        <TextField
                          fullWidth
                          label="Class"
                          value={student.class || ''}
                          disabled={!editingParent}
                          onChange={(e) => handleParentFieldChange(
                            `${parentIndex}.students_info.${studentIndex}.class`,
                            e.target.value
                          )}
                        />
                      </>
                    ) : (
                      // View mode - display as text
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography><strong>Name:</strong> {student.name || '-'}</Typography>
                        <Typography><strong>Admission No:</strong> {student.studentAdmissionNo || '-'}</Typography>
                        <Typography><strong>Grade:</strong> {student.grade || '-'}</Typography>
                        <Typography><strong>Class:</strong> {student.class || '-'}</Typography>
                      </Box>
                    )}
                  </Stack>
                ))}
              </Stack>
            </Paper>
          </Stack>
        ))}
      </Stack>
    );
  };

  const renderStudentEditable = (studentData: StudentData | undefined | null) => {
    const s = editingStudent ? localStudentData : studentData;
    if (!s) {
      return <Typography>No student profile data available.</Typography>;
    }

    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle1" fontWeight={600}>Student Details</Typography>
          {editingStudent ? (
            <Stack spacing={2}>
              <TextField label="Admission No" value={s.studentAdmissionNo || ""} onChange={(e) => handleStudentFieldChange("studentAdmissionNo", e.target.value)} fullWidth />
              <TextField label="Grade" value={s.studentGrade || ""} onChange={(e) => handleStudentFieldChange("studentGrade", e.target.value)} fullWidth />
              <TextField label="Class" value={s.studentClass || ""} onChange={(e) => handleStudentFieldChange("studentClass", e.target.value)} fullWidth />
              <TextField label="Medium" value={s.medium || ""} onChange={(e) => handleStudentFieldChange("medium", e.target.value)} fullWidth />
              <TextField label="Year" value={s.year || ""} onChange={(e) => handleStudentFieldChange("year", e.target.value)} fullWidth />
            </Stack>
          ) : (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between">
              <Stack spacing={0.5}>
                <Typography variant="body2"><strong>Admission No:</strong> {s.studentAdmissionNo || "-"}</Typography>
                <Typography variant="body2"><strong>Grade:</strong> {s.studentGrade || "-"}</Typography>
                <Typography variant="body2"><strong>Class:</strong> {s.studentClass || "-"}</Typography>
                <Typography variant="body2"><strong>Medium:</strong> {s.medium || "-"}</Typography>
              </Stack>
              <Stack spacing={0.5} alignItems="flex-end">
                <Typography variant="body2"><strong>Year:</strong> {s.year || "-"}</Typography>
                <Typography variant="body2"><strong>Updated By:</strong> {s.modifiedBy || "-"}</Typography>
              </Stack>
            </Stack>
          )}
        </Stack>
      </Paper>
    );
  };

  return (
    <Box sx={{ display: "flex", width: "100vw", height: "100vh", minHeight: "100vh" }}>
      <CssBaseline />
      <Sidebar open={sidebarOpen || hovered} setOpen={setSidebarOpen} />
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <AppBar
          position="static"
          sx={{
            bgcolor: theme.palette.background.paper,
            boxShadow: "none",
            borderBottom: `1px solid ${theme.palette.divider}`,
            color: theme.palette.text.primary,
          }}
        >
          <Navbar title="User Profile" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        </AppBar>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Paper
            elevation={3}
            sx={{
              bgcolor: theme.palette.background.paper,
              p: 4,
              borderRadius: 3,
              maxWidth: 900,
              mx: "auto",
              mt: 4,
              mb: 4,
            }}
          >
            {/* Profile Header */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                <Avatar src={user?.photo || "/default-avatar.png"} sx={{ width: 100, height: 100, border: `3px solid ${theme.palette.primary.main}` }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    {isDataLoading ? <Skeleton width={200} /> : user?.name || "Unknown User"}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {isDataLoading ? <Skeleton width={150} /> : user?.userRole || "No Role"}
                  </Typography>
                  <Button variant="outlined" startIcon={<PhotoCamera />} onClick={() => setOpenPhoto(true)} disabled={isMutating} sx={{ mt: 1 }}>
                    Change Photo
                  </Button>
                </Box>
              </Box>

              <Button variant="outlined" onClick={handleRefresh} disabled={isDataLoading || isMutating} startIcon={<Refresh />}>
                Refresh
              </Button>
            </Box>

            {/* Error State */}
            {isError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error?.message || "Failed to load profile data"}
              </Alert>
            )}

            {/* User Information */}
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Personal Information
            </Typography>

            {isDataLoading ? (
              <LoadingSkeleton />
            ) : (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                <Typography><strong>Name:</strong> {user?.name || "-"}</Typography>
                <Typography><strong>Username:</strong> {user?.username || "-"}</Typography>
                <Typography><strong>Email:</strong> {user?.email || "-"}</Typography>
                <Typography><strong>Contact:</strong> {user?.contact || "-"}</Typography>
                <Typography><strong>Address:</strong> {user?.address || "-"}</Typography>
                <Typography><strong>Birthday:</strong> {user?.birthDay || "-"}</Typography>
                <Typography><strong>User Type:</strong> {user?.userType || "-"}</Typography>
                <Typography><strong>Gender:</strong> {user?.gender || "-"}</Typography>
                <Typography><strong>User Role:</strong> {user?.userRole || "-"}</Typography>
                <Typography><strong>Location:</strong> {user?.location || "-"}</Typography>
                {user?.status !== undefined && <Typography><strong>Status:</strong> {user.status ? "Active" : "Inactive"}</Typography>}
              </Box>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: "flex", gap: 2, mt: 4, justifyContent: "flex-end" }}>
              <Button variant="outlined" onClick={() => setOpenOther(true)} disabled={isMutating || isDataLoading || !user} sx={{ minWidth: 160 }}>
                Other Profile Data
              </Button>

              <Button variant="contained" startIcon={<EditIcon />} onClick={() => setOpenEdit(true)} disabled={isMutating || isDataLoading || !user} sx={{ minWidth: 120 }}>
                Edit Profile
              </Button>
            </Box>
          </Paper>
        </motion.div>

        {/* Edit Dialog - Using custom Dialog component */}
        <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="md" fullWidth aria-labelledby="edit-profile-title" sx={{ "& .MuiDialog-paper": { borderRadius: 2 } }}>
          <DialogTitle id="edit-profile-title" sx={{ pb: 1 }}>
            <Typography variant="h6" fontWeight="bold">Edit Profile Information</Typography>
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
              <TextField fullWidth label="Name" name="name" value={editUser.name} onChange={handleEditChange} error={!!validationErrors.name} helperText={validationErrors.name} required />
              <TextField fullWidth label="Username" name="username" value={editUser.username} onChange={handleEditChange} error={!!validationErrors.username} helperText={validationErrors.username} required />
              <TextField fullWidth label="Email" name="email" type="email" value={editUser.email} onChange={handleEditChange} error={!!validationErrors.email} helperText={validationErrors.email} required />
              <TextField fullWidth label="Contact" name="contact" value={editUser.contact} onChange={handleEditChange} error={!!validationErrors.contact} helperText={validationErrors.contact} required />
              <TextField fullWidth label="Address" name="address" multiline rows={2} value={editUser.address} onChange={handleEditChange} error={!!validationErrors.address} helperText={validationErrors.address} required sx={{ gridColumn: { md: "1 / -1" } }} />
              <TextField fullWidth label="Birthday" name="birthDay" type="date" value={editUser.birthDay} onChange={handleEditChange} error={!!validationErrors.birthDay} helperText={validationErrors.birthDay} InputLabelProps={{ shrink: true }} required />
              <TextField fullWidth label="Location" name="location" value={editUser.location} onChange={handleEditChange} error={!!validationErrors.location} helperText={validationErrors.location} required />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenEdit(false)} disabled={isMutating}>Cancel</Button>
            <Button onClick={handleSaveEdit} variant="contained" disabled={isMutating} startIcon={isMutating ? <CircularProgress size={20} color="inherit" /> : null}>
              {isMutating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Photo Dialog */}
        <Dialog open={openPhoto} onClose={() => setOpenPhoto(false)} aria-labelledby="photo-upload-title">
          <DialogTitle id="photo-upload-title">Upload New Photo</DialogTitle>
          <DialogContent>
            <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={isMutating} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenPhoto(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>

        {/* Other Profile Data Dialog */}
        <Dialog open={openOther} onClose={() => setOpenOther(false)} maxWidth="md" fullWidth aria-labelledby="other-profile-title">
          <DialogTitle id="other-profile-title">
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography>Other Profile Data</Typography>
              {/* <Stack direction="row" spacing={1}>
                {!editingTeacher && !editingParent && !editingStudent ? (
                  // Show a single Edit button that toggles editing for sections that exist
                  // <Button
                  //   onClick={() => {
                  //     // enable editing only for sections that exist in data
                  //     if (localTeacherData) setEditingTeacher(true);
                  //     if (localParentData) setEditingParent(true);
                  //     if (localStudentData) setEditingStudent(true);
                  //     // if none exist, allow user to add teacher row (useful in some flows)
                  //     if (!localTeacherData && !localParentData && !localStudentData) {
                  //       setEditingTeacher(true);
                  //       setLocalTeacherData({ teacher_info: [] });
                  //     }
                  //   }}
                  //   startIcon={<EditIcon />}
                  //   disabled={isMutating}
                  // >
                  //   Edit
                  // </Button>
                ) : null}
              </Stack> */}
            </Stack>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={3} sx={{ py: 1 }}>
              {isDataLoading ? (
                <Stack spacing={1}>
                  <Skeleton variant="text" width={200} />
                  <Skeleton variant="rectangular" height={80} />
                </Stack>
              ) : (
                <>
                  {(user?.userType === "Teacher" || user?.teacher_data) && (
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">Teacher Profile</Typography>
                        {/* {localTeacherData && !editingTeacher && (
                          // <Button onClick={() => setEditingTeacher(true)} disabled={isMutating}>Edit Teacher</Button>
                        )} */}
                      </Stack>
                      {renderTeacherEditable(user?.teacher_data)}
                    </Stack>
                  )}

                  {(user?.userType === "Parent" || user?.parent_data) && (
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">Parent Profile</Typography>
                        {/* {localParentData && !editingParent && <Button onClick={() => setEditingParent(true)} disabled={isMutating}>Edit Parent</Button>} */}
                      </Stack>
                      {renderParentEditable(user?.parent_data ? (Array.isArray(user.parent_data) ? user.parent_data : [user.parent_data]) : null)}
                    </Stack>
                  )}

                  {(user?.userType === "Student" || user?.student_data) && (
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">Student Profile</Typography>
                        {/* {localStudentData && !editingStudent && <Button onClick={() => setEditingStudent(true)} disabled={isMutating}>Edit Student</Button>} */}
                      </Stack>
                      {renderStudentEditable(user?.student_data)}
                    </Stack>
                  )}

                  {!((user?.userType === "Teacher" || user?.teacher_data) ||
                    (user?.userType === "Parent" || user?.parent_data) ||
                    (user?.userType === "Student" || user?.student_data)
                  ) && (
                    <Typography>No additional profile data available for this user.</Typography>
                  )}
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            {!editingTeacher && !editingParent && !editingStudent ? (
              <Button onClick={() => setOpenOther(false)}>Close</Button>
            ) : (
              <>
                <Button onClick={handleCancelOtherEdit} disabled={isMutating}>Cancel</Button>
                <Button onClick={handleSaveOther} variant="contained" disabled={isMutating} startIcon={otherProfileMutation.isPending ? <CircularProgress size={20} color="inherit" /> : null}>
                  {otherProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserProfile;