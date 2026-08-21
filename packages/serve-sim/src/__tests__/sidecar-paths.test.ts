import { describe, expect, test } from "bun:test";
import { join } from "path";
import { sidecarCandidates } from "../sidecar-paths";

describe("sidecarCandidates", () => {
  test("resolves archived sidecars beside a standalone executable", () => {
    expect(
      sidecarCandidates(
        "file:///$bunfs/root/serve-sim",
        ["simcam", "serve-sim-camera-helper"],
        { standalone: true, execPath: "/Applications/serve-sim/serve-sim" },
      ),
    ).toContain("/Applications/serve-sim/simcam/serve-sim-camera-helper");
  });

  test("resolves package sidecars relative to bundled JavaScript", () => {
    const packageDist = "/tmp/node_modules/serve-sim/dist";
    expect(
      sidecarCandidates(
        `file://${packageDist}/serve-sim.js`,
        ["native", "serve-sim-native.node"],
        { standalone: false, execPath: "/usr/local/bin/node" },
      ),
    ).toContain(join(packageDist, "native", "serve-sim-native.node"));
  });

  test("does not search beside node for package sidecars", () => {
    expect(
      sidecarCandidates(
        "file:///tmp/node_modules/serve-sim/dist/serve-sim.js",
        ["native", "serve-sim-native.node"],
        { standalone: false, execPath: "/usr/local/bin/node" },
      ),
    ).not.toContain("/usr/local/bin/native/serve-sim-native.node");
  });
});
