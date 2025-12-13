import { db } from "../lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { soundManager } from '../lib/soundManager';
import * as Notifications from 'expo-notifications';
import { notificationService } from './notificationService';
import { createCallSession } from "./streamService"; 

// --- CONSTANTS & TYPES ---
export type ProfessionalType = "doctor" | "pharmacist" | "therapist" | "dentist" | "lawyer";

const MAX_DAILY_SLOTS = 10; 
const SLOT_DURATION_MINUTES = 30;
const EMERGENCY_FEE = 10000;
const EMERGENCY_RESPONSE_TIME = 10 * 60 * 1000; 

const SLOT_LIMITS: Record<ProfessionalType, number> = {
  doctor: MAX_DAILY_SLOTS,
  therapist: MAX_DAILY_SLOTS,
  dentist: MAX_DAILY_SLOTS,
  lawyer: MAX_DAILY_SLOTS,
  pharmacist: 20, 
};

export interface TimeSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isEnabled: boolean;
} 

export interface Professional {
  uid: string;
  name: string;
  email: string;
  role: "professional";
  professionalType: ProfessionalType;
  specialization?: string;
  professionalLicense?: string;
  yearsOfExperience?: number;
  consultationFee?: number;
  availability?: TimeSlot[];
  isVerified?: boolean;
  isOnline?: boolean;
  currentQueue?: number;
  nextAvailable?: string;
  languages?: string[];
  responseTime?: string;
  consultationsCompleted?: number;
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
  bio?: string;
  maxDailySlots?: number;
  acceptsEmergency?: boolean;
  workplace?: string;
  updatedAt?: number;
}

export interface Prescription { 
  id: string; // Same as bookingId
  professionalId: string;
  patientId: string;
  bookingId: string;
  medications: string;
  dosage: string;
  duration: string;
  instructions: string;
  notes?: string;
  createdAt: number;
}

export interface Booking {
  id: string;
  professionalId: string;
  professionalName: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  consultationType: "video" | "chat";
  reason?: string;
  status: "pending_confirmation" | "confirmed" | "ready" | "in_progress" | "completed" | "cancelled" | "rejected" | "emergency_pending" | "emergency_confirmed" | "rejected_during_call";
  fee: number;
  queuePosition?: number;
  createdAt: number;
  updatedAt: number;
  reminderSent?: boolean;
  scheduledTimestamp?: number;
  confirmedAt?: number;
  paymentStatus: "pending" | "held" | "completed" | "refunded";
  canStartCall?: boolean;
  isEmergency?: boolean;
  emergencyDeadline?: number;
  emergencyConfirmedAt?: number;
  callInitiatedBy?: string;
  callStartedAt?: number;
  callEndedAt?: number;
  sessionExpiresAt?: number;
  rated?: boolean;
  cancelReason?: string;
  currentCallId?: string;
  prescriptionId?: string; 
}

export interface Review {
  id: string;
  professionalId: string;
  patientId: string;
  patientName: string;
  bookingId: string;
  rating: number;
  comment: string;
  createdAt: number;
}

// --- HELPER FUNCTIONS ---
const parseTime = (time: string): number => {
  const [timeStr, period] = time.split(' ');
  let [hours, minutes] = timeStr.split(':').map(Number);
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  return hours * 60 + minutes;
};

const formatTime = (minutes: number): string => {
  let hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  
  if (hours > 12) hours -= 12;
  if (hours === 0) hours = 12;
  
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${period}`;
};

const getScheduledTimestamp = (date: string, time: string): number => {
  const [timeStr, period] = time.split(' ');
  let [hours, minutes] = timeStr.split(':').map(Number);
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  const dateObj = new Date(date);
  dateObj.setHours(hours, minutes, 0, 0);
  return dateObj.getTime();
};

const generateTimeSlots = (startTime: string, endTime: string, duration: number): string[] => {
  const slots: string[] = [];
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  const finalDuration = duration > 0 ? duration : 30;

  let current = start;
  while (current < end) {
    slots.push(formatTime(current));
    current += finalDuration;
  }
  return slots;
};

const getDefaultAvailability = (): TimeSlot[] => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return days.map((day, index) => ({
    id: `slot_${day}`,
    day,
    startTime: '09:00 AM',
    endTime: '05:00 PM',
    slotDuration: SLOT_DURATION_MINUTES,
    isEnabled: index < 5,
  }));
};

// --- MAIN SERVICE ---
export const professionalService = {
  
  // ==================== PROFESSIONAL DATA ====================
  
  async getProfessional(professionalId: string): Promise<Professional | null> {
    const snap = await getDoc(doc(db, "users", professionalId));
    if (!snap.exists()) return null;
    
    const data = snap.data() as Professional;
    
    if (!data.availability || data.availability.length === 0) {
      data.availability = getDefaultAvailability();
    }
    
    return data;
  },

  async getAllProfessionals(): Promise<Professional[]> {
    const q = query(collection(db, "users"), where("role", "==", "professional"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data() as Professional;
      if (!data.availability || data.availability.length === 0) {
        data.availability = getDefaultAvailability();
      }
      return data;
    });
  },

  // ✅ ADDED: Get Stats for Dashboard (Fixes the "Failed to load data" error)
  async getProfessionalStats(professionalId: string) {
    const bookings = await this.getProfessionalBookings(professionalId);
    const professional = await this.getProfessional(professionalId);

    const completed = bookings.filter(b => b.status === "completed");
    const cancelled = bookings.filter(b => b.status === "cancelled" || b.status === "rejected");
    
    // Calculate total earnings from completed bookings
    const totalEarnings = completed.reduce((sum, booking) => sum + booking.fee, 0);

    return {
      totalBookings: bookings.length,
      completedConsultations: completed.length,
      cancelledConsultations: cancelled.length,
      totalEarnings,
      averageRating: professional?.rating || 0,
      reviewCount: professional?.reviewCount || 0,
    };
  },

  async getProfessionalsByType(type: ProfessionalType): Promise<Professional[]> {
    const q = query(
      collection(db, "users"),
      where("role", "==", "professional"),
      where("professionalType", "==", type)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data() as Professional;
      if (!data.availability || data.availability.length === 0) {
        data.availability = getDefaultAvailability();
      }
      return data;
    });
  },

  async updateProfessionalStatus(professionalId: string, isOnline: boolean): Promise<void> {
    await updateDoc(doc(db, "users", professionalId), {
      isOnline,
      updatedAt: Date.now(),
    });
  },

  async updateProfessionalProfile(professionalId: string, data: Partial<Professional>): Promise<void> {
    await updateDoc(doc(db, "users", professionalId), {
      ...data,
      updatedAt: Date.now(),
    });
  },

  async incrementConsultationsCompleted(professionalId: string): Promise<void> {
    const professional = await this.getProfessional(professionalId);
    if (professional) {
      await updateDoc(doc(db, "users", professionalId), {
        consultationsCompleted: (professional.consultationsCompleted || 0) + 1,
      });
    }
  },

  // ✅ ADDED: Get Reviews for a Professional
  async getProfessionalReviews(professionalId: string): Promise<Review[]> {
    const q = query(
      collection(db, "reviews"),
      where("professionalId", "==", professionalId),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return { id: doc.id, ...data } as Review;
    });
  },

  // ✅ ADDED: Add a Review (Helper for RatingModal)
  async addReview(reviewData: Omit<Review, "id" | "createdAt">): Promise<void> {
    const review = {
        ...reviewData,
        createdAt: Date.now()
    };
    
    await addDoc(collection(db, "reviews"), review);

    const professionalRef = doc(db, "users", reviewData.professionalId);
    const professionalSnap = await getDoc(professionalRef);
    
    if (professionalSnap.exists()) {
        const prof = professionalSnap.data() as Professional;
        const currentCount = prof.reviewCount || 0;
        const currentRating = prof.rating || 5.0;
        
        const newCount = currentCount + 1;
        const newRating = ((currentRating * currentCount) + reviewData.rating) / newCount;

        await updateDoc(professionalRef, {
            rating: newRating,
            reviewCount: newCount
        });
    }
  },

  // ==================== AVAILABILITY & SLOTS ====================
  
  async setAvailability(professionalId: string, availability: TimeSlot[]): Promise<void> {
    const professional = await this.getProfessional(professionalId);
    const enforce30Min = SLOT_LIMITS[professional?.professionalType || 'doctor'] === MAX_DAILY_SLOTS;

    try {
      const validatedAvailability = availability.map(slot => ({
        id: slot.id,
        day: slot.day,
        startTime: slot.startTime,
        endTime: slot.endTime,
        slotDuration: enforce30Min ? SLOT_DURATION_MINUTES : (Number(slot.slotDuration) || 30), 
        isEnabled: slot.isEnabled !== false,
      }));

      await setDoc(
        doc(db, "users", professionalId),
        {
          availability: validatedAvailability,
          updatedAt: Date.now(),
        },
        { merge: true }
      );

    } catch (error) {
      console.error('❌ Error saving availability:', error);
      throw new Error('Failed to save availability. Please try again.');
    }
  },

  async getRemainingDailySlots(professionalId: string, date: string): Promise<number> {
    const professional = await this.getProfessional(professionalId);
    if (!professional) return 0;

    const maxSlots = SLOT_LIMITS[professional.professionalType] || MAX_DAILY_SLOTS;

    const bookingsQuery = query(
      collection(db, "bookings"),
      where("professionalId", "==", professionalId),
      where("date", "==", date),
      where("status", "in", ["pending_confirmation", "confirmed", "ready", "in_progress", "emergency_pending", "emergency_confirmed"])
    );
    
    const bookingsSnap = await getDocs(bookingsQuery);
    const bookedCount = bookingsSnap.size;
    
    return Math.max(0, maxSlots - bookedCount);
  },

  async getAvailableSlots(professionalId: string, date: string): Promise<string[]> {
    try {
      const professional = await this.getProfessional(professionalId);
      if (!professional) return [];

      const remainingSlots = await this.getRemainingDailySlots(professionalId, date);
      if (remainingSlots <= 0) return [];

      const [year, month, day] = date.split('-').map(num => parseInt(num, 10));
      const dateObj = new Date(year, month - 1, day);
      
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
      
      const dayAvailability = professional.availability?.find(
        slot => slot.day === dayName && slot.isEnabled !== false
      );
      
      if (!dayAvailability) return [];

      const slots = generateTimeSlots(
        dayAvailability.startTime,
        dayAvailability.endTime,
        dayAvailability.slotDuration
      );

      const bookingsQuery = query(
        collection(db, "bookings"),
        where("professionalId", "==", professionalId),
        where("date", "==", date),
        where("status", "in", ["pending_confirmation", "confirmed", "ready", "in_progress", "emergency_pending", "emergency_confirmed"])
      );
      const bookingsSnap = await getDocs(bookingsQuery);
      const bookedTimes = bookingsSnap.docs.map(doc => doc.data().time);

      const availableSlots = slots.filter(slot => !bookedTimes.includes(slot));
      return availableSlots.slice(0, remainingSlots);
    } catch (error) {
      console.error('❌ Error getting available slots:', error);
      return [];
    }
  },
  
  // ==================== PRESCRIPTION MANAGEMENT ====================

  async savePrescription(bookingId: string, professionalId: string, data: Omit<Prescription, 'id' | 'createdAt' | 'professionalId' | 'bookingId' | 'patientId'>, patientId: string): Promise<void> {
    const prescriptionRef = doc(db, "prescriptions", bookingId); 
    const bookingRef = doc(db, "bookings", bookingId);

    const prescriptionData: Prescription = {
        id: bookingId,
        professionalId: professionalId,
        patientId: patientId,
        bookingId: bookingId,
        medications: data.medications,
        dosage: data.dosage,
        duration: data.duration,
        instructions: data.instructions,
        notes: data.notes,
        createdAt: Date.now(),
    };

    await setDoc(prescriptionRef, prescriptionData, { merge: true });
    
    await updateDoc(bookingRef, {
        prescriptionId: bookingId,
        updatedAt: Date.now(),
    });
  },

  async getPrescription(prescriptionId: string): Promise<Prescription | null> {
    const snap = await getDoc(doc(db, "prescriptions", prescriptionId));
    if (!snap.exists()) return null;
    return snap.data() as Prescription;
  },

  // ==================== BOOKING - REGULAR ====================
  
  async updateBookingStatus(bookingId: string, status: Booking["status"]): Promise<void> {
    await updateDoc(doc(db, "bookings", bookingId), {
      status,
      updatedAt: Date.now(),
    });
  },

  async getPatientPendingBookingWithProfessional(patientId: string, professionalId: string): Promise<Booking | null> {
    const bookingsQuery = query(
      collection(db, "bookings"),
      where("patientId", "==", patientId),
      where("professionalId", "==", professionalId),
      where("status", "in", ["pending_confirmation", "confirmed", "ready", "in_progress"])
    );
    const snapshot = await getDocs(bookingsQuery);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as Booking;
  },

  async getPatientActiveEmergency(patientId: string): Promise<Booking | null> {
    const emergencyQuery = query(
      collection(db, "bookings"),
      where("patientId", "==", patientId),
      where("isEmergency", "==", true),
      where("status", "in", ["emergency_pending", "emergency_confirmed", "in_progress"])
    );
    const snapshot = await getDocs(emergencyQuery);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as Booking;
  },

  async createBooking(bookingData: {
    professionalId: string;
    patientId: string;
    patientName: string;
    professionalName: string;
    date: string;
    time: string;
    consultationType: "video" | "chat";
    reason?: string | null;
    fee: number;
  }): Promise<Booking> {
    const professional = await this.getProfessional(bookingData.professionalId);
    if (!professional) throw new Error("Professional not found");

    const availableSlots = await this.getAvailableSlots(bookingData.professionalId, bookingData.date);
    if (!availableSlots.includes(bookingData.time)) {
      throw new Error("The selected slot is no longer available.");
    }
    
    const existingBooking = await this.getPatientPendingBookingWithProfessional(
      bookingData.patientId, 
      bookingData.professionalId
    );
    if (existingBooking) {
      throw new Error(`You already have a pending consultation with ${bookingData.professionalName}.`);
    }

    const scheduledTimestamp = getScheduledTimestamp(bookingData.date, bookingData.time);

    const booking: Omit<Booking, "id"> = {
        professionalId: bookingData.professionalId,
        professionalName: bookingData.professionalName,
        patientId: bookingData.patientId,
        patientName: bookingData.patientName,
        date: bookingData.date,
        time: bookingData.time,
        consultationType: bookingData.consultationType,
        status: "pending_confirmation",
        fee: bookingData.fee,
        queuePosition: 0,
        scheduledTimestamp,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        reminderSent: false,
        paymentStatus: "pending",
        canStartCall: false,
        isEmergency: false,
        reason: bookingData.reason || undefined,
        rated: false,
    };

    const ref = await addDoc(collection(db, "bookings"), booking);
    await updateDoc(ref, { id: ref.id });
    await soundManager.play('orderPlaced');
    
    const snap = await getDoc(ref);
    return snap.data() as Booking;
  },

  // ==================== EMERGENCY BOOKING ====================
  
  async createEmergencyBooking(
    professionalId: string,
    patientId: string,
    patientName: string,
    professionalName: string,
    reason: string | null,
    walletService: any
  ): Promise<Booking> {
    const prof = await this.getProfessional(professionalId);
    if (!prof?.acceptsEmergency || !prof.isOnline) {
      throw new Error("This professional does not accept emergency consultations or is offline");
    }

    const patientWallet = await walletService.getWallet(patientId);
    if (patientWallet.balance < EMERGENCY_FEE) {
      throw new Error(`Insufficient balance. Emergency requires ₦${EMERGENCY_FEE.toLocaleString()}.`);
    }

    const existingEmergency = await this.getPatientActiveEmergency(patientId);
    if (existingEmergency) {
      throw new Error("You already have an active emergency consultation.");
    }

    const now = Date.now();
    const emergencyDeadline = now + EMERGENCY_RESPONSE_TIME;

    const booking: Omit<Booking, "id"> = {
      professionalId,
      patientId,
      patientName,
      professionalName,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      consultationType: "video",
      reason: reason || "Emergency consultation",
      status: "emergency_pending",
      fee: EMERGENCY_FEE,
      queuePosition: 0,
      createdAt: now,
      updatedAt: now,
      reminderSent: false,
      scheduledTimestamp: now,
      paymentStatus: "pending",
      canStartCall: false,
      isEmergency: true,
      emergencyDeadline,
      rated: false,
    };

    const ref = await addDoc(collection(db, "bookings"), booking);
    await updateDoc(ref, { id: ref.id });

    await soundManager.play('orderPlaced');
    await this.notifyProfessionalEmergency(professionalId, ref.id, patientName);

    const snap = await getDoc(ref);
    return snap.data() as Booking;
  },

  async notifyProfessionalEmergency(professionalId: string, bookingId: string, patientName: string): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🚨 EMERGENCY CONSULTATION",
        body: `${patientName} needs immediate help! Respond within ${EMERGENCY_RESPONSE_TIME / 60000} minutes.`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null,
    });
  },

  // ==================== CONFIRMATION / REJECTION ====================
  
  async confirmBooking(bookingId: string, professionalId: string, walletService: any): Promise<void> {
    const bookingRef = doc(db, "bookings", bookingId);
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists()) throw new Error("Booking not found");
    const booking = bookingSnap.data() as Booking;
    
    if (booking.professionalId !== professionalId) throw new Error("Unauthorized");
    if (booking.isEmergency && booking.emergencyDeadline && Date.now() > booking.emergencyDeadline) {
      throw new Error("Emergency expired");
    }

    const patientWallet = await walletService.getWallet(booking.patientId);
    if (patientWallet.balance < booking.fee) throw new Error("Insufficient balance");

    await walletService.debitWallet(booking.patientId, booking.fee, { 
      description: `${booking.isEmergency ? 'Emergency ' : ''}Consultation Hold for ${booking.professionalName}` 
    });
    
    await walletService.creditPendingBalance(booking.professionalId, booking.fee, {
      description: `${booking.isEmergency ? 'Emergency ' : 'Pending '}consultation from ${booking.patientName}`,
    });
    
    await soundManager.play('debit');

    let queuePosition = 0;
    if (!booking.isEmergency) {
      const queueQuery = query(
        collection(db, "bookings"),
        where("professionalId", "==", booking.professionalId),
        where("status", "in", ["confirmed", "ready"]),
        where("date", "==", booking.date)
      );
      const queueSnapshot = await getDocs(queueQuery);
      queuePosition = queueSnapshot.size + 1;
    }

    const newStatus = booking.isEmergency ? "emergency_confirmed" : "confirmed";

    await updateDoc(bookingRef, {
      status: newStatus,
      queuePosition,
      confirmedAt: Date.now(),
      emergencyConfirmedAt: booking.isEmergency ? Date.now() : null,
      paymentStatus: "held",
      canStartCall: false, 
      updatedAt: Date.now(),
    });

    await this.updateQueueCount(booking.professionalId);
    
    if (!booking.isEmergency && booking.scheduledTimestamp) {
      await this.scheduleReminder(booking.id, booking.patientId, booking.professionalId, booking.scheduledTimestamp);
    }
    
    await notificationService.sendLocalNotification(
        "Consultation Confirmed! ✅",
        `${booking.professionalName} has confirmed your consultation.`,
        { bookingId: booking.id, type: 'booking_confirmed' }
    );
    await soundManager.play('acknowledged');
  },

  async rejectBooking(bookingId: string, professionalId: string, reason?: string, walletService?: any): Promise<void> {
    const bookingRef = doc(db, "bookings", bookingId);
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists()) throw new Error("Booking not found");
    const booking = bookingSnap.data() as Booking;

    if (booking.professionalId !== professionalId) throw new Error("Unauthorized");

    await updateDoc(bookingRef, {
      status: "rejected",
      cancelReason: reason || "Request declined",
      updatedAt: Date.now(),
    });

    if (booking.paymentStatus === "held" && walletService) {
        await walletService.refundHeldPayment(booking.professionalId, booking.patientId, booking.fee, {
            description: `Refund for rejected consultation with ${booking.professionalName}`,
        });
        await updateDoc(bookingRef, { paymentStatus: "refunded" });
    }

    await this.updateQueueCount(booking.professionalId);
    await soundManager.play('dispute');
  },
  
  async rejectCall(bookingId: string, rejecterId: string): Promise<void> {
    const bookingRef = doc(db, "bookings", bookingId);
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists()) throw new Error("Booking not found");
    const booking = bookingSnap.data() as Booking;

    if (booking.patientId !== rejecterId && booking.professionalId !== rejecterId) {
      throw new Error("Unauthorized to reject call");
    }

    await updateDoc(bookingRef, {
      status: "rejected_during_call",
      cancelReason: `Call rejected by ${rejecterId === booking.professionalId ? 'Professional' : 'Patient'}.`,
      callEndedAt: Date.now(),
      currentCallId: null,
      updatedAt: Date.now(),
    });
    
    await soundManager.play('dispute');
  },
  
  // ==================== CALL INITIATION ====================
  
  async initiateCall(bookingId: string, professionalId: string): Promise<string> {
    const bookingRef = doc(db, "bookings", bookingId);
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists()) throw new Error("Booking not found");
    
    const booking = bookingSnap.data() as Booking; 

    if (booking.professionalId !== professionalId) throw new Error("Unauthorized");

    const profDoc = await getDoc(doc(db, "users", professionalId));
    const patDoc = await getDoc(doc(db, "users", booking.patientId));
    const profData = profDoc.data();
    const patData = patDoc.data();

    const callId = await createCallSession(
      bookingId,
      professionalId,
      booking.patientId,
      profData?.name || "Professional",
      patData?.name || "Patient"
    );

    await updateDoc(bookingRef, {
      status: "in_progress",
      currentCallId: callId,
      callInitiatedBy: professionalId,
      callStartedAt: Date.now(),
      sessionExpiresAt: Date.now() + (30 * 60 * 1000), 
      canStartCall: false, 
      updatedAt: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 2000));
    await updateDoc(bookingRef, { canStartCall: true });
    await new Promise(resolve => setTimeout(resolve, 1000));

    await notificationService.sendIncomingCallNotification({
      callId: callId,
      bookingId: bookingId,
      callerName: profData?.name || "Professional",
      callerImage: profData?.imageUrl,
      callerId: professionalId,
      receiverId: booking.patientId,
      createdAt: Date.now(),
      isEmergency: !!booking.isEmergency,
    });

    return callId;
  },

  async joinCall(bookingId: string, patientId: string): Promise<string> {
    const bookingRef = doc(db, "bookings", bookingId);
    const bookingSnap = await getDoc(bookingRef);
    const booking = bookingSnap.data() as Booking; 

    if (!booking) throw new Error("Booking not found");
    if (!booking.currentCallId) throw new Error("No active call");
    if (!booking.canStartCall) throw new Error("Call not ready");

    return booking.currentCallId;
  },

  async completeBooking(bookingId: string, walletService: any): Promise<void> {
    const bookingRef = doc(db, "bookings", bookingId);
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists()) throw new Error("Booking not found");
    const booking = bookingSnap.data() as Booking;

    await updateDoc(bookingRef, {
      status: "completed",
      callEndedAt: Date.now(),
      currentCallId: null,
      updatedAt: Date.now(),
    });

    if (walletService) {
        await walletService.releaseHeldPayment(booking.professionalId, booking.patientId, booking.fee, {
            description: "Consultation completed"
        });
    }
    
    await soundManager.play('delivered');
    await this.incrementConsultationsCompleted(booking.professionalId);
    await this.updateQueueCount(booking.professionalId);
    await this.updateQueuePositions(booking.professionalId, booking.date);
  },

  // ==================== BOOKINGS RETRIEVAL ====================
  
  async getPatientBookings(patientId: string): Promise<Booking[]> {
    const q = query(
      collection(db, "bookings"),
      where("patientId", "==", patientId),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as Booking);
  },

  async getProfessionalBookings(professionalId: string): Promise<Booking[]> {
    const q = query(
      collection(db, "bookings"),
      where("professionalId", "==", professionalId),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as Booking);
  },
  
  async getCallHistory(userId: string, role: "patient" | "professional"): Promise<Booking[]> {
    const q = query(
      collection(db, "bookings"),
      where(role === "patient" ? "patientId" : "professionalId", "==", userId),
      where("status", "==", "completed"),
      orderBy("callEndedAt", "desc")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as Booking);
  },

  // ==================== QUEUE MANAGEMENT ====================
  
  async updateQueueCount(professionalId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, "bookings"),
      where("professionalId", "==", professionalId),
      where("date", "==", today),
      where("status", "in", ["confirmed", "ready"])
    );
    const snapshot = await getDocs(q);
    
    await updateDoc(doc(db, "users", professionalId), {
      currentQueue: snapshot.size,
      updatedAt: Date.now(),
    });
  },

  async updateQueuePositions(professionalId: string, date: string): Promise<void> {
    const q = query(
      collection(db, "bookings"),
      where("professionalId", "==", professionalId),
      where("date", "==", date),
      where("status", "in", ["confirmed", "ready"]),
      orderBy("scheduledTimestamp", "asc")
    );
    
    const snapshot = await getDocs(q);
    const updates: Promise<void>[] = [];

    snapshot.docs.forEach((docSnap, index) => {
      updates.push(
        updateDoc(doc(db, "bookings", docSnap.id), {
          queuePosition: index + 1,
        }))
    });

    await Promise.all(updates);
  },
  
  // ==================== REAL-TIME LISTENERS ====================

  listenToBooking(bookingId: string, callback: (booking: Booking) => void) {
    return onSnapshot(doc(db, "bookings", bookingId), (snap) => {
      if (snap.exists()) {
        callback(snap.data() as Booking);
      }
    });
  },
  
  listenToQueue(professionalId: string, date: string, callback: (queue: Booking[]) => void) {
    const q = query(
      collection(db, "bookings"),
      where("professionalId", "==", professionalId),
      where("date", "==", date),
      where("status", "in", ["confirmed", "ready"]),
      orderBy("queuePosition", "asc")
    );

    return onSnapshot(q, (snapshot) => {
      const queue = snapshot.docs.map((doc) => doc.data() as Booking);
      callback(queue);
    });
  },

  // ==================== BACKGROUND TASKS & REMINDERS ====================
  
  async runBackgroundTasks() {
    await this.checkAndEnableReadyBookings();
    await this.checkAndExpireEmergencyBookings();
    await this.checkAndSendReminders();
  },

  async enableCallForBooking(bookingId: string): Promise<void> {
    await updateDoc(doc(db, "bookings", bookingId), {
      canStartCall: true,
      status: "ready",
      updatedAt: Date.now(),
    });
  },

  async checkAndEnableReadyBookings(): Promise<void> {
    const now = Date.now();
    const bufferTime = 15 * 60 * 1000;
    const upcomingQuery = query(collection(db, "bookings"), where("status", "==", "confirmed"));
    const snapshot = await getDocs(upcomingQuery);
    
    for (const docSnap of snapshot.docs) {
      const booking = docSnap.data() as Booking;
      if (booking.scheduledTimestamp && booking.scheduledTimestamp - now <= bufferTime && booking.scheduledTimestamp > now) {
        await this.enableCallForBooking(booking.id);
      }
    }
  },

  async checkAndExpireEmergencyBookings(): Promise<void> {
    const now = Date.now();
    const emergencyQuery = query(collection(db, "bookings"), where("status", "==", "emergency_pending"));
    const snapshot = await getDocs(emergencyQuery);
    
    for (const docSnap of snapshot.docs) {
      const booking = docSnap.data() as Booking;
      if (booking.emergencyDeadline && now > booking.emergencyDeadline) {
        await updateDoc(doc(db, "bookings", booking.id), {
          status: "rejected",
          cancelReason: "Professional did not respond within 10 minutes",
          updatedAt: now,
        });
      }
    }
  },
  
  async scheduleReminder(bookingId: string, patientId: string, professionalId: string, scheduledTime: number): Promise<void> {
    const reminderTime = scheduledTime - (15 * 60 * 1000);
    if (reminderTime > Date.now()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Consultation Reminder",
          body: "Your consultation starts in 15 minutes!",
          sound: true,
        },
        trigger: new Date(reminderTime), 
      });
    }
  },

  async checkAndSendReminders(): Promise<void> {
    const now = Date.now();
    const reminderWindow = 20 * 60 * 1000;
    const upcomingQuery = query(
      collection(db, "bookings"),
      where("status", "==", "confirmed"),
      where("reminderSent", "==", false),
      orderBy("scheduledTimestamp", "asc")
    );

    const snapshot = await getDocs(upcomingQuery);
    
    for (const docSnap of snapshot.docs) {
      const booking = docSnap.data() as Booking;
      if (booking.scheduledTimestamp && booking.scheduledTimestamp - now <= reminderWindow && booking.scheduledTimestamp > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Consultation Starting Soon!",
            body: `Your consultation starts in ${Math.ceil((booking.scheduledTimestamp - now) / 60000)} minutes.`,
            sound: true,
          },
          trigger: null,
        });

        await updateDoc(doc(db, "bookings", booking.id), {
          reminderSent: true,
          updatedAt: Date.now(),
        });
      }
    }
  },
};