import { ChatMessage } from "../chat";
import {
  localChat as chat,
  clearRooms as _clearRooms,
  clearMessages as _clearMessages,
  getMessages as _getMessages,
  usersInRoom as _usersInRoom,
  allowUser as _allowUser,
  clearPermissions as _clearPermissions
} from "../localChatDriver";

const _test = () => {};

// Underscore prefix means available only
// for testing purposes
const cristian = {
  id: "123-32323",
  firstName: "Cristian",
  lastName: "Gabbanini"
};
const daniela = {
  id: "123-42323",
  firstName: "Daniela",
  lastName: "Bulgarelli"
};

beforeEach(() => {
  _allowUser(cristian, "123-456-abc");
  _allowUser(daniela, "123-456-abc");
});

afterEach(() => {
  _clearRooms();
  _clearMessages();
  _clearPermissions();
});

test("Creates a chat instance", () => {
  const myChat = chat(cristian);

  expect(myChat).toHaveProperty("disconnect");
  expect(myChat).toHaveProperty("sendMessage");
  expect(myChat).toHaveProperty("onMessage");
  expect(myChat).toHaveProperty("onEnterRoom");
  expect(myChat).toHaveProperty("onLeaveRoom");
});

test("Users can enter room", () => {
  const myChat = chat(cristian);
  const myChat2 = chat(daniela);

  const leaveRoom1 = myChat.enterRoom("123-456-abc");
  const leaveRoom2 = myChat2.enterRoom("123-456-abc");

  expect(typeof leaveRoom1).toBe("function");
  expect(typeof leaveRoom2).toBe("function");
  const users = _usersInRoom("123-456-abc");

  expect(users).toHaveLength(2);
  expect(users[0]).toEqual(cristian);
  expect(users[1]).toEqual(daniela);
});

test("The same user cannot enter a room twice", () => {
  const myChat = chat(cristian);

  myChat.enterRoom("123-456-abc");
  myChat.enterRoom("123-456-abc");

  const users = _usersInRoom("123-456-abc");
  expect(users).toHaveLength(1);
});

test("User can leave a room", () => {
  const myChat = chat(cristian);

  const leaveRoom1 = myChat.enterRoom("123-456-abc");
  leaveRoom1();
  const users = _usersInRoom("123-456-abc");
  expect(users).toHaveLength(0);
});

test("Entering a room triggers the 'enter-room' event", () => {
  const cristianChat = chat(cristian);

  const eventHandler = jest.fn((user, room) => {});

  cristianChat.onEnterRoom(eventHandler);

  const danielaChat = chat(daniela);
  const leaveRoom1 = danielaChat.enterRoom("123-456-abc");
  expect(eventHandler.mock.calls.length).toBe(1);
});

test("Leaving a room triggers the 'leave-room' event", () => {
  const cristianChat = chat(cristian);

  const eventHandler = jest.fn((user, room) => {});

  const leaveRoom = cristianChat.enterRoom("123-456-abc");
  cristianChat.onLeaveRoom(eventHandler);

  leaveRoom();

  expect(eventHandler.mock.calls.length).toBe(1);
});

test("Disconnecting triggers the 'leave-room' event", () => {
  const cristianChat = chat(cristian);

  const eventHandler = jest.fn((user, room) => {});

  cristianChat.enterRoom("123-456-abc");
  cristianChat.onLeaveRoom(eventHandler);

  cristianChat.disconnect();

  expect(eventHandler.mock.calls.length).toBe(1);
});

test("Users can send messages", () => {
  const myChat = chat(cristian);
  const roomId = "123-456-abc";
  const leaveRoom1 = myChat.enterRoom(roomId);
  const message: ChatMessage = {
    type: "message",
    content: "Hello world"
  };

  myChat.sendMessage(message);
  myChat.sendMessage(message);

  expect(_getMessages(roomId)).toHaveLength(2);
});

test("Sending a message before entering a room throws an error", () => {
  const myChat = chat(cristian);
  const roomId = "123-456-abc";

  const message: ChatMessage = {
    type: "message",
    content: "Hello world"
  };

  expect(() => myChat.sendMessage(message)).toThrow(
    "You must enter a room before you can send a message"
  );
});

test("Sending a message triggers the 'on-message' event", () => {
  const myChat = chat(cristian);
  const danielaChat = chat(daniela);
  const roomId = "123-456-abc";
  const messageEventHandler = jest.fn();
  myChat.enterRoom(roomId);
  danielaChat.enterRoom(roomId);
  danielaChat.onMessage(messageEventHandler);

  const message: ChatMessage = {
    type: "message",
    content: "Hello world"
  };

  myChat.sendMessage(message);

  expect(messageEventHandler.mock.calls.length).toBe(1);
});

test("Users can receive messages from other users in the same room", async () => {
  const roomId = "123-456-abc";

  const cristianChat = chat(cristian);
  const danielaChat = chat(daniela);

  cristianChat.enterRoom(roomId);
  danielaChat.enterRoom(roomId);

  const message: ChatMessage = {
    type: "message",
    content: "Hello world"
  };

  const message2: ChatMessage = {
    type: "message",
    content: "Hello world, again!"
  };

  const cristianReceiver = jest.fn(message => {});

  const danielaReceiver = jest.fn(message => {});

  cristianChat.onMessage(cristianReceiver);
  danielaChat.onMessage(danielaReceiver);

  await danielaChat.sendMessage(message);
  await danielaChat.sendMessage(message2);

  expect(cristianReceiver.mock.calls.length).toBe(2);
  expect(danielaReceiver.mock.calls.length).toBe(0);
});

test("Users cannot receive messages from other rooms ", async () => {
  const roomId1 = "123-456-abc";
  const roomId2 = "123-991-abb";
  const cristianChat = chat(cristian);
  const danielaChat = chat(daniela);

  _allowUser(daniela, roomId2);
  cristianChat.enterRoom(roomId1);
  danielaChat.enterRoom(roomId2);

  const message: ChatMessage = {
    type: "message",
    content: "Hello world"
  };

  const message2: ChatMessage = {
    type: "message",
    content: "Hello world, again!"
  };

  const cristianReceiver = jest.fn(message => {});

  cristianChat.onMessage(cristianReceiver);

  await danielaChat.sendMessage(message);
  await danielaChat.sendMessage(message2);

  expect(cristianReceiver.mock.calls.length).toBe(0);
});

test("Listening to messages before entering a room throws an error ", async () => {
  const cristianChat = chat(cristian);

  const cristianReceiver = jest.fn(message => {});

  expect(() => cristianChat.onMessage(cristianReceiver)).toThrow(
    "You must enter a room before you can send a message"
  );
});
