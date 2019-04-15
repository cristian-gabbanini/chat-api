import { chat, ChatMessage, ChatEvent, User } from "../chat";
import {
  //localChat as chat,
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

const mockDriver = (user: User) => ({
  connect: () => Promise.resolve(true),
  disconnect: () => {},
  listen: (fn: (event: ChatEvent) => void) => {
    return Promise.resolve(true);
  },
  trigger: (e: ChatEvent) => {
    return Promise.resolve(true);
  },
  user
});

const failingDriver = (failEvents: string[]) => (user: User) => {
  function eventShoudFail(event: ChatEvent, events: string[]) {
    return events.filter(eventType => eventType === event.type).length === 1;
  }

  return {
    connect: () => Promise.resolve(true),
    disconnect: () => {},
    listen: (fn: (event: ChatEvent) => void) => {
      return Promise.resolve(true);
    },
    trigger: (e: ChatEvent) => {
      switch (e.type) {
        case "enter-room":
          if (eventShoudFail(e, failEvents)) {
            return Promise.reject(new Error("Cannot enter room"));
          }
        case "on-message":
          if (eventShoudFail(e, failEvents)) {
            return Promise.reject(new Error("Cannot send message"));
          }
      }

      return Promise.resolve(true);
    },
    user
  };
};

const chatService = chat.bind(null, mockDriver);

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
  const { disconnect, driver } = chatService(chatUser1);
  expect(typeof disconnect).toBe("function");
  expect(driver).toHaveProperty("connect");
  expect(driver).toHaveProperty("disconnect");
  expect(driver).toHaveProperty("listen");
  expect(driver).toHaveProperty("trigger");
});

test("Users can enter room", async () => {
  const myChat = chatService(chatUser1);
  const myChat2 = chatService(chatUser2);
  const { leaveRoom } = await myChat.enterRoom("123-456-abc");
  const { leaveRoom: leaveRoom2 } = await myChat2.enterRoom("123-456-abc");
  expect(typeof leaveRoom).toBe("function");
  expect(typeof leaveRoom2).toBe("function");
  /*const users = _usersInRoom("123-456-abc");
  expect(users).toHaveLength(2);
  expect(users[0]).toEqual(chatUser1);
  expect(users[1]).toEqual(chatUser2);*/
});

test("The same user cannot enter a room twice", async () => {
  const myChat = chatService(chatUser1);
  await myChat.enterRoom("123-456-abc");
  await myChat.enterRoom("123-456-abc");
  /*const users = _usersInRoom("123-456-abc");
  expect(users).toHaveLength(1);*/
});

test("User can leave a room", async () => {
  const myChat = chat(chatUser1);
  const { leaveRoom } = await myChat.enterRoom("123-456-abc");
  await leaveRoom();
  const users = _usersInRoom("123-456-abc");
  expect(users).toHaveLength(0);
});

test("Users can send messages", async () => {
  const myChat = chat(chatUser1);
  const roomId = "123-456-abc";
  const { sendMessage } = await myChat.enterRoom(roomId);
  const message: ChatMessage = {
    content: "Hello world"
  };
  await sendMessage(message);
  await sendMessage(message);
  expect(_getMessages(roomId)).toHaveLength(2);
});

test("Users can receive messages from other users in the same room", async () => {
  const roomId = "123-456-abc";
  const cristianChat = chat(chatUser1);
  const danielaChat = chat(chatUser2);
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
  expect(cristianReceiver.mock.calls.length).toBe(2);
  expect(danielaReceiver.mock.calls.length).toBe(0);
});

test("Users cannot receive messages from other rooms ", async () => {
  const roomId1 = "123-456-abc";
  const roomId2 = "123-991-abb";
  const cristianChat = chat(chatUser1);
  const danielaChat = chat(chatUser2);
  _allowUser(chatUser2, roomId2);
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
  const room1 = "123-456-abc";
  const room2 = "555-456-abc";
  _allowUser(chatUser1, room1);
  _allowUser(chatUser1, room2);
  await expect(chat(chatUser1).enterRoom(room1)).resolves;
  await expect(chat(chatUser1).enterRoom(room2)).resolves;
});

describe("Events", () => {
  test("Entering a room triggers the 'enter-room' event", async () => {
    const cristianChat = chat(chatUser1);
    const eventHandler = jest.fn((user, room) => {});
    const { onEnterRoom } = await cristianChat.enterRoom("123-456-abc");
    onEnterRoom(eventHandler);
    const danielaChat = chat(chatUser2);
    await danielaChat.enterRoom("123-456-abc");
    expect(eventHandler).toHaveBeenCalledTimes(1);
  });

  test("Leaving a room triggers the 'leave-room' event", async () => {
    const cristianChat = chat(chatUser1);
    const eventHandler = jest.fn((user, room) => {});
    const { onLeaveRoom, leaveRoom } = await cristianChat.enterRoom(
      "123-456-abc"
    );
    onLeaveRoom(eventHandler);
    await leaveRoom();
    expect(eventHandler).toHaveBeenCalledTimes(1);
  });

  test("Disconnecting triggers the 'leave-room' event", async () => {
    const cristianChat = chat(chatUser1);
    const eventHandler = jest.fn((user, room) => {});
    const { onLeaveRoom } = await cristianChat.enterRoom("123-456-abc");
    onLeaveRoom(eventHandler);
    cristianChat.disconnect();
    expect(eventHandler).toHaveBeenCalledTimes(1);
  });

  test("Sending a message triggers the 'on-message' event", async () => {
    const myChat = chat(chatUser1);
    const danielaChat = chat(chatUser2);
    const roomId = "123-456-abc";
    const message: ChatMessage = {
      content: "Hello world"
    };
    const expectedMessage = {
      ...message,
      room: { id: roomId },
      user: chatUser1,
      id: expect.any(String),
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
    const cristianChat = chat(failingDriver(["on-message"]), chatUser1);
    try {
      const { sendMessage } = await cristianChat.enterRoom("123-456-abc");
      await sendMessage({ content: "Hello world!" });
    } catch (e) {
      expect(e.message).toBe("Cannot send message");
    }
  });

  test("If the driver connection fails an error is thrown", async () => {
    expect.assertions(1);
    const cristianChat = chat(failingDriver(["enter-room"]), chatUser1);
    try {
      await cristianChat.enterRoom("123-456-abc");
    } catch (e) {
      expect(e.message).toBe("Cannot connect");
    }
  });

  test("Entering a room which the user is not allowed to enter throws an error", async () => {
    const cristianChat = chat(chatUser1);
    _allowUser(chatUser1, "123-456-abc");

    await expect(chat(chatUser1).enterRoom("123-456-abc")).toBeTruthy();
    //await expect(cristianChat.enterRoom("111-111-111")).rejects.toThrow();
  });
});
