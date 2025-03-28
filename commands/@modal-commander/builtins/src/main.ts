import { LockCommandMain } from "./LockCommandMain";
import { PrefixSelectCommandMain } from "./PrefixSelectCommandMain";
import { TextCommandMain } from "./TextCommandMain";
import { SiteBlockerMain } from "./SiteBlockerMain";
import { VolumeCommandMain } from "./VolumeCommandMain";
import { LayoutSelectCommandMain } from "./LayoutSelectCommandMain";
import { MoveWindowToCommandMain } from "./MoveWindowToCommandMain";
import { ApplicationSwitchCommandMain } from "./ApplicationSwitchCommandMain";
import { MoveWindowFromCommandMain } from "./MoveWindowFromCommandMain";

export default {
    TextCommand: TextCommandMain,
    LockCommand: LockCommandMain,
    PrefixSelectCommand: PrefixSelectCommandMain,
    SiteBlockerCommand: SiteBlockerMain,
    VolumeCommand: VolumeCommandMain,
    LayoutSelectCommand: LayoutSelectCommandMain,
    MoveWindowToCommand: MoveWindowToCommandMain,
    MoveWindowFromCommand: MoveWindowFromCommandMain,
    ApplicationSwitchCommand: ApplicationSwitchCommandMain
}