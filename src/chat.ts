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

type MessageEvent = { ts: number; type: "message"; content: ChatMessage };
type UserOnlineEvent = { ts: number; type: "user-online"; user: User };
type UserOfflineEvent = { ts: number; type: "user-offline"; user: User };
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

export type ChatEvent =
  | MessageEvent
  | UserOnlineEvent
  | UserOfflineEvent
  | UserEnterRoomEvent
  | UserLeaveRoomEvent;

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
  type: "message";
  content: string;
  user: User;
  room: Room;
};

function onMessage(
  this: ReturnType<ChatDriver>,
  conn: Connection,
  fn: (message: ChatMessage) => void
): void {
  this.listen(event => {
    if (event.type === "message") {
      if (conn.roomId === event.content.room.id) {
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

function enterRoom(
  this: ReturnType<ChatDriver>,
  conn: Connection,
  roomId: string
) {
  const enter: UserEnterRoomEvent = {
    ts: Date.now(),
    type: "enter-room",
    room: { id: roomId },
    user: this.user
  };

  this.trigger(enter);
  conn.roomId = roomId;

  return () =>
    this.trigger({
      ts: Date.now(),
      type: "leave-room",
      room: { id: roomId },
      user: this.user
    });
}

function sendMessage(this: ReturnType<ChatDriver>, message: ChatMessage) {
  this.trigger({
    ts: Date.now(),
    type: "message",
    content: message
  });
  return Promise.resolve(true);
}

export function chat(driver: ChatDriver, user: User): Connection {
  const boundDriver = driver(user);
  const conn: any = {
    sendMessage: sendMessage.bind(boundDriver),
    disconnect: disconnect.bind(boundDriver),
    onEnterRoom: onEnterRoom.bind(boundDriver),
    onLeaveRoom: onLeaveRoom.bind(boundDriver),
    driver: boundDriver
  };
  conn.enterRoom = enterRoom.bind(boundDriver, conn);
  conn.onMessage = onMessage.bind(boundDriver, conn);

  return conn as Connection;
}
