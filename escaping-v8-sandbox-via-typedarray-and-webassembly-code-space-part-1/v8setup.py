#!/usr/bin/env python3

import os
import requests
from bs4 import BeautifulSoup
import subprocess


# config

v8_git = "https://chromium.googlesource.com/v8/v8.git"
v8_path = "v8"
v8_version = "0ac7e1203fcb957851887fb140dc8a41139846a5"

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

subprocess.run(["build/install-build-deps.sh"])

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
