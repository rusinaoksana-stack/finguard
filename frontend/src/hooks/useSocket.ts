import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const client = io(import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:4000", {
      transports: ["websocket"],
    });

    setSocket(client);

    return () => {
      client.disconnect();
    };
  }, []);

  return socket;
}
