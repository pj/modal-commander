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
              export npm_config_arch=${pkgs.stdenv.hostPlatform.parsed.cpu.name}
              export npm_config_target_arch=${pkgs.stdenv.hostPlatform.parsed.cpu.name}
            ''}
            
            # Build native modules first (before the npm build script runs)
            echo "Building native modules..."
            npm run build:native
          '';

          # Build the TypeScript/Vite bundles
          npmBuildScript = "build";

          # Override installPhase to copy the dist directory
          installPhase = ''
            runHook preInstall
            
            mkdir -p $out
            # Copy the dist directory with built artifacts
            if [ -d dist ]; then
              cp -r dist $out/dist
            fi
            # Copy native modules if they're in a separate location
            if [ -d build/Release ]; then
              mkdir -p $out/dist
              cp build/Release/*.node $out/dist/ || true
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
          '';

          # Add a build script that skips electron-builder (requires macOS system tools not available in Nix)
          postPatch = ''
            # Modify package.json to add a build:app script that skips electron-builder
            ${pkgs.nodejs_20}/bin/node -e "
              const fs = require('fs');
              const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
              pkg.scripts = pkg.scripts || {};
              pkg.scripts['build:app'] = 'tsc && vite build';
              fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2));
            "
          '';

          # Use the build:app script that skips electron-builder
          npmBuildScript = "build:app";

          # Don't run tests during build
          doCheck = false;

          # Override installPhase to copy electron-builder artifacts
          installPhase = ''
            runHook preInstall

            mkdir -p $out
            
            # Copy the electron-builder output (DMG, ZIP, etc.)
            if [ -d release ]; then
              echo "Copying release artifacts..."
              cp -r release $out/
            fi
            
            # Also copy dist and dist-electron for development/testing
            if [ -d dist ]; then
              cp -r dist $out/
            fi
            if [ -d dist-electron ]; then
              cp -r dist-electron $out/
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

        deps = rec {
          jq = pkgs.jq;
          nodejs_20 = pkgs.nodejs_20;
          python312 = pkgs.python312;
          nix-tree = pkgs.nix-tree;
          default = nodejs_20;
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
