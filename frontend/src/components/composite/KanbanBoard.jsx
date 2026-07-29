import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useDroppable,
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
import { Badge } from "@/components/ui/badge";

const COLUMNS = [
  { key: "todo", label: "To Do" },
  { key: "doing", label: "In Progress" },
  { key: "done", label: "Done" },
];

const INITIAL = {
  todo: [
    { id: "1", title: "Task One" },
    { id: "2", title: "Task Two" },
  ],
  doing: [{ id: "3", title: "Task Three" }],
  done: [{ id: "4", title: "Task Four" }],
};

function findContainer(items, id) {
  if (id in items) return id;
  return Object.keys(items).find((key) =>
    items[key].some((i) => i.id === id),
  );
}

function KanbanCard({ id, title }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-background px-2.5 py-2 text-sm shadow-sm",
        isDragging && "z-10 opacity-70 shadow-md",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground focus-visible:outline-none"
        aria-label={`Move ${title}`}
      >
        <GripVertical className="size-4" />
      </button>
      {title}
    </div>
  );
}

function KanbanColumn({ column, cards }) {
  const { setNodeRef } = useDroppable({ id: column.key });
  return (
    <div className="flex w-48 shrink-0 flex-col rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-xs font-medium">{column.label}</span>
        <Badge variant="secondary">{cards.length}</Badge>
      </div>
      <SortableContext
        items={cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef} className="flex min-h-24 flex-col gap-2 p-2">
          {cards.map((c) => (
            <KanbanCard key={c.id} {...c} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function KanbanBoard() {
  const [items, setItems] = useState(INITIAL);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function handleDragEnd({ active, over }) {
    if (!over) return;
    const from = findContainer(items, active.id);
    const to = findContainer(items, over.id) || over.id;
    if (!from || !to) return;

    if (from === to) {
      const list = items[from];
      const oldIndex = list.findIndex((i) => i.id === active.id);
      const newIndex = list.findIndex((i) => i.id === over.id);
      if (newIndex !== -1 && oldIndex !== newIndex) {
        setItems({ ...items, [from]: arrayMove(list, oldIndex, newIndex) });
      }
      return;
    }

    const fromList = [...items[from]];
    const toList = [...items[to]];
    const idx = fromList.findIndex((i) => i.id === active.id);
    const [moved] = fromList.splice(idx, 1);
    const overIdx = toList.findIndex((i) => i.id === over.id);
    toList.splice(overIdx >= 0 ? overIdx : toList.length, 0, moved);
    setItems({ ...items, [from]: fromList, [to]: toList });
  }

  return (
    <div
      className="flex w-full gap-3 overflow-x-auto pb-2"
      data-testid="kanban-board"
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        {COLUMNS.map((col) => (
          <KanbanColumn key={col.key} column={col} cards={items[col.key]} />
        ))}
      </DndContext>
    </div>
  );
}
