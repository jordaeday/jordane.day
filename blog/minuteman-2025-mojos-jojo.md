---
name: minuteman-2025-mojos-jojo
title: minuteman ctf 2025 - mojo's jojo
number: 05
subtitle: writeup for a hard forensics challenge
date: 10/27/25
---
# Minuteman CTF 2025 Mojo's Jojo
## Problem Overview
This challenge is marked as a hard forensics challenge with the additional tags "virtual disks", "filesystems", and "image forensics". We are given a virtual machine and Professor Utonium's login and are told that Mojo Jojo has left secret plans in the desktop folder. The secret plans file tells us how to mount the .img file as a USB as "proof" Mojo Jojo has given up on being a villain.
## Solution
After mounting the image, we can look at 3 secret plans that are detailed, but none of these give us the flag or any additional actionable information.
### Part 1
Since looking at the plain files gave us nothing (and this is a CTF challenge, so there's got to be more to it!), we should check for hidden files using The Sleuth Kit (mentioned in the original Desktop file, a useful tool for recovering hidden/deleted/corrupted information) with the command `fls -r mojo_jojo_secret_plans.img` (`-r` so that we make sure to check within the "Secret Plans" directory (or the "Shopping List" directory, if he decides to hide hidden files there too)).
```bash
professor_utonium@fedora:~/Desktop$ fls -r mojo_jojo_secret_plans.img
```
```
d/d 4: Secret Plans
+ r/r 137: Plan 1 - Kidnap the Mayor of Townsville!
+ r/r 142: Plan 2 - Steal Professor Utonium's Chemical X Stash!
+ r/r 147: Plan 3 - Create a Kaiju to destroy Townsville
+ r/r * 149: SECRET_PLAN
d/d 6: Shopping List
+ r/r 262: List
v/v 33488259: $MBR
v/v 33488260: $FAT1
v/v 33488261: $FAT2
V/V 33488262: $OrphanFiles
```
Wow, "SECRET_PLAN" looks pretty promising, but let's understand the output first. From sleuthkit.org's man page: "**fls** lists the files and directory names in the _image_ and can display file names of recently deleted files for the directory using the given _inode._ If the inode argument is not given, the inode value for the root directory is used. For example, on an NTFS file system it would be 5 and on a Ext3 file system it would be 2. \[...] Once the inode has been determined, the file can be recovered using [**icat(1)**](https://www.sleuthkit.org/sleuthkit/man/icat.html) from The Coroners Toolkit."

So from the output, what we know about the files, and the man page, we can assume that that number 149 probably refers to the inode of the file, and the * probably marks that the file is deleted. So, let's use `icat` to find the contents of this hidden file.
```bash
professor_utonium@fedora:~/Desktop$ icat -r mojo_jojo_secret_plans.img 149
```
```
Step 1: Get training from Hackers
Step 2: Buy Malware
Step 3: Fake my surrender to the Powerpuff Girls, and give them fake plans on a USB to distract them.
Step 4: Use malware hidden on the USB to steal the Chemical X formula while the Girls are distracted! MUAHAHA!

note: professor utonium is smart, will check for hidden files or deleted files. must make half of USB unaccessible. map only half the USB.
```
More information! We know that only half of the USB is mapped, so now let's figure out how to access the rest of the USB.
### Part 2
Only half of the USB is mounted. My first thought is: "Why didn't `fls` show us the rest of the USB?" The answer to this must lie in how `fls` works - it uses the file system it encounters to check against the data of the image. So, if it didn't find (potentially hidden) files in the second half of the USB, there has to be another file system. But before `fls` even gets to the file system information, it has to know what file system the image uses, since it is compatible with multiple. That means it has to look at the boot sector (MBR) of the drive. Since the boot sector didn't reveal this second file system to `fls`, there also should be another boot sector.

So, since we know we are looking for a MBR, we need to find a trait of the MBR that could help us find where it is located. Lucky for us, every MBR ends with the same bytes - `55 aa`, so let's look for those:
```bash 
professor_utonium@fedora:~/Desktop$ hexdump -C mojo_jojo_secret_plans.img | grep "55 aa" 
```
```
000001f0 00 00 00 00 00 00 00 00 00 00 00 00 00 00 55 aa |..............U.| 000003f0 00 00 00 00 00 00 00 00 00 00 00 00 00 00 55 aa |..............U.| 00000df0 00 00 00 00 00 00 00 00 00 00 00 00 00 00 55 aa |..............U.| 00000ff0 00 00 00 00 00 00 00 00 00 00 00 00 00 00 55 aa |..............U.| 400001f0 00 00 00 00 00 00 00 00 00 00 00 00 00 00 55 aa |..............U.| 400003f0 00 00 00 00 00 00 00 00 00 00 00 00 00 00 55 aa |..............U.| 40000df0 00 00 00 00 00 00 00 00 00 00 00 00 00 00 55 aa |..............U.| 40000ff0 00 00 00 00 00 00 00 00 00 00 00 00 00 00 55 aa |..............U.| 
```
Ok, those offsets seem rather interesting. For each instance of `55 aa` in the first half, there is another one at the same offset + 0x40000000 - this is probably the "hidden" part of the image that we weren't able to access earlier. 

To find out where this hidden part starts at, lets go to the first byte! Since `55 aa` are the last 2 bytes of the MBR, and the MBR is one sector, which is typically 512 bytes (which we can confirm by running `mmls` on the mounted image), we can do some quick math to find where it starts at. `55 aa` takes up 2 bytes, so it exists at bytes 510 and 511 in the sector (0 indexed), which in hex, 510 = 0x1FE, which is the offset of the bytes in the hexdump plus 0x40000000. So, this hidden part starts at 0x40000000. To find the files in it, let's try just mounting bytes 0x40000000 (1073741824 in decimal) until the end of the image and do some analysis on that (note that I had to make a copy of "mojo_jojo_secret_plans.img", since the original file was already mounted):
```bash
professor_utonium@fedora:~/Desktop$ sudo mkdir -p /mnt/myimage
professor_utonium@fedora:~/Desktop$ sudo mount -o loop,offset=1073741824
mojo2_jojo_secret_plans.img /mnt/myimage
professor_utonium@fedora:~/Desktop$ cd /mnt/myimage/
professor_utonium@fedora:/mnt/myimage$ ls
gloat malware
```
Wow! 2 files that aren't hidden - let's look at the first one:
```bash
professor_utonium@fedora:/mnt/myimage$ cat gloat
```
```
AHA!BYTHETIMEYOUHAVESEENTHIS,ITWILLHAVEBEENTOOLATE!I,MOJOJOJO,HAVESTOLENTHEFORM
ULAFORCHEMICALX,ANDHAVEESCAPEDTOACOUNTRYTHATDOESNOTEXTRADITEFORPATENTINFRINGEME
NT!
MINUTEMAN{m0nK3Y_bUs1N3s5}
```
And that's the flag!