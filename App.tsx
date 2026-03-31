import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Upload, Link as LinkIcon, Download, Copy, CheckCircle, XCircle, 
  Shield, Zap, Cloud, Ruler, Lock, Trees, BarChart3, 
  MessageCircle, Coffee, QrCode as QrCodeIcon, Share2, Mail, Twitter, Linkedin,
  KeyRound, Heart
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import QRCode from 'react-qr-code';


import { usePeerJS } from './hooks/usePeer';
import { useRoom } from './hooks/useRoom';
import { Navbar } from './components/Navbar';
import { InfoSection } from './components/InfoSection';
import { RoomLobby } from './components/RoomLobby';
import { ChatPanel } from './components/ChatPanel';
import { TransferState, Role, FileMetadata, PeerMessage, SpeedDataPoint, RoomState } from './types';

// Simple SVG Icons for brands not in Lucide
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function App() {
  const Peer = usePeerJS();
  const roomHook = useRoom();

  // App State
  const [mode, setMode] = useState<'legacy' | 'room' | 'combined'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has('id') || params.has('room') ? 'legacy' : 'legacy'; // Default to legacy for now
  });
  const [role, setRole] = useState<Role>(Role.SENDER);
  const [status, setStatus] = useState<TransferState>(TransferState.IDLE);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [peerId, setPeerId] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [transferSpeedStr, setTransferSpeedStr] = useState<string>('0.00 MB/s');
  const [speedHistory, setSpeedHistory] = useState<SpeedDataPoint[]>([]);
  const [showQr, setShowQr] = useState<boolean>(true);
  
  // Password Logic
  const [password, setPassword] = useState<string>('');
  const [inputPassword, setInputPassword] = useState<string>('');
  const [isPasswordSet, setIsPasswordSet] = useState<boolean>(false);

  // File State
  const [file, setFile] = useState<File | null>(null);
  const [receivedFileMeta, setReceivedFileMeta] = useState<FileMetadata | null>(null);
  
  // Refs
  const peerInstance = useRef<any>(null);
  const connInstance = useRef<any>(null);
  const receivedChunks = useRef<ArrayBuffer[]>([]);
  const receivedSize = useRef<number>(0);
  const startTime = useRef<number>(0);

  // Initialize Role based on URL
  useEffect(() => {
    if (!Peer) return;
    const params = new URLSearchParams(window.location.search);
    const remoteId = params.get('id');

    if (remoteId) {
      setRole(Role.RECEIVER);
      initializeReceiver(remoteId, Peer);
    }
    return () => {
      if (peerInstance.current) peerInstance.current.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Peer]);

  // --- LOGIC HANDLERS ---

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const startHosting = () => {
    if (file && Peer) {
      initializeSender(file, Peer);
    }
  }

  const updateSpeed = useCallback((bytesProcessed: number) => {
    const now = Date.now();
    const duration = (now - startTime.current) / 1000; // seconds
    if (duration > 0) {
      const bytesPerSec = bytesProcessed / duration;
      const mbPerSec = bytesPerSec / 1024 / 1024;
      setTransferSpeedStr(mbPerSec.toFixed(2) + ' MB/s');
      
      setSpeedHistory(prev => {
        const newData = [...prev, { time: '', speed: parseFloat(mbPerSec.toFixed(2)) }];
        if (newData.length > 20) newData.shift();
        return newData;
      });
    }
  }, []);

  const initializeSender = (selectedFile: File, PeerClass: any) => {
    setStatus(TransferState.GENERATING_LINK);
    setErrorMsg('');
    try {
      const peer = new PeerClass();
      peerInstance.current = peer;

      peer.on('open', (id: string) => {
        setPeerId(id);
        setStatus(TransferState.WAITING_FOR_PEER);
      });

      peer.on('connection', (conn: any) => {
        connInstance.current = conn;
        setupSenderConnection(conn, selectedFile);
      });

      peer.on('error', (err: any) => {
        console.error(err);
        setErrorMsg('Connection Error: ' + (err.type || 'Unknown error'));
        setStatus(TransferState.ERROR);
      });
      
    } catch (e) {
      setErrorMsg('Failed to initialize P2P network.');
      setStatus(TransferState.ERROR);
    }
  };

  const setupSenderConnection = (conn: any, fileToSend: File) => {
    conn.on('open', () => {
      // Send Metadata first
      const meta: PeerMessage = {
        type: 'METADATA',
        name: fileToSend.name,
        size: fileToSend.size,
        fileType: fileToSend.type,
        protected: !!password // Tell receiver if it's locked
      };
      conn.send(meta);

      if (!password) {
        setStatus(TransferState.CONNECTED);
        setTimeout(() => startFileTransfer(conn, fileToSend), 500);
      } else {
        // Wait for password attempt
      }
    });

    conn.on('data', (data: PeerMessage) => {
       if (data.type === 'PASSWORD_ATTEMPT') {
          if (data.payload === password) {
             conn.send({ type: 'PASSWORD_RESULT', success: true } as PeerMessage);
             setStatus(TransferState.CONNECTED);
             startFileTransfer(conn, fileToSend);
          } else {
             conn.send({ type: 'PASSWORD_RESULT', success: false } as PeerMessage);
          }
       }
    });

    conn.on('close', () => {
       if (status !== TransferState.COMPLETED) {
          setErrorMsg('Peer disconnected unexpectedly.');
          // Don't set error if we were just idle
       }
    });
  };

  const startFileTransfer = (conn: any, fileToSend: File) => {
    setStatus(TransferState.TRANSFERRING);
    startTime.current = Date.now();
    setSpeedHistory([]); 
    
    const chunkSize = 16384; 
    let offset = 0;

    const readSlice = (o: number) => {
      const slice = fileToSend.slice(offset, o + chunkSize);
      const reader = new FileReader();

      reader.onload = (event) => {
        if (!event.target?.result || !connInstance.current) return;
        if (!conn.open) return;

        try {
          conn.send({ type: 'CHUNK', data: event.target.result } as PeerMessage);
          offset += (event.target.result as ArrayBuffer).byteLength;
          
          const percent = Math.min((offset / fileToSend.size) * 100, 100);
          setProgress(percent);
          updateSpeed(offset);

          if (offset < fileToSend.size) {
            if (conn.bufferedAmount > chunkSize * 5) {
               setTimeout(() => readSlice(offset), 50);
            } else {
               setTimeout(() => readSlice(offset), 0);
            }
          } else {
            conn.send({ type: 'EOF' } as PeerMessage);
            setStatus(TransferState.COMPLETED);
          }
        } catch (err) {
            setErrorMsg('Error sending data chunk.');
            setStatus(TransferState.ERROR);
        }
      };
      reader.readAsArrayBuffer(slice);
    };
    readSlice(0);
  };

  const initializeReceiver = (remoteId: string, PeerClass: any) => {
    setStatus(TransferState.WAITING_FOR_PEER);
    try {
      const peer = new PeerClass();
      peerInstance.current = peer;

      peer.on('open', () => {
        const conn = peer.connect(remoteId, { reliable: true });
        connInstance.current = conn;

        conn.on('open', () => {
           // Wait for metadata
        });

        conn.on('data', (data: any) => handleIncomingData(data, conn));
        conn.on('error', (err: any) => { setStatus(TransferState.ERROR); setErrorMsg('Connection lost.'); });
      });

      peer.on('error', () => { setStatus(TransferState.ERROR); setErrorMsg('Link expired or peer offline.'); });

    } catch (e) {
      setStatus(TransferState.ERROR); 
      setErrorMsg('Failed to initialize receiver client.');
    }
  };

  const handleIncomingData = (data: PeerMessage, conn: any) => {
    if (data.type === 'METADATA') {
      setReceivedFileMeta({ name: data.name!, size: data.size!, type: data.fileType || 'application/octet-stream' });
      
      if (data.protected) {
         setStatus(TransferState.AWAITING_PASSWORD);
      } else {
         setStatus(TransferState.TRANSFERRING);
         receivedChunks.current = [];
         receivedSize.current = 0;
         startTime.current = Date.now();
      }
    }
    else if (data.type === 'PASSWORD_RESULT') {
       if (data.success) {
         setStatus(TransferState.TRANSFERRING);
         receivedChunks.current = [];
         receivedSize.current = 0;
         startTime.current = Date.now();
       } else {
         alert("Incorrect Password");
       }
    }
    else if (data.type === 'CHUNK' && data.data) {
      receivedChunks.current.push(data.data);
      receivedSize.current += data.data.byteLength;
      if (receivedFileMeta) {
        const percent = Math.min((receivedSize.current / receivedFileMeta.size) * 100, 100);
        setProgress(percent);
        updateSpeed(receivedSize.current);
      }
    } 
    else if (data.type === 'EOF') {
      setStatus(TransferState.COMPLETED);
      downloadFile();
    }
  };

  const submitPassword = () => {
     if (connInstance.current) {
        connInstance.current.send({
           type: 'PASSWORD_ATTEMPT',
           payload: inputPassword
        } as PeerMessage);
     }
  };

  const downloadFile = () => {
    if (!receivedFileMeta) return;
    try {
      const blob = new Blob(receivedChunks.current, { type: receivedFileMeta.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = receivedFileMeta.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setErrorMsg("Failed to generate download file.");
    }
  };

  const getShareUrl = () => `${window.location.origin}${window.location.pathname}?id=${peerId}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      alert('Link copied!');
    } catch (err) { alert('Could not copy link'); }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'File Share', url: getShareUrl() }); } catch (error) { console.log(error); }
    } else { copyLink(); }
  };

  // --- RENDER HELPERS ---

  if (!Peer) return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-6"></div>
      <p className="text-xl font-medium tracking-wide animate-pulse">Initializing Secure Core...</p>
    </div>
  );

  if (mode === 'combined') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white overflow-x-hidden">
        <Navbar />
        <main className="flex flex-col md:flex-row min-h-[80vh]">
          {/* File Transfer Side */}
          <div className="flex-1 p-2 md:p-4 border-r-0 md:border-r border-slate-700">
            <div className="flex flex-col items-center justify-center min-h-full">
              {/* Copy the file transfer UI here */}
              {role === Role.SENDER && status === TransferState.IDLE && (
                <div className="w-full animate-[fadeIn_0.5s_ease-out]">
                  <div className="bg-slate-800 border-2 border-dashed border-slate-600 rounded-3xl p-6 md:p-12 hover:border-emerald-500 hover:bg-slate-800/80 transition-all group relative overflow-hidden max-w-2xl mx-auto shadow-2xl">
                    {!file ? (
                      <>
                        <input
                          type="file"
                          onChange={handleFileSelect}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        />
                        <div className="flex flex-col items-center space-y-6 pointer-events-none z-10 relative">
                          <div className="w-24 h-24 bg-slate-700/50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-inner ring-1 ring-white/5">
                            <Upload className="w-10 h-10 text-emerald-400" />
                          </div>
                          <div>
                            <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                              Share files securely
                            </h1>
                            <p className="text-lg text-slate-400 max-w-md mx-auto">
                              Peer-to-peer. End-to-end encrypted. <br/> No file size limits.
                            </p>
                          </div>
                          <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-emerald-500/20 transition-all flex items-center">
                            <Upload className="w-5 h-5 mr-2" /> Select a File
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="z-10 relative w-full max-w-md mx-auto">
                        <div className="flex items-center space-x-4 mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                          <div className="p-3 bg-emerald-500/20 rounded-lg">
                            <LinkIcon className="text-emerald-400" />
                          </div>
                          <div className="text-left overflow-hidden">
                            <p className="font-bold truncate">{file.name}</p>
                            <p className="text-sm text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <button onClick={() => setFile(null)} className="text-slate-500 hover:text-red-400">
                            <XCircle />
                          </button>
                        </div>

                        {/* Password Config */}
                        <div className="mb-6 bg-slate-700/30 p-4 rounded-xl border border-slate-600/50 text-left">
                          <div className="flex justify-between items-center mb-2">
                            <label className="flex items-center font-medium text-slate-300">
                              <KeyRound className="w-4 h-4 mr-2 text-emerald-400" />
                              Password Protection
                            </label>
                            <div
                              onClick={() => setIsPasswordSet(!isPasswordSet)}
                              className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${isPasswordSet ? 'bg-emerald-500' : 'bg-slate-600'}`}
                            >
                              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isPasswordSet ? 'translate-x-4' : 'translate-x-0'}`} />
                            </div>
                          </div>

                          {isPasswordSet && (
                            <input
                              type="text"
                              placeholder="Set a password (Optional)"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                            />
                          )}
                          <p className="text-xs text-slate-500 mt-2">
                            {isPasswordSet ? "The receiver must enter this password to download." : "Anyone with the link can download."}
                          </p>
                        </div>

                        <button
                          onClick={startHosting}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center"
                        >
                          <Share2 className="w-5 h-5 mr-2" /> Create Secure Link
                        </button>
                      </div>
                    )}

                    {/* Decorative Background */}
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Other transfer states */}
              {role === Role.SENDER && status === TransferState.WAITING_FOR_PEER && (
                <div className="bg-slate-800 p-4 md:p-8 rounded-3xl shadow-2xl max-w-md w-full border border-slate-700 animate-[slideUp_0.4s_ease-out]">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-white">Share this link</h3>
                    {password && <Lock className="w-4 h-4 text-emerald-400" />}
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl flex items-center justify-between mb-6 border border-slate-700 group hover:border-emerald-500/50 transition-colors">
                    <code className="text-sm text-emerald-400 truncate max-w-[200px] font-mono select-all">
                      .../?id={peerId.substring(0,8)}...
                    </code>
                    <button onClick={copyLink} className="p-2 hover:bg-slate-800 rounded-lg transition text-white active:scale-95" title="Copy Link">
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Social Share & QR Options */}
                  <div className="mb-6 flex flex-col space-y-4">
                    <div className="flex justify-center gap-3 flex-wrap">
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent('Download file: ' + getShareUrl())}`}
                        target="_blank" rel="noreferrer"
                        className="p-3 rounded-full bg-[#25D366] text-white hover:opacity-90 transition shadow-lg shadow-[#25D366]/20"
                        title="Share on WhatsApp"
                      >
                        <WhatsAppIcon />
                      </a>
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Secure file share: ')}&url=${encodeURIComponent(getShareUrl())}`}
                        target="_blank" rel="noreferrer"
                        className="p-3 rounded-full bg-black text-white hover:opacity-80 transition shadow-lg shadow-black/20 border border-slate-700"
                        title="Share on X"
                      >
                        <Twitter className="w-5 h-5" />
                      </a>
                      <a
                        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getShareUrl())}`}
                        target="_blank" rel="noreferrer"
                        className="p-3 rounded-full bg-[#0077B5] text-white hover:opacity-90 transition shadow-lg shadow-[#0077B5]/20"
                        title="Share on LinkedIn"
                      >
                        <Linkedin className="w-5 h-5" />
                      </a>
                      <a
                        href={`mailto:?subject=${encodeURIComponent('File shared via YourSafeShare')}&body=${encodeURIComponent('Here is the link to download the file: ' + getShareUrl())}`}
                        className="p-3 rounded-full bg-slate-600 text-white hover:bg-slate-500 transition shadow-lg shadow-slate-600/20"
                        title="Share via Email"
                      >
                        <Mail className="w-5 h-5" />
                      </a>
                      <button
                        onClick={handleNativeShare}
                        className="p-3 rounded-full bg-emerald-600 text-white hover:bg-emerald-500 transition shadow-lg shadow-emerald-600/20"
                        title="More options (Messenger, etc.)"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>

                    <button
                      onClick={() => setShowQr(!showQr)}
                      className="flex items-center justify-center text-sm text-slate-400 hover:text-emerald-400 transition"
                    >
                      <QrCodeIcon className="w-4 h-4 mr-2" />
                      {showQr ? 'Hide QR Code' : 'Show QR Code'}
                    </button>

                    {showQr && (
                      <div className="bg-white p-4 rounded-xl mx-auto animate-[fadeIn_0.2s_ease-out]">
                        <QRCode value={getShareUrl()} size={160} />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 md:p-8 bg-slate-900/50 rounded-xl mb-4 border border-slate-800">
                    <div className="lds-ripple">
                      <div></div><div></div>
                    </div>
                    <p className="mt-4 text-slate-300 text-sm font-medium">Waiting for receiver...</p>
                    <p className="text-xs text-slate-500 mt-1">Keep this tab open</p>
                  </div>
                </div>
              )}

              {/* Transferring */}
              {status === TransferState.TRANSFERRING && (
                <div className="w-full max-w-lg bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-700 animate-[fadeIn_0.3s_ease-out]">
                  <h3 className="text-xl font-bold mb-6 flex items-center text-white">
                    <Zap className="w-5 h-5 text-emerald-400 mr-2 animate-pulse" />
                    Transferring File
                  </h3>

                  <div className="mb-2 flex justify-between text-sm font-medium">
                    <span className="text-slate-300">{Math.round(progress)}%</span>
                    <span className="text-emerald-400 font-mono">{transferSpeedStr}</span>
                  </div>

                  <div className="w-full bg-slate-700 rounded-full h-4 mb-8 overflow-hidden relative">
                    <div
                      className="bg-emerald-500 h-4 rounded-full transition-all duration-300 ease-out shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>

                  <div className="bg-slate-900/50 p-4 rounded-xl flex items-center">
                    <div className="bg-emerald-500/10 p-2 rounded-lg mr-3">
                      <Lock className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-xs text-slate-400 text-left">
                      End-to-End Encrypted via WebRTC DTLS 1.3.<br/>
                      Data flows directly between your devices.
                    </p>
                  </div>
                </div>
              )}

              {/* Completed */}
              {status === TransferState.COMPLETED && (
                <div className="max-w-md w-full bg-slate-800 p-10 rounded-3xl shadow-2xl text-center border border-emerald-500/30 animate-[zoomIn_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)]">
                  <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-emerald-500/30">
                    <CheckCircle className="w-12 h-12 text-emerald-500" />
                  </div>
                  <h2 className="text-3xl font-bold mb-2 text-white">Transfer Complete!</h2>
                  <p className="text-slate-400 mb-8">
                    The file has been successfully transmitted.
                  </p>

                  {role === Role.RECEIVER ? (
                    <button
                      onClick={downloadFile}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-xl flex items-center justify-center mx-auto transition shadow-lg shadow-emerald-500/20 w-full mb-4"
                    >
                      <Download className="w-5 h-5 mr-2" /> Download Again
                    </button>
                  ) : (
                    <button
                      onClick={() => window.location.reload()}
                      className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-8 rounded-xl transition w-full mb-4"
                    >
                      Send Another File
                    </button>
                  )}
                </div>
              )}

              {/* Error */}
              {status === TransferState.ERROR && (
                <div className="max-w-md w-full bg-red-950/30 p-8 rounded-2xl border border-red-500/30 text-center animate-[shake_0.5s_cubic-bezier(.36,.07,.19,.97)_both]">
                  <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <XCircle className="w-10 h-10 text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-red-400 mb-2">Transfer Interrupted</h3>
                  <p className="text-slate-300 mb-6">{errorMsg || "An unexpected error occurred."}</p>
                  <button
                    onClick={() => window.location.href = window.location.pathname}
                    className="bg-slate-700 hover:bg-slate-600 text-white py-2 px-6 rounded-lg font-medium transition"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Chat Side */}
          <div className="flex-1 p-2 md:p-4">
            {(roomHook.roomState === RoomState.IDLE || roomHook.roomState === RoomState.CREATING_ROOM || roomHook.roomState === RoomState.JOINING_ROOM || roomHook.roomState === RoomState.ERROR) && (
              <div className="h-full flex items-center justify-center">
                <RoomLobby
                  onCreateRoom={roomHook.createNewRoom}
                  onJoinRoom={roomHook.joinExistingRoom}
                  isCreating={roomHook.roomState === RoomState.CREATING_ROOM}
                  isJoining={roomHook.roomState === RoomState.JOINING_ROOM}
                  error={roomHook.error}
                />
              </div>
            )}
            {roomHook.roomState === RoomState.IN_ROOM && roomHook.currentRoom && (
              <ChatPanel
                room={roomHook.currentRoom}
                messages={roomHook.messages}
                userId={roomHook.userId}
                onSendMessage={roomHook.sendChatMessage}
                onExitRoom={() => setMode('legacy')}
              />
            )}
          </div>
        </main>
      </div>
    );
  }

  if (mode === 'room') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white overflow-x-hidden">
        <Navbar />
        <main className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
          {(roomHook.roomState === RoomState.IDLE || roomHook.roomState === RoomState.CREATING_ROOM || roomHook.roomState === RoomState.JOINING_ROOM || roomHook.roomState === RoomState.ERROR) && (
            <div>
              <RoomLobby
                onCreateRoom={roomHook.createNewRoom}
                onJoinRoom={(roomId, password) => roomHook.joinExistingRoom(roomId, password)}
                isCreating={roomHook.roomState === RoomState.CREATING_ROOM}
                isJoining={roomHook.roomState === RoomState.JOINING_ROOM}
                error={roomHook.error}
              />
              <button
                onClick={() => setMode('legacy')}
                className="mt-4 bg-slate-600 hover:bg-slate-500 text-white py-2 px-4 rounded-lg transition"
              >
                Back to File Transfer
              </button>
            </div>
          )}
          {roomHook.roomState === RoomState.IN_ROOM && roomHook.currentRoom && (
            <ChatPanel
              room={roomHook.currentRoom}
              messages={roomHook.messages}
              userId={roomHook.userId}
              onSendMessage={roomHook.sendChatMessage}
              onExitRoom={roomHook.exitRoom}
            />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white overflow-x-hidden">
      
      <Navbar />

      <main className="flex flex-col items-center justify-start min-h-[80vh] px-4 text-center mt-10 pb-20 relative">
        
        {/* --- MAIN INTERFACE CARD --- */}
        <div className="w-full max-w-4xl mx-auto mb-20 z-10">
          
          <div className="flex flex-col items-center min-h-[400px] justify-center transition-all duration-500 ease-in-out">
            
            {/* SENDER: IDLE (Landing Hero) */}
            {role === Role.SENDER && status === TransferState.IDLE && (
              <div className="w-full animate-[fadeIn_0.5s_ease-out]">
                <div className="bg-slate-800 border-2 border-dashed border-slate-600 rounded-3xl p-12 hover:border-emerald-500 hover:bg-slate-800/80 transition-all group relative overflow-hidden max-w-2xl mx-auto shadow-2xl">
                  
                  {!file ? (
                    <>
                      <input 
                        type="file" 
                        onChange={handleFileSelect}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                      />
                      <div className="flex flex-col items-center space-y-6 pointer-events-none z-10 relative">
                        <div className="w-24 h-24 bg-slate-700/50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-inner ring-1 ring-white/5">
                          <Upload className="w-10 h-10 text-emerald-400" />
                        </div>
                        <div>
                          <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            Share files & chat securely
                          </h1>
                          <p className="text-lg text-slate-400 max-w-md mx-auto">
                            Peer-to-peer file transfer + real-time collaborative chat. <br/> End-to-end encrypted. No file size limits.
                          </p>
                        </div>
                        <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-emerald-500/20 transition-all flex items-center">
                          <Upload className="w-5 h-5 mr-2" /> Select a File
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="z-10 relative w-full max-w-md mx-auto">
                      <div className="flex items-center space-x-4 mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                         <div className="p-3 bg-emerald-500/20 rounded-lg">
                           <LinkIcon className="text-emerald-400" />
                         </div>
                         <div className="text-left overflow-hidden">
                           <p className="font-bold truncate">{file.name}</p>
                           <p className="text-sm text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                         </div>
                         <button onClick={() => setFile(null)} className="text-slate-500 hover:text-red-400">
                           <XCircle />
                         </button>
                      </div>

                      {/* Password Config */}
                      <div className="mb-6 bg-slate-700/30 p-4 rounded-xl border border-slate-600/50 text-left">
                         <div className="flex justify-between items-center mb-2">
                            <label className="flex items-center font-medium text-slate-300">
                               <KeyRound className="w-4 h-4 mr-2 text-emerald-400" />
                               Password Protection
                            </label>
                            <div 
                              onClick={() => setIsPasswordSet(!isPasswordSet)}
                              className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${isPasswordSet ? 'bg-emerald-500' : 'bg-slate-600'}`}
                            >
                               <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isPasswordSet ? 'translate-x-4' : 'translate-x-0'}`} />
                            </div>
                         </div>
                         
                         {isPasswordSet && (
                           <input 
                              type="text" 
                              placeholder="Set a password (Optional)" 
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                           />
                         )}
                         <p className="text-xs text-slate-500 mt-2">
                           {isPasswordSet ? "The receiver must enter this password to download." : "Anyone with the link can download."}
                         </p>
                      </div>

                      <button 
                        onClick={startHosting}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center"
                      >
                         <Share2 className="w-5 h-5 mr-2" /> Create Secure Link
                      </button>
                    </div>
                  )}

                  {/* Decorative Background */}
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                </div>
              </div>
            )}

            {/* SENDER: WAITING FOR PEER */}
            {role === Role.SENDER && status === TransferState.WAITING_FOR_PEER && (
              <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl max-w-md w-full border border-slate-700 animate-[slideUp_0.4s_ease-out]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-white">Share this link</h3>
                  {password && <Lock className="w-4 h-4 text-emerald-400" />}
                </div>
                
                <div className="bg-slate-950 p-4 rounded-xl flex items-center justify-between mb-6 border border-slate-700 group hover:border-emerald-500/50 transition-colors">
                  <code className="text-sm text-emerald-400 truncate max-w-[200px] font-mono select-all">
                    .../?id={peerId.substring(0,8)}...
                  </code>
                  <button onClick={copyLink} className="p-2 hover:bg-slate-800 rounded-lg transition text-white active:scale-95" title="Copy Link">
                    <Copy className="w-5 h-5" />
                  </button>
                </div>

                {/* Social Share & QR Options */}
                <div className="mb-6 flex flex-col space-y-4">
                   <div className="flex justify-center gap-3 flex-wrap">
                      <a 
                        href={`https://wa.me/?text=${encodeURIComponent('Download file: ' + getShareUrl())}`} 
                        target="_blank" rel="noreferrer"
                        className="p-3 rounded-full bg-[#25D366] text-white hover:opacity-90 transition shadow-lg shadow-[#25D366]/20"
                        title="Share on WhatsApp"
                      >
                         <WhatsAppIcon />
                      </a>
                      <a 
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Secure file share: ')}&url=${encodeURIComponent(getShareUrl())}`} 
                        target="_blank" rel="noreferrer"
                        className="p-3 rounded-full bg-black text-white hover:opacity-80 transition shadow-lg shadow-black/20 border border-slate-700"
                        title="Share on X"
                      >
                         <Twitter className="w-5 h-5" />
                      </a>
                      <a 
                        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getShareUrl())}`} 
                        target="_blank" rel="noreferrer"
                        className="p-3 rounded-full bg-[#0077B5] text-white hover:opacity-90 transition shadow-lg shadow-[#0077B5]/20"
                        title="Share on LinkedIn"
                      >
                         <Linkedin className="w-5 h-5" />
                      </a>
                      <a 
                        href={`mailto:?subject=${encodeURIComponent('File shared via YourSafeShare')}&body=${encodeURIComponent('Here is the link to download the file: ' + getShareUrl())}`} 
                        className="p-3 rounded-full bg-slate-600 text-white hover:bg-slate-500 transition shadow-lg shadow-slate-600/20"
                        title="Share via Email"
                      >
                         <Mail className="w-5 h-5" />
                      </a>
                      <button 
                         onClick={handleNativeShare}
                         className="p-3 rounded-full bg-emerald-600 text-white hover:bg-emerald-500 transition shadow-lg shadow-emerald-600/20"
                         title="More options (Messenger, etc.)"
                      >
                         <Share2 className="w-5 h-5" />
                      </button>
                   </div>
                   
                   <button 
                     onClick={() => setShowQr(!showQr)}
                     className="flex items-center justify-center text-sm text-slate-400 hover:text-emerald-400 transition"
                   >
                     <QrCodeIcon className="w-4 h-4 mr-2" />
                     {showQr ? 'Hide QR Code' : 'Show QR Code'}
                   </button>
                   
                   {showQr && (
                     <div className="bg-white p-4 rounded-xl mx-auto animate-[fadeIn_0.2s_ease-out]">
                       <QRCode value={getShareUrl()} size={160} />
                     </div>
                   )}
                </div>

                <div className="flex flex-col items-center justify-center p-8 bg-slate-900/50 rounded-xl mb-4 border border-slate-800">
                  <div className="lds-ripple">
                    <div></div><div></div>
                  </div>
                  <p className="mt-4 text-slate-300 text-sm font-medium">Waiting for receiver...</p>
                  <p className="text-xs text-slate-500 mt-1">Keep this tab open</p>
                </div>
              </div>
            )}

            {/* RECEIVER: WAITING */}
            {role === Role.RECEIVER && status === TransferState.WAITING_FOR_PEER && (
              <div className="flex flex-col items-center">
                <div className="animate-spin w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full mb-6"></div>
                <h2 className="text-3xl font-bold text-white">Connecting...</h2>
                <p className="text-slate-400 mt-2">Establishing secure tunnel to sender</p>
              </div>
            )}

            {/* RECEIVER: AWAITING PASSWORD */}
            {role === Role.RECEIVER && status === TransferState.AWAITING_PASSWORD && (
               <div className="bg-slate-800 p-4 md:p-8 rounded-3xl shadow-2xl max-w-md w-full border border-slate-700 animate-[zoomIn_0.3s_ease-out]">
                  <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
                     <Lock className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Password Protected</h3>
                  <p className="text-slate-400 mb-6 text-sm">The sender has locked this file.</p>
                  
                  <div className="flex space-x-2">
                     <input 
                        type="password" 
                        value={inputPassword}
                        onChange={(e) => setInputPassword(e.target.value)}
                        placeholder="Enter password"
                        className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                     />
                     <button 
                        onClick={submitPassword}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg transition"
                     >
                        Unlock
                     </button>
                  </div>
               </div>
            )}

            {/* TRANSFERRING (Shared UI) */}
            {status === TransferState.TRANSFERRING && (
              <div className="w-full max-w-lg bg-slate-800 p-4 md:p-8 rounded-3xl shadow-2xl border border-slate-700 animate-[fadeIn_0.3s_ease-out]">
                <h3 className="text-xl font-bold mb-6 flex items-center text-white">
                  <Zap className="w-5 h-5 text-emerald-400 mr-2 animate-pulse" />
                  Transferring File
                </h3>
                
                <div className="mb-2 flex justify-between text-sm font-medium">
                  <span className="text-slate-300">{Math.round(progress)}%</span>
                  <span className="text-emerald-400 font-mono">{transferSpeedStr}</span>
                </div>
                
                <div className="w-full bg-slate-700 rounded-full h-4 mb-8 overflow-hidden relative">
                  <div 
                    className="bg-emerald-500 h-4 rounded-full transition-all duration-300 ease-out shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>

                {/* Real-time Graph */}
                <div className="h-32 w-full mb-6 bg-slate-900/50 rounded-xl overflow-hidden pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={speedHistory}>
                            <defs>
                                <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <YAxis hide domain={[0, 'auto']} />
                            <Area type="monotone" dataKey="speed" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSpeed)" isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-xl flex items-center">
                   <div className="bg-emerald-500/10 p-2 rounded-lg mr-3">
                      <Lock className="w-4 h-4 text-emerald-500" />
                   </div>
                   <p className="text-xs text-slate-400 text-left">
                     End-to-End Encrypted via WebRTC DTLS 1.3.<br/>
                     Data flows directly between your devices.
                   </p>
                </div>
              </div>
            )}

            {/* COMPLETED */}
            {status === TransferState.COMPLETED && (
              <div className="max-w-md w-full bg-slate-800 p-6 md:p-10 rounded-3xl shadow-2xl text-center border border-emerald-500/30 animate-[zoomIn_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)]">
                <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-emerald-500/30">
                  <CheckCircle className="w-12 h-12 text-emerald-500" />
                </div>
                <h2 className="text-3xl font-bold mb-2 text-white">Transfer Complete!</h2>
                <p className="text-slate-400 mb-8">
                  The file has been successfully transmitted.
                </p>
                
                {role === Role.RECEIVER ? (
                  <button 
                    onClick={downloadFile}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-xl flex items-center justify-center mx-auto transition shadow-lg shadow-emerald-500/20 w-full mb-4"
                  >
                    <Download className="w-5 h-5 mr-2" /> Download Again
                  </button>
                ) : (
                  <button 
                    onClick={() => window.location.reload()}
                    className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-8 rounded-xl transition w-full mb-4"
                  >
                    Send Another File
                  </button>
                )}

                {/* Monetization Hook */}
                <a href="https://buymeacoffee.com" target="_blank" rel="noreferrer" className="inline-flex items-center text-slate-400 hover:text-yellow-400 transition-colors text-sm">
                   <Heart className="w-4 h-4 mr-1 text-red-500 fill-red-500" /> Support the developer
                </a>
              </div>
            )}

            {/* ERROR */}
            {status === TransferState.ERROR && (
              <div className="max-w-md w-full bg-red-950/30 p-4 md:p-8 rounded-2xl border border-red-500/30 text-center animate-[shake_0.5s_cubic-bezier(.36,.07,.19,.97)_both]">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <XCircle className="w-10 h-10 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-red-400 mb-2">Transfer Interrupted</h3>
                <p className="text-slate-300 mb-6">{errorMsg || "An unexpected error occurred."}</p>
                <button 
                  onClick={() => window.location.href = window.location.pathname}
                  className="bg-slate-700 hover:bg-slate-600 text-white py-2 px-6 rounded-lg font-medium transition"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>

        {/* --- MODE SWITCH BUTTONS --- */}
        <div className="text-center mb-12 space-y-4">
          <div className="relative">
            <button
              onClick={() => setMode('combined')}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-purple-500/20 transition-all flex items-center mx-auto relative"
            >
              <Upload className="w-5 h-5 mr-2" /> Share Files + Chat Together
            </button>
            <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
              ⭐ Recommended
            </div>
          </div>
          <button
            onClick={() => setMode('room')}
            className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-slate-500/20 transition-all flex items-center mx-auto"
          >
            <MessageCircle className="w-5 h-5 mr-2" /> Chat Only
          </button>
        </div>

        {/* --- LANDING PAGE INFO CONTENT --- */}
        {role === Role.SENDER && status === TransferState.IDLE && (
          <div className="max-w-4xl mx-auto w-full animate-[fadeIn_0.8s_ease-out_0.2s_both]">
            
            <div className="mb-20 text-left">
              <h2 className="text-3xl font-bold text-white mb-6">Why use YourSafeShare?</h2>
              <p className="text-slate-400 text-lg leading-relaxed">
                We are a free and independent peer-to-peer (P2P) file sharing and real-time collaboration platform that prioritizes your privacy.
                Unlike cloud storage, we store <strong>nothing</strong>. When you close the browser tab, the data is gone from the network.
                Our mission is to keep your data safely in your own hands while enabling seamless collaboration through secure chat rooms.
              </p>
            </div>

            <InfoSection icon={Cloud} title="Direct Device-to-Device">
              When you close the browser tab your files are no longer accessible, minimising the risk of unwanted access. 
              YourSafeShare uses WebRTC to find the shortest path, meaning sometimes your data doesn't even leave your local Wi-Fi!
            </InfoSection>

            <InfoSection icon={Ruler} title="Unlimited File Sizes">
              Because we don't store data on expensive servers, we don't need to impose artificial limits. 
              Share raw video footage, disk images, or massive archives.
            </InfoSection>

            <InfoSection icon={Lock} title="Private & Encrypted">
              Only you and the receiver can access your files. Your data is encrypted end-to-end. 
              The signaling server only helps you find each other—it cannot see what you are sending.
            </InfoSection>

            <InfoSection icon={MessageCircle} title="Real-Time Collaboration">
              Create private chat rooms for team collaboration. Share file links instantly, coordinate work, and communicate securely
              with end-to-end encrypted messaging powered by Firebase.
            </InfoSection>

            <InfoSection icon={Trees} title="Eco-Friendly">
              No servers storing terabytes of data means less electricity used for cooling and storage.
              P2P is the greenest way to share big files.
            </InfoSection>

            {/* About Section */}
            <div id="about" className="mt-20 pt-10 border-t border-slate-800">
              <h2 className="text-3xl font-bold text-white mb-6 text-center">About YourSafeShare</h2>
              <div className="max-w-4xl mx-auto text-center">
                <p className="text-slate-400 text-lg leading-relaxed mb-6">
                  YourSafeShare is an open-source, peer-to-peer file sharing and collaboration platform designed to prioritize user privacy and data security.
                  Founded with the belief that your files should remain in your control, we offer a decentralized alternative to traditional
                  cloud storage services with added real-time collaboration features.
                </p>
                <p className="text-slate-400 text-lg leading-relaxed">
                  Our mission is to provide a free, secure, and efficient way for people to share files directly between devices and collaborate in real-time,
                  without intermediaries storing or accessing your data. Every transfer is encrypted end-to-end, chat rooms are powered by Firebase for reliability,
                  and we never log or store any information about your files or conversations.
                </p>
              </div>
            </div>

            {/* Security Section */}
            <div id="security" className="mt-20 pt-10 border-t border-slate-800">
              <h2 className="text-3xl font-bold text-white mb-6 text-center">Security & Privacy</h2>
              <div className="max-w-4xl mx-auto">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                    <Shield className="w-12 h-12 text-emerald-500 mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-3">End-to-End Encryption</h3>
                    <p className="text-slate-400">
                      All file transfers are encrypted using WebRTC's DTLS 1.3 protocol. Your data is scrambled before leaving your device
                      and can only be decrypted by the intended recipient.
                    </p>
                  </div>
                  <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                    <Lock className="w-12 h-12 text-emerald-500 mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-3">No Data Storage</h3>
                    <p className="text-slate-400">
                      Unlike cloud services, we don't store your files on servers. Data flows directly between devices and disappears
                      when you close the browser tab.
                    </p>
                  </div>
                  <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                    <Zap className="w-12 h-12 text-emerald-500 mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-3">Direct Connections</h3>
                    <p className="text-slate-400">
                      Files are transferred peer-to-peer, often staying within your local network. This provides faster speeds
                      and eliminates third-party access.
                    </p>
                  </div>
                  <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                    <KeyRound className="w-12 h-12 text-emerald-500 mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-3">Password Protection</h3>
                    <p className="text-slate-400">
                      Optional password protection ensures only authorized recipients can access your shared files.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <div id="faq" className="mt-20 pt-10 border-t border-slate-800">
              <h2 className="text-3xl font-bold text-white mb-6 text-center">Frequently Asked Questions</h2>
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                  <h3 className="text-xl font-semibold text-white mb-3">How does YourSafeShare work?</h3>
                  <p className="text-slate-400">
                    YourSafeShare uses WebRTC technology to create direct connections between your device and the recipient's device.
                    No servers store your files - data travels directly between browsers.
                  </p>
                </div>
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                  <h3 className="text-xl font-semibold text-white mb-3">Is it really secure?</h3>
                  <p className="text-slate-400">
                    Yes! All transfers are encrypted end-to-end using DTLS 1.3. The signaling server only helps devices find each other
                    and cannot see or access your data.
                  </p>
                </div>
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                  <h3 className="text-xl font-semibold text-white mb-3">Are there file size limits?</h3>
                  <p className="text-slate-400">
                    No artificial limits! Share files of any size, from small documents to multi-gigabyte video files.
                  </p>
                </div>
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                  <h3 className="text-xl font-semibold text-white mb-3">Do you store my files?</h3>
                  <p className="text-slate-400">
                    Absolutely not. YourSafeShare is designed to be zero-storage. Files exist only in the sender's and receiver's browsers
                    during the transfer.
                  </p>
                </div>
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                  <h3 className="text-xl font-semibold text-white mb-3">What about the chat rooms?</h3>
                  <p className="text-slate-400">
                    Chat rooms use Firebase for real-time messaging. You can create private rooms with optional passwords,
                    share file links instantly, and collaborate securely. Rooms are temporary and data disappears when participants leave.
                  </p>
                </div>
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                  <h3 className="text-xl font-semibold text-white mb-3">Is it free?</h3>
                  <p className="text-slate-400">
                    Yes, completely free! YourSafeShare is open-source and will always remain free to use.
                  </p>
                </div>
              </div>
            </div>

            {/* Donate Section */}
            <div id="donate" className="mt-20 pt-10 border-t border-slate-800">
              <h2 className="text-3xl font-bold text-white mb-6 text-center">Support Our Mission</h2>
              <div className="max-w-4xl mx-auto text-center">
                <p className="text-slate-400 text-lg leading-relaxed mb-8">
                  YourSafeShare is free and open-source, maintained by volunteers who believe in privacy-first technology.
                  If you find our service valuable, consider supporting us to help keep it running and improve it further.
                </p>
                <div className="flex justify-center space-x-4">
                  <a
                    href="https://buymeacoffee.com/yoursafeshare"
                    target="_blank"
                    rel="noreferrer"
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition font-medium flex items-center shadow-lg shadow-emerald-900/20"
                  >
                    <Coffee className="w-4 h-4 mr-2" /> Buy me a Coffee
                  </a>
                  <a
                    href="https://github.com/sponsors/yoursafeshare"
                    target="_blank"
                    rel="noreferrer"
                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition font-medium flex items-center shadow-lg"
                  >
                    <Heart className="w-4 h-4 mr-2" /> GitHub Sponsors
                  </a>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-20 pt-10 border-t border-slate-800 text-center pb-10">
              <MessageCircle className="w-12 h-12 text-emerald-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-white mb-4">Questions?</h2>
              <p className="text-slate-400 mb-8 max-w-xl mx-auto">
                Check out our FAQ for details on how WebRTC file transfer and Firebase-powered chat rooms work, and how we ensure your privacy.
              </p>
              <div className="flex justify-center space-x-4">
                <a href="https://buymeacoffee.com" target="_blank" rel="noreferrer" className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition font-medium flex items-center shadow-lg shadow-emerald-900/20">
                  <Coffee className="w-4 h-4 mr-2" /> Buy me a Coffee
                </a>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}