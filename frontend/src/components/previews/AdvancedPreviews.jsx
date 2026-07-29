import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Combobox } from "@/components/composite/Combobox";
import { DatePicker } from "@/components/composite/DatePicker";

const comboItems = [
  { value: "one", label: "Option One" },
  { value: "two", label: "Option Two" },
  { value: "three", label: "Option Three" },
];

// Catalog demo — thin wrapper around the reusable `Combobox` composite.
export function ComboboxPreview({ className }) {
  const [value, setValue] = useState("");
  return (
    <Combobox
      options={comboItems}
      value={value}
      onChange={setValue}
      className={className}
    />
  );
}

// Catalog demo — thin wrapper around the reusable `DatePicker` composite.
export function DatePickerPreview({ className }) {
  const [date, setDate] = useState();
  return <DatePicker value={date} onChange={setDate} className={className} />;
}

const dtData = [
  { id: 1, name: "Item One", status: "Active" },
  { id: 2, name: "Item Two", status: "Inactive" },
  { id: 3, name: "Item Three", status: "Active" },
];
const dtColumns = [
  { accessorKey: "id", header: "No", cell: (info) => info.getValue() },
  { accessorKey: "name", header: "Name", cell: (info) => info.getValue() },
  {
    accessorKey: "status",
    header: "Status",
    cell: (info) => (
      <Badge variant={info.getValue() === "Active" ? "default" : "outline"}>
        {info.getValue()}
      </Badge>
    ),
  },
];

export function DataTablePreview() {
  const table = useReactTable({
    data: dtData,
    columns: dtColumns,
    getCoreRowModel: getCoreRowModel(),
  });
  return (
    <div className="w-full rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableHead key={h.id}>
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((r) => (
            <TableRow key={r.id}>
              {r.getVisibleCells().map((c) => (
                <TableCell key={c.id}>
                  {flexRender(c.column.columnDef.cell, c.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
