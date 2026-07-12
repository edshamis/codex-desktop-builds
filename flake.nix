{
  description = "Cached Codex Desktop Linux package for edshamis";

  # Temporary unmerged fix: https://github.com/ilysenko/codex-desktop-linux/pull/904
  inputs.codex-desktop-linux.url = "github:edshamis/codex-desktop-linux/12e09e43e3a0d2a53908e2734768f784794301dd";

  outputs = {
    self,
    codex-desktop-linux,
  }: let
    system = "x86_64-linux";

    linuxFeatureIds = [
      "appshots"
      "frameless-titlebar"
      "global-dictation"
      "mcp-helper-reaper"
      "node-repl-reaper"
      "open-target-discovery"
      "persistent-status-panel"
    ];

    codexDesktopFull = codex-desktop-linux.packages.${system}.codex-desktop.override {
      enableComputerUseUi = true;
      inherit linuxFeatureIds;
    };
  in {
    homeManagerModules = codex-desktop-linux.homeManagerModules;
    nixosModules = codex-desktop-linux.nixosModules;

    lib = {
      inherit linuxFeatureIds;
    };

    packages.${system} = {
      codex-desktop-full = codexDesktopFull;
      default = codexDesktopFull;
    };

    apps.${system} = {
      codex-desktop-full = {
        type = "app";
        program = "${codexDesktopFull}/bin/codex-desktop";
        meta.description = "Codex Desktop with the pinned Linux feature bundle";
      };
      default = self.apps.${system}.codex-desktop-full;
    };

    checks.${system}.codex-desktop-full = codexDesktopFull;
  };
}
