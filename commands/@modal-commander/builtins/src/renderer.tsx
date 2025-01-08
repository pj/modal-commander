import { LockCommand } from "./LockCommand";
import { PrefixSelectCommand } from "./PrefixSelectCommand";
import { SiteBlockerCommand } from "./SiteBlocker";
import { TextCommand } from "./TextCommand";
import { VolumeCommand } from "./VolumeCommand";

export const components = {
    TextCommand: TextCommand,
    LockCommand: LockCommand,
    PrefixSelectCommand: PrefixSelectCommand,
    SiteBlockerCommand: SiteBlockerCommand,
    VolumeCommand: VolumeCommand
}