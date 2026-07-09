import { createContext, useContext, useEffect, useRef, useCallback, useMemo } from 'react';
import { AuthContext } from './AuthContext';

const RealTimeContext = createContext(null);

export const RealTimeProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const listenersRef = useRef([]);

  // Subscribe helper to register event-specific callbacks
  const subscribe = useCallback((event, callback) => {
    const listener = { event, callback };
    listenersRef.current.push(listener);
    return () => {
      listenersRef.current = listenersRef.current.filter(l => l !== listener);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    let eventSource = null;
    let reconnectTimeout = null;

    const connectSSE = () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
      const eventUrl = `${apiBase}/events/?token=${encodeURIComponent(token)}`;

      console.log('Real-Time SSE: Connecting to', eventUrl);
      eventSource = new EventSource(eventUrl);

      eventSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          const eventType = payload.event;
          const data = payload.data;

          console.log(`Real-Time SSE Message [${eventType}]:`, data);

          // Dispatch event to all registered listeners
          listenersRef.current.forEach(listener => {
            if (listener.event === eventType) {
              try {
                listener.callback(data);
              } catch (err) {
                console.error('Error running callback for event:', eventType, err);
              }
            }
          });
        } catch (err) {
          console.error('Error decoding SSE payload:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.warn('Real-Time SSE connection interrupted. Attempting reconnect in 5s...', err);
        if (eventSource) {
          eventSource.close();
        }
        reconnectTimeout = setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    return () => {
      console.log('Real-Time SSE: Cleaning up connection...');
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [user]);

  const value = useMemo(() => ({ subscribe }), [subscribe]);

  return (
    <RealTimeContext.Provider value={value}>
      {children}
    </RealTimeContext.Provider>
  );
};

export const useRealTime = () => {
  const context = useContext(RealTimeContext);
  if (!context) {
    throw new Error('useRealTime must be used within a RealTimeProvider');
  }
  return context;
};

