import { LockCommandMain } from "./LockCommandMain";
import { PrefixSelectCommandMain } from "./PrefixSelectCommandMain";
import { TextCommandMain } from "./TextCommandMain";
import { SiteBlockerMain } from "./SiteBlockerMain";
import { VolumeCommandMain } from "./VolumeCommandMain";
import { LayoutSelectCommandMain } from "./LayoutSelectCommandMain";
import { MoveWindowToCommandMain } from "./MoveWindowToCommandMain";

export default {
    TextCommand: TextCommandMain,
    LockCommand: LockCommandMain,
    PrefixSelectCommand: PrefixSelectCommandMain,
    SiteBlockerCommand: SiteBlockerMain,
    VolumeCommand: VolumeCommandMain,
    LayoutSelectCommand: LayoutSelectCommandMain,
    MoveWindowToCommand: MoveWindowToCommandMain
}