import { User, Room, ChatEvent, ChatMessage } from "./chat";

// --------------------------------------------------------------------------------------------
// Demo usage
const rooms: { [r: string]: User[] } = {};
const listeners: ((event: ChatEvent) => void)[] = [];
const messages: { [r: string]: ChatMessage[] } = {};

export const localChatDriver = (user: User) => {
  let enteredRoom: Room;

  var driver = {
    user,
    connect: () => Promise.resolve(true),
    disconnect: () => {
      driver.trigger({
        ts: Date.now(),
        type: "leave-room",
        user,
        room: enteredRoom
      });
    },
    listen: (fn: (event: ChatEvent) => void) => {
      listeners.push(fn);
    },
    trigger: (e: ChatEvent) => {
      switch (e.type) {
        case "enter-room":
          const {
            user,
            room: { id }
          } = e;
          if (typeof rooms[id] === "undefined") {
            rooms[id] = [];
          }
          const alreadyEntered = rooms[id].filter(u => u.id === user.id);
          if (alreadyEntered.length === 0) {
            rooms[id].push(user);
            enteredRoom = e.room;
          }
          break;
        case "leave-room":
          rooms[e.room.id] = rooms[e.room.id].filter(
            user => user.id !== e.user.id
          );
          break;
        case "message":
          if (typeof messages[enteredRoom.id] === "undefined") {
            messages[enteredRoom.id] = [];
          }
          messages[enteredRoom.id].push(e.content);
          break;
      }

      listeners.forEach(listener => listener(e));

      return Promise.resolve(true);
    }
  };
  return driver;
};

export function usersInRoom(roomId: string) {
  return rooms[roomId];
}
export function clearRooms() {
  Object.keys(rooms).map(roomId => delete rooms[roomId]);
}

export function clearMessages() {
  Object.keys(messages).map(roomId => delete messages[roomId]);
}

export function getMessages(roomId: string) {
  return messages[roomId];
}
