"use client";

import { useCallback, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmState {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

/**
 * 自定义确认弹窗 hook，替代原生 confirm()。
 *
 * 用法：
 * ```tsx
 * const { confirm, ConfirmDialog } = useConfirm();
 *
 * // 在事件处理中：
 * const ok = await confirm({ title: "确定删除吗？" });
 * if (ok) { /* do something *\/ }
 *
 * // 在 JSX 中渲染（全局放一个即可）：
 * <ConfirmDialog />
 * ```
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: "",
  });
  const resolveRef = useRef<(value: boolean) => void>(() => {});

  const confirm = useCallback(
    (options: {
      title: string;
      description?: string;
      confirmText?: string;
      cancelText?: string;
      variant?: "default" | "destructive";
    }) =>
      new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
        setState({ open: true, ...options });
      }),
    []
  );

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      resolveRef.current(false);
      setState((s) => ({ ...s, open: false }));
    }
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current(true);
    setState((s) => ({ ...s, open: false }));
  }, []);

  const ConfirmDialog = useCallback(() => {
    const { open, title, description, confirmText, cancelText, variant } =
      state;
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-[320px] gap-0 p-0"
          showCloseButton={false}
        >
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-center text-base font-semibold">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-center text-sm text-muted-foreground">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter className="px-6 pb-6 pt-2 flex-row gap-2 sm:gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleOpenChange.bind(null, false)}
            >
              {cancelText ?? "取消"}
            </Button>
            <Button
              variant={variant === "destructive" ? "destructive" : "default"}
              className="flex-1"
              onClick={handleConfirm}
            >
              {confirmText ?? "确定"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }, [state, handleOpenChange, handleConfirm]);

  return { confirm, ConfirmDialog };
}
