import React from "react";
import {
  Box,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  IconButton,
  Typography,
  CircularProgress,
  Tabs,
  Tab,
  Chip
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { type User, statusOptions } from "../../types/userManagementTypes";

interface UserManagementTableProps {
  users: User[];
  handleEdit: (id: number) => void;
  handleDelete: (id: number) => void;
  loading: boolean;
  activeTab: "TEACHER" | "STUDENT" | "PARENT";
  onTabChange: (event: React.SyntheticEvent, newValue: "TEACHER" | "STUDENT" | "PARENT") => void;
}

const UserManagementTable: React.FC<UserManagementTableProps> = ({ 
  users, 
  handleEdit, 
  handleDelete,
  loading,
  activeTab,
  onTabChange
}) => {
  const getColumns = () => {
    const commonColumns = [
      "Name",
      "User Name",
      "Email",
      "Address",
      "Birthday",
      "Phone No",
      "Gender",
      "User Role",
      "Status",
      "Action"
    ];

    switch (activeTab) {
      case "STUDENT":
        return [...commonColumns.slice(0, 7), "Grade", "Class", "Medium", "Student Admission No", ...commonColumns.slice(7)];
      case "TEACHER":
        return [...commonColumns.slice(0, 7), "Grade", "Class", "Subject", "Medium", ...commonColumns.slice(7)];
      case "PARENT":
        return [...commonColumns.slice(0, 7), "Profession", "Parent No", "Student Admission No", ...commonColumns.slice(7)];
      default:
        return commonColumns;
    }
  };

  const renderCellContent = (user: User, column: string) => {
    switch (column.toLowerCase()) {
      case "name":
        return user.name || "-";
      case "user name":
        return user.username || "-";
      case "email":
        return user.email || "-";
      case "address":
        return user.address || "-";
      case "birthday":
        return user.birthDay || "-";
      case "phone no":
        return user.contact || "-";
      case "gender":
        return user.gender || "-";
      // Student specific
      case "grade":
        return user.grade || "-";
      case "class":
        return user.class || "-";
      case "medium":
        return user.medium || "-";
      case "student admission no":
        return user.studentAdmissionNo || "-";
      // Teacher specific
      case "subject":
        return user.subject || "-";
      // Parent specific
      case "profession":
        return user.profession || "-";
      case "parent contact":
        return user.parentContact || "-";
      case "student admission no":
        return user.studentAdmissionNo || "-";
      case "status":
        const statusOption = statusOptions.find(opt => opt.value === user.status);
        return (
          <Chip
            label={statusOption?.label || "Unknown"}
            color={user.status ? "success" : "error"}
            size="small"
          />
        );
      case "action":
        return (
          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton 
              onClick={() => handleEdit(user.id!)} 
              color="primary"
              size="small"
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton 
              onClick={() => handleDelete(user.id!)} 
              color="error"
              size="small"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        );
      default:
        return "-";
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs 
          value={activeTab} 
          onChange={onTabChange}
          variant="fullWidth"
        >
          <Tab label="Students" value="STUDENT" />
          <Tab label="Teachers" value="TEACHER" />
          <Tab label="Parents" value="PARENT" />
        </Tabs>
      </Box>
      
      <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {getColumns().map((column) => (
                  <TableCell 
                    key={column}
                    sx={{ 
                      fontWeight: "bold",
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {column}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {users && users.length > 0 ? (
                users.map((user) => (
                  <TableRow 
                    key={user.id} 
                    hover
                    sx={{ '&:last-child td': { borderBottom: 0 } }}
                  >
                    {getColumns().map((column) => (
                      <TableCell 
                        key={`${user.id}-${column}`}
                        sx={{ whiteSpace: 'nowrap' }}
                      >
                        {renderCellContent(user, column)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell 
                    colSpan={getColumns().length} 
                    align="center"
                    sx={{ py: 3 }}
                  >
                    <Typography variant="body2" color="textSecondary">
                      No {activeTab.toLowerCase()}s found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Box>
  );
};

export default UserManagementTable;