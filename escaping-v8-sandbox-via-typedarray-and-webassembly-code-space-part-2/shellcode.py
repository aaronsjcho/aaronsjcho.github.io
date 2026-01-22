from pwn import *

context(arch="amd64")

shellcode = list(asm(shellcraft.sh()))
print(shellcode)
