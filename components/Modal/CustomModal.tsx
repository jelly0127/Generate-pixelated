import { useEffect } from 'react';
import { DialogContent, DialogRoot } from '../ui/dialog';
import { Portal } from '@chakra-ui/react/portal';

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function CustomModal({ isOpen, onClose, children }: CustomModalProps) {
  return (
    <DialogRoot
      motionPreset="slide-in-bottom"
      placement="center"
      lazyMount
      open={isOpen}
      onOpenChange={({ open }) => !open && onClose()}
    >
      <Portal>
        <DialogContent className="flex w-[94vw] items-center justify-center md:w-auto">{children}</DialogContent>
      </Portal>
    </DialogRoot>
  );
}
