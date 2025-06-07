import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Box,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  DialogContentText,
  SelectChangeEvent,
} from '@mui/material';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import SearchIcon from '@mui/icons-material/Search';

interface Equipment {
  equipmentID: string;
  name: string;
  labID: string;
  lab_name: string;
  status: string;
  total_quantity: number;
  available_quantity: number;
}

interface Laboratory {
  labID: string;
  lab_name: string;
  equipment_count: number;
  equipment: Equipment[];
}

interface Reservation {
  reservationID: string;
  equipment_name: string;
  start_time: string;
  end_time: string;
  status: string;
  quantity: number;
  reason?: string;
  admin_notes?: string;
  return_timestamp?: string;
  laboratory_name: string;
}

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [openReservationDialog, setOpenReservationDialog] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [selectedLab, setSelectedLab] = useState<Laboratory | null>(null);
  const [labModalOpen, setLabModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [reservationReason, setReservationReason] = useState('');
  const [reservationQuantity, setReservationQuantity] = useState(1);

  useEffect(() => {
    fetchEquipment();
    fetchLaboratories();
    fetchReservations();
  }, []);

  const fetchEquipment = async () => {
    try {
      const response = await api.get('/equipment');
      setEquipment(response.data);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast.error('Failed to fetch equipment');
    }
  };

  const fetchLaboratories = async () => {
    try {
      const response = await api.get('/laboratories');
      setLaboratories(response.data);
    } catch (error) {
      console.error('Error fetching laboratories:', error);
      toast.error('Failed to fetch laboratories');
    }
  };

  const fetchReservations = async () => {
    if (!user?.userID) return;
    
    try {
      const response = await api.get(`/users/${user.userID}/reservations`);
      setReservations(response.data);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast.error('Failed to fetch reservations');
    }
  };

  const handleSubmitReservation = async () => {
    if (!selectedEquipment || !startTime || !endTime || !user?.userID) return;

    try {
      await api.post('/reservations', {
        userID: user.userID,
        equipmentID: selectedEquipment.equipmentID,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        reason: reservationReason.trim(),
        quantity: reservationQuantity
      });

      toast.success('Reservation request submitted successfully');
      setOpenReservationDialog(false);
      setSelectedEquipment(null);
      setStartTime(null);
      setEndTime(null);
      setReservationReason('');
      setReservationQuantity(1);
      fetchReservations();
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast.error('Failed to create reservation');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'completed':
        return 'info';
      case 'returned':
        return 'success';
      default:
        return 'default';
    }
  };

  const handleEquipmentChange = (event: SelectChangeEvent) => {
    const equip = equipment.find(eq => eq.equipmentID === event.target.value);
    setSelectedEquipment(equip || null);
    if (equip && reservationQuantity > equip.available_quantity) {
      setReservationQuantity(1);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Student Dashboard
      </Typography>

      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Equipment" />
        <Tab label="Laboratories" />
        <Tab label="My Reservations" />
      </Tabs>

      {activeTab === 0 && (
        <Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Equipment Name</TableCell>
                  <TableCell>Laboratory</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {equipment.map((eq) => (
                  <TableRow key={eq.equipmentID}>
                    <TableCell>{eq.name}</TableCell>
                    <TableCell>{eq.lab_name}</TableCell>
                    <TableCell>
                      <Chip
                        label={`${eq.available_quantity} / ${eq.total_quantity}`}
                        color={eq.available_quantity > 0 ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={() => {
                          setSelectedEquipment(eq);
                          setOpenReservationDialog(true);
                        }}
                        disabled={eq.available_quantity === 0}
                      >
                        Reserve
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)'
            },
            gap: 2
          }}>
            {laboratories.map((lab) => (
              <Card 
                key={lab.labID}
                onClick={() => {
                  setSelectedLab(lab);
                  setLabModalOpen(true);
                }}
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 6,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s ease-in-out'
                  }
                }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {lab.lab_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Equipment Count: {lab.equipment_count}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Available Equipment: {lab.equipment.filter(eq => eq.available_quantity > 0).length}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          <Dialog 
            open={labModalOpen} 
            onClose={() => setLabModalOpen(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              {selectedLab?.lab_name} - Available Equipment
            </DialogTitle>
            <DialogContent>
              {selectedLab?.equipment.length ? (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Equipment Name</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Available Quantity</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedLab.equipment.map((eq) => (
                        <TableRow key={eq.equipmentID}>
                          <TableCell>{eq.name}</TableCell>
                          <TableCell>
                            <Chip 
                              label={eq.status} 
                              color={eq.status === 'available' ? 'success' : 'error'}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={`${eq.available_quantity} / ${eq.total_quantity}`}
                              color={eq.available_quantity > 0 ? 'success' : 'error'}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="contained"
                              color="primary"
                              size="small"
                              onClick={() => {
                                setSelectedEquipment(eq);
                                setOpenReservationDialog(true);
                                setLabModalOpen(false);
                              }}
                              disabled={eq.available_quantity === 0}
                            >
                              Reserve
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography>No equipment found in this laboratory.</Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setLabModalOpen(false)}>Close</Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Equipment</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Start Time</TableCell>
                  <TableCell>End Time</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reservations.map((reservation) => (
                  <TableRow key={reservation.reservationID}>
                    <TableCell>{reservation.equipment_name}</TableCell>
                    <TableCell>{reservation.quantity}</TableCell>
                    <TableCell>{new Date(reservation.start_time).toLocaleString()}</TableCell>
                    <TableCell>{new Date(reservation.end_time).toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={reservation.status}
                        color={getStatusColor(reservation.status)}
                      />
                    </TableCell>
                    <TableCell>
                      {(reservation.status === 'rejected' || reservation.status === 'returned') && (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            setSelectedReservation(reservation);
                            setRejectionDialogOpen(true);
                          }}
                        >
                          {reservation.status === 'rejected' ? 'View Reason' : 'View Details'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Dialog
            open={rejectionDialogOpen}
            onClose={() => setRejectionDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              {selectedReservation?.status === 'rejected' ? 'Rejection Details' : 'Return Details'}
            </DialogTitle>
            <DialogContent>
              <DialogContentText>
                {selectedReservation?.status === 'rejected' ? (
                  <>
                    <Typography variant="subtitle1" color="error" gutterBottom>
                      Your reservation was rejected
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      Reason: {selectedReservation.admin_notes || 'No reason provided'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Equipment: {selectedReservation?.equipment_name || 'Unknown'} (Quantity: {selectedReservation?.quantity || 0})
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Laboratory: {selectedReservation?.laboratory_name || 'Unknown'}
                    </Typography>
                  </>
                ) : (
                  <>
                    <Typography variant="subtitle1" color="success" gutterBottom>
                      Equipment has been returned
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      Returned on: {selectedReservation?.return_timestamp ? 
                        new Date(selectedReservation.return_timestamp).toLocaleString() : 
                        'Unknown time'}
                    </Typography>
                    {selectedReservation?.admin_notes && (
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        Notes: {selectedReservation.admin_notes}
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary">
                      Equipment: {selectedReservation?.equipment_name || 'Unknown'} (Quantity: {selectedReservation?.quantity || 0})
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Laboratory: {selectedReservation?.laboratory_name || 'Unknown'}
                    </Typography>
                  </>
                )}
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setRejectionDialogOpen(false)}>Close</Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}

      <Dialog open={openReservationDialog} onClose={() => setOpenReservationDialog(false)}>
        <DialogTitle>Make a Reservation</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please select the equipment and time slot for your reservation.
          </DialogContentText>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Equipment</InputLabel>
            <Select
              value={selectedEquipment?.equipmentID || ''}
              onChange={handleEquipmentChange}
              label="Equipment"
            >
              {equipment.map((item) => (
                <MenuItem key={item.equipmentID} value={item.equipmentID}>
                  {item.name} - {item.lab_name} (Available: {item.available_quantity})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Quantity</InputLabel>
            <Select
              value={reservationQuantity}
              onChange={(e) => setReservationQuantity(Number(e.target.value))}
              label="Quantity"
            >
              {[...Array(selectedEquipment?.available_quantity || 0)].map((_, i) => (
                <MenuItem key={i + 1} value={i + 1}>
                  {i + 1}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <DateTimePicker
                label="Start Time"
                value={startTime}
                onChange={(newValue) => setStartTime(newValue)}
                sx={{ width: '100%' }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    variant: 'outlined'
                  }
                }}
                minDateTime={new Date()}
              />
              <DateTimePicker
                label="End Time"
                value={endTime}
                onChange={(newValue) => setEndTime(newValue)}
                sx={{ width: '100%' }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    variant: 'outlined'
                  }
                }}
                minDateTime={startTime || new Date()}
              />
            </Box>
          </LocalizationProvider>

          <TextField
            fullWidth
            label="Reason for Reservation"
            multiline
            rows={3}
            value={reservationReason}
            onChange={(e) => setReservationReason(e.target.value)}
            placeholder="Please provide a reason for your reservation request"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReservationDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmitReservation}
            disabled={!selectedEquipment || !startTime || !endTime || !reservationReason.trim() || (endTime && startTime && endTime <= startTime)}
            variant="contained"
            color="primary"
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      <ToastContainer />
    </Box>
  );
};

export default StudentDashboard; 