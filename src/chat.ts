interface Connection {
  enterRoom: (roomId: string) => Promise<[sendMessage, onMessage, leaveRoom]>;
  onEnterRoom(fn: (user: User, room: Room) => void): void;
  onLeaveRoom(fn: (user: User, room: Room) => void): void;
  disconnect: () => void;
  driver: ReturnType<ChatDriver>;
}

interface sendMessage {
  (message: ChatMessage): Promise<boolean>;
}
interface onMessage {
  (fn: (message: ChatMessage) => void): void;
}
interface leaveRoom {
  (): void;
}

export type MessageId = string;
export type HasMessageId = { id: MessageId };

type MessageEvent = {
  ts: number;
  type: "on-message";
  content: ChatMessage & ChatMessageSource & HasTimestamp;
};

type UserEnterRoomEvent = {
  ts: number;
  type: "enter-room";
  user: User;
  room: Room;
};

type UserLeaveRoomEvent = {
  ts: number;
  type: "leave-room";
  user: User;
  room: Room;
};

export type ChatEvent = MessageEvent | UserEnterRoomEvent | UserLeaveRoomEvent;

export interface ChatDriver {
  (user: User): {
    connect: () => Promise<boolean>;
    disconnect: () => void;
    listen: (fn: (event: ChatEvent) => void) => void;
    trigger: (e: ChatEvent) => Promise<{}>;
  };
}

export interface Room {
  id: string;
}

export type User = {
  id: string;
  firstName: string;
  lastName: string;
};

export type ChatMessage = {
  content: string;
};

export type HasTimestamp = { ts: string };

export type ChatMessageSource = {
  user: User;
  room: Room;
};

function isString<T>(arg: T | null): arg is T {
  return typeof arg === "string";
}

export function chat(driver: ChatDriver, user: User): Connection {
  const ENTER_ROOM_ERROR =
    "You must enter a room before you can send a message or listen to incoming messages";
  const boundDriver = driver(user);

  function enterRoom(
    this: ReturnType<ChatDriver>,
    roomId: string
  ): Promise<[sendMessage, onMessage, leaveRoom]> {
    return new Promise((res, rej) => {
      const enter: UserEnterRoomEvent = {
        ts: Date.now(),
        type: "enter-room",
        room: { id: roomId },
        user
      };

      this.trigger(enter)
        .then(_ => {
          const leaveRoom = () =>
            this.trigger({
              ts: Date.now(),
              type: "leave-room",
              room: { id: roomId },
              user
            });
          res([
            sendMessage.bind(this, roomId),
            onMessage.bind(this, roomId),
            leaveRoom
          ]);
        })
        .catch(rej);
    });
  }

  function sendMessage(
    this: ReturnType<ChatDriver>,
    roomId: string,
    message: ChatMessage
  ) {
    if (!isString(roomId)) {
      throw Error(ENTER_ROOM_ERROR);
    }

    const messageEvent: ChatMessage & ChatMessageSource & HasTimestamp = {
      ts: new Date().toISOString(),
      ...message,
      user,
      room: { id: roomId }
    };

    this.trigger({
      ts: Date.now(),
      type: "on-message",
      content: messageEvent
    });

    return Promise.resolve(true);
  }

  function onMessage(
    this: ReturnType<ChatDriver>,
    roomId: string,
    fn: (message: ChatMessage & ChatMessageSource) => void
  ): void {
    if (!isString(roomId)) {
      throw Error(ENTER_ROOM_ERROR);
    }

    this.listen(event => {
      if (event.type === "on-message") {
        if (roomId === event.content.room.id) {
          if (event.content.user.id !== user.id) {
            fn(event.content);
          }
        }
      }
    });
  }

  function onEnterRoom(
    this: ReturnType<ChatDriver>,
    fn: (user: User, room: Room) => void
  ): void {
    this.listen(event => {
      if (event.type === "enter-room") {
        const { user, room } = event;
        fn(user, room);
      }
    });
  }

  function onLeaveRoom(
    this: ReturnType<ChatDriver>,
    fn: (user: User, room: Room) => void
  ): void {
    this.listen(event => {
      if (event.type === "leave-room") {
        const { user, room } = event;
        fn(user, room);
      }
    });
  }

  function disconnect(this: ReturnType<ChatDriver>) {
    this.disconnect();
  }

  const conn: Connection = {
    enterRoom: enterRoom.bind(boundDriver),
    disconnect: disconnect.bind(boundDriver),
    onEnterRoom: onEnterRoom.bind(boundDriver),
    onLeaveRoom: onLeaveRoom.bind(boundDriver),
    driver: boundDriver
  };

  return conn;
}
