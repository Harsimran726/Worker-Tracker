export type ArtisanStatus = 'active' | 'inactive';
export type AttendanceStatus = 'present' | 'absent' | 'half-day';
export type PaymentType = 'advance' | 'salary_payout' | 'deduction';

export interface Artisan {
  id: string;
  name: string;
  phone?: string;
  dailySalary: number;
  workingHours: number;
  status: ArtisanStatus;
  ownerId: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  workerId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  hoursWorked: number;
  notes?: string;
  ownerId: string;
}

export interface Payment {
  id: string;
  workerId: string;
  date: string; // ISO string
  amount: number;
  type: PaymentType;
  paymentMethod?: 'cash' | 'online';
  notes?: string;
  ownerId: string;
}

export interface Client {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  createdAt: string;
  ownerId: string;
}

export interface ClientTransaction {
  id: string;
  clientId: string;
  amount: number;
  type: 'received' | 'billed';
  date: string; // ISO string
  paymentMethod: 'cash' | 'online';
  notes?: string;
  ownerId: string;
}

export interface MonthlyStats {
  workerId: string;
  month: string; // YYYY-MM
  daysPresent: number;
  daysAbsent: number;
  daysHalf: number;
  totalHours: number;
  baseSalary: number;
  advances: number;
  deductions: number;
  netPayable: number;
}
