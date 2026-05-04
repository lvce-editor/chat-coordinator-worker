/* cspell:words worktree */

import { CreateBackgroundWorktree } from '../BackgroundChatCommandIds/BackgroundChatCommandIds.ts'
import * as ExtensionHostShared from '../ExtensionHost/ExtensionHostShared.ts'
import { CommandExecute } from '../ExtensionHostCommandType/ExtensionHostCommandType.ts'

export interface CreateBackgroundChatWorktreeOptions {
  readonly assetDir: string
  readonly platform: number
  readonly projectUri: string
  readonly sessionId: string
  readonly title: string
}

export interface BackgroundChatWorktree {
  readonly branchName: string
  readonly workspaceUri: string
}

export const createBackgroundChatWorktree = async ({
  assetDir,
  platform,
  projectUri,
  sessionId,
  title,
}: CreateBackgroundChatWorktreeOptions): Promise<BackgroundChatWorktree> => {
  return ExtensionHostShared.executeProvider({
    assetDir,
    event: `onCommand:${CreateBackgroundWorktree}`,
    method: CommandExecute,
    noProviderFoundMessage: 'No background worktree command found',
    params: [
      CreateBackgroundWorktree,
      {
        projectUri,
        sessionId,
        title,
      },
    ],
    platform,
  }) as Promise<BackgroundChatWorktree>
}
