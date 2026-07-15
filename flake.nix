{
  description = "Cached Codex Desktop Linux package for edshamis";

  # Private local-feature branch; keep this immutable and advance intentionally.
  inputs.codex-desktop-linux.url = "github:edshamis/codex-desktop-linux/f2e7e1617e9e00395a470bd0c5b28338fb9290df";

  outputs = {
    self,
    codex-desktop-linux,
  }: let
    system = "x86_64-linux";

    linuxFeatureIds = [
      "appshots"
      "chatgpt-complete-history"
      "frameless-titlebar"
      "global-dictation"
      "mcp-helper-reaper"
      "node-repl-reaper"
      "open-target-discovery"
      "persistent-status-panel"
      "quick-chat-window-zoom"
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
