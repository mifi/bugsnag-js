import Scenario from "./Scenario";
import { NativeModules } from "react-native";

export default class UnhandledNativeErrorScenario extends Scenario {
    run() {
        NativeModules.BugsnagTestInterface.runScenario("UnhandledExceptionScenario", () => {})
    }
}