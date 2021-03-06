import { wait } from '../__helpers__/helpers';
import { __WebSocket } from '../__mocks__/WebSocket';

declare global {
  interface Window {
    WebSocket: (url: string, procotol?: string) => void;
  }
}

beforeEach(() => {
  window.WebSocket = __WebSocket;
});

test('Creates a mock WebSocket', () => {
  const socket = new WebSocket('http://chat.somehost.org', 'json');
  expect(socket).toHaveProperty('close');
  expect(socket).toHaveProperty('send');
  expect(socket).toHaveProperty('onopen');
  expect(socket).toHaveProperty('onmessage');
  expect(socket).toHaveProperty('onerror');
  expect(socket.protocol).toBe('json');
});

test('Triggers the onopen event', async () => {
  const socket = new WebSocket('http://chat.somehost.org', 'json');
  const onOpenHandler = jest.fn();
  socket.onopen(onOpenHandler);
  await wait();
  expect(onOpenHandler).toHaveBeenCalledTimes(1);
});
