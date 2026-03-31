import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Users, Copy, Share2, Upload } from 'lucide-react';
import { ChatMessage, Room } from '../types';

interface ChatPanelProps {
  room: Room;
  messages: ChatMessage[];
  userId: string;
  onSendMessage: (message: string) => Promise<void>;
  onExitRoom: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  room,
  messages,
  userId,
  onSendMessage,
  onExitRoom,
}) => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    await onSendMessage(message);
    setMessage('');
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(room.id);
      alert('Room ID copied!');
    } catch (err) {
      alert('Could not copy room ID');
    }
  };

  const shareRoom = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${room.name}`,
          text: `Room ID: ${room.id}`,
          url: window.location.href
        });
      } catch (err) {
        // Fallback to copy
        copyRoomId();
      }
    } else {
      copyRoomId();
    }
  };

  const participantCount = room.participants ? Object.keys(room.participants).length : 0;

  return (
    <div className="bg-slate-800 p-4 md:p-6 rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-700 animate-[fadeIn_0.5s_ease-out] h-full min-h-[400px] md:min-h-[600px] flex flex-col">
      {/* Room ID Banner */}
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-emerald-400 font-semibold text-sm mb-1">SHARE THIS ROOM ID WITH OTHERS</h4>
            <div className="flex items-center">
              <span className="text-xl md:text-2xl font-mono font-bold text-white mr-3">{room.id}</span>
              <button
                onClick={copyRoomId}
                className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition mr-2"
                title="Copy Room ID"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={shareRoom}
                className="p-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition"
                title="Share Room"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-300 text-sm">Room: <span className="font-semibold text-white">{room.name}</span></div>
            <div className="flex items-center text-slate-300 text-sm mt-1">
              <Users className="w-4 h-4 mr-1" />
              <span>{participantCount} online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700">
        <div className="flex items-center">
          <MessageCircle className="w-6 h-6 text-emerald-400 mr-2" />
          <h3 className="text-lg md:text-xl font-bold text-white">{room.name}</h3>
        </div>
        <button
          onClick={onExitRoom}
          className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition"
        >
          Exit Room
        </button>
      </div>

      {/* Participants */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {room.participants && Object.values(room.participants).map((participant) => (
            <div
              key={participant.id}
              className={`px-3 py-1 rounded-full text-sm ${
                participant.id === userId
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {participant.name || 'Anonymous'} {participant.isCreator && '(Creator)'}
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-slate-900/50 rounded-xl p-4 mb-4">
        {messages.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.senderId === userId ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.senderId === userId
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-slate-100'
                  }`}
                >
                  <div className="text-xs text-slate-300 mb-1">
                    {msg.senderName || 'Anonymous'} • {formatTime(msg.timestamp)}
                  </div>
                  <div>{msg.message}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
        />
        <input
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              // Placeholder for file sharing logic
              alert('File sharing within rooms coming soon! For now, use legacy mode to create secure links and share them here.');
            }
          }}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-3 rounded-lg transition flex items-center cursor-pointer"
          title="Share File (Coming Soon)"
        >
          <Upload className="w-4 h-4" />
        </label>
        <button
          type="submit"
          disabled={!message.trim()}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 text-white px-6 py-3 rounded-lg transition flex items-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};