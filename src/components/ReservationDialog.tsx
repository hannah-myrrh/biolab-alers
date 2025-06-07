import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Box,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import api from '../api/api';

interface Equipment {
  equipmentID: string;
  name: string;
  status: string;
  available_quantity: number;
  laboratory: {
    lab_name: string;
  };
}

interface ReservationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  equipment: Equipment[];
}

const ReservationDialog: React.FC<ReservationDialogProps> = ({
  open,
  onClose,
  onSuccess,
  equipment,
}) => {
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    try {
      if (!selectedEquipment || !startTime || !endTime) {
        setError('Please fill in all fields');
        return;
      }

      const selectedEq = equipment.find(eq => eq.equipmentID === selectedEquipment);
      if (!selectedEq) {
        setError('Selected equipment not found');
        return;
      }

      if (selectedEq.available_quantity <= 0) {
        setError('This equipment is currently not available');
        return;
      }

      const response = await api.post('/reservations', {
        equipmentID: selectedEquipment,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      });

      if (response.status === 201) {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create reservation');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Reservation</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Equipment</InputLabel>
          <Select
            value={selectedEquipment}
            onChange={(e) => setSelectedEquipment(e.target.value)}
            label="Equipment"
          >
            {equipment
              .filter(item => item.available_quantity > 0)
              .map((item) => (
                <MenuItem key={item.equipmentID} value={item.equipmentID}>
                  {item.name} ({item.laboratory.lab_name}) - {item.available_quantity} available
                </MenuItem>
              ))}
          </Select>
        </FormControl>

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Box sx={{ mt: 2 }}>
            <DateTimePicker
              label="Start Time"
              value={startTime}
              onChange={(newValue) => setStartTime(newValue)}
              sx={{ width: '100%', mb: 2 }}
            />
          </Box>
          <Box sx={{ mt: 2 }}>
            <DateTimePicker
              label="End Time"
              value={endTime}
              onChange={(newValue) => setEndTime(newValue)}
              sx={{ width: '100%' }}
            />
          </Box>
        </LocalizationProvider>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReservationDialog; 