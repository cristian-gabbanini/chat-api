import { chat, ChatMessage } from "../chat";
import { mockDriver } from "../mocks/chatDriver";

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

test("Creates a chat instance", () => {
  const chatService = chat.bind(null, mockDriver());
  const { disconnect, driver } = chatService(chatUser1);
  expect(typeof disconnect).toBe("function");
  expect(driver).toHaveProperty("connect");
  expect(driver).toHaveProperty("disconnect");
  expect(driver).toHaveProperty("listen");
  expect(driver).toHaveProperty("trigger");
});

test("Users can enter room", async () => {
  const allowedRooms = { "123-456-abc": [chatUser1.id, chatUser2.id] };
  const eventsToFail: string[] = [];
  const chatService = chat.bind(null, mockDriver(eventsToFail, allowedRooms));
  const myChat = chatService(chatUser1);
  const myChat2 = chatService(chatUser2);
  const { leaveRoom } = await myChat.enterRoom("123-456-abc");
  const { leaveRoom: leaveRoom2 } = await myChat2.enterRoom("123-456-abc");
  expect(typeof leaveRoom).toBe("function");
  expect(typeof leaveRoom2).toBe("function");
});

test("The same user cannot enter a room twice", async () => {
  const allowedRooms = { "123-456-abc": [chatUser1.id] };
  const eventsToFail: string[] = [];
  const chatService = chat.bind(null, mockDriver(eventsToFail, allowedRooms));
  const myChat = chatService(chatUser1);
  await myChat.enterRoom("123-456-abc");
  await myChat.enterRoom("123-456-abc");
});

test("User can leave a room", async () => {
  const allowedRooms = { "123-456-abc": [chatUser1.id] };
  const eventsToFail: string[] = [];
  const chatService = chat.bind(null, mockDriver(eventsToFail, allowedRooms));
  const myChat = chatService(chatUser1);
  const { leaveRoom } = await myChat.enterRoom("123-456-abc");
  await leaveRoom();
});

test("Users can send messages", async () => {
  const allowedRooms = { "123-456-abc": [chatUser1.id] };
  const eventsToFail: string[] = [];
  const chatService = chat.bind(null, mockDriver(eventsToFail, allowedRooms));
  const myChat = chatService(chatUser1);
  const roomId = "123-456-abc";
  const { sendMessage } = await myChat.enterRoom(roomId);
  const message: ChatMessage = {
    content: "Hello world"
  };
  await sendMessage(message);
  await sendMessage(message);
});

test("Users can receive messages from other users in the same room", async () => {
  const allowedRooms = { "123-456-abc": [chatUser1.id, chatUser2.id] };
  const eventsToFail: string[] = [];
  const chatService = chat.bind(null, mockDriver(eventsToFail, allowedRooms));
  const roomId = "123-456-abc";
  const cristianChat = chatService(chatUser1);
  const danielaChat = chatService(chatUser2);
  const { onMessage: onMessageCristian } = await cristianChat.enterRoom(roomId);
  const {
    sendMessage: sendDaniela,
    onMessage: onMessageDaniela
  } = await danielaChat.enterRoom(roomId);
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
  expect(cristianReceiver).toHaveBeenCalledTimes(2);
  expect(danielaReceiver).toHaveBeenCalledTimes(0);
});

test("Users cannot receive messages from other rooms ", async () => {
  const allowedRooms = {
    "123-456-abc": [chatUser1.id],
    "123-991-abb": [chatUser2.id]
  };
  const eventsToFail: string[] = [];
  const chatService = chat.bind(null, mockDriver(eventsToFail, allowedRooms));
  const roomId1 = "123-456-abc";
  const roomId2 = "123-991-abb";
  const cristianChat = chatService(chatUser1);
  const danielaChat = chatService(chatUser2);
  const { onMessage: onMessageCristian } = await cristianChat.enterRoom(
    roomId1
  );
  const { sendMessage: sendDaniela } = await danielaChat.enterRoom(roomId2);
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

test("Users can enter multiple rooms if allowed", async () => {
  const allowedRooms = {
    "123-456-abc": [chatUser1.id],
    "555-456-abc": [chatUser1.id]
  };
  const eventsToFail: string[] = [];
  const chatService = chat.bind(null, mockDriver(eventsToFail, allowedRooms));
  const room1 = "123-456-abc";
  const room2 = "555-456-abc";
  await expect(
    chatService(chatUser1).enterRoom(room1)
  ).resolves.not.toBeInstanceOf(Error);
  await expect(
    chatService(chatUser1).enterRoom(room2)
  ).resolves.not.toBeInstanceOf(Error);
});

describe("Events", () => {
  test("Entering a room triggers the 'enter-room' event", async () => {
    const roomId = "123-456-abc";
    const eventsToFail: string[] = [];
    const allowedRooms = { [roomId]: [chatUser1.id, chatUser2.id] };
    const chatService = chat.bind(null, mockDriver(eventsToFail, allowedRooms));
    const cristianChat = chatService(chatUser1);
    const eventHandler = jest.fn((user, room) => {});
    const { onEnterRoom } = await cristianChat.enterRoom(roomId);
    onEnterRoom(eventHandler);
    const danielaChat = chatService(chatUser2);
    await danielaChat.enterRoom(roomId);
    expect(eventHandler).toHaveBeenCalledTimes(1);
  });

  test("Leaving a room triggers the 'leave-room' event", async () => {
    const roomId = "123-456-abc";
    const eventsToFail: string[] = [];
    const allowedRooms = { [roomId]: [chatUser1.id] };
    const chatService = chat.bind(null, mockDriver(eventsToFail, allowedRooms));
    const cristianChat = chatService(chatUser1);
    const eventHandler = jest.fn((user, room) => {});
    const { onLeaveRoom, leaveRoom } = await cristianChat.enterRoom(roomId);
    onLeaveRoom(eventHandler);
    await leaveRoom();
    expect(eventHandler).toHaveBeenCalledTimes(1);
  });

  test("Disconnecting triggers the 'leave-room' event", async () => {
    const roomId = "123-456-abc";
    const eventsToFail: string[] = [];
    const allowedRooms = { [roomId]: [chatUser1.id] };
    const chatService = chat.bind(null, mockDriver(eventsToFail, allowedRooms));
    const cristianChat = chatService(chatUser1);
    const eventHandler = jest.fn((user, room) => {});
    const { onLeaveRoom } = await cristianChat.enterRoom(roomId);
    onLeaveRoom(eventHandler);
    cristianChat.disconnect();
    expect(eventHandler).toHaveBeenCalledTimes(1);
  });

  test("Sending a message triggers the 'on-message' event", async () => {
    const roomId = "123-456-abc";
    const allowedRooms = { [roomId]: [chatUser1.id, chatUser2.id] };
    const eventsToFail: string[] = [];
    const chatService = chat.bind(null, mockDriver(eventsToFail, allowedRooms));
    const myChat = chatService(chatUser1);
    const danielaChat = chatService(chatUser2);
    const message: ChatMessage = {
      content: "Hello world"
    };
    const expectedMessage = {
      ...message,
      room: { id: roomId },
      user: chatUser1,
      ts: expect.any(String)
    };
    const messageEventHandler = jest.fn();
    const { sendMessage: sendCristian } = await myChat.enterRoom(roomId);
    const { onMessage: onMessageDaniela } = await danielaChat.enterRoom(roomId);
    onMessageDaniela(messageEventHandler);
    await sendCristian(message);
    expect(messageEventHandler).toHaveBeenCalledTimes(1);
    expect(messageEventHandler).toHaveBeenCalledWith(expectedMessage);
  });
});

describe("Errors", async () => {
  test("If send message fails an error is thrown", async () => {
    const allowedRooms = { "123-456-abc": [chatUser1.id] };
    const eventsToFail = ["on-enter"];
    const chatService = chat.bind(null, mockDriver(eventsToFail, allowedRooms));
    const cristianChat = chatService(chatUser1);
    try {
      const { sendMessage } = await cristianChat.enterRoom("123-456-abc");
      await sendMessage({ content: "Hello world!" });
    } catch (e) {
      expect(e.message).toBe("Cannot send message");
    }
  });

  test("If the driver connection fails an error is thrown", async () => {
    const allowedRooms = { "123-456-abc": [chatUser1.id] };
    const eventsToFail = ["on-enter"];
    const chatService = chat.bind(null, mockDriver(eventsToFail, allowedRooms));
    const cristianChat = chatService(chatUser1);
    try {
      await cristianChat.enterRoom("123-456-abc");
    } catch (e) {
      expect(e.message).toBe("Cannot connect");
    }
  });

  test("Entering a room which the user is not allowed to enter throws an error", async () => {
    const allowedRooms = {};
    const eventsToFail: string[] = [];
    const chatService = chat.bind(null, mockDriver(eventsToFail, allowedRooms));
    const cristianChat = chatService(chatUser1);
    await expect(cristianChat.enterRoom("123-456-abc")).rejects.toBeInstanceOf(
      Error
    );
  });
});
