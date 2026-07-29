import { Autocomplete } from "@/components/composite/Autocomplete";
import { Rating } from "@/components/composite/Rating";
import { Stepper } from "@/components/composite/Stepper";
import { ListView } from "@/components/composite/ListView";
import { CookieBanner } from "@/components/composite/CookieBanner";
import { Preloader } from "@/components/composite/Preloader";
import { Widget } from "@/components/composite/Widget";
import { PlaceholderState } from "@/components/composite/PlaceholderState";
import { DataGrid } from "@/components/composite/DataGrid";
import { CodeBlock } from "@/components/composite/CodeBlock";
import { MarkdownRenderer } from "@/components/composite/MarkdownRenderer";
import { PhoneInputField } from "@/components/composite/PhoneInputField";
import { MaskedInput } from "@/components/composite/MaskedInput";
import { KanbanBoard } from "@/components/composite/KanbanBoard";
import { SortableList } from "@/components/composite/SortableList";
import { PasswordInput } from "@/components/composite/PasswordInput";

/**
 * Live previews per composite component. Keyed by the exact `name` used in the
 * Composite Components table. Content is generic placeholder only (rule R31).
 */
export const compositePreviews = {
  Autocomplete: <Autocomplete />,
  Rating: <Rating />,
  Stepper: <Stepper />,
  List: <ListView />,
  "Cookie Banner": <CookieBanner />,
  Preloader: <Preloader />,
  Widget: <Widget />,
  Placeholder: <PlaceholderState />,
  "Data Grid": <DataGrid />,
  "Code Block": <CodeBlock />,
  Markdown: <MarkdownRenderer />,
  "Phone Input": <PhoneInputField />,
  "Input Mask": <MaskedInput />,
  Kanban: <KanbanBoard />,
  Sortable: <SortableList />,
  "Password Input": (
    <div className="w-full max-w-xs">
      <PasswordInput placeholder="Enter your password" defaultValue="secret123" />
    </div>
  ),
};
