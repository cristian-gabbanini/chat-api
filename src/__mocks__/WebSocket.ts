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

  setTimeout(() => {
    const e: Event = {
      type: 'ONOPEN',
      state: 'READY',
    };
    onOpen.forEach(listener => listener(e));
  }, 15);

  return socket;
}
