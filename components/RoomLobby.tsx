import React, { useState } from 'react';
import { Users, Plus, LogIn } from 'lucide-react';

interface RoomLobbyProps {
  onCreateRoom: (name: string, password?: string) => Promise<string>;
  onJoinRoom: (roomId: string, password?: string) => Promise<void>;
  isCreating: boolean;
  isJoining: boolean;
  error: string;
}

export const RoomLobby: React.FC<RoomLobbyProps> = ({
  onCreateRoom,
  onJoinRoom,
  isCreating,
  isJoining,
  error,
}) => {
  const [roomName, setRoomName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [isCreateMode, setIsCreateMode] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreateMode) {
      if (!roomName.trim()) return;
      try {
        await onCreateRoom(roomName, password || undefined);
      } catch (err) {
        // Error handled in parent
      }
    } else {
      if (!roomId.trim()) return;
      try {
        await onJoinRoom(roomId, password || undefined);
      } catch (err) {
        // Error handled in parent
      }
    }
  };

  return (
    <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl max-w-md w-full border border-slate-700 animate-[fadeIn_0.5s_ease-out]">
      <div className="flex items-center justify-center mb-6">
        <Users className="w-8 h-8 text-emerald-400 mr-2" />
        <h3 className="text-xl font-bold text-white">Room Chat & Share</h3>
      </div>

      <div className="flex mb-6 bg-slate-700 rounded-lg p-1">
        <button
          onClick={() => setIsCreateMode(true)}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
            isCreateMode ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
          }`}
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Create
        </button>
        <button
          onClick={() => setIsCreateMode(false)}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
            !isCreateMode ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
          }`}
        >
          <LogIn className="w-4 h-4 inline mr-2" />
          Join
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isCreateMode ? (
          <>
            <div>
              <input
                type="text"
                placeholder="Room Name"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                required
              />
              <p className="text-xs text-slate-500 mt-1">e.g., Team Project, Family Chat</p>
            </div>
            <div>
              <input
                type="password"
                placeholder="Optional Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">Leave empty for open room</p>
            </div>
          </>
        ) : (
          <>
            <div>
              <input
                type="text"
                placeholder="Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                required
              />
              <p className="text-xs text-slate-500 mt-1">e.g., a1b2c3d4</p>
            </div>
            <div>
              <input
                type="password"
                placeholder="Password (if required)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">Leave empty if room is open</p>
            </div>
          </>
        )}

        {error && (
          <div className="text-red-400 text-sm text-center">{error}</div>
        )}

        <button
          type="submit"
          disabled={isCreating || isJoining}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center"
        >
          {isCreating || isJoining ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            isCreateMode ? 'Create Room' : 'Join Room'
          )}
        </button>
      </form>
    </div>
  );
};