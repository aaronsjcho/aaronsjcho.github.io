#!/usr/bin/env python3

import os
import requests
from bs4 import BeautifulSoup
import subprocess


# config

v8_git = "https://chromium.googlesource.com/v8/v8.git"
v8_path = "v8"
v8_version = "7e9715d8a955214788475dd33a16312ba4d5c3da"

depot_tools_git = "https://chromium.googlesource.com/chromium/tools/depot_tools.git"
depot_tools_path = "depot_tools"

patches = ["sandbox.diff"]

debug_outdir = "debug"
debug_args = """v8_enable_sandbox = true
v8_expose_memory_corruption_api = true
is_component_build = false
v8_optimized_debug = false
v8_no_inline = true
"""
debug_target = ["d8"]

release_outdir = "release"
release_args = """v8_enable_sandbox = true
v8_expose_memory_corruption_api = true
is_debug = false
v8_enable_object_print = true
v8_symbol_level = 2
"""
release_target = ["d8", "torque-language-server"]


# get depot_tools version

res = requests.get(f"{v8_git}/+/{v8_version}/DEPS")
soup = BeautifulSoup(res.text, "html.parser")
l = soup.find_all("span", class_="str")
for i in range(len(l)):
    if "depot_tools.git" in str(l[i].contents[0]):
        depot_tools_version = str(l[i + 2].contents[0])[1:-1]


# install depot_tools

if not os.path.exists(depot_tools_path):
    subprocess.run(["git", "clone", depot_tools_git, depot_tools_path])

oldpwd = os.path.abspath(os.curdir)
os.chdir(depot_tools_path)
subprocess.run(["git", "checkout", depot_tools_version])
os.chdir(oldpwd)

env = os.environ
env["PATH"] = f'{os.path.abspath(os.curdir)}/{depot_tools_path}:{env["PATH"]}'


# download source codes

solutions = [{"name": v8_path, "url": f"{v8_git}@{v8_version}", "managed": True}]
with open(".gclient", "w") as f:
    f.write(f"solutions = {solutions}")
env["DEPOT_TOOLS_UPDATE"] = "0"
subprocess.run(["gclient", "sync", "-Dvvv"], env=env)


# build

os.chdir(v8_path)

for patch in patches:
    subprocess.run(["git", "apply", f"../{patch}"])

# subprocess.run(["build/install-build-deps.sh"])
os.system(
    "sudo apt install -y libgl1:i386 binutils binutils-aarch64-linux-gnu binutils-arm-linux-gnueabihf binutils-mips64el-linux-gnuabi64 binutils-mipsel-linux-gnu bison bzip2 cdbs curl dbus-x11 devscripts dpkg-dev elfutils fakeroot flex git-core gperf lib32gcc-s1 lib32stdc++6 libasound2 libasound2-dev libatk1.0-0 libatspi2.0-0 libatspi2.0-dev libbluetooth-dev libbrlapi0.8 libbrlapi-dev libbz2-1.0 libbz2-dev libc6 libc6-dev libc6-i386 libcairo2 libcairo2-dev libcap2 libcap-dev libcups2 libcups2-dev libcurl4-gnutls-dev libdrm2 libdrm-dev libelf-dev libevdev2 libevdev-dev libexpat1 libffi7 libffi-dev libfontconfig1 libfreetype6 libgbm1 libgbm-dev libgl1 libglib2.0-0 libglib2.0-dev libglu1-mesa-dev libgtk-3-0 libgtk-3-dev libinput10 libinput-dev libjpeg-dev libkrb5-dev libnspr4 libnspr4-dev libnss3 libnss3-dev libpam0g libpam0g-dev libpango-1.0-0 libpci3 libpci-dev libpcre3 libpixman-1-0 libpng16-16 libpulse0 libpulse-dev libsctp-dev libspeechd2 libspeechd-dev libsqlite3-0 libsqlite3-dev libssl-dev libstdc++6 libudev1 libudev-dev libuuid1 libva-dev libvulkan1 libvulkan-dev libwayland-egl1-mesa libwww-perl libx11-6 libx11-xcb1 libxau6 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxdmcp6 libxext6 libxfixes3 libxi6 libxinerama1 libxkbcommon-dev libxrandr2 libxrender1 libxshmfence-dev libxslt1-dev libxss-dev libxt-dev libxtst6 libxtst-dev locales mesa-common-dev openbox p7zip patch perl pkg-config rpm ruby snapcraft subversion uuid-dev wdiff x11-utils xcompmgr xz-utils zip zlib1g zstd"
)

env["NINJA_SUMMARIZE_BUILD"] = "1"

if not os.path.exists(f"out/{debug_outdir}"):
    os.makedirs(f"out/{debug_outdir}")
with open(f"out/{debug_outdir}/args.gn", "w") as f:
    f.write(debug_args)
subprocess.run(["gn", "gen", f"out/{debug_outdir}"], env=env)
subprocess.run(["autoninja", "-C", f"out/{debug_outdir}"] + debug_target, env=env)

if not os.path.exists(f"out/{release_outdir}"):
    os.makedirs(f"out/{release_outdir}")
with open(f"out/{release_outdir}/args.gn", "w") as f:
    f.write(release_args)
subprocess.run(["gn", "gen", f"out/{release_outdir}"], env=env)
subprocess.run(["autoninja", "-C", f"out/{release_outdir}"] + release_target, env=env)
