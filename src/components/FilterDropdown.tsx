import React from 'react';
import { TextField, MenuItem, InputAdornment} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

interface FilterDropdownProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  sx?: SxProps<Theme>;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  label,
  value,
  options,
  onChange,
  disabled = false,
  icon,
  sx,
}) => {
  return (
    <TextField
      select
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as string)}
      variant="outlined"
      size="small"
      disabled={disabled}
      InputProps={{
        startAdornment: icon ? (
          <InputAdornment position="start" sx={{ mr: 1 }}>
            {icon}
          </InputAdornment>
        ) : null,
      }}
      sx={{
        ...sx,
        bgcolor: 'white',
        "& .MuiOutlinedInput-root": {
          borderRadius: "10px",
          height: "45px",
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#A9A9A9' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#0B2347' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#0B2347' },
        },
      }}
    >
      <MenuItem value="">
        <em>{`Select ${label}`}</em>
      </MenuItem>
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
};

export default FilterDropdown;