{
  "targets": [
    {
      "target_name": "snes9x_addon",
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "sources": [
        "src/addon.cpp",
        "src/emulator_wrapper.cpp",
        "src/directory_setup.cpp",
        "src/core/apu/apu.cpp",
        "src/core/apu/bapu/dsp/sdsp.cpp",
        "src/core/apu/bapu/smp/smp.cpp",
        "src/core/apu/bapu/smp/smp_state.cpp",
        "src/core/apu/bapu/smp/debugger/debugger.cpp",
        "src/core/bsx.cpp",
        "src/core/c4.cpp",
        "src/core/c4emu.cpp",
        "src/core/cheats.cpp",
        "src/core/cheats2.cpp",
        "src/core/clip.cpp",
        "src/core/conffile.cpp",
        "src/core/controls.cpp",
        "src/core/cpu.cpp",
        "src/core/cpuexec.cpp",
        "src/core/cpuops.cpp",
        "src/core/crosshairs.cpp",
        "src/core/dma.cpp",
        "src/core/dsp.cpp",
        "src/core/dsp1.cpp",
        "src/core/dsp2.cpp",
        "src/core/dsp3.cpp",
        "src/core/dsp4.cpp",
        "src/core/fxinst.cpp",
        "src/core/fxemu.cpp",
        "src/core/gfx.cpp",
        "src/core/globals.cpp",
        "src/core/loadzip.cpp",
        "src/core/memmap.cpp",
        "src/core/obc1.cpp",
        "src/core/msu1.cpp",
        "src/core/ppu.cpp",
        "src/core/stream.cpp",
        "src/core/sa1.cpp",
        "src/core/sa1cpu.cpp",
        "src/core/screenshot.cpp",
        "src/core/sdd1.cpp",
        "src/core/sdd1emu.cpp",
        "src/core/seta.cpp",
        "src/core/seta010.cpp",
        "src/core/seta011.cpp",
        "src/core/seta018.cpp",
        "src/core/snapshot.cpp",
        "src/core/snes9x.cpp",
        "src/core/spc7110.cpp",
        "src/core/spc7110dec.cpp",
        "src/core/srtc.cpp",
        "src/core/tile.cpp",
        "src/core/tileimpl-n1x1.cpp",
        "src/core/tileimpl-n2x1.cpp",
        "src/core/tileimpl-h2x1.cpp",
        "src/core/sha256.cpp",
        "src/core/bml.cpp",
        "src/core/movie.cpp",
        "src/core/fscompat.cpp",
        "src/core/filter/snes_ntsc.c",
        "src/core/unzip/unzip.c",
        "src/core/unzip/ioapi.c",
        "src/core/jma/s9x-jma.cpp",
        "src/core/jma/jma.cpp",
        "src/core/jma/crc32.cpp",
        "src/core/jma/iiostrm.cpp",
        "src/core/jma/inbyte.cpp",
        "src/core/jma/lzmadec.cpp",
        "src/core/jma/lzma.cpp",
        "src/core/jma/7zlzma.cpp",
        "src/core/jma/winout.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "src/core",
        "src/core/apu",
        "src/core/apu/bapu",
        "src/core/apu/bapu/dsp",
        "src/core/apu/bapu/smp",
        "src/core/apu/bapu/smp/core",
        "src/core/apu/bapu/smp/debugger",
        "src/core/unzip",
        "src/core/filter",
        "src/core/jma"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS",
        "USE_THREADS",
        "ZLIB",
        "HAVE_STDINT_H",
        "ALLOW_CPU_OVERCLOCK",
        "SNES9X_NODEJS"
      ],
      "conditions": [
        ["OS=='linux'", {
          "libraries": [
            "-lpthread"
          ],
          "defines": [
            "__LINUX__"
          ]
        }],
        ["OS=='mac'", {
          "xcode_settings": {
            "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
            "CLANG_CXX_LIBRARY": "libc++",
            "MACOSX_DEPLOYMENT_TARGET": "10.7"
          },
          "defines": [
            "__MACOSX__"
          ]
        }],
        ["OS=='win'", {
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1
            }
          },
          "defines": [
            "__WIN32__",
            "NOMINMAX"
          ],
          "sources": [
            "src/core/unzip/iowin32.c"
          ],
          "libraries": [
            "-lshfolder"
          ]
        }]
      ],
      "cflags_cc": [
        "-std=c++17",
        "-Wall",
        "-Wextra",
        "-O2"
      ],
      "cflags": [
        "-O2"
      ]
    }
  ]
}

