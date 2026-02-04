import { Paragraph, Spinner, YStack } from "@my/ui";
import React from "react";

type ChatProps = {
  agent: string;
};

export const Chat = ({ agent }: ChatProps) => {
  const [loaded, setLoaded] = React.useState(false);
  React.useEffect(() => setLoaded(false), [agent]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {!loaded
        && <YStack
          position="absolute"
          height="100%"
          width="100%"
          ai="center"
          jc="center"
          top={0}
          right={0}
          zIndex={-2}
        >
          <Spinner color="$color6" size={"large"} mb="$6" />
          <Paragraph color="$color11">Loading chat...</Paragraph>
        </YStack>
      }
      <iframe
        src={"/workspace/chatbot?agent=" + encodeURIComponent(agent)}
        width="100%"
        height="100%"
        style={{ border: "none" }}
        title="Chat Widget"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};