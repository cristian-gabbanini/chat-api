export function wait(ms: number = 0) {
  return new Promise(res => {
    if ('nextTick' in process) {
      process.nextTick(() => res(true));
    } else {
      setTimeout(() => res(true), ms);
    }
  });
}

export function delay(fn: () => void, ms: number = 15) {
  if ('nextTick' in process) {
    process.nextTick(() => {
      fn();
    });
  } else {
    setTimeout(fn, ms);
  }
}
