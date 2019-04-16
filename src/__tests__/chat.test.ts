import { chat, ChatMessage, ChatRoom, ChatDriver } from '../chat';
import { mockDriver } from '../__mocks__/chatDriver';
import prettyFormat from 'pretty-format';

const chatUser1 = {
  id: '123-32323',
  firstName: 'Cristian',
  lastName: 'Gabbanini',
};

const chatUser2 = {
  id: '123-42323',
  firstName: 'Daniela',
  lastName: 'Bulgarelli',
};

test('Creates a chat instance', () => {
  const chatService = chat.bind(null, mockDriver());
  const { disconnect, driver } = chatService(chatUser1);
  expect(typeof disconnect).toBe('function');
  expect(driver).toBeAChatDriver();
});

test('Users can enter a room only if allowed', async () => {
  const roomId = '123-456-abc';
  const allowedRooms = { [roomId]: [chatUser2.id] };
  const eventsToFail: string[] = [];
  const chatService = chat.bind(null, mockDriver(eventsToFail, allowedRooms));
  const user1Chat = chatService(chatUser1);
  const user2Chat = chatService(chatUser2);
  try {
    await user1Chat.enterRoom(roomId);
  } catch (e) {
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe('Room not allowed');
  }
  const room = await user2Chat.enterRoom(roomId);
  expect(room).toBeAChatRoom();
});

test('Users can enter rooms', async () => {
  const allowedRooms = { '123-456-abc': [chatUser1.id, chatUser2.id] };
  const eventsToFail: string[] = [];
  const chatService = chat.bind(null, mockDriver(eventsToFail, allowedRooms));
  const myChat = chatService(chatUser1);
  const myChat2 = chatService(chatUser2);
  const { leaveRoom } = await myChat.enterRoom('123-456-abc');
  const { leaveRoom: leaveRoom2 } = await myChat2.enterRoom('123-456-abc');
  expect(typeof leaveRoom).toBe('function');
  expect(typeof leaveRoom2).toBe('function');
});

test('The same user cannot enter a room twice', async () => {
  const allowedRooms = { '123-456-abc': [chatUser1.id] };
  const eventsToFail: string[] = [];
  const chatService = chat.bind(null, mockDriver(eventsToFail, allowedRooms));
  const myChat = chatService(chatUser1);
  await myChat.enterRoom('123-456-abc');
  await myChat.enterRoom('123-456-abc');
});

test('Users can leave the chatrooms', async () => {
  const allowedRooms = { '123-456-abc': [chatUser1.id] };
  const eventsToFail: string[] = [];
  const chatService = chat.bind(null, mockDriver(eventsToFail, allowedRooms));
  const myChat = chatService(chatUser1);
  const { leaveRoom } = await myChat.enterRoom('123-456-abc');
  await leaveRoom();
});

test('Users can send messages', async () => {
  const allowedRooms = { '123-456-abc': [chatUser1.id] };
  const eventsToFail: string[] = [];
  const chatService = chat.bind(null, mockDriver(eventsToFail, allowedRooms));
  const myChat = chatService(chatUser1);
  const roomId = '123-456-abc';
  const { sendMessage } = await myChat.enterRoom(roomId);
  const message: ChatMessage = {
    content: 'Hello world',
  };
  await sendMessage(message);
  await sendMessage(message);
});

test('Users can receive messages from other users in the same room', async () => {
  const allowedRooms = { '123-456-abc': [chatUser1.id, chatUser2.id] };
  const eventsToFail: string[] = [];
  const chatService = chat.bind(null, mockDriver(eventsToFail, allowedRooms));
  const roomId = '123-456-abc';
  const cristianChat = chatService(chatUser1);
  const danielaChat = chatService(chatUser2);
  const { onMessage: onMessageCristian } = await cristianChat.enterRoom(roomId);
  const {
    sendMessage: sendDaniela,
    onMessage: onMessageDaniela,
  } = await danielaChat.enterRoom(roomId);
  const message: ChatMessage = {
    content: 'Hello world',
  };
  const message2: ChatMessage = {
    content: 'Hello world, again!',
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

test('Users cannot receive messages from users inside other rooms ', async () => {
  const allowedRooms = {
    '123-456-abc': [chatUser1.id],
    '123-991-abb': [chatUser2.id],
  };
  const eventsToFail: string[] = [];
  const chatService = chat.bind(null, mockDriver(eventsToFail, allowedRooms));
  const roomId1 = '123-456-abc';
  const roomId2 = '123-991-abb';
  const cristianChat = chatService(chatUser1);
  const danielaChat = chatService(chatUser2);
  const { onMessage: onMessageCristian } = await cristianChat.enterRoom(
    roomId1
  );
  const { sendMessage: sendDaniela } = await danielaChat.enterRoom(roomId2);
  const message: ChatMessage = {
    content: 'Hello world',
  };
  const message2: ChatMessage = {
    content: 'Hello world, again!',
  };
  const cristianReceiver = jest.fn(message => {});
  onMessageCristian(cristianReceiver);
  await sendDaniela(message);
  await sendDaniela(message2);
  expect(cristianReceiver.mock.calls.length).toBe(0);
});

test('Users can enter multiple rooms if allowed', async () => {
  const room1 = '123-456-abc';
  const room2 = '555-456-abc';
  const room3 = '555-111-zzz';
  const allowedRooms = {
    [room1]: [chatUser1.id],
    [room2]: [chatUser1.id],
    [room3]: [chatUser1.id],
  };
  const eventsToFail: string[] = [];
  const chatService = chat.bind(null, mockDriver(eventsToFail, allowedRooms));
  expect(await chatService(chatUser1).enterRoom(room1)).toBeAChatRoom();
  expect(await chatService(chatUser1).enterRoom(room2)).toBeAChatRoom();
  expect(await chatService(chatUser1).enterRoom(room3)).toBeAChatRoom();
});

describe('Events', () => {
  test("Entering a room triggers the 'enter-room' event", async () => {
    const roomId = '123-456-abc';
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
    const roomId = '123-456-abc';
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

  test("The 'leave-room' event fires only for the rooms which the user is in", async () => {
    const room1Id = '123-456-abc';
    const room2Id = '444-456-xzy';
    const eventsToFail: string[] = [];
    const allowedRooms = {
      [room1Id]: [chatUser1.id],
      [room2Id]: [chatUser1.id, chatUser2.id],
    };
    const chatService = chat.bind(null, mockDriver(eventsToFail, allowedRooms));
    const user1Chat = chatService(chatUser1);
    const user2Chat = chatService(chatUser2);
    const leaveHandlerRoom1 = jest.fn((user, room) => {});
    const leaveHandlerRoom2 = jest.fn((user, room) => {});
    const { onLeaveRoom: user1OnLeaveRoom } = await user1Chat.enterRoom(
      room1Id
    );
    const { onLeaveRoom: user1OnLeaveRoom2 } = await user1Chat.enterRoom(
      room2Id
    );
    const { leaveRoom: user2LeaveRoom } = await user2Chat.enterRoom(room2Id);
    user1OnLeaveRoom(leaveHandlerRoom1);
    user1OnLeaveRoom2(leaveHandlerRoom2);
    await user2LeaveRoom();
    expect(leaveHandlerRoom1).not.toHaveBeenCalled();
    expect(leaveHandlerRoom2).toHaveBeenCalledTimes(1);
  });

  test("Disconnecting triggers the 'leave-room' event", async () => {
    const roomId = '123-456-abc';
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
    const roomId = '123-456-abc';
    const allowedRooms = { [roomId]: [chatUser1.id, chatUser2.id] };
    const eventsToFail: string[] = [];
    const chatService = chat.bind(null, mockDriver(eventsToFail, allowedRooms));
    const myChat = chatService(chatUser1);
    const danielaChat = chatService(chatUser2);
    const message: ChatMessage = {
      content: 'Hello world',
    };
    const expectedMessage = {
      ...message,
      room: { id: roomId },
      user: chatUser1,
      ts: expect.any(String),
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

describe('Errors', async () => {
  test('If no driver is provided throws an error', () => {
    // @ts-ignore

    expect(() => chat()).toThrow();
  });

  test('If no user is provided throws an error', () => {
    const chatService = chat.bind(null, mockDriver());
    // @ts-ignore
    expect(() => chatService()).toThrow();
  });

  test('If send message fails an error is thrown', async () => {
    const allowedRooms = { '123-456-abc': [chatUser1.id] };
    const eventsToFail = ['on-enter'];
    const chatService = chat.bind(null, mockDriver(eventsToFail, allowedRooms));
    const cristianChat = chatService(chatUser1);
    try {
      const { sendMessage } = await cristianChat.enterRoom('123-456-abc');
      await sendMessage({ content: 'Hello world!' });
    } catch (e) {
      expect(e.message).toBe('Cannot send message');
    }
  });

  test('If the driver connection fails an error is thrown', async () => {
    const allowedRooms = { '123-456-abc': [chatUser1.id] };
    const eventsToFail = ['on-enter'];
    const chatService = chat.bind(null, mockDriver(eventsToFail, allowedRooms));
    const cristianChat = chatService(chatUser1);
    try {
      await cristianChat.enterRoom('123-456-abc');
    } catch (e) {
      expect(e.message).toBe('Cannot connect');
    }
  });

  test('Entering a room which the user is not allowed to enter throws an error', async () => {
    const allowedRooms = {};
    const eventsToFail: string[] = [];
    const chatService = chat.bind(null, mockDriver(eventsToFail, allowedRooms));
    const cristianChat = chatService(chatUser1);
    await expect(cristianChat.enterRoom('123-456-abc')).rejects.toBeInstanceOf(
      Error
    );
  });
});

// ---------------------------------------------------------------------------
// Tests end here
// ---------------------------------------------------------------------------
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeAChatRoom: () => CustomMatcherResult;
      toBeAChatDriver: () => CustomMatcherResult;
    }
  }
}

expect.extend({
  toBeAChatRoom(actual: ChatRoom) {
    const pass =
      typeof actual === 'object' &&
      typeof actual.sendMessage === 'function' &&
      typeof actual.leaveRoom === 'function' &&
      typeof actual.onMessage === 'function' &&
      typeof actual.onEnterRoom === 'function' &&
      typeof actual.onLeaveRoom === 'function';
    return {
      message: () => `expected ${prettyFormat(actual)} to be a ChatRoom`,
      pass,
    };
  },
  toBeAChatDriver(actual: ReturnType<ChatDriver>) {
    const pass =
      typeof actual === 'object' &&
      typeof actual.connect === 'function' &&
      typeof actual.disconnect === 'function' &&
      typeof actual.trigger === 'function' &&
      typeof actual.listen === 'function';
    return {
      message: () => `expected ${prettyFormat(actual)} to be a ChatDriver`,
      pass,
    };
  },
});
