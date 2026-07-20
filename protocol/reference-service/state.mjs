const MAP_STORES = [
  "objectsByRef",
  "refsByIdentity",
  "urisByRef",
  "accessByRef",
  "runtimeBindingsByKey",
  "dataGrantsByRef",
  "grantStatesByRef",
  "effectDescriptorsByRef",
  "idempotencyRecords"
];

function replaceMap(target, source) {
  target.clear();
  for (const [key, value] of source) target.set(key, value);
}

function cloneMap(source) {
  return new Map([...source].map(([key, value]) => [key, structuredClone(value)]));
}

export class MemoryReferenceStores {
  #active = false;

  constructor(seed = {}) {
    for (const name of MAP_STORES) this[name] = seed[name] ?? new Map();
    this.usedNonces = seed.usedNonces ?? new Set();
    for (const name of MAP_STORES) {
      if (!(this[name] instanceof Map)) throw new TypeError(`${name} must be a Map`);
    }
    if (!(this.usedNonces instanceof Set)) throw new TypeError("usedNonces must be a Set");
  }

  transaction(work) {
    if (this.#active) throw new Error("reference store transaction is already active");
    this.#active = true;
    const draft = Object.fromEntries(MAP_STORES.map((name) => [name, cloneMap(this[name])]));
    draft.usedNonces = new Set(this.usedNonces);
    try {
      const outcome = work(draft);
      if (outcome && typeof outcome.then === "function") throw new TypeError("reference transactions must be synchronous");
      if (outcome?.commit !== false) {
        for (const name of MAP_STORES) replaceMap(this[name], draft[name]);
        this.usedNonces.clear();
        for (const nonce of draft.usedNonces) this.usedNonces.add(nonce);
      }
      return outcome?.value;
    } finally {
      this.#active = false;
    }
  }
}
