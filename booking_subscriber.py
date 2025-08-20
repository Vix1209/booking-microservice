#!/usr/bin/env python3
"""
Booking Event Subscriber

A Python script that subscribes to booking.created events from Redis and prints the payloads.
This script connects to Redis and listens for booking events published by the booking microservice.

Usage:
    python booking_subscriber.py

Environment Variables:
    REDIS_URL: Redis connection URL (default: redis://localhost:6379)

Example payload structure:
{
    "event": "booking.created",
    "data": {
        "id": "uuid",
        "title": "Meeting Title",
        "description": "Meeting description",
        "startTime": "2024-01-15T10:00:00Z",
        "endTime": "2024-01-15T11:00:00Z",
        "userId": "user-uuid",
        "status": "scheduled",
        "location": "Conference Room A",
        "notes": "Additional notes"
    },
    "timestamp": "2024-01-15T09:45:00Z"
}
"""

import redis
import json
import os
import sys
import signal
from datetime import datetime
from typing import Dict, Any


class BookingSubscriber:
    def __init__(self, redis_url: str = None):
        """
        Initialize the booking subscriber.
        
        Args:
            redis_url: Redis connection URL. If None, uses REDIS_URL env var or default.
        """
        self.redis_url = redis_url or os.getenv('REDIS_URL', 'redis://localhost:6379')
        self.redis_client = None
        self.pubsub = None
        self.running = False
        
        # Set up signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully."""
        print(f"\n[{datetime.now().isoformat()}] Received signal {signum}, shutting down...")
        self.stop()
    
    def connect(self) -> bool:
        """
        Connect to Redis and set up pub/sub.
        
        Returns:
            bool: True if connection successful, False otherwise.
        """
        try:
            print(f"[{datetime.now().isoformat()}] Connecting to Redis at {self.redis_url}...")
            
            # Create Redis connection
            self.redis_client = redis.from_url(
                self.redis_url,
                decode_responses=True,
                socket_connect_timeout=10,
                socket_timeout=10,
                retry_on_timeout=True
            )
            
            # Test connection
            self.redis_client.ping()
            print(f"[{datetime.now().isoformat()}] Successfully connected to Redis")
            
            # Set up pub/sub
            self.pubsub = self.redis_client.pubsub()
            
            return True
            
        except redis.ConnectionError as e:
            print(f"[{datetime.now().isoformat()}] Failed to connect to Redis: {e}")
            return False
        except Exception as e:
            print(f"[{datetime.now().isoformat()}] Unexpected error connecting to Redis: {e}")
            return False
    
    def subscribe_to_booking_events(self):
        """
        Subscribe to booking-related Redis channels.
        """
        try:
            # Subscribe to booking events
            channels = [
                'booking.created',
                'booking.updated', 
                'booking.deleted',
                'booking.reminder'
            ]
            
            for channel in channels:
                self.pubsub.subscribe(channel)
                print(f"[{datetime.now().isoformat()}] Subscribed to channel: {channel}")
            
            print(f"[{datetime.now().isoformat()}] Waiting for booking events...")
            print("Press Ctrl+C to stop\n")
            
        except Exception as e:
            print(f"[{datetime.now().isoformat()}] Error subscribing to channels: {e}")
            raise
    
    def process_message(self, message: Dict[str, Any]):
        """
        Process a received Redis message.
        
        Args:
            message: Redis message dictionary
        """
        try:
            if message['type'] == 'message':
                channel = message['channel']
                data = message['data']
                
                # Parse JSON payload
                try:
                    payload = json.loads(data) if isinstance(data, str) else data
                except json.JSONDecodeError:
                    payload = data
                
                # Print formatted message
                timestamp = datetime.now().isoformat()
                print(f"\n{'='*60}")
                print(f"[{timestamp}] BOOKING EVENT RECEIVED")
                print(f"Channel: {channel}")
                print(f"Payload:")
                print(json.dumps(payload, indent=2, default=str))
                print(f"{'='*60}\n")
                
                # You can add custom processing logic here
                self._handle_booking_event(channel, payload)
                
        except Exception as e:
            print(f"[{datetime.now().isoformat()}] Error processing message: {e}")
    
    def _handle_booking_event(self, channel: str, payload: Any):
        """
        Handle specific booking events. Override this method for custom logic.
        
        Args:
            channel: Redis channel name
            payload: Event payload
        """
        if channel == 'booking.created':
            self._handle_booking_created(payload)
        elif channel == 'booking.updated':
            self._handle_booking_updated(payload)
        elif channel == 'booking.deleted':
            self._handle_booking_deleted(payload)
        elif channel == 'booking.reminder':
            self._handle_booking_reminder(payload)
    
    def _handle_booking_created(self, payload: Any):
        """Handle booking.created events."""
        print(f"🎉 New booking created: {payload.get('data', {}).get('title', 'Unknown')}")
    
    def _handle_booking_updated(self, payload: Any):
        """Handle booking.updated events."""
        print(f"📝 Booking updated: {payload.get('data', {}).get('title', 'Unknown')}")
    
    def _handle_booking_deleted(self, payload: Any):
        """Handle booking.deleted events."""
        print(f"🗑️ Booking deleted: {payload.get('data', {}).get('bookingId', 'Unknown')}")
    
    def _handle_booking_reminder(self, payload: Any):
        """Handle booking.reminder events."""
        print(f"⏰ Booking reminder: {payload.get('data', {}).get('title', 'Unknown')}")
    
    def start(self):
        """
        Start the subscriber and listen for messages.
        """
        if not self.connect():
            print("Failed to connect to Redis. Exiting.")
            sys.exit(1)
        
        try:
            self.subscribe_to_booking_events()
            self.running = True
            
            # Listen for messages
            for message in self.pubsub.listen():
                if not self.running:
                    break
                self.process_message(message)
                
        except KeyboardInterrupt:
            print(f"\n[{datetime.now().isoformat()}] Interrupted by user")
        except Exception as e:
            print(f"[{datetime.now().isoformat()}] Error in subscriber loop: {e}")
        finally:
            self.stop()
    
    def stop(self):
        """
        Stop the subscriber and clean up connections.
        """
        self.running = False
        
        try:
            if self.pubsub:
                self.pubsub.close()
                print(f"[{datetime.now().isoformat()}] Closed pub/sub connection")
            
            if self.redis_client:
                self.redis_client.close()
                print(f"[{datetime.now().isoformat()}] Closed Redis connection")
                
        except Exception as e:
            print(f"[{datetime.now().isoformat()}] Error during cleanup: {e}")
        
        print(f"[{datetime.now().isoformat()}] Booking subscriber stopped")


def main():
    """
    Main entry point for the booking subscriber.
    """
    print("Booking Event Subscriber")
    print("========================")
    print(f"Started at: {datetime.now().isoformat()}")
    print(f"Redis URL: {os.getenv('REDIS_URL', 'redis://localhost:6379')}")
    print()
    
    # Create and start subscriber
    subscriber = BookingSubscriber()
    subscriber.start()


if __name__ == "__main__":
    main()