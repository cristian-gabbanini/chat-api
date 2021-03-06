interface Connection {
  enterRoom: (roomId: string) => Promise<ChatRoom>;
  disconnect: () => void;
  driver: ReturnType<ChatDriver>;
}

export interface ChatRoom {
  sendMessage: sendMessage;
  onEnterRoom: onEnterRoom;
  onLeaveRoom: onLeaveRoom;
  onMessage: onMessage;
  leaveRoom: leaveRoom;
}

interface onEnterRoom {
  (fn: (user: User, room: Room) => void): void;
}

interface onLeaveRoom {
  (fn: (user: User, room: Room) => void): void;
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
  ts: string;
  type: 'on-message';
  content: ChatMessage & ChatMessageSource & HasTimestamp;
};

type UserEnterRoomEvent = {
  ts: string;
  type: 'enter-room';
  user: User;
  room: Room;
};

type UserLeaveRoomEvent = {
  ts: string;
  type: 'leave-room';
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
  return typeof arg === 'string';
}
function isDefined<T>(arg: T | undefined): arg is T {
  return typeof arg !== 'undefined';
}

function isFunction<T>(arg: T): arg is T {
  return typeof arg === 'function';
}

export function chat(driver: ChatDriver, user: User): Connection {
  const ENTER_ROOM_ERROR =
    'You must enter a room before you can send a message or listen to incoming messages';
  const USER_UNDEFINED_ERROR = 'You must define a user';
  const DRIVER_UNDEFINED_ERROR =
    'You must define a driver which should be a function accepting a user as its first argument';

  if (!isDefined(driver) || !isFunction(driver)) {
    throw Error(DRIVER_UNDEFINED_ERROR);
  }

  if (!isDefined(user)) {
    throw Error(USER_UNDEFINED_ERROR);
  }

  const boundDriver = driver(user);

  async function enterRoom(this: ReturnType<ChatDriver>, roomId: string) {
    const enter: UserEnterRoomEvent = {
      ts: getTimestamp(),
      type: 'enter-room',
      room: { id: roomId },
      user,
    };
    const entered = await this.trigger(enter);
    const leaveRoom = () =>
      this.trigger({
        ts: new Date().toISOString(),
        type: 'leave-room',
        room: { id: roomId },
        user,
      });
    const chatRoom: ChatRoom = {
      sendMessage: sendMessage.bind(this, roomId),
      onMessage: onMessage.bind(this, roomId),
      leaveRoom,
      onEnterRoom: onEnterRoom.bind(this),
      onLeaveRoom: onLeaveRoom.bind(this, roomId),
    };
    return chatRoom;
  }

  async function sendMessage(
    this: ReturnType<ChatDriver>,
    roomId: string,
    message: ChatMessage
  ) {
    if (!isString(roomId)) {
      throw Error(ENTER_ROOM_ERROR);
    }

    const messageEvent: ChatMessage & ChatMessageSource & HasTimestamp = {
      ts: getTimestamp(),
      ...message,
      user,
      room: { id: roomId },
    };

    await this.trigger({
      ts: getTimestamp(),
      type: 'on-message',
      content: messageEvent,
    });

    return true;
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
      if (event.type === 'on-message') {
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
      if (event.type === 'enter-room') {
        const { user, room } = event;
        fn(user, room);
      }
    });
  }

  function onLeaveRoom(
    this: ReturnType<ChatDriver>,
    roomId: string,
    fn: (user: User, room: Room) => void
  ): void {
    this.listen(event => {
      if (event.type === 'leave-room') {
        const { user, room } = event;
        if (room.id === roomId) {
          fn(user, room);
        }
      }
    });
  }

  function disconnect(this: ReturnType<ChatDriver>) {
    this.disconnect();
  }

  function getTimestamp() {
    return new Date().toISOString();
  }

  const conn: Connection = {
    enterRoom: enterRoom.bind(boundDriver),
    disconnect: disconnect.bind(boundDriver),
    driver: boundDriver,
  };

  return conn;
}
