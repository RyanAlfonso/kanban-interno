const debounce = (fn: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
};

const throttle = (fn: Function, delay: number) => {
  let lastRun = 0;
  return (...args: any[]) => {
    const now = Date.now();
    if (now - lastRun < delay) return;
    lastRun = now;
    return fn(...args);
  };
};

const deepCopy = <T>(value: T, hashmap = new WeakMap()): T => {
  if (typeof value !== "object" || value === null) return value;

  if (hashmap.has(value)) return hashmap.get(value);

  let clone = Array.isArray(value) ? ([] as T) : ({} as T);
  hashmap.set(value, clone);

  for (let key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      clone[key] = deepCopy(value[key], hashmap);
    }
  }

  return clone;
};

export { debounce, throttle, deepCopy };
