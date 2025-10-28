#!/bin/zsh

# install depot_tools
depot_tools_path="$HOME/depot_tools" # absolute path
if [ ! -e $depot_tools_path ]; then  # depot_tools doesn't exist
  git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git $depot_tools_path
  echo "
export PATH=$depot_tools_path:\$PATH
export DEPOT_TOOLS_UPDATE=0" >>~/.zshrc
fi
pushd $depot_tools_path
git checkout 4e4a2b865b6f1dfdda767dd04b210cb0e43fb4c6 # https://github.com/v8/v8/blob/0ac7e1203fcb957851887fb140dc8a41139846a5/DEPS#L220
popd
source ~/.zshrc

# get v8 and submodules
echo 'solutions = [
  {
    "name": "v8",
    "url": "https://chromium.googlesource.com/v8/v8.git@0ac7e1203fcb957851887fb140dc8a41139846a5",
    "managed": True,
  },
]' >.gclient
gclient sync -Dvvv

# install gdb plugin
echo "\nsource $PWD/v8/tools/gdbinit" >>~/.gdbinit

# build v8
pushd v8
git apply ../sandbox.diff
./build/install-build-deps.sh
gn gen out/debug --args='v8_enable_sandbox=true v8_expose_memory_corruption_api=true is_component_build=false v8_optimized_debug=false'
gn gen out/release --args='v8_enable_sandbox=true v8_expose_memory_corruption_api=true is_debug=false v8_enable_object_print=true v8_symbol_level=2'
autoninja -C out/debug d8
autoninja -C out/release d8 torque-language-server
popd
