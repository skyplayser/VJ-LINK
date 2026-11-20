// electron-builder afterPack (macOS), vor dem Signieren: Der NDI®-Ausgang läuft in einem Helfer (utilityProcess).
// macOS fragt „Lokales Netzwerk“ je Bundle ab, deshalb bekommen die Helfer denselben Hinweistext und den
// Bonjour-Dienst von NDI wie die App. Nach VD-Link build/after-pack.cjs (gleicher Autor, Eclipse Public License 2.0).
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const LOCAL_NET = "VJ-Link sendet den NDI-Ausgang ins lokale Netzwerk. Sends the NDI output to the local network.";

exports.default = async ctx => {
  if (ctx.electronPlatformName !== "darwin") return;
  const frameworks = path.join(ctx.appOutDir, `${ctx.packager.appInfo.productFilename}.app`, "Contents", "Frameworks");
  for (const dir of fs.readdirSync(frameworks)) {
    if (!dir.endsWith(".app")) continue;
    const plist = path.join(frameworks, dir, "Contents", "Info.plist");
    execFileSync("plutil", ["-replace", "NSLocalNetworkUsageDescription", "-string", LOCAL_NET, plist]);
    execFileSync("plutil", ["-replace", "NSBonjourServices", "-json", '["_ndi._tcp"]', plist]);
  }
};
