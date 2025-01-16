{
  "targets": [
    {
      "target_name": "LockCommand",
      "sources": ["src/LockCommand.cc"],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
      "xcode_settings": {
        "OTHER_CFLAGS": [ "-std=c++17", "-D_LIBCPP_HAS_NO_LIBRARY_ALIGNED_ALLOCATION=1"],
        "OTHER_CPLUSPLUSFLAGS": [ 
            "-std=c++17", 
            "-D_LIBCPP_HAS_NO_LIBRARY_ALIGNED_ALLOCATION=1"
        ],
        "OTHER_LDFLAGS": [
          "-F/System/Library/PrivateFrameworks",
          "-framework login",
          "-framework Security",
          "-rpath @loader_path/",
          "-rpath @executable_path/",
          "-rpath /System/Library/PrivateFrameworks"
        ]
      }
    },
    {
      "target_name": "VolumeCommand",
      "sources": ["src/VolumeCommand.cc"],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
      "xcode_settings": {
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "CLANG_CXX_LIBRARY": "libc++",
        "MACOSX_DEPLOYMENT_TARGET": "10.7",
        "OTHER_LDFLAGS": [
          "-framework CoreServices",
          "-framework CoreAudio",
          "-framework AudioUnit",
          "-framework AudioToolbox"
        ]
      }
    },
    {
      "target_name": "WindowFunctions",
      "sources": [ "src/WindowFunctions.mm" ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "xcode_settings": {
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "CLANG_CXX_LIBRARY": "libc++",
        "MACOSX_DEPLOYMENT_TARGET": "10.7",
        "OTHER_LDFLAGS": [
          "-framework CoreGraphics",
          "-framework ApplicationServices",
          "-framework AppKit"
        ]
      }
    }
  ]
}