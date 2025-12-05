// services/professionalService.ts
import { db } from "../lib/firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { ProfessionalType, User } from "./firebaseService";

export interface Professional extends User {
  professionalType: ProfessionalType;
  specialization?: string;
  professionalLicense?: string;
  yearsOfExperience?: number;
  consultationFee?: number;
  availability?: string[];
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
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  fee: number;
  queuePosition?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ConsultationMessage {
  id: string;
  bookingId: string;
  senderId: string;
  senderName: string;
  senderRole: "professional" | "patient";
  text: string;
  timestamp: number;
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

export const professionalService = {
  // ==================== PROFESSIONALS ====================
  
  async getAllProfessionals(): Promise<Professional[]> {
    const q = query(
      collection(db, "users"),
      where("role", "==", "professional")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as Professional);
  },

  async getProfessionalsByType(type: ProfessionalType): Promise<Professional[]> {
    const q = query(
      collection(db, "users"),
      where("role", "==", "professional"),
      where("professionalType", "==", type)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as Professional);
  },

  async getProfessional(professionalId: string): Promise<Professional | null> {
    const snap = await getDoc(doc(db, "users", professionalId));
    return snap.exists() ? (snap.data() as Professional) : null;
  },

  async updateProfessionalStatus(
    professionalId: string,
    isOnline: boolean
  ): Promise<void> {
    await updateDoc(doc(db, "users", professionalId), {
      isOnline,
      updatedAt: Date.now(),
    });
  },

  async updateProfessionalProfile(
    professionalId: string,
    data: Partial<Professional>
  ): Promise<void> {
    const updateData: any = {
      ...data,
      updatedAt: Date.now(),
    };

    await updateDoc(doc(db, "users", professionalId), updateData);
  },

  // ==================== BOOKINGS ====================

  async createBooking(bookingData: Omit<Booking, "id" | "createdAt" | "updatedAt">): Promise<Booking> {
    // Get current queue position
    const queueQuery = query(
      collection(db, "bookings"),
      where("professionalId", "==", bookingData.professionalId),
      where("status", "in", ["pending", "confirmed", "in_progress"])
    );
    const queueSnapshot = await getDocs(queueQuery);
    const queuePosition = queueSnapshot.size + 1;

    const booking: Omit<Booking, "id"> = {
      ...bookingData,
      queuePosition,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const ref = await addDoc(collection(db, "bookings"), booking);
    await updateDoc(ref, { id: ref.id });

    // Update professional's queue count
    await this.updateQueueCount(bookingData.professionalId);

    const snap = await getDoc(ref);
    return snap.data() as Booking;
  },

  async getBooking(bookingId: string): Promise<Booking | null> {
    const snap = await getDoc(doc(db, "bookings", bookingId));
    return snap.exists() ? (snap.data() as Booking) : null;
  },

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

  async updateBookingStatus(
    bookingId: string,
    status: Booking["status"]
  ): Promise<void> {
    const bookingRef = doc(db, "bookings", bookingId);
    const bookingSnap = await getDoc(bookingRef);
    
    if (!bookingSnap.exists()) {
      throw new Error("Booking not found");
    }

    await updateDoc(bookingRef, {
      status,
      updatedAt: Date.now(),
    });

    const booking = bookingSnap.data() as Booking;
    
    // Update queue count
    if (status === "completed" || status === "cancelled") {
      await this.updateQueueCount(booking.professionalId);
    }
  },

  async cancelBooking(bookingId: string, reason?: string): Promise<void> {
    await updateDoc(doc(db, "bookings", bookingId), {
      status: "cancelled",
      cancelReason: reason,
      updatedAt: Date.now(),
    });
  },

  async updateQueueCount(professionalId: string): Promise<void> {
    const q = query(
      collection(db, "bookings"),
      where("professionalId", "==", professionalId),
      where("status", "in", ["pending", "confirmed", "in_progress"])
    );
    const snapshot = await getDocs(q);
    
    await updateDoc(doc(db, "users", professionalId), {
      currentQueue: snapshot.size,
    });
  },

  // ==================== CONSULTATION CHAT ====================

  async sendMessage(
    bookingId: string,
    senderId: string,
    senderName: string,
    senderRole: "professional" | "patient",
    text: string
  ): Promise<string> {
    const message: Omit<ConsultationMessage, "id"> = {
      bookingId,
      senderId,
      senderName,
      senderRole,
      text: text.trim(),
      timestamp: Date.now(),
    };

    const ref = await addDoc(
      collection(db, "bookings", bookingId, "messages"),
      message
    );

    return ref.id;
  },

  listenToMessages(
    bookingId: string,
    callback: (messages: ConsultationMessage[]) => void
  ) {
    const q = query(
      collection(db, "bookings", bookingId, "messages"),
      orderBy("timestamp", "asc")
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ConsultationMessage[];
      callback(messages);
    });
  },

  // ==================== REVIEWS ====================

  async createReview(
    reviewData: Omit<Review, "id" | "createdAt">
  ): Promise<void> {
    const review: Omit<Review, "id"> = {
      ...reviewData,
      createdAt: Date.now(),
    };

    await addDoc(collection(db, "reviews"), review);

    // Update professional's rating
    await this.updateProfessionalRating(reviewData.professionalId);
  },

  async getProfessionalReviews(professionalId: string): Promise<Review[]> {
    const q = query(
      collection(db, "reviews"),
      where("professionalId", "==", professionalId),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Review[];
  },

  async updateProfessionalRating(professionalId: string): Promise<void> {
    const reviews = await this.getProfessionalReviews(professionalId);
    
    if (reviews.length === 0) return;

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    await updateDoc(doc(db, "users", professionalId), {
      rating: Math.round(averageRating * 10) / 10,
      reviewCount: reviews.length,
    });
  },

  // ==================== AVAILABILITY ====================

  async updateAvailability(
    professionalId: string,
    availability: string[]
  ): Promise<void> {
    await updateDoc(doc(db, "users", professionalId), {
      availability,
      updatedAt: Date.now(),
    });
  },

  async getAvailableSlots(
    professionalId: string,
    date: string
  ): Promise<string[]> {
    // Get all bookings for this professional on this date
    const q = query(
      collection(db, "bookings"),
      where("professionalId", "==", professionalId),
      where("date", "==", date),
      where("status", "in", ["pending", "confirmed", "in_progress"])
    );
    
    const snapshot = await getDocs(q);
    const bookedSlots = snapshot.docs.map((doc) => doc.data().time);

    // Define all possible time slots
    const allSlots = [
      "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
      "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
      "05:00 PM", "05:30 PM"
    ];

    // Return slots that aren't booked
    return allSlots.filter((slot) => !bookedSlots.includes(slot));
  },

  // ==================== STATISTICS ====================

  async getProfessionalStats(professionalId: string) {
    const bookingsQuery = query(
      collection(db, "bookings"),
      where("professionalId", "==", professionalId)
    );
    const bookingsSnapshot = await getDocs(bookingsQuery);
    const bookings = bookingsSnapshot.docs.map((doc) => doc.data() as Booking);

    const completed = bookings.filter((b) => b.status === "completed").length;
    const cancelled = bookings.filter((b) => b.status === "cancelled").length;
    const totalEarnings = bookings
      .filter((b) => b.status === "completed")
      .reduce((sum, b) => sum + b.fee, 0);

    const reviews = await this.getProfessionalReviews(professionalId);
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    return {
      totalBookings: bookings.length,
      completedConsultations: completed,
      cancelledConsultations: cancelled,
      totalEarnings,
      averageRating: Math.round(averageRating * 10) / 10,
      reviewCount: reviews.length,
    };
  },

  // ==================== SEARCH & FILTER ====================

  async searchProfessionals(searchTerm: string): Promise<Professional[]> {
    const allProfessionals = await this.getAllProfessionals();
    
    const lowerSearch = searchTerm.toLowerCase();
    
    return allProfessionals.filter((prof) => {
      return (
        prof.name.toLowerCase().includes(lowerSearch) ||
        prof.specialization?.toLowerCase().includes(lowerSearch) ||
        prof.professionalType.toLowerCase().includes(lowerSearch)
      );
    });
  },

  async getOnlineProfessionals(): Promise<Professional[]> {
    const q = query(
      collection(db, "users"),
      where("role", "==", "professional"),
      where("isOnline", "==", true)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as Professional);
  },

  // ==================== NOTIFICATIONS ====================

  async notifyProfessionalNewBooking(
    professionalId: string,
    booking: Booking
  ): Promise<void> {
    // Send notification to professional
    // This would integrate with your push notification service
    console.log(`Notifying ${professionalId} of new booking: ${booking.id}`);
  },

  async notifyPatientBookingUpdate(
    patientId: string,
    booking: Booking,
    message: string
  ): Promise<void> {
    // Send notification to patient
    console.log(`Notifying ${patientId}: ${message}`);
  },
};