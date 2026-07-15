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

The current source is pinned to an immutable commit on the private-feature fork.
That fork keeps `quick-chat-window-zoom` under the upstream-supported
`linux-features/local/` extension boundary and enables it only through this
flake's `linuxFeatureIds`. It also enables the disabled-by-default
`chatgpt-complete-history` repository feature so Quick Chat includes TPP phone
and scheduled-run conversations without modifying the main Projects or
Scheduled pages. These customizations sit on top of the frameless-titlebar support merged in
[`ilysenko/codex-desktop-linux#904`](https://github.com/ilysenko/codex-desktop-linux/pull/904)
without adding the workflow-specific zoom behavior to upstream core.

Run the pinned package locally with:

```bash
nix run .#codex-desktop-full -- --new-instance
```

## Automated update workflow

The source fork merges `ilysenko/codex-desktop-linux:main` into its private
feature branch every six hours and publishes that branch only after its focused
feature tests, complete patcher suite, and Nix evaluation pass. This repository
polls the validated branch 30 minutes later.

For each new source commit, the promotion workflow updates a temporary exact
pin, evaluates and builds `codex-desktop-full`, validates the enabled-feature
and Quick Chat patch report, and explicitly publishes the complete closure to
Cachix. Only then does it commit the new immutable pin to builder `main`. A
failure leaves `main` and every consumer on the previous known-green package
and updates one reusable issue.

The dedicated Nix profile may therefore follow builder `main`: a visible
builder revision is already built and cached, while its own contract validation
and retained previous generation provide the final local rollback boundary.

## Manual update workflow

1. Advance the immutable `codex-desktop-linux` source commit intentionally,
   then refresh its lock:

   ```bash
   nix flake update codex-desktop-linux
   ```

2. Adjust `linuxFeatureIds` when the desired bundle changes.

3. Run `nix flake check --no-build` locally.

4. Push the change and wait for `Build Codex Desktop` to succeed on `main`, or
   manually dispatch `Promote validated private source`.

5. Runtime-smoke-test the package before advancing the NixOS consumer input.

6. Keep the prior consumer revision until the new app is verified.

Pull requests evaluate the flake but do not receive the Cachix write token or
run the expensive package build. Trusted pushes to `main` build only when
`flake.nix` or `flake.lock` changes; manual build dispatches always rebuild.
Scheduled source promotion is also trusted, but commits only after its candidate
has already been built, validated, and explicitly published. Policy and
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
