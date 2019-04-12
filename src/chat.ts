interface Connection {
  enterRoom: (roomId: string) => () => Promise<boolean>;
  sendMessage(message: ChatMessage): Promise<boolean>;
  onMessage(fn: (message: ChatMessage) => void): void;
  onEnterRoom(fn: (user: User, room: Room) => void): void;
  onLeaveRoom(fn: (user: User, room: Room) => void): void;
  disconnect: () => void;
  driver: ReturnType<ChatDriver>;
  roomId?: string;
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
    trigger: (e: ChatEvent) => Promise<boolean>;
    user: User;
  };
}

export interface Room {
  id: string;
}

export type User = {
  id: string;
  firstName?: string;
  lastName?: string;
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

  let currentRoomId: string | null = null;

  function enterRoom(this: ReturnType<ChatDriver>, roomId: string) {
    return new Promise((res, rej) => {
      const enter: UserEnterRoomEvent = {
        ts: Date.now(),
        type: "enter-room",
        room: { id: roomId },
        user: this.user
      };

      this.trigger(enter)
        .then(_ => {
          currentRoomId = roomId;
          res(() =>
            this.trigger({
              ts: Date.now(),
              type: "leave-room",
              room: { id: roomId },
              user: this.user
            })
          );
        })
        .catch(rej);
    });
  }

  function sendMessage(this: ReturnType<ChatDriver>, message: ChatMessage) {
    if (!isString(currentRoomId)) {
      throw Error(ENTER_ROOM_ERROR);
    }

    const messageEvent: ChatMessage & ChatMessageSource & HasTimestamp = {
      ts: new Date().toISOString(),
      ...message,
      user,
      room: { id: currentRoomId }
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
    fn: (message: ChatMessage & ChatMessageSource) => void
  ): void {
    if (!isString(currentRoomId)) {
      throw Error(ENTER_ROOM_ERROR);
    }

    this.listen(event => {
      if (event.type === "on-message") {
        if (currentRoomId === event.content.room.id) {
          if (event.content.user.id !== this.user.id) {
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
    sendMessage: sendMessage.bind(boundDriver),
    disconnect: disconnect.bind(boundDriver),
    onMessage: onMessage.bind(boundDriver),
    onEnterRoom: onEnterRoom.bind(boundDriver),
    onLeaveRoom: onLeaveRoom.bind(boundDriver),
    driver: boundDriver
  };

  return conn;
}
