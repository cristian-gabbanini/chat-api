import { delay } from '../__helpers__/helpers';

export function __WebSocket(url: string, protocol: string) {
  const onOpen: Function[] = [];
  const socket = {
    close: () => {},
    send: (data: any) => {},
    onopen: (fn: (event: Event) => void): void => {
      onOpen.push(fn);
    },
    onmessage: (event: Event) => {},
    onerror: (event: Event) => {},
    protocol,
  };

  delay(() => {
    const e: Event = {
      type: 'ONOPEN',
      state: 'READY',
    };
    onOpen.forEach(listener => listener(e));
  });
  return socket;
}
