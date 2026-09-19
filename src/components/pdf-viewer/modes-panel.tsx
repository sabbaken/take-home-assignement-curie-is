import { useHotkey } from '@tanstack/react-hotkeys'
import { BugIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { ShortcutsPopover } from './shortcuts-popover'
import { type RectMode, useModes } from './state/modes'

export function ModesPanel() {
  const { rectMode, setRectMode, toggleRectMode, isDebug, toggleDebug } = useModes()

  useHotkey('D', toggleDebug)
  useHotkey('N', toggleRectMode)

  return (
    <div className="floating-panel modes-panel">
      <Tabs onValueChange={value => setRectMode(value as RectMode)} value={rectMode}>
        <TabsList aria-label="Rectangle strategy" className="segmented-control">
          <TabsTrigger value="naive">Naive</TabsTrigger>
          <TabsTrigger value="precise">Precise</TabsTrigger>
        </TabsList>
      </Tabs>
      <span className="panel-divider" aria-hidden="true" />
      <Button
        aria-label="Toggle debug outlines"
        aria-pressed={isDebug}
        className={cn('debug-button', isDebug && 'is-active')}
        onClick={toggleDebug}
        size="sm"
        title="Debug outlines (D)"
        variant="ghost"
      >
        <BugIcon />
        Debug
      </Button>
      <ShortcutsPopover />
    </div>
  )
}
