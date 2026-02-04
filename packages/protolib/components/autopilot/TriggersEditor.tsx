import React, { useState, useCallback } from 'react';
import { YStack, XStack, Label, Button, Input, ScrollView } from '@my/ui';
import { SelectList } from '../SelectList';
import { Plus, Trash } from '@tamagui/lucide-icons';
import { nanoid } from 'nanoid';
import { useUpdateEffect } from 'usehooks-ts';

export type TriggerType = 'pre' | 'post';
export interface Trigger {
  name?: string;
  type?: TriggerType;
}

interface Row extends Trigger {
  rowId: string;
}

interface TriggersEditorProps {
  triggers: Trigger[];
  setTriggers: (triggers: Trigger[]) => void;
}

export const TriggersEditor: React.FC<TriggersEditorProps> = ({ triggers, setTriggers }) => {
  const [rows, setRows] = useState<Row[]>(() =>
    triggers.map((t) => ({ ...t, rowId: nanoid() }))
  );

  // Sync rows -> parent triggers
  useUpdateEffect(() => {
    setTriggers(rows.map(({ rowId, ...t }) => t));
  }, [rows]);

  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      { rowId: nanoid(), name: '', type: 'post' },
    ]);
  }, []);

  const removeRow = useCallback((rowId: string) => {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  }, []);

  const updateField = useCallback(
    (rowId: string, key: keyof Trigger, value: string) => {
      setRows((prev) =>
        prev.map((r) =>
          r.rowId === rowId ? { ...r, [key]: value } : r
        )
      );
    },
    []
  );

  const typeOptions = [
    { value: 'pre', caption: 'Before' },
    { value: 'post', caption: 'After' }
  ];

  return (
    <YStack flex={1} height="100%" borderRadius="$3" p="$3" backgroundColor="$gray3" overflow="hidden">
      <XStack alignItems="center" justifyContent="space-between" mb="$2">
        <Label size="$4">Triggers</Label>
        <Button icon={Plus} onPress={addRow}>Add</Button>
      </XStack>
      <ScrollView flex={1}>
        {rows.map(({ rowId, type, name }) => (
          <XStack
            key={rowId}
            alignItems="center"
            space="$2"
            p="$2"
            mb="$2"
            borderRadius="$2"
          >
            <SelectList
              title="Type"
              value={type}
              elements={typeOptions}
              setValue={(val) => {
                updateField(rowId, 'type', val as TriggerType);
              }}
              triggerProps={{
                borderWidth: 0,
                width: '25%',
              }}
            />

            <Input
              placeholder="Name"
              width="75%"
              value={name}
              onChangeText={(text) => updateField(rowId, 'name', text)}
            />


            <Button ml={'$2'} icon={Trash} size="$2" onPress={() => removeRow(rowId)} />
          </XStack>
        ))}
      </ScrollView>
    </YStack>
  );
};
