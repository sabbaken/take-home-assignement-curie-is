import { useHotkey } from '@tanstack/react-hotkeys'
import { HelpCircleIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const SHORTCUTS = [
  { label: 'Play or pause', keys: ['Space'] },
  { label: 'Previous / next sentence', keys: ['←', '→'] },
  { label: 'Stop', keys: ['Esc'] },
  { label: 'Zoom', keys: ['−', '+'] },
  { label: 'Debug / strategy', keys: ['D', 'N'] },
]

export function ShortcutsPopover() {
  const [isOpen, setIsOpen] = useState(false)

  // `?` is Shift plus a layout-dependent key, so it is matched by the produced character.
  useHotkey({ key: '?', shift: true }, () => setIsOpen(current => !current))

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-label="Keyboard shortcuts"
          size="icon"
          title="Keyboard shortcuts (?)"
          variant="ghost"
        >
          <HelpCircleIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="popover-panel" sideOffset={10}>
        <div className="popover-heading">
          <div>
            <p>Keyboard shortcuts</p>
            <span>Keep your hands on the keyboard</span>
          </div>
          <Button
            aria-label="Close shortcuts"
            onClick={() => setIsOpen(false)}
            size="icon-sm"
            variant="ghost"
          >
            <XIcon />
          </Button>
        </div>
        <dl className="shortcuts-list">
          {SHORTCUTS.map(shortcut => (
            <div key={shortcut.label}>
              <dt>{shortcut.label}</dt>
              <dd>
                {shortcut.keys.map(key => (
                  <kbd key={key}>{key}</kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  )
}
