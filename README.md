# Codex Desktop builds

This flake defines the exact Codex Desktop Linux package used by
`edshamis/nixos`. GitHub Actions builds it on an x86_64 Ubuntu runner and pushes
successful trusted builds to the `edshamis-codex-desktop` Cachix cache.

The repository intentionally separates the expensive, fast-moving desktop app
from the private system configuration. The NixOS repository pins a known-green
revision of this flake and downloads the matching package from Cachix during
`rebuild-safe`.

## Package contract

The stable consumer output is:

```text
packages.x86_64-linux.codex-desktop-full
```

The upstream Home Manager and NixOS modules are re-exported unchanged so a
consumer can use the module integration while overriding its `package` option
with this cached output.

It enables Computer Use UI and the feature IDs centralized in `flake.nix`.
Changing that list creates a new derivation without changing the consumer-facing
output name.

Run the pinned package locally with:

```bash
nix run .#codex-desktop-full -- --new-instance
```

## Update workflow

1. Update the upstream lock intentionally:

   ```bash
   nix flake update codex-desktop-linux
   ```

2. Adjust `linuxFeatureIds` when the desired bundle changes.
3. Run `nix flake check --no-build` locally.
4. Push the change and wait for `Build Codex Desktop` to succeed on `main`.
5. Runtime-smoke-test the package before advancing the NixOS consumer input.
6. Keep the prior consumer revision until the new app is verified.

Pull requests evaluate the flake but do not receive the Cachix write token or
run the expensive package build. Trusted pushes to `main` and manual workflow
dispatches perform the build.

## Cachix bootstrap

The cache is intentionally not bootstrapped from CI. Once per cache/account:

1. Create the public open-source cache `edshamis-codex-desktop` in Cachix.
2. Add its write token to this repository as the Actions secret
   `CACHIX_AUTH_TOKEN`.
3. Add the cache URL and public signing key to the NixOS repository under
   `lib/cachix/`.

Without the secret, CI still verifies the build but reports that publication
was skipped. Do not update the NixOS consumer to such a commit unless the same
store path is available from another trusted substituter.

## Scope and trust

This repository contains only the wrapper flake and CI policy. The application
and Linux adaptation remain owned by
[`ilysenko/codex-desktop-linux`](https://github.com/ilysenko/codex-desktop-linux).
Upstream revisions remain lock-pinned so a reviewable commit determines which
packaging code CI executes.
