# Contributor guidance

- Keep the upstream input pinned through `flake.lock`; never make a CI build
  consume an implicit mutable revision.
- Keep the selected opt-ins centralized in `linuxFeatureIds` in `flake.nix`.
- Preserve the stable `codex-desktop-full` package/app name so consumers do not
  change when the feature bundle changes.
- Pull requests evaluate only. Expensive builds and Cachix writes belong to
  trusted pushes to `main` or explicit workflow dispatches.
- Never expose the Cachix write token in Nix expressions, build inputs, logs, or
  pull-request jobs.
- Update `README.md` whenever the bundle, update workflow, cache name, or
  consumer contract changes.
