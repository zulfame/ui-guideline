import { ChevronRight, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

const ITEMS = [
  { title: "List Item One", desc: "Supporting description text." },
  { title: "List Item Two", desc: "Supporting description text." },
  { title: "List Item Three", desc: "Supporting description text." },
];

export function ListView() {
  return (
    <div
      className="w-full max-w-md overflow-hidden rounded-lg border"
      data-testid="list-view"
    >
      {ITEMS.map((it, i) => (
        <div key={it.title}>
          <Item>
            <ItemMedia>
              <FileText className="size-5 text-muted-foreground" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{it.title}</ItemTitle>
              <ItemDescription>{it.desc}</ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button variant="ghost" size="icon" className="size-7">
                <ChevronRight className="size-4" />
              </Button>
            </ItemActions>
          </Item>
          {i < ITEMS.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  );
}
