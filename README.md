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

The current source is temporarily pinned to the immutable fork commit for
[`ilysenko/codex-desktop-linux#904`](https://github.com/ilysenko/codex-desktop-linux/pull/904),
which fixes popped-out Quick Chat zoom and applies the frameless titlebar to
Quick Chat. Once that change lands upstream, replace the input URL with the
upstream repository and refresh the lock.

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
run the expensive package build. Trusted pushes to `main` build only when
`flake.nix` or `flake.lock` changes; manual dispatches always rebuild. Policy and
documentation-only commits therefore stay cheap.

## Cachix

The public cache is `edshamis-codex-desktop`. Consumers trust:

```text
edshamis-codex-desktop.cachix.org-1:yQDKt7Oie5jugFEattyZNF7GGe944Anj5fknyjhItCk=
```

The per-cache write token is stored only as the repository Actions secret
`CACHIX_AUTH_TOKEN`. Rotate it from the cache's Cachix settings and replace that
secret directly; never put it in Git or logs. If the secret is absent, a package
change fails before doing expensive work. This makes a green package-changing
`main` revision a reliable signal that its exact output was published.

## Scope and trust

This repository contains only the wrapper flake and CI policy. The application
and Linux adaptation remain owned by
[`ilysenko/codex-desktop-linux`](https://github.com/ilysenko/codex-desktop-linux).
Upstream revisions remain lock-pinned so a reviewable commit determines which
packaging code CI executes.
