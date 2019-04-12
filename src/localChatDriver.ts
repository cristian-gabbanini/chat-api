import {
  chat,
  User,
  Room,
  ChatEvent,
  ChatMessage,
  ChatMessageSource,
  HasTimestamp,
  MessageId
} from "./chat";

import uuid from "uuid";

type HasId = {
  id: string;
};

/**
 * @rooms Rooms
 */
const rooms: { [r: string]: User[] } = {};

/**
 * @listeners
 */
const listeners: ((event: ChatEvent) => void)[] = [];

/**
 * @roomsMessages
 */
const roomsMessages: { [roomId: string]: MessageId[] } = {};

/**
 * @messages
 */
const messages: {
  [messageId: string]: ChatMessage & ChatMessageSource & HasTimestamp & HasId;
} = {};

/**
 * @permissions
 * I permessi di accesso alle stanze degli utenti
 */
const permissions: { [r: string]: User[] } = {};

/**
 * @events
 * Gli eventi generati dalla chat
 */
const events: { [eventId: string]: ChatEvent & HasId } = {};

// ------------------------------------------------------------------------
// ========================================================================
// Local chat driver
// ========================================================================
// ------------------------------------------------------------------------
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
      return new Promise((res, rej) => {
        const eventWithId = addId(e);

        switch (eventWithId.type) {
          case "enter-room":
            const {
              user,
              room: { id }
            } = eventWithId;

            if (!isAllowed(user, id)) {
              throw Error(`User ${user.id} is not allowed to enter this room`);
            }

            if (typeof rooms[id] === "undefined") {
              rooms[id] = [];
            }

            const alreadyEntered = rooms[id].filter(u => u.id === user.id);
            if (alreadyEntered.length === 0) {
              rooms[id].push(user);
              enteredRoom = eventWithId.room;
            }
            break;
          case "leave-room":
            rooms[eventWithId.room.id] = rooms[eventWithId.room.id].filter(
              user => user.id !== eventWithId.user.id
            );
            break;
          case "on-message":
            if ("id" in enteredRoom) {
              if (typeof roomsMessages[enteredRoom.id] === "undefined") {
                roomsMessages[enteredRoom.id] = [];
              }

              const messageWithId = freeze(addId(eventWithId.content));
              eventWithId.content = messageWithId;

              roomsMessages[enteredRoom.id].push(messageWithId.id);

              messages[messageWithId.id] = messageWithId;
            }
            break;
        }

        listeners.forEach(listener => listener(eventWithId));
        events[eventWithId.id] = eventWithId;
        res(true);
      });
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

function clearObject(obj: { [k: string]: any }) {
  Object.keys(obj).forEach(id => delete obj[id]);
}

export function usersInRoom(roomId: string) {
  return rooms[roomId];
}
export function clearRooms() {
  clearObject(rooms);
}

export function clearMessages() {
  clearObject(roomsMessages);
  clearObject(messages);
}

export function clearPermissions() {
  clearObject(permissions);
}

export function getMessages(roomId: string) {
  const messageIds = roomsMessages[roomId];
  const res = messageIds.map(id => messages[id]);
  return res;
}

export function getEvents() {
  return events;
}

export function clearEvents() {
  clearObject(events);
}

function isDefined<T>(arg: T | undefined): arg is T {
  return typeof arg !== "undefined";
}

function addId<T extends object>(object: T): T & HasId {
  return {
    id: uuid(),
    ...object
  };
}

function freeze<T extends object>(object: T): Readonly<T> {
  return Object.freeze(object);
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
