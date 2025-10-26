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

# build v8
pushd v8
git apply ../sandbox.diff
sudo apt install -y apache2-bin binutils binutils-aarch64-linux-gnu binutils-arm-linux-gnueabihf binutils-mips64el-linux-gnuabi64 binutils-mipsel-linux-gnu bison bzip2 cdbs curl dbus-x11 devscripts dpkg-dev elfutils fakeroot flex git-core gperf lib32gcc-s1 lib32stdc++6 libasound2 libasound2-dev libatk1.0-0 libatspi2.0-0 libatspi2.0-dev libbluetooth-dev libbrlapi0.8 libbrlapi-dev libbz2-1.0 libbz2-dev libc6 libc6-dev libc6-i386 libcairo2 libcairo2-dev libcap2 libcap-dev libcups2 libcups2-dev libcurl4-gnutls-dev libdrm2 libdrm-dev libelf-dev libevdev2 libevdev-dev libexpat1 libffi7 libffi-dev libfontconfig1 libfreetype6 libgbm1 libgbm-dev libglib2.0-0 libglib2.0-dev libglu1-mesa-dev libgtk-3-0 libgtk-3-dev libinput10 libinput-dev libjpeg-dev libkrb5-dev libnspr4 libnspr4-dev libnss3 libnss3-dev libpam0g libpam0g-dev libpango-1.0-0 libpci3 libpci-dev libpcre3 libpixman-1-0 libpng16-16 libpulse0 libpulse-dev libsctp-dev libspeechd2 libspeechd-dev libsqlite3-0 libsqlite3-dev libssl-dev libstdc++6 libudev1 libudev-dev libuuid1 libva-dev libvulkan1 libvulkan-dev libwayland-egl1-mesa libwww-perl libx11-6 libx11-xcb1 libxau6 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxdmcp6 libxext6 libxfixes3 libxi6 libxinerama1 libxkbcommon-dev libxrandr2 libxrender1 libxshmfence-dev libxslt1-dev libxss-dev libxt-dev libxtst6 libxtst-dev locales mesa-common-dev openbox p7zip patch perl pkg-config python-setuptools rpm ruby snapcraft subversion uuid-dev wdiff x11-utils xcompmgr xz-utils zip zlib1g # manually install build dependencies
gn gen out/debug --args='v8_enable_sandbox=true v8_expose_memory_corruption_api=true is_component_build=false v8_optimized_debug=false'
gn gen out/release --args='v8_enable_sandbox=true v8_expose_memory_corruption_api=true is_debug=false v8_enable_object_print=true v8_symbol_level=2'
autoninja -C out/debug d8
autoninja -C out/release d8
popd
