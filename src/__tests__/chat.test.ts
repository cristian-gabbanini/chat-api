import { chat, ChatMessage } from "../chat";
import {
  localChatDriver,
  clearRooms,
  clearMessages,
  getMessages
} from "../localChatDriver";

afterEach(() => {
  clearRooms();
  clearMessages();
});

test("Creates a chat instance", () => {
  const user = {
    id: "123-32323",
    firstName: "Cristian",
    lastName: "Gabbanini"
  };
  const myChat = chat(localChatDriver, user);

  expect(myChat).toHaveProperty("disconnect");
  expect(myChat).toHaveProperty("sendMessage");
  expect(myChat).toHaveProperty("onMessage");
  expect(myChat).toHaveProperty("onEnterRoom");
});

test("Users can enter room", () => {
  const user1 = {
    id: "123-32323",
    firstName: "Cristian",
    lastName: "Gabbanini"
  };
  const myChat = chat(localChatDriver, user1);

  const user2 = {
    id: "123-42323",
    firstName: "Daniela",
    lastName: "Bulgarelli"
  };
  const myChat2 = chat(localChatDriver, user2);

  const leaveRoom1 = myChat.enterRoom("123-456-abc");
  const leaveRoom2 = myChat2.enterRoom("123-456-abc");

  expect(typeof leaveRoom1).toBe("function");
  expect(typeof leaveRoom2).toBe("function");
  const users = myChat.driver.usersInRoom("123-456-abc");

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
  const myChat = chat(localChatDriver, user1);

  myChat.enterRoom("123-456-abc");
  myChat.enterRoom("123-456-abc");

  const users = myChat.driver.usersInRoom("123-456-abc");
  expect(users).toHaveLength(1);
});

test("User can leave a room", () => {
  const user1 = {
    id: "123-32323",
    firstName: "Cristian",
    lastName: "Gabbanini"
  };
  const myChat = chat(localChatDriver, user1);

  const leaveRoom1 = myChat.enterRoom("123-456-abc");
  leaveRoom1();
  const users = myChat.driver.usersInRoom("123-456-abc");
  expect(users).toHaveLength(0);
});

test("Entering a room triggers the enter-room event", () => {
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
  const cristianChat = chat(localChatDriver, user1);

  const eventHandler = jest.fn((user, room) => {
    if (user.id === user1.id) {
      console.log("I am online!");
    } else {
      console.log(`${user.firstName} ${user.lastName} is online!`);
    }
  });

  cristianChat.onEnterRoom(eventHandler);

  const danielaChat = chat(localChatDriver, user2);
  const leaveRoom1 = danielaChat.enterRoom("123-456-abc");
  expect(eventHandler.mock.calls.length).toBe(1);
});

test("Leaving a room triggers the leave-room event", () => {
  const user1 = {
    id: "123-32323",
    firstName: "Cristian",
    lastName: "Gabbanini"
  };

  const cristianChat = chat(localChatDriver, user1);

  const eventHandler = jest.fn((user, room) => {});

  const leaveRoom = cristianChat.enterRoom("123-456-111");
  cristianChat.onLeaveRoom(eventHandler);

  leaveRoom();

  expect(eventHandler.mock.calls.length).toBe(1);
});

test("Disconnecting triggers the leave-room event", () => {
  const user1 = {
    id: "123-32323",
    firstName: "Cristian",
    lastName: "Gabbanini"
  };

  const cristianChat = chat(localChatDriver, user1);

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
  const myChat = chat(localChatDriver, user1);
  const roomId = "123-456-abc";
  const leaveRoom1 = myChat.enterRoom(roomId);
  const message: ChatMessage = {
    type: "message",
    content: "Hello world",
    user: user1
  };

  myChat.sendMessage(message);
  myChat.sendMessage(message);

  expect(getMessages(roomId)).toHaveLength(2);
});

test("Users can receive messages from others", async () => {
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

  const cristianChat = chat(localChatDriver, user1);
  const danielaChat = chat(localChatDriver, user2);

  cristianChat.enterRoom(roomId);
  danielaChat.enterRoom(roomId);

  const message: ChatMessage = {
    type: "message",
    content: "Hello world",
    user: user2
  };
  const message2: ChatMessage = {
    type: "message",
    content: "Hello world, again!",
    user: user2
  };

  const cristianReceiver = jest.fn(message => {
    console.log(message);
  });

  const danielaReceiver = jest.fn(message => {
    console.log(message);
  });

  cristianChat.onMessage(cristianReceiver);
  danielaChat.onMessage(danielaReceiver);

  await danielaChat.sendMessage(message);
  await danielaChat.sendMessage(message2);

  expect(cristianReceiver.mock.calls.length).toBe(2);
  expect(danielaReceiver.mock.calls.length).toBe(0);
});
