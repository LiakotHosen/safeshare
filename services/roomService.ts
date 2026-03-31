import { ref, set, get, onValue, off, push, update, remove } from 'firebase/database';
import { database } from './firebase';
import { Room, RoomParticipant, ChatMessage, SignalingData } from '../types';

// Generate a unique room ID
export function generateRoomId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Create a new room in Firebase
export async function createRoom(roomName: string, creatorId: string, creatorName?: string, password?: string): Promise<string> {
  const roomId = generateRoomId();
  const roomRef = ref(database, `rooms/${roomId}`);
  const now = Date.now();

  const room: Room = {
    id: roomId,
    name: roomName,
    participants: {
      [creatorId]: {
        id: creatorId,
        name: creatorName,
        joinedAt: now,
        isCreator: true,
      },
    },
    createdAt: now,
    lastActivity: now,
    ...(password && { password }), // Only include password if provided
  };

  await set(roomRef, room);
  return roomId;
}

// Join an existing room
export async function joinRoom(roomId: string, userId: string, userName?: string, password?: string): Promise<Room | null> {
  const roomRef = ref(database, `rooms/${roomId}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    throw new Error('Room not found');
  }

  const room = snapshot.val() as Room;

  // Check password if room is protected
  if (room.password && room.password !== password) {
    throw new Error('Incorrect password');
  }

  // Add participant
  const now = Date.now();
  const participant: RoomParticipant = {
    id: userId,
    name: userName,
    joinedAt: now,
  };

  const updates = {
    [`participants/${userId}`]: participant,
    lastActivity: now,
  };

  await update(roomRef, updates);
  return { ...room, participants: { ...room.participants, [userId]: participant } };
}

// Leave room
export async function leaveRoom(roomId: string, userId: string): Promise<void> {
  const participantRef = ref(database, `rooms/${roomId}/participants/${userId}`);
  await remove(participantRef);

  // Update last activity
  const activityRef = ref(database, `rooms/${roomId}/lastActivity`);
  await set(activityRef, Date.now());
}

// Send a chat message
export async function sendMessage(roomId: string, message: ChatMessage): Promise<void> {
  const messagesRef = ref(database, `rooms/${roomId}/messages`);
  const newMessageRef = push(messagesRef);
  await set(newMessageRef, message);

  // Update last activity
  const activityRef = ref(database, `rooms/${roomId}/lastActivity`);
  await set(activityRef, Date.now());
}

// Listen for room updates
export function listenForRoomUpdates(roomId: string, callback: (room: Room | null) => void): () => void {
  const roomRef = ref(database, `rooms/${roomId}`);
  const unsubscribe = onValue(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as Room);
    } else {
      callback(null);
    }
  });
  return () => off(roomRef, 'value', unsubscribe);
}

// Listen for messages
export function listenForMessages(roomId: string, callback: (messages: ChatMessage[]) => void): () => void {
  const messagesRef = ref(database, `rooms/${roomId}/messages`);
  const unsubscribe = onValue(messagesRef, (snapshot) => {
    const messages: ChatMessage[] = [];
    snapshot.forEach((child) => {
      messages.push(child.val() as ChatMessage);
    });
    callback(messages);
  });
  return () => off(messagesRef, 'value', unsubscribe);
}

// Signaling functions for WebRTC
export async function sendSignalingData(roomId: string, data: SignalingData): Promise<void> {
  const signalingRef = ref(database, `rooms/${roomId}/signaling`);
  const newDataRef = push(signalingRef);
  await set(newDataRef, data);

  // Update last activity
  const activityRef = ref(database, `rooms/${roomId}/lastActivity`);
  await set(activityRef, Date.now());
}

// Listen for signaling data
export function listenForSignaling(roomId: string, userId: string, callback: (data: SignalingData) => void): () => void {
  const signalingRef = ref(database, `rooms/${roomId}/signaling`);
  const unsubscribe = onValue(signalingRef, (snapshot) => {
    snapshot.forEach((child) => {
      const data = child.val() as SignalingData;
      if (data.to === userId || data.to === 'all') {
        callback(data);
        // Optionally remove after processing
        remove(child.ref);
      }
    });
  });
  return () => off(signalingRef, 'value', unsubscribe);
}

// Delete room (for cleanup)
export async function deleteRoom(roomId: string): Promise<void> {
  const roomRef = ref(database, `rooms/${roomId}`);
  await remove(roomRef);
}