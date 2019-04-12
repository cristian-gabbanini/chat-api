import { ChatMessage } from "../chat";
import {
  localChat as chat,
  clearRooms as _clearRooms,
  clearMessages as _clearMessages,
  getMessages as _getMessages,
  usersInRoom as _usersInRoom
} from "../localChatDriver";

const _test = () => {};

// Underscore prefix means available only
// for testing purposes
afterEach(() => {
  _clearRooms();
  _clearMessages();
});

test("Creates a chat instance", () => {
  const user = {
    id: "123-32323",
    firstName: "Cristian",
    lastName: "Gabbanini"
  };

  const myChat = chat(user);

  expect(myChat).toHaveProperty("disconnect");
  expect(myChat).toHaveProperty("sendMessage");
  expect(myChat).toHaveProperty("onMessage");
  expect(myChat).toHaveProperty("onEnterRoom");
  expect(myChat).toHaveProperty("onLeaveRoom");
});

test("Users can enter room", () => {
  const user1 = {
    id: "123-32323",
    firstName: "Cristian",
    lastName: "Gabbanini"
  };
  const myChat = chat(user1);

  const user2 = {
    id: "123-42323",
    firstName: "Daniela",
    lastName: "Bulgarelli"
  };
  const myChat2 = chat(user2);

  const leaveRoom1 = myChat.enterRoom("123-456-abc");
  const leaveRoom2 = myChat2.enterRoom("123-456-abc");

  expect(typeof leaveRoom1).toBe("function");
  expect(typeof leaveRoom2).toBe("function");
  const users = _usersInRoom("123-456-abc");

  expect(users).toHaveLength(2);
  expect(users[0]).toEqual(user1);
  expect(users[1]).toEqual(user2);
});

test("The same user cannot enter a room twice", () => {
  const user1 = {
    id: "123-32323",
    firstName: "Cristian",
    lastName: "Gabbanini"
  };
  const myChat = chat(user1);

  myChat.enterRoom("123-456-abc");
  myChat.enterRoom("123-456-abc");

  const users = _usersInRoom("123-456-abc");
  expect(users).toHaveLength(1);
});

test("User can leave a room", () => {
  const user1 = {
    id: "123-32323",
    firstName: "Cristian",
    lastName: "Gabbanini"
  };
  const myChat = chat(user1);

  const leaveRoom1 = myChat.enterRoom("123-456-abc");
  leaveRoom1();
  const users = _usersInRoom("123-456-abc");
  expect(users).toHaveLength(0);
});

test("Entering a room triggers the 'enter-room' event", () => {
  const user1 = {
    id: "123-32323",
    firstName: "Cristian",
    lastName: "Gabbanini"
  };

  const user2 = {
    id: "342-32323",
    firstName: "Daniela",
    lastName: "Bulgarelli"
  };
  const cristianChat = chat(user1);

  const eventHandler = jest.fn((user, room) => {});

  cristianChat.onEnterRoom(eventHandler);

  const danielaChat = chat(user2);
  const leaveRoom1 = danielaChat.enterRoom("123-456-abc");
  expect(eventHandler.mock.calls.length).toBe(1);
});

test("Leaving a room triggers the 'leave-room' event", () => {
  const user1 = {
    id: "123-32323",
    firstName: "Cristian",
    lastName: "Gabbanini"
  };

  const cristianChat = chat(user1);

  const eventHandler = jest.fn((user, room) => {});

  const leaveRoom = cristianChat.enterRoom("123-456-111");
  cristianChat.onLeaveRoom(eventHandler);

  leaveRoom();

  expect(eventHandler.mock.calls.length).toBe(1);
});

test("Disconnecting triggers the 'leave-room' event", () => {
  const user1 = {
    id: "123-32323",
    firstName: "Cristian",
    lastName: "Gabbanini"
  };

  const cristianChat = chat(user1);

  const eventHandler = jest.fn((user, room) => {});

  cristianChat.enterRoom("111-222-333");
  cristianChat.onLeaveRoom(eventHandler);

  cristianChat.disconnect();

  expect(eventHandler.mock.calls.length).toBe(1);
});

test("Users can send messages", () => {
  const user1 = {
    id: "123-32323",
    firstName: "Cristian",
    lastName: "Gabbanini"
  };
  const myChat = chat(user1);
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
  const user1 = {
    id: "123-32323",
    firstName: "Cristian",
    lastName: "Gabbanini"
  };
  const myChat = chat(user1);
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
  const user1 = {
    id: "123-32323",
    firstName: "Cristian",
    lastName: "Gabbanini"
  };
  const user2 = {
    id: "123-42323",
    firstName: "Daniela",
    lastName: "Bulgarelli"
  };
  const myChat = chat(user1);
  const danielaChat = chat(user2);
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
  const user1 = {
    id: "123-32323",
    firstName: "Cristian",
    lastName: "Gabbanini"
  };
  const user2 = {
    id: "444-32323",
    firstName: "Daniela",
    lastName: "Bulgarelli"
  };
  const roomId = "123-456-abc";

  const cristianChat = chat(user1);
  const danielaChat = chat(user2);

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
  const user1 = {
    id: "123-32323",
    firstName: "Cristian",
    lastName: "Gabbanini"
  };
  const user2 = {
    id: "444-32323",
    firstName: "Daniela",
    lastName: "Bulgarelli"
  };
  const roomId1 = "123-456-abc";
  const roomId2 = "123-991-abb";
  const cristianChat = chat(user1);
  const danielaChat = chat(user2);

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
  const user1 = {
    id: "123-32323",
    firstName: "Cristian",
    lastName: "Gabbanini"
  };

  const cristianChat = chat(user1);

  const cristianReceiver = jest.fn(message => {});

  expect(() => cristianChat.onMessage(cristianReceiver)).toThrow(
    "You must enter a room before you can send a message"
  );
});
