---
name: cloud-lab-1-ssl-inspection
title: cloud lab 1: ssl inspection
number: 07
subtitle: implementing ssl inspection using AWS EC2 instances
date: 04/29/26
---
# Cloud Lab 1: SSL Inspection
## Overview
Inspired by some interview questions I've been asked lately, I decided to implement SSL inspection using a Squid proxy on AWS EC2 instances. The goal is to put a proxy between a client and a webserver, intercepting encrypted HTTPS traffic (useful for filtering webpages in IT & enterprise systems) without interrupting the user experience.

I used 3 instances for this lab:
- Alice - represents the client trying to access a web page, on a private subnet without internet access (but with access to Bob)
- Bob - the Squid proxy and "man-in-the-middle" between Alice and Charlie; this machine actually performs the SSL inspection
- Charlie - represents the webserver hosting a site (nginx)

Alice intentionally doesn't have internet access, as this would mirror what an enterprise system has on a private network - an isolated network with gateways allowing access to the outside world. Besides, if Alice did have internet, she could just bypass using Bob :p
## Network Setup (VPC)
I created my own VPC with two subnets, one public, one private, and no NAT gateway. Charlie and Bob are both on the public subnet, and Alice is on the private subnet with no public IP.

Since Alice doesn't have a public IP, this means that for access into Alice, you can't ssh directly to her! You must SSH into Bob with the `-A` flag, then from Bob, ssh into Alice. I'm on mac, so this is done with SSH agent forwarding:
```bash
# on local machine:
ssh-add ~/Downloads/lab-A-key.pem
ssh -A -i ~/Downloads/lab-B-key.pem ubuntu@<BOB-PUBLIC-IP>
# then from bob:
ssh ubuntu@<ALICE-PRIVATE-IP>
```
## The Machines
All machines are generally just the defaults for an AWS EC2 (t3.micro for Alice and Charlie, and t3.small for Bob) instance running Ubuntu, except they are on the custom VPC I created and they each have their own security groups so that access to the internet/other machines is limited.
### Charlie (Webserver)
Charlie is pretty straightforward, it runs nginx and has a self-signed TLS cert. BUT! I ran into an issue - modern TLS wants the IP address to be in the Subject Alternate Name (SAN) field of the cert, not just the Common Name (CN), so `curl` will reject if there isn't a matching IP address in the SAN:
```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/charlie.key \
  -out /etc/ssl/certs/charlie.crt \
  -subj "/CN=<CHARLIE-PUBLIC-IP>" \
  -addext "subjectAltName=IP:<CHARLIE-PUBLIC-IP>"
```
But this doesn't work entirely. It works for initial verification (`curl`-ing Charlie's public IP from my laptop, using `-k` to skip cert validation), but once Alice starts getting routed through Bob, the cert issuer showed `CN=BobProxyCA` (more about Bob's cert later), but `curl` was failing:
```
* subjectAltName does not match ipv4 address '<CHARLIE-PUBLIC-IP>'
* SSL: no alternative certificate subject name matches target ipv4 address '<CHARLIE-PUBLIC-IP>'
curl: (60) SSL: no alternative certificate subject name matches
```
This happens because when Bob makes a fake cert using Squid, it mimics part of Charlie's real cert, specifically, the subject CN, but it _doesn't_ include a SAN for the IP address (and the IP must be explicitly mentioned in the SAN if it is an IP the user is connecting to).

The fix for this is to use a hostname from nip.io (a DNS service that resolves a hostname in the format `1-2-3-4.nip.io` to the IP address `1.2.3.4`). Then, the cert will automatically include `DNS:<NIP-IO-URL>` in the SAN, which `curl` accepts! However, since we changed what the cert is actually for, we need to regenerate it:
```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/charlie.key \
  -out /etc/ssl/certs/charlie.crt \
  -subj "/CN=<CHARLIE-NIP-IO>" \
  -addext "subjectAltName=IP:<CHARLIE-PUBLIC-IP>,DNS:<CHARLIE-NIP-IO>"
```
Now, Alice curls using using the hostname, not the IP, which then resolves to the IP.

The nginx config on Charlie is simple, it just requires minor modifications to the default configuration in `/etc/nginx/sites-available/default`:
```
server {
	listen 80 default_server;
	listen [::]:80 default_server;

	# SSL configuration
	listen 443 ssl default_server;
	listen [::]:443 ssl default_server;

	ssl_certificate /etc/ssl/certs/charlie.crt;
	ssl_certificate_key /etc/ssl/private/charlie.key;

	root /var/www/html;

	index index.html index.htm index.nginx-debian.html;

	server_name _;

	location / {
		try_files $uri $uri/ =404;
	}
}
```
### Bob (Squid Proxy)
Bob is where the actual SSL inspecting takes place. The major roadblock with Bob is that the default Squid package is compiled with GnuTLS instead of OpenSSL. SSL bump specifically requires OpenSSL (since GnuTLS doesn't support SSL bump) and the `ssl_crtd` helper. The fix for this is to recompile from source:
```bash
./configure \
  --prefix=/usr \
  --sysconfdir=/etc/squid \
  --localstatedir=/var \
  --libexecdir=/usr/lib/squid \
  --with-openssl \
  --enable-ssl-crtd \
  --with-default-user=proxy \
  --with-logdir=/var/log/squid \
  --with-pidfile=/run/squid.pid
```
It's a pretty simple fix, but unfortunately, on the AWS free plan, trying to run this while not running out of the CPU credits that replenish hourly can be kind of a pain, so while Bob originally started as a t3.micro, I had to bump it up to a t3.small after a while so I could actually get it to compile.

Once we have Squid set up, we need to make Bob a CA so that he can sign certs on the fly for Alice:
```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/squid/bump.key \
  -out /etc/squid/bump.crt \
  -subj "/CN=BobProxyCA"

sudo chmod 400 /etc/squid/bump.key
sudo chown proxy:proxy /etc/squid/bump.crt /etc/squid/bump.key
```
Worth noting is that here, we need to run `security_file_certgen` as the proxy user (what Squid runs as by default), since the `ssl_db` it creates will be owned by that proxy user. To make the certs on the fly, we need the certgen helper to create the `ssl_db` directory:
```bash
sudo -u proxy /usr/lib/squid/security_file_certgen \
  -c -s /var/spool/squid/ssl_db -M 4MB
```
The `squid.conf` file for this lab is pretty minimal:
```squid
http_port 3128 ssl-bump \
  cert=/etc/squid/bump.crt \
  key=/etc/squid/bump.key \
  generate-host-certificates=on \
  dynamic_cert_mem_cache_size=4MB

sslcrtd_program /usr/lib/squid/security_file_certgen \
  -s /var/spool/squid/ssl_db \
  -M 4MB

ssl_bump bump all

http_access allow all

sslproxy_cert_error allow all

dns_nameservers 8.8.8.8 8.8.4.4

access_log /var/log/squid/access.log
cache_log /var/log/squid/cache.log
```
### Alice (Client)
Alice is the simplest in terms of setup - as the client, we just need to install Bob's CA into her trust store, so that she actually trusts Bob as a CA. This requires copying the contents of `/etc/squid/bump.crt` (from Bob) to Alice's `/usr/local/share/ca-certificates/bob-ca.crt` and running `sudo update-ca-certificates`.
## Validation
Now that we've set everything up, we can validate our setup works by trying to access Charlie's webpage from Alice:
```bash
curl -v -x http://<BOB-PRIVATE-IP>:3128 https://<CHARLIE-NIP-IO>/test
```
As part of that output, we see:
```
* Server certificate:
*   subject: CN=<CHARLIE-NIP-IO>
*   issuer: CN=BobProxyCA
*   subjectAltName: "<CHARLIE-NIP-IO>" matches cert's "<CHARLIE-NIP-IO>"
* SSL certificate verified via OpenSSL.
```
This is important, it means that Alice doesn't see Charlie's cert, instead, she sees a fake cert signed by BobProxyCA, which she trusts (since it BobProxyCA is in her trust store). If we look at Bob's access log with `sudo tail /var/log/squid/access.log`, we get:
```
TCP_MISS/200 GET https://<CHARLIE-NIP-IO>/test - HIER_DIRECT/<CHARLIE-PUBLIC-IP>
```
This proves that we can see the full URL Alice is trying to access! Without SSL bump, you would see a `CONNECT` tunnel and nothing inside it.

From Charlie's perspective in `/var/log/nginx/access.log`, we see:
```
<BOB-PUBLIC-IP> - - [29/Apr/2026:22:58:20 +0000] "GET /test HTTP/1.1" 404 162 "-" "curl/8.18.0"
```
This means that Charlie doesn't ever interact with or see Alice - only Bob.
## Conclusion
At a high level, the flow of the request is as follows:
1. Alice tries to `CONNECT` to Charlie by sending a request to Bob.
2. Bob intercepts it and makes a fake cert for Charlie (the nip.io address) and signs it with BobProxyCA.
3. Bob sends the fake cert to Alice, who trusts the cert.
4. Bob makes his own connection to Charlie with TLS.
5. Bob decrypts Alice's requests, logs them, reencrypts them, and makes the requests himself, passing the answers along to Alice, signed with BobProxyCA.
Neither Alice nor Charlie know they aren't talking to each other directly - they think they are on their own connection, but Bob acts as a man-in-the-middle, which is particularly useful in enterprise systems for many reasons, including malware detection, data loss prevention, compliance, and more. 