import { YStack, XStack, Spacer, ScrollView, useThemeName, Input, Text, Button, Paragraph, Label } from '@my/ui'
import { AlertDialog } from '../../components/AlertDialog';
import { Slides } from '../../components/Slides'
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActionCardSettings } from '../autopilot/ActionCardSettings';
import { useProtoStates } from '@extensions/protomemdb/lib/useProtoStates'
import { Search, ScanEye, Rocket } from "@tamagui/lucide-icons";
import { Tinted } from '../Tinted';
import { PublicIcon } from '../IconSelect';
import { useThemeSetting } from '@tamagui/next-theme'
import { v4 as uuidv4 } from 'uuid';
import { Markdown } from '../../components/Markdown';
import { useRemoteStateList } from '../../lib/useRemoteState';
import { CardModel } from '@extensions/cards/cardsSchemas';
import { API, getPendingResult } from 'protobase';
import { defaultCardHtmlTemplates } from './defaultCardTemplates';

const SelectGrid = ({ children }) => {
  return <XStack jc="flex-start" ai="center" gap={25} flexWrap='wrap'>
    {children}
  </XStack>
}

const FirstSlide = ({ selectedCards, setSelectedCards, options, errors }) => {
  const themeName = useThemeName()
  const { resolvedTheme } = useThemeSetting()
  const darkMode = resolvedTheme == 'dark'
  const [search, setSearch] = useState('')
  const isAction = (option) => option.defaults?.type === 'action'
  const [selectedGroups, setSelectedGroups] = useState([]);
  const cardNameInputRefs = useRef({})
  const [lastClickedId, setLastClickedId] = useState(null)

  // Extrae los grupos disponibles de las options
  const groups = useMemo(() => {
    options.sort((a, b) => {
      if (a.group && b.group) {
        return a.group.localeCompare(b.group);
      }
      return 0;
    });
    return [...new Set(options.map(o => o.group).filter(Boolean))];
  }, [options]);

  const toggleGroup = (group) => {
    setSelectedGroups((prev) =>
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    );
  };

  // Calculate relevance score for a card based on search terms
  const getCardScore = (opt, searchTerms) => {
    let score = 0;
    const templateName = (opt.templateName ?? '').toLowerCase();
    const name = (opt.name ?? '').toLowerCase();
    const description = (opt.defaults?.description ?? '').toLowerCase();
    const group = (opt.group ?? '').toLowerCase();
    const tag = (opt.tag ?? '').toLowerCase();
    const paramsText = Object.keys(opt.defaults?.params ?? {}).join(' ').toLowerCase() +
      ' ' + Object.values(opt.defaults?.params ?? {}).join(' ').toLowerCase();

    for (const term of searchTerms) {
      // Exact match in templateName (highest priority)
      if (templateName.includes(term)) score += 100;
      // Exact match in name
      if (name.includes(term)) score += 80;
      // Match in description
      if (description.includes(term)) score += 60;
      // Match in group
      if (group.includes(term)) score += 40;
      // Match in tag
      if (tag.includes(term)) score += 40;
      // Match in params
      if (paramsText.includes(term)) score += 20;
    }
    return score;
  };

  const getFilteredOptions = (options, search, selectedGroups) => {
    const lowerSearch = search.toLowerCase().trim();

    // Split search into individual terms (words)
    const searchTerms = lowerSearch.split(/\s+/).filter(t => t.length > 0);

    // If no search, return all (filtered by group)
    if (searchTerms.length === 0) {
      return options.filter(opt =>
        selectedGroups.length === 0 || selectedGroups.includes(opt.group)
      );
    }

    // Score and filter cards
    const scored = options
      .filter(opt => selectedGroups.length === 0 || selectedGroups.includes(opt.group))
      .map(opt => ({ opt, score: getCardScore(opt, searchTerms) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.map(({ opt }) => opt);
  }

  const filteredOptions = useMemo(() => {
    return getFilteredOptions(options, search, selectedGroups);
  }, [options, search, selectedGroups]);

  const groupedOptions = useMemo(() => {
    return filteredOptions.reduce((acc, opt) => {
      const groupKey = opt.group ?? "__no_group__";
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(opt);
      return acc;
    }, {});
  }, [filteredOptions]);

  const flatFilteredOptions = useMemo(() => Object.values(groupedOptions).flat(), [groupedOptions]);

  const onChangeSearch = (text) => {
    setSearch(text);
    const itemToSelect = getFilteredOptions(options, text, selectedGroups)?.[0];
    if (itemToSelect && selectedCards.length <= 1) {
      setSelectedCards([itemToSelect]);
    }
  }

  const isSelected = (option) => selectedCards.some(c => c.id === option.id);

  const handleCardClick = (option, event) => {
    if (event.shiftKey && lastClickedId && flatFilteredOptions.length > 0) {
      const lastIndex = flatFilteredOptions.findIndex(o => o.id === lastClickedId);
      const currentIndex = flatFilteredOptions.findIndex(o => o.id === option.id);
      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeItems = flatFilteredOptions.slice(start, end + 1);
        const existingIds = new Set(selectedCards.map(c => c.id));
        const newItems = rangeItems.filter(item => !existingIds.has(item.id));
        setSelectedCards([...selectedCards, ...newItems]);
      }
    } else if (event.ctrlKey || event.metaKey) {
      if (isSelected(option)) {
        if (selectedCards.length > 1) {
          setSelectedCards(selectedCards.filter(c => c.id !== option.id));
        }
      } else {
        setSelectedCards([...selectedCards, option]);
      }
      setLastClickedId(option.id);
    } else {
      setSelectedCards([option]);
      setLastClickedId(option.id);
      setTimeout(() => cardNameInputRefs.current[option.id]?.focus(), 0);
    }
  }

  const updateCardName = (cardId, value) => {
    setSelectedCards(prev => prev.map(card =>
      card.id === cardId
        ? { ...card, defaults: { ...card.defaults, customName: value && value.length ? value : null } }
        : card
    ));
  }

  const removeCard = (cardId) => {
    if (selectedCards.length > 1) {
      setSelectedCards(prev => prev.filter(c => c.id !== cardId));
    }
  }

  return (
    <XStack f={1} gap="$4" pb="$4">
      <YStack f={1}>
        <XStack pb={8} mb={5} position="relative">
          <Search pos="absolute" left="$3" top={14} size={16} pointerEvents="none" />
          <Input
            bg="$gray3"
            color="$gray12"
            paddingLeft="$7"
            bw={themeName === 'dark' ? 0 : 1}
            h="47px"
            boc={'$gray5'}
            w="100%"
            placeholder="search..."
            placeholderTextColor="$gray9"
            outlineColor="$gray8"
            value={search}
            onChangeText={onChangeSearch}
          />
        </XStack>
        <XStack gap="$2" mb="$4" flexWrap="wrap">
          <Tinted>
            {groups.map((group) => {
              const isActive = selectedGroups.includes(group);
              return (
                <Button
                  key={group}
                  onPress={() => toggleGroup(group)}
                  size="$3"
                  style={{
                    backgroundColor: isActive ? 'var(--color4)' : 'var(--gray3)',
                    borderColor: isActive ? 'var(--color7)' : 'var(--gray5)',
                    borderWidth: '1px',
                    borderRadius: "$10",
                    color: isActive ? '$color' : 'inherit',
                  }}
                >
                  {group}
                </Button>
              );
            })}
          </Tinted>
        </XStack>

        <XStack flex={1} gap="$3">
          <Tinted>
            <ScrollView>
              {Object.entries(groupedOptions).map(([group, options]) => (
                <YStack key={group} mb="$3">
                  {group !== "__no_group__" && (
                    <>
                      <Text fontSize="$5" fontWeight="600" mb="$2">{group}</Text>
                    </>
                  )}

                  <SelectGrid>
                    {options.map((option) => {
                      const selected = isSelected(option);
                      // Show device tag as subtitle for device cards to differentiate between multiple devices
                      const showDeviceTag = option.group === 'devices' && option.tag;
                      // Format device tag: "android_89707d58" -> "Android · 89707d58"
                      const formatDeviceTag = (tag: string) => {
                        if (!tag) return '';
                        const parts = tag.split('_');
                        if (parts.length >= 2) {
                          const type = parts[0]//.charAt(0).toUpperCase() + parts[0].slice(1);
                          const id = parts.slice(1).join('_');
                          // Shorten long IDs
                          const shortId = id.length > 12 ? id.slice(0, 8) + '…' : id;
                          return `${type} · ${shortId}`;
                        }
                        // Single word like "computer" - just capitalize
                        return tag//.charAt(0).toUpperCase() + tag.slice(1);
                      };
                      const deviceTag = showDeviceTag ? formatDeviceTag(option.tag) : null;
                      
                      return (
                        <XStack
                          height={showDeviceTag ? 80 : 70}
                          key={option.id}
                          width="calc(50% - 12.5px)"
                          // $gtLg={{ width: "calc(33% - 17px)" }}
                          gap={"$2"}
                          p={"$2"}
                          px={"$3"}
                          cursor="pointer"
                          onPress={(e) => handleCardClick(option, e)}
                          borderRadius={"$3"}
                          ai="center"
                          bw={"1px"}
                          boc={selected ? "$color8" : "$gray5"}
                          bc={selected ? "$color4" : "$gray2"}
                          hoverStyle={{ bc: "$color4", boc: "$color7" }}
                        >
                          <YStack
                            br={isAction(option) ? "$10" : "$2"}
                            p={"$2.5"}
                            bc={
                              option?.defaults?.color
                                ? option?.defaults?.color
                                : isAction(option)
                                  ? "$yellow8"
                                  : "$blue8"
                            }
                          >
                            <PublicIcon
                              name={option.defaults.icon}
                              color="var(--color)"
                              size={20}
                            />
                          </YStack>
                          <YStack f={1} ml="$2">
                            <Text fontSize="$4" numberOfLines={1}>{option.templateName}</Text>
                            {deviceTag && (
                              <Text fontSize="$2" color="$gray9" numberOfLines={1} mt="$1">
                                {deviceTag}
                              </Text>
                            )}
                          </YStack>
                        </XStack>
                      );
                    })}
                  </SelectGrid>
                </YStack>
              ))}
            </ScrollView>
          </Tinted>

        </XStack>
        <Text fontSize="$2" color="$gray9" mt="$2">
          Tip: Shift+Click to select a range, Ctrl+Click to add/remove
        </Text>
      </YStack>
      <YStack
        width={500}
        height={"100%"}
        gap="$3"
      >
        <XStack jc="space-between" ai="center" px="$2">
          <Text fontSize="$5" fontWeight="600" color="$gray11">
            {selectedCards.length} card{selectedCards.length !== 1 ? 's' : ''} selected
          </Text>
        </XStack>
        <ScrollView f={1}>
          <YStack gap="$3" pr="$2">
            {selectedCards.map((card, index) => (
              <YStack
                key={card.id}
                bw={1} bc="$gray3" br="$3" p="$4" boc={"$gray6"}
              >
                <XStack gap="$2" ai="center" jc="space-between" mb="$2">
                  <XStack gap="$2" ai="center" f={1}>
                    <YStack
                      br={isAction(card) ? "$10" : "$2"}
                      p={"$2"}
                      bc={card?.defaults?.color ? card.defaults.color : isAction(card) ? "$yellow8" : "$blue8"}
                    >
                      <PublicIcon name={card.defaults?.icon} color="var(--color)" size={16} />
                    </YStack>
                    <Text fontSize="$4" fontWeight="500" f={1} numberOfLines={1}>{card.templateName}</Text>
                  </XStack>
                  {selectedCards.length > 1 && (
                    <Button size="$2" circular bc="transparent" hoverStyle={{ bc: "$red4" }} onPress={() => removeCard(card.id)}>
                      <Text color="$red9" fontSize="$3">✕</Text>
                    </Button>
                  )}
                </XStack>
                <YStack w="100%">
                  <Label alignSelf="flex-start" ml={"$2"} h={"$3"} color="$gray9" size="$3">Name</Label>
                  <Input
                    bg="$gray6"
                    placeholder={card.defaults?.name ?? "Card name"}
                    placeholderTextColor={"$gray10"}
                    outlineColor="$gray8"
                    w="100%"
                    size="$3"
                    ref={(ref) => { cardNameInputRefs.current[card.id] = ref; }}
                    value={card.defaults?.customName ?? ''}
                    onChangeText={(value) => updateCardName(card.id, value)}
                  />
                </YStack>
                {card.defaults?.description && (
                  <YStack w="100%" mt="$2">
                    <Label alignSelf="flex-start" ml={"$2"} h={"$3"} color="$gray9" size="$3">Description</Label>
                    <Markdown readOnly copyToClipboardEnabled={false} fontSize={14} p={4} data={card.defaults.description} />
                  </YStack>
                )}
                {index === 0 && errors?.length > 0 && (
                  <YStack mt="$2">
                    {errors.map((error, idx) => (
                      <Paragraph key={"err" + idx} color="$red9" fontSize="$3">{error}</Paragraph>
                    ))}
                  </YStack>
                )}
              </YStack>
            ))}
          </YStack>
        </ScrollView>
      </YStack>
    </XStack>
  )
}

const iconTable = {
  'value': 'tag',
  'action': 'zap'
}

const SecondSlide = ({ remountKey, card, board, states, icons, actions, setCard, errors }) => {
  return (
    <YStack mb="$4" marginTop="$-5" marginHorizontal="$-6" f={1}>
      <ActionCardSettings
        key={remountKey}
        mode="create"
        board={board}
        states={states}
        icons={icons}
        card={card}
        actions={actions}
        onEdit={(data) => setCard(data)}
        errors={errors}
      />
    </YStack>
  )
}

// Card templates moved to defaultCardTemplates.ts

const extraCards = [
  {
    defaults: {
      type: 'action',
      name: 'action',
      width: 2,
      height: 7,
      displayResponse: true,
      icon: 'rocket',
      displayIcon: false,
      params: {
        input: "action input"
      },
      configParams: {
        input: {
          visible: true,
          defaultValue: "",
          type: "any"
        }
      },
      rulesCode: "return params.input",
      description: `Default description, edit this description to improve usability of this action`,
    },
    group: "base",
    tag: "cards",
    name: 'action',
    id: 'base.cards.action',
    templateName: 'Action',
  },
  {
    defaults: {
      width: 3,
      height: 22,
      type: 'action',
      name: 'AI Action',
      displayResponse: true,
      editRulesInLowCode: false,
      editRulesInNaturalLanguage: false,
      rulesCode: `const instructionsExecution = context.ai.htmlBox(\`
<p>You are an AI agent inside <strong style="color:#0a84ff;">Vento</strong>, an AI agent platform.</p>
<p>The agent is managed through a <strong>board</strong> composed of <em>states</em> and <em>actions</em>.</p>
<p>Your mission is to generate a JSON response in this format:</p>
<pre style="background:#2c2c2e;color:#0a84ff;padding:12px;border-radius:8px;overflow-x:auto;font-size:12px;margin:8px 0;border:1px solid #3a3a3c;">
{
  "response": "your message in markdown format",
  "actions": [
    { "name": "action name", "params": { "key": "value" } }
  ]
}
</pre>
<ul style="margin:8px 0;padding-left:20px;color:#e5e5e7;">
<li>The <strong>response</strong> will be shown to the user</li>
<li>The <strong>actions</strong> array can be empty if no actions needed</li>
<li>Always use the action <strong>name</strong>, never the key, or id, just the name</li>
<li>Use <strong style="color:#0a84ff;">Board States</strong> to answer questions</li>
<li>If something is unavailable, suggest extending the board</li>
</ul>
\`, 'Instructions')

const instructionsReadOnly = context.ai.htmlBox(\`
<p>You are an assistant providing answers about an agent's state.</p>
<p>Use the <strong style="color:#0a84ff;">Board States</strong> to answer questions.</p>
<p>Answer in plain language, in the same language as the prompt.</p>
<p>Your answer will be sent to a human. Please don't use json or other things except markdown</p>
\`, 'Instructions')

// Build prompt suffix if include_previous_actions is enabled (requires allow_read)
const promptSuffix = params.include_previous_actions && params.allow_read && params.previous_actions_card?.length
  ? \`The following actions have been executed. Use plain language, and not explain any tech details: \${params.previous_actions_card.map(card => JSON.stringify(board?.[card])).filter(Boolean).join('\\n')}\`
  : undefined

const { prompt, response } = await context.ai.aiAction({
  board,
  boardActions,
  name,
  boardName,
  prompt: params.prompt,
  prompt_suffix: promptSuffix,
  full_board_view: params.full_board_view,
  allow_read: params.allow_read,
  values: params.values,
  invisible_values: [...(params.invisible_values || []), name],
  allow_execution: params.allow_execution,
  actions: params.actions,
  invisible_actions: [...(params.invisible_actions || []), name],
  debug: params.debug,
  log_ai_calls: params.log_ai_calls,
  instructionsExecution,
  instructionsReadOnly,
  getStatesByType: context.boards.getStatesByType
})

if (params.debug) return prompt

if (params.allow_execution) {
  return context.ai.processResponse({
    response,
    execute_action
  })
}

return response
`,
      html: "//@card/react\n\nfunction Widget(card) {\n  const value = card.value;\n  \n  // Auto-detect HTML content\n  const isHtmlContent = typeof value === 'string' && value.trim().startsWith('<');\n  const mode = card.markdownDisplay ? 'markdown' : (card.htmlDisplay || isHtmlContent) ? 'html' : 'normal';\n\n  const content = <YStack f={1} mt={\"20px\"} ai=\"center\" jc=\"center\" width=\"100%\">\n      {card.icon && card.displayIcon !== false && (\n          <Icon name={card.icon} size={48} color={card.color}/>\n      )}\n      {card.displayResponse !== false && (\n          <CardValue mode={mode} value={value ?? \"N/A\"} />\n      )}\n  </YStack>\n\n  return (\n      <Tinted>\n        <ProtoThemeProvider forcedTheme={window.TamaguiTheme}>\n          <ActionCard data={card}>\n            {card.displayButton !== false ? <ParamsForm data={card}>{content}</ParamsForm> : card.displayResponse !== false && content}\n          </ActionCard>\n        </ProtoThemeProvider>\n      </Tinted>\n  );\n}",
      params: {
        "prompt": "User prompt to send to the AI",
        "full_board_view": "Allows the AI to see the entire board",
        "allow_read": "Allows this AI action to read other card values",
        "values": "name of the cards for the AI to see",
        "invisible_values": "name of the cards the AI should not see",
        "include_previous_actions": "Include results from a previous AI action in the prompt",
        "previous_actions_card": "Card whose result to include",
        "allow_execution": "Allow this AI action to execute other actions",
        "actions": "name of the action cards visible for the AI to run",
        "invisible_actions": "name of the action cards the AI should not see",
        "debug": "Returns the prompt instead of calling the AI",
        "log_ai_calls": "Enable AI call logging"
      },
      configParams: {
        "prompt": {
          "visible": true,
          "defaultValue": "",
          "type": "any"
        },
        full_board_view: {
          "visible": true,
          "defaultValue": "false",
          "type": "boolean"
        },
        allow_read: {
          "visible": true,
          "defaultValue": "true",
          "type": "boolean"
        },
        values: {
          "visible": true,
          "defaultValue": "[\"*\"]",
          "type": "array",
          "cardSelector": true,
          "cardSelectorType": "value",
          "visibility": {
            "mode": "all",
            "fields": [
              "full_board_view",
              "allow_read"
            ],
            "values": [
              false,
              true
            ]
          }
        },
        invisible_values: {
          "visible": true,
          "defaultValue": "[]",
          "type": "array",
          "cardSelector": true,
          "cardSelectorType": "value",
          "visibility": {
            "mode": "all",
            "fields": [
              "full_board_view",
              "allow_read"
            ],
            "values": [
              false,
              true
            ]
          }
        },
        include_previous_actions: {
          "visible": true,
          "defaultValue": "false",
          "type": "boolean",
          "visibility": {
            "field": "allow_read",
            "mode": "boolean"
          }
        },
        previous_actions_card: {
          "visible": true,
          "defaultValue": "[]",
          "type": "array",
          "cardSelector": true,
          "cardSelectorType": "action",
          "visibility": {
            "mode": "all",
            "fields": [
              "include_previous_actions",
              "allow_read"
            ],
            "values": [
              true,
              true
            ]
          }
        },
        allow_execution: {
          "visible": true,
          "defaultValue": "true",
          "type": "boolean"
        },
        actions: {
          "visible": true,
          "defaultValue": "[\"*\"]",
          "type": "array",
          "cardSelector": true,
          "cardSelectorType": "action",
          "visibility": {
            "mode": "all",
            "fields": [
              "full_board_view",
              "allow_execution"
            ],
            "values": [
              false,
              true
            ]
          }
        },
        invisible_actions: {
          "visible": true,
          "defaultValue": "[]",
          "type": "array",
          "cardSelector": true,
          "cardSelectorType": "action",
          "visibility": {
            "mode": "all",
            "fields": [
              "full_board_view",
              "allow_execution"
            ],
            "values": [
              false,
              true
            ]
          }
        },
        debug: {
          "visible": true,
          "defaultValue": "false",
          "type": "boolean"
        },
        log_ai_calls: {
          "visible": true,
          "defaultValue": "false",
          "type": "boolean"
        }
      },
      description: `Unified AI action card for executing actions and answering questions using AI.

#### Key Features
- Execute actions OR read states based on configuration
- Optionally include previous action results in the prompt
- Full visibility control for actions and states`,
      displayIcon: false,
      displayButton: true,
      displayButtonIcon: true,
      icon: 'sparkles',
      color: "var(--color7)"
    },
    name: 'aiaction',
    id: 'ai.cards.aiaction',
    templateName: 'AI Action',
    group: "ai",
    tag: "cards",
  },
  {
    defaults: {
      type: 'value',
      name: 'value',
      width: 2,
      height: 7,
      icon: 'scan-eye',
      description: `Default description, edit this description to improve usability of this value`,
      params: {
        input: "input to observe"
      },
      configParams: {
        input: {
          visible: true,
          defaultValue: "",
          type: "any"
        }
      },
      rulesCode: "return params.input;\n",
    },
    name: 'Value',
    id: 'base.cards.value',
    group: "base",
    tag: "cards",
    templateName: 'Value',
  }
]

function flattenTree(obj, currentGroup = null) {
  let leaves = [];

  function traverse(node, group) {
    if (node && typeof node === 'object') {
      if (node.name) {
        leaves.push({ ...node, group: group }); // añade el grupo a cada hoja
      } else {
        for (const [key, value] of Object.entries(node)) {
          traverse(value, group ?? key); // el primer nivel se considera grupo
        }
      }
    }
  }

  traverse(obj, currentGroup);
  return leaves;
}

const fetch = async (fn) => {
  const data = await API.get({ url: '/api/core/v1/cards' })
  fn(data)
}

const useCards = (extraCards = []) => {
  const [_items, setItems] = useRemoteStateList(getPendingResult('pending'), fetch, 'notifications/card/#', CardModel, true);
  return [...extraCards, ...(_items?.data?.items ?? [])]
}

const makeDefaultCard = (tpl) => {
  const type = tpl?.defaults?.type || tpl?.type || 'value';
  const width = tpl?.defaults?.width ?? (type === 'value' ? 1 : 2);
  const height = tpl?.defaults?.height ?? (type === 'value' ? 4 : 6);
  const icon = tpl?.defaults?.icon ?? iconTable[type];
  const html = tpl?.defaults?.html ?? defaultCardHtmlTemplates[type];

  // Include template metadata (group, tag, id, templateName, etc.) so we can
  // later derive device associations or other properties on save.
  return {
    key: "key",
    ...tpl,
    ...tpl?.defaults,
    width,
    height,
    icon,
    html,
  };
}

function generateVersionatedName(name, existing) {
  const set = existing instanceof Set ? existing : new Set(existing);
  if (!set.has(name)) return name; // if doesn't exist, keep it

  // separate extension (doesn't count .env as extension)
  const i = name.lastIndexOf('.');
  const ext = i > 0 ? name.slice(i) : '';
  const base0 = i > 0 ? name.slice(0, i) : name;

  // only " base NUM" format at the end
  const m = /^(.*?)(?: (\d+))?$/.exec(base0);
  const base = m[1];
  let n = m[2] ? +m[2] : 1; // if no number -> start at 1 so first ++ is 2

  let candidate;
  do candidate = `${base} ${++n}${ext}`;
  while (set.has(candidate));

  return candidate;
}

export const CardSelector = ({ defaults = {}, board, addOpened, setAddOpened, onFinish, states, icons, actions, errors }) => {
  const cards = useCards(extraCards)

  const [selectedCards, setSelectedCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [remountKey, setRemountKey] = useState(uuidv4())
  const createButtonLabel = selectedCards.length > 1 ? `Create ${selectedCards.length} cards` : 'Create';

  useEffect(() => {
    if (addOpened) {
      setRemountKey(uuidv4())
    } else if (cards?.length) {
      setSelectedCards([cards[0]])
    }
  }, [addOpened])

  return <AlertDialog
    integratedChat
    p="$2"
    pt="$5"
    pl="$5"
    setOpen={setAddOpened}
    open={addOpened}
    hideAccept
    description=""
  >
    <YStack f={1} jc="center" ai="center">
      <XStack f={1} mr="$5">
        <Slides
          hideHeader={true}
          styles={{ f: 1, w: "90vw", maw: 1400, h: "90vh", mah: 1200 }}
          lastButtonCaption={createButtonLabel}
          disabled={selectedCards.length === 0}
          loading={loading}
          onFinish={async () => {
            setLoading(true)
            try {
              const existingNames = new Set(board?.cards.map(c => c.name) ?? [])
              const cardsToCreate = selectedCards.map(selectedCard => {
                const card = makeDefaultCard(selectedCard)
                const baseName = selectedCard.defaults?.customName ?? card.name
                card["name"] = generateVersionatedName(baseName, existingNames)
                existingNames.add(card["name"])
                return card
              })
              await onFinish(cardsToCreate)
              setAddOpened(false)
            } catch (e) {
              console.error("Error creating cards: ", e)
            }
            setLoading(false)
          }}
          slides={[
            {
              name: "Create new card",
              component: (
                <FirstSlide options={cards} selectedCards={selectedCards} setSelectedCards={setSelectedCards} errors={errors} />
              ),
            },
            // {
            //   name: "Configure your card",
            //   component: card ? (
            //     <SecondSlide remountKey={remountKey} board={board} states={states} icons={icons} actions={actions} card={card} setCard={setCard} errors={errors} />
            //   ) : null,
            // },
          ]}
        />
      </XStack>
    </YStack>
  </AlertDialog>
}