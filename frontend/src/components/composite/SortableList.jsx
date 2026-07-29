import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { cn } from "@/lib/utils";

const INITIAL = [
  { id: "1", title: "List Item One" },
  { id: "2", title: "List Item Two" },
  { id: "3", title: "List Item Three" },
  { id: "4", title: "List Item Four" },
];

function SortableRow({ id, title }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm",
        isDragging && "z-10 opacity-70 shadow-md",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground focus-visible:outline-none"
        aria-label={`Reorder ${title}`}
      >
        <GripVertical className="size-4" />
      </button>
      {title}
    </div>
  );
}

export function SortableList() {
  const [items, setItems] = useState(INITIAL);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  return (
    <div className="w-full max-w-xs" data-testid="sortable-list">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (over && active.id !== over.id) {
            setItems((list) => {
              const o = list.findIndex((i) => i.id === active.id);
              const n = list.findIndex((i) => i.id === over.id);
              return arrayMove(list, o, n);
            });
          }
        }}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {items.map((i) => (
              <SortableRow key={i.id} {...i} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
