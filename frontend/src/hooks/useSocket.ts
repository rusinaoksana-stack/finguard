import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

const TOKEN_KEY = "finguard_token";

export function useSocket(enabled: boolean) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!enabled) {
      setSocket(null);
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setSocket(null);
      return;
    }

    const client = io(import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:4000", {
      auth: { token },
      transports: ["websocket"],
    });

    setSocket(client);

    return () => {
      client.disconnect();
    };
  }, [enabled]);

  return socket;
}
