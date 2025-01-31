import { Monitor, ScreenConfig, SCREEN_PRIMARY, WindowManagerLayout } from "./WindowManagementTypes";

export function findMatchingScreenSet(layout: WindowManagerLayout, monitors: Monitor[]): ScreenConfig | null {
  for (const screenSet of layout.screenSets) {
    let foundAllScreens = true;
    for (const screen of Object.keys(screenSet)) {
      let foundScreen = false;
      for (const monitor of monitors) {
        if (screen === SCREEN_PRIMARY && monitor.main) {
          foundScreen = true;
          break;
        }
        if (screen === monitor.name) {
          foundScreen = true;
          break;
        }
      }
      if (!foundScreen) {
        foundAllScreens = false;
        break;
      }
    }
    if (foundAllScreens) {
      return screenSet;
    }
  }
  return null;
}
