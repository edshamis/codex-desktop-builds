{
  description = "Cached Codex Desktop Linux package for edshamis";

  # Private local-feature branch; keep this immutable and advance intentionally.
  inputs.codex-desktop-linux.url = "github:edshamis/codex-desktop-linux/f3cd50bbb71ce27646c22539618a3bf4b2e86bcc";

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
