import { Button as BaseButton, View, Text } from "@my/ui";
import { Tinted } from "./Tinted";
import { useEffect, useState, memo } from "react";
import { styled } from "tamagui";


const GridButton = styled(BaseButton, {
  name: "GridButton",
  unstyled: true,
  flex: 1,
  flexShrink: 1,
  minWidth: 0,
  height: "100%",
  borderRadius: 6,
  justifyContent: "center",
  alignItems: "center",
  hoverStyle: { scale: 1.1, bc: "$color4" },
  backgroundColor: "$gray2",
  pressStyle: { opacity: 0.8 },
  variants: {
    active: {
      true: {
        backgroundColor: "$color8",
      },
    },
  },
});

export const InteractiveGrid = ({ data = [], onChange = (data) => {} }) => {
  const [grid, setGrid] = useState(data);

  const changeCell = (row: number, col: number) => {
    const newGrid = grid.map((r, rI) =>
      r.map((c, cI) =>
        rI === row && cI === col
          ? { ...c, value: c.value === "true" ? "false" : "true" }
          : c
      )
    );
    setGrid(newGrid);
    onChange(newGrid);
  };

  useEffect(() => {
    if (Array.isArray(data) && data.length > 0) {
      setGrid(data);
    }
  }, [data]);

  return (
    <Tinted>
      <View
        style={{
          gap: 2,
          justifyContent: "space-between",
          alignItems: "center",
          height: "100%",
          width: "100%",
          padding: 10,
        }}
        className="no-drag"
      >
        {grid.length ? (
          grid.map((row, rowI) => (
            <View
              key={rowI}
              style={{
                gap: 2,
                width: "100%",
                flexDirection: "row",
                justifyContent: "space-between",
                flex: 1,
                minHeight: 0,
              }}
            >
              {row.map((column, columnI) => (
                <GridButton
                  key={`${rowI}-${columnI}`}
                  active={column.value === "true"}
                  onPress={() => changeCell(rowI, columnI)}
                />
              ))}
            </View>
          ))
        ) : (
          <View
            style={{
              height: "100%",
              width: "100%",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 30, fontWeight: "bold" }}>
              No data available
            </Text>
          </View>
        )}
      </View>
    </Tinted>
  );
};
