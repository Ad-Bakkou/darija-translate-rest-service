const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');
// Release denies HTTP. Only a native debug build permits explicit loopback HTTP.
const releaseXml = '<network-security-config><base-config cleartextTrafficPermitted="false" /><domain-config cleartextTrafficPermitted="false"><domain includeSubdomains="false">127.0.0.1</domain><domain includeSubdomains="false">localhost</domain></domain-config></network-security-config>';
const debugXml = '<network-security-config><base-config cleartextTrafficPermitted="false" /><domain-config cleartextTrafficPermitted="true"><domain includeSubdomains="false">127.0.0.1</domain><domain includeSubdomains="false">localhost</domain></domain-config></network-security-config>';
function withLoopbackNetwork(config) {
  config = withAndroidManifest(config, config => {
    const app = config.modResults.manifest.application[0];
    app.$['android:networkSecurityConfig'] = '@xml/darija_network_security';
    app.$['android:usesCleartextTraffic'] = 'false';
    return config;
  });
  return withDangerousMod(config, ['android', async config => {
    for (const [variant, xml] of [['main', releaseXml], ['debug', debugXml]]) {
      const directory = path.join(config.modRequest.platformProjectRoot, 'app', 'src', variant, 'res', 'xml');
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(path.join(directory, 'darija_network_security.xml'), xml);
    }
    return config;
  }]);
}
module.exports = withLoopbackNetwork;
module.exports.releaseXml = releaseXml;
module.exports.debugXml = debugXml;
