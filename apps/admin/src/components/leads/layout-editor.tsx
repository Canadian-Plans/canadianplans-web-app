'use client';

import { useState } from 'react';
import { Button, Input, NativeSelect } from '@canadian-plans/ui';
import { type LeadField, type LeadLayout } from '@canadian-plans/contracts';
import { leadError } from './shared';

export function LeadLayoutEditor({
  initial,
  fields,
  onSave,
}: {
  initial: LeadLayout;
  fields: LeadField[];
  onSave(layout: LeadLayout): Promise<void>;
}) {
  const missing = fields.filter((f) => !initial.sections.some((s) => s.fields.includes(f.key)));
  const [layout, setLayout] = useState<LeadLayout>(() => ({
    sections: [
      ...initial.sections.map((s) => ({
        ...s,
        fields: s.fields.filter((key) => fields.some((f) => f.key === key)),
      })),
      ...(missing.length
        ? [
            {
              id: `section_${crypto.randomUUID().replaceAll('-', '')}`,
              label: 'More details',
              fields: missing.map((f) => f.key),
            },
          ]
        : []),
    ],
  }));
  const [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  const move = (key: string, sectionId: string, before?: string) => {
    setLayout((current) => ({
      sections: current.sections.map((s) => {
        const keys = s.fields.filter((f) => f !== key);
        if (s.id === sectionId)
          keys.splice(before ? Math.max(0, keys.indexOf(before)) : keys.length, 0, key);
        return { ...s, fields: keys };
      }),
    }));
    setMessage('Field moved. Save layout to apply the order.');
  };
  const reorderSection = (index: number, offset: number) =>
    setLayout((current) => {
      const sections = [...current.sections];
      const section = sections.splice(index, 1)[0];
      if (section) sections.splice(index + offset, 0, section);
      return { sections };
    });
  async function save() {
    setBusy(true);
    setMessage('');
    try {
      await onSave(layout);
      setMessage('Layout saved.');
    } catch (e) {
      setMessage(leadError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Drag fields into a section or use the move buttons and section selector.
      </p>
      {layout.sections.map((section, sectionIndex) => (
        <section
          key={section.id}
          className="rounded-lg border p-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const sourceSection = e.dataTransfer.getData('application/x-lead-section');
            const index = layout.sections.findIndex((item) => item.id === sourceSection);
            if (index >= 0 && index !== sectionIndex) reorderSection(index, sectionIndex - index);
            const key = e.dataTransfer.getData('text/plain');
            if (fields.some((f) => f.key === key)) move(key, section.id);
          }}
        >
          <div className="mb-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              draggable
              aria-label={`Drag ${section.label} section`}
              onDragStart={(e) => e.dataTransfer.setData('application/x-lead-section', section.id)}
            >
              ↕
            </Button>
            <Input
              aria-label={`Section ${sectionIndex + 1} name`}
              maxLength={80}
              value={section.label}
              onChange={(e) =>
                setLayout({
                  sections: layout.sections.map((s) =>
                    s.id === section.id ? { ...s, label: e.target.value } : s,
                  ),
                })
              }
            />
            <Button
              variant="ghost"
              size="sm"
              disabled={sectionIndex === 0}
              onClick={() => reorderSection(sectionIndex, -1)}
            >
              Move section up
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={sectionIndex === layout.sections.length - 1}
              onClick={() => reorderSection(sectionIndex, 1)}
            >
              Move section down
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={section.fields.length > 0}
              onClick={() =>
                setLayout({ sections: layout.sections.filter((s) => s.id !== section.id) })
              }
            >
              Remove empty section
            </Button>
          </div>
          {section.fields.length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">
              Drop fields here or choose this section from a field’s selector.
            </p>
          )}
          <ul className="space-y-2">
            {section.fields.map((key, index) => {
              const field = fields.find((f) => f.key === key);
              return (
                <li
                  key={key}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', key)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const dragged = e.dataTransfer.getData('text/plain');
                    if (fields.some((f) => f.key === dragged)) move(dragged, section.id, key);
                  }}
                  className="flex flex-wrap items-center gap-2 rounded border bg-muted/20 p-2"
                >
                  <span className="mr-auto text-sm">{field?.label ?? key}</span>
                  <Button
                    aria-label={`Move ${field?.label} up`}
                    variant="ghost"
                    size="sm"
                    disabled={index === 0}
                    onClick={() => move(key, section.id, section.fields[index - 1])}
                  >
                    ↑
                  </Button>
                  <Button
                    aria-label={`Move ${field?.label} down`}
                    variant="ghost"
                    size="sm"
                    disabled={index === section.fields.length - 1}
                    onClick={() => {
                      const following = section.fields[index + 2];
                      move(key, section.id, following);
                    }}
                  >
                    ↓
                  </Button>
                  <NativeSelect
                    className="w-auto"
                    aria-label={`Section for ${field?.label}`}
                    value={section.id}
                    onChange={(e) => move(key, e.target.value)}
                  >
                    {layout.sections.map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </NativeSelect>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={layout.sections.length >= 20}
          onClick={() =>
            setLayout({
              sections: [
                ...layout.sections,
                {
                  id: `section_${crypto.randomUUID().replaceAll('-', '')}`,
                  label: 'New section',
                  fields: [],
                },
              ],
            })
          }
        >
          Add section
        </Button>
        <Button disabled={busy} onClick={() => void save()}>
          {busy ? 'Saving…' : 'Save layout'}
        </Button>
      </div>
      <p role="status" aria-live="polite" className="text-sm">
        {message}
      </p>
    </div>
  );
}
