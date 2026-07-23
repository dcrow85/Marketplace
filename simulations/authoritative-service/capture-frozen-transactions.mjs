import { canonicalHash } from "../../protocol/lib/core.mjs";
import { MemoryReferenceStores } from "../../protocol/reference-service/state.mjs";

const MAP_NAMES = [
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

function sortedMapEntries(map) {
  return [...map.entries()].sort(([left], [right]) =>
    Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"))
  );
}

function snapshot(store) {
  return {
    used_nonces: [...store.usedNonces].sort(),
    maps: Object.fromEntries(MAP_NAMES.map((name) => [
      name,
      {
        size: store[name].size,
        hash: canonicalHash(sortedMapEntries(store[name]))
      }
    ]))
  };
}

const originalTransaction = MemoryReferenceStores.prototype.transaction;

MemoryReferenceStores.prototype.transaction = function captureTransaction(work) {
  const before = snapshot(this);
  let callbackOutcome = null;
  let callbackBefore = null;
  let callbackAfter = null;
  const returned = originalTransaction.call(this, (draft) => {
    callbackBefore = snapshot(draft);
    callbackOutcome = work(draft);
    callbackAfter = snapshot(draft);
    return callbackOutcome;
  });
  const after = snapshot(this);
  const record = {
    commit: callbackOutcome?.commit ?? null,
    value: callbackOutcome?.value ?? null,
    callback_before: callbackBefore,
    callback_after: callbackAfter,
    before,
    after
  };
  process.stdout.write(`CAIRN_FROZEN_TX=${JSON.stringify(record)}\n`);
  return returned;
};
