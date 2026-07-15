"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { cn } from "@/lib/utils";
import { useExitLayerStore } from "@/hooks/useExitLayer";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * compact 模式：桌面端用居中小窗口（Dialog），移动端仍用底部抽屉。
 * 非 compact（默认）：桌面端右侧抽屉，移动端底部抽屉。
 */
const CompactDrawerContext = React.createContext(false);

type DrawerProps = React.ComponentProps<typeof DrawerPrimitive.Root> & {
  /** true = 桌面端渲染为居中小窗口，移动端仍为底部抽屉 */
  compact?: boolean;
};

function Drawer({
  open,
  onOpenChange,
  direction,
  compact,
  ...props
}: DrawerProps) {
  const isMobile = useIsMobile();
  const push = useExitLayerStore((s) => s.push);
  const pop = useExitLayerStore((s) => s.pop);
  const onOpenChangeRef = React.useRef(onOpenChange);
  React.useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });

  React.useEffect(() => {
    if (!open) return;
    const id = push({
      close: () => onOpenChangeRef.current?.(false),
    });
    return () => {
      pop(id);
    };
  }, [open, push, pop]);

  // compact + 桌面端 → Dialog 居中窗口
  if (compact && !isMobile) {
    return (
      <CompactDrawerContext.Provider value={true}>
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
          {props.children}
        </DialogPrimitive.Root>
      </CompactDrawerContext.Provider>
    );
  }

  // 默认：vaul 抽屉
  const resolvedDirection = direction ?? (isMobile ? "bottom" : "right");

  return (
    <CompactDrawerContext.Provider value={false}>
      <DrawerPrimitive.Root
        data-slot="drawer"
        open={open}
        onOpenChange={onOpenChange}
        direction={resolvedDirection}
        {...props}
      />
    </CompactDrawerContext.Provider>
  );
}

function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  const isCompact = React.useContext(CompactDrawerContext);
  if (isCompact) {
    return <DialogPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
  }
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  const isCompact = React.useContext(CompactDrawerContext);
  if (isCompact) {
    return <DialogPrimitive.Portal data-slot="drawer-portal" {...props} />;
  }
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  const isCompact = React.useContext(CompactDrawerContext);
  if (isCompact) {
    return <DialogPrimitive.Close data-slot="drawer-close" {...props} />;
  }
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  const isCompact = React.useContext(CompactDrawerContext);
  if (isCompact) {
    return (
      <DialogPrimitive.Overlay
        data-slot="drawer-overlay"
        className={cn(
          "fixed inset-0 z-50 bg-black/50",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          className
        )}
        {...props}
      />
    );
  }
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  );
}

function DrawerContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  const isCompact = React.useContext(CompactDrawerContext);

  if (isCompact) {
    return (
      <DialogPrimitive.Portal data-slot="drawer-portal">
        <DrawerOverlay />
        <DialogPrimitive.Content
          data-slot="drawer-content"
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "bg-background w-[calc(100%-2rem)] max-w-sm rounded-lg border shadow-lg p-0 overflow-hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "duration-200",
            className
          )}
          {...props}
        >
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    );
  }

  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(
          "group/drawer-content bg-background fixed z-50 flex h-auto flex-col",
          "data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-lg data-[vaul-drawer-direction=top]:border-b",
          "data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-lg data-[vaul-drawer-direction=bottom]:border-t data-[vaul-drawer-direction=bottom]:pb-[calc(0.25rem+var(--safe-area-bottom))]",
          "data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=right]:sm:max-w-sm",
          "data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=left]:sm:max-w-sm",
          className
        )}
        {...props}
      >
        <div className="bg-muted mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  const isCompact = React.useContext(CompactDrawerContext);
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "flex flex-col gap-0.5 p-4",
        isCompact
          ? "text-center md:gap-1.5"
          : "group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-1.5 md:text-left",
        className
      )}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  const isCompact = React.useContext(CompactDrawerContext);
  if (isCompact) {
    return (
      <DialogPrimitive.Title
        data-slot="drawer-title"
        className={cn("text-foreground font-semibold", className)}
        {...props}
      />
    );
  }
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  const isCompact = React.useContext(CompactDrawerContext);
  if (isCompact) {
    return (
      <DialogPrimitive.Description
        data-slot="drawer-description"
        className={cn("text-muted-foreground text-sm", className)}
        {...props}
      />
    );
  }
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
