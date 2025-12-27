{
  description = "Flake for Modal commander development";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        
        # Shared version for all packages
        version = "0.0.30";
        
        # Build environment for native modules
        # macOS frameworks are available via the default SDK, no need to explicitly reference them
        buildInputs = with pkgs; [
          nodejs_20
          python3
          gnumake
          cacert  # SSL certificates for npm
        ];

        # Build the builtins package separately using buildNpmPackage
        # This allows us to explicitly use Node.js 20 and cache dependencies automatically
        # Clean the source first to get a proper path value, then copy it
        builtinsPackageSrc = let
          # Clean the source directory first - this creates a proper path value
          cleanedBuiltins = pkgs.lib.cleanSource (./. + "/commands/@modal-commander/builtins");
        in pkgs.runCommand "modal-commander-builtins-src" {} ''
          mkdir -p $out
          cp -r ${cleanedBuiltins}/. $out/
        '';

        builtinsPackage = pkgs.buildNpmPackage rec {
          pname = "modal-commander-builtins";
          inherit version;

          src = builtinsPackageSrc;

          npmDepsHash = "sha256-4qObv8LyQzAq/Orc0bBJFv3TH3UKArHtskHKzkTcgEc="; # Will be set after first build - run: nix build .#builtinsPackage 2>&1 | grep "got:"

          nativeBuildInputs = buildInputs;

          # Environment for building native modules
          preBuild = ''
            export npm_config_build_from_source=true
            export PYTHON="${pkgs.python3}/bin/python"
            # Ensure nodejs_20 is on PATH
            export PATH="${pkgs.nodejs_20}/bin:$PATH"
            # Configure node-gyp for macOS
            ${pkgs.lib.optionalString pkgs.stdenv.isDarwin ''
              export AR="${pkgs.stdenv.cc.bintools.bintools}/bin/ar"
              export RANLIB="${pkgs.stdenv.cc.bintools.bintools}/bin/ranlib"
              export MACOSX_DEPLOYMENT_TARGET=10.15
              # Also set it for node-gyp specifically
              export npm_config_target=10.15
              export npm_config_disturl=https://electronjs.org/headers
              export npm_config_runtime=node
              # Map Nix platform names to node-gyp architecture names
              # aarch64-darwin -> arm64, x86_64-darwin -> x64
              if [ "${pkgs.stdenv.hostPlatform.parsed.cpu.name}" = "aarch64" ]; then
                export npm_config_arch=arm64
                export npm_config_target_arch=arm64
              elif [ "${pkgs.stdenv.hostPlatform.parsed.cpu.name}" = "x86_64" ]; then
                export npm_config_arch=x64
                export npm_config_target_arch=x64
              else
              export npm_config_arch=${pkgs.stdenv.hostPlatform.parsed.cpu.name}
              export npm_config_target_arch=${pkgs.stdenv.hostPlatform.parsed.cpu.name}
              fi
            ''}
            
            # Build native modules first (before the npm build script runs)
            echo "Building native modules..."
            npm run build:native
          '';

          # Build the TypeScript/Vite bundles
          # Note: The build script runs 'clean' which removes dist, so native modules 
          # need to be copied after build. However, the code requires from build/Release,
          # so we need to preserve that directory structure.
          npmBuildScript = "build";

          # Override installPhase to copy the dist directory and preserve build/Release structure
          installPhase = ''
            runHook preInstall
            
            mkdir -p $out
            # Copy the dist directory with built artifacts
            if [ -d dist ]; then
              cp -r dist $out/dist
            fi
            # Copy native modules to dist (for electron-builder to package)
            if [ -d build/Release ]; then
              mkdir -p $out/dist
              cp build/Release/*.node $out/dist/ || true
              # Also preserve build/Release structure since code requires from there
              mkdir -p $out/build/Release
              cp build/Release/*.node $out/build/Release/ || true
            fi
            
            runHook postInstall
          '';

          doCheck = false;

          meta = with pkgs.lib; {
            description = "Modal Commander builtins package";
            license = licenses.mit;
          };
        };

        # Build the main app using buildNpmPackage
        # This will cache npm dependencies automatically
        modal-commander = pkgs.buildNpmPackage rec {
          pname = "modal-commander";
          inherit version;

          src = ./.;

          npmDepsHash = "sha256-/hDr7Zm1eifFCTLxQ2aMpx938BfaoGbZjs8O0SGcxXs="; # Will be set after first build - run: nix build .#modal-commander 2>&1 | grep "got:"

          # Allow npm to write to cache during dependency fetching
          makeCacheWritable = true;
          
          # Use legacy peer deps to avoid peer dependency conflicts
          npmFlags = [ "--legacy-peer-deps" ];

          nativeBuildInputs = buildInputs;

          # Environment for building
          preBuild = ''
            # Ensure nodejs_20 is on PATH and used (npm comes bundled with nodejs)
            export PATH="${pkgs.nodejs_20}/bin:$PATH"
            export npm_config_build_from_source=true
            export PYTHON="${pkgs.python3}/bin/python"
            # Configure node-gyp for macOS
            ${pkgs.lib.optionalString pkgs.stdenv.isDarwin ''
              export AR="${pkgs.stdenv.cc.bintools.bintools}/bin/ar"
              export RANLIB="${pkgs.stdenv.cc.bintools.bintools}/bin/ranlib"
              export MACOSX_DEPLOYMENT_TARGET=10.15
            ''}
            
            # Copy the pre-built builtins package into place
            echo "Linking built builtins package..."
            mkdir -p commands/@modal-commander/builtins/dist
            if [ -d ${builtinsPackage}/dist ]; then
              cp -r ${builtinsPackage}/dist/* commands/@modal-commander/builtins/dist/ || true
            fi
            # Copy native modules build/Release directory (code requires from ../build/Release)
            if [ -d ${builtinsPackage}/build/Release ]; then
              echo "Copying native modules build/Release directory..."
              mkdir -p commands/@modal-commander/builtins/build/Release
              cp -r ${builtinsPackage}/build/Release/* commands/@modal-commander/builtins/build/Release/ || true
            fi
          '';

          # Use the full build script that includes electron-builder
          npmBuildScript = "build";

          # Don't run tests during build
          doCheck = false;

          # Override installPhase to copy electron-builder artifacts
          installPhase = ''
            runHook preInstall

            ${pkgs.lib.optionalString pkgs.stdenv.isDarwin ''
              # Copy the electron-builder app bundle to Applications/
              # electron-builder creates it in release/${version}/mac-* or dist/mac-*
              mkdir -p $out/Applications
              APP_BUNDLE_DIR=""
              
              # Check release directory first (per electron-builder.json output setting)
              if [ -d release ]; then
                # Find the version directory (e.g., release/0.0.30/)
                VERSION_DIR=$(find release -maxdepth 1 -type d | grep -v "^release$" | head -1)
                if [ -n "$VERSION_DIR" ]; then
                  # Check for mac-universal, mac, or mac-<arch> directories
                  if [ -d "$VERSION_DIR/mac-universal" ]; then
                    APP_BUNDLE_DIR="$VERSION_DIR/mac-universal"
                  elif [ -d "$VERSION_DIR/mac" ]; then
                    APP_BUNDLE_DIR="$VERSION_DIR/mac"
                  else
                    # Try architecture-specific directories (mac-arm64, mac-x64, etc.)
                    APP_BUNDLE_DIR=$(find "$VERSION_DIR" -maxdepth 1 -type d -name "mac-*" | head -1)
                  fi
                fi
              fi
              
              # Fallback to dist directory if not found in release
              if [ -z "$APP_BUNDLE_DIR" ] || [ ! -d "$APP_BUNDLE_DIR" ]; then
                if [ -d dist/mac-universal ]; then
                  APP_BUNDLE_DIR="dist/mac-universal"
                elif [ -d dist/mac ]; then
                  APP_BUNDLE_DIR="dist/mac"
                else
                  # Try architecture-specific directories in dist
                  APP_BUNDLE_DIR=$(find dist -maxdepth 1 -type d -name "mac-*" | head -1)
                fi
              fi
              
              if [ -n "$APP_BUNDLE_DIR" ] && [ -d "$APP_BUNDLE_DIR" ]; then
                echo "Copying electron-builder app bundle from $APP_BUNDLE_DIR..."
                if ! cp -r "$APP_BUNDLE_DIR"/*.app $out/Applications/ 2>/dev/null; then
                  echo "Error: Failed to copy app bundle from $APP_BUNDLE_DIR"
                  exit 1
                fi
              else
                echo "Error: Could not find app bundle in release or dist directories"
                echo "Searched in: release/${version}/mac-*, dist/mac-*"
                echo "Available directories:"
                ls -la release/ 2>/dev/null || echo "  (release directory does not exist)"
                ls -la dist/ 2>/dev/null | grep -E "^d" || echo "  (dist directory does not exist)"
                exit 1
              fi
            ''}
            
            # Copy release directory if it exists (contains DMG, ZIP, etc.)
            if [ -d release ]; then
              echo "Copying release artifacts..."
              cp -r release $out/
            fi
            
            # Also copy dist and dist-electron for fallback/development (if app bundle wasn't created)
            if [ -d dist ]; then
              mkdir -p $out/dist
              cp -r dist/* $out/dist/ 2>/dev/null || true
            fi
            if [ -d dist-electron ]; then
              mkdir -p $out/dist-electron
              cp -r dist-electron/* $out/dist-electron/ 2>/dev/null || true
            fi
            
            # Copy commands directory (needed at runtime)
            if [ -d commands ]; then
              cp -r commands $out/
            fi

            runHook postInstall
          '';

          meta = with pkgs.lib; {
            description = "Modal Commander - A modal command interface";
            homepage = "https://github.com/pj/modal-commander";
            license = licenses.mit;
            maintainers = [];
            platforms = platforms.darwin;
          };
        };

        deps = {
          jq = pkgs.jq;
          nodejs_20 = pkgs.nodejs_20;
          python312 = pkgs.python312;
          nix-tree = pkgs.nix-tree;
        };

      in
      {
        packages = {
          default = modal-commander;
          modal-commander = modal-commander;
          builtinsPackage = builtinsPackage;
        } // deps;
        
        devShells.default = pkgs.mkShell {
          packages = buildInputs ++ [ pkgs.jq pkgs.nix-tree ];
          shellHook = ''
            export npm_config_build_from_source=true
            export PYTHON="${pkgs.python3}/bin/python"
            # SSL certificates for npm
            export SSL_CERT_FILE="${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
            export NODE_EXTRA_CA_CERTS="${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
          '';
        };
      }
    );
}
