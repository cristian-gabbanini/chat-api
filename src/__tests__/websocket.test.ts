import { __WebSocket } from '../__mocks__/WebSocket';

declare global {
  interface Window {
    WebSocket: (url: string, procotol?: string) => void;
  }
}

window.WebSocket = __WebSocket;

test('Creates a mock WebSocket', () => {
  const socket = new WebSocket('http://chat.somehost.org', 'json');
  expect(socket).toHaveProperty('close');
  expect(socket).toHaveProperty('send');
  expect(socket).toHaveProperty('onopen');
  expect(socket).toHaveProperty('onmessage');
  expect(socket).toHaveProperty('onerror');
  expect(socket.protocol).toBe('json');
});
