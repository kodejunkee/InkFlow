const { withDangerousMod, withMainApplication, withGradleProperties } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Copies custom Kotlin native modules into the Android project
 * during `expo prebuild`
 */
function withNativeFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const sourceDir = path.join(projectRoot, 'plugins', 'android', 'src', 'main', 'java', 'com', 'inkflow', 'reader');
      // Expo prebuild might generate com/inkflow/inkflow or whatever the package name is.
      // Wait, let's just copy our package 'com.inkflow.reader' into the generated project.
      const destDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', 'com', 'inkflow', 'reader');

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      const files = fs.readdirSync(sourceDir);
      for (const file of files) {
        if (file.endsWith('.kt')) {
          fs.copyFileSync(
            path.join(sourceDir, file),
            path.join(destDir, file)
          );
        }
      }

      return config;
    },
  ]);
}

/**
 * Modifies MainApplication.kt to register the EpubProcessorPackage
 */
function withEpubProcessorPackage(config) {
  return withMainApplication(config, (config) => {
    let mainApplication = config.modResults.contents;

    // We need to add `add(EpubProcessorPackage())` to the packages list.
    // Expo prebuild generates a `PackageList(this).packages.apply { ... }` block.
    
    if (!mainApplication.includes('EpubProcessorPackage()')) {
      // Find the add manual packages block
      const packageListRegex = /(PackageList\(this\)\.packages\.apply\s*\{[\s\S]*?)(\s*\})/;
      
      mainApplication = mainApplication.replace(packageListRegex, (match, p1, p2) => {
        return p1 + '\n          add(EpubProcessorPackage())' + p2;
      });
      
      config.modResults.contents = mainApplication;
    }

    return config;
  });
}

/**
 * Restricts reactNativeArchitectures to 64-bit ABIs only.
 * Python 3.14 on Chaquopy only supports arm64-v8a and x86_64.
 */
function withArch64Only(config) {
  return withGradleProperties(config, (config) => {
    // Find and update the reactNativeArchitectures property
    const props = config.modResults;
    const archProp = props.find(
      (p) => p.type === 'property' && p.key === 'reactNativeArchitectures'
    );
    if (archProp) {
      archProp.value = 'arm64-v8a,x86_64';
    } else {
      props.push({
        type: 'property',
        key: 'reactNativeArchitectures',
        value: 'arm64-v8a,x86_64',
      });
    }
    return config;
  });
}

module.exports = function withNativeCode(config) {
  config = withNativeFiles(config);
  config = withEpubProcessorPackage(config);
  config = withArch64Only(config);
  return config;
};
