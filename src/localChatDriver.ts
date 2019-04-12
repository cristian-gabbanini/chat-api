import {
  chat,
  User,
  Room,
  ChatEvent,
  ChatMessage,
  ChatMessageSource,
  HasTimestamp,
  MessageId,
  HasMessageId
} from "./chat";

import uuid from "uuid";

// --------------------------------------------------------------------------------------------
// Demo usage

const rooms: { [r: string]: User[] } = {};
const listeners: ((event: ChatEvent) => void)[] = [];
const roomsMessages: { [roomId: string]: MessageId[] } = {};
const messages: {
  [messageId: string]: ChatMessage &
    ChatMessageSource &
    HasTimestamp &
    HasMessageId;
} = {};
const permissions: { [r: string]: User[] } = {};

function isDefined<T>(arg: T | undefined): arg is T {
  return typeof arg !== "undefined";
}

function addMessageId(
  message: ChatMessage & ChatMessageSource & HasTimestamp
): typeof message & HasMessageId {
  return {
    id: uuid(),
    ...message
  };
}

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

          if (!isAllowed(user, id)) {
            throw Error(`User ${user.id} is not allowed to enter this room`);
          }

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
        case "on-message":
          if ("id" in enteredRoom) {
            if (typeof roomsMessages[enteredRoom.id] === "undefined") {
              roomsMessages[enteredRoom.id] = [];
            }

            const messageWithId = addMessageId(e.content);
            e.content = messageWithId;

            roomsMessages[enteredRoom.id].push(messageWithId.id);

            messages[messageWithId.id] = messageWithId;
          }
          break;
      }

      listeners.forEach(listener => listener(e));

      return Promise.resolve(true);
    }
  };
  return driver;
};

function isAllowed(user: User, roomId: string) {
  return (
    isDefined(permissions[roomId]) &&
    permissions[roomId].filter(u => u.id === user.id).length === 1
  );
}

export function usersInRoom(roomId: string) {
  return rooms[roomId];
}
export function clearRooms() {
  Object.keys(rooms).map(roomId => delete rooms[roomId]);
}

export function clearMessages() {
  Object.keys(roomsMessages).forEach(roomId => delete roomsMessages[roomId]);
  Object.keys(messages).forEach(messageId => delete messages[messageId]);
}

export function clearPermissions() {
  Object.keys(permissions).map(roomId => delete permissions[roomId]);
}

export function getMessages(roomId: string) {
  const messageIds = roomsMessages[roomId];
  const res = messageIds.map(id => messages[id]);
  return res;
}

export function allowUser(user: User, roomId: string) {
  if (!isDefined(permissions[roomId])) {
    permissions[roomId] = [];
  }
  if (!isAllowed(user, roomId)) {
    permissions[roomId].push(user);
  }
}

export const localChat = chat.bind(null, localChatDriver);
