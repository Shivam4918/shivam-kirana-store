import json
import redis
import queue
import threading
import os

class HybridEventBroker:
    def __init__(self):
        self.listeners = {}  # user_id -> list of queues
        self.admin_listeners = []  # list of queues for admins
        self.lock = threading.Lock()
        self.redis_client = None
        self.pubsub = None
        self.listener_thread = None

        # Try to connect to Redis
        try:
            redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
            self.redis_client = redis.from_url(redis_url)
            self.redis_client.ping()
            
            # Start pubsub listener thread
            self.pubsub = self.redis_client.pubsub()
            self.pubsub.subscribe('shivam_events')
            self.listener_thread = threading.Thread(target=self._listen_redis, daemon=True)
            self.listener_thread.start()
            print("Real-time broker: Connected to Redis Pub/Sub.")
        except Exception as e:
            print(f"Real-time broker: Redis not available ({e}). Using in-memory fallback.")
            self.redis_client = None

    def _listen_redis(self):
        for message in self.pubsub.listen():
            if message['type'] == 'message':
                try:
                    payload = json.loads(message['data'])
                    event_type = payload.get('event')
                    data = payload.get('data')
                    user_id = payload.get('user_id')
                    self._local_broadcast(event_type, data, user_id)
                except Exception as e:
                    print(f"Error parsing Redis message: {e}")

    def add_listener(self, user):
        q = queue.Queue(maxsize=100)
        with self.lock:
            if user.role == 'ADMIN':
                self.admin_listeners.append(q)
            else:
                if user.id not in self.listeners:
                    self.listeners[user.id] = []
                self.listeners[user.id].append(q)
        return q

    def remove_listener(self, user, q):
        with self.lock:
            if user.role == 'ADMIN':
                if q in self.admin_listeners:
                    self.admin_listeners.remove(q)
            else:
                if user.id in self.listeners:
                    if q in self.listeners[user.id]:
                        self.listeners[user.id].remove(q)
                    if not self.listeners[user.id]:
                        del self.listeners[user.id]

    def broadcast(self, event_type, data, user_id=None):
        payload = {
            'event': event_type,
            'data': data,
            'user_id': user_id
        }
        if self.redis_client:
            try:
                self.redis_client.publish('shivam_events', json.dumps(payload))
                return
            except Exception as e:
                print(f"Redis publish failed ({e}). Falling back to local broadcast.")
        
        # Fallback to local process broadcast
        self._local_broadcast(event_type, data, user_id)

    def _local_broadcast(self, event_type, data, user_id=None):
        payload = {
            'event': event_type,
            'data': data
        }
        msg = f"data: {json.dumps(payload)}\n\n"
        
        with self.lock:
            # Send to admin listeners
            for q in self.admin_listeners:
                try:
                    q.put_nowait(msg)
                except queue.Full:
                    pass
            
            # Send to specific customer listeners
            if user_id and user_id in self.listeners:
                for q in self.listeners[user_id]:
                    try:
                        q.put_nowait(msg)
                    except queue.Full:
                        pass
            elif not user_id:
                # Global broadcast (e.g. stock change)
                for u_id, qs in self.listeners.items():
                    for q in qs:
                        try:
                            q.put_nowait(msg)
                        except queue.Full:
                            pass

event_broker = HybridEventBroker()
