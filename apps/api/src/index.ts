import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import authRoutes from './core/auth/routes';
import userRoutes from './core/users/routes';
import subsidiaryRoutes from './core/subsidiaries/routes';
import dashboardRoutes from './core/dashboard/routes';
import salesRoutes from './modules/food-center/sales/routes';
import inventoryRoutes from './modules/food-center/inventory/routes';
import expenseRoutes from './modules/food-center/expenses/routes';
import vendorRoutes from './modules/food-center/vendors/routes';
import attendanceRoutes from './modules/food-center/attendance/routes';
import assetRoutes from './modules/food-center/assets/routes';
import reportRoutes from './modules/food-center/reports/routes';
import branchRoutes from './shared/branches/routes';
import stationAccountsRoutes from './modules/station/accounts/routes';
import stationJournalRoutes from './modules/station/journal/routes';
import stationArRoutes from './modules/station/ar/routes';
import stationReportRoutes from './modules/station/reports/routes';
import airbnbRoomsRoutes from './modules/airbnb/rooms/routes';
import airbnbGuestsRoutes from './modules/airbnb/guests/routes';
import airbnbBookingsRoutes from './modules/airbnb/bookings/routes';
import airbnbHousekeepingRoutes from './modules/airbnb/housekeeping/routes';
import airbnbReportRoutes from './modules/airbnb/reports/routes';
import settingsRoutes from './core/settings/routes';
import notificationRoutes from './core/notifications/routes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || './uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/subsidiaries', subsidiaryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/food-center/sales', salesRoutes);
app.use('/api/food-center/inventory', inventoryRoutes);
app.use('/api/food-center/expenses', expenseRoutes);
app.use('/api/food-center/vendors', vendorRoutes);
app.use('/api/food-center/attendance', attendanceRoutes);
app.use('/api/food-center/assets', assetRoutes);
app.use('/api/food-center/reports', reportRoutes);
app.use('/api/station/accounts', stationAccountsRoutes);
app.use('/api/station/journal', stationJournalRoutes);
app.use('/api/station/ar', stationArRoutes);
app.use('/api/station/reports', stationReportRoutes);
app.use('/api/airbnb/rooms', airbnbRoomsRoutes);
app.use('/api/airbnb/guests', airbnbGuestsRoutes);
app.use('/api/airbnb/bookings', airbnbBookingsRoutes);
app.use('/api/airbnb/housekeeping', airbnbHousekeepingRoutes);
app.use('/api/airbnb/reports', airbnbReportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`AGBMS API running on http://localhost:${PORT}`);
});

export { io };
