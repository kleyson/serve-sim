- Test-driven development where possible.
- Prefer kebab-case for all TS/JS files.
- Avoid low-opacity for icons.
- Only support maintained Node.js LTS releases (currently Node 20+). Don't add
  workarounds for end-of-life Node versions; rely on `ws` (a dependency) rather
  than a global `WebSocket` so the middleware works across supported runtimes.

## Native build notes

- Build native changes with `bun run packages/serve-sim/build.ts`. This rebuilds
  the bundled JS, compiled CLI, camera dylib/helper, AX settings helper, and the
  N-API addon at `packages/serve-sim/dist/native/serve-sim-native.node`.
- After changing Swift/ObjC++ native code, restart any running `serve-sim`
  process. The `.node` addon is loaded once per process, so rebuilding alone
  does not update an already-running server.
- When validating local native changes, run the rebuilt local CLI
  (`node packages/serve-sim/dist/serve-sim.js ...` or the compiled binary in
  `packages/serve-sim/dist/`) rather than `npx serve-sim` or a globally
  installed binary.

## Fork workflow (this is a fork of EvanBacon/serve-sim)

Remotes:

| Remote | URL | Purpose |
|--------|-----|---------|
| `origin` | `forgejo.prado.cc/homelab/serve-sim` | the fork, and the source of truth — push here first |
| `github` | `github.com/kleyson/serve-sim` | where versions are built — push `lan-proxy-support` (or a `binary-v*` tag) here to publish one |
| `upstream` | `github.com/EvanBacon/serve-sim` | original — pull updates from here |

⚠ **There is no push mirror any more (removed 2026-09-11).** GitHub is updated
only when a version is published: pushing `lan-proxy-support` or a `binary-v*`
tag to `github` runs `build-binary.yml` there (see Automatic Branch Builds).
Everything in between stays on Forgejo.

It was removed because this repo's workflow files kept breaking it. The homelab's
mirror token has no `workflow` scope, so GitHub rejected every push that touched
`.github/workflows/` (`forgejo_push_mirror_failing`, 2026-08-21 and again
2026-09-11). A push over SSH (`git@github.com:…`) has no such limit.

Publish in this order, the same commit to both:

```bash
git push origin lan-proxy-support
git push github lan-proxy-support
```

⚠ This repo lives under the **`homelab`** org, not `toor`. It was moved there
(same `toor/` → `homelab/` migration as `esp32-monitor`). `forgejo.prado.cc/toor/serve-sim`
returns *"Cannot find repository"* — that means moved, not deleted.

Branch layout:

- **`main`** is a clean mirror of `upstream/main`. Never commit feature work
  directly to it — keep it fast-forwardable so upstream updates stay trivial.
- **`lan-proxy-support`** carries the local patch set. Personal work lives on
  branches like this, off the latest upstream. The name is historical: the
  original LAN/reverse-proxy patch is now upstream (`hostForRequest`,
  `httpProtocolForRequest`, `x-forwarded-proto`, `rewriteStateForRequestHost`),
  so the branch only consumes those helpers. What it still adds is optional
  password auth, the relocatable macOS bundle, and the release workflow.

Pull upstream updates:

```bash
git checkout main && git fetch upstream && git merge --ff-only upstream/main && git push origin main
```

⚠ `main` is **push-protected on Forgejo** (`enable_push = false`), so that last
push is rejected. Open a PR from a temporary branch and merge it with the
**rebase** method, so `main` lands exactly on the upstream commit with no merge
commit and stays a pure mirror:

```bash
git push origin main:sync/upstream-main-<sha>
# then open a PR sync/upstream-main-<sha> -> main and merge it with `rebase`
```

Note: `fj pr create` / `fj pr merge` both return **410 Gone** on this repo even
though pull requests are enabled; the REST API works. Verify `main` actually
moved afterwards rather than trusting the PR's "Merged" label.

Keep a feature branch current:

```bash
git checkout lan-proxy-support && git fetch upstream && git rebase upstream/main
```

The remote-viewer overlap that this note used to warn about is resolved:
upstream's `df53c2a` ("Rewrite helper host to request hostname for remote
viewers") superseded the branch's own version, and the redundant parts were
dropped. The branch now rebases onto `upstream/main` cleanly.

## E2E testing with agent-browser

If you are codex, run in the in-app Codex browser instead of using agent-browser. Only use agent-browser when developing from TUIs like Claude Code.

The serve-sim web UI streams the iOS Simulator and forwards clicks, so end-to-end
behavior can be driven from a browser with the `agent-browser` CLI:

1. Build: `bun run packages/serve-sim/build.ts`.
2. Boot a simulator and start the server: `node packages/serve-sim/dist/serve-sim.js --port 3399`.
3. Drive the UI: `agent-browser open http://localhost:3399`, then `snapshot`,
   `click @eN`, `upload input[type=file] <path>`, `screenshot <path>`, etc.
4. Tap inside the simulator with `agent-browser mouse move <x> <y> && mouse down && mouse up`
   — the canvas isn't in the AX tree, so use pixel coordinates from a screenshot.

## E2E testing via the serve-sim CLI

For headless flows that don't need the browser, drive the simulator entirely
through `serve-sim` subcommands against a running server:

- `serve-sim tap <x> <y> [-d udid]` — single-shot tap at normalized (0..1)
  screen coords. Prefer this over `serve-sim gesture` for taps: each `gesture`
  call opens its own WebSocket, so two back-to-back `begin`/`end` invocations
  land far enough apart to register as a long-press.
- `serve-sim gesture '<json>' [-d udid]` — for drags or multi-step gestures
  that need explicit `begin`/`move`/`end` events.
- `serve-sim button [home|lock|…] [-d udid]` — hardware button.
- `serve-sim camera …` — inject the dylib, hot-swap source, toggle mirror.
- `serve-sim ui <option> [value] [-d udid]` — simulator-wide UI options
  (appearance, liquid-glass, color-filter, text-size, reduce-motion,
  increase-contrast, show-borders, reduce-transparency, voiceover); `ui status
--json` dumps all. Verify sets via `simctl ui <udid> <option>` readback or
  `simctl spawn <udid> defaults read` on com.apple.Accessibility /
  com.apple.mediaaccessibility / com.apple.UIKit.
- `xcrun simctl openurl booted <url>` — deep-link into apps (faster than
  tapping through Expo Go's recent-projects list).

Typical camera e2e flow: rebuild, `camera --stop-webcam`, `simctl terminate`
the app, `camera <bundleId> --file <img> --mirror on` to re-inject, `openurl`
to load the project, `tap 0.5 0.9` for the shutter, then read the saved JPEG
off disk to verify (see the path under "agent-browser" above).

# serve-sim Fork Workflow

This repository is a fork of `EvanBacon/serve-sim`.

- `main` must remain a clean, fast-forwardable mirror of `upstream/main`.
- Custom work and binary releases live on `lan-proxy-support`.
- Push fork changes to `origin` (`forgejo.prado.cc/homelab/serve-sim`). GitHub is
  the mirror's output, not a push target — see the remote table above.

## Build The Binary Bundle

Install dependencies and run the unified build from the repository root:

```bash
bun install --frozen-lockfile
bun run packages/serve-sim/build.ts
```

The build creates the JavaScript bundles, compiled CLI, native addon, camera
components, AX settings helper, and a relocatable zip. The release archive is:

```text
packages/serve-sim/dist/serve-sim-<version>-macos-<arch>.zip
```

For example, an Apple Silicon build of version `0.1.34` produces:

```text
packages/serve-sim/dist/serve-sim-0.1.34-macos-arm64.zip
```

The zip contains:

```text
serve-sim-<version>-macos-<arch>/
  serve-sim
  native/serve-sim-native.node
  simcam/libSimCameraInjector.dylib
  simcam/serve-sim-camera-helper
  simax/serve-sim-ax-settings
  LICENSE
  README.txt
```

The compiled executable is not independently relocatable. Keep `native`,
`simcam`, and `simax` beside it. Add the extracted directory to `PATH` instead
of moving only the executable.

The outer compiled executable uses the build machine's architecture. The native
sidecars are universal, but producing an Intel archive still requires building
the outer executable on an x86_64 runner.

## Verify Locally

Run the repository checks after building:

```bash
bun run typecheck
bun run lint
bun test --max-concurrency=1 packages/serve-sim/src/__tests__/
```

Create and verify a checksum from the archive directory:

```bash
cd packages/serve-sim/dist
shasum -a 256 serve-sim-<version>-macos-<arch>.zip > serve-sim-<version>-macos-<arch>.zip.sha256
shasum -a 256 -c serve-sim-<version>-macos-<arch>.zip.sha256
```

For a portability smoke test, extract the zip outside the checkout and run:

```bash
./serve-sim-<version>-macos-<arch>/serve-sim --version
./serve-sim-<version>-macos-<arch>/serve-sim --help
./serve-sim-<version>-macos-<arch>/serve-sim camera --list-webcams
```

## Automatic Branch Builds

The workflow is defined in:

```text
.github/workflows/build-binary.yml
```

It runs on **GitHub** Actions, so it fires when `lan-proxy-support` is pushed to
the `github` remote. Forgejo also sees the workflow, but it needs a macOS
runner that is rarely online there, so the Forgejo copy of the run is normally
cancelled — the GitHub run is the one that counts.

Each run does the following on a macOS runner:

1. Install dependencies with the frozen lockfile.
2. Run TypeScript typechecking.
3. Run linting.
4. Build the compiled distribution zip.
5. Run the test directory serially, up to three attempts for the known upstream
   flake (`SimCameraHelper shm probe > shutdown unmaps shm`, still present on
   upstream as of 2026-09-11).
6. Generate a SHA-256 checksum.
7. Publish the zip and checksum to a rolling GitHub prerelease.

Push the branch to Forgejo, then to GitHub — the GitHub push is what starts
the build:

```bash
git push origin lan-proxy-support
git push github lan-proxy-support
```

After a rebase the branch is rewritten, so both need a lease-protected force:

```bash
git push --force-with-lease origin lan-proxy-support
git push --force-with-lease github lan-proxy-support
```

Each push replaces the rolling prerelease tagged `binary-lan-proxy`, so the
latest build is always at a stable URL:

```text
https://github.com/kleyson/serve-sim/releases/download/binary-lan-proxy/serve-sim-<version>-macos-<arch>.zip
```

This is a prerelease — use it for testing the tip of the branch. For a
permanent download, push a `binary-v*` tag (below).

## Permanent GitHub Releases

Push a tag beginning with `binary-v` to create a permanent GitHub Release:

```bash
git checkout lan-proxy-support
git pull --ff-only origin lan-proxy-support
git tag binary-v0.1.34-kleyson.1
git push origin binary-v0.1.34-kleyson.1
git push github lan-proxy-support binary-v0.1.34-kleyson.1
```

The tag must reach `github` — that is where the release is built. Push the
branch with it so GitHub's code matches the release.

The same workflow builds and tests the tagged commit, then creates a release and
uploads both files:

```text
serve-sim-<version>-macos-<arch>.zip
serve-sim-<version>-macos-<arch>.zip.sha256
```

Permanent downloads are published at:

```text
https://github.com/kleyson/serve-sim/releases
```

Users can verify a downloaded release from the directory containing both files:

```bash
shasum -a 256 -c serve-sim-<version>-macos-<arch>.zip.sha256
```

## Updating From Upstream

Update the clean mirror first:

```bash
git checkout main
git fetch upstream
git merge --ff-only upstream/main
git push origin main
```

Then rebase and verify the custom branch:

```bash
git checkout lan-proxy-support
git rebase upstream/main
bun run packages/serve-sim/build.ts
bun run typecheck
bun run lint
bun test --max-concurrency=1 packages/serve-sim/src/__tests__/
```

After a successful rebase, update the remote branch with lease protection:

```bash
git push --force-with-lease origin lan-proxy-support
```

That branch push automatically creates a new temporary Actions artifact. Create
and push a new `binary-v*` tag only when the commit should become a permanent
downloadable release.
