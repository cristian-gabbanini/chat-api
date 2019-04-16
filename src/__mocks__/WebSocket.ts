export function __WebSocket(url: string, protocol: string) {
  const socket = {
    close: () => {},
    send: (data: any) => {},
    onopen: (event: Event) => {},
    onmessage: (event: Event) => {},
    onerror: (event: Event) => {},
    protocol,
  };

  return socket;
}
