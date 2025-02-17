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
          deps = rec {
            jq = pkgs.jq;
            nodejs_20 = pkgs.nodejs_20;
            # node-gyp = pkgs.nodePackages.node-gyp;
            python312 = pkgs.python312;
            nix-tree = pkgs.nix-tree;
            default = nodejs_20;
          };

        in
        {
          packages = deps;
          devShell = pkgs.mkShell { packages = pkgs.lib.attrsets.attrValues deps; };
        }
    );
}
