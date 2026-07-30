import React, { useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';

interface Props<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  /** Satır yüksekliği sabit olmalı; sürükleme matematiği buna dayanır. */
  rowHeight: number;
  renderItem: (item: T, index: number, handle: DragHandleProps) => React.ReactNode;
  onReorder: (orderedKeys: string[]) => void;
  /** Sürükleme sırasında dış ScrollView'ı kilitlemek için. */
  onDragStateChange?: (dragging: boolean) => void;
}

/** renderItem'a verilen tutamaç: bu prop'ları saran View sürüklemeyi başlatır. */
export type DragHandleProps = ReturnType<typeof PanResponder.create>['panHandlers'];

/**
 * Bağımlılıksız sürükle-bırak liste. Tutamaca basılı tutup dikey hareket
 * edildiğinde satır taşınır, diğer satırlar yer açar. Bırakıldığında
 * onReorder yeni sıradaki anahtarlarla çağrılır.
 */
export function DraggableList<T>({
  data,
  keyExtractor,
  rowHeight,
  renderItem,
  onReorder,
  onDragStateChange,
}: Props<T>) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [offsetIndex, setOffsetIndex] = useState(0);
  const translateY = useRef(new Animated.Value(0)).current;

  // PanResponder'lar render sırasında yeniden kurulmamalı; ref üzerinden okunur
  const stateRef = useRef({ data, rowHeight });
  stateRef.current = { data, rowHeight };

  const responders = useMemo(
    () =>
      data.map((_, index) =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 4,
          onPanResponderGrant: () => {
            setActiveIndex(index);
            setOffsetIndex(0);
            translateY.setValue(0);
            onDragStateChange?.(true);
          },
          onPanResponderMove: (_e, g) => {
            const { data: rows, rowHeight: h } = stateRef.current;
            // Satırı liste sınırları içinde tut
            const min = -index * h;
            const max = (rows.length - 1 - index) * h;
            const dy = Math.max(min, Math.min(max, g.dy));
            translateY.setValue(dy);
            setOffsetIndex(Math.round(dy / h));
          },
          onPanResponderRelease: (_e, g) => {
            const { data: rows, rowHeight: h } = stateRef.current;
            const min = -index * h;
            const max = (rows.length - 1 - index) * h;
            const dy = Math.max(min, Math.min(max, g.dy));
            const target = index + Math.round(dy / h);

            if (target !== index) {
              const keys = rows.map(keyExtractor);
              const [moved] = keys.splice(index, 1);
              keys.splice(target, 0, moved);
              onReorder(keys);
            }
            setActiveIndex(null);
            setOffsetIndex(0);
            translateY.setValue(0);
            onDragStateChange?.(false);
          },
          onPanResponderTerminate: () => {
            setActiveIndex(null);
            setOffsetIndex(0);
            translateY.setValue(0);
            onDragStateChange?.(false);
          },
        }),
      ),
    // data uzunluğu değiştiğinde responder listesi yenilenir
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.length],
  );

  /** Sürüklenen satır geçerken diğer satırların kayması */
  const shiftFor = (index: number) => {
    if (activeIndex === null || index === activeIndex || offsetIndex === 0) return 0;
    const target = activeIndex + offsetIndex;
    if (offsetIndex > 0 && index > activeIndex && index <= target) return -rowHeight;
    if (offsetIndex < 0 && index < activeIndex && index >= target) return rowHeight;
    return 0;
  };

  return (
    <View>
      {data.map((item, index) => {
        const isActive = index === activeIndex;
        return (
          <Animated.View
            key={keyExtractor(item)}
            style={[
              { height: rowHeight },
              isActive ? styles.active : null,
              {
                transform: [{ translateY: isActive ? translateY : shiftFor(index) }],
                zIndex: isActive ? 2 : 1,
              },
            ]}
          >
            {renderItem(item, index, responders[index].panHandlers)}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  active: { opacity: 0.92, elevation: 4 },
});
