import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  IconButton,
  Tooltip,
  TableSortLabel,
  Chip,
  Select,
  FormControl,
  InputLabel,
  OutlinedInput,
  SelectChangeEvent,
  Grid,
  DialogContentText,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, FilterList as FilterListIcon, Check as CheckIcon, Close as CloseIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from '../api/api';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import InfoIcon from '@mui/icons-material/Info';

interface Laboratory {
  labID: string;
  lab_name: string;
}

interface LabEquipment {
  equipmentID: string;
  labID: string;
  name: string;
  status: string;
  total_quantity: number;
  available_quantity: number;
  lab_name: string;
  laboratory: {
    lab_name: string;
  };
}

interface User {
  userID: string;
  name: string;
  email: string;
  role: string;
}

interface Reservation {
  reservationID: string;
  userID: string;
  equipmentID: string;
  start_time: string;
  end_time: string;
  status: string;
  quantity: number;
  reason?: string;
  admin_notes?: string;
  return_timestamp?: string;
  user: User;
  equipment: Equipment;
  user_name: string;
  equipment_name: string;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface FilterState {
  laboratory: string;
  status: string;
}

interface NewEquipment {
  name: string;
  labID: string;
  status: string;
  total_quantity: number;
}

interface Equipment {
  equipmentID: string;
  name: string;
  labID: string;
  lab_name: string;
  status: string;
  total_quantity: number;
  available_quantity: number;
}

interface AdminAction {
  type: 'approve' | 'reject' | 'return';
  reservationID: string;
  equipmentName: string;
  userName: string;
  timestamp: string;
  notes?: string;
}

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Laboratory dialog state
  const [openLabDialog, setOpenLabDialog] = useState(false);
  const [newLab, setNewLab] = useState<Partial<Laboratory>>({});

  // Equipment dialog state
  const [openEquipmentDialog, setOpenEquipmentDialog] = useState(false);
  const [newEquipment, setNewEquipment] = useState<NewEquipment>({
    labID: '',
    name: '',
    status: 'available',
    total_quantity: 1,
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: 'asc' });
  const [filters, setFilters] = useState<FilterState>({
    laboratory: '',
    status: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const [editingLab, setEditingLab] = useState<Laboratory | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof Laboratory | keyof Equipment>('lab_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [openReservationDialog, setOpenReservationDialog] = useState<Reservation | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const [statusFilter, setStatusFilter] = useState('all');
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [tabValue, setTabValue] = useState(0);
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState('');
  const [borrowedSearchQuery, setBorrowedSearchQuery] = useState('');
  const [borrowedEquipment, setBorrowedEquipment] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const [labSearchQuery, setLabSearchQuery] = useState('');
  const [filteredLabs, setFilteredLabs] = useState<Laboratory[]>([]);

  const [adminHistory, setAdminHistory] = useState<AdminAction[]>([]);
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  const fetchData = async () => {
    try {
      const [usersRes, equipmentRes, reservationsRes, laboratoriesRes] = await Promise.all([
        api.get('/users'),
        api.get('/equipment'),
        api.get('/reservations'),
        api.get('/laboratories')
      ]);

      setUsers(usersRes.data);
      setEquipment(equipmentRes.data);
      setLaboratories(laboratoriesRes.data);
      setFilteredLabs(laboratoriesRes.data);
      
      // Process reservations to include equipment and user data
      const processedReservations = reservationsRes.data.map((reservation: Reservation) => ({
        ...reservation,
        equipment: equipmentRes.data.find((eq: Equipment) => eq.equipmentID === reservation.equipmentID),
        user: usersRes.data.find((user: User) => user.userID === reservation.userID)
      }));
      
      setReservations(processedReservations);
      setBorrowedEquipment(processedReservations.filter((r: Reservation) => r.status === 'approved'));
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch data');
      console.error('Error fetching data:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Process reservations to create admin history
    const history: AdminAction[] = [];
    reservations.forEach(reservation => {
      if (reservation.status === 'approved' || reservation.status === 'rejected' || reservation.status === 'returned') {
        history.push({
          type: reservation.status as 'approve' | 'reject' | 'return',
          reservationID: reservation.reservationID,
          equipmentName: reservation.equipment?.name || 'Unknown Equipment',
          userName: reservation.user?.name || 'Unknown User',
          timestamp: reservation.status === 'returned' ? reservation.return_timestamp || '' : reservation.start_time,
          notes: reservation.admin_notes
        });
      }
    });
    // Sort by timestamp, most recent first
    history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setAdminHistory(history);
  }, [reservations]);

  const handleCreateLab = async () => {
    try {
      await api.post('/laboratories', { lab_name: newLab.lab_name });
      setOpenLabDialog(false);
      setNewLab({});
      fetchData();
      toast.success('Laboratory created successfully');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create laboratory';
      toast.error(errorMessage);
    }
  };

  const handleCreateEquipment = async () => {
    try {
      await api.post('/equipment', newEquipment);
      setOpenEquipmentDialog(false);
      setNewEquipment({
        name: '',
        labID: '',
        status: 'available',
        total_quantity: 1,
      });
      fetchData();
      toast.success('Equipment created successfully');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create equipment';
      toast.error(errorMessage);
    }
  };

  const handleDeleteLab = async (labId: string) => {
    if (window.confirm('Are you sure you want to delete this laboratory?')) {
      try {
        await api.delete(`/laboratories/${labId}`);
        fetchData();
        toast.success('Laboratory deleted successfully');
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || 'Failed to delete laboratory';
        toast.error(errorMessage);
      }
    }
  };

  const handleDeleteEquipment = async (equipmentId: string) => {
    if (window.confirm('Are you sure you want to delete this equipment?')) {
      try {
        await api.delete(`/equipment/${equipmentId}`);
        fetchData();
        toast.success('Equipment deleted successfully');
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || 'Failed to delete equipment';
        toast.error(errorMessage);
      }
    }
  };

  const handleSort = (key: string) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  const handleFilterSelectChange = (event: SelectChangeEvent<string>) => {
    const { name, value } = event.target;
    setFilters((prev: FilterState) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFilterInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFilters((prev: FilterState) => ({
      ...prev,
      [name]: value
    }));
  };

  const getSortedAndFilteredData = (data: any[], type: string) => {
    let filteredData = [...data];

    // Apply filters
    if (type === 'equipment') {
      if (filters.laboratory) {
        filteredData = filteredData.filter(item => item.laboratory && item.laboratory.lab_name === filters.laboratory);
      }
      if (filters.status) {
        filteredData = filteredData.filter(item => item.status === filters.status);
      }
    } else if (type === 'reservations') {
      if (filters.status) {
        filteredData = filteredData.filter(item => item.status === filters.status);
      }
    }

    // Apply sorting
    if (sortConfig.key) {
      filteredData.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filteredData;
  };

  const handleEditLab = (lab: Laboratory) => {
    setEditingLab(lab);
    setNewLab({
      lab_name: lab.lab_name
    });
    setOpenLabDialog(true);
  };

  const handleSaveLab = async () => {
    try {
      if (editingLab) {
        await api.put(`/laboratories/${editingLab.labID}`, newLab);
        toast.success('Laboratory updated successfully');
      } else {
        await handleCreateLab();
      }
      setOpenLabDialog(false);
      setEditingLab(null);
      setNewLab({});
      fetchData();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to save laboratory';
      toast.error(errorMessage);
    }
  };

  const handleEditEquipment = async (equipmentId: string) => {
    const equip = equipment.find(e => e.equipmentID === equipmentId);
    if (equip) {
      setEditingEquipment(equip);
      setNewEquipment({
        name: equip.name,
        labID: equip.labID,
        status: equip.status,
        total_quantity: equip.total_quantity,
      });
      setOpenEquipmentDialog(true);
    }
  };

  const handleLabChange = (event: SelectChangeEvent<string>) => {
    const labId = event.target.value;
    setNewEquipment({
      ...newEquipment,
      labID: labId
    });
  };

  const handleUpdateReservationStatus = async (reservationId: string, status: string, adminNotes?: string) => {
    try {
      if (status === 'rejected' && !adminNotes?.trim()) {
        toast.error('Please provide a reason for rejection');
        return;
      }

      const payload = {
        status,
        admin_notes: adminNotes || ''
      };

      await api.put(`/reservations/${reservationId}/status`, payload);
      
      // Refresh data after update
      fetchData();
      
      // Show success message
      toast.success(`Reservation ${status} successfully`);
      
      // Close dialog and reset state if it was open
      if (rejectionDialogOpen) {
        setRejectionDialogOpen(false);
        setRejectionReason('');
        setSelectedReservation(null);
      }
    } catch (error: any) {
      console.error('Error updating reservation status:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update reservation status';
      toast.error(errorMessage);
    }
  };

  const handleCompleteReservation = async (reservationID: string) => {
    try {
      await api.put(`/reservations/${reservationID}/complete`);
      fetchData();
      toast.success('Reservation completed successfully');
    } catch (error) {
      console.error('Error completing reservation:', error);
      toast.error('Failed to complete reservation');
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
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const handleRejectReservation = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setRejectionReason('');
    setRejectionDialogOpen(true);
  };

  const handleMarkAsReturned = async (reservationId: string) => {
    try {
      await api.put(`/reservations/${reservationId}/status`, {
        status: 'returned',
        admin_notes: 'Equipment has been returned'
      });
      fetchData();
      toast.success('Reservation marked as returned');
    } catch (error: any) {
      console.error('Error marking reservation as returned:', error);
      const errorMessage = error.response?.data?.error || 'Failed to mark reservation as returned';
      toast.error(errorMessage);
    }
  };

  const filteredReservations = reservations.filter(reservation => {
    const matchesSearch = 
      reservation.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reservation.equipment_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingReservations = reservations.filter(r => r.status === 'pending');
  const otherReservations = reservations.filter(r => r.status !== 'pending');

  const filteredBorrowedEquipment = borrowedEquipment.filter(reservation => {
    const searchLower = borrowedSearchQuery.toLowerCase();
    return (
      (reservation.equipment?.name || '').toLowerCase().includes(searchLower) ||
      (reservation.user?.name || '').toLowerCase().includes(searchLower) ||
      (reservation.equipment?.lab_name || '').toLowerCase().includes(searchLower)
    );
  });

  const filteredEquipment = equipment.filter(eq => {
    const searchLower = equipmentSearchQuery.toLowerCase();
    return eq.name.toLowerCase().includes(searchLower);
  });

  // Update filteredLabs when labSearchQuery changes
  useEffect(() => {
    const filtered = laboratories.filter(lab => {
      const searchLower = labSearchQuery.toLowerCase();
      return lab.lab_name.toLowerCase().includes(searchLower);
    });
    setFilteredLabs(filtered);
  }, [labSearchQuery, laboratories]);

  const filteredHistory = adminHistory.filter(action => {
    const searchLower = historySearchQuery.toLowerCase();
    return (
      action.equipmentName.toLowerCase().includes(searchLower) ||
      action.userName.toLowerCase().includes(searchLower) ||
      action.type.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <ToastContainer position="top-right" autoClose={3000} />
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
          <Tab label="Requests" />
          <Tab label="All Reservations" />
          <Tab label="Equipment" />
          <Tab label="Borrowed Equipment" />
          <Tab label="Laboratories" />
          <Tab label="Admin History" />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Pending Requests
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Equipment</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Start Time</TableCell>
                    <TableCell>End Time</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingReservations.map((reservation) => (
                    <TableRow key={reservation.reservationID}>
                      <TableCell>{reservation.user_name}</TableCell>
                      <TableCell>{reservation.equipment_name}</TableCell>
                      <TableCell>{reservation.quantity}</TableCell>
                      <TableCell>{new Date(reservation.start_time).toLocaleString()}</TableCell>
                      <TableCell>{new Date(reservation.end_time).toLocaleString()}</TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {reservation.reason || 'No reason provided'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          onClick={() => handleUpdateReservationStatus(reservation.reservationID, 'approved')}
                          sx={{ mr: 1 }}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          onClick={() => handleRejectReservation(reservation)}
                        >
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </>
      )}

      {tabValue === 1 && (
        <Box>
          <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              label="Search Reservations"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flexGrow: 1 }}
            />
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Status Filter</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status Filter"
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Equipment</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Start Time</TableCell>
                  <TableCell>End Time</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {otherReservations
                  .filter(reservation => {
                    const matchesSearch = 
                      reservation.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      reservation.equipment_name.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter;
                    return matchesSearch && matchesStatus;
                  })
                  .map((reservation) => (
                    <TableRow key={reservation.reservationID}>
                      <TableCell>{reservation.user_name}</TableCell>
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
                        {reservation.status === 'approved' && (
                          <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            onClick={() => handleMarkAsReturned(reservation.reservationID)}
                          >
                            Mark as Returned
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {tabValue === 2 && (
        <Box>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <TextField
              label="Search Equipment"
              variant="outlined"
              size="small"
              value={equipmentSearchQuery}
              onChange={(e) => setEquipmentSearchQuery(e.target.value)}
              sx={{ width: 300 }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                setEditingEquipment(null);
                setNewEquipment({
                  name: '',
                  labID: '',
                  status: 'available',
                  total_quantity: 1
                });
                setOpenEquipmentDialog(true);
              }}
            >
              Add Equipment
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Laboratory</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEquipment.map((equipment) => (
                  <TableRow key={equipment.equipmentID}>
                    <TableCell>{equipment.name}</TableCell>
                    <TableCell>{equipment.lab_name}</TableCell>
                    <TableCell>
                      <Chip
                        label={`${equipment.available_quantity}/${equipment.total_quantity}`}
                        color={equipment.available_quantity > 0 ? "success" : "error"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={() => handleEditEquipment(equipment.equipmentID)}
                        sx={{ mr: 1 }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        onClick={() => handleDeleteEquipment(equipment.equipmentID)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {tabValue === 3 && (
        <Box>
          <TextField
            fullWidth
            label="Search Borrowed Equipment"
            variant="outlined"
            value={borrowedSearchQuery}
            onChange={(e) => setBorrowedSearchQuery(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Equipment</TableCell>
                  <TableCell>Borrowed By</TableCell>
                  <TableCell>Laboratory</TableCell>
                  <TableCell>Start Time</TableCell>
                  <TableCell>End Time</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredBorrowedEquipment.map((reservation) => (
                  <TableRow key={reservation.reservationID}>
                    <TableCell>{reservation.equipment?.name || 'Unknown Equipment'}</TableCell>
                    <TableCell>{reservation.user?.name || 'Unknown User'}</TableCell>
                    <TableCell>{reservation.equipment?.lab_name || 'Unknown Laboratory'}</TableCell>
                    <TableCell>{new Date(reservation.start_time).toLocaleString()}</TableCell>
                    <TableCell>{new Date(reservation.end_time).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={() => handleMarkAsReturned(reservation.reservationID)}
                      >
                        Mark as Returned
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {tabValue === 4 && (
        <Box>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <TextField
              label="Search Laboratories"
              variant="outlined"
              size="small"
              value={labSearchQuery}
              onChange={(e) => setLabSearchQuery(e.target.value)}
              sx={{ width: 300 }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                setEditingLab(null);
                setNewLab({});
                setOpenLabDialog(true);
              }}
            >
              Add Laboratory
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Equipment Count</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLabs.map((lab) => (
                  <TableRow key={lab.labID}>
                    <TableCell>{lab.lab_name}</TableCell>
                    <TableCell>
                      {equipment.filter(eq => eq.labID === lab.labID).length}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton onClick={() => handleEditLab(lab)} color="primary">
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton onClick={() => handleDeleteLab(lab.labID)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {tabValue === 5 && (
        <Box>
          <TextField
            fullWidth
            label="Search History"
            variant="outlined"
            value={historySearchQuery}
            onChange={(e) => setHistorySearchQuery(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Action</TableCell>
                  <TableCell>Equipment</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredHistory.map((action) => (
                  <TableRow key={`${action.reservationID}-${action.type}`}>
                    <TableCell>
                      <Chip
                        label={action.type.charAt(0).toUpperCase() + action.type.slice(1)}
                        color={
                          action.type === 'approve' ? 'success' :
                          action.type === 'reject' ? 'error' :
                          'info'
                        }
                      />
                    </TableCell>
                    <TableCell>{action.equipmentName}</TableCell>
                    <TableCell>{action.userName}</TableCell>
                    <TableCell>{new Date(action.timestamp).toLocaleString()}</TableCell>
                    <TableCell>{action.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Equipment Dialog */}
      <Dialog open={openEquipmentDialog} onClose={() => setOpenEquipmentDialog(false)}>
        <DialogTitle>{editingEquipment ? 'Edit Equipment' : 'Add New Equipment'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Equipment Name"
            value={newEquipment.name}
            onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Laboratory</InputLabel>
            <Select
              value={newEquipment.labID}
              label="Laboratory"
              onChange={(e) => setNewEquipment({ ...newEquipment, labID: e.target.value })}
            >
              {laboratories.map((lab) => (
                <MenuItem key={lab.labID} value={lab.labID}>
                  {lab.lab_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            type="number"
            label="Total Quantity"
            value={newEquipment.total_quantity}
            onChange={(e) => setNewEquipment({ ...newEquipment, total_quantity: parseInt(e.target.value) })}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEquipmentDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateEquipment} 
            variant="contained" 
            color="primary"
            disabled={!newEquipment.name || !newEquipment.labID}
          >
            {editingEquipment ? 'Save Changes' : 'Add Equipment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Laboratory Dialog */}
      <Dialog open={openLabDialog} onClose={() => setOpenLabDialog(false)}>
        <DialogTitle>{editingLab ? 'Edit Laboratory' : 'Add New Laboratory'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Laboratory Name"
            value={newLab.lab_name || ''}
            onChange={(e) => setNewLab({ ...newLab, lab_name: e.target.value })}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLabDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateLab} variant="contained" color="primary">
            {editingLab ? 'Save Changes' : 'Add Laboratory'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onClose={() => setRejectionDialogOpen(false)}>
        <DialogTitle>
          {selectedReservation?.status === 'pending' ? 'View Request Details' : 'Rejection Reason'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedReservation?.status === 'pending' ? (
              <>
                <Typography variant="subtitle1" gutterBottom>
                  Student's Reason for Reservation:
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                  {selectedReservation.reason || 'No reason provided'}
                </Typography>
                <Typography variant="subtitle1" gutterBottom>
                  Enter Rejection Reason:
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejection"
                  error={!rejectionReason.trim()}
                  helperText={!rejectionReason.trim() ? "Rejection reason is required" : ""}
                />
              </>
            ) : (
              selectedReservation?.admin_notes || 'No reason provided for rejection.'
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectionDialogOpen(false)}>Close</Button>
          {selectedReservation?.status === 'pending' && (
            <Button
              onClick={() => handleUpdateReservationStatus(selectedReservation.reservationID, 'rejected', rejectionReason)}
              color="error"
              disabled={!rejectionReason.trim()}
            >
              Reject
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminDashboard;
