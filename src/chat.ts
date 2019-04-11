interface Connection {
  enterRoom: (roomId: string) => () => Promise<boolean>;
  sendMessage(message: ChatMessage): Promise<boolean>;
  onMessage(fn: (message: ChatMessage) => void): void;
  onEnterRoom(fn: (user: User, room: Room) => void): void;
  disconnect: () => void;
  driver: ReturnType<ChatDriver>;
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
    usersInRoom(roomId: string): User[];
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

type ChatMessage = { type: "message"; content: string; user: User };

function onMessage(
  this: ReturnType<ChatDriver>,
  fn: (message: ChatMessage) => void
): void {
  this.listen(event => {
    if (event.type === "message") {
      fn(event.content);
    }
  });
}

function onEnterRoom(
  this: ReturnType<ChatDriver>,
  fn: (user: User, room: Room) => void
): void {
  this.listen(event => {
    if (event.type === "enter-room") {
      if (event.user.id !== this.user.id) {
        const { user, room } = event;
        fn(user, room);
      }
    }
  });
}

function disconnect(this: ReturnType<ChatDriver>) {
  this.disconnect();
}

function enterRoom(this: ReturnType<ChatDriver>, roomId: string) {
  const enter: UserEnterRoomEvent = {
    ts: Date.now(),
    type: "enter-room",
    room: { id: roomId },
    user: this.user
  };

  this.trigger(enter);

  return () =>
    this.trigger({
      ts: Date.now(),
      type: "leave-room",
      room: { id: roomId },
      user: this.user
    });
}

function sendMessage(this: ReturnType<ChatDriver>, message: ChatMessage) {
  this.trigger({ ts: Date.now(), type: "message", content: message });
  return Promise.resolve(true);
}

export function chat(driver: ChatDriver, user: User): Connection {
  const boundDriver = driver(user);
  const conn: Connection = {
    enterRoom: enterRoom.bind(boundDriver),
    sendMessage: sendMessage.bind(boundDriver),
    disconnect: disconnect.bind(boundDriver),
    onMessage: onMessage.bind(boundDriver),
    onEnterRoom: onEnterRoom.bind(boundDriver),
    driver: boundDriver
  };
  return conn;
}
