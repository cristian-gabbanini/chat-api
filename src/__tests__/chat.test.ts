import { chat } from "../chat";
import { localChatDriver, clearRooms } from "../localChatDriver";

afterEach(() => {
  clearRooms();
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
    expect(user).toEqual(user2);
    expect(room.id).toEqual("123-456-abc");
  });

  cristianChat.onEnterRoom(eventHandler);

  const danielaChat = chat(localChatDriver, user2);
  const leaveRoom1 = danielaChat.enterRoom("123-456-abc");

  expect(eventHandler.mock.calls.length).toBe(1);
});
