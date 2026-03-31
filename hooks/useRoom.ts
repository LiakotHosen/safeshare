import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ref, get } from 'firebase/database';
import { database } from '../services/firebase';
import { Room, RoomState, RoomParticipant, ChatMessage, SignalingData } from '../types';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  sendMessage,
  listenForRoomUpdates,
  listenForMessages,
  sendSignalingData,
  listenForSignaling,
} from '../services/roomService';

export function useRoom() {
  const [roomState, setRoomState] = useState<RoomState>(RoomState.IDLE);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [userId] = useState<string>(() => uuidv4()); // Unique user ID
  const [userName, setUserName] = useState<string>('Anonymous');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string>('');

  const roomListenersRef = useRef<(() => void)[]>([]);
  const signalingListenersRef = useRef<(() => void)[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      roomListenersRef.current.forEach(unsub => unsub());
      signalingListenersRef.current.forEach(unsub => unsub());
      if (currentRoom) {
        leaveRoom(currentRoom.id, userId);
      }
    };
  }, [currentRoom, userId]);

  const createNewRoom = useCallback(async (roomName: string, password?: string) => {
    try {
      setRoomState(RoomState.CREATING_ROOM);
      const roomId = await createRoom(roomName, userId, userName, password);
      // Fetch the created room and set it
      const roomRef = ref(database, `rooms/${roomId}`);
      const roomSnap = await get(roomRef);
      const room = roomSnap.val() as Room;
      setCurrentRoom(room);
      setRoomState(RoomState.IN_ROOM);
      setupListeners(roomId);
      return roomId;
    } catch (err) {
      setError('Failed to create room');
      setRoomState(RoomState.ERROR);
      throw err;
    }
  }, [userId, userName]);

  const joinExistingRoom = useCallback(async (roomId: string, password?: string) => {
    try {
      setRoomState(RoomState.JOINING_ROOM);
      const room = await joinRoom(roomId, userId, userName, password);
      if (room) {
        setCurrentRoom(room);
        setRoomState(RoomState.IN_ROOM);
        setupListeners(roomId);
      } else {
        throw new Error('Room not found');
      }
    } catch (err) {
      setError('Failed to join room');
      setRoomState(RoomState.ERROR);
      throw err;
    }
  }, [userId, userName]);

  const setupListeners = useCallback((roomId: string) => {
    // Room updates
    const roomUnsub = listenForRoomUpdates(roomId, (room) => {
      if (room) {
        setCurrentRoom(room);
      } else {
        setCurrentRoom(null);
        setRoomState(RoomState.IDLE);
      }
    });
    roomListenersRef.current.push(roomUnsub);

    // Messages
    const msgUnsub = listenForMessages(roomId, (msgs) => {
      setMessages(msgs.sort((a, b) => a.timestamp - b.timestamp));
    });
    roomListenersRef.current.push(msgUnsub);

    // Signaling
    const sigUnsub = listenForSignaling(roomId, userId, (data) => {
      handleSignalingData(data);
    });
    signalingListenersRef.current.push(sigUnsub);
  }, [userId]);

  const handleSignalingData = useCallback((data: SignalingData) => {
    // Handle WebRTC signaling
    // This will be expanded later
    console.log('Signaling data received:', data);
  }, []);

  const sendChatMessage = useCallback(async (message: string) => {
    if (!currentRoom) return;
    const chatMsg: ChatMessage = {
      id: uuidv4(),
      senderId: userId,
      senderName: userName,
      message,
      timestamp: Date.now(),
    };
    await sendMessage(currentRoom.id, chatMsg);
  }, [currentRoom, userId, userName]);

  const exitRoom = useCallback(async () => {
    if (currentRoom) {
      await leaveRoom(currentRoom.id, userId);
      setCurrentRoom(null);
      setMessages([]);
      setRoomState(RoomState.IDLE);
      // Cleanup listeners
      roomListenersRef.current.forEach(unsub => unsub());
      signalingListenersRef.current.forEach(unsub => unsub());
      roomListenersRef.current = [];
      signalingListenersRef.current = [];
    }
  }, [currentRoom, userId]);

  return {
    roomState,
    currentRoom,
    userId,
    userName,
    setUserName,
    messages,
    error,
    createNewRoom,
    joinExistingRoom,
    sendChatMessage,
    exitRoom,
  };
}