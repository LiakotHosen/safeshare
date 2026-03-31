export enum TransferState {
  IDLE = 'IDLE',
  GENERATING_LINK = 'GENERATING_LINK',
  WAITING_FOR_PEER = 'WAITING_FOR_PEER',
  CONNECTED = 'CONNECTED',
  AWAITING_PASSWORD = 'AWAITING_PASSWORD',
  TRANSFERRING = 'TRANSFERRING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export enum Role {
  SENDER = 'SENDER',
  RECEIVER = 'RECEIVER'
}

export enum RoomState {
  IDLE = 'IDLE',
  CREATING_ROOM = 'CREATING_ROOM',
  JOINING_ROOM = 'JOINING_ROOM',
  IN_ROOM = 'IN_ROOM',
  TRANSFERRING = 'TRANSFERRING',
  ERROR = 'ERROR'
}

export interface RoomParticipant {
  id: string;
  name?: string;
  joinedAt: number;
  isCreator?: boolean;
}

export interface Room {
  id: string;
  name: string;
  participants: Record<string, RoomParticipant>;
  createdAt: number;
  lastActivity: number;
  password?: string; // Optional room password
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName?: string;
  message: string;
  timestamp: number;
}

export interface SignalingData {
  type: 'offer' | 'answer' | 'candidate';
  from: string;
  to: string;
  data: any; // SDP or ICE candidate
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  protected?: boolean;
}

export interface SpeedDataPoint {
  time: string;
  speed: number; // MB/s
}

export interface PeerMessage {
  type: 'METADATA' | 'CHUNK' | 'EOF' | 'PASSWORD_ATTEMPT' | 'PASSWORD_RESULT';
  name?: string;
  size?: number;
  fileType?: string;
  data?: ArrayBuffer;
  protected?: boolean;
  payload?: string; // Used for password attempt
  success?: boolean; // Used for password result
}