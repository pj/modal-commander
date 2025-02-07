import { LockCommand } from "./LockCommand";
import { PrefixSelectCommand } from "./PrefixSelectCommand";
import { SiteBlockerCommand } from "./SiteBlocker";
import { TextCommand } from "./TextCommand";
import { VolumeCommand } from "./VolumeCommand";
import { LayoutSelectCommand } from "./LayoutSelectCommand";
import { MoveWindowToCommand } from "./MoveWindowToCommand";
import { ApplicationSwitchCommand } from "./ApplicationSwitchCommand";
import { MoveWindowFromCommand } from "./MoveWindowFromCommand";

export const components = {
    TextCommand: TextCommand,
    LockCommand: LockCommand,
    PrefixSelectCommand: PrefixSelectCommand,
    SiteBlockerCommand: SiteBlockerCommand,
    VolumeCommand: VolumeCommand,
    LayoutSelectCommand: LayoutSelectCommand,
    MoveWindowToCommand: MoveWindowToCommand,
    MoveWindowFromCommand: MoveWindowFromCommand,
    ApplicationSwitchCommand: ApplicationSwitchCommand
}