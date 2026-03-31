import { useState, useEffect } from 'react';

// We use a CDN to avoid complex polyfill issues with standard bundlers for PeerJS 
// in this specific environment, ensuring the library loads correctly globally.
export const usePeerJS = () => {
  const [peerLib, setPeerLib] = useState<any>(null);

  useEffect(() => {
    // Check if already loaded
    // @ts-ignore
    if (window.Peer) {
      // @ts-ignore
      setPeerLib(() => window.Peer);
      return;
    }

    const script = document.createElement('script');
    script.src = "https://unpkg.com/peerjs@1.5.1/dist/peerjs.min.js";
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      setPeerLib(() => window.Peer);
    };
    script.onerror = () => {
      console.error("Failed to load PeerJS script");
    };
    document.body.appendChild(script);
    
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return peerLib;
};