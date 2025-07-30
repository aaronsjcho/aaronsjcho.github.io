import os
from requests import get
from subprocess import run


depot_tools_git = "https://chromium.googlesource.com/chromium/tools/depot_tools"
depot_tools_path = "depot_tools"

v8_git = "https://github.com/v8/v8"
v8_path = "v8"

v8_checkout = "cb5c1b8a1fd1eee214501ee06fdd4566886803c1"

patches = []

debug_outdir = "out/debug"
debug_args = """v8_enable_sandbox = true
v8_expose_memory_corruption_api = true
is_component_build = false
v8_optimized_debug = false
"""
debug_targets = ["d8"]

release_outdir = "out/release"
release_args = """v8_enable_sandbox = true
v8_expose_memory_corruption_api = true
is_debug = false
v8_enable_object_print = true
v8_symbol_level = 2
"""
release_targets = ["d8", "torque-language-server"]

wabt = True


# get depot_tools checkout
if not os.path.exists(depot_tools_path):
    run(["git", "clone", depot_tools_git, depot_tools_path])
res = get(f"{v8_git}/blob/{v8_checkout}/DEPS")
tokens = res.text.split("'")
for i in range(len(tokens)):
    if "depot_tools.git" in tokens[i]:
        depot_tools_checkout = tokens[i + 4]

# install depot_tools
os.chdir(depot_tools_path)
run(["git", "checkout", depot_tools_checkout])
os.chdir(os.pardir)
env = os.environ.copy()
env["PATH"] = f'{os.path.abspath(os.curdir)}/{depot_tools_path}:{env["PATH"]}'
env["DEPOT_TOOLS_UPDATE"] = "0"

# get v8 and submodules
solutions = [{"name": "v8", "url": f"{v8_git}@{v8_checkout}", "managed": True}]
with open(".gclient", "w") as f:
    f.write(f"solutions = {solutions}")
run(["gclient", "sync", "-D"], env=env)

# install gdb plugin
with open(f'{os.path.expanduser("~")}/.gdbinit', "a") as f:
    f.write("\n")
    f.write(f"source {os.path.abspath(os.curdir)}/{v8_path}/tools/gdbinit")
    f.write("\n")

# install build dependencies
os.chdir(v8_path)
run(["build/install-build-deps.sh"])

# install wabt
if wabt:
    run(["sudo", "apt", "install", "-y", "wabt"])

# apply patches
for patch in patches:
    run(["git", "apply", f"../{patch}"])

# debug build
if not os.path.exists(debug_outdir):
    os.mkdir(debug_outdir)
with open(f"{debug_outdir}/args.gn", "w") as f:
    f.write(debug_args)
run(["gn", "gen", debug_outdir], env=env)
run(["autoninja", "-C", debug_outdir] + debug_targets, env=env)

# release build
if not os.path.exists(release_outdir):
    os.mkdir(release_outdir)
with open(f"{release_outdir}/args.gn", "w") as f:
    f.write(release_args)
run(["gn", "gen", release_outdir], env=env)
run(["autoninja", "-C", release_outdir] + release_targets, env=env)
