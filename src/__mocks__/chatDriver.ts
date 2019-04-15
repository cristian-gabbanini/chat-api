import { ChatEvent, User } from '../chat';

export const mockDriver = (
  failEvents: string[] = [],
  allowedRooms: { [roomId: string]: string[] } = {},
) => {
  interface Listener {
    (event: ChatEvent): void;
  }
  const listeners: Listener[] = [];
  const rooms: { [roomId: string]: string[] } = {};
  return function chat(user: User) {
    var o = {
      connect: () => Promise.resolve(true),
      disconnect: () => {
        const [roomId] = Object.keys(rooms)
          .filter(roomId =>
            rooms[roomId].indexOf(user.id) >= 0 ? roomId : undefined,
          )
          .filter(isDefined);
        o.trigger({
          ts: new Date().toISOString(),
          type: 'leave-room',
          user,
          room: { id: roomId },
        });
      },
      listen: (fn: (event: ChatEvent) => void) => {
        listeners.push(fn);
        return Promise.resolve(true);
      },
      trigger: async (e: ChatEvent) => {
        switch (e.type) {
          case 'enter-room':
            if (eventShoudFail(e, failEvents)) {
              throw Error('Cannot enter room');
            }
            if (!isAllowedRoom(e.user, e.room.id)) {
              throw Error('Room not allowed');
            }
            if (!isDefined(rooms[e.room.id])) {
              rooms[e.room.id] = [];
            }
            rooms[e.room.id].push(e.user.id);
            break;
          case 'leave-room':
            if (eventShoudFail(e, failEvents)) {
              throw Error(`Cannot leave room ${e.room.id}`);
            }
            break;
          case 'on-message':
            if (eventShoudFail(e, failEvents)) {
              throw Error('Cannot send message');
            }
            break;
        }

        listeners.forEach(listener => listener(e));
        return true;
      },
      user,
    };
    return o;
  };

  function eventShoudFail(event: ChatEvent, events: string[]) {
    return events.filter(eventType => eventType === event.type).length === 1;
  }

  function isAllowedRoom(u: User, roomId: string) {
    const room = allowedRooms[roomId];
    if (room) {
      return (
        room.filter(userId => (u.id === userId ? true : false)).length === 1
      );
    }
    return false;
  }

  function isDefined<T>(value: T | undefined): value is T {
    return typeof value !== 'undefined';
  }
};
