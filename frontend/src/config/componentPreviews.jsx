import { Terminal } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

/**
 * Live previews per component (start: components beginning with "A").
 * Keyed by the exact `name` used in the Components table. Missing keys fall
 * back to an "unavailable" message in the preview dialog.
 * Content is generic placeholder only (Design System rule R31).
 */
export const componentPreviews = {
  Accordion: (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="item-1">
        <AccordionTrigger>Section One</AccordionTrigger>
        <AccordionContent>
          Placeholder content for the first collapsible section.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Section Two</AccordionTrigger>
        <AccordionContent>
          Placeholder content for the second collapsible section.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),

  Alert: (
    <Alert>
      <Terminal className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>Heads up</AlertTitle>
      <AlertDescription>
        This is a placeholder informational alert message.
      </AlertDescription>
    </Alert>
  ),

  "Alert Dialog": (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" data-testid="preview-alert-dialog-trigger">
          Open alert dialog
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This is a placeholder confirmation. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),

  "Aspect Ratio": (
    <div className="w-full max-w-sm">
      <AspectRatio
        ratio={16 / 9}
        className="flex items-center justify-center rounded-md bg-muted"
      >
        <span className="text-sm text-muted-foreground">16 / 9</span>
      </AspectRatio>
    </div>
  ),

  Avatar: (
    <div className="flex items-center gap-4">
      <Avatar>
        <AvatarFallback>U</AvatarFallback>
      </Avatar>
      <Avatar className="h-12 w-12">
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    </div>
  ),
};
