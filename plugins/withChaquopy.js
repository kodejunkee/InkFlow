const { withProjectBuildGradle, withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Injects Chaquopy dependencies and repositories into android/build.gradle
 */
function withProjectGradle(config) {
  return withProjectBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;

    // Add Maven repository
    if (!buildGradle.includes('https://chaquo.com/maven')) {
      buildGradle = buildGradle.replace(
        /repositories\s*\{([\s\S]*?)google\(\)/g,
        (match) => match + '\n        maven { url "https://chaquo.com/maven" }'
      );
    }

    // Add classpath dependency
    if (!buildGradle.includes('com.chaquo.python:gradle')) {
      buildGradle = buildGradle.replace(
        /dependencies\s*\{/,
        'dependencies {\n        classpath("com.chaquo.python:gradle:17.0.0")'
      );
    }

    config.modResults.contents = buildGradle;
    return config;
  });
}

/**
 * Injects Chaquopy plugin and configuration into android/app/build.gradle
 */
function withAppGradle(config) {
  return withAppBuildGradle(config, (config) => {
    let appBuildGradle = config.modResults.contents;

    // Apply plugin
    if (!appBuildGradle.includes('apply plugin: "com.chaquo.python"')) {
      appBuildGradle = appBuildGradle.replace(
        /apply plugin: "com\.android\.application"/,
        'apply plugin: "com.android.application"\napply plugin: "com.chaquo.python"'
      );
    }

    // Add sourceSets configuration
    if (!appBuildGradle.includes('python.srcDirs')) {
      const sourceSetsConfig = `
    // Point Chaquopy to the Python source files in the project root
    sourceSets {
        main {
            python.srcDirs = ["../../python"]
        }
    }`;
      appBuildGradle = appBuildGradle.replace(
        /android\s*\{/,
        `android {${sourceSetsConfig}`
      );
    }

    // Add Python configuration block inside defaultConfig
    if (!appBuildGradle.includes('// Chaquopy Python configuration')) {
      const pythonConfig = `
        // Chaquopy Python configuration
        python {
            buildPython "/usr/bin/python3.11"
            version "3.11"
            pip {
                install "ebooklib"
                install "lxml"
                install "beautifulsoup4"
                install "Pillow"
            }
        }
        ndk {
            abiFilters "arm64-v8a", "x86_64"
        }`;
        
      appBuildGradle = appBuildGradle.replace(
        /defaultConfig\s*\{/,
        `defaultConfig {${pythonConfig}`
      );
    }

    config.modResults.contents = appBuildGradle;
    return config;
  });
}

module.exports = function withChaquopy(config) {
  config = withProjectGradle(config);
  config = withAppGradle(config);
  return config;
};
