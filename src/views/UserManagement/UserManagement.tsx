import React, { useState, useRef, useEffect } from "react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
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
  TableRow,
  useMediaQuery
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
  Delete as DeleteRowIcon,
  CloudUpload as CloudUploadIcon,
  TableChart as ExcelIcon,
  DeleteForever as DeleteForeverIcon
} from "@mui/icons-material";
import Sidebar from "../../components/Sidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCustomTheme } from "../../context/ThemeContext";
import { 
  type User, 
  type UserRole, 
  type Subject,
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
  updateUser,
  deleteUser
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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dataGridRef = useRef<any>(null);
  const formTopRef = useRef<HTMLDivElement>(null);
  useCustomTheme();

  const queryClient = useQueryClient();

  // Scroll to top function
  const scrollToTop = () => {
    formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const { data: allUsers = [], isLoading: isDataLoading, refetch } = useQuery<User[]>({
    queryKey: ["users", activeTab],
    queryFn: async () => {
      const data = await fetchUsers(activeTab);
      // Sort by ID descending to show newest first
      return data.sort((a, b) => (b.id || 0) - (a.id || 0));
    },
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
      // Scroll to top after creating user
      scrollToTop();
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
      // Scroll to top after updating user
      scrollToTop();
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

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => deleteUser(id, activeTab),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", activeTab] });
      showSnackbar("User deleted successfully!", "success");
      setRowSelectionModel([]); // Clear any selections
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to delete user";
      showSnackbar(message, "error");
    }
  });

  // delete handler uses deleteUserMutation (must be inside component)
  const handleDelete = (id: number) => {
    if (!id) return;
    if (window.confirm("Are you sure you want to permanently delete this user? This action cannot be undone.")) {
      deleteUserMutation.mutate(id);
    }
  };
  
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

    const baseUserData: Omit<User, 'id'> = {
      name: form.name,
      username: form.username,
      email: form.email,
      password: form.password,
      userType: activeTab,
      userRole: form.userRole,
      status: form.status,
      contact: form.contact || '',
      address: form.address || '',
      birthDay: form.birthDay || '',
      gender: form.gender || '',
      photo: form.photo || null,
      parentContact: form.parentContact || ''
    };

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
      // Set the form data first
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
          (userToEdit as any).parent_data ||
          (userToEdit as any).parent ||
          (userToEdit as any).parentData ||
          [];

        const arr = Array.isArray(rawParentArray) ? rawParentArray : rawParentArray ? [rawParentArray] : [];

        if (arr.length > 0) {
          const parentEntriesData = arr.flatMap((parentItem: any) => {
            if (parentItem.parent_info && parentItem.students_info) {
              return parentItem.students_info.map((student: any) => ({
                id: Math.random().toString(36).substr(2, 9),
                relation: parentItem.parent_info.relation || '',
                profession: parentItem.parent_info.profession || '',
                parentContact: parentItem.parent_info.parent_contact || '',
                studentAdmissionNo: student.studentAdmissionNo || ''
              }));
            }
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
      
      // Auto scroll to top when editing
      scrollToTop();
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
      user.status ? 'Active' : 'Inactive'
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

  const handleExportExcel = () => {
    const dataToExport = searchTerm ? apiSearchResults : users;

    const excelData = dataToExport.map(user => ({
      'Name': user.name,
      'Username': user.username,
      'Email': user.email,
      'Address': user.address || '-',
      'Birthday': user.birthDay || '-',
      'Phone No': user.contact || '-',
      'Gender': user.gender || '-',
      [activeTab === 'Student' ? 'Grade' : activeTab === 'Teacher' ? 'Class' : 'Profession']:
        activeTab === 'Student' ? user.grade || '-' :
        activeTab === 'Teacher' ? user.class || '-' : user.profession || '-',
      [activeTab === 'Student' ? 'Medium' : activeTab === 'Teacher' ? 'Subject' : 'Parent No']:
        activeTab === 'Student' ? user.medium || '-' :
        activeTab === 'Teacher' ? user.subject || '-' : (user as any).parentContact || '-',
      'Status': user.status ? 'Active' : 'Inactive'
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${activeTab}s`);
    
    // Set column widths
    const maxWidth = excelData.reduce((w: any, r: any) => {
      return Object.keys(r).map((k, i) => 
        Math.max(w[i] || 10, String(r[k]).length)
      );
    }, []);
    worksheet['!cols'] = maxWidth.map((w: number) => ({ wch: w + 2 }));

    XLSX.writeFile(workbook, `${activeTab.toLowerCase()}-management-report.xlsx`);
    showSnackbar("Excel file exported successfully!", "success");
  };

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: UserCategory) => {
    setActiveTab(newValue);
    setForm(prev => ({
      ...prev,
      userType: newValue,
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
    bulkDeactivateMutation.isPending ||
    deleteUserMutation.isPending;  

  const getColumns = (): GridColDef<User>[] => {
    const commonColumns: GridColDef<User>[] = [
      { field: 'name', headerName: 'Name', width: isMobile ? 120 : 150, flex: isMobile ? 0 : 1 },
      { field: 'username', headerName: 'Username', width: isMobile ? 100 : 120, flex: isMobile ? 0 : 1 },
      { field: 'email', headerName: 'Email', width: isMobile ? 150 : 180, flex: isMobile ? 0 : 1 },
      { field: 'address', headerName: 'Address', width: isMobile ? 120 : 150, flex: isMobile ? 0 : 1 },
      { field: 'birthDay', headerName: 'Birthday', width: isMobile ? 100 : 100, flex: isMobile ? 0 : 1 },
      { field: 'contact', headerName: 'Phone No', width: isMobile ? 110 : 120, flex: isMobile ? 0 : 1 },
      { field: 'gender', headerName: 'Gender', width: isMobile ? 80 : 100, flex: isMobile ? 0 : 1 },
    ];

    const statusColumn: GridColDef<User> = {
      field: 'status',
      headerName: 'Status',
      width: isMobile ? 100 : 120,
      flex: isMobile ? 0 : 1,
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
      width: isMobile ? 80 : 140,
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
        <GridActionsCellItem
          icon={<DeleteForeverIcon color="error" />}
          label="Delete"
          onClick={() => handleDelete(params.id as number)}
          showInMenu
        />,
      ],
    };

    switch (activeTab) {
      case 'Student':
        return [
          ...commonColumns,
          { field: 'grade', headerName: 'Grade', width: isMobile ? 80 : 100, flex: isMobile ? 0 : 1 },
          { field: 'medium', headerName: 'Medium', width: isMobile ? 80 : 100, flex: isMobile ? 0 : 1 },
          { field: 'class', headerName: 'Class', width: isMobile ? 80 : 100, flex: isMobile ? 0 : 1 },
          { field: 'studentAdmissionNo', headerName: 'Admission No', width: isMobile ? 120 : 150, flex: isMobile ? 0 : 1 },
          statusColumn,
          actionColumn
        ];
      case 'Teacher':
        return [
          ...commonColumns,
          { field: 'grade', headerName: 'Grade', width: isMobile ? 80 : 100, flex: isMobile ? 0 : 1 },
          { field: 'class', headerName: 'Class', width: isMobile ? 80 : 100, flex: isMobile ? 0 : 1 },
          { field: 'subject', headerName: 'Subject', width: isMobile ? 100 : 120, flex: isMobile ? 0 : 1 },
          { field: 'medium', headerName: 'Medium', width: isMobile ? 80 : 100, flex: isMobile ? 0 : 1 },
          statusColumn,
          actionColumn
        ];
      case 'Parent':
        return [
          ...commonColumns,
          { field: 'profession', headerName: 'Profession', width: isMobile ? 100 : 120, flex: isMobile ? 0 : 1 },
          { field: 'parentContact', headerName: 'Parent No', width: isMobile ? 110 : 120, flex: isMobile ? 0 : 1 },
          { field: 'studentAdmissionNo', headerName: 'Admission No', width: isMobile ? 120 : 150, flex: isMobile ? 0 : 1 },
          { field: 'relation', headerName: 'Relation', width: isMobile ? 100 : 120, flex: isMobile ? 0 : 1 },
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
      <GridToolbarContainer sx={{ 
        justifyContent: 'space-between',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 1 : 0,
        p: 1
      }}>
        <Stack direction={isMobile ? 'column' : 'row'} spacing={1} sx={{ width: isMobile ? '100%' : 'auto' }}>
          <Tooltip title="Refresh data">
            <IconButton onClick={() => refetch()} size={isMobile ? 'small' : 'medium'}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export PDF">
            <IconButton onClick={handleExportPDF} size={isMobile ? 'small' : 'medium'}>
              <PdfIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export Excel">
            <IconButton onClick={handleExportExcel} size={isMobile ? 'small' : 'medium'} color="success">
              <ExcelIcon />
            </IconButton>
          </Tooltip>
          {rowSelectionModel.length > 0 && (
            <Button
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleBulkDeactivate}
              size="small"
              fullWidth={isMobile}
            >
              Deactivate Selected
            </Button>
          )}
        </Stack>
        <Stack direction="row" spacing={0.5} sx={{ width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-end' }}>
          <GridToolbarColumnsButton />
          <GridToolbarFilterButton />
          <GridToolbarDensitySelector />
          <GridToolbarExport />
        </Stack>
      </GridToolbarContainer>
    );
  }

  const displayData = searchTerm ? apiSearchResults : users;

  const renderFormFields = () => {
    const commonFields = (
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        gap: 2 
      }}>
        <TextField
          label="Name*"
          name="name"
          value={form.name}
          onChange={handleChange}
          sx={{ minWidth: 120 }}
          size="small"
        />
        <TextField
          label="Username*"
          name="username"
          value={form.username}
          onChange={handleChange}
          sx={{ minWidth: 120 }}
          size="small"
        />
        <TextField
          label="Email*"
          name="email"
          value={form.email}
          onChange={handleChange}
          sx={{ minWidth: 120 }}
          size="small"
        />
        <TextField
          label="Address"
          name="address"
          value={form.address || ''}
          onChange={handleChange}
          sx={{ minWidth: 120 }}
          size="small"
        />
        <TextField
          label="Birthday"
          type="date"
          name="birthDay"
          value={form.birthDay || ''}
          onChange={handleChange}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 120 }}
          size="small"
        />
        <TextField
          label="Phone No"
          name="contact"
          value={form.contact || ''}
          onChange={handleChange}
          sx={{ minWidth: 120 }}
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
          sx={{ minWidth: 120 }}
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
          sx={{ minWidth: 120 }}
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
          sx={{ minWidth: 120 }}
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
          sx={{ minWidth: 120 }}
          size="small"
        >
          {genderOptions.map((gender: string) => (
            <MenuItem key={gender} value={gender}>
              {gender}
            </MenuItem>
          ))}
        </TextField>

        {editId === null ? (
          <>
            <TextField
              label="Password*"
              name="password"
              type="password"
              value={form.password || ''}
              onChange={handleChange}
              sx={{ minWidth: 120 }}
              size="small"
            />
            <TextField
              select
              label="Status"
              name="status"
              value={form.status.toString()}
              onChange={(e) => handleSelectChange(e, "status")}
              sx={{ minWidth: 120 }}
              size="small"
            >
              {statusOptions.map((option) => (
                <MenuItem key={option.label} value={option.value.toString()}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </>
        ) : (
          <TextField
            select
            label="Status"
            name="status"
            value={form.status.toString()}
            onChange={(e) => handleSelectChange(e, "status")}
            sx={{ 
              minWidth: 120,
              gridColumn: { md: 'span 2' }
            }}
            size="small"
          >
            {statusOptions.map((option) => (
              <MenuItem key={option.label} value={option.value.toString()}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Box>
    );

    switch (activeTab) {
      case 'Student':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {commonFields}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 2 
            }}>
              <TextField
                select
                label="Grade"
                name="grade"
                value={form.grade || ''}
                onChange={(e) => handleSelectChange(e, "grade")}
                sx={{ minWidth: 120 }}
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
                sx={{ minWidth: 120 }}
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
                sx={{ minWidth: 120 }}
                size="small"
              />
              <TextField
                select
                label="Class"
                name="class"
                value={form.class || ''}
                onChange={(e) => handleSelectChange(e, "class")}
                fullWidth
                size="small"
              >
                {classOptions.map((cls: string) => (
                  <MenuItem key={cls} value={cls}>
                    {cls}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Box>
        );
      case 'Teacher':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {commonFields}
            
            <TextField
              label="Staff Number"
              name="staffNo"
              value={form.staffNo || ''}
              onChange={handleChange}
              fullWidth
              size="small"
            />

            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 2 
            }}>
              <TextField
                select
                label="Grade"
                name="grade"
                value={form.grade || ''}
                onChange={(e) => handleSelectChange(e, "grade")}
                sx={{ minWidth: 120 }}
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
                sx={{ minWidth: 120 }}
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
                sx={{ minWidth: 120 }}
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
                sx={{ minWidth: 120 }}
                size="small"
              >
                {mediumOptions.map(med => (
                  <MenuItem key={med} value={med}>{med}</MenuItem>
                ))}
              </TextField>
            </Box>

            <Button
              variant="contained"
              onClick={handleAddAssignment}
              startIcon={<Add />}
              sx={{ maxWidth: 200 }}
            >
              Add to list
            </Button>

            {teacherAssignments.length > 0 && (
              <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                <MuiTable size={isMobile ? "small" : "medium"}>
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
                            size={isMobile ? "small" : "medium"}
                          >
                            <DeleteRowIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </MuiTable>
              </TableContainer>
            )}
          </Box>
        );
      case 'Parent':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {commonFields}
            
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 2 
            }}>
              <TextField
                label="Profession"
                name="profession"
                value={form.profession || ''}
                onChange={handleChange}
                sx={{ minWidth: 120 }}
                size="small"
              />
              <TextField
                label="Relation"
                name="relation"
                value={form.relation || ''}
                onChange={handleChange}
                sx={{ minWidth: 120 }}
                size="small"
              />
              <TextField
                label="Parent Contact"
                name="parentContact"
                value={form.parentContact || ''}
                onChange={handleChange}
                sx={{ minWidth: 120 }}
                size="small"
              />
              <TextField
                label="Student Admission No"
                name="studentAdmissionNo"
                value={form.studentAdmissionNo || ''}
                onChange={handleChange}
                sx={{ minWidth: 120 }}
                size="small"
              />
            </Box>

            <Button
              variant="contained"
              onClick={handleAddParent}
              startIcon={<Add />}
              sx={{ maxWidth: 200 }}
            >
              Add to list
            </Button>

            {parentEntries.length > 0 && (
              <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                <MuiTable size={isMobile ? "small" : "medium"}>
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
                            size={isMobile ? "small" : "medium"}
                          >
                            <DeleteRowIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </MuiTable>
              </TableContainer>
            )}
          </Box>
        );
      default:
        return commonFields;
    }
  };

  return (
    <Box sx={{ display: "flex", width: "100%", minHeight: "100vh" }}>
      <CssBaseline />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", width: '100%' }}>
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

        <Stack spacing={isMobile ? 2 : 3} sx={{ p: isMobile ? 2 : 3, overflow: 'auto', width: '100%' }}>
          <Paper ref={formTopRef} sx={{ p: isMobile ? 2 : 3, borderRadius: 2 }}>
            <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ mb: 2, color: theme.palette.primary.main, fontWeight: 600 }}>
              {editId !== null ? "Edit User" : "Create New User"}
            </Typography>

            <Stack spacing={2}>
              {renderFormFields()}

              <Stack direction={isMobile ? "column" : "row"} spacing={2} justifyContent="flex-end" sx={{ pt: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={isMutating}
                  startIcon={isMutating ? <CircularProgress size={20} /> : null}
                  fullWidth={isMobile}
                >
                  {editId !== null ? "Update User" : "Create User"}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleClear}
                  disabled={isMutating}
                  fullWidth={isMobile}
                >
                  Clear
                </Button>
              </Stack>
            </Stack>
          </Paper>

          <Paper sx={{ p: isMobile ? 1 : 2, borderRadius: 2, height: isMobile ? 600 : 720, display: 'flex', flexDirection: 'column' }}>
            <Stack spacing={2}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  variant={isMobile ? "fullWidth" : "standard"}
                  scrollButtons={isMobile ? "auto" : false}
                  allowScrollButtonsMobile
                >
                  <Tab label="Students" value="Student" />
                  <Tab label="Teachers" value="Teacher" />
                  <Tab label="Parents" value="Parent" />
                </Tabs>
              </Box>

              <Stack direction={isMobile ? "column" : "row"} spacing={2} alignItems={isMobile ? "stretch" : "center"} justifyContent="space-between">
                <TextField
                  placeholder={`Search ${activeTab.toLowerCase()}s...`}
                  variant="outlined"
                  size="small"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  fullWidth={isMobile}
                  sx={{
                    width: isMobile ? '100%' : 300,
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
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    ),
                  }}
                />
              </Stack>
            </Stack>

            <Box sx={{ flexGrow: 1, mt: 2, overflow: 'hidden' }}>
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
                    paginationModel: { pageSize: isMobile ? 5 : 10, page: 0 },
                  },
                }}
                sx={{
                  border: 'none',
                  height: '100%',
                  '& .MuiDataGrid-cell': {
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    padding: isMobile ? '4px 8px' : '8px 16px',
                  },
                  '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: theme.palette.background.paper,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
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
                  '& .MuiDataGrid-columnHeader': {
                    padding: isMobile ? '4px 8px' : '8px 16px',
                  },
                  '& .MuiDataGrid-row': {
                    minHeight: isMobile ? '40px !important' : '52px !important',
                  },
                }}
                ref={dataGridRef}
              />
            </Box>
          </Paper>
        </Stack>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: isMobile ? 'center' : 'right' }}
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


