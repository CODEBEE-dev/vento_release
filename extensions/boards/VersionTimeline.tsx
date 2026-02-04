import { useState } from "react";
import { VerticalTimeline, VerticalTimelineElement } from "react-vertical-timeline-component";
import "react-vertical-timeline-component/style.min.css";
import { useTheme, Paragraph, ScrollView, XStack, Text, Input, YStack, Label } from "@my/ui";
import { ArchiveRestore, CheckCircle, Clock, Pencil, PlusCircle, MinusCircle, Edit3 } from "@tamagui/lucide-icons";
import { Tinted } from "protolib/components/Tinted";
import { InteractiveIcon } from "protolib/components/InteractiveIcon";
import { useBoardVersions } from "./utils/versions";
import { useBoardVersion } from "./store/boardStore";
import { AlertDialog } from "protolib/components/AlertDialog";
import { setVersionMeta } from "./utils/versions";

export function VersionTimeline({ boardId }: { boardId: string }) {
  const { goToVersion, versions, refresh } = useBoardVersions(boardId);
  const theme = useTheme();
  const [boardVersion] = useBoardVersion();
  const current = boardVersion;

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<any>(null);
  const [tag, setTag] = useState("");
  const [comment, setComment] = useState("");

  const fmt = (ts: number | string) => {
    const d = new Date(Number(ts));
    return isNaN(d.getTime())
      ? "Fecha no válida"
      : d.toLocaleString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
  };

  const handleEdit = (v: any) => {
    setSelectedVersion(v);
    setTag(v.tag ?? "");
    setComment(v.comment ?? "");
    setOpenDialog(true);
  };

  const handleSaveMeta = async () => {
    if (!selectedVersion) return;
    await setVersionMeta(boardId, selectedVersion.version, { tag, comment });
    await refresh();
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case "Adds":
        return { Icon: PlusCircle, color: "var(--green9)" };
      case "Removes":
        return { Icon: MinusCircle, color: "var(--red9)" };
      case "Edits":
        return { Icon: Edit3, color: "var(--yellow9)" };
      default:
        return { Icon: Clock, color: "var(--gray8)" };
    }
  };

  return (
    <ScrollView flex={1} width="100%" height="100%" overflow="auto">
      <Tinted>
        <VerticalTimeline animate={false} lineColor={"var(--gray6)"}>
          {[...versions].reverse().map((v) => {
            const isCurrent = current === v.version;
            return (
              <VerticalTimelineElement
                key={v.version}
                date={fmt(v.savedAt)}
                icon={isCurrent ? <CheckCircle /> : <Clock />}
                iconStyle={{
                  background: isCurrent ? "var(--color6)" : "var(--gray6)",
                  color: "var(--color8)",
                  boxShadow: "none",
                }}
                contentStyle={{
                  background: "var(--bgContent)",
                  color: isCurrent ? "var(--color8)" : "var(--color)",
                  borderRadius: 12,
                  padding: "14px 16px",
                  border: isCurrent
                    ? "1px solid color-mix(in oklab, var(--color6) 35%, transparent)"
                    : "1px solid var(--gray5)",
                  boxShadow: isCurrent
                    ? "0 0 0 1px color-mix(in oklab, var(--color6) 25%, transparent), 0 6px 20px rgba(0,0,0,.18)"
                    : "0 4px 18px rgba(0,0,0,.15)",
                  backgroundImage: isCurrent
                    ? "linear-gradient(0deg, color-mix(in oklab, var(--color6) 5%, transparent), transparent)"
                    : "none",
                  transition: "all 0.2s ease",
                }}
                contentArrowStyle={{ borderRightColor: "var(--bgContent)" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <XStack ai="center" space="$2">
                    <h3 style={{ margin: 0, fontWeight: 700 }}>Version {v.version}</h3>
                    <InteractiveIcon Icon={Pencil} size={20} onPress={() => handleEdit(v)} />
                  </XStack>

                  {!isCurrent && (
                    <InteractiveIcon
                      Icon={ArchiveRestore}
                      size={24}
                      onPress={async () => {
                        try {
                          await goToVersion(v.version);
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                    />
                  )}
                </div>

                {v.tag && (
                  <XStack ai="center" mt="$2">
                    <Tinted tint="yellow" br="$10" px="$2" py="$1">
                      <Text fontSize={12} color="var(--color9)">
                        🏷️ {v.tag}
                      </Text>
                    </Tinted>
                  </XStack>
                )}

                <hr style={{ border: "none", borderTop: "1px solid var(--gray5)", margin: "6px 0" }} />

                <Paragraph size="$3" mt={8} mb={0} color={isCurrent ? "var(--color8)" : "var(--color)"}>
                  <XStack>
                    <Text>Total cards: {v.cards.length}</Text>
                  </XStack>

                  <XStack ai="center" space="$2" mt="$1">
                    {(() => {
                      const { Icon, color } = getChangeIcon(v.change.type);
                      return <Icon size={16} color={color} />;
                    })()}
                    <Text>{`${v.change.type} card ${v.change.card}`}</Text>
                  </XStack>

                  {v.comment && (
                    <XStack mt="$2" bg="var(--gray4)" br="$6" px="$3" py="$2">
                      <Text fontSize={13} color="var(--color8)">
                        💬 {v.comment}
                      </Text>
                    </XStack>
                  )}
                </Paragraph>
              </VerticalTimelineElement>
            );
          })}
        </VerticalTimeline>
      </Tinted>

      <AlertDialog
        open={openDialog}
        setOpen={setOpenDialog}
        showCancel
        acceptCaption="Save"
        acceptTint="green"
        cancelTint="gray"
        title={`Version ${selectedVersion?.version}`}
        description={`Cards: ${selectedVersion?.cards?.length ?? 0} | Change: ${
          selectedVersion?.change?.type ?? "N/A"
        } ${selectedVersion?.change?.card ?? ""}`}
        onAccept={async () => {
          await handleSaveMeta();
          return false;
        }}
      >
        <YStack space="$3" width="100%">
          <Label>Tag</Label>
          <Input value={tag} onChangeText={setTag} placeholder="e.g. stable, milestone, beta" />

          <Label>Comment</Label>
          <Input
            multiline
            value={comment}
            onChangeText={setComment}
            placeholder="Describe what changed or why this version matters"
          />
        </YStack>
      </AlertDialog>
    </ScrollView>
  );
}
