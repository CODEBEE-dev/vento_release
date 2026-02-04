import { YStack, Text, Input, XStack, Button, Spinner, Label } from "@my/ui"
import { Tinted } from "protolib/components/Tinted"
import { useEffect, useState } from "react"
import { X, Plus } from "@tamagui/lucide-icons"
import { API } from "protobase"
import { MultiSelectList } from "protolib/components/MultiSelectList"
import { IconSelect } from "protolib/components/IconSelect"
import { Setting, SettingsGroup } from "protolib/components/SettingsComponents"
import { FormInput } from "protolib/components/FormInput"

export const BoardSettingsEditor = ({ board, onSave, readOnly = false }) => {

    // -------- Board fields we are editing --------
    const [displayName, setDisplayName] = useState(board.displayName ?? board.name ?? '');
    const [icon, setIcon] = useState(board.icon ?? 'layout-dashboard');
    const [hidden, setHidden] = useState(board.visibility?.length === 0);
    const [tags, setTags] = useState<string[]>(board.tags ?? []);
    const [newTag, setNewTag] = useState('');

    // -------- Icons section --------
    const [availableIcons, setAvailableIcons] = useState<string[]>([]);

    // -------- Settings section --------
    const [currentSettings, setCurrentSettings] = useState(board.settings ?? {});

    // -------- Users section --------
    const [currentUsers, setCurrentUsers] = useState(board.users ?? []);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);

    const [loading, setLoading] = useState(false);

    // ---------------- TAG MANAGEMENT ----------------
    const handleRemoveTag = (tagToRemove: string) => {
        setTags(prev => prev.filter(t => t !== tagToRemove));
    };

    const handleAddTag = () => {
        const value = newTag.trim();
        if (!value || tags.includes(value)) return;
        setTags(prev => [...prev, value]);
        setNewTag('');
    };

    // ---------------- ICONS LOADING ----------------
    useEffect(() => {
        let cancelled = false;
        const loadIcons = async () => {
            try {
                const response = await API.get('/api/core/v1/icons');
                const icons = response?.data?.icons ?? [];
                if (!cancelled) setAvailableIcons(icons);
            } catch {
                if (!cancelled) setAvailableIcons([]);
            }
        };
        loadIcons();
        return () => { cancelled = true; };
    }, []);

    // ---------------- USERS LOADING ----------------
    useEffect(() => {
        let cancelled = false;
        const loadUsers = async () => {
            setLoadingUsers(true);
            try {
                const response = await API.get('/api/core/v1/groups');
                const groups = response?.data?.items ?? response?.data ?? [];
                const groupNames = Array.isArray(groups) ? groups.map((g: any) => g?.name ?? g).filter(Boolean) : [];
                if (!cancelled) setAvailableUsers(groupNames);
            } catch {
                if (!cancelled) setAvailableUsers([]);
            } finally {
                if (!cancelled) setLoadingUsers(false);
            }
        };

        loadUsers();
        return () => { cancelled = true; };
    }, []);

    // ---------------- SAVE FULL BOARD ----------------
    const onSaveSettings = async () => {
        if (readOnly) return;
        setLoading(true);

        const updatedBoard = {
            ...board,
            displayName: displayName || board.name,
            icon,
            visibility: hidden ? [] : undefined,
            tags,
            users: currentUsers?.length ? currentUsers : undefined,
            settings: currentSettings,
        };

        await onSave(updatedBoard);
        setLoading(false);
    };

    return (
        <YStack f={1} gap="$2" py="$4"  >
            <YStack gap="$4" overflow="auto" f={1} px="$4">
                <Tinted>
                    {/* GENERAL SECTION */}
                    <SettingsGroup title="General">
                        <Setting
                            type="text"
                            label="Display Name"
                            description="The name shown in the UI"
                            value={displayName}
                            onChange={setDisplayName}
                            placeholder="Enter display name"
                            disabled={readOnly}
                        />

                        <Setting
                            label="Icon"
                            description="Icon displayed for this board"
                            control={
                                <YStack minWidth={280}>
                                    <IconSelect
                                        icons={availableIcons}
                                        onSelect={setIcon}
                                        selected={icon}
                                        disabled={readOnly}
                                        inputProps={{ backgroundColor: '$bgContent', borderColor: '$gray6' }}
                                    />
                                </YStack>
                            }
                        />

                        <Setting
                            type="toggle"
                            label="Hide board"
                            description="Hide this board from navigation"
                            value={hidden}
                            onChange={setHidden}
                            disabled={readOnly}
                        />
                    </SettingsGroup>

                    {/* TAGS SECTION */}
                    <SettingsGroup title="Tags">

                        <YStack gap="$3">
                            <XStack flexWrap="wrap" gap="$2">
                                {tags.length ? (
                                    tags.map((tag) => (
                                        <XStack key={tag} ai="center" br="$10" px="$2" py="$1.5" gap="$2" bg="$bgContent">
                                            <Text numberOfLines={1} ellipsizeMode="tail">{tag}</Text>
                                            {!readOnly && (
                                                <Button
                                                    size="$1"
                                                    circular
                                                    theme="red"
                                                    icon={X}
                                                    scaleIcon={0.8}
                                                    onPress={() => handleRemoveTag(tag)}
                                                />
                                            )}
                                        </XStack>
                                    ))
                                ) : (
                                    <Text color="$gray9">No tags</Text>
                                )}
                            </XStack>
                            {!readOnly && (
                                <XStack gap="$2" ai="center">
                                    <FormInput
                                        flex={1}
                                        borderRadius={8}
                                        placeholder="Add tag"
                                        value={newTag}
                                        onChangeText={setNewTag}
                                        backgroundColor="$bgContent"
                                        borderColor="$gray6"
                                    />
                                    <Button size="$3" onPress={handleAddTag} icon={<Plus/>}>Add</Button>
                                </XStack>
                            )}
                        </YStack>
                    </SettingsGroup>

                    {/* DISPLAY SECTION */}
                    <SettingsGroup title="Display">
                        <Setting
                            type="text"
                            label="Background Image"
                            description="URL or path to background image"
                            placeholder="https://example.com/image.jpg"
                            value={currentSettings?.backgroundImage ?? ""}
                            onChange={(text) => setCurrentSettings({ ...currentSettings, backgroundImage: text })}
                            disabled={readOnly}
                        />

                        <Setting
                            label="Margin"
                            description="Card margin in pixels (X, Y)"
                            control={
                                <XStack gap="$2">
                                    <Input
                                        width={80}
                                        backgroundColor="$bgContent"
                                        borderColor="$gray6"
                                        borderWidth={1}
                                        borderRadius={8}
                                        placeholder="X"
                                        maxLength={3}
                                        value={currentSettings?.margin?.[0]?.toString() ?? ""}
                                        onChangeText={(text) =>
                                            setCurrentSettings({
                                                ...currentSettings,
                                                margin: [
                                                    text && !isNaN(parseInt(text)) ? parseInt(text).toString() : "",
                                                    currentSettings?.margin?.[1] ?? ""
                                                ]
                                            })
                                        }
                                        disabled={readOnly}
                                    />
                                    <Input
                                        width={80}
                                        backgroundColor="$bgContent"
                                        borderColor="$gray6"
                                        borderWidth={1}
                                        borderRadius={8}
                                        placeholder="Y"
                                        maxLength={3}
                                        value={currentSettings?.margin?.[1]?.toString() ?? ""}
                                        onChangeText={(text) =>
                                            setCurrentSettings({
                                                ...currentSettings,
                                                margin: [
                                                    currentSettings?.margin?.[0] ?? "",
                                                    text && !isNaN(parseInt(text)) ? parseInt(text).toString() : ""
                                                ]
                                            })
                                        }
                                        disabled={readOnly}
                                    />
                                </XStack>
                            }
                        />

                        <Setting
                            type="select"
                            label="Overlap"
                            description="Allow cards to overlap each other"
                            value={
                                currentSettings?.allowOverlap === true
                                    ? "yes"
                                    : currentSettings?.allowOverlap === false
                                        ? "no"
                                        : "default"
                            }
                            options={[
                                { value: "default", label: "Default" },
                                { value: "yes", label: "Yes" },
                                { value: "no", label: "No" }
                            ]}
                            onChange={(value) =>
                                setCurrentSettings({ ...currentSettings, allowOverlap: value === "yes" ? true : value === "no" ? false : undefined })
                            }
                            disabled={readOnly}
                        />

                        <Setting
                            type="select"
                            label="Compact type"
                            description="How cards compact when dragged"
                            value={currentSettings?.compactType || "default"}
                            options={[
                                { value: "default", label: "Default" },
                                { value: "vertical", label: "Vertical" },
                                { value: "horizontal", label: "Horizontal" }
                            ]}
                            onChange={(value) => setCurrentSettings({ ...currentSettings, compactType: value })}
                            disabled={readOnly}
                        />
                    </SettingsGroup>

                    {/* BEHAVIOR SECTION */}
                    <SettingsGroup title="Behavior">
                        <Setting
                            type="toggle"
                            label="Autoplay"
                            description="Automatically start when board loads"
                            value={currentSettings?.autoplay ?? false}
                            onChange={(checked) => setCurrentSettings({ ...currentSettings, autoplay: checked })}
                            disabled={readOnly}
                        />

                        <Setting
                            type="toggle"
                            label="Show UI on play"
                            description="Display board controls when playing"
                            value={currentSettings?.showBoardUIOnPlay ?? false}
                            onChange={(checked) => setCurrentSettings({ ...currentSettings, showBoardUIOnPlay: checked })}
                            disabled={readOnly}
                        />

                        <Setting
                            type="toggle"
                            label="Show UI while playing"
                            description="Keep board controls visible during playback"
                            value={currentSettings?.showBoardUIWhilePlaying ?? false}
                            onChange={(checked) => setCurrentSettings({ ...currentSettings, showBoardUIWhilePlaying: checked })}
                            disabled={readOnly}
                        />

                        <Setting
                            type="toggle"
                            label="Ephemeral Mode"
                            description="Cards use isolated state for concurrent execution"
                            value={currentSettings?.ephemeral ?? false}
                            onChange={(checked) => setCurrentSettings({ ...currentSettings, ephemeral: checked })}
                            disabled={readOnly}
                        />
                    </SettingsGroup>

                    {/* PERMISSIONS SECTION */}
                    <SettingsGroup title="Permissions">
                        <YStack gap="$3">
                            <YStack gap="$1">
                                <Label color="$text" fontSize="$5">Visible to users</Label>
                                <Label fontSize="$4" color="$gray10">
                                    Whitelist: only selected groups can see this board. Leave empty to allow everyone.
                                </Label>
                            </YStack>
                            {loadingUsers ? (
                                <Spinner size="small" />
                            ) : (
                                <>
                                    <MultiSelectList
                                        choices={availableUsers}
                                        defaultSelections={currentUsers}
                                        onSetSelections={(selections) => setCurrentUsers(selections)}
                                        disabled={readOnly}
                                    />
                                    {(!availableUsers || availableUsers.length === 0) && (
                                        <Text color="$gray9" fontSize="$3">No groups available</Text>
                                    )}
                                </>
                            )}
                        </YStack>
                    </SettingsGroup>


                </Tinted>
            </YStack>
            {/* SAVE BUTTON */}
            <XStack justifyContent="flex-end" pt="$2" px="$4">
                <Tinted>
                    {readOnly ? (
                        <Button disabled size="$4">
                            Read-only
                        </Button>
                    ) : (
                        <Button onPress={onSaveSettings} size="$4" width={"200px"}>
                            Save
                            {loading && <Spinner size="small" ml="$2" />}
                        </Button>
                    )}
                </Tinted>
            </XStack>
        </YStack>
    );
};
