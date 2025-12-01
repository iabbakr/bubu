// services/supportChatService.ts

export interface SupportMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderRole: "admin" | "buyer" | "seller" | "support_agent";
  senderName: string;
  message: string;
  timestamp: number;
  isRead: boolean;
  attachments?: string[];
}

export interface SupportChat {
  id: string;
  userId: string;
  userName: string;
  userRole: "buyer" | "seller";
  userEmail: string;
  status: "waiting" | "active" | "resolved" | "closed";
  assignedAdminId?: string;
  assignedAdminName?: string;
  subject: string;
  priority: "low" | "normal" | "high";
  queuePosition?: number;
  unreadCount: number;
  lastMessage?: string;
  lastMessageTime?: number;
  createdAt: number;
  resolvedAt?: number;
  rating?: number;
  feedback?: string;
}

export interface ChatQueue {
  position: number;
  estimatedWaitTime: number; // in minutes
  activeChats: number;
}

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
  onSnapshot,
  orderBy,
  limit,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export const supportChatService = {
  // -----------------------------
  // USER FUNCTIONS
  // -----------------------------

  // Create a new support chat
  async createSupportChat(
    userId: string,
    userName: string,
    userRole: "buyer" | "seller",
    userEmail: string,
    subject: string,
    initialMessage: string
  ): Promise<string> {
    // Check if user already has an active chat
    const existingChat = await this.getUserActiveChat(userId);
    if (existingChat) {
      throw new Error("You already have an active support chat. Please close it before starting a new one.");
    }

    // Count waiting chats to determine queue position
    const waitingChatsSnapshot = await getDocs(
      query(collection(db, "supportChats"), where("status", "==", "waiting"))
    );
    const queuePosition = waitingChatsSnapshot.size + 1;

    // Create chat document
    const chatRef = await addDoc(collection(db, "supportChats"), {
      userId,
      userName,
      userRole,
      userEmail,
      status: "waiting",
      subject,
      priority: "normal",
      queuePosition,
      unreadCount: 0,
      createdAt: Date.now(),
    });

    await updateDoc(chatRef, { id: chatRef.id });

    // Send initial message
    await this.sendMessage(
      chatRef.id,
      userId,
      userRole,
      userName,
      initialMessage
    );

    return chatRef.id;
  },

  // Get user's active chat
  async getUserActiveChat(userId: string): Promise<SupportChat | null> {
    const q = query(
      collection(db, "supportChats"),
      where("userId", "==", userId),
      where("status", "in", ["waiting", "active"])
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    return snapshot.docs[0].data() as SupportChat;
  },

  // Get queue information for user
  async getQueueInfo(chatId: string): Promise<ChatQueue> {
    const chatDoc = await getDoc(doc(db, "supportChats", chatId));
    if (!chatDoc.exists()) throw new Error("Chat not found");

    const chat = chatDoc.data() as SupportChat;

    // Count active chats
    const activeChatsSnapshot = await getDocs(
      query(collection(db, "supportChats"), where("status", "==", "active"))
    );
    const activeChats = activeChatsSnapshot.size;

    // Get queue position
    const waitingChatsSnapshot = await getDocs(
      query(
        collection(db, "supportChats"),
        where("status", "==", "waiting"),
        where("createdAt", "<", chat.createdAt)
      )
    );
    const position = waitingChatsSnapshot.size + 1;

    // Estimate wait time (5 minutes per person in queue)
    const estimatedWaitTime = position * 5;

    return {
      position,
      estimatedWaitTime,
      activeChats,
    };
  },

  // Send message
  async sendMessage(
    chatId: string,
    senderId: string,
    senderRole: "admin" | "buyer" | "seller" | "support_agent",
    senderName: string,
    message: string,
    attachments?: string[]
  ): Promise<void> {
    const messageData: Omit<SupportMessage, "id"> = {
      chatId,
      senderId,
      senderRole,
      senderName,
      message: message.trim(),
      timestamp: Date.now(),
      isRead: false,
      attachments: attachments  ?? [],
    };

    const messageRef = await addDoc(
      collection(db, "supportChats", chatId, "messages"),
      messageData
    );

    await updateDoc(doc(db, "supportChats", chatId, "messages", messageRef.id), {
      id: messageRef.id,
    });

    // Update chat's last message
    await updateDoc(doc(db, "supportChats", chatId), {
      lastMessage: message.substring(0, 100),
      lastMessageTime: Date.now(),
      unreadCount: senderRole !== "admin" ? 1 : 0,
    });
  },

  // Mark messages as read
  async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    const messagesSnapshot = await getDocs(
      query(
        collection(db, "supportChats", chatId, "messages"),
        where("isRead", "==", false),
        where("senderId", "!=", userId)
      )
    );

    const updates = messagesSnapshot.docs.map((doc) =>
      updateDoc(doc.ref, { isRead: true })
    );

    await Promise.all(updates);

    await updateDoc(doc(db, "supportChats", chatId), {
      unreadCount: 0,
    });
  },

  // Rate and close chat
  async closeChat(
    chatId: string,
    rating?: number,
    feedback?: string
  ): Promise<void> {
    const updates: any = {
      status: "closed",
      resolvedAt: Date.now(),
    };

    if (rating) updates.rating = rating;
    if (feedback) updates.feedback = feedback;

    await updateDoc(doc(db, "supportChats", chatId), updates);
  },

  // -----------------------------
  // ADMIN FUNCTIONS
  // -----------------------------

  // Get all chats for admin dashboard
  async getAllChats(status?: SupportChat["status"]): Promise<SupportChat[]> {
    let q;
    if (status) {
      q = query(
        collection(db, "supportChats"),
        where("status", "==", status),
        orderBy("createdAt", "desc")
      );
    } else {
      q = query(collection(db, "supportChats"), orderBy("createdAt", "desc"));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as SupportChat);
  },

  // Assign chat to admin
  async assignChatToAdmin(
    chatId: string,
    adminId: string,
    adminName: string
  ): Promise<void> {
    await updateDoc(doc(db, "supportChats", chatId), {
      status: "active",
      assignedAdminId: adminId,
      assignedAdminName: adminName,
      queuePosition: null,
    });

    // Update queue positions for remaining waiting chats
    await this.updateQueuePositions();
  },

  // Update queue positions after a chat is assigned
  async updateQueuePositions(): Promise<void> {
    const waitingChatsSnapshot = await getDocs(
      query(
        collection(db, "supportChats"),
        where("status", "==", "waiting"),
        orderBy("createdAt", "asc")
      )
    );

    const updates = waitingChatsSnapshot.docs.map((doc, index) =>
      updateDoc(doc.ref, { queuePosition: index + 1 })
    );

    await Promise.all(updates);
  },

  // Resolve chat
  async resolveChat(chatId: string, adminNotes?: string): Promise<void> {
    const updates: any = {
      status: "resolved",
      resolvedAt: Date.now(),
    };

    if (adminNotes) updates.adminNotes = adminNotes;

    await updateDoc(doc(db, "supportChats", chatId), updates);
  },

  // Transfer chat to another admin
  async transferChat(
    chatId: string,
    newAdminId: string,
    newAdminName: string
  ): Promise<void> {
    await updateDoc(doc(db, "supportChats", chatId), {
      assignedAdminId: newAdminId,
      assignedAdminName: newAdminName,
    });
  },

  // Get admin statistics
  async getAdminStats(adminId: string) {
    const activeChatsSnapshot = await getDocs(
      query(
        collection(db, "supportChats"),
        where("assignedAdminId", "==", adminId),
        where("status", "==", "active")
      )
    );

    const resolvedTodaySnapshot = await getDocs(
      query(
        collection(db, "supportChats"),
        where("assignedAdminId", "==", adminId),
        where("status", "==", "resolved"),
        where("resolvedAt", ">", Date.now() - 24 * 60 * 60 * 1000)
      )
    );

    const allResolvedSnapshot = await getDocs(
      query(
        collection(db, "supportChats"),
        where("assignedAdminId", "==", adminId),
        where("status", "==", "resolved")
      )
    );

    // Calculate average rating
    const ratedChats = allResolvedSnapshot.docs.filter(
      (doc) => doc.data().rating
    );
    const avgRating =
      ratedChats.length > 0
        ? ratedChats.reduce((sum, doc) => sum + (doc.data().rating || 0), 0) /
          ratedChats.length
        : 0;

    return {
      activeChats: activeChatsSnapshot.size,
      resolvedToday: resolvedTodaySnapshot.size,
      totalResolved: allResolvedSnapshot.size,
      averageRating: avgRating,
    };
  },

  // -----------------------------
  // REAL-TIME LISTENERS
  // -----------------------------

  // Listen to chat messages
  listenToMessages(chatId: string, callback: (messages: SupportMessage[]) => void) {
    const q = query(
      collection(db, "supportChats", chatId, "messages"),
      orderBy("timestamp", "asc")
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map((doc) => doc.data() as SupportMessage);
      callback(messages);
    });
  },

  // Listen to chat updates
  listenToChat(chatId: string, callback: (chat: SupportChat) => void) {
    return onSnapshot(doc(db, "supportChats", chatId), (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as SupportChat);
      }
    });
  },

  // Listen to all chats (for admin)
  listenToAllChats(callback: (chats: SupportChat[]) => void) {
    const q = query(
      collection(db, "supportChats"),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map((doc) => doc.data() as SupportChat);
      callback(chats);
    });
  },

  // Listen to waiting chats count
  listenToWaitingChats(callback: (count: number) => void) {
    const q = query(
      collection(db, "supportChats"),
      where("status", "==", "waiting")
    );

    return onSnapshot(q, (snapshot) => {
      callback(snapshot.size);
    });
  },
};