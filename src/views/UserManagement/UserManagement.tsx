import React, { useState, useRef, useEffect } from "react";
import jsPDF from 'jspdf';
import {
  Box,
  Button,
  TextField,
  MenuItem,
  Typography,
  Paper,
  Stack,
  AppBar,
  CssBaseline,
  Snackbar,
  Alert,
  CircularProgress,
  useTheme,
  IconButton,
  Tooltip,
  InputAdornment,
  Tabs,
  Tab,
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from "@mui/material";
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
  GridToolbarExport,
  type GridColDef,
  GridActionsCellItem,
  type GridRowId,
  type GridRowParams
} from "@mui/x-data-grid";
import {
  PictureAsPdf as PdfIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Add,
  Delete,
  CloudUpload as CloudUploadIcon
} from "@mui/icons-material";
import Sidebar from "../../components/Sidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCustomTheme } from "../../context/ThemeContext";
import { 
  type User, 
  type UserRole, 
  type Subject, // This import is now used
  statusOptions, 
  genderOptions, 
  userRoleOptions, 
  userTypeOptions, 
  gradeOptions, 
  mediumOptions, 
  classOptions, 
  type TeacherAssignment
} from "../../types/userManagementTypes";
import { 
  bulkDeactivateUsers, 
  createUser, 
  deactivateUser, 
  fetchUsers, 
  getUserRole, 
  searchUsers,
  fetchSubjects,
  updateUser // Add this import
} from "../../api/userManagementApi";
import Navbar from "../../components/Navbar";
import { debounce } from 'lodash';

type UserCategory = 'Student' | 'Teacher' | 'Parent';

interface FormState extends Omit<User, 'id'> {
  id?: number;
  teacherClass: string[];
  teacherGrade: string;
  teacherGrades: string[];
  studentClass?: string;
  studentGrade?: string;
  userRole: UserRole;
}

type ParentEntry = {
  id: string;
  relation: string;
  profession: string;
  parentContact: string;
  studentAdmissionNo: string;
};

const UserManagement: React.FC = () => {
  const [form, setForm] = useState<FormState>({
    name: "",
    username: "",
    email: "",
    userType: "Student",
    userRole: "user",
    status: true,
    password: "",
    contact: "",
    address: "",
    birthDay: "",
    gender: "",
    photo: null,
    grade: "",
    class: "",
    medium: "",
    subject: "",
    relation: "",
    profession: "",
    parentContact: "",
    studentAdmissionNo: "",
    studentClass: "",
    teacherClass: [],
    studentGrade: "",
    teacherGrade: "",
    teacherGrades: [],
  });
  const [editId, setEditId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error"
  });
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowId[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<UserCategory>('Student');
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [parentEntries, setParentEntries] = useState<ParentEntry[]>([]);
  const theme = useTheme();
  const dataGridRef = useRef<any>(null);
  useCustomTheme();

  const queryClient = useQueryClient();

  const { data: allUsers = [], isLoading: isDataLoading, refetch } = useQuery<User[]>({
    queryKey: ["users", activeTab],
    queryFn: () => fetchUsers(activeTab),
  });

  const users = allUsers;

  const { data: apiSearchResults = [], isLoading: isSearching, refetch: searchRefetch } = useQuery({
    queryKey: ["searchUsers", searchTerm, activeTab],
    queryFn: () => searchUsers(searchTerm, activeTab),
    enabled: false,
  });

  const { data: subjects = [], isLoading: isLoadingSubjects } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: fetchSubjects
  });

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showSnackbar("User created successfully!", "success");
      handleClear();
    },
    onError: (error: any) => {
      console.error('Create user error:', error);
      const errorMessage = error.response?.data?.message || "Failed to create user";
      const errors = error.response?.data?.errors;
      if (errors) {
        const errorMsg = typeof errors === 'object'
          ? Object.values(errors).flat().join(", ")
          : String(errors);
        showSnackbar(errorMsg, "error");
      } else {
        showSnackbar(errorMessage, "error");
      }
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: (userData: User) => updateUser(userData.id as number, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showSnackbar("User updated successfully!", "success");
      handleClear();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || "Failed to update user";
      const errors = error.response?.data?.errors;
      if (errors) {
        showSnackbar(Object.values(errors).flat().join(", "), "error");
      } else {
        showSnackbar(errorMessage, "error");
      }
    }
  });

  const deactivateUserMutation = useMutation({
    mutationFn: (id: number) => deactivateUser(id, activeTab),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showSnackbar("User deactivated successfully!", "success");
    },
    onError: (error: any) => {
      showSnackbar(error.response?.data?.message || "Failed to deactivate user", "error");
    }
  });

  const bulkDeactivateMutation = useMutation({
    mutationFn: (ids: number[]) => bulkDeactivateUsers(ids, activeTab),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showSnackbar(`${rowSelectionModel.length} users deactivated successfully!`, "success");
      setRowSelectionModel([]);
    },
    onError: () => {
      showSnackbar("Error deactivating some users", "error");
    }
  });

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: React.ChangeEvent<{ value: unknown }>, field: keyof User) => {
    const value = e.target.value;
    if (field === 'status') {
      setForm(prev => ({
        ...prev,
        [field]: value === 'true' || value === true
      }));
    } else {
      setForm(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleAddAssignment = () => {
    if (!form.grade || !form.class || !form.subject || !form.medium) {
      showSnackbar("Please fill all required fields for teacher assignment", "error");
      return;
    }

    const newAssignment: TeacherAssignment = {
      id: Math.random().toString(36).substr(2, 9),
      teacherGrade: form.grade,
      teacherClass: form.class,
      subject: form.subject,
      medium: form.medium,
      staffNo: form.staffNo || ''
    };

    setTeacherAssignments(prev => [...prev, newAssignment]);

    setForm(prev => ({
      ...prev,
      grade: "",
      class: "",
      subject: "",
      medium: ""
    }));
  };

  const handleAddParent = () => {
    if (!form.relation && !form.parentContact && !form.studentAdmissionNo && !form.profession) {
      showSnackbar("Please fill at least one parent field before adding", "error");
      return;
    }

    const newParent: ParentEntry = {
      id: Math.random().toString(36).substr(2, 9),
      relation: form.relation || '',
      profession: form.profession || '',
      parentContact: form.parentContact || '',
      studentAdmissionNo: form.studentAdmissionNo || ''
    };

    setParentEntries(prev => [...prev, newParent]);

    setForm(prev => ({
      ...prev,
      relation: "",
      profession: "",
      parentContact: "",
      studentAdmissionNo: ""
    }));
  };

  const handleSave = () => {
    if (!form.name || !form.username || !form.email || (editId === null && !form.password)) {
      showSnackbar("Please fill all required fields!", "error");
      return;
    }

    if (activeTab === 'Teacher') {
      if ((!form.grade || !form.class || !form.subject || !form.medium) && teacherAssignments.length === 0) {
        showSnackbar("Please fill all required teacher fields (Grade, Class, Subject, and Medium)!", "error");
        return;
      }
    }

    // Use form.userRole instead of getUserRole(activeTab)
    const baseUserData: Omit<User, 'id'> = {
      name: form.name,
      username: form.username,
      email: form.email,
      password: form.password,
      userType: activeTab,
      userRole: form.userRole, // CHANGED: Use the role from form state
      status: form.status,
      contact: form.contact || '',
      address: form.address || '',
      birthDay: form.birthDay || '',
      gender: form.gender || '',
      photo: form.photo || null,
      parentContact: form.parentContact || ''
    };

    // ... rest of the function remains the same
    let userData: User;

    switch (activeTab) {
      case 'Teacher':
        const teacherAssignment = {
          teacherGrade: form.grade || '',
          teacherClass: form.class || '',
          subject: form.subject || '',
          medium: form.medium || '',
          staffNo: form.staffNo || ''
        };

        userData = {
          ...baseUserData,
          photo: form.photo === "" ? null : form.photo,
          staffNo: form.staffNo || '',
          grade: form.grade || '',
          class: form.class || '',
          subject: form.subject || '',
          medium: form.medium || '',
          teacherAssignments: teacherAssignments.length > 0 ? teacherAssignments : [teacherAssignment],
          teacherData: teacherAssignments.length > 0 ? teacherAssignments : [teacherAssignment]
        } as User;
        break;

      case 'Student':
        userData = {
          ...baseUserData,
          grade: form.grade || '',
          class: form.class || '',
          medium: form.medium || '',
          studentAdmissionNo: form.studentAdmissionNo || '',
          studentGrade: form.grade || '',
          studentClass: form.class || '',
          studentData: {
            studentGrade: form.grade || '',
            studentClass: form.class || '',
            medium: form.medium || '',
            studentAdmissionNo: form.studentAdmissionNo || ''
          }
        };
        break;

      case 'Parent': {
        const firstParent = parentEntries.length > 0 ? parentEntries[0] : null;

        userData = {
          ...baseUserData,
          profession: form.profession || (firstParent?.profession ?? ''),
          studentAdmissionNo: form.studentAdmissionNo || (firstParent?.studentAdmissionNo ?? ''),
          relation: form.relation || (firstParent?.relation ?? ''),
          parentContact: form.parentContact || (firstParent?.parentContact ?? ''),
          parentEntries: parentEntries.length > 0
            ? parentEntries.map(p => ({
              relation: p.relation,
              profession: p.profession,
              parentContact: p.parentContact,
              studentAdmissionNo: p.studentAdmissionNo
            }))
            : (firstParent ? [{
              relation: firstParent.relation,
              profession: firstParent.profession,
              parentContact: firstParent.parentContact,
              studentAdmissionNo: firstParent.studentAdmissionNo
            }] : []),
          parentData: firstParent ? {
            studentAdmissionNo: firstParent.studentAdmissionNo || '',
            parentContact: firstParent.parentContact || '',
            profession: firstParent.profession || '',
            relation: firstParent.relation || ''
          } : undefined
        } as User;
        break;
      }

      default:
        userData = baseUserData;
    }

    if (editId !== null) {
      userData = { ...userData, id: editId };
      updateUserMutation.mutate(userData);
    } else {
      createUserMutation.mutate(userData);
    }
  };

  const handleClear = () => {
    setForm({
      name: "",
      username: "",
      email: "",
      userType: activeTab,
      userRole: getUserRole(activeTab),
      status: true,
      password: "",
      contact: "",
      address: "",
      birthDay: "",
      gender: "",
      photo: null,
      grade: "",
      class: "",
      medium: "",
      parentContact: "",
      subject: "",
      profession: "",
      relation: "",
      studentAdmissionNo: "",
      studentClass: "",
      teacherClass: [],
      studentGrade: "",
      teacherGrade: "",
      teacherGrades: [],
    });
    setTeacherAssignments([]);
    setParentEntries([]);
    setEditId(null);
  };

  const handleEdit = (id: number) => {
    const userToEdit = (searchTerm ? apiSearchResults : users).find(user => user.id === id);
    if (userToEdit) {
      setForm({
        ...userToEdit,
        photo: userToEdit.photo || '',
        password: "",
        userRole: userToEdit.userRole || getUserRole(userToEdit.userType),
        teacherClass: userToEdit.teacherData?.map(td => td.teacherClass) || [],
        teacherGrade: userToEdit.teacherData?.[0]?.teacherGrade || '',
        teacherGrades: userToEdit.teacherData?.map(td => td.teacherGrade) || [],
        profession: (userToEdit as any).profession || '',
        relation: (userToEdit as any).relation || '',
        parentContact: (userToEdit as any).parentContact || '',
        studentAdmissionNo: (userToEdit as any).studentAdmissionNo || ''
      });
      setEditId(id);

      if (userToEdit.userType === 'Teacher' && userToEdit.teacherData) {
        setTeacherAssignments(userToEdit.teacherData.map(td => ({
          id: Math.random().toString(36).substr(2, 9),
          ...td
        })));
      }

      if (userToEdit.userType === 'Parent') {
        const rawParentArray =
          (userToEdit as any).parentEntries ||
          (userToEdit as any).parent_data || // NEW: Handle parent_data array from backend
          (userToEdit as any).parent ||
          (userToEdit as any).parentData ||
          [];

        const arr = Array.isArray(rawParentArray) ? rawParentArray : rawParentArray ? [rawParentArray] : [];

        if (arr.length > 0) {
          // NEW: Handle the nested parent_data structure
          const parentEntriesData = arr.flatMap((parentItem: any) => {
            // If it's the new backend structure with parent_info and students_info
            if (parentItem.parent_info && parentItem.students_info) {
              return parentItem.students_info.map((student: any) => ({
                id: Math.random().toString(36).substr(2, 9),
                relation: parentItem.parent_info.relation || '',
                profession: parentItem.parent_info.profession || '',
                parentContact: parentItem.parent_info.parent_contact || '',
                studentAdmissionNo: student.studentAdmissionNo || ''
              }));
            }
            // If it's the old flat structure
            return {
              id: Math.random().toString(36).substr(2, 9),
              relation: parentItem.relation || '',
              profession: parentItem.profession || '',
              parentContact: parentItem.parentContact || parentItem.parent_contact || '',
              studentAdmissionNo: parentItem.studentAdmissionNo || ''
            };
          });

          setParentEntries(parentEntriesData);
        } else {
          if ((userToEdit as any).relation || (userToEdit as any).parentContact || (userToEdit as any).profession || (userToEdit as any).studentAdmissionNo) {
            setParentEntries([{
              id: Math.random().toString(36).substr(2, 9),
              relation: (userToEdit as any).relation || '',
              profession: (userToEdit as any).profession || '',
              parentContact: (userToEdit as any).parentContact || '',
              studentAdmissionNo: (userToEdit as any).studentAdmissionNo || ''
            }]);
          } else {
            setParentEntries([]);
          }
        }
      }
    }
  };

  const handleDeactivate = (id: number) => {
    if (window.confirm("Are you sure you want to deactivate this user?")) {
      deactivateUserMutation.mutate(id);
    }
  };

  const handleBulkDeactivate = () => {
    if (rowSelectionModel.length === 0) {
      showSnackbar("Please select users to deactivate", "error");
      return;
    }

    if (window.confirm(`Are you sure you want to deactivate ${rowSelectionModel.length} selected users?`)) {
      bulkDeactivateMutation.mutate(rowSelectionModel as number[]);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const dataToExport = searchTerm ? apiSearchResults : users;

    const tableData = dataToExport.map(user => [
      user.name,
      user.username,
      user.email,
      user.address || '-',
      user.birthDay || '-',
      user.contact || '-',
      user.gender || '-',
      activeTab === 'Student' ? user.grade || '-' :
        activeTab === 'Teacher' ? user.class || '-' : user.profession || '-',
      activeTab === 'Student' ? user.medium || '-' :
        activeTab === 'Teacher' ? user.subject || '-' : (user as any).parentContact || '-',
    ]);

    const headers = [
      'Name', 'Username', 'Email', 'Address', 'Birthday', 'Phone No', 'Gender',
      activeTab === 'Student' ? 'Grade' : activeTab === 'Teacher' ? 'Class' : 'Profession',
      activeTab === 'Student' ? 'Medium' : activeTab === 'Teacher' ? 'Subject' : 'Parent No',
      'Status'
    ];

    doc.text(`${activeTab} Management Report`, 14, 16);
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 20,
      styles: {
        cellPadding: 3,
        fontSize: 8,
        valign: 'middle',
        halign: 'center',
      },
      headStyles: {
        fillColor: [25, 118, 210],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });

    doc.save(`${activeTab.toLowerCase()}-management-report.pdf`);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: UserCategory) => {
    setActiveTab(newValue);
    setForm(prev => ({
      ...prev,
      userType: newValue,
      // Only set default role if we're creating a new user, otherwise keep existing role
      userRole: editId === null ? getUserRole(newValue) : prev.userRole
    }));
    setSearchTerm("");
  };

  const debouncedSearch = useRef(
    debounce((term: string) => {
      if (term.trim() === "") {
        return;
      }
      searchRefetch();
    }, 500)
  ).current;

  useEffect(() => {
    if (searchTerm) {
      debouncedSearch(searchTerm);
    }
    return () => debouncedSearch.cancel();
  }, [searchTerm, debouncedSearch]);

  const isMutating = createUserMutation.isPending ||
    updateUserMutation.isPending ||
    deactivateUserMutation.isPending ||
    bulkDeactivateMutation.isPending;

  const getColumns = (): GridColDef<User>[] => {
    const commonColumns: GridColDef<User>[] = [
      { field: 'name', headerName: 'Name', width: 150, flex: 1 },
      { field: 'username', headerName: 'Username', width: 120, flex: 1 },
      { field: 'email', headerName: 'Email', width: 180, flex: 1 },
      { field: 'address', headerName: 'Address', width: 150, flex: 1 },
      { field: 'birthDay', headerName: 'Birthday', width: 100, flex: 1 },
      { field: 'contact', headerName: 'Phone No', width: 120, flex: 1 },
      { field: 'gender', headerName: 'Gender', width: 100, flex: 1 },
    ];

    const statusColumn: GridColDef<User> = {
      field: 'status',
      headerName: 'Status',
      width: 120,
      flex: 1,
      type: 'boolean',
      renderCell: (params) => (
        <Box
          sx={{
            color: params.value ? theme.palette.success.main : theme.palette.error.main,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: params.value ? theme.palette.success.main : theme.palette.error.main
            }}
          />
          {params.value ? 'Active' : 'Inactive'}
        </Box>
      )
    };

    const actionColumn: GridColDef<User> = {
      field: 'actions',
      headerName: 'Actions',
      type: 'actions',
      width: 120,
      getActions: (params: GridRowParams) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Edit"
          onClick={() => handleEdit(params.id as number)}
          showInMenu
        />,
        <GridActionsCellItem
          icon={<DeleteIcon color="error" />}
          label="Deactivate"
          onClick={() => handleDeactivate(params.id as number)}
          showInMenu
        />,
      ],
    };

    switch (activeTab) {
      case 'Student':
        return [
          ...commonColumns,
          { field: 'grade', headerName: 'Grade', width: 100, flex: 1 },
          { field: 'medium', headerName: 'Medium', width: 100, flex: 1 },
          { field: 'class', headerName: 'Class', width: 100, flex: 1 },
          { field: 'studentAdmissionNo', headerName: 'Student Admission No', width: 150, flex: 1 },
          statusColumn,
          actionColumn
        ];
      case 'Teacher':
        return [
          ...commonColumns,
          { field: 'grade', headerName: 'Grade', width: 100, flex: 1 },
          { field: 'class', headerName: 'Class', width: 100, flex: 1 },
          { field: 'subject', headerName: 'Subject', width: 120, flex: 1 },
          { field: 'medium', headerName: 'Medium', width: 100, flex: 1 },
          statusColumn,
          actionColumn
        ];
      case 'Parent':
        return [
          ...commonColumns,
          { field: 'profession', headerName: 'Profession', width: 120, flex: 1 },
          { field: 'parentContact', headerName: 'Parent No', width: 120, flex: 1 },
          { field: 'studentAdmissionNo', headerName: 'Student Admission No', width: 150, flex: 1 },
          { field: 'relation', headerName: 'Relation', width: 120, flex: 1 },
          statusColumn,
          actionColumn
        ];
      default:
        return [...commonColumns, statusColumn, actionColumn];
    }
  };

  const columns = getColumns();

  function CustomToolbar() {
    return (
      <GridToolbarContainer sx={{ justifyContent: 'space-between' }}>
        <Box>
          <Tooltip title="Refresh data">
            <IconButton onClick={() => refetch()}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export PDF">
            <IconButton onClick={handleExportPDF}>
              <PdfIcon />
            </IconButton>
          </Tooltip>
          {rowSelectionModel.length > 0 && (
            <Button
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleBulkDeactivate}
              size="small"
              sx={{ ml: 1 }}
            >
              Deactivate Selected
            </Button>
          )}
        </Box>
        <Box>
          <GridToolbarColumnsButton />
          <GridToolbarFilterButton />
          <GridToolbarDensitySelector />
          <GridToolbarExport />
        </Box>
      </GridToolbarContainer>
    );
  }

  const displayData = searchTerm ? apiSearchResults : users;

  const renderFormFields = () => {
    const commonFields = (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <TextField
          label="Name*"
          name="name"
          value={form.name}
          onChange={handleChange}
          sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: 120 }}
          size="small"
        />
        <TextField
          label="Username*"
          name="username"
          value={form.username}
          onChange={handleChange}
          sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: 120 }}
          size="small"
        />
        <TextField
          label="Email*"
          name="email"
          value={form.email}
          onChange={handleChange}
          sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: 120 }}
          size="small"
        />
        <TextField
          label="Address"
          name="address"
          value={form.address || ''}
          onChange={handleChange}
          sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: 120 }}
          size="small"
        />
        <TextField
          label="Birthday"
          type="date"
          name="birthDay"
          value={form.birthDay || ''}
          onChange={handleChange}
          InputLabelProps={{ shrink: true }}
          sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: 120 }}
          size="small"
        />
        <TextField
          label="Phone No"
          name="contact"
          value={form.contact || ''}
          onChange={handleChange}
          sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: 120 }}
          size="small"
        />

        <TextField
          type="file"
          label="Upload Photo"
          name="photo"
          onChange={async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              try {
                const processedImage = await processImage(file);
                setForm(prev => ({
                  ...prev,
                  photo: processedImage || ''
                }));
              } catch (error: any) {
                showSnackbar(error.message, "error");
              }
            }
          }}
          InputLabelProps={{ shrink: true }}
          sx={{
            flex: '1 1 calc(33.33% - 16px)',
            minWidth: 120
          }}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconButton
                  color="primary"
                  aria-label="upload photo"
                  component="span"
                  size="small"
                >
                  <CloudUploadIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <TextField
          select
          label="User Role"
          name="userRole"
          value={form.userRole || ''}
          onChange={(e) => handleSelectChange(e, "userRole")}
          sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: 120 }}
          size="small"
        >
          {userRoleOptions.map((userRole: string) => (
            <MenuItem key={userRole} value={userRole}>
              {userRole}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="User Type"
          name="userType"
          value={form.userType || ''}
          onChange={(e) => handleSelectChange(e, "userType")}
          sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: 120 }}
          size="small"
        >
          {userTypeOptions.map((userType: string) => (
            <MenuItem key={userType} value={userType}>
              {userType}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Gender"
          name="gender"
          value={form.gender || ''}
          onChange={(e) => handleSelectChange(e, "gender")}
          sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: 120 }}
          size="small"
        >
          {genderOptions.map((gender: string) => (
            <MenuItem key={gender} value={gender}>
              {gender}
            </MenuItem>
          ))}
        </TextField>

        {editId === null && (
          <TextField
            label="Password*"
            name="password"
            type="password"
            value={form.password || ''}
            onChange={handleChange}
            sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: 120 }}
            size="small"
          />
        )}
        <TextField
          select
          label="Status"
          name="status"
          value={form.status.toString()}
          onChange={(e) => handleSelectChange(e, "status")}
          sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: 120 }}
          size="small"
        >
          {statusOptions.map((option) => (
            <MenuItem key={option.label} value={option.value.toString()}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>
    );

    switch (activeTab) {
      case 'Student':
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {commonFields}
            <TextField
              select
              label="Grade"
              name="grade"
              value={form.grade || ''}
              onChange={(e) => handleSelectChange(e, "grade")}
              sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: 120 }}
              size="small"
            >
              {gradeOptions.map((grade: string) => (
                <MenuItem key={grade} value={grade}>
                  {grade}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Medium"
              name="medium"
              value={form.medium || ''}
              onChange={(e) => handleSelectChange(e, "medium")}
              sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: 120 }}
              size="small"
            >
              {mediumOptions.map((medium: string) => (
                <MenuItem key={medium} value={medium}>
                  {medium}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Student Admission No"
              name="studentAdmissionNo"
              value={form.studentAdmissionNo || ''}
              onChange={handleChange}
              sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: 120 }}
              size="small"
            />
            <TextField
              select
              label="Class"
              name="class"
              value={form.class || ''}
              onChange={(e) => handleSelectChange(e, "class")}
              sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: 120 }}
              size="small"
            >
              {classOptions.map((cls: string) => (
                <MenuItem key={cls} value={cls}>
                  {cls}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        );
      case 'Teacher':
        return (
          <>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {commonFields}
              <Stack spacing={2}>
                <TextField
                  label="Staff Number"
                  name="staffNo"
                  value={form.staffNo || ''}
                  onChange={handleChange}
                  sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: 120 }}
                  size="small"
                />

                <Stack direction="row" spacing={2}>
                  <TextField
                    select
                    label="Grade"
                    name="grade"
                    value={form.grade || ''}
                    onChange={(e) => handleSelectChange(e, "grade")}
                    sx={{ flex: '1 1 calc(25% - 16px)', minWidth: 120 }}
                    size="small"
                  >
                    {gradeOptions.map(grade => (
                      <MenuItem key={grade} value={grade}>{grade}</MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label="Class"
                    name="class"
                    value={form.class || ''}
                    onChange={(e) => handleSelectChange(e, "class")}
                    sx={{ flex: '1 1 calc(25% - 16px)', minWidth: 120 }}
                    size="small"
                  >
                    {classOptions.map(cls => (
                      <MenuItem key={cls} value={cls}>{cls}</MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label="Subject"
                    name="subject"
                    value={form.subject || ''}
                    onChange={(e) => handleSelectChange(e, "subject")}
                    sx={{ flex: '1 1 calc(25% - 16px)', minWidth: 120 }}
                    size="small"
                    disabled={isLoadingSubjects}
                  >
                    {subjects.map((subject: Subject) => (
                      <MenuItem key={subject.id} value={subject.mainSubject}>
                        {subject.mainSubject}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label="Medium"
                    name="medium"
                    value={form.medium || ''}
                    onChange={(e) => handleSelectChange(e, "medium")}
                    sx={{ flex: '1 1 calc(25% - 16px)', minWidth: 120 }}
                    size="small"
                  >
                    {mediumOptions.map(med => (
                      <MenuItem key={med} value={med}>{med}</MenuItem>
                    ))}
                  </TextField>
                </Stack>

                <Button
                  variant="contained"
                  onClick={handleAddAssignment}
                  startIcon={<Add />}
                >
                  Add to list
                </Button>

                {teacherAssignments.length > 0 && (
                  <TableContainer component={Paper}>
                    <MuiTable>
                      <TableHead>
                        <TableRow>
                          <TableCell>Grade</TableCell>
                          <TableCell>Class</TableCell>
                          <TableCell>Subject</TableCell>
                          <TableCell>Medium</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {teacherAssignments.map((assignment) => (
                          <TableRow key={assignment.id}>
                            <TableCell>{assignment.teacherGrade}</TableCell>
                            <TableCell>{assignment.teacherClass}</TableCell>
                            <TableCell>{assignment.subject}</TableCell>
                            <TableCell>{assignment.medium}</TableCell>
                            <TableCell>
                              <IconButton
                                onClick={() => {
                                  setTeacherAssignments(prev =>
                                    prev.filter(a => a.id !== assignment.id)
                                  );
                                }}
                              >
                                <Delete />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </MuiTable>
                  </TableContainer>
                )}
              </Stack>
            </Box>
          </>
        );
      case 'Parent':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {commonFields}
            <Stack spacing={2}>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Profession"
                  name="profession"
                  value={form.profession || ''}
                  onChange={handleChange}
                  sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: 120 }}
                  size="small"
                />
                <TextField
                  label="Relation"
                  name="relation"
                  value={form.relation || ''}
                  onChange={handleChange}
                  sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: 120 }}
                  size="small"
                />
                <TextField
                  label="Parent Contact"
                  name="parentContact"
                  value={form.parentContact || ''}
                  onChange={handleChange}
                  sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: 120 }}
                  size="small"
                />
                <TextField
                  label="Student Admission No"
                  name="studentAdmissionNo"
                  value={form.studentAdmissionNo || ''}
                  onChange={handleChange}
                  sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: 120 }}
                  size="small"
                />
              </Stack>

              <Button
                variant="contained"
                onClick={handleAddParent}
                startIcon={<Add />}
              >
                Add to list
              </Button>

              {parentEntries.length > 0 && (
                <TableContainer component={Paper}>
                  <MuiTable>
                    <TableHead>
                      <TableRow>
                        <TableCell>Relation</TableCell>
                        <TableCell>Profession</TableCell>
                        <TableCell>Parent Contact</TableCell>
                        <TableCell>Student Admission No</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {parentEntries.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.relation}</TableCell>
                          <TableCell>{p.profession}</TableCell>
                          <TableCell>{p.parentContact}</TableCell>
                          <TableCell>{p.studentAdmissionNo}</TableCell>
                          <TableCell>
                            <IconButton
                              onClick={() => setParentEntries(prev => prev.filter(x => x.id !== p.id))}
                            >
                              <Delete />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </MuiTable>
                </TableContainer>
              )}
            </Stack>
          </Box>
        );
      default:
        return commonFields;
    }
  };

  return (
    <Box sx={{ display: "flex", width: "100vw", height: "100vh", minHeight: "100vh" }}>
      <CssBaseline />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

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
            title="User Management"
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
        </AppBar>

        <Stack spacing={3} sx={{ p: 3, overflow: 'auto' }}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 3, color: theme.palette.primary.main }}>
              {editId !== null ? "Edit User" : "Create New User"}
            </Typography>

            <Stack spacing={2}>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                {renderFormFields()}
              </Stack>

              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={isMutating}
                  startIcon={isMutating ? <CircularProgress size={20} /> : null}
                  sx={{ minWidth: 150 }}
                >
                  {editId !== null ? "Update User" : "Create User"}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleClear}
                  disabled={isMutating}
                  sx={{ minWidth: 100 }}
                >
                  Clear
                </Button>
              </Stack>
            </Stack>
          </Paper>

          <Paper sx={{ p: 2, borderRadius: 2, height: 720, minWidth: '300', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2
            }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  variant="fullWidth"
                >
                  <Tab label="Students" value="Student" />
                  <Tab label="Teachers" value="Teacher" />
                  <Tab label="Parents" value="Parent" />
                </Tabs>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextField
                  placeholder={`Search ${activeTab.toLowerCase()}s...`}
                  variant="outlined"
                  size="small"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{
                    width: 300,
                    '& .MuiOutlinedInput-root': {
                      pr: 1,
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm && (
                      <IconButton
                        size="small"
                        onClick={handleClearSearch}
                        sx={{ visibility: searchTerm ? 'visible' : 'hidden' }}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    ),
                  }}
                />
              </Box>
            </Box>
            <DataGrid
              rows={displayData}
              columns={columns}
              loading={Boolean(isDataLoading || isMutating || (searchTerm && isSearching))}
              slots={{ toolbar: CustomToolbar }}
              checkboxSelection
              disableRowSelectionOnClick
              rowSelectionModel={rowSelectionModel}
              onRowSelectionModelChange={(newSelection) => setRowSelectionModel([...newSelection])}
              pageSizeOptions={[5, 10, 25, 50, 100]}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 10, page: 0 },
                },
              }}
              sx={{
                border: 'none',
                height: '100%',
                '& .MuiDataGrid-cell': {
                  borderBottom: `1px solid ${theme.palette.divider}`,
                },
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: theme.palette.background.paper,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                },
                '& .MuiDataGrid-toolbarContainer': {
                  padding: theme.spacing(1),
                  borderBottom: `1px solid ${theme.palette.divider}`,
                },
                '& .MuiDataGrid-virtualScroller': {
                  overflow: 'auto',
                  '&::-webkit-scrollbar': {
                    width: '8px',
                    height: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: '#f1f1f1',
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: '#888',
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    background: '#666',
                  },
                },
              }}
              ref={dataGridRef}
            />
          </Paper>
        </Stack>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
            variant="filled"
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default UserManagement;

const processImage = async (file: File): Promise<string | null> => {
  if (!file) return null;

  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload an image file');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image size should be less than 5MB');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const base64String = canvas.toDataURL('image/jpeg', 0.7);

        if (base64String.length > 250000) {
          reject(new Error('Image is too large. Please choose a smaller image.'));
          return;
        }

        resolve(base64String);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

function autoTable(_doc: any, _arg1: { head: string[][]; body: any[][]; startY: number; styles: { cellPadding: number; fontSize: number; valign: string; halign: string; }; headStyles: { fillColor: number[]; textColor: number; fontStyle: string; }; alternateRowStyles: { fillColor: number[]; }; }) {
  throw new Error("Function not implemented.");
}