import { ChatMessage } from "../chat";
import {
  localChat as chat,
  clearRooms as _clearRooms,
  clearMessages as _clearMessages,
  getMessages as _getMessages,
  usersInRoom as _usersInRoom,
  allowUser as _allowUser,
  clearPermissions as _clearPermissions,
  getEvents as _getEvents,
  clearEvents as _clearEvents
} from "../localChatDriver";

const _test = () => {};

// Underscore prefix means available only
// for testing purposes
const chatUser1 = {
  id: "123-32323",
  firstName: "Cristian",
  lastName: "Gabbanini"
};

const chatUser2 = {
  id: "123-42323",
  firstName: "Daniela",
  lastName: "Bulgarelli"
};

beforeEach(() => {
  _clearRooms();
  _clearMessages();
  _clearPermissions();
  _allowUser(chatUser1, "123-456-abc");
  _allowUser(chatUser2, "123-456-abc");
});

afterAll(() => {
  _clearEvents();
});

test("Creates a chat instance", () => {
  const myChat = chat(chatUser1);

  expect(myChat).toHaveProperty("disconnect");
  expect(myChat).toHaveProperty("onEnterRoom");
  expect(myChat).toHaveProperty("onLeaveRoom");
});

test("Users can enter room", async () => {
  const myChat = chat(chatUser1);
  const myChat2 = chat(chatUser2);

  const [, , leaveRoom1] = await myChat.enterRoom("123-456-abc");
  const [, , leaveRoom2] = await myChat2.enterRoom("123-456-abc");

  expect(typeof leaveRoom1).toBe("function");
  expect(typeof leaveRoom2).toBe("function");
  const users = _usersInRoom("123-456-abc");

  expect(users).toHaveLength(2);
  expect(users[0]).toEqual(chatUser1);
  expect(users[1]).toEqual(chatUser2);
});

test("The same user cannot enter a room twice", async () => {
  const myChat = chat(chatUser1);

  await myChat.enterRoom("123-456-abc");
  await myChat.enterRoom("123-456-abc");

  const users = _usersInRoom("123-456-abc");
  expect(users).toHaveLength(1);
});

test("User can leave a room", async () => {
  const myChat = chat(chatUser1);

  const [sendMessage, onMessage, leaveRoom1] = await myChat.enterRoom(
    "123-456-abc"
  );
  await leaveRoom1();
  const users = _usersInRoom("123-456-abc");
  expect(users).toHaveLength(0);
});

test("Users can send messages", async () => {
  const myChat = chat(chatUser1);
  const roomId = "123-456-abc";
  const [sendMessage1, , leaveRoom1] = await myChat.enterRoom(roomId);

  const message: ChatMessage = {
    content: "Hello world"
  };

  await sendMessage1(message);
  await sendMessage1(message);

  expect(_getMessages(roomId)).toHaveLength(2);
});

test("Users can receive messages from other users in the same room", async () => {
  const roomId = "123-456-abc";

  const cristianChat = chat(chatUser1);
  const danielaChat = chat(chatUser2);

  const [, onMessageCristian] = await cristianChat.enterRoom(roomId);
  const [sendDaniela, onMessageDaniela] = await danielaChat.enterRoom(roomId);

  const message: ChatMessage = {
    content: "Hello world"
  };

  const message2: ChatMessage = {
    content: "Hello world, again!"
  };

  const cristianReceiver = jest.fn(message => {});

  const danielaReceiver = jest.fn(message => {});

  onMessageCristian(cristianReceiver);
  onMessageDaniela(danielaReceiver);

  await sendDaniela(message);
  await sendDaniela(message2);

  expect(cristianReceiver.mock.calls.length).toBe(2);
  expect(danielaReceiver.mock.calls.length).toBe(0);
});

test("Users cannot receive messages from other rooms ", async () => {
  const roomId1 = "123-456-abc";
  const roomId2 = "123-991-abb";
  const cristianChat = chat(chatUser1);
  const danielaChat = chat(chatUser2);

  _allowUser(chatUser2, roomId2);
  const [, onMessageCristian] = await cristianChat.enterRoom(roomId1);
  const [sendDaniela] = await danielaChat.enterRoom(roomId2);

  const message: ChatMessage = {
    content: "Hello world"
  };

  const message2: ChatMessage = {
    content: "Hello world, again!"
  };

  const cristianReceiver = jest.fn(message => {});

  onMessageCristian(cristianReceiver);

  await sendDaniela(message);
  await sendDaniela(message2);

  expect(cristianReceiver.mock.calls.length).toBe(0);
});

describe("Events", () => {
  test("Entering a room triggers the 'enter-room' event", () => {
    const cristianChat = chat(chatUser1);

    const eventHandler = jest.fn((user, room) => {});

    cristianChat.onEnterRoom(eventHandler);

    const danielaChat = chat(chatUser2);
    const leaveRoom1 = danielaChat.enterRoom("123-456-abc");
    expect(eventHandler.mock.calls.length).toBe(1);
  });

  test("Leaving a room triggers the 'leave-room' event", async () => {
    const cristianChat = chat(chatUser1);

    const eventHandler = jest.fn((user, room) => {});

    const [, , leaveRoom] = await cristianChat.enterRoom("123-456-abc");
    cristianChat.onLeaveRoom(eventHandler);

    await leaveRoom();

    expect(eventHandler.mock.calls.length).toBe(1);
  });

  test("Disconnecting triggers the 'leave-room' event", () => {
    const cristianChat = chat(chatUser1);

    const eventHandler = jest.fn((user, room) => {});

    cristianChat.enterRoom("123-456-abc");
    cristianChat.onLeaveRoom(eventHandler);

    cristianChat.disconnect();

    expect(eventHandler.mock.calls.length).toBe(1);
  });

  test("Sending a message triggers the 'on-message' event", async () => {
    const myChat = chat(chatUser1);
    const danielaChat = chat(chatUser2);
    const roomId = "123-456-abc";
    const messageEventHandler = jest.fn();
    const [sendCristian] = await myChat.enterRoom(roomId);
    const [, onMessageDaniela] = await danielaChat.enterRoom(roomId);

    onMessageDaniela(messageEventHandler);

    const message: ChatMessage = {
      content: "Hello world"
    };

    await sendCristian(message);

    expect(messageEventHandler.mock.calls.length).toBe(1);
  });
});

describe("Errors", () => {
  test("Entering a room which the user is not allowed to enter throws an error", async () => {
    const cristianChat = chat(chatUser1);
    try {
      await cristianChat.enterRoom("111-111-111");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      console.log(error);
    }
  });
});
