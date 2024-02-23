// This script is designed to be run within the react-native-android-builder Docker image
// It copies just the files it needs from the source 'fixtures' directory in the destination,
// before running gradlew (to avoid the need to download gradle multiple times).
const common = require('./common')
const fs = require('fs')

module.exports = {
  buildAndroid: function buildAndroid (sourceFixtures, destFixtures) {
    try {
      const version = process.env.NOTIFIER_VERSION || common.determineVersion()
      const rnVersion = process.env.REACT_NATIVE_VERSION
      const registryUrl = process.env.REGISTRY_URL

      let jsSourceDir = 'scenario_js'
      if (process.env.JS_SOURCE_DIR) {
        jsSourceDir = process.env.JS_SOURCE_DIR
      }

      let artefactName = rnVersion
      if (process.env.ARTEFACT_NAME) {
        artefactName = process.env.ARTEFACT_NAME
      }

      console.log(`Installing notifier version: ${version}`)

      // Copy in files required
      common.run(`mkdir -p ${destFixtures}/${rnVersion}`)
      common.run(`rsync -a --no-recursive ${sourceFixtures}/${rnVersion}/* ${destFixtures}/${rnVersion}`, true)
      common.run(`rsync -a ${sourceFixtures}/${rnVersion}/android ${destFixtures}/${rnVersion}`, true)
      common.run(`rsync -a ${sourceFixtures}/app/${jsSourceDir}/ ${destFixtures}/${rnVersion}`, true)
      common.run(`rsync -a ${sourceFixtures}/reactnative ${destFixtures}/${rnVersion}/android/app/src/main/java/com`, true)

      // JavaScript layer
      common.changeDir(`${destFixtures}/${rnVersion}`)
      common.run(`npm install --registry ${registryUrl}`, true)

      // Install notifier
      const command = `npm install @bugsnag/react-native@${version}  --registry ${registryUrl}`
      common.run(command, true)

      // Install any required secondary files
      if (fs.existsSync('./install.sh')) {
        console.log('Installing secondary requirements')
        common.run(`BUGSNAG_VERSION=${version} ./install.sh`, true)
      }

      // Native layer
      common.changeDir('android')

      if (process.env.RN_NEW_ARCH === 'true') {
        common.run('cp newarch.gradle.properties gradle.properties')
        common.run('./gradlew generateCodegenArtifactsFromSchema assembleRelease', true)
      } else {
        common.run('./gradlew assembleRelease', true)
      }

      // Finally, copy the APK back to the host
      fs.copyFileSync(`${destFixtures}/${rnVersion}/android/app/build/outputs/apk/release/app-release.apk`,
        `${process.env.PWD}/build/${artefactName}.apk`)
    } catch (e) {
      console.error(e, e.stack)
      process.exit(1)
    }
  },
  buildIOS: function buildIOS () {
    common.run('echo builldIOS', true)
    common.run('bundle install', true)
    common.run('pod --version', true)
    common.run('./pod.sh', true)
  }
}
